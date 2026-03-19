/**
 * Weekly Report Email Template — builds branded HTML for the weekly summary email.
 *
 * @module api/reports/weeklyEmail
 */

import { escapeHtml } from '../alerts/auth.js';
import type { WeeklyReportData, LocationRow } from './weeklyAggregation.js';

// ============================================
// Helpers
// ============================================

function formatEur(n: number): string {
  return n.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + '€';
}

function formatPct(n: number | null): string {
  if (n == null) return '—';
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}%`;
}

function formatChannel(ch: string): string {
  if (ch === 'glovo') return 'Glovo';
  if (ch === 'ubereats') return 'UberEats';
  if (ch === 'justeat') return 'JustEat';
  return ch;
}

function semaforoCircle(s: 'green' | 'yellow' | 'red'): string {
  const colors = { green: '#22c55e', yellow: '#eab308', red: '#ef4444' };
  return `<span style="color:${colors[s]};font-size:16px;">&#9679;</span>`;
}

function investmentDecision(roas: number | null): { text: string; color: string } {
  if (roas == null) return { text: 'Sin inversión', color: '#6b7280' };
  if (roas >= 6) return { text: 'Mantener/Incrementar', color: '#16a34a' };
  if (roas >= 3) return { text: 'Mantener', color: '#ca8a04' };
  return { text: 'Evaluar/Reducir', color: '#dc2626' };
}

// ============================================
// Section builders
// ============================================

function buildExecutiveSummary(data: WeeklyReportData): string {
  const evColor = data.evSemanalPct >= 0 ? '#16a34a' : '#dc2626';
  const glovoColor = data.glovoEvPct >= 0 ? '#16a34a' : '#dc2626';
  const uberColor = data.uberEvPct >= 0 ? '#16a34a' : '#dc2626';

  return `
    <div style="background:#f0f9ff;border-radius:8px;padding:16px 20px;margin-bottom:20px;">
      <h2 style="margin:0 0 12px;font-size:15px;color:#095789;">Resumen Ejecutivo</h2>
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="padding:4px 0;font-size:14px;color:#374151;">
            <strong>Ventas totales:</strong> ${formatEur(data.totalVentas)}
            <span style="color:${evColor};font-weight:600;margin-left:8px;">${formatPct(data.evSemanalPct)}</span>
          </td>
        </tr>
        ${data.glovoVentas > 0 ? `
        <tr>
          <td style="padding:4px 0;font-size:13px;color:#6b7280;">
            Glovo: ${formatEur(data.glovoVentas)}
            <span style="color:${glovoColor};">${formatPct(data.glovoEvPct)}</span>
          </td>
        </tr>` : ''}
        ${data.uberVentas > 0 ? `
        <tr>
          <td style="padding:4px 0;font-size:13px;color:#6b7280;">
            UberEats: ${formatEur(data.uberVentas)}
            <span style="color:${uberColor};">${formatPct(data.uberEvPct)}</span>
          </td>
        </tr>` : ''}
      </table>
    </div>`;
}

function buildAlertsSection(alerts: LocationRow[]): string {
  if (alerts.length === 0) return '';

  const rows = alerts
    .sort((a, b) => (a.evSemanalPct ?? 0) - (b.evSemanalPct ?? 0))
    .map(
      (loc) => `
      <tr>
        <td style="padding:6px 8px;font-size:13px;color:#374151;border-bottom:1px solid #fecaca;">
          ${escapeHtml(loc.storeName)} — ${escapeHtml(loc.addressName)}
          <span style="color:#9ca3af;font-size:11px;">(${formatChannel(loc.channelId)})</span>
        </td>
        <td align="right" style="padding:6px 8px;font-size:13px;color:#dc2626;font-weight:600;border-bottom:1px solid #fecaca;">
          ${formatPct(loc.evSemanalPct)}
        </td>
        <td align="right" style="padding:6px 8px;font-size:13px;color:#374151;border-bottom:1px solid #fecaca;">
          ${formatEur(loc.ventas)}
        </td>
      </tr>`,
    )
    .join('');

  return `
    <div style="margin-bottom:20px;">
      <h2 style="margin:0 0 8px;font-size:15px;color:#dc2626;">&#9888; Alertas (caída ≥ 15%)</h2>
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fef2f2;border-radius:8px;overflow:hidden;">
        <thead>
          <tr style="background:#fecaca;">
            <th align="left" style="padding:6px 8px;font-size:11px;color:#991b1b;text-transform:uppercase;">Ubicación</th>
            <th align="right" style="padding:6px 8px;font-size:11px;color:#991b1b;text-transform:uppercase;">Ev. Sem.</th>
            <th align="right" style="padding:6px 8px;font-size:11px;color:#991b1b;text-transform:uppercase;">Ventas</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

function buildHighlightsSection(highlights: LocationRow[]): string {
  if (highlights.length === 0) return '';

  const rows = highlights
    .sort((a, b) => (b.evSemanalPct ?? 0) - (a.evSemanalPct ?? 0))
    .map(
      (loc) => `
      <tr>
        <td style="padding:6px 8px;font-size:13px;color:#374151;border-bottom:1px solid #bbf7d0;">
          ${escapeHtml(loc.storeName)} — ${escapeHtml(loc.addressName)}
          <span style="color:#9ca3af;font-size:11px;">(${formatChannel(loc.channelId)})</span>
        </td>
        <td align="right" style="padding:6px 8px;font-size:13px;color:#16a34a;font-weight:600;border-bottom:1px solid #bbf7d0;">
          ${formatPct(loc.evSemanalPct)}
        </td>
        <td align="right" style="padding:6px 8px;font-size:13px;color:#374151;border-bottom:1px solid #bbf7d0;">
          ${formatEur(loc.ventas)}
        </td>
      </tr>`,
    )
    .join('');

  return `
    <div style="margin-bottom:20px;">
      <h2 style="margin:0 0 8px;font-size:15px;color:#16a34a;">&#9889; Highlights (subida ≥ 10%)</h2>
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f0fdf4;border-radius:8px;overflow:hidden;">
        <thead>
          <tr style="background:#bbf7d0;">
            <th align="left" style="padding:6px 8px;font-size:11px;color:#166534;text-transform:uppercase;">Ubicación</th>
            <th align="right" style="padding:6px 8px;font-size:11px;color:#166534;text-transform:uppercase;">Ev. Sem.</th>
            <th align="right" style="padding:6px 8px;font-size:11px;color:#166534;text-transform:uppercase;">Ventas</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

function buildInvestmentSection(investments: LocationRow[]): string {
  if (investments.length === 0) return '';

  const rows = investments
    .sort((a, b) => (b.roasAds ?? 0) - (a.roasAds ?? 0))
    .map((loc) => {
      const decision = investmentDecision(loc.roasAds);
      return `
      <tr>
        <td style="padding:6px 8px;font-size:13px;color:#374151;border-bottom:1px solid #e5e7eb;">
          ${escapeHtml(loc.storeName)} — ${escapeHtml(loc.addressName)}
          <span style="color:#9ca3af;font-size:11px;">(${formatChannel(loc.channelId)})</span>
        </td>
        <td align="right" style="padding:6px 8px;font-size:13px;color:#374151;border-bottom:1px solid #e5e7eb;">
          ${formatEur(loc.adSpent)}
        </td>
        <td align="right" style="padding:6px 8px;font-size:13px;color:#374151;border-bottom:1px solid #e5e7eb;">
          ${loc.roasAds != null ? loc.roasAds + 'x' : '—'}
        </td>
        <td align="right" style="padding:6px 8px;font-size:13px;color:${decision.color};font-weight:600;border-bottom:1px solid #e5e7eb;">
          ${decision.text}
        </td>
      </tr>`;
    })
    .join('');

  return `
    <div style="margin-bottom:20px;">
      <h2 style="margin:0 0 8px;font-size:15px;color:#095789;">&#128176; Decisiones de Inversión</h2>
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8fafc;border-radius:8px;overflow:hidden;">
        <thead>
          <tr style="background:#e2e8f0;">
            <th align="left" style="padding:6px 8px;font-size:11px;color:#475569;text-transform:uppercase;">Ubicación</th>
            <th align="right" style="padding:6px 8px;font-size:11px;color:#475569;text-transform:uppercase;">Inv.</th>
            <th align="right" style="padding:6px 8px;font-size:11px;color:#475569;text-transform:uppercase;">ROAS</th>
            <th align="right" style="padding:6px 8px;font-size:11px;color:#475569;text-transform:uppercase;">Decisión</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

function buildConsolidatedTable(locations: LocationRow[]): string {
  if (locations.length === 0) return '';

  const rows = locations
    .map(
      (loc) => `
      <tr>
        <td style="padding:5px 6px;font-size:12px;color:#374151;border-bottom:1px solid #e5e7eb;white-space:nowrap;">
          ${semaforoCircle(loc.semaforo)}
        </td>
        <td style="padding:5px 6px;font-size:12px;color:#374151;border-bottom:1px solid #e5e7eb;">
          ${escapeHtml(loc.storeName)}<br/>
          <span style="color:#9ca3af;font-size:11px;">${escapeHtml(loc.addressName)}</span>
        </td>
        <td style="padding:5px 6px;font-size:12px;color:#374151;border-bottom:1px solid #e5e7eb;">
          ${formatChannel(loc.channelId)}
        </td>
        <td align="right" style="padding:5px 6px;font-size:12px;color:#374151;border-bottom:1px solid #e5e7eb;">
          ${formatEur(loc.ventas)}
        </td>
        <td align="right" style="padding:5px 6px;font-size:12px;color:${(loc.evSemanalPct ?? 0) >= 0 ? '#16a34a' : '#dc2626'};font-weight:600;border-bottom:1px solid #e5e7eb;">
          ${formatPct(loc.evSemanalPct)}
        </td>
        <td align="right" style="padding:5px 6px;font-size:12px;color:#374151;border-bottom:1px solid #e5e7eb;">
          ${loc.roasAds != null ? loc.roasAds + 'x' : '—'}
        </td>
        <td align="right" style="padding:5px 6px;font-size:12px;color:#374151;border-bottom:1px solid #e5e7eb;">
          ${loc.roasPromo != null ? loc.roasPromo + 'x' : '—'}
        </td>
        <td align="right" style="padding:5px 6px;font-size:12px;color:#374151;border-bottom:1px solid #e5e7eb;">
          ${loc.nuevos}
        </td>
        <td align="right" style="padding:5px 6px;font-size:12px;color:#374151;border-bottom:1px solid #e5e7eb;">
          ${loc.recurrentes}
        </td>
      </tr>`,
    )
    .join('');

  return `
    <div style="margin-bottom:20px;">
      <h2 style="margin:0 0 8px;font-size:15px;color:#095789;">&#128202; Tabla Consolidada</h2>
      <div style="overflow-x:auto;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:white;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb;">
          <thead>
            <tr style="background:#095789;">
              <th style="padding:6px;font-size:10px;color:white;text-transform:uppercase;width:20px;"></th>
              <th align="left" style="padding:6px;font-size:10px;color:white;text-transform:uppercase;">Marca / Ciudad</th>
              <th align="left" style="padding:6px;font-size:10px;color:white;text-transform:uppercase;">Plat.</th>
              <th align="right" style="padding:6px;font-size:10px;color:white;text-transform:uppercase;">Ventas</th>
              <th align="right" style="padding:6px;font-size:10px;color:white;text-transform:uppercase;">Ev.Sem</th>
              <th align="right" style="padding:6px;font-size:10px;color:white;text-transform:uppercase;">ROAS Ads</th>
              <th align="right" style="padding:6px;font-size:10px;color:white;text-transform:uppercase;">ROAS Promo</th>
              <th align="right" style="padding:6px;font-size:10px;color:white;text-transform:uppercase;">Nuevos</th>
              <th align="right" style="padding:6px;font-size:10px;color:white;text-transform:uppercase;">Recurr.</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>`;
}

// ============================================
// Public API
// ============================================

/**
 * Build the full HTML email for a weekly report.
 */
export function buildWeeklyReportHtml(data: WeeklyReportData): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f3f7f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:700px;margin:0 auto;padding:24px;">

    <!-- Header -->
    <div style="background-color:#095789;border-radius:12px 12px 0 0;padding:24px;text-align:center;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td align="center">
            <img src="https://hub.thinkpaladar.com/images/logo/pictograma-blanc.png" alt="TPHub" width="48" height="48" style="display:block;margin:0 auto 12px;border:0;" />
          </td>
        </tr>
      </table>
      <h1 style="color:white;font-size:20px;margin:0;font-weight:600;">
        Informe Semanal
      </h1>
      <p style="color:rgba(255,255,255,0.85);font-size:14px;margin:6px 0 0;">
        ${escapeHtml(data.companyName)} &middot; Semana del ${escapeHtml(data.weekLabel)}
      </p>
    </div>

    <!-- Body -->
    <div style="background-color:white;padding:24px;border-radius:0 0 12px 12px;border:1px solid #e5e7eb;border-top:none;">

      ${buildExecutiveSummary(data)}
      ${buildAlertsSection(data.alerts)}
      ${buildHighlightsSection(data.highlights)}
      ${buildInvestmentSection(data.investments)}
      ${buildConsolidatedTable(data.allLocations)}

      <!-- CTA Button -->
      <div style="text-align:center;margin:24px 0 16px;">
        <a href="https://hub.thinkpaladar.com/controlling" style="display:inline-block;background-color:#095789;color:white;text-decoration:none;padding:10px 24px;border-radius:8px;font-size:14px;font-weight:600;">
          Ver en TPHub
        </a>
      </div>

      <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;" />

      <!-- Footer -->
      <p style="color:#9ca3af;font-size:12px;margin:0;text-align:center;">
        ThinkPaladar &middot; hub.thinkpaladar.com
      </p>
    </div>
  </div>
</body>
</html>`;
}
