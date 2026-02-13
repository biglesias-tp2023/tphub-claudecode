/**
 * SalesProjectionSetup - Wizard de configuración de proyección de ventas
 *
 * SOLID:
 * - S: Cada Step es un componente independiente
 * - O: Fácil añadir nuevos pasos
 * - D: Props tipados, sin dependencias concretas
 *
 * @module features/strategic/components/SalesProjectionSetup
 */
import { useState, useMemo, useEffect } from 'react';
import { X, Check, TrendingUp, Megaphone, Percent, ChevronRight, ChevronLeft, Sparkles, Calendar, Edit3 } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useGlobalFiltersStore, useDashboardFiltersStore } from '@/stores/filtersStore';
import { useActualRevenueByMonth } from '../hooks/useActualRevenueByMonth';
import type { SalesChannel, SalesInvestmentMode, SalesProjectionConfig, GridChannelMonthData, ChannelMonthEntry } from '@/types';

// ============================================
// TYPES
// ============================================

interface SalesProjectionSetupProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (config: SalesProjectionConfig, targetRevenue: GridChannelMonthData, baselineRevenue: ChannelMonthEntry) => void;
  lastMonthRevenue?: ChannelMonthEntry;
  /** Effective company IDs for fetching CRP data (from page state) */
  companyIds?: string[];
  /** Brand IDs for filtering (from dashboard filters) */
  brandIds?: string[];
  /** Address/restaurant IDs for filtering (from dashboard filters) */
  addressIds?: string[];
}

type Step = 'channels' | 'investment' | 'baseline' | 'targets';

// ============================================
// CONSTANTS
// ============================================

const CHANNELS: { id: SalesChannel; name: string; logoUrl: string; color: string; bg: string }[] = [
  { id: 'glovo', name: 'Glovo', logoUrl: '/images/channels/glovo.png', color: 'border-yellow-400 bg-yellow-50', bg: 'bg-yellow-400' },
  { id: 'ubereats', name: 'Uber Eats', logoUrl: '/images/channels/ubereats.png', color: 'border-green-500 bg-green-50', bg: 'bg-green-500' },
  { id: 'justeat', name: 'Just Eat', logoUrl: '/images/channels/justeat.webp', color: 'border-orange-500 bg-orange-50', bg: 'bg-orange-500' },
];

const MONTH_NAMES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const MONTH_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

// ============================================
// UTILS
// ============================================

const getMonths = (count: number) => {
  const today = new Date();
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
    return {
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: `${MONTH_SHORT[d.getMonth()]} ${String(d.getFullYear()).slice(-2)}`,
    };
  });
};

const getLastMonthLabel = () => {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
};

const getEndDate = (monthCount: number) => {
  const d = new Date();
  d.setMonth(d.getMonth() + monthCount);
  d.setDate(0);
  return d.toISOString().split('T')[0];
};

const fmt = (n: number) => n.toLocaleString('es-ES');

// ============================================
// STEP COMPONENTS
// ============================================

/** Step 1: Selección de canales */
function ChannelStep({ selected, onToggle }: { selected: SalesChannel[]; onToggle: (ch: SalesChannel) => void }) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">¿En qué canales vendes?</h3>
        <p className="text-sm text-gray-500">Selecciona los canales de delivery donde opera el restaurante</p>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {CHANNELS.map((ch) => {
          const isSelected = selected.includes(ch.id);
          return (
            <button
              key={ch.id}
              onClick={() => onToggle(ch.id)}
              className={cn(
                'relative flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border-2 transition-all',
                isSelected ? ch.color : 'border-gray-200 hover:border-gray-300 bg-white'
              )}
            >
              {isSelected && (
                <div className={cn('absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center', ch.bg)}>
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
              <img src={ch.logoUrl} alt={ch.name} className="w-10 h-10 rounded-full object-cover" />
              <span className={cn('text-sm font-medium', isSelected ? 'text-gray-900' : 'text-gray-600')}>{ch.name}</span>
            </button>
          );
        })}
      </div>
      {selected.length === 0 && (
        <p className="text-center text-xs text-amber-600 bg-amber-50 rounded-lg py-2">Selecciona al menos un canal</p>
      )}
    </div>
  );
}

/** Step 2: Configuración de inversión */
function InvestmentStep({
  channels, mode, onModeChange, ads, promos, onAdsChange, onPromosChange,
}: {
  channels: SalesChannel[];
  mode: SalesInvestmentMode;
  onModeChange: (m: SalesInvestmentMode) => void;
  ads: number | Record<SalesChannel, number>;
  promos: number | Record<SalesChannel, number>;
  onAdsChange: (v: number | Record<SalesChannel, number>) => void;
  onPromosChange: (v: number | Record<SalesChannel, number>) => void;
}) {
  const isGlobal = mode === 'global';
  const globalAds = typeof ads === 'number' ? ads : 5;
  const globalPromos = typeof promos === 'number' ? promos : 5;
  const channelAds = typeof ads === 'object' ? ads : { glovo: 0, ubereats: 0, justeat: 0 };
  const channelPromos = typeof promos === 'object' ? promos : { glovo: 0, ubereats: 0, justeat: 0 };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Inversión máxima</h3>
        <p className="text-sm text-gray-500">¿Cuánto quieres invertir como máximo en publicidad y promociones?</p>
      </div>

      <div className="flex justify-center">
        <div className="inline-flex bg-gray-100 rounded-lg p-1">
          {['global', 'per_channel'].map((m) => (
            <button
              key={m}
              onClick={() => {
                onModeChange(m as SalesInvestmentMode);
                if (m === 'global') { onAdsChange(globalAds); onPromosChange(globalPromos); }
                else { onAdsChange(channelAds); onPromosChange(channelPromos); }
              }}
              className={cn('px-4 py-2 text-sm font-medium rounded-md transition-all', mode === m ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}
            >
              {m === 'global' ? 'Mismo para todos' : 'Por canal'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <InvestmentCard
          title="Publicidad (ADS)" icon={Megaphone} color="amber"
          isGlobal={isGlobal} globalValue={globalAds} channelValues={channelAds}
          channels={channels} onChange={onAdsChange}
        />
        <InvestmentCard
          title="Promociones" icon={Percent} color="purple"
          isGlobal={isGlobal} globalValue={globalPromos} channelValues={channelPromos}
          channels={channels} onChange={onPromosChange}
        />
      </div>
    </div>
  );
}

function InvestmentCard({
  title, icon: Icon, color, isGlobal, globalValue, channelValues, channels, onChange,
}: {
  title: string;
  icon: typeof Megaphone;
  color: 'amber' | 'purple';
  isGlobal: boolean;
  globalValue: number;
  channelValues: Record<SalesChannel, number>;
  channels: SalesChannel[];
  onChange: (v: number | Record<SalesChannel, number>) => void;
}) {
  const bgColor = color === 'amber' ? 'bg-amber-50' : 'bg-purple-50';
  const iconBg = color === 'amber' ? 'bg-amber-100' : 'bg-purple-100';
  const iconColor = color === 'amber' ? 'text-amber-600' : 'text-purple-600';
  const borderColor = color === 'amber' ? 'border-amber-200' : 'border-purple-200';
  const ringColor = color === 'amber' ? 'focus:ring-amber-300' : 'focus:ring-purple-300';

  return (
    <div className={cn('rounded-xl p-4', bgColor)}>
      <div className="flex items-center gap-2 mb-4">
        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', iconBg)}>
          <Icon className={cn('w-4 h-4', iconColor)} />
        </div>
        <span className="font-medium text-gray-900">{title}</span>
      </div>
      {isGlobal ? (
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={globalValue || ''}
            onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
            placeholder="5"
            className={cn('w-20 text-center text-lg font-semibold py-2 border rounded-lg focus:outline-none focus:ring-2 bg-white', borderColor, ringColor)}
          />
          <Percent className={cn('w-5 h-5', iconColor)} />
          <span className="text-sm text-gray-500">sobre ventas</span>
        </div>
      ) : (
        <div className="space-y-2">
          {channels.map((ch) => {
            const channel = CHANNELS.find((c) => c.id === ch);
            return (
              <div key={ch} className="flex items-center gap-2">
                <span className="w-16 text-sm text-gray-600">{channel?.name}</span>
                <input
                  type="number"
                  value={channelValues[ch] || ''}
                  onChange={(e) => onChange({ ...channelValues, [ch]: parseFloat(e.target.value) || 0 })}
                  placeholder="5"
                  className={cn('w-14 text-center text-sm font-medium py-1.5 border rounded focus:outline-none focus:ring-1 bg-white', borderColor, ringColor)}
                />
                <Percent className={cn('w-3.5 h-3.5', iconColor.replace('600', '500'))} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Step 3: Baseline (punto de partida) */
function BaselineStep({
  channels, baseline, onChange, isEditing, onToggleEdit, isLoadingRevenue,
}: {
  channels: SalesChannel[];
  baseline: ChannelMonthEntry;
  onChange: (ch: SalesChannel, v: number) => void;
  isEditing: boolean;
  onToggleEdit: () => void;
  isLoadingRevenue?: boolean;
}) {
  const total = channels.reduce((sum, ch) => sum + (baseline[ch] || 0), 0);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Tu punto de partida</h3>
        <p className="text-sm text-gray-500">El mes pasado ({getLastMonthLabel()}), tu facturación fue:</p>
      </div>

      <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-400" />
            <span className="text-sm font-medium text-gray-600">{getLastMonthLabel()}</span>
          </div>
          <button
            onClick={onToggleEdit}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
              isEditing ? 'bg-primary-100 text-primary-700' : 'bg-white text-gray-500 hover:text-gray-700 border border-gray-200'
            )}
          >
            <Edit3 className="w-3.5 h-3.5" />
            {isEditing ? 'Editando' : 'Editar'}
          </button>
        </div>

        <div className="space-y-4">
          {channels.map((ch) => {
            const channel = CHANNELS.find((c) => c.id === ch);
            const value = baseline[ch] || 0;
            return (
              <div key={ch} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {channel && <img src={channel.logoUrl} alt={channel.name} className="w-5 h-5 rounded-full object-cover" />}
                  <span className="text-sm font-medium text-gray-700">{channel?.name}</span>
                </div>
                {isEditing ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={value || ''}
                      onChange={(e) => onChange(ch, parseFloat(e.target.value) || 0)}
                      className="w-24 text-right text-lg font-semibold py-1 px-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white"
                    />
                    <span className="text-gray-500 font-medium">€</span>
                  </div>
                ) : (
                  <span className="text-xl font-bold text-gray-900 tabular-nums">{fmt(value)}€</span>
                )}
              </div>
            );
          })}
          <div className="pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-900">Total</span>
              <span className="text-2xl font-bold text-primary-600 tabular-nums">{fmt(total)}€</span>
            </div>
          </div>
        </div>
      </div>

      {!isEditing && <p className="text-center text-sm text-gray-500">¿Es correcto? Si no, pulsa <span className="font-medium text-gray-700">Editar</span>.</p>}
      {isLoadingRevenue && total === 0 && (
        <div className="text-center py-3 bg-primary-50 rounded-lg border border-primary-100">
          <p className="text-sm text-primary-700">Cargando datos reales del CRP Portal...</p>
        </div>
      )}
      {!isLoadingRevenue && total === 0 && (
        <div className="text-center py-3 bg-amber-50 rounded-lg border border-amber-100">
          <p className="text-sm text-amber-700">No tenemos datos del mes pasado. Puedes introducirlos manualmente.</p>
        </div>
      )}
    </div>
  );
}

/** Step 4: Objetivos de venta */
function TargetsStep({
  channels, targets, onChange, baseline, actualRevenue,
}: {
  channels: SalesChannel[];
  targets: GridChannelMonthData;
  onChange: (month: string, ch: SalesChannel, v: number) => void;
  baseline: ChannelMonthEntry;
  actualRevenue?: GridChannelMonthData;
}) {
  const months = useMemo(() => getMonths(6), []);
  const getChannelTotal = (ch: SalesChannel) => months.reduce((sum, m) => sum + (targets[m.key]?.[ch] || 0), 0);
  const getMonthTotal = (key: string) => channels.reduce((sum, ch) => sum + (targets[key]?.[ch] || 0), 0);
  const getActualMonthTotal = (key: string) => channels.reduce((sum, ch) => sum + (actualRevenue?.[key]?.[ch] || 0), 0);
  const grandTotal = months.reduce((sum, m) => sum + getMonthTotal(m.key), 0);
  const baselineTotal = channels.reduce((sum, ch) => sum + (baseline[ch] || 0), 0);
  const growth = baselineTotal > 0 ? Math.round(((grandTotal / 6 - baselineTotal) / baselineTotal) * 100) : 0;
  const hasActualData = actualRevenue && Object.values(actualRevenue).some((m) => m && (m.glovo > 0 || m.ubereats > 0 || m.justeat > 0));

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Objetivos de venta</h3>
        <p className="text-sm text-gray-500">Punto de partida: <span className="font-semibold text-gray-700">{fmt(baselineTotal)}€/mes</span></p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="text-left text-xs text-gray-400 font-medium py-2 w-24">Canal</th>
              {months.map((m) => <th key={m.key} className="text-center text-xs text-gray-400 font-medium py-2 min-w-[70px]">{m.label}</th>)}
              <th className="text-right text-xs text-gray-400 font-medium py-2 w-20">Total</th>
            </tr>
          </thead>
          <tbody>
            {channels.map((ch) => {
              const channel = CHANNELS.find((c) => c.id === ch);
              return (
                <tr key={ch}>
                  <td className="py-1.5">
                    <div className="flex items-center gap-2">
                      {channel && <img src={channel.logoUrl} alt={channel.name} className="w-4 h-4 rounded-full object-cover" />}
                      <span className="text-sm text-gray-700">{channel?.name}</span>
                    </div>
                  </td>
                  {months.map((m) => (
                    <td key={m.key} className="py-1 px-1">
                      <input
                        type="number"
                        value={targets[m.key]?.[ch] || ''}
                        onChange={(e) => onChange(m.key, ch, parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        className="w-full text-center text-sm py-1.5 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-primary-300 focus:border-primary-300 bg-white"
                      />
                    </td>
                  ))}
                  <td className="py-1.5 text-right">
                    <span className="text-sm font-semibold text-gray-700 tabular-nums">{fmt(getChannelTotal(ch))}€</span>
                  </td>
                </tr>
              );
            })}
            {/* Actual revenue rows (read-only) */}
            {hasActualData && channels.map((ch) => {
              const channel = CHANNELS.find((c) => c.id === ch);
              const channelActualTotal = months.reduce((sum, m) => sum + (actualRevenue?.[m.key]?.[ch] || 0), 0);
              return (
                <tr key={`actual-${ch}`} className="bg-emerald-50/50">
                  <td className="py-1.5">
                    <div className="flex items-center gap-2">
                      {channel && <img src={channel.logoUrl} alt={channel.name} className="w-4 h-4 rounded-full object-cover opacity-60" />}
                      <span className="text-xs text-emerald-600 font-medium">{channel?.name} <span className="text-[10px]">(real)</span></span>
                    </div>
                  </td>
                  {months.map((m) => {
                    const val = actualRevenue?.[m.key]?.[ch] || 0;
                    return (
                      <td key={m.key} className="py-1 px-1">
                        <div className="w-full text-center text-xs py-1.5 rounded bg-emerald-50 text-emerald-700 font-medium tabular-nums">
                          {val > 0 ? fmt(val) : '-'}
                        </div>
                      </td>
                    );
                  })}
                  <td className="py-1.5 text-right">
                    <span className="text-xs font-semibold text-emerald-600 tabular-nums">{fmt(channelActualTotal)}€</span>
                  </td>
                </tr>
              );
            })}
            <tr className="border-t border-gray-200">
              <td className="py-2 text-sm font-semibold text-gray-900">Total</td>
              {months.map((m) => (
                <td key={m.key} className="py-2 text-center">
                  <span className="text-sm font-semibold text-primary-600 tabular-nums">{fmt(getMonthTotal(m.key))}€</span>
                  {hasActualData && getActualMonthTotal(m.key) > 0 && (
                    <span className="block text-[10px] text-emerald-600 tabular-nums">{fmt(getActualMonthTotal(m.key))}€</span>
                  )}
                </td>
              ))}
              <td className="py-2 text-right">
                <span className="text-base font-bold text-primary-700 tabular-nums">{fmt(grandTotal)}€</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {hasActualData && (
        <div className="flex items-center gap-2 text-[10px] text-gray-400 justify-center">
          <span className="w-2 h-2 rounded-sm bg-emerald-400" />
          <span>Datos reales del CRP Portal (mes actual hasta ayer)</span>
        </div>
      )}

      {grandTotal > 0 && (
        <div className="text-center py-3 bg-primary-50 rounded-lg">
          <p className="text-sm text-primary-700">
            Objetivo: <span className="font-bold">{fmt(grandTotal)}€</span> en 6 meses
            {baselineTotal > 0 && (
              <span className={cn('ml-2', growth >= 0 ? 'text-emerald-600' : 'text-red-600')}>
                ({growth >= 0 ? '+' : ''}{growth}% vs. mes anterior)
              </span>
            )}
          </p>
        </div>
      )}
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function SalesProjectionSetup({ isOpen, onClose, onComplete, lastMonthRevenue, companyIds: propCompanyIds, brandIds: propBrandIds, addressIds: propAddressIds }: SalesProjectionSetupProps) {
  const [step, setStep] = useState<Step>('channels');
  const [channels, setChannels] = useState<SalesChannel[]>(['glovo', 'ubereats', 'justeat']);
  const [mode, setMode] = useState<SalesInvestmentMode>('global');
  const [ads, setAds] = useState<number | Record<SalesChannel, number>>(5);
  const [promos, setPromos] = useState<number | Record<SalesChannel, number>>(5);
  const [baseline, setBaseline] = useState<ChannelMonthEntry>(lastMonthRevenue || { glovo: 0, ubereats: 0, justeat: 0 });
  const [baselineLoaded, setBaselineLoaded] = useState(false);
  const [editingBaseline, setEditingBaseline] = useState(false);
  const [targets, setTargets] = useState<GridChannelMonthData>({});

  // Fetch real revenue from CRP Portal for baseline auto-population
  // Use props (from parent page) first, then fallback to store values
  const { companyIds: globalCompanyIds } = useGlobalFiltersStore();
  const { brandIds: filterBrandIds, restaurantIds: filterRestaurantIds } = useDashboardFiltersStore();
  const effectiveCompanyIds = propCompanyIds?.length ? propCompanyIds : (globalCompanyIds.length > 0 ? globalCompanyIds : []);
  const effectiveBrandIds = propBrandIds?.length ? propBrandIds : (filterBrandIds.length > 0 ? filterBrandIds : undefined);
  const effectiveAddressIds = propAddressIds?.length ? propAddressIds : (filterRestaurantIds.length > 0 ? filterRestaurantIds : undefined);
  const { revenueByMonth: autoRevenue, lastMonthRevenue: autoLastMonthRevenue, isLoading: isLoadingRevenue } = useActualRevenueByMonth({
    companyIds: isOpen ? effectiveCompanyIds : [],
    brandIds: effectiveBrandIds,
    addressIds: effectiveAddressIds,
    monthsCount: 6,
  });

  // Auto-populate baseline when CRP data arrives (only once per wizard open)
  useEffect(() => {
    if (!baselineLoaded && autoLastMonthRevenue > 0 && !lastMonthRevenue) {
      // Get last month's key to extract channel breakdown
      const d = new Date();
      d.setMonth(d.getMonth() - 1);
      const lastMonthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const lastMonthData = autoRevenue[lastMonthKey];

      if (lastMonthData) {
        setBaseline({
          glovo: lastMonthData.glovo || 0,
          ubereats: lastMonthData.ubereats || 0,
          justeat: lastMonthData.justeat || 0,
        });
        setBaselineLoaded(true);
      }
    }
  }, [autoRevenue, autoLastMonthRevenue, baselineLoaded, lastMonthRevenue]);

  // Reset baselineLoaded when wizard closes/opens
  useEffect(() => {
    if (!isOpen) {
      setBaselineLoaded(false);
    }
  }, [isOpen]);

  const months = useMemo(() => getMonths(6), []);
  const steps: Step[] = ['channels', 'investment', 'baseline', 'targets'];
  const idx = steps.indexOf(step);

  const toggleChannel = (ch: SalesChannel) => setChannels((prev) => prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch]);

  const handleTargetChange = (month: string, ch: SalesChannel, value: number) => {
    setTargets((prev) => ({
      ...prev,
      [month]: { ...prev[month], glovo: prev[month]?.glovo || 0, ubereats: prev[month]?.ubereats || 0, justeat: prev[month]?.justeat || 0, [ch]: value },
    }));
  };

  const handleComplete = () => {
    const config: SalesProjectionConfig = {
      activeChannels: channels,
      investmentMode: mode,
      maxAdsPercent: ads,
      maxPromosPercent: promos,
      startDate: new Date().toISOString().split('T')[0],
      endDate: getEndDate(6),
    };
    onComplete(config, targets, baseline);
  };

  const canProceed = () => {
    if (step === 'channels') return channels.length > 0;
    if (step === 'targets') {
      const total = months.reduce((sum, m) => sum + channels.reduce((chSum, ch) => chSum + (targets[m.key]?.[ch] || 0), 0), 0);
      return total > 0;
    }
    return true;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Configurar proyección de ventas</h2>
              <p className="text-xs text-gray-500">Paso {idx + 1} de {steps.length}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress */}
        <div className="px-6 pt-4">
          <div className="flex gap-2">
            {steps.map((_, i) => <div key={i} className={cn('h-1 flex-1 rounded-full transition-colors', i <= idx ? 'bg-primary-500' : 'bg-gray-200')} />)}
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6 min-h-[400px]">
          {step === 'channels' && <ChannelStep selected={channels} onToggle={toggleChannel} />}
          {step === 'investment' && (
            <InvestmentStep channels={channels} mode={mode} onModeChange={setMode} ads={ads} promos={promos} onAdsChange={setAds} onPromosChange={setPromos} />
          )}
          {step === 'baseline' && (
            <BaselineStep channels={channels} baseline={baseline} onChange={(ch, v) => setBaseline((p) => ({ ...p, [ch]: v }))} isEditing={editingBaseline} onToggleEdit={() => setEditingBaseline(!editingBaseline)} isLoadingRevenue={isLoadingRevenue} />
          )}
          {step === 'targets' && <TargetsStep channels={channels} targets={targets} onChange={handleTargetChange} baseline={baseline} actualRevenue={autoRevenue} />}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50">
          <button
            onClick={() => setStep(steps[idx - 1])}
            disabled={idx === 0}
            className={cn('flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-colors', idx === 0 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100')}
          >
            <ChevronLeft className="w-4 h-4" />
            Anterior
          </button>

          {idx < steps.length - 1 ? (
            <button
              onClick={() => setStep(steps[idx + 1])}
              disabled={!canProceed()}
              className={cn('flex items-center gap-1.5 px-5 py-2 text-sm font-medium rounded-lg transition-colors', canProceed() ? 'bg-primary-600 text-white hover:bg-primary-700' : 'bg-gray-100 text-gray-400 cursor-not-allowed')}
            >
              {step === 'baseline' ? 'Sí, es correcto' : 'Siguiente'}
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleComplete}
              disabled={!canProceed()}
              className={cn('flex items-center gap-1.5 px-5 py-2 text-sm font-medium rounded-lg transition-colors', canProceed() ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-gray-100 text-gray-400 cursor-not-allowed')}
            >
              <TrendingUp className="w-4 h-4" />
              Crear proyección
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
