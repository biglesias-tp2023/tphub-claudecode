/**
 * ReportPreview — renders all report sections as Tailwind cards.
 */

import type { WeeklyReportData, LocationRow, LocationDetail, InvestmentDecisionMap, InvestmentDecisionValue, ReportComments } from '../types';
import { InvestmentSection } from './InvestmentSection';

interface ReportPreviewProps {
  data: WeeklyReportData;
  decisions: InvestmentDecisionMap;
  onDecisionChange: (key: string, value: InvestmentDecisionValue) => void;
  comments: ReportComments;
  onCommentChange: (key: keyof ReportComments, value: string) => void;
}

function CommentBox({ label, placeholder, value, onChange }: { label: string; placeholder: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900">{label}</h3>
      </div>
      <div className="p-4">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full min-h-[80px] rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-y"
        />
      </div>
    </div>
  );
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

function EvBadge({ value }: { value: number | null }) {
  if (value == null) return <span className="text-gray-400">{'\u2014'}</span>;
  const isPositive = value >= 0;
  return (
    <span className={`font-semibold ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
      {formatPct(value)}
    </span>
  );
}

function SemaforoCircle({ value }: { value: 'green' | 'yellow' | 'red' | null }) {
  if (value == null) return <span className="text-gray-300">{'\u25CF'}</span>;
  const colors = { green: 'text-emerald-500', yellow: 'text-amber-500', red: 'text-red-500' };
  return <span className={`${colors[value]} text-base`}>{'\u25CF'}</span>;
}

function AlertRow({ loc }: { loc: LocationRow }) {
  return (
    <div className="flex items-center justify-between py-2 px-3 border-b border-red-100 last:border-b-0">
      <div>
        <div className="text-sm font-medium text-gray-900">{loc.addressName}</div>
        <div className="text-xs text-gray-400">{formatChannel(loc.channelId)} · {loc.storeName}</div>
      </div>
      <div className="flex items-center gap-4">
        <EvBadge value={loc.evSemanalPct} />
        <span className="text-sm text-gray-600 w-16 text-right">{formatEur(loc.ventas)}</span>
      </div>
    </div>
  );
}

function HighlightRow({ loc }: { loc: LocationRow }) {
  return (
    <div className="flex items-center justify-between py-2 px-3 border-b border-emerald-100 last:border-b-0">
      <div>
        <div className="text-sm font-medium text-gray-900">{loc.addressName}</div>
        <div className="text-xs text-gray-400">{formatChannel(loc.channelId)} · {loc.storeName}</div>
      </div>
      <div className="flex items-center gap-4">
        <EvBadge value={loc.evSemanalPct} />
        <span className="text-sm text-gray-600 w-16 text-right">{formatEur(loc.ventas)}</span>
      </div>
    </div>
  );
}

function StatusBadge({ semaforo }: { semaforo: 'green' | 'yellow' | 'red' }) {
  const label = semaforo === 'green' ? 'Crecimiento' : semaforo === 'yellow' ? 'Estable' : 'En alerta';
  const cls = semaforo === 'green'
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : semaforo === 'yellow'
      ? 'bg-amber-50 text-amber-700 border-amber-200'
      : 'bg-red-50 text-red-700 border-red-200';
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold border ${cls}`}>{label}</span>;
}

function ProgressBar({ pct, color }: { pct: number; color: 'green' | 'yellow' | 'red' }) {
  const bg = color === 'green' ? 'bg-emerald-500' : color === 'yellow' ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${bg}`} style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  );
}

function DetailCard({ detail, monthLabel }: { detail: LocationDetail; monthLabel: string }) {
  const sortedChannels = [...detail.channels].sort((a, b) => (a.channelId === 'glovo' ? -1 : b.channelId === 'glovo' ? 1 : 0));
  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
        <h4 className="text-sm font-semibold text-gray-900">{detail.storeName} — {detail.addressName}</h4>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-200">
        {sortedChannels.map((ch) => {
          const recurPct = ch.pedidos > 0 ? Math.round(ch.recurrentes / ch.pedidos * 100) : 0;
          const evColor = ch.evSemanalPct != null ? (ch.evSemanalPct >= 0 ? 'text-emerald-600' : 'text-red-600') : 'text-gray-400';
          const consecColor = ch.consecucionMesPct != null
            ? (ch.consecucionMesPct >= 80 ? 'text-emerald-600' : ch.consecucionMesPct >= 50 ? 'text-amber-600' : 'text-red-600')
            : 'text-gray-400';
          const objColor = ch.estadoObjetivo === 'green' ? 'green' : ch.estadoObjetivo === 'yellow' ? 'yellow' : 'red';

          return (
            <div key={ch.channelId} className="p-4 space-y-4">
              {/* Header */}
              <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100">
                <span className="text-sm font-bold text-gray-900">{formatChannel(ch.channelId)}</span>
                <StatusBadge semaforo={ch.semaforo} />
              </div>

              {/* Headline: Ventas */}
              <div>
                <p className="text-2xl font-bold text-gray-900">{formatEur(ch.ventas)}</p>
                <p className={`text-xs font-semibold ${evColor}`}>
                  {ch.evSemanalPct != null ? `${ch.evSemanalPct >= 0 ? '+' : ''}${ch.evSemanalPct.toFixed(1)}% vs. semana anterior` : 'Sin datos previos'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {ch.pedidos} pedidos · {ch.pedidos > 0 ? formatEur(Math.round(ch.ventas / ch.pedidos)) : '—'} ticket medio
                  {ch.avgDeliveryTime != null && <> · {ch.avgDeliveryTime.toFixed(0)} min entrega</>}
                </p>
              </div>

              {/* Clientes */}
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Clientes</p>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">Nuevos</span>
                  <span className="font-semibold text-gray-900">{ch.nuevos}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">Recurrentes</span>
                  <div>
                    <span className="font-semibold text-gray-900">{ch.recurrentes}</span>
                    <span className="text-gray-400 ml-1.5">({recurPct}%)</span>
                  </div>
                </div>
              </div>

              {/* Marketing */}
              <div className="pt-3 border-t border-gray-100 space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Marketing</p>
                {/* Ads */}
                {ch.adSpent > 0 ? (
                  <div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">Ads</span>
                      <span className="font-semibold text-gray-900">{ch.roasAds != null ? `${ch.roasAds}x` : '\u2014'}</span>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-0.5">{formatEur(ch.adSpent)} invertidos → {formatEur(ch.adRevenue)} en ventas</p>
                  </div>
                ) : (
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Ads</span>
                    <span className="text-gray-300 text-[10px]">Sin actividad</span>
                  </div>
                )}
                {/* Promos */}
                {ch.descuentos > 0 ? (
                  <div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">Promos</span>
                      <span className="font-semibold text-gray-900">{ch.roasPromo != null ? `${ch.roasPromo}x` : '\u2014'}</span>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-0.5">{formatEur(ch.descuentos)} invertidos → {formatEur(ch.ventas)} en ventas</p>
                  </div>
                ) : (
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Promos</span>
                    <span className="text-gray-300 text-[10px]">Sin actividad</span>
                  </div>
                )}
              </div>

              {/* Objetivo */}
              {ch.objetivoMes != null && (
                <div className="pt-3 border-t border-gray-100 space-y-1.5">
                  <div className="flex justify-between items-baseline">
                    <p className={`text-[10px] font-bold uppercase tracking-wider ${consecColor}`}>Objetivo {monthLabel}</p>
                    <span className={`text-sm font-bold ${consecColor}`}>{formatEur(ch.objetivoMes)}</span>
                  </div>
                  <ProgressBar pct={ch.consecucionMesPct ?? 0} color={objColor} />
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">{formatEur(ch.ventasMes)} acumulado</span>
                    {ch.consecucionMesPct != null && (
                      <span className={`font-bold ${consecColor}`}>{ch.consecucionMesPct.toFixed(1)}%</span>
                    )}
                  </div>
                </div>
              )}

              {/* Top 5 productos */}
              {ch.topProducts.length > 0 && (
                <div className="pt-3 border-t border-gray-100 space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Top 5 productos</p>
                  {ch.topProducts.map((p, idx) => (
                    <div key={idx} className="flex justify-between text-xs">
                      <span className="text-gray-600 truncate max-w-[65%]">
                        {idx + 1}. {p.name}
                        {p.isPromo && (
                          <span className="ml-1 inline-flex items-center rounded px-1 py-0.5 text-[8px] font-semibold bg-amber-100 text-amber-700 leading-none align-middle">PROMO</span>
                        )}
                      </span>
                      <span className="text-gray-700 shrink-0 ml-2">{p.quantity} uds · {formatEur(p.revenue)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ReportPreview({ data, decisions, onDecisionChange, comments, onCommentChange }: ReportPreviewProps) {
  const monthLabel = (() => {
    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const [, m] = data.monthKey.split('-');
    return months[parseInt(m, 10) - 1] ?? data.monthKey;
  })();

  return (
    <div className="space-y-5">
      {/* Executive Summary */}
      <div className="rounded-xl bg-primary-50/60 border border-primary-100 p-5">
        <h3 className="text-sm font-semibold text-primary-700 mb-3">Resumen Ejecutivo</h3>
        <div className="flex items-center justify-between gap-6">
          {/* Left: ventas */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-700 font-medium">Ventas totales:</span>
              <span className="text-gray-900 font-semibold">{formatEur(data.totalVentas)}</span>
              <EvBadge value={data.evSemanalPct} />
            </div>
            {data.glovoVentas > 0 && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span>Glovo: {formatEur(data.glovoVentas)}</span>
                <EvBadge value={data.glovoEvPct} />
              </div>
            )}
            {data.uberVentas > 0 && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span>UberEats: {formatEur(data.uberVentas)}</span>
                <EvBadge value={data.uberEvPct} />
              </div>
            )}
          </div>
          {/* Right: objetivo mensual */}
          <div className="text-right shrink-0 space-y-1">
            <p className="text-xs font-semibold text-primary-600 uppercase tracking-wide">Objetivo {monthLabel}</p>
            {data.objetivoTotal != null ? (
              <>
                <p className="text-lg font-bold text-gray-900">{formatEur(data.objetivoTotal)}</p>
                <p className="text-sm text-gray-600">Acumulado: <span className="font-semibold text-gray-900">{formatEur(data.ventasMesTotal)}</span></p>
                {data.consecucionTotalPct != null && (
                  <p className={`text-sm font-bold ${data.consecucionTotalPct >= 80 ? 'text-emerald-600' : data.consecucionTotalPct >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                    {data.consecucionTotalPct.toFixed(1)}% consecución
                  </p>
                )}
              </>
            ) : (
              <>
                <p className="text-sm text-gray-600">Acumulado: <span className="font-semibold text-gray-900">{formatEur(data.ventasMesTotal)}</span></p>
                <p className="text-xs text-gray-400">Sin objetivo configurado</p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Comment: General */}
      <CommentBox
        label="Comentario general"
        placeholder="Comentario general para el cliente. Se incluirá tras el resumen ejecutivo."
        value={comments.general}
        onChange={(v) => onCommentChange('general', v)}
      />

      {/* Highlights */}
      {data.highlights.length > 0 && (
        <div className="rounded-xl border border-emerald-200 overflow-hidden">
          <div className="bg-emerald-50 px-4 py-3 border-b border-emerald-200">
            <h3 className="text-sm font-semibold text-emerald-700">Highlights (subida ≥ 10%)</h3>
          </div>
          <div className="bg-emerald-50/30">
            {[...data.highlights]
              .sort((a, b) => (b.evSemanalPct ?? 0) - (a.evSemanalPct ?? 0))
              .map((loc, i) => <HighlightRow key={i} loc={loc} />)}
          </div>
        </div>
      )}

      {/* Alerts */}
      {data.alerts.length > 0 && (
        <div className="rounded-xl border border-red-200 overflow-hidden">
          <div className="bg-red-50 px-4 py-3 border-b border-red-200">
            <h3 className="text-sm font-semibold text-red-700">Alertas (caída ≥ 15%)</h3>
          </div>
          <div className="bg-red-50/30">
            {[...data.alerts]
              .sort((a, b) => (a.evSemanalPct ?? 0) - (b.evSemanalPct ?? 0))
              .map((loc, i) => <AlertRow key={i} loc={loc} />)}
          </div>
        </div>
      )}

      {/* Comment: Alerts/Highlights */}
      <CommentBox
        label="Comentarios sobre rendimiento"
        placeholder="Comentarios sobre highlights y alertas."
        value={comments.alerts}
        onChange={(v) => onCommentChange('alerts', v)}
      />

      {/* Detalle General */}
      {data.allLocations.length > 0 && (
        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900">Detalle General</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                {/* Group header row */}
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th colSpan={2}></th>
                  <th colSpan={2} className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-primary-700 text-center">Rendimiento</th>
                  <th colSpan={2} className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-primary-700 text-center">Retorno</th>
                  <th colSpan={2} className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-primary-700 text-center">Clientes</th>
                  <th colSpan={3} className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-primary-700 text-center">Objetivo {monthLabel}</th>
                </tr>
                {/* Column header row */}
                <tr className="bg-gray-100 border-b border-gray-200">
                  <th className="text-left px-3 py-2 text-[10px] uppercase text-gray-500 font-medium">Local</th>
                  <th className="text-left px-3 py-2 text-[10px] uppercase text-gray-500 font-medium">App</th>
                  <th className="text-right px-3 py-2 text-[10px] uppercase text-gray-500 font-medium">Ventas</th>
                  <th className="text-right px-3 py-2 text-[10px] uppercase text-gray-500 font-medium">Var.</th>
                  <th className="text-right px-3 py-2 text-[10px] uppercase text-gray-500 font-medium">Ads</th>
                  <th className="text-right px-3 py-2 text-[10px] uppercase text-gray-500 font-medium">Promos</th>
                  <th className="text-right px-3 py-2 text-[10px] uppercase text-gray-500 font-medium">Nuevos</th>
                  <th className="text-right px-3 py-2 text-[10px] uppercase text-gray-500 font-medium">Recurr.</th>
                  <th className="text-right px-3 py-2 text-[10px] uppercase text-gray-500 font-medium">Meta</th>
                  <th className="text-right px-3 py-2 text-[10px] uppercase text-gray-500 font-medium">% Cons.</th>
                  <th className="text-center px-3 py-2 text-[10px] uppercase text-gray-500 font-medium w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.allLocations.map((loc, i) => (
                  <tr key={i} className="hover:bg-gray-50/50">
                    <td className="px-3 py-2">
                      <div className="font-medium text-gray-900">{loc.storeName}</div>
                      <div className="text-xs text-gray-400">{loc.addressName}</div>
                    </td>
                    <td className="px-3 py-2 text-gray-600">{formatChannel(loc.channelId)}</td>
                    <td className="px-3 py-2 text-right text-gray-900">{formatEur(loc.ventas)}</td>
                    <td className="px-3 py-2 text-right"><EvBadge value={loc.evSemanalPct} /></td>
                    <td className="px-3 py-2 text-right text-gray-600">{loc.roasAds != null ? `${loc.roasAds}x` : '\u2014'}</td>
                    <td className="px-3 py-2 text-right text-gray-600">{loc.roasPromo != null ? `${loc.roasPromo}x` : '\u2014'}</td>
                    <td className="px-3 py-2 text-right text-gray-600">{loc.nuevos}</td>
                    <td className="px-3 py-2 text-right text-gray-600">{loc.recurrentes}</td>
                    <td className="px-3 py-2 text-right text-gray-600">
                      {loc.objetivoMes != null ? formatEur(loc.objetivoMes) : '\u2014'}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {loc.consecucionMesPct != null ? (
                        <span className={`font-semibold ${loc.consecucionMesPct >= 80 ? 'text-emerald-600' : loc.consecucionMesPct >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                          {loc.consecucionMesPct.toFixed(1)}%
                        </span>
                      ) : <span className="text-gray-400">{'\u2014'}</span>}
                    </td>
                    <td className="px-3 py-2 text-center"><SemaforoCircle value={loc.estadoObjetivo} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Investment Decisions */}
      <InvestmentSection
        investments={data.investments}
        decisions={decisions}
        onDecisionChange={onDecisionChange}
      />

      {/* Comment: ADS */}
      <CommentBox
        label="Comentarios sobre ADS"
        placeholder="Comentarios sobre decisiones de inversión en publicidad."
        value={comments.ads}
        onChange={(v) => onCommentChange('ads', v)}
      />

      {/* Detailed Breakdown by Location */}
      {data.locationDetails.length > 0 && (
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Detalle por ubicación</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Cada sección incluye: contexto, métricas de publicidad, métricas de promociones y objetivo mensual.
            </p>
          </div>
          {data.locationDetails.map((detail, i) => (
            <DetailCard key={i} detail={detail} monthLabel={monthLabel} />
          ))}
        </div>
      )}

      {/* Comment: Detail */}
      <CommentBox
        label="Comentarios sobre ubicaciones"
        placeholder="Comentarios sobre el detalle por ubicación."
        value={comments.detail}
        onChange={(v) => onCommentChange('detail', v)}
      />
    </div>
  );
}
