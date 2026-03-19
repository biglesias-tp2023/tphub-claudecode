/**
 * Weekly Report HTML Builder — client-side port of api/reports/weeklyEmail.ts.
 * Extended with consultant investment decisions and detailed breakdown.
 *
 * @module features/reports/utils/weeklyReportHtml
 */

import type { WeeklyReportData, LocationRow, LocationDetail, InvestmentDecisionMap, ReportComments } from '../types';
import { INVESTMENT_DECISIONS, locationKey } from '../types';

// ============================================
// Helpers
// ============================================

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatEur(n: number): string {
  return n.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + '\u20AC';
}

function formatPct(n: number | null): string {
  if (n == null) return '\u2014';
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}%`;
}

function formatChannel(ch: string): string {
  if (ch === 'glovo') return 'Glovo';
  if (ch === 'ubereats') return 'UberEats';
  if (ch === 'justeat') return 'JustEat';
  return ch;
}

function semaforoCircle(s: 'green' | 'yellow' | 'red' | null): string {
  if (s == null) return '<span style="color:#d1d5db;font-size:16px;">&#9679;</span>';
  const colors = { green: '#22c55e', yellow: '#eab308', red: '#ef4444' };
  return `<span style="color:${colors[s]};font-size:16px;">&#9679;</span>`;
}

function evColor(n: number | null): string {
  if (n == null) return '#9ca3af';
  return n >= 0 ? '#16a34a' : '#dc2626';
}

// ============================================
// Section builders
// ============================================


function consecucionColor(pct: number): string {
  if (pct >= 80) return '#16a34a';
  if (pct >= 50) return '#ca8a04';
  return '#dc2626';
}

function buildExecutiveSummary(data: WeeklyReportData): string {
  const ec = data.evSemanalPct >= 0 ? '#16a34a' : '#dc2626';
  const gc = data.glovoEvPct >= 0 ? '#16a34a' : '#dc2626';
  const uc = data.uberEvPct >= 0 ? '#16a34a' : '#dc2626';

  const ml = getMonthLabel(data.monthKey);
  const objHtml = data.objetivoTotal != null ? `
          <td align="right" valign="top" style="width:160px;">
            <div style="font-size:10px;font-weight:700;color:#095789;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Objetivo ${ml}</div>
            <div style="font-size:20px;font-weight:700;color:#111827;">${formatEur(data.objetivoTotal)}</div>
            <div style="font-size:12px;color:#374151;margin-top:4px;">Acumulado: <strong>${formatEur(data.ventasMesTotal)}</strong></div>
            ${data.consecucionTotalPct != null ? `<div style="font-size:13px;font-weight:700;color:${consecucionColor(data.consecucionTotalPct)};margin-top:2px;">${data.consecucionTotalPct.toFixed(1)}% consecución</div>` : ''}
          </td>` : `
          <td align="right" valign="top" style="width:160px;">
            <div style="font-size:10px;font-weight:700;color:#095789;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Objetivo ${ml}</div>
            <div style="font-size:12px;color:#374151;">Acumulado: <strong>${formatEur(data.ventasMesTotal)}</strong></div>
            <div style="font-size:11px;color:#9ca3af;margin-top:2px;">Sin objetivo configurado</div>
          </td>`;

  return `
    <div style="background:#f0f9ff;border-radius:8px;padding:16px 20px;margin-bottom:20px;">
      <h2 style="margin:0 0 12px;font-size:15px;color:#095789;">Resumen Ejecutivo</h2>
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td valign="top">
            <table cellpadding="0" cellspacing="0" border="0">
              <tr><td style="padding:4px 0;font-size:14px;color:#374151;"><strong>Ventas totales:</strong> ${formatEur(data.totalVentas)} <span style="color:${ec};font-weight:600;margin-left:8px;">${formatPct(data.evSemanalPct)}</span></td></tr>
              ${data.glovoVentas > 0 ? `<tr><td style="padding:4px 0;font-size:13px;color:#6b7280;">Glovo: ${formatEur(data.glovoVentas)} <span style="color:${gc};">${formatPct(data.glovoEvPct)}</span></td></tr>` : ''}
              ${data.uberVentas > 0 ? `<tr><td style="padding:4px 0;font-size:13px;color:#6b7280;">UberEats: ${formatEur(data.uberVentas)} <span style="color:${uc};">${formatPct(data.uberEvPct)}</span></td></tr>` : ''}
            </table>
          </td>
          ${objHtml}
        </tr>
      </table>
    </div>`;
}

function buildAlertsSection(alerts: LocationRow[]): string {
  if (alerts.length === 0) return '';
  const rows = [...alerts].sort((a, b) => (a.evSemanalPct ?? 0) - (b.evSemanalPct ?? 0)).map((loc) => `
      <tr>
        <td style="padding:6px 8px;border-bottom:1px solid #fecaca;"><div style="font-size:13px;font-weight:500;color:#111827;">${escapeHtml(loc.addressName)}</div><div style="font-size:11px;color:#9ca3af;">${formatChannel(loc.channelId)} &middot; ${escapeHtml(loc.storeName)}</div></td>
        <td align="right" style="padding:6px 8px;font-size:13px;color:#dc2626;font-weight:600;border-bottom:1px solid #fecaca;">${formatPct(loc.evSemanalPct)}</td>
        <td align="right" style="padding:6px 8px;font-size:13px;color:#374151;border-bottom:1px solid #fecaca;">${formatEur(loc.ventas)}</td>
      </tr>`).join('');

  return `
    <div style="margin-bottom:20px;">
      <h2 style="margin:0 0 8px;font-size:15px;color:#dc2626;">&#9888; Alertas (ca\u00EDda \u2265 15%)</h2>
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fef2f2;border-radius:8px;overflow:hidden;">
        <thead><tr style="background:#fecaca;">
          <th align="left" style="padding:6px 8px;font-size:11px;color:#991b1b;text-transform:uppercase;">Ubicaci\u00F3n</th>
          <th align="right" style="padding:6px 8px;font-size:11px;color:#991b1b;text-transform:uppercase;">Ev. Sem.</th>
          <th align="right" style="padding:6px 8px;font-size:11px;color:#991b1b;text-transform:uppercase;">Ventas</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

function buildHighlightsSection(highlights: LocationRow[]): string {
  if (highlights.length === 0) return '';
  const rows = [...highlights].sort((a, b) => (b.evSemanalPct ?? 0) - (a.evSemanalPct ?? 0)).map((loc) => `
      <tr>
        <td style="padding:6px 8px;border-bottom:1px solid #bbf7d0;"><div style="font-size:13px;font-weight:500;color:#111827;">${escapeHtml(loc.addressName)}</div><div style="font-size:11px;color:#9ca3af;">${formatChannel(loc.channelId)} &middot; ${escapeHtml(loc.storeName)}</div></td>
        <td align="right" style="padding:6px 8px;font-size:13px;color:#16a34a;font-weight:600;border-bottom:1px solid #bbf7d0;">${formatPct(loc.evSemanalPct)}</td>
        <td align="right" style="padding:6px 8px;font-size:13px;color:#374151;border-bottom:1px solid #bbf7d0;">${formatEur(loc.ventas)}</td>
      </tr>`).join('');

  return `
    <div style="margin-bottom:20px;">
      <h2 style="margin:0 0 8px;font-size:15px;color:#16a34a;">&#9889; Highlights (subida \u2265 10%)</h2>
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f0fdf4;border-radius:8px;overflow:hidden;">
        <thead><tr style="background:#bbf7d0;">
          <th align="left" style="padding:6px 8px;font-size:11px;color:#166534;text-transform:uppercase;">Ubicaci\u00F3n</th>
          <th align="right" style="padding:6px 8px;font-size:11px;color:#166534;text-transform:uppercase;">Ev. Sem.</th>
          <th align="right" style="padding:6px 8px;font-size:11px;color:#166534;text-transform:uppercase;">Ventas</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

function buildInvestmentSection(investments: LocationRow[], decisions: InvestmentDecisionMap): string {
  if (investments.length === 0) return '';
  const rows = [...investments].sort((a, b) => {
    if (a.channelId !== b.channelId) return a.channelId === 'glovo' ? -1 : 1;
    return a.addressName.localeCompare(b.addressName, 'es');
  }).map((loc) => {
    const key = locationKey(loc);
    const dv = decisions.get(key);
    const decision = dv ? INVESTMENT_DECISIONS.find((d) => d.value === dv) : null;
    const text = decision ? decision.emailLabel : 'Pendiente';
    const color = decision ? decision.color : '#9ca3af';
    return `
      <tr>
        <td style="padding:6px 8px;font-size:13px;color:#374151;border-bottom:1px solid #e5e7eb;">${escapeHtml(loc.storeName)} \u2014 ${escapeHtml(loc.addressName)} <span style="color:#9ca3af;font-size:11px;">(${formatChannel(loc.channelId)})</span></td>
        <td align="right" style="padding:6px 8px;font-size:13px;color:#374151;border-bottom:1px solid #e5e7eb;">${formatEur(loc.adSpent)}</td>
        <td align="right" style="padding:6px 8px;font-size:13px;color:#374151;border-bottom:1px solid #e5e7eb;">${loc.roasAds != null ? loc.roasAds + 'x' : '\u2014'}</td>
        <td align="right" style="padding:6px 8px;font-size:13px;color:${color};font-weight:600;border-bottom:1px solid #e5e7eb;">${text}</td>
      </tr>`;
  }).join('');

  return `
    <div style="margin-bottom:20px;">
      <h2 style="margin:0 0 8px;font-size:15px;color:#095789;">&#128176; Decisiones de Inversi\u00F3n</h2>
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8fafc;border-radius:8px;overflow:hidden;">
        <thead><tr style="background:#e2e8f0;">
          <th align="left" style="padding:6px 8px;font-size:11px;color:#475569;text-transform:uppercase;">Ubicaci\u00F3n</th>
          <th align="right" style="padding:6px 8px;font-size:11px;color:#475569;text-transform:uppercase;">Inv.</th>
          <th align="right" style="padding:6px 8px;font-size:11px;color:#475569;text-transform:uppercase;">ROAS</th>
          <th align="right" style="padding:6px 8px;font-size:11px;color:#475569;text-transform:uppercase;">Decisi\u00F3n</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

function getMonthLabel(monthKey: string): string {
  const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const [, m] = monthKey.split('-');
  return months[parseInt(m, 10) - 1] ?? monthKey;
}

function buildConsolidatedTable(locations: LocationRow[], monthKey: string): string {
  if (locations.length === 0) return '';
  const ml = getMonthLabel(monthKey);

  const cellNum = 'padding:5px 6px;font-size:12px;color:#374151;border-bottom:1px solid #e5e7eb;white-space:nowrap;';
  const rows = locations.map((loc) => `
      <tr>
        <td style="padding:5px 6px;font-size:12px;border-bottom:1px solid #e5e7eb;white-space:nowrap;">${semaforoCircle(loc.semaforo)}</td>
        <td style="padding:5px 6px;font-size:12px;color:#374151;border-bottom:1px solid #e5e7eb;white-space:nowrap;">${escapeHtml(loc.storeName)} \u2014 ${escapeHtml(loc.addressName)}</td>
        <td style="${cellNum}">${formatChannel(loc.channelId)}</td>
        <td align="right" style="${cellNum}">${formatEur(loc.ventas)}</td>
        <td align="right" style="${cellNum}color:${evColor(loc.evSemanalPct)};font-weight:600;">${formatPct(loc.evSemanalPct)}</td>
        <td align="right" style="${cellNum}color:${loc.consecucionMesPct != null ? (loc.consecucionMesPct >= 80 ? '#16a34a' : loc.consecucionMesPct >= 50 ? '#ca8a04' : '#dc2626') : '#9ca3af'};font-weight:600;">${loc.consecucionMesPct != null ? loc.consecucionMesPct.toFixed(1) + '%' : '\u2014'}</td>
        <td align="right" style="${cellNum}">${loc.roasAds != null ? loc.roasAds + 'x' : '\u2014'}</td>
        <td align="right" style="${cellNum}">${loc.roasPromo != null ? loc.roasPromo + 'x' : '\u2014'}</td>
        <td align="right" style="${cellNum}">${loc.nuevos}</td>
        <td align="right" style="${cellNum}">${loc.recurrentes}</td>
        <td align="right" style="${cellNum}">${loc.objetivoMes != null ? formatEur(loc.objetivoMes) : '\u2014'}</td>
        <td align="center" style="padding:5px 6px;font-size:12px;border-bottom:1px solid #e5e7eb;white-space:nowrap;">${semaforoCircle(loc.estadoObjetivo)}</td>
      </tr>`).join('');

  return `
    <div style="margin-bottom:20px;">
      <h2 style="margin:0 0 8px;font-size:15px;color:#095789;">&#128202; Tabla Consolidada</h2>
      <div style="overflow-x:auto;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:white;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb;">
          <thead><tr style="background:#095789;">
            <th style="padding:6px;font-size:10px;color:white;text-transform:uppercase;width:20px;"></th>
            <th align="left" style="padding:6px;font-size:10px;color:white;text-transform:uppercase;">Marca / Ciudad</th>
            <th align="left" style="padding:6px;font-size:10px;color:white;text-transform:uppercase;">Plat.</th>
            <th align="right" style="padding:6px;font-size:10px;color:white;text-transform:uppercase;">Ventas</th>
            <th align="right" style="padding:6px;font-size:10px;color:white;text-transform:uppercase;">Ev.Sem</th>
            <th align="right" style="padding:6px;font-size:10px;color:white;text-transform:uppercase;">% Consec.</th>
            <th align="right" style="padding:6px;font-size:10px;color:white;text-transform:uppercase;">ROAS Ads</th>
            <th align="right" style="padding:6px;font-size:10px;color:white;text-transform:uppercase;">ROAS Promo</th>
            <th align="right" style="padding:6px;font-size:10px;color:white;text-transform:uppercase;">Nuevos</th>
            <th align="right" style="padding:6px;font-size:10px;color:white;text-transform:uppercase;">Recurr.</th>
            <th align="right" style="padding:6px;font-size:10px;color:white;text-transform:uppercase;">Obj. ${ml}</th>
            <th align="center" style="padding:6px;font-size:10px;color:white;text-transform:uppercase;">Estado</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>`;
}

function buildDetailSection(details: LocationDetail[], monthKey: string): string {
  const monthLabel = getMonthLabel(monthKey);
  if (details.length === 0) return '';

  const cards = details.map((detail) => {
    const sortedChannels = [...detail.channels].sort((a, b) => (a.channelId === 'glovo' ? -1 : b.channelId === 'glovo' ? 1 : 0));
    const channelCols = sortedChannels.map((ch) => {
      const sLabel = ch.semaforo === 'green' ? 'Crecimiento' : ch.semaforo === 'yellow' ? 'Estable' : 'En alerta';
      const badgeBg = ch.semaforo === 'green' ? '#ecfdf5' : ch.semaforo === 'yellow' ? '#fffbeb' : '#fef2f2';
      const badgeFg = ch.semaforo === 'green' ? '#047857' : ch.semaforo === 'yellow' ? '#b45309' : '#dc2626';
      const badgeBorder = ch.semaforo === 'green' ? '#a7f3d0' : ch.semaforo === 'yellow' ? '#fde68a' : '#fecaca';
      const recurPct = ch.pedidos > 0 ? Math.round(ch.recurrentes / ch.pedidos * 100) : 0;
      const evCol = evColor(ch.evSemanalPct);
      const evText = ch.evSemanalPct != null ? `${ch.evSemanalPct >= 0 ? '+' : ''}${ch.evSemanalPct.toFixed(1)}% vs. semana anterior` : 'Sin datos previos';
      const consecCol = consecucionColor(ch.consecucionMesPct ?? 0);

      // Separator helper
      const sep = '<tr><td colspan="2" style="padding:0;"><div style="border-top:1px solid #f3f4f6;margin:8px 0;"></div></td></tr>';

      let rows = '';

      // Headline: Ventas
      const ticketMedio = ch.pedidos > 0 ? formatEur(Math.round(ch.ventas / ch.pedidos)) : '\u2014';
      const dtText = ch.avgDeliveryTime != null ? ` \u00B7 ${ch.avgDeliveryTime.toFixed(0)} min entrega` : '';
      rows += `<tr><td colspan="2" style="padding:0 0 2px;">
        <div style="font-size:22px;font-weight:700;color:#111827;">${formatEur(ch.ventas)}</div>
        <div style="font-size:11px;font-weight:600;color:${evCol};">${evText}</div>
        <div style="font-size:11px;color:#6b7280;margin-top:3px;">${ch.pedidos} pedidos \u00B7 ${ticketMedio} ticket medio${dtText}</div>
      </td></tr>`;

      // Clientes
      rows += sep;
      rows += `<tr><td colspan="2" style="padding:0 0 4px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#9ca3af;">Clientes</td></tr>`;
      rows += `<tr><td style="padding:2px 0;font-size:12px;color:#4b5563;">Nuevos</td><td align="right" style="padding:2px 0;font-size:12px;font-weight:600;color:#111827;">${ch.nuevos}</td></tr>`;
      rows += `<tr><td style="padding:2px 0;font-size:12px;color:#4b5563;">Recurrentes</td><td align="right" style="padding:2px 0;font-size:12px;"><span style="font-weight:600;color:#111827;">${ch.recurrentes}</span> <span style="color:#9ca3af;margin-left:4px;">(${recurPct}%)</span></td></tr>`;

      // Marketing
      rows += sep;
      rows += `<tr><td colspan="2" style="padding:0 0 4px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#9ca3af;">Marketing</td></tr>`;
      // Ads
      if (ch.adSpent > 0) {
        rows += `<tr><td style="padding:2px 0;font-size:12px;color:#4b5563;">Ads</td><td align="right" style="padding:2px 0;font-size:12px;font-weight:600;color:#111827;">${ch.roasAds != null ? ch.roasAds + 'x' : '\u2014'}</td></tr>`;
        rows += `<tr><td colspan="2" style="padding:0 0 4px;font-size:10px;color:#9ca3af;">${formatEur(ch.adSpent)} invertidos \u2192 ${formatEur(ch.adRevenue)} en ventas</td></tr>`;
      } else {
        rows += `<tr><td style="padding:2px 0;font-size:12px;color:#9ca3af;">Ads</td><td align="right" style="padding:2px 0;font-size:10px;color:#d1d5db;">Sin actividad</td></tr>`;
      }
      // Promos
      if (ch.descuentos > 0) {
        rows += `<tr><td style="padding:2px 0;font-size:12px;color:#4b5563;">Promos</td><td align="right" style="padding:2px 0;font-size:12px;font-weight:600;color:#111827;">${ch.roasPromo != null ? ch.roasPromo + 'x' : '\u2014'}</td></tr>`;
        rows += `<tr><td colspan="2" style="padding:0 0 4px;font-size:10px;color:#9ca3af;">${formatEur(ch.descuentos)} invertidos \u2192 ${formatEur(ch.ventas)} en ventas</td></tr>`;
      } else {
        rows += `<tr><td style="padding:2px 0;font-size:12px;color:#9ca3af;">Promos</td><td align="right" style="padding:2px 0;font-size:10px;color:#d1d5db;">Sin actividad</td></tr>`;
      }

      // Objetivo
      if (ch.objetivoMes != null) {
        const pct = ch.consecucionMesPct ?? 0;
        const barColor = ch.estadoObjetivo === 'green' ? '#10b981' : ch.estadoObjetivo === 'yellow' ? '#f59e0b' : '#ef4444';
        rows += sep;
        rows += `<tr><td style="padding:0 0 2px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:${consecCol};">Objetivo ${monthLabel}</td><td align="right" style="padding:0 0 2px;font-size:13px;font-weight:700;color:${consecCol};">${formatEur(ch.objetivoMes)}</td></tr>`;
        rows += `<tr><td colspan="2" style="padding:4px 0;"><div style="background:#f3f4f6;border-radius:4px;height:6px;overflow:hidden;"><div style="background:${barColor};height:100%;width:${Math.min(pct, 100)}%;border-radius:4px;"></div></div></td></tr>`;
        rows += `<tr><td style="padding:0;font-size:11px;color:#6b7280;">${formatEur(ch.ventasMes)} acumulado</td><td align="right" style="padding:0;font-size:11px;font-weight:700;color:${consecCol};">${pct.toFixed(1)}%</td></tr>`;
      }

      // Top 5 productos
      if (ch.topProducts && ch.topProducts.length > 0) {
        rows += sep;
        rows += `<tr><td colspan="2" style="padding:0 0 4px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#9ca3af;">Top 5 productos</td></tr>`;
        for (let i = 0; i < ch.topProducts.length; i++) {
          const p = ch.topProducts[i];
          const promoTag = p.isPromo ? ' <span style="display:inline-block;background:#fef3c7;color:#b45309;font-size:8px;font-weight:700;padding:1px 4px;border-radius:3px;vertical-align:middle;">PROMO</span>' : '';
          rows += `<tr><td style="padding:2px 0;font-size:11px;color:#4b5563;">${i + 1}. ${escapeHtml(p.name)}${promoTag}</td><td align="right" style="padding:2px 0;font-size:11px;color:#374151;">${p.quantity} uds \u00B7 ${formatEur(p.revenue)}</td></tr>`;
        }
      }

      return `<td valign="top" style="padding:16px;width:50%;border:1px solid #f3f4f6;border-radius:6px;">
        <div style="margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid #f3f4f6;">
          <span style="font-size:13px;font-weight:700;color:#111827;">${formatChannel(ch.channelId)}</span>
          <span style="display:inline-block;margin-left:8px;background:${badgeBg};color:${badgeFg};border:1px solid ${badgeBorder};font-size:10px;font-weight:600;padding:2px 8px;border-radius:12px;">${sLabel}</span>
        </div>
        <table width="100%" cellpadding="0" cellspacing="0" border="0">${rows}</table>
      </td>`;
    }).join('');

    return `
      <div style="margin-bottom:16px;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
        <div style="background:#f9fafb;padding:10px 16px;border-bottom:1px solid #e5e7eb;">
          <strong style="font-size:13px;color:#111827;">${escapeHtml(detail.storeName)} \u2014 ${escapeHtml(detail.addressName)}</strong>
        </div>
        <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>${channelCols}</tr></table>
      </div>`;
  }).join('');

  return `
    <div style="margin-bottom:20px;">
      <h2 style="margin:0 0 4px;font-size:15px;color:#095789;">&#128205; Detalle por ubicaci\u00F3n</h2>
      <p style="margin:0 0 12px;font-size:12px;color:#6b7280;">Cada secci\u00F3n incluye: contexto, m\u00E9tricas de publicidad, m\u00E9tricas de promociones y objetivo mensual.</p>
      ${cards}
    </div>`;
}

// ============================================
// Public API
// ============================================

function buildCommentBlock(comment: string | undefined, title: string): string {
  if (!comment?.trim()) return '';
  const lines = escapeHtml(comment.trim()).replace(/\n/g, '<br/>');
  return `
    <div style="margin-bottom:20px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px 20px;">
      <h2 style="margin:0 0 8px;font-size:15px;color:#095789;">${escapeHtml(title)}</h2>
      <p style="margin:0;font-size:13px;color:#374151;line-height:1.6;">${lines}</p>
    </div>`;
}

export function buildWeeklyReportHtml(
  data: WeeklyReportData,
  decisions: InvestmentDecisionMap,
  comments?: ReportComments,
): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f3f7f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:700px;margin:0 auto;padding:24px;">
    <div style="background-color:#095789;border-radius:12px 12px 0 0;padding:24px;text-align:center;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center">
        <img src="https://hub.thinkpaladar.com/images/logo/pictograma-blanc.png" alt="TPHub" width="48" height="48" style="display:block;margin:0 auto 12px;border:0;" />
      </td></tr></table>
      <h1 style="color:white;font-size:20px;margin:0;font-weight:600;">Informe Semanal</h1>
      <p style="color:rgba(255,255,255,0.85);font-size:14px;margin:6px 0 0;">${escapeHtml(data.companyName)} &middot; Semana del ${escapeHtml(data.weekLabel)}</p>
    </div>
    <div style="background-color:white;padding:24px;border-radius:0 0 12px 12px;border:1px solid #e5e7eb;border-top:none;">
      ${buildExecutiveSummary(data)}
      ${buildCommentBlock(comments?.general, 'Comentario del consultor')}
      ${buildHighlightsSection(data.highlights)}
      ${buildAlertsSection(data.alerts)}
      ${buildCommentBlock(comments?.alerts, 'Comentarios sobre rendimiento')}
      ${buildConsolidatedTable(data.allLocations, data.monthKey)}
      ${buildInvestmentSection(data.investments, decisions)}
      ${buildCommentBlock(comments?.ads, 'Comentarios sobre ADS')}
      ${buildDetailSection(data.locationDetails, data.monthKey)}
      ${buildCommentBlock(comments?.detail, 'Comentarios sobre ubicaciones')}
      <div style="text-align:center;margin:24px 0 16px;">
        <a href="https://portal.thinkpaladar.com/controlling" style="display:inline-block;background-color:#095789;color:white;text-decoration:none;padding:10px 24px;border-radius:8px;font-size:14px;font-weight:600;">Ver en Paladar Portal</a>
      </div>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;" />
      <p style="color:#9ca3af;font-size:12px;margin:0;text-align:center;">ThinkPaladar &middot; portal.thinkpaladar.com</p>
    </div>
  </div>
</body>
</html>`;
}
