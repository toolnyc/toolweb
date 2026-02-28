import type { APIRoute } from 'astro';
import { getSupabaseAdmin, getStripe, getResendOrNull, getEnv } from '../../lib/env';
import { sendOrderConfirmationEmail } from '../../lib/emails';

export const POST: APIRoute = async ({ request }) => {
  try {
    const env = getEnv();
    const webhookSecret = env.STRIPE_WEBHOOK_SECRET;
    const stripe = getStripe();
    const supabaseAdmin = getSupabaseAdmin();

    if (!webhookSecret) {
      return new Response('Webhook not configured', { status: 500 });
    }

    const payload = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return new Response('Missing signature', { status: 400 });
    }

    let event;
    try {
      event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (sigErr) {
      console.error('[stripe-webhook] Signature verification failed:', sigErr instanceof Error ? sigErr.message : sigErr);
      return new Response('Invalid signature', { status: 400 });
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as unknown as Record<string, unknown>;
      const metadata = session.metadata as Record<string, string> | undefined;
      const variantId = metadata?.variant_id;
      const quantity = parseInt(metadata?.quantity || '1', 10);

      if (variantId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(variantId)) {
        console.error('[stripe-webhook] Invalid variant_id in metadata:', { variantId, sessionId: session.id });
        return new Response('Invalid metadata', { status: 400 });
      }
      const sessionId = session.id as string;
      const paymentIntentId = (session.payment_intent as string) ?? null;
      const customerDetails = session.customer_details as Record<string, unknown> | undefined;
      const customerEmail = (customerDetails?.email as string) || '';
      const customerName = (customerDetails?.name as string) || '';
      const shippingDetails = session.shipping_details as Record<string, unknown> | undefined;
      const shippingAddress = (shippingDetails?.address as Record<string, string>) || {};
      const amountTotal = ((session.amount_total as number) ?? 0) / 100;
      const shippingCost = ((session.total_details as Record<string, unknown>)?.amount_shipping as number ?? 0) / 100;

      // Idempotent upsert
      const { error: orderError } = await supabaseAdmin
        .from('orders')
        .upsert(
          {
            product_variant_id: variantId,
            stripe_session_id: sessionId,
            stripe_payment_intent_id: paymentIntentId,
            customer_email: customerEmail,
            customer_name: customerName,
            shipping_address: {
              line1: shippingAddress.line1 || '',
              line2: shippingAddress.line2 || '',
              city: shippingAddress.city || '',
              state: shippingAddress.state || '',
              postal_code: shippingAddress.postal_code || '',
              country: shippingAddress.country || '',
            },
            quantity,
            amount_paid: amountTotal,
            shipping_cost: shippingCost,
            status: 'paid',
          },
          { onConflict: 'stripe_session_id' },
        );

      if (orderError) {
        console.error('Error inserting order:', orderError);
      }

      // Decrement stock and fetch variant/product info for the confirmation email
      let productName = 'Item';
      let variantLabel = '';
      let itemPrice = amountTotal;

      if (variantId) {
        const { data: variant } = await supabaseAdmin
          .from('product_variants')
          .select('stock_count, label, product_id')
          .eq('id', variantId)
          .single();

        if (variant) {
          variantLabel = variant.label || '';

          await supabaseAdmin
            .from('product_variants')
            .update({ stock_count: Math.max(0, variant.stock_count - quantity) })
            .eq('id', variantId);

          // Fetch the product name
          const { data: product } = await supabaseAdmin
            .from('products')
            .select('name, price')
            .eq('id', variant.product_id)
            .single();

          if (product) {
            productName = product.name;
            itemPrice = product.price * quantity;
          }
        }
      }

      // Fetch the order ID (order_number) for the confirmation email
      let orderId = sessionId;
      const { data: insertedOrder } = await supabaseAdmin
        .from('orders')
        .select('order_number')
        .eq('stripe_session_id', sessionId)
        .single();

      if (insertedOrder?.order_number) {
        orderId = `#${insertedOrder.order_number}`;
      }

      // Send branded confirmation email
      if (customerEmail) {
        await sendOrderConfirmationEmail(customerEmail, {
          customerName: customerName || 'there',
          items: [
            {
              name: productName,
              variant: variantLabel,
              quantity,
              price: itemPrice,
            },
          ],
          total: amountTotal,
          orderId,
        });
      }

      return new Response('OK', { status: 200 });
    }

    if (event.type === 'invoice.paid') {
      // Update project invoice status if linked
      const invoice = event.data.object as unknown as Record<string, unknown>;
      const invoiceId = invoice.id as string;

      await supabaseAdmin
        .from('projects')
        .update({ stripe_invoice_url: (invoice.hosted_invoice_url as string) ?? null })
        .eq('stripe_invoice_id', invoiceId);

      return new Response('OK', { status: 200 });
    }

    if (event.type === 'invoice.payment_failed') {
      // Notify admin
      const resend = getResendOrNull();
      if (resend) {
        const invoice = event.data.object as unknown as Record<string, unknown>;
        try {
          await resend.emails.send({
            from: 'Tool <noreply@tool.nyc>',
            to: ['hello@tool.nyc'],
            subject: 'Invoice payment failed',
            text: `Payment failed for invoice ${invoice.id}. Customer: ${invoice.customer_email || 'unknown'}`,
          });
        } catch (emailErr) {
          console.error('Failed to send failure notification:', emailErr);
        }
      }
      return new Response('OK', { status: 200 });
    }

    // Unhandled event type
    return new Response('OK', { status: 200 });
  } catch (err) {
    console.error('Webhook error:', err);
    return new Response('Webhook error', { status: 500 });
  }
};
