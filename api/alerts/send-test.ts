import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

/**
 * Send a test alert to Slack.
 * Called from the AlertsModal "Enviar prueba" button.
 *
 * Auth: Supabase JWT (same as frontend session).
 * POST body: { channel: 'slack' | 'email', consultantName: string }
 */

function getYesterdayLabel(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const days = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `${days[yesterday.getDay()]} ${yesterday.getDate()} ${months[yesterday.getMonth()]}`;
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

    const message = [
      `:test_tube: *Alerta de prueba — ${dateLabel}*`,
      ``,
      `Buenos dias, *${firstName}* :wave:`,
      ``,
      `Este es un mensaje de prueba enviado desde TPHub.`,
      `Si ves este mensaje, tu integracion de Slack esta funcionando correctamente.`,
      ``,
      `:red_circle: *Ejemplo CRITICO* — Il Capriccio Napoletano | Gran Via (Glovo) — 12 pedidos (media: 35) → *-66%*`,
      `:large_yellow_circle: *Ejemplo ATENCION* — Compa | Malasana (UberEats) — Rating: 3.2 (media: 4.1) → *-22%*`,
      ``,
      `_Mensaje de prueba desde TPHub Alertas_`,
    ].join('\n');

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: message }),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error(`[send-test] Slack webhook failed: ${response.status} ${body}`);
      return res.status(502).json({ error: 'Slack webhook failed' });
    }

    return res.status(200).json({ ok: true, channel: 'slack' });
  }

  // Email test not implemented yet
  return res.status(200).json({ ok: true, channel, message: 'Email test not implemented yet' });
}
