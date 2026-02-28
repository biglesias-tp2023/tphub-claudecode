/**
 * Email helper for daily alerts.
 * Uses Resend API to send HTML emails with TPHub branding.
 *
 * @module api/alerts/email
 */

import { escapeHtml } from './auth.js';

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

export interface AlertCompanyData {
  name: string;
  severity: 'critical' | 'warning' | 'attention';
  metrics: { label: string; value: string; threshold: string }[];
}

const SEVERITY_STYLES = {
  critical: { border: '#ef4444', bg: '#fef2f2', label: '#b91c1c', text: 'CRITICO' },
  warning: { border: '#f97316', bg: '#fff7ed', label: '#c2410c', text: 'URGENTE' },
  attention: { border: '#f59e0b', bg: '#fffbeb', label: '#b45309', text: 'ATENCION' },
} as const;

/**
 * Build branded HTML email for alert notifications — Premium template
 */
export function buildAlertEmailHtml(
  consultantName: string,
  dateLabel: string,
  companies: AlertCompanyData[]
): string {
  const firstName = consultantName.split(' ')[0];

  const companyCards = companies
    .map((company) => {
      const style = SEVERITY_STYLES[company.severity];

      const metricsHtml = company.metrics
        .map(
          (m) =>
            `<li style="margin: 2px 0; font-size: 13px; color: #374151;">
              ${escapeHtml(m.label)}: <strong>${escapeHtml(m.value)}</strong>
              <span style="color: #9ca3af;">(umbral ${escapeHtml(m.threshold)})</span>
            </li>`
        )
        .join('\n');

      return `
      <div style="border-left: 4px solid ${style.border}; background: ${style.bg}; border-radius: 8px; padding: 12px 16px; margin-bottom: 12px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="font-size: 14px; font-weight: 700; color: #111827;">
              ${escapeHtml(company.name)}
            </td>
            <td align="right">
              <span style="font-size: 10px; font-weight: 700; color: ${style.label}; background: white; padding: 2px 8px; border-radius: 10px;">
                ${style.text}
              </span>
            </td>
          </tr>
        </table>
        <ul style="margin: 6px 0 0; padding: 0 0 0 16px;">
          ${metricsHtml}
        </ul>
      </div>`;
    })
    .join('\n');

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin: 0; padding: 0; background-color: #f3f7f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 24px;">
    <!-- Header -->
    <div style="background-color: #095789; border-radius: 12px 12px 0 0; padding: 24px; text-align: center;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td align="center">
            <img src="https://hub.thinkpaladar.com/images/logo/icon.svg" alt="TPHub" width="48" height="48" style="display: block; margin: 0 auto 12px;" />
          </td>
        </tr>
      </table>
      <h1 style="color: white; font-size: 18px; margin: 0; font-weight: 600;">
        Daily Alerts TPHub
      </h1>
      <p style="color: rgba(255,255,255,0.8); font-size: 13px; margin: 4px 0 0;">
        ${escapeHtml(dateLabel)}
      </p>
    </div>

    <!-- Body -->
    <div style="background-color: white; padding: 24px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none;">
      <p style="color: #6b7280; font-size: 14px; margin: 0 0 20px;">
        Hola ${escapeHtml(firstName)}, estas son las anomalias detectadas en tus empresas:
      </p>

      ${companyCards || '<p style="color: #9ca3af; font-size: 14px; text-align: center; padding: 20px 0;">Sin alertas</p>'}

      <!-- CTA Button -->
      <div style="text-align: center; margin: 24px 0 16px;">
        <a href="https://hub.thinkpaladar.com/alerts" style="display: inline-block; background-color: #095789; color: white; text-decoration: none; padding: 10px 24px; border-radius: 8px; font-size: 14px; font-weight: 600;">
          Ver detalles en TPHub
        </a>
      </div>

      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />

      <!-- Footer -->
      <p style="color: #9ca3af; font-size: 12px; margin: 0; text-align: center;">
        ThinkPaladar &mdash; Consultoria de Delivery
      </p>
      <p style="color: #9ca3af; font-size: 11px; margin: 6px 0 0; text-align: center;">
        <a href="https://hub.thinkpaladar.com/alerts" style="color: #095789; text-decoration: none;">Configurar alertas</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}
