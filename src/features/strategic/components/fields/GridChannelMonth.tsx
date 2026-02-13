/**
 * GridChannelMonth - Grid minimalista de objetivos vs realidad
 *
 * Diseño compacto en líneas con:
 * - Gráfica de barras comparativa (objetivo vs real)
 * - Tabla de ventas por canal × mes
 * - Inversión ADS/Promos con % y € calculado
 * - Toggle para mostrar datos reales
 */
import { useState, useMemo } from 'react';
import { TrendingUp, Eye, EyeOff, Megaphone, Percent, ChevronDown, ChevronRight } from 'lucide-react';
import { BarChart } from '@/components/charts/rosen/BarChart';
import type { BarChartDataItem } from '@/components/charts/rosen/types';
import { cn } from '@/utils/cn';
import type { GridChannelMonthData, InvestmentConfig, ObjectiveUnit } from '@/types';

// ============================================
// TYPES
// ============================================

interface GridChannelMonthProps {
  value: GridChannelMonthData;
  onChange: (value: GridChannelMonthData) => void;
  adsPercent?: InvestmentConfig;
  onAdsPercentChange?: (value: InvestmentConfig) => void;
  promosPercent?: InvestmentConfig;
  onPromosPercentChange?: (value: InvestmentConfig) => void;
  // Datos reales
  actualRevenue?: GridChannelMonthData;
  onActualRevenueChange?: (value: GridChannelMonthData) => void;
  actualAds?: GridChannelMonthData;
  onActualAdsChange?: (value: GridChannelMonthData) => void;
  actualPromos?: GridChannelMonthData;
  onActualPromosChange?: (value: GridChannelMonthData) => void;
  /** Auto-fetched actual revenue from CRP Portal (read-only when provided) */
  autoActualRevenue?: GridChannelMonthData;
  unit: ObjectiveUnit;
  label?: string;
  description?: string;
}

type Channel = 'glovo' | 'ubereats' | 'justeat';

// ============================================
// CONSTANTS
// ============================================

const CHANNELS: { id: Channel; label: string; color: string; logo: string }[] = [
  { id: 'glovo', label: 'Glovo', color: '#FFC244', logo: '/images/channels/glovo.png' },
  { id: 'ubereats', label: 'UberEats', color: '#06C167', logo: '/images/channels/ubereats.png' },
  { id: 'justeat', label: 'JustEat', color: '#FF8000', logo: '/images/channels/justeat.webp' },
];

const DEFAULT_INVESTMENT: InvestmentConfig = { glovo: 0, ubereats: 0, justeat: 0 };

// ============================================
// HELPERS
// ============================================

function getMonths(count: number): { key: string; short: string }[] {
  const months: { key: string; short: string }[] = [];
  const today = new Date();
  const names = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

  for (let i = 0; i < count; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
    months.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      short: `${names[d.getMonth()]} ${String(d.getFullYear()).slice(-2)}`,
    });
  }
  return months;
}

function fmt(n: number): string {
  if (!n || isNaN(n)) return '0';
  return n.toLocaleString('es-ES');
}

function fmtK(n: number): string {
  if (!n || isNaN(n)) return '0';
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

// ============================================
// CHART TOOLTIP (inline in renderTooltip)
// ============================================

// ============================================
// COMPACT INPUT ROW
// ============================================

interface InputRowProps {
  label: string;
  logoUrl: string;
  months: { key: string }[];
  values: GridChannelMonthData;
  channel: Channel;
  onChange: (month: string, val: string) => void;
  total: number;
  isActual?: boolean;
  readOnly?: boolean;
}

function InputRow({ label, logoUrl, months, values, channel, onChange, total, isActual, readOnly }: InputRowProps) {
  return (
    <tr className={cn(isActual && 'bg-emerald-50/50')}>
      <td className="py-1 pr-2">
        <div className="flex items-center gap-1.5">
          <img src={logoUrl} alt={label} className="w-3 h-3 rounded-full object-cover" />
          <span className="text-[11px] text-gray-600">{label}</span>
          {isActual && <span className="text-[9px] text-emerald-600 font-medium">(real)</span>}
        </div>
      </td>
      {months.map((m) => (
        <td key={m.key} className="py-0.5 px-0.5">
          {readOnly ? (
            <div className={cn(
              'w-full text-center text-[11px] py-1 px-0.5 rounded',
              'bg-emerald-50 text-emerald-700 font-medium tabular-nums'
            )}>
              {fmt(values[m.key]?.[channel] || 0)}
            </div>
          ) : (
            <input
              type="number"
              value={values[m.key]?.[channel] || ''}
              onChange={(e) => onChange(m.key, e.target.value)}
              placeholder="0"
              className={cn(
                'w-full text-center text-[11px] py-1 px-0.5 border rounded',
                'focus:outline-none focus:ring-1',
                isActual
                  ? 'border-emerald-200 focus:ring-emerald-300 focus:border-emerald-300 bg-white'
                  : 'border-gray-200 focus:ring-blue-300 focus:border-blue-300 bg-white'
              )}
            />
          )}
        </td>
      ))}
      <td className="py-1 pl-2 text-right">
        <span className={cn('text-[11px] font-medium tabular-nums', isActual ? 'text-emerald-600' : 'text-gray-700')}>
          {fmt(total)}€
        </span>
      </td>
    </tr>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function GridChannelMonth({
  value,
  onChange,
  adsPercent = DEFAULT_INVESTMENT,
  onAdsPercentChange,
  promosPercent = DEFAULT_INVESTMENT,
  onPromosPercentChange,
  actualRevenue = {},
  onActualRevenueChange,
  // Future: actual investment tracking
  actualAds: _actualAds = {},
  onActualAdsChange: _onActualAdsChange,
  actualPromos: _actualPromos = {},
  onActualPromosChange: _onActualPromosChange,
  autoActualRevenue,
  unit: _unit,
}: GridChannelMonthProps) {
  // Suppress unused variable warnings for future features
  void _actualAds;
  void _onActualAdsChange;
  void _actualPromos;
  void _onActualPromosChange;
  void _unit;

  // When autoActualRevenue is provided, use it instead of manual actualRevenue
  const hasAutoData = autoActualRevenue && Object.keys(autoActualRevenue).length > 0;
  const effectiveActualRevenue = hasAutoData ? autoActualRevenue : actualRevenue;
  const months = useMemo(() => getMonths(6), []);
  const [showActual, setShowActual] = useState(false);
  const [expandedSections, setExpandedSections] = useState({ revenue: true, ads: true, promos: true });

  // Normalize data
  const normalizedTarget = useMemo(() => {
    const r = { ...value };
    months.forEach((m) => {
      if (!r[m.key]) r[m.key] = { glovo: 0, ubereats: 0, justeat: 0 };
    });
    return r;
  }, [value, months]);

  const normalizedActual = useMemo(() => {
    const r = { ...effectiveActualRevenue };
    months.forEach((m) => {
      if (!r[m.key]) r[m.key] = { glovo: 0, ubereats: 0, justeat: 0 };
    });
    return r;
  }, [effectiveActualRevenue, months]);

  // Update handlers
  const updateTarget = (month: string, ch: Channel, val: string) => {
    onChange({ ...normalizedTarget, [month]: { ...normalizedTarget[month], [ch]: parseFloat(val) || 0 } });
  };

  const updateActual = (month: string, ch: Channel, val: string) => {
    if (onActualRevenueChange) {
      onActualRevenueChange({ ...normalizedActual, [month]: { ...normalizedActual[month], [ch]: parseFloat(val) || 0 } });
    }
  };

  const updateAds = (ch: Channel, val: string) => {
    onAdsPercentChange?.({ ...adsPercent, [ch]: parseFloat(val) || 0 });
  };

  const updatePromos = (ch: Channel, val: string) => {
    onPromosPercentChange?.({ ...promosPercent, [ch]: parseFloat(val) || 0 });
  };

  // Calculations
  const getMonthTotal = (data: GridChannelMonthData, month: string) =>
    (data[month]?.glovo || 0) + (data[month]?.ubereats || 0) + (data[month]?.justeat || 0);

  const getChannelTotal = (data: GridChannelMonthData, ch: Channel) =>
    months.reduce((sum, m) => sum + (data[m.key]?.[ch] || 0), 0);

  const grandTargetTotal = months.reduce((sum, m) => sum + getMonthTotal(normalizedTarget, m.key), 0);
  const grandActualTotal = months.reduce((sum, m) => sum + getMonthTotal(normalizedActual, m.key), 0);

  const calcInvestment = (revenue: number, pct: number) => Math.round((revenue * pct) / 100);

  // Chart data - interleave target/actual bars per month
  const barChartData: BarChartDataItem[] = useMemo(() => {
    const items: BarChartDataItem[] = [];
    months.forEach((m) => {
      items.push({
        label: m.short,
        value: getMonthTotal(normalizedTarget, m.key),
        color: '#3B82F6',
        opacity: 0.8,
      });
      if (showActual && grandActualTotal > 0) {
        items.push({
          label: `${m.short} `,
          value: getMonthTotal(normalizedActual, m.key),
          color: '#10B981',
          opacity: 0.8,
        });
      }
    });
    return items;
  }, [months, normalizedTarget, normalizedActual, showActual, grandActualTotal]);

  const hasData = grandTargetTotal > 0;
  const hasActualData = grandActualTotal > 0;

  const toggleSection = (section: 'revenue' | 'ads' | 'promos') => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <div className="space-y-3">
      {/* Header with Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-medium text-gray-900">Proyección de ventas</span>
          {hasData && (
            <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded font-medium">
              {fmtK(grandTargetTotal)}€
            </span>
          )}
        </div>
        <button
          onClick={() => setShowActual(!showActual)}
          className={cn(
            'flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-colors',
            showActual ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
          )}
        >
          {showActual ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
          {showActual
            ? (hasAutoData ? 'Datos reales CRP' : 'Ocultando real')
            : 'Ver real'}
        </button>
      </div>

      {/* Chart */}
      <div className="bg-white rounded-lg border border-gray-100 p-3">
        {hasData ? (
          <div className="h-28">
            <BarChart
              data={barChartData}
              margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
              barRadius={3}
              tickFontSize={9}
              tickColor="#9CA3AF"
              renderTooltip={(item) => (
                <div className="bg-white px-3 py-2 shadow-lg rounded-lg border border-gray-100 text-xs">
                  <p className="font-medium text-gray-900 mb-1">{item.label.trim()}</p>
                  <p style={{ color: item.color }}>{fmt(item.value)}€</p>
                </div>
              )}
            />
          </div>
        ) : (
          <div className="h-20 flex items-center justify-center text-gray-400 text-xs">
            Introduce objetivos para ver la gráfica
          </div>
        )}

        {/* Chart Legend */}
        {hasData && (
          <div className="flex items-center justify-center gap-4 mt-2 text-[10px]">
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm bg-blue-500" />
              <span className="text-gray-500">Objetivo</span>
            </div>
            {showActual && (
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-sm bg-emerald-500" />
                <span className="text-gray-500">Real</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Revenue Section */}
      <div className="bg-gray-50 rounded-lg border border-gray-100">
        <button
          onClick={() => toggleSection('revenue')}
          className="w-full flex items-center justify-between px-3 py-2 text-left"
        >
          <span className="text-xs font-medium text-gray-700">Facturación por canal</span>
          {expandedSections.revenue ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />}
        </button>

        {expandedSections.revenue && (
          <div className="px-3 pb-3 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="text-left text-[10px] text-gray-400 font-medium py-1 w-20">Canal</th>
                  {months.map((m) => (
                    <th key={m.key} className="text-center text-[10px] text-gray-400 font-medium py-1 min-w-[52px]">{m.short}</th>
                  ))}
                  <th className="text-right text-[10px] text-gray-400 font-medium py-1 w-16">Total</th>
                </tr>
              </thead>
              <tbody>
                {CHANNELS.map((ch) => (
                  <InputRow
                    key={ch.id}
                    label={ch.label}
                    logoUrl={ch.logo}
                    months={months}
                    values={normalizedTarget}
                    channel={ch.id}
                    onChange={(m, v) => updateTarget(m, ch.id, v)}
                    total={getChannelTotal(normalizedTarget, ch.id)}
                  />
                ))}
                {/* Actual revenue rows */}
                {showActual && CHANNELS.map((ch) => (
                  <InputRow
                    key={`actual-${ch.id}`}
                    label={ch.label}
                    logoUrl={ch.logo}
                    months={months}
                    values={normalizedActual}
                    channel={ch.id}
                    onChange={(m, v) => updateActual(m, ch.id, v)}
                    total={getChannelTotal(normalizedActual, ch.id)}
                    isActual
                    readOnly={!!hasAutoData}
                  />
                ))}
                {/* Total row */}
                <tr className="border-t border-gray-200">
                  <td className="py-1.5 text-[11px] font-semibold text-gray-700">Total</td>
                  {months.map((m) => (
                    <td key={m.key} className="py-1.5 text-center">
                      <span className="text-[11px] font-semibold text-blue-600">{fmt(getMonthTotal(normalizedTarget, m.key))}</span>
                      {showActual && hasActualData && (
                        <span className="block text-[10px] text-emerald-600">{fmt(getMonthTotal(normalizedActual, m.key))}</span>
                      )}
                    </td>
                  ))}
                  <td className="py-1.5 text-right">
                    <span className="text-xs font-bold text-blue-700">{fmt(grandTargetTotal)}€</span>
                    {showActual && hasActualData && (
                      <span className="block text-[10px] font-medium text-emerald-600">{fmt(grandActualTotal)}€</span>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ADS & Promos - Side by side compact */}
      {hasData && onAdsPercentChange && onPromosPercentChange && (
        <div className="grid grid-cols-2 gap-3">
          {/* ADS */}
          <div className="bg-amber-50/50 rounded-lg border border-amber-100">
            <button
              onClick={() => toggleSection('ads')}
              className="w-full flex items-center justify-between px-3 py-2 text-left"
            >
              <div className="flex items-center gap-1.5">
                <Megaphone className="w-3 h-3 text-amber-600" />
                <span className="text-xs font-medium text-gray-700">ADS</span>
              </div>
              {expandedSections.ads ? <ChevronDown className="w-3 h-3 text-gray-400" /> : <ChevronRight className="w-3 h-3 text-gray-400" />}
            </button>

            {expandedSections.ads && (
              <div className="px-3 pb-3">
                <table className="w-full">
                  <tbody>
                    {CHANNELS.map((ch) => {
                      const rev = getChannelTotal(normalizedTarget, ch.id);
                      const pct = adsPercent[ch.id] || 0;
                      return (
                        <tr key={ch.id}>
                          <td className="py-1">
                            <div className="flex items-center gap-1">
                              <img src={ch.logo} alt={ch.label} className="w-3 h-3 rounded-full object-cover" />
                              <span className="text-[10px] text-gray-600">{ch.label}</span>
                            </div>
                          </td>
                          <td className="py-1 w-14">
                            <div className="flex items-center gap-0.5">
                              <input
                                type="number"
                                value={pct || ''}
                                onChange={(e) => updateAds(ch.id, e.target.value)}
                                placeholder="0"
                                className="w-10 text-center text-[10px] py-0.5 border border-amber-200 rounded focus:outline-none focus:ring-1 focus:ring-amber-300 bg-white"
                              />
                              <Percent className="w-2.5 h-2.5 text-gray-400" />
                            </div>
                          </td>
                          <td className="py-1 text-right">
                            <span className="text-[10px] font-medium text-amber-700">{fmt(calcInvestment(rev, pct))}€</span>
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="border-t border-amber-200">
                      <td colSpan={2} className="py-1 text-[10px] font-semibold text-gray-700">Total</td>
                      <td className="py-1 text-right">
                        <span className="text-[11px] font-bold text-amber-700">
                          {fmt(CHANNELS.reduce((s, c) => s + calcInvestment(getChannelTotal(normalizedTarget, c.id), adsPercent[c.id] || 0), 0))}€
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Promos */}
          <div className="bg-purple-50/50 rounded-lg border border-purple-100">
            <button
              onClick={() => toggleSection('promos')}
              className="w-full flex items-center justify-between px-3 py-2 text-left"
            >
              <div className="flex items-center gap-1.5">
                <Percent className="w-3 h-3 text-purple-600" />
                <span className="text-xs font-medium text-gray-700">Promos</span>
              </div>
              {expandedSections.promos ? <ChevronDown className="w-3 h-3 text-gray-400" /> : <ChevronRight className="w-3 h-3 text-gray-400" />}
            </button>

            {expandedSections.promos && (
              <div className="px-3 pb-3">
                <table className="w-full">
                  <tbody>
                    {CHANNELS.map((ch) => {
                      const rev = getChannelTotal(normalizedTarget, ch.id);
                      const pct = promosPercent[ch.id] || 0;
                      return (
                        <tr key={ch.id}>
                          <td className="py-1">
                            <div className="flex items-center gap-1">
                              <img src={ch.logo} alt={ch.label} className="w-3 h-3 rounded-full object-cover" />
                              <span className="text-[10px] text-gray-600">{ch.label}</span>
                            </div>
                          </td>
                          <td className="py-1 w-14">
                            <div className="flex items-center gap-0.5">
                              <input
                                type="number"
                                value={pct || ''}
                                onChange={(e) => updatePromos(ch.id, e.target.value)}
                                placeholder="0"
                                className="w-10 text-center text-[10px] py-0.5 border border-purple-200 rounded focus:outline-none focus:ring-1 focus:ring-purple-300 bg-white"
                              />
                              <Percent className="w-2.5 h-2.5 text-gray-400" />
                            </div>
                          </td>
                          <td className="py-1 text-right">
                            <span className="text-[10px] font-medium text-purple-700">{fmt(calcInvestment(rev, pct))}€</span>
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="border-t border-purple-200">
                      <td colSpan={2} className="py-1 text-[10px] font-semibold text-gray-700">Total</td>
                      <td className="py-1 text-right">
                        <span className="text-[11px] font-bold text-purple-700">
                          {fmt(CHANNELS.reduce((s, c) => s + calcInvestment(getChannelTotal(normalizedTarget, c.id), promosPercent[c.id] || 0), 0))}€
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
