/**
 * MonthlyReportPreview — renders all monthly report sections as Tailwind cards.
 */

import { Plus, Trash2 } from 'lucide-react';
import type {
  MonthlyReportData,
  MonthlyReportComments,
  ActionPlanItem,
  MonthlyChannelBreakdown,
  MonthlyROIRow,
} from '../types';
import { cn } from '@/utils/cn';

interface MonthlyReportPreviewProps {
  data: MonthlyReportData;
  comments: MonthlyReportComments;
  onNarrativeChange: (value: string) => void;
  onActionPlanChange: (items: ActionPlanItem[]) => void;
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

function VarPill({ value }: { value: number | null }) {
  if (value == null) return <span className="text-gray-400">{'\u2014'}</span>;
  const cls = value > 0 ? 'bg-emerald-50 text-emerald-700' : value < 0 ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700';
  return <span className={`inline-block text-[11px] font-semibold px-1.5 py-0.5 rounded ${cls} tabular-nums`}>{formatPct(value)}</span>;
}

function RoasValue({ roas }: { roas: number | null }) {
  if (roas == null) return <span className="text-gray-400">{'\u2014'}</span>;
  const cls = roas >= 5 ? 'text-emerald-600' : roas >= 3 ? 'text-amber-600' : 'text-red-600';
  return <span className={`font-bold ${cls}`}>{roas}x</span>;
}

// ============================================
// SUB-SECTIONS
// ============================================

function ChannelBreakdownTable({ breakdown }: { breakdown: MonthlyChannelBreakdown }) {
  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-900">Desglose — {formatChannel(breakdown.channelId)}</h4>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-gray-900">{formatEur(breakdown.totalRevenue)}</span>
          <VarPill value={breakdown.momChangePct} />
        </div>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="text-left px-4 py-2 text-[10px] uppercase text-gray-500 font-medium">Local</th>
            <th className="text-right px-4 py-2 text-[10px] uppercase text-gray-500 font-medium">Facturación</th>
            <th className="text-right px-4 py-2 text-[10px] uppercase text-gray-500 font-medium">vs. Mes ant.</th>
            <th className="text-right px-4 py-2 text-[10px] uppercase text-gray-500 font-medium">% del total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {breakdown.locations.map((loc, i) => (
            <tr key={i} className="hover:bg-gray-50/50">
              <td className="px-4 py-2">
                <div className="text-sm font-medium text-gray-900">{loc.addressName}</div>
                <div className="text-xs text-gray-400">{loc.storeName}</div>
              </td>
              <td className="px-4 py-2 text-right font-medium text-gray-900 tabular-nums">{formatEur(loc.revenue)}</td>
              <td className="px-4 py-2 text-right"><VarPill value={loc.momChangePct} /></td>
              <td className="px-4 py-2 text-right text-gray-500 tabular-nums">{loc.pctOfTotal.toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ROITable({ title, rows }: { title: string; rows: MonthlyROIRow[] }) {
  if (rows.length === 0) return null;
  // Group by channel
  const byChannel = new Map<string, MonthlyROIRow[]>();
  for (const r of rows) {
    const list = byChannel.get(r.channelId) || [];
    list.push(r);
    byChannel.set(r.channelId, list);
  }

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
        <h4 className="text-sm font-semibold text-gray-900">{title}</h4>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="text-left px-4 py-2 text-[10px] uppercase text-gray-500 font-medium">Local</th>
            <th className="text-left px-4 py-2 text-[10px] uppercase text-gray-500 font-medium">Canal</th>
            <th className="text-right px-4 py-2 text-[10px] uppercase text-gray-500 font-medium">Inversión</th>
            <th className="text-right px-4 py-2 text-[10px] uppercase text-gray-500 font-medium">Ventas</th>
            <th className="text-right px-4 py-2 text-[10px] uppercase text-gray-500 font-medium">ROAS</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((r, i) => (
            <tr key={i} className="hover:bg-gray-50/50">
              <td className="px-4 py-2">
                <div className="text-sm font-medium text-gray-900">{r.addressName}</div>
              </td>
              <td className="px-4 py-2 text-gray-600">{formatChannel(r.channelId)}</td>
              <td className="px-4 py-2 text-right text-gray-600 tabular-nums">{formatEur(r.investment)}</td>
              <td className="px-4 py-2 text-right text-gray-900 tabular-nums">{formatEur(r.revenue)}</td>
              <td className="px-4 py-2 text-right"><RoasValue roas={r.roas} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function MonthlyReportPreview({ data, comments, onNarrativeChange, onActionPlanChange }: MonthlyReportPreviewProps) {
  const addActionItem = () => {
    onActionPlanChange([...comments.actionPlan, { text: '', owner: 'ThinkPaladar' }]);
  };
  const removeActionItem = (idx: number) => {
    onActionPlanChange(comments.actionPlan.filter((_, i) => i !== idx));
  };
  const updateActionItem = (idx: number, field: keyof ActionPlanItem, value: string) => {
    const updated = [...comments.actionPlan];
    updated[idx] = { ...updated[idx], [field]: value };
    onActionPlanChange(updated);
  };

  return (
    <div className="space-y-5">
      {/* Executive Summary */}
      <div className="rounded-xl bg-primary-50/60 border border-primary-100 p-5 space-y-4">
        <h3 className="text-sm font-semibold text-primary-700">Resumen Ejecutivo</h3>

        {/* Row 1: Revenue + Objective */}
        <div className="flex items-start justify-between gap-6">
          {/* Left: ventas */}
          <div>
            <p className="text-3xl font-bold text-gray-900">{formatEur(data.totalRevenue)}</p>
            <p className="text-xs text-gray-500 mt-1">Facturación total</p>
            <div className="mt-1"><VarPill value={data.momChangePct} /></div>
          </div>
          {/* Right: objetivo */}
          {data.totalTarget != null && (() => {
            const pct = data.targetAchievementPct ?? 0;
            const pctColor = pct >= 100 ? 'text-emerald-600' : pct >= 80 ? 'text-amber-600' : 'text-red-600';
            const barColor = pct >= 100 ? 'bg-emerald-500' : pct >= 80 ? 'bg-amber-500' : 'bg-red-500';
            return (
              <div className="text-right shrink-0 min-w-[160px]">
                <p className="text-xs font-semibold text-primary-600 uppercase tracking-wide">Objetivo {data.monthLabel.split(' ')[0]}</p>
                <p className="text-lg font-bold text-gray-900 mt-0.5">{formatEur(data.totalTarget)}</p>
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden mt-2">
                  <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                </div>
                <p className={`text-sm font-bold mt-1 ${pctColor}`}>{pct.toFixed(1)}% consecución</p>
              </div>
            );
          })()}
        </div>

        {/* Row 2: KPIs + channel distribution */}
        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-primary-100">
          {/* Left: pedidos + ticket medio */}
          <div className="flex gap-6">
            <div>
              <p className="text-lg font-bold text-gray-900">{data.totalPedidos.toLocaleString('es-ES')}</p>
              <p className="text-xs text-gray-500">Pedidos</p>
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900">
                {data.totalPedidos > 0 ? formatEur(Math.round(data.totalRevenue / data.totalPedidos)) : '\u2014'}
              </p>
              <p className="text-xs text-gray-500">Ticket medio</p>
            </div>
          </div>
          {/* Right: channel distribution */}
          <div className="space-y-1.5">
            {data.revenueByChannel.map((ch) => {
              const share = data.totalRevenue > 0 ? Math.round(ch.totalRevenue / data.totalRevenue * 100) : 0;
              const barColor = ch.channelId === 'glovo' ? 'bg-yellow-400' : 'bg-green-500';
              return (
                <div key={ch.channelId} className="flex items-center gap-2 text-xs">
                  <span className="text-gray-500 w-16">{formatChannel(ch.channelId)}</span>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${barColor}`} style={{ width: `${share}%` }} />
                  </div>
                  <span className="text-gray-900 font-semibold w-8 text-right">{share}%</span>
                  <VarPill value={ch.momChangePct} />
                </div>
              );
            })}
          </div>
        </div>

        {/* Narrative textarea */}
        <div className="border-l-[3px] border-primary-400 pl-4">
          <textarea
            value={comments.executiveNarrative}
            onChange={(e) => onNarrativeChange(e.target.value)}
            placeholder="Escribe aquí el resumen narrativo del mes: contexto, factores clave, conclusiones..."
            className="w-full min-h-[100px] rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-y leading-relaxed"
          />
        </div>
      </div>

      {/* Target Progress per Channel */}
      {data.channelTargets.length > 0 && (
        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900">Objetivos de Facturación</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
            {data.channelTargets.map((ct) => {
              const pct = ct.achievementPct ?? 0;
              const barColor = ct.channelId === 'glovo' ? 'bg-yellow-400' : 'bg-green-500';
              const pctColor = pct >= 100 ? 'text-emerald-600 bg-emerald-50' : pct >= 80 ? 'text-amber-600 bg-amber-50' : 'text-red-600 bg-red-50';
              return (
                <div key={ct.channelId} className="bg-gray-50 rounded-lg p-4 relative">
                  {ct.achievementPct != null && (
                    <span className={`absolute top-3 right-4 text-[11px] font-bold px-2 py-0.5 rounded ${pctColor}`}>
                      {ct.achievementPct.toFixed(1)}%
                    </span>
                  )}
                  <p className="text-sm font-semibold text-gray-900 mb-3">{formatChannel(ct.channelId)}</p>
                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden mb-2">
                    <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span><span className="font-semibold text-gray-900">{formatEur(ct.actual)}</span> facturado</span>
                    {ct.target != null && <span>Obj: {formatEur(ct.target)}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Revenue Breakdown per Channel */}
      {data.revenueByChannel.map((breakdown) => (
        <ChannelBreakdownTable key={breakdown.channelId} breakdown={breakdown} />
      ))}

      {/* ROI Promos */}
      <ROITable title="Retorno de inversión — Promociones" rows={data.roiPromos} />

      {/* ROI Ads */}
      <ROITable title="Retorno de inversión — Publicidad" rows={data.roiAds} />

      {/* Operations & Reviews */}
      {data.operations.length > 0 && (
        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900">Operativa y Reputación</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-2 text-[10px] uppercase text-gray-500 font-medium">Local</th>
                  <th className="text-left px-4 py-2 text-[10px] uppercase text-gray-500 font-medium">Canal</th>
                  <th className="text-right px-4 py-2 text-[10px] uppercase text-gray-500 font-medium">Pedidos</th>
                  <th className="text-right px-4 py-2 text-[10px] uppercase text-gray-500 font-medium">Ticket medio</th>
                  <th className="text-right px-4 py-2 text-[10px] uppercase text-gray-500 font-medium">Entrega (min)</th>
                  <th className="text-right px-4 py-2 text-[10px] uppercase text-gray-500 font-medium">Rating</th>
                  <th className="text-right px-4 py-2 text-[10px] uppercase text-gray-500 font-medium">Reviews</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.operations.map((op, i) => (
                  <tr key={i} className="hover:bg-gray-50/50">
                    <td className="px-4 py-2 font-medium text-gray-900">{op.addressName}</td>
                    <td className="px-4 py-2 text-gray-600">{formatChannel(op.channelId)}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{op.pedidos}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{op.ticketMedio != null ? formatEur(op.ticketMedio) : '\u2014'}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{op.avgDeliveryTime != null ? `${op.avgDeliveryTime.toFixed(0)}` : '\u2014'}</td>
                    <td className="px-4 py-2 text-right">
                      {op.avgRating != null ? (
                        <span className={cn('font-semibold', op.avgRating >= 4.5 ? 'text-emerald-600' : op.avgRating >= 4 ? 'text-amber-600' : 'text-red-600')}>
                          {op.avgRating.toFixed(2)}
                        </span>
                      ) : '\u2014'}
                    </td>
                    <td className="px-4 py-2 text-right text-gray-500 tabular-nums">{op.totalReviews || '\u2014'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Top Products */}
      {data.topProducts.length > 0 && (
        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900">Top Productos del mes</h3>
          </div>
          <div className="p-4 space-y-2">
            {data.topProducts.map((p, idx) => {
              const rankCls = idx === 0 ? 'bg-amber-500' : idx === 1 ? 'bg-gray-400' : idx === 2 ? 'bg-amber-700' : 'bg-gray-900';
              return (
                <div key={idx} className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 rounded-lg">
                  <span className={`w-6 h-6 rounded-full ${rankCls} text-white text-[11px] font-bold flex items-center justify-center shrink-0`}>
                    {idx + 1}
                  </span>
                  <span className="text-sm font-medium text-gray-900 flex-1 truncate">
                    {p.name}
                    {p.isPromo && (
                      <span className="ml-1.5 inline-flex items-center rounded px-1 py-0.5 text-[8px] font-semibold bg-amber-100 text-amber-700 leading-none align-middle">PROMO</span>
                    )}
                  </span>
                  <span className="text-sm font-semibold text-gray-900 tabular-nums shrink-0">{p.quantity} uds · {formatEur(p.revenue)}</span>
                </div>
              );
            })}
          </div>
          <p className="px-4 pb-3 text-xs text-gray-400 italic">
            Incluye ventas agregadas de todos los locales y canales.
          </p>
        </div>
      )}

      {/* Action Plan */}
      <div className="rounded-xl border border-emerald-200 overflow-hidden bg-emerald-50/30">
        <div className="bg-emerald-50 px-4 py-3 border-b border-emerald-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-emerald-800">Plan de Acción — Próximo mes</h3>
          <button
            onClick={addActionItem}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-emerald-700 bg-white border border-emerald-200 rounded-lg hover:bg-emerald-50 transition-colors"
          >
            <Plus className="w-3 h-3" />
            Añadir
          </button>
        </div>
        <div className="p-4 space-y-3">
          {comments.actionPlan.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">
              Añade acciones para el próximo mes. Se incluirán en el correo.
            </p>
          )}
          {comments.actionPlan.map((item, idx) => (
            <div key={idx} className="flex gap-3 items-start">
              <div className="flex-1 space-y-2">
                <textarea
                  value={item.text}
                  onChange={(e) => updateActionItem(idx, 'text', e.target.value)}
                  placeholder="Describe la acción..."
                  className="w-full min-h-[60px] rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-y"
                />
                <select
                  value={item.owner}
                  onChange={(e) => updateActionItem(idx, 'owner', e.target.value)}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="ThinkPaladar">ThinkPaladar</option>
                  <option value="Cliente">Cliente</option>
                  <option value="Conjunto">Conjunto</option>
                </select>
              </div>
              <button
                onClick={() => removeActionItem(idx)}
                className="p-1.5 text-gray-400 hover:text-red-500 transition-colors shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
