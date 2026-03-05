import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { sendEmail, buildAlertEmailHtml } from './email.js';

/**
 * Send a test alert to Slack or Email.
 * Called from the AlertsModal "Enviar prueba" button.
 *
 * Auth: Supabase JWT (same as frontend session).
 * POST body: { channel: 'slack' | 'email', consultantName: string }
 */

function getYesterday(): Date {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d;
}

function getYesterdayLabel(): string {
  const d = getYesterday();
  const days = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  return `${days[d.getDay()]}, ${d.getDate()} de ${months[d.getMonth()]}, ${d.getFullYear()}`;
}

function getYesterdayLong(): string {
  const d = getYesterday();
  const days = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];
  const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  return `${days[d.getDay()]}, ${d.getDate()} de ${months[d.getMonth()]} de ${d.getFullYear()}`;
}

function getYesterdayShort(): string {
  const d = getYesterday();
  const days = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${days[d.getDay()]}, ${dd}/${mm}/${d.getFullYear()}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify user is authenticated via Supabase JWT
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization' });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Missing Supabase configuration' });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  // Verify user has @thinkpaladar.com email
  if (!user.email?.endsWith('@thinkpaladar.com')) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { channel = 'slack', consultantName = 'Consultor' } = req.body ?? {};
  const firstName = consultantName.split(' ')[0];
  const dateLabel = getYesterdayLabel();

  if (channel === 'slack') {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (!webhookUrl) {
      return res.status(500).json({ error: 'SLACK_WEBHOOK_URL not configured' });
    }

    const TPHUB_URL = 'https://hub.thinkpaladar.com/controlling';
    const fallbackText = `Alerta de prueba — ${dateLabel}`;
    const blocks = [
      { type: 'header', text: { type: 'plain_text', text: `\uD83E\uDDEA Alerta de prueba del ${dateLabel}`, emoji: true } },
      { type: 'section', text: { type: 'mrkdwn', text: `Buenos días, *${firstName}* :wave:\n\nEste es un mensaje de prueba enviado desde TPHub.\nSi ves este mensaje, tu integración de Slack está funcionando correctamente.` } },
      { type: 'divider' },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: `*Il Capriccio Napoletano*  —  <${TPHUB_URL}|Ver en TPHub>\n:chart_with_downwards_trend: Glovo: 12 (media 35) → *-66%*\n:star: Glovo: 2.8 vs 4.2 · 3 negativas` },
      },
      { type: 'divider' },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: `*Compa*  —  <${TPHUB_URL}|Ver en TPHub>\n:chart_with_downwards_trend: UberEats: 8 (media 22) → *-64%*\n:star: UberEats: 3.2 vs 4.1 · 5 negativas` },
      },
      { type: 'divider' },
      { type: 'context', elements: [{ type: 'mrkdwn', text: '_Mensaje de prueba desde TPHub Alertas_' }] },
    ];

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: fallbackText, blocks }),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error(`[send-test] Slack webhook failed: ${response.status} ${body}`);
      return res.status(502).json({ error: 'Slack webhook failed' });
    }

    return res.status(200).json({ ok: true, channel: 'slack' });
  }

  if (channel === 'email') {
    const html = buildAlertEmailHtml(firstName, getYesterdayLong(), [
      {
        name: 'Il Capriccio Napoletano',
        severity: 'critical',
        metrics: [
          { label: 'Pedidos', value: '12 (media: 35) → -66%', threshold: '-20%' },
          { label: 'Resenas', value: '2.8 (media: 4.2)', threshold: '3.5' },
        ],
      },
      {
        name: 'Compa',
        severity: 'warning',
        metrics: [
          { label: 'Pedidos', value: '8 (media: 22) → -64%', threshold: '-20%' },
          { label: 'Ads ROAS', value: '1.2x (media: 3.5x)', threshold: '3.0x' },
        ],
      },
      {
        name: 'Asi se Asa',
        severity: 'attention',
        metrics: [
          { label: 'Resenas', value: '3.2 (media: 4.1) | 5 negativas', threshold: '3.5' },
        ],
      },
    ]);

    const sent = await sendEmail({
      to: user.email!,
      subject: `[PRUEBA] \u26A0\uFE0F TP Hub: tus alertas diarias (${getYesterdayShort()})`,
      html,
    });

    if (!sent) {
      return res.status(502).json({ error: 'Failed to send email' });
    }

    return res.status(200).json({ ok: true, channel: 'email' });
  }

  return res.status(400).json({ error: 'Invalid channel' });
}
