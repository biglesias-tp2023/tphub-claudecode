/**
 * Monthly Report HTML Builder — generates clipboard-ready HTML email.
 *
 * @module features/reports/utils/monthlyReportHtml
 */

import type { MonthlyReportData, MonthlyReportComments, MonthlyChannelBreakdown, MonthlyROIRow } from '../types';

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
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
  return ch;
}

function varPillHtml(value: number | null): string {
  if (value == null) return '<span style="color:#9ca3af;">\u2014</span>';
  const color = value > 0 ? '#16a34a' : value < 0 ? '#dc2626' : '#d97706';
  const bg = value > 0 ? '#f0fdf4' : value < 0 ? '#fef2f2' : '#fffbeb';
  return `<span style="display:inline-block;font-size:11px;font-weight:600;padding:1px 6px;border-radius:3px;color:${color};background:${bg};">${formatPct(value)}</span>`;
}

function roasColor(roas: number | null): string {
  if (roas == null) return '#9ca3af';
  if (roas >= 5) return '#16a34a';
  if (roas >= 3) return '#d97706';
  return '#dc2626';
}

function buildCommentBlock(comment: string | undefined, title: string): string {
  if (!comment?.trim()) return '';
  const lines = escapeHtml(comment.trim()).replace(/\n/g, '<br/>');
  return `
    <div style="margin-bottom:20px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px 20px;">
      <h2 style="margin:0 0 8px;font-size:15px;color:#095789;">${escapeHtml(title)}</h2>
      <p style="margin:0;font-size:13px;color:#374151;line-height:1.6;">${lines}</p>
    </div>`;
}

function buildChannelBreakdown(breakdown: MonthlyChannelBreakdown): string {
  const rows = breakdown.locations.map((loc) => `
    <tr>
      <td style="padding:6px 8px;font-size:13px;border-bottom:1px solid #f3f4f6;">
        <div style="font-weight:500;color:#111827;">${escapeHtml(loc.addressName)}</div>
        <div style="font-size:11px;color:#9ca3af;">${escapeHtml(loc.storeName)}</div>
      </td>
      <td align="right" style="padding:6px 8px;font-size:13px;font-weight:500;color:#111827;border-bottom:1px solid #f3f4f6;">${formatEur(loc.revenue)}</td>
      <td align="right" style="padding:6px 8px;border-bottom:1px solid #f3f4f6;">${varPillHtml(loc.momChangePct)}</td>
      <td align="right" style="padding:6px 8px;font-size:12px;color:#9ca3af;border-bottom:1px solid #f3f4f6;">${loc.pctOfTotal.toFixed(1)}%</td>
    </tr>`).join('');

  return `
    <div style="margin-bottom:20px;">
      <h2 style="margin:0 0 8px;font-size:15px;color:#095789;">Desglose — ${formatChannel(breakdown.channelId)}</h2>
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
        <thead><tr style="background:#f9fafb;">
          <th align="left" style="padding:6px 8px;font-size:10px;color:#6b7280;text-transform:uppercase;">Local</th>
          <th align="right" style="padding:6px 8px;font-size:10px;color:#6b7280;text-transform:uppercase;">Facturación</th>
          <th align="right" style="padding:6px 8px;font-size:10px;color:#6b7280;text-transform:uppercase;">vs. Mes ant.</th>
          <th align="right" style="padding:6px 8px;font-size:10px;color:#6b7280;text-transform:uppercase;">% del total</th>
        </tr></thead>
        <tbody>${rows}
          <tr style="border-top:2px solid #111827;">
            <td style="padding:8px;font-size:13px;font-weight:700;">Total ${formatChannel(breakdown.channelId)}</td>
            <td align="right" style="padding:8px;font-size:13px;font-weight:700;">${formatEur(breakdown.totalRevenue)}</td>
            <td align="right" style="padding:8px;">${varPillHtml(breakdown.momChangePct)}</td>
            <td></td>
          </tr>
        </tbody>
      </table>
    </div>`;
}

function buildROISection(title: string, rows: MonthlyROIRow[]): string {
  if (rows.length === 0) return '';
  const tableRows = rows.map((r) => `
    <tr>
      <td style="padding:6px 8px;font-size:13px;color:#374151;border-bottom:1px solid #f3f4f6;">${escapeHtml(r.addressName)} <span style="color:#9ca3af;font-size:11px;">(${formatChannel(r.channelId)})</span></td>
      <td align="right" style="padding:6px 8px;font-size:13px;color:#374151;border-bottom:1px solid #f3f4f6;">${formatEur(r.investment)}</td>
      <td align="right" style="padding:6px 8px;font-size:13px;color:#374151;border-bottom:1px solid #f3f4f6;">${formatEur(r.revenue)}</td>
      <td align="right" style="padding:6px 8px;font-size:13px;font-weight:700;color:${roasColor(r.roas)};border-bottom:1px solid #f3f4f6;">${r.roas != null ? r.roas + 'x' : '\u2014'}</td>
    </tr>`).join('');

  return `
    <div style="margin-bottom:20px;">
      <h2 style="margin:0 0 8px;font-size:15px;color:#095789;">${escapeHtml(title)}</h2>
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
        <thead><tr style="background:#f9fafb;">
          <th align="left" style="padding:6px 8px;font-size:10px;color:#6b7280;text-transform:uppercase;">Local</th>
          <th align="right" style="padding:6px 8px;font-size:10px;color:#6b7280;text-transform:uppercase;">Inversión</th>
          <th align="right" style="padding:6px 8px;font-size:10px;color:#6b7280;text-transform:uppercase;">Ventas</th>
          <th align="right" style="padding:6px 8px;font-size:10px;color:#6b7280;text-transform:uppercase;">ROAS</th>
        </tr></thead>
        <tbody>${tableRows}</tbody>
      </table>
    </div>`;
}

function buildActionPlan(items: MonthlyReportComments['actionPlan']): string {
  const filled = items.filter(i => i.text.trim());
  if (filled.length === 0) return '';
  const rows = filled.map((item) => `
    <tr>
      <td style="padding:10px 12px;font-size:13px;color:#374151;border-bottom:1px solid rgba(0,0,0,0.06);line-height:1.5;">${escapeHtml(item.text)}</td>
      <td align="right" style="padding:10px 12px;font-size:11px;font-weight:600;color:#095789;border-bottom:1px solid rgba(0,0,0,0.06);white-space:nowrap;">${escapeHtml(item.owner)}</td>
    </tr>`).join('');

  return `
    <div style="margin-bottom:20px;background:linear-gradient(135deg,#FAFFF5,#F0FDF4);border-radius:8px;padding:20px;">
      <h2 style="margin:0 0 12px;font-size:15px;color:#16a34a;">Plan de Acción</h2>
      <table width="100%" cellpadding="0" cellspacing="0" border="0">${rows}</table>
    </div>`;
}

export function buildMonthlyReportHtml(
  data: MonthlyReportData,
  comments: MonthlyReportComments,
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
      <h1 style="color:white;font-size:20px;margin:0;font-weight:600;">Informe Mensual</h1>
      <p style="color:rgba(255,255,255,0.85);font-size:14px;margin:6px 0 0;">${escapeHtml(data.companyName)} &middot; ${escapeHtml(data.monthLabel)}</p>
    </div>
    <div style="background-color:white;padding:24px;border-radius:0 0 12px 12px;border:1px solid #e5e7eb;border-top:none;">

      <!-- Executive Summary -->
      <div style="background:linear-gradient(135deg,#f8fafc,#f0f4ff);border-radius:8px;padding:20px;margin-bottom:20px;">
        <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#095789;margin-bottom:12px;">Resumen Ejecutivo</div>
        <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
          <td valign="top">
            <div style="font-size:32px;font-weight:700;color:#111827;line-height:1;">${formatEur(data.totalRevenue)}</div>
            <div style="font-size:12px;color:#6b7280;margin-top:4px;">Facturación total</div>
            <div style="margin-top:4px;">${varPillHtml(data.momChangePct)}</div>
          </td>
          ${data.totalTarget != null ? (() => {
            const pct = data.targetAchievementPct ?? 0;
            const pctCol = pct >= 100 ? '#16a34a' : pct >= 80 ? '#d97706' : '#dc2626';
            const barCol = pct >= 100 ? '#10b981' : pct >= 80 ? '#f59e0b' : '#ef4444';
            const ml = data.monthLabel.split(' ')[0];
            return `
          <td align="right" valign="top" style="width:160px;">
            <div style="font-size:10px;font-weight:700;color:#095789;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Objetivo ${ml}</div>
            <div style="font-size:18px;font-weight:700;color:#111827;">${formatEur(data.totalTarget)}</div>
            <div style="background:#e5e7eb;border-radius:4px;height:8px;overflow:hidden;margin:8px 0 4px;">
              <div style="background:${barCol};height:100%;width:${Math.min(pct, 100)}%;border-radius:4px;"></div>
            </div>
            <div style="font-size:13px;font-weight:700;color:${pctCol};">${pct.toFixed(1)}% consecución</div>
          </td>`;
          })() : ''}
        </tr></table>
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:16px;border-top:1px solid #c5e3f3;padding-top:12px;">
          <tr>
            <td style="padding:4px 0;">
              <span style="font-size:16px;font-weight:700;color:#111827;">${data.totalPedidos.toLocaleString('es-ES')}</span>
              <span style="font-size:12px;color:#6b7280;margin-left:6px;">pedidos</span>
              <span style="font-size:16px;font-weight:700;color:#111827;margin-left:16px;">${data.totalPedidos > 0 ? formatEur(Math.round(data.totalRevenue / data.totalPedidos)) : '\u2014'}</span>
              <span style="font-size:12px;color:#6b7280;margin-left:6px;">ticket medio</span>
            </td>
          </tr>
          ${data.revenueByChannel.map((ch) => {
            const share = data.totalRevenue > 0 ? Math.round(ch.totalRevenue / data.totalRevenue * 100) : 0;
            const barCol = ch.channelId === 'glovo' ? '#FFC244' : '#06C167';
            return `<tr><td style="padding:3px 0;">
              <span style="font-size:12px;color:#6b7280;display:inline-block;width:70px;">${formatChannel(ch.channelId)}</span>
              <span style="display:inline-block;width:200px;height:8px;background:#f3f4f6;border-radius:4px;overflow:hidden;vertical-align:middle;">
                <span style="display:block;height:100%;width:${share}%;background:${barCol};border-radius:4px;"></span>
              </span>
              <span style="font-size:12px;font-weight:600;color:#111827;margin-left:8px;">${share}%</span>
              <span style="margin-left:8px;">${varPillHtml(ch.momChangePct)}</span>
            </td></tr>`;
          }).join('')}
        </table>
      </div>

      ${buildCommentBlock(comments.executiveNarrative, 'Análisis del consultor')}

      <!-- Channel breakdowns -->
      ${data.revenueByChannel.map(buildChannelBreakdown).join('')}

      <!-- ROI -->
      ${buildROISection('Retorno de inversión — Promociones', data.roiPromos)}
      ${buildROISection('Retorno de inversión — Publicidad', data.roiAds)}

      <!-- Operations table -->
      ${data.operations.length > 0 ? `
      <div style="margin-bottom:20px;">
        <h2 style="margin:0 0 8px;font-size:15px;color:#095789;">Operativa y Reputación</h2>
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
          <thead><tr style="background:#f9fafb;">
            <th align="left" style="padding:6px 8px;font-size:10px;color:#6b7280;text-transform:uppercase;">Local</th>
            <th align="left" style="padding:6px 8px;font-size:10px;color:#6b7280;text-transform:uppercase;">Canal</th>
            <th align="right" style="padding:6px 8px;font-size:10px;color:#6b7280;text-transform:uppercase;">Pedidos</th>
            <th align="right" style="padding:6px 8px;font-size:10px;color:#6b7280;text-transform:uppercase;">Ticket</th>
            <th align="right" style="padding:6px 8px;font-size:10px;color:#6b7280;text-transform:uppercase;">Entrega</th>
            <th align="right" style="padding:6px 8px;font-size:10px;color:#6b7280;text-transform:uppercase;">Rating</th>
          </tr></thead>
          <tbody>${data.operations.map((op) => `
            <tr>
              <td style="padding:5px 8px;font-size:12px;font-weight:500;color:#111827;border-bottom:1px solid #f3f4f6;">${escapeHtml(op.addressName)}</td>
              <td style="padding:5px 8px;font-size:12px;color:#6b7280;border-bottom:1px solid #f3f4f6;">${formatChannel(op.channelId)}</td>
              <td align="right" style="padding:5px 8px;font-size:12px;color:#374151;border-bottom:1px solid #f3f4f6;">${op.pedidos}</td>
              <td align="right" style="padding:5px 8px;font-size:12px;color:#374151;border-bottom:1px solid #f3f4f6;">${op.ticketMedio != null ? formatEur(op.ticketMedio) : '\u2014'}</td>
              <td align="right" style="padding:5px 8px;font-size:12px;color:#374151;border-bottom:1px solid #f3f4f6;">${op.avgDeliveryTime != null ? op.avgDeliveryTime.toFixed(0) + ' min' : '\u2014'}</td>
              <td align="right" style="padding:5px 8px;font-size:12px;font-weight:600;color:${op.avgRating != null ? (op.avgRating >= 4.5 ? '#16a34a' : op.avgRating >= 4 ? '#d97706' : '#dc2626') : '#9ca3af'};border-bottom:1px solid #f3f4f6;">${op.avgRating != null ? op.avgRating.toFixed(2) : '\u2014'}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>` : ''}

      <!-- Top Products -->
      ${data.topProducts.length > 0 ? `
      <div style="margin-bottom:20px;">
        <h2 style="margin:0 0 8px;font-size:15px;color:#095789;">Top Productos del mes</h2>
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          ${data.topProducts.map((p, i) => `
          <tr>
            <td style="padding:6px 8px;font-size:13px;color:#374151;border-bottom:1px solid #f3f4f6;">
              <span style="display:inline-block;width:20px;height:20px;border-radius:50%;background:${i === 0 ? '#d4a017' : i === 1 ? '#8b8b8b' : i === 2 ? '#a0522d' : '#111827'};color:white;font-size:10px;font-weight:700;text-align:center;line-height:20px;margin-right:8px;">${i + 1}</span>
              ${escapeHtml(p.name)}${p.isPromo ? ' <span style="background:#fef3c7;color:#b45309;font-size:8px;font-weight:700;padding:1px 4px;border-radius:3px;">PROMO</span>' : ''}
            </td>
            <td align="right" style="padding:6px 8px;font-size:13px;font-weight:600;color:#111827;border-bottom:1px solid #f3f4f6;">${p.quantity} uds &middot; ${formatEur(p.revenue)}</td>
          </tr>`).join('')}
        </table>
      </div>` : ''}

      <!-- Action Plan -->
      ${buildActionPlan(comments.actionPlan)}

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
