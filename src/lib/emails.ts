import { resend } from './resend';

const FROM_ADDRESS = 'Tool <hello@tool.nyc>';

// Shared brand constants
const FONT_STACK =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
const COLOR_BLACK = '#000000';
const COLOR_WHITE = '#FFFFFF';
const COLOR_GRAY = '#666666';
const COLOR_LIGHT_GRAY = '#F5F5F5';
const COLOR_BORDER = '#E0E0E0';
// Brand CMYK accents — available for future templates
// const COLOR_CYAN = '#00FFFF';
// const COLOR_MAGENTA = '#FF00FF';
// const COLOR_YELLOW = '#FFEB00';

/**
 * Wraps email body content in the shared brand layout shell.
 */
function brandShell(bodyContent: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Tool</title>
</head>
<body style="margin:0; padding:0; background-color:${COLOR_WHITE}; font-family:${FONT_STACK}; color:${COLOR_BLACK}; -webkit-text-size-adjust:100%;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${COLOR_WHITE};">
    <tr>
      <td align="center" style="padding:0;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px; width:100%;">
          <!-- Header -->
          <tr>
            <td style="padding:40px 32px 24px 32px; border-bottom:1px solid ${COLOR_BLACK};">
              <span style="font-size:28px; font-weight:700; letter-spacing:6px; color:${COLOR_BLACK}; text-decoration:none;">TOOL</span>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              ${bodyContent}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 32px 40px 32px; border-top:1px solid ${COLOR_BORDER};">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-size:12px; color:${COLOR_GRAY}; line-height:1.6;">
                    <a href="https://tool.nyc" style="color:${COLOR_BLACK}; text-decoration:none; font-weight:600;">tool.nyc</a>
                    <br />
                    Creative technical consultancy
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// 1. Magic Link
// ---------------------------------------------------------------------------

export async function sendMagicLinkEmail(to: string, magicLinkUrl: string): Promise<void> {
  const html = brandShell(`
    <p style="font-size:16px; line-height:1.6; margin:0 0 24px 0; color:${COLOR_BLACK};">
      Here is your login link for the Tool client portal. Click the button below to sign in.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px 0;">
      <tr>
        <td style="background-color:${COLOR_BLACK}; border-radius:0;">
          <a href="${magicLinkUrl}" style="display:inline-block; padding:14px 32px; font-size:14px; font-weight:600; letter-spacing:1px; color:${COLOR_WHITE}; text-decoration:none; text-transform:uppercase;">
            Sign in to Portal
          </a>
        </td>
      </tr>
    </table>
    <p style="font-size:13px; line-height:1.5; margin:0 0 16px 0; color:${COLOR_GRAY};">
      If the button above doesn't work, copy and paste this URL into your browser:
    </p>
    <p style="font-size:13px; line-height:1.5; margin:0 0 24px 0; word-break:break-all;">
      <a href="${magicLinkUrl}" style="color:${COLOR_BLACK}; text-decoration:underline;">${magicLinkUrl}</a>
    </p>
    <p style="font-size:13px; line-height:1.5; margin:0; color:${COLOR_GRAY};">
      This link expires in 1 hour. If you didn't request this, you can safely ignore this email.
    </p>
  `);

  if (!resend) {
    console.warn('Resend not configured — skipping magic link email');
    return;
  }

  try {
    await resend.emails.send({
      from: FROM_ADDRESS,
      to: [to],
      subject: 'Your Tool portal login link',
      html,
    });
  } catch (err) {
    console.error('Failed to send magic link email:', err);
  }
}

// ---------------------------------------------------------------------------
// 2. Order Confirmation
// ---------------------------------------------------------------------------

interface OrderItem {
  name: string;
  variant: string;
  quantity: number;
  price: number;
}

interface OrderDetails {
  customerName: string;
  items: OrderItem[];
  total: number;
  orderId: string;
}

function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

export async function sendOrderConfirmationEmail(
  to: string,
  order: OrderDetails,
): Promise<void> {
  const itemRows = order.items
    .map(
      (item) => `
      <tr>
        <td style="padding:10px 12px; font-size:14px; line-height:1.5; border-bottom:1px solid ${COLOR_BORDER};">
          ${item.name}<br />
          <span style="color:${COLOR_GRAY}; font-size:12px;">${item.variant}</span>
        </td>
        <td style="padding:10px 12px; font-size:14px; text-align:center; border-bottom:1px solid ${COLOR_BORDER};">
          ${item.quantity}
        </td>
        <td style="padding:10px 12px; font-size:14px; text-align:right; border-bottom:1px solid ${COLOR_BORDER};">
          ${formatCurrency(item.price)}
        </td>
      </tr>`,
    )
    .join('');

  const html = brandShell(`
    <p style="font-size:16px; line-height:1.6; margin:0 0 8px 0; color:${COLOR_BLACK};">
      Thanks for your order, ${order.customerName}.
    </p>
    <p style="font-size:14px; line-height:1.6; margin:0 0 24px 0; color:${COLOR_GRAY};">
      We're getting it ready. Here's a summary of what you ordered.
    </p>

    <!-- Order table -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px 0; border:1px solid ${COLOR_BORDER};">
      <tr style="background-color:${COLOR_LIGHT_GRAY};">
        <td style="padding:10px 12px; font-size:12px; font-weight:600; text-transform:uppercase; letter-spacing:1px; border-bottom:1px solid ${COLOR_BORDER};">Item</td>
        <td style="padding:10px 12px; font-size:12px; font-weight:600; text-transform:uppercase; letter-spacing:1px; text-align:center; border-bottom:1px solid ${COLOR_BORDER};">Qty</td>
        <td style="padding:10px 12px; font-size:12px; font-weight:600; text-transform:uppercase; letter-spacing:1px; text-align:right; border-bottom:1px solid ${COLOR_BORDER};">Price</td>
      </tr>
      ${itemRows}
      <tr>
        <td colspan="2" style="padding:12px; font-size:14px; font-weight:600; text-align:right; border-top:2px solid ${COLOR_BLACK};">
          Total
        </td>
        <td style="padding:12px; font-size:14px; font-weight:600; text-align:right; border-top:2px solid ${COLOR_BLACK};">
          ${formatCurrency(order.total)}
        </td>
      </tr>
    </table>

    <p style="font-size:13px; line-height:1.5; margin:0 0 24px 0; color:${COLOR_GRAY};">
      Order reference: <strong style="color:${COLOR_BLACK};">${order.orderId}</strong>
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${COLOR_LIGHT_GRAY}; margin:0 0 0 0;">
      <tr>
        <td style="padding:16px; font-size:13px; line-height:1.5; color:${COLOR_GRAY};">
          Orders typically ship within 5 &ndash; 7 business days. We'll send you tracking info once it's on its way.
        </td>
      </tr>
    </table>
  `);

  if (!resend) {
    console.warn('Resend not configured — skipping order confirmation email');
    return;
  }

  try {
    await resend.emails.send({
      from: FROM_ADDRESS,
      to: [to],
      subject: 'Order confirmed — Tool',
      html,
    });
  } catch (err) {
    console.error('Failed to send order confirmation email:', err);
  }
}

// ---------------------------------------------------------------------------
// 3. Inquiry Notification (to admin)
// ---------------------------------------------------------------------------

interface InquiryDetails {
  name: string;
  email: string;
  company?: string;
  message: string;
  budget?: string;
  timeline?: string;
}

export async function sendInquiryNotificationEmail(inquiry: InquiryDetails): Promise<void> {
  const detailRows = [
    { label: 'Name', value: inquiry.name },
    { label: 'Email', value: inquiry.email },
    inquiry.company ? { label: 'Company', value: inquiry.company } : null,
    inquiry.budget ? { label: 'Budget', value: inquiry.budget } : null,
    inquiry.timeline ? { label: 'Timeline', value: inquiry.timeline } : null,
  ]
    .filter(Boolean)
    .map(
      (row) => `
      <tr>
        <td style="padding:8px 12px; font-size:12px; font-weight:600; text-transform:uppercase; letter-spacing:1px; color:${COLOR_GRAY}; vertical-align:top; width:100px; border-bottom:1px solid ${COLOR_BORDER};">
          ${row!.label}
        </td>
        <td style="padding:8px 12px; font-size:14px; line-height:1.5; color:${COLOR_BLACK}; border-bottom:1px solid ${COLOR_BORDER};">
          ${row!.value}
        </td>
      </tr>`,
    )
    .join('');

  const html = brandShell(`
    <p style="font-size:16px; line-height:1.6; margin:0 0 24px 0; color:${COLOR_BLACK};">
      New project inquiry received.
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px 0; border:1px solid ${COLOR_BORDER};">
      ${detailRows}
    </table>

    <p style="font-size:12px; font-weight:600; text-transform:uppercase; letter-spacing:1px; color:${COLOR_GRAY}; margin:0 0 8px 0;">
      Message
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 0 0;">
      <tr>
        <td style="padding:16px; font-size:14px; line-height:1.6; color:${COLOR_BLACK}; background-color:${COLOR_LIGHT_GRAY};">
          ${inquiry.message.replace(/\n/g, '<br />')}
        </td>
      </tr>
    </table>
  `);

  if (!resend) {
    console.warn('Resend not configured — skipping inquiry notification email');
    return;
  }

  try {
    await resend.emails.send({
      from: FROM_ADDRESS,
      to: ['hello@tool.nyc'],
      subject: `New inquiry from ${inquiry.name}`,
      html,
    });
  } catch (err) {
    console.error('Failed to send inquiry notification email:', err);
  }
}

// ---------------------------------------------------------------------------
// 4. Inquiry Auto-reply (to submitter)
// ---------------------------------------------------------------------------

export async function sendInquiryAutoReplyEmail(to: string, name: string): Promise<void> {
  const html = brandShell(`
    <p style="font-size:16px; line-height:1.6; margin:0 0 16px 0; color:${COLOR_BLACK};">
      Hi ${name},
    </p>
    <p style="font-size:16px; line-height:1.6; margin:0 0 16px 0; color:${COLOR_BLACK};">
      Thanks for reaching out. We received your inquiry and will review it shortly.
    </p>
    <p style="font-size:16px; line-height:1.6; margin:0 0 24px 0; color:${COLOR_BLACK};">
      You can expect a response within 1 &ndash; 2 business days. If your project is time-sensitive, feel free to reply to this email directly.
    </p>
    <p style="font-size:14px; line-height:1.5; margin:0; color:${COLOR_GRAY};">
      &mdash; Tool
    </p>
  `);

  if (!resend) {
    console.warn('Resend not configured — skipping inquiry auto-reply email');
    return;
  }

  try {
    await resend.emails.send({
      from: FROM_ADDRESS,
      to: [to],
      subject: 'We got your message — Tool',
      html,
    });
  } catch (err) {
    console.error('Failed to send inquiry auto-reply email:', err);
  }
}
