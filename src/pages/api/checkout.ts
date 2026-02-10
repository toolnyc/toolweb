import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../lib/supabase';
import { stripe } from '../../lib/stripe';

export const POST: APIRoute = async ({ request }) => {
  try {
    if (!stripe || !supabaseAdmin) {
      return new Response(JSON.stringify({ error: 'Not configured' }), { status: 500 });
    }

    const body = await request.json();
    const { variantId, quantity = 1, shippingCountry = 'US' } = body;

    if (!variantId) {
      return new Response(JSON.stringify({ error: 'Missing variantId' }), { status: 400 });
    }

    if (quantity < 1 || quantity > 10) {
      return new Response(JSON.stringify({ error: 'Quantity must be 1-10' }), { status: 400 });
    }

    // Fetch variant + product
    const { data: variant, error: variantError } = await supabaseAdmin
      .from('product_variants')
      .select('*, product:products(*)')
      .eq('id', variantId)
      .single();

    if (variantError || !variant) {
      return new Response(JSON.stringify({ error: 'Variant not found' }), { status: 404 });
    }

    const product = variant.product as Record<string, unknown>;

    if (product.status !== 'active') {
      return new Response(JSON.stringify({ error: 'Product not available' }), { status: 400 });
    }

    if (variant.stock_count < quantity) {
      return new Response(
        JSON.stringify({
          error: variant.stock_count <= 0 ? 'Sold out' : `Only ${variant.stock_count} left`,
        }),
        { status: 400 },
      );
    }

    if (!variant.stripe_price_id) {
      return new Response(JSON.stringify({ error: 'Not configured for purchase' }), { status: 400 });
    }

    // Determine shipping
    const isDomestic = shippingCountry === 'US';
    const shippingRate = isDomestic
      ? Number(product.shipping_domestic)
      : Number(product.shipping_international);

    const siteUrl = (import.meta.env.PUBLIC_SITE_URL || 'http://localhost:4321').replace(/\/$/, '');

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        { price: variant.stripe_price_id, quantity },
      ],
      shipping_address_collection: {
        allowed_countries: isDomestic ? ['US'] : ['US', 'CA', 'GB', 'DE', 'FR', 'JP', 'AU'],
      },
      shipping_options: [
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            fixed_amount: { amount: Math.round(shippingRate * 100), currency: 'usd' },
            display_name: isDomestic ? 'Domestic shipping' : 'International shipping',
            delivery_estimate: {
              minimum: { unit: 'business_day', value: 3 },
              maximum: { unit: 'business_day', value: 7 },
            },
          },
        },
      ],
      metadata: {
        variant_id: variantId,
        product_id: product.id as string,
        quantity: quantity.toString(),
      },
      success_url: `${siteUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/shop/${product.id}`,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Checkout error:', err);
    return new Response(JSON.stringify({ error: 'Failed to create checkout' }), { status: 500 });
  }
};
