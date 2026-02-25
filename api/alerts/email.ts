/**
 * Email helper for daily alerts.
 * Uses Resend API to send HTML emails with TPHub branding.
 *
 * @module api/alerts/email
 */

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

/**
 * Send an email via Resend API
 */
export async function sendEmail({ to, subject, html }: SendEmailParams): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log('[email] RESEND_API_KEY not configured, skipping email');
    return false;
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: 'TPHub Alertas <alertas@thinkpaladar.com>',
        to,
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`[email] Resend API error: ${response.status} ${text}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[email] Failed to send:', error);
    return false;
  }
}

interface AnomalySection {
  title: string;
  items: string[];
}

/**
 * Build branded HTML email for alert notifications
 */
export function buildAlertEmailHtml(
  consultantName: string,
  dateLabel: string,
  sections: AnomalySection[]
): string {
  const sectionHtml = sections
    .filter((s) => s.items.length > 0)
    .map(
      (s) => `
      <div style="margin-bottom: 16px;">
        <h3 style="color: #095789; font-size: 14px; margin: 0 0 8px 0; font-weight: 600;">
          ${s.title}
        </h3>
        <ul style="margin: 0; padding: 0 0 0 16px; color: #374151; font-size: 13px; line-height: 1.6;">
          ${s.items.map((item) => `<li>${item}</li>`).join('\n')}
        </ul>
      </div>`
    )
    .join('\n');

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin: 0; padding: 0; background-color: #f3f7f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 24px;">
    <!-- Header -->
    <div style="background-color: #095789; border-radius: 12px 12px 0 0; padding: 24px; text-align: center;">
      <div style="width: 48px; height: 48px; border-radius: 50%; background-color: white; margin: 0 auto 12px; display: flex; align-items: center; justify-content: center;">
        <span style="color: #095789; font-weight: 700; font-size: 18px;">TP</span>
      </div>
      <h1 style="color: white; font-size: 18px; margin: 0; font-weight: 600;">
        Alertas diarias
      </h1>
      <p style="color: rgba(255,255,255,0.8); font-size: 13px; margin: 4px 0 0;">
        ${dateLabel}
      </p>
    </div>

    <!-- Body -->
    <div style="background-color: white; padding: 24px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none;">
      <p style="color: #6b7280; font-size: 14px; margin: 0 0 20px;">
        Hola ${consultantName}, estas son las anomalias detectadas en tus empresas:
      </p>
      ${sectionHtml}
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
      <p style="color: #9ca3af; font-size: 12px; margin: 0; text-align: center;">
        ThinkPaladar &mdash; Consultoria de Delivery
      </p>
    </div>
  </div>
</body>
</html>`;
}
