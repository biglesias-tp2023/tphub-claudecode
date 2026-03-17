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
import { useState, useMemo, useEffect, useCallback } from 'react';
import { X, Check, TrendingUp, Megaphone, Percent, ChevronRight, ChevronLeft, Calendar, Edit3, AlertTriangle, RefreshCw, MapPin } from 'lucide-react';
import { useQueryClient, useQueries } from '@tanstack/react-query';
import { cn } from '@/utils/cn';
import { useGlobalFiltersStore, useDashboardFiltersStore } from '@/stores/filtersStore';
import { useActualRevenueByMonth } from '../hooks/useActualRevenueByMonth';
import { fetchMonthlyRevenueByChannel } from '@/services/crp-portal';
import { expandRestaurantIds } from '@/hooks/idExpansion';
import { QUERY_STALE_MEDIUM, QUERY_GC_MEDIUM } from '@/constants/queryConfig';
import type { SalesChannel, SalesInvestmentMode, SalesProjectionConfig, SalesProjectionData, GridChannelMonthData, ChannelMonthEntry, Restaurant } from '@/types';

// ============================================
// TYPES
// ============================================

interface AddressBatchEntry {
  addressId: string;
  brandId: string;
  targetRevenue: GridChannelMonthData;
  baselineRevenue: ChannelMonthEntry;
}

interface SalesProjectionSetupProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (config: SalesProjectionConfig, targetRevenue: GridChannelMonthData, baselineRevenue: ChannelMonthEntry) => void;
  /** Batch completion for multi-address mode */
  onCompleteBatch?: (config: SalesProjectionConfig, addressData: AddressBatchEntry[]) => void;
  lastMonthRevenue?: ChannelMonthEntry;
  /** Effective company IDs for fetching CRP data (from page state) */
  companyIds?: string[];
  /** Brand IDs for filtering (from dashboard filters) */
  brandIds?: string[];
  /** Address/restaurant IDs for filtering (from dashboard filters) */
  addressIds?: string[];
  /** Existing projection to pre-fill the wizard (edit mode) */
  existingProjection?: SalesProjectionData | null;
  /** Addresses of the selected brand (enables multi-address mode when > 1) */
  addresses?: Restaurant[];
  /** Existing per-address projections for pre-fill in multi-address mode */
  existingAddressProjections?: SalesProjectionData[];
  /** Scope label shown in the header (e.g. "Company > Brand") */
  scopeLabel?: string;
}

type Step = 'channels' | 'addresses' | 'investment' | 'baseline' | 'targets';

// ============================================
// CONSTANTS
// ============================================

const CHANNELS: { id: SalesChannel; name: string; logoUrl: string; color: string; bg: string }[] = [
  { id: 'glovo', name: 'Glovo', logoUrl: '/images/platforms/glovo.png', color: 'border-yellow-400 bg-yellow-50', bg: 'bg-yellow-400' },
  { id: 'ubereats', name: 'Uber Eats', logoUrl: '/images/platforms/ubereats.png', color: 'border-green-500 bg-green-50', bg: 'bg-green-500' },
  { id: 'justeat', name: 'Just Eat', logoUrl: '/images/platforms/justeat.webp', color: 'border-orange-500 bg-orange-50', bg: 'bg-orange-500' },
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

/** Step 2: Selección de puntos de venta */
function AddressSelectionStep({
  addresses,
  selectedIds,
  onToggle,
  onSelectAll,
  onDeselectAll,
}: {
  addresses: Restaurant[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">¿Sobre qué puntos de venta?</h3>
        <p className="text-sm text-gray-500">Selecciona los establecimientos para los que quieres configurar objetivos</p>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">{selectedIds.length} de {addresses.length} seleccionados</span>
        <div className="flex gap-2">
          <button onClick={onSelectAll} className="text-xs text-primary-600 hover:text-primary-800 font-medium">Seleccionar todos</button>
          <button onClick={onDeselectAll} className="text-xs text-gray-500 hover:text-gray-700 font-medium">Ninguno</button>
        </div>
      </div>

      <div className="space-y-2 max-h-[300px] overflow-y-auto">
        {addresses.map((addr) => {
          const isSelected = selectedIds.includes(addr.id);
          return (
            <button
              key={addr.id}
              onClick={() => onToggle(addr.id)}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-left',
                isSelected
                  ? 'border-primary-400 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              )}
            >
              <div className={cn(
                'w-5 h-5 rounded-full flex items-center justify-center shrink-0',
                isSelected ? 'bg-primary-600' : 'bg-gray-100'
              )}>
                {isSelected && <Check className="w-3 h-3 text-white" />}
              </div>
              <MapPin className={cn('w-4 h-4 shrink-0', isSelected ? 'text-primary-600' : 'text-gray-400')} />
              <div className="min-w-0">
                <span className={cn('text-sm font-medium block truncate', isSelected ? 'text-gray-900' : 'text-gray-600')}>
                  {addr.name}
                </span>
                {addr.address && (
                  <span className="text-xs text-gray-400 block truncate">{addr.address}</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {selectedIds.length === 0 && (
        <p className="text-center text-xs text-amber-600 bg-amber-50 rounded-lg py-2">Selecciona al menos un punto de venta</p>
      )}
    </div>
  );
}

/** Step 3: Configuración de inversión */
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
  channels, baseline, onChange, isEditing, onToggleEdit, isLoadingRevenue, isError, onRetry, monthLabel, isPartialMonth,
}: {
  channels: SalesChannel[];
  baseline: ChannelMonthEntry;
  onChange: (ch: SalesChannel, v: number) => void;
  isEditing: boolean;
  onToggleEdit: () => void;
  isLoadingRevenue?: boolean;
  /** Whether fetching revenue data failed */
  isError?: boolean;
  /** Retry fetching revenue data */
  onRetry?: () => void;
  /** Label for the baseline month (e.g. "Febrero 2026") */
  monthLabel: string;
  /** Whether the baseline month is partial (current month) */
  isPartialMonth?: boolean;
}) {
  const total = channels.reduce((sum, ch) => sum + (baseline[ch] || 0), 0);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Tu punto de partida</h3>
        <p className="text-sm text-gray-500">
          {isPartialMonth
            ? <>En {monthLabel} (parcial), tu facturación es:</>
            : <>El mes pasado ({monthLabel}), tu facturación fue:</>
          }
        </p>
      </div>

      <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-400" />
            <span className="text-sm font-medium text-gray-600">{monthLabel}{isPartialMonth ? ' (parcial)' : ''}</span>
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

      {!isEditing && total > 0 && <p className="text-center text-sm text-gray-500">¿Es correcto? Si no, pulsa <span className="font-medium text-gray-700">Editar</span>.</p>}
      {isError && total === 0 && (
        <div className="text-center py-3 bg-red-50 rounded-lg border border-red-100">
          <div className="flex items-center justify-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <p className="text-sm font-medium text-red-700">Error al cargar datos de ventas</p>
          </div>
          <p className="text-xs text-red-600 mb-2">No se pudo conectar con el servicio de datos. Puedes reintentar o introducir los valores manualmente.</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded-lg transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              Reintentar
            </button>
          )}
        </div>
      )}
      {isLoadingRevenue && !isError && total === 0 && (
        <div className="text-center py-3 bg-primary-50 rounded-lg border border-primary-100">
          <p className="text-sm text-primary-700">Cargando datos reales del CRP Portal...</p>
        </div>
      )}
      {!isLoadingRevenue && !isError && total === 0 && (
        <div className="text-center py-3 bg-amber-50 rounded-lg border border-amber-100">
          <p className="text-sm text-amber-700">No tenemos datos de ventas. Puedes introducirlos manualmente.</p>
        </div>
      )}
      {isPartialMonth && total > 0 && (
        <div className="text-center py-3 bg-blue-50 rounded-lg border border-blue-100">
          <p className="text-sm text-blue-700">Datos parciales del mes en curso. Puedes ajustarlos pulsando Editar.</p>
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
          <span className="relative flex w-2 h-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
            <span className="relative inline-flex w-2 h-2 rounded-full bg-emerald-400" />
          </span>
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
// MULTI-ADDRESS STEP COMPONENTS
// ============================================

/** Multi-address baseline: table with one row per address */
function MultiAddressBaselineStep({
  channels,
  addresses,
  addressBaselines,
  onChangeAddress,
  isEditing,
  onToggleEdit,
  monthLabel,
}: {
  channels: SalesChannel[];
  addresses: Restaurant[];
  addressBaselines: Record<string, ChannelMonthEntry>;
  onChangeAddress: (addressId: string, ch: SalesChannel, v: number) => void;
  isEditing: boolean;
  onToggleEdit: () => void;
  monthLabel: string;
}) {
  const totals: ChannelMonthEntry = { glovo: 0, ubereats: 0, justeat: 0 };
  for (const addr of addresses) {
    const b = addressBaselines[addr.id] || { glovo: 0, ubereats: 0, justeat: 0 };
    for (const ch of channels) totals[ch] += b[ch] || 0;
  }
  const grandTotal = channels.reduce((s, ch) => s + totals[ch], 0);

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Punto de partida por dirección</h3>
        <p className="text-sm text-gray-500">{monthLabel} — {addresses.length} direcciones</p>
      </div>

      <div className="flex justify-end">
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

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="text-left text-xs text-gray-400 font-medium py-2">Dirección</th>
              {channels.map((ch) => {
                const channel = CHANNELS.find(c => c.id === ch);
                return <th key={ch} className="text-center text-xs text-gray-400 font-medium py-2 min-w-[80px]">{channel?.name}</th>;
              })}
              <th className="text-right text-xs text-gray-400 font-medium py-2 w-20">Total</th>
            </tr>
          </thead>
          <tbody>
            {addresses.map((addr) => {
              const b = addressBaselines[addr.id] || { glovo: 0, ubereats: 0, justeat: 0 };
              const rowTotal = channels.reduce((s, ch) => s + (b[ch] || 0), 0);
              return (
                <tr key={addr.id} className="border-t border-gray-50">
                  <td className="py-1.5 pr-2">
                    <span className="text-sm text-gray-700 truncate block max-w-[180px]" title={addr.name}>
                      {addr.name}
                    </span>
                  </td>
                  {channels.map((ch) => (
                    <td key={ch} className="py-1 px-1">
                      {isEditing ? (
                        <input
                          type="number"
                          value={b[ch] || ''}
                          onChange={(e) => onChangeAddress(addr.id, ch, parseFloat(e.target.value) || 0)}
                          className="w-full text-center text-sm py-1.5 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-primary-300 bg-white"
                        />
                      ) : (
                        <div className="text-center text-sm font-medium text-gray-700 tabular-nums py-1.5">{fmt(b[ch] || 0)}€</div>
                      )}
                    </td>
                  ))}
                  <td className="py-1.5 text-right">
                    <span className="text-sm font-semibold text-gray-700 tabular-nums">{fmt(rowTotal)}€</span>
                  </td>
                </tr>
              );
            })}
            <tr className="border-t-2 border-gray-200">
              <td className="py-2 text-sm font-semibold text-gray-900">Total</td>
              {channels.map((ch) => (
                <td key={ch} className="py-2 text-center">
                  <span className="text-sm font-semibold text-primary-600 tabular-nums">{fmt(totals[ch])}€</span>
                </td>
              ))}
              <td className="py-2 text-right">
                <span className="text-base font-bold text-primary-700 tabular-nums">{fmt(grandTotal)}€</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Multi-address targets: tabs per address + summary tab */
function MultiAddressTargetsStep({
  channels,
  addresses,
  addressTargets,
  addressBaselines,
  onChangeAddress,
  activeTab,
  onTabChange,
  actualRevenue,
}: {
  channels: SalesChannel[];
  addresses: Restaurant[];
  addressTargets: Record<string, GridChannelMonthData>;
  addressBaselines: Record<string, ChannelMonthEntry>;
  onChangeAddress: (addressId: string, month: string, ch: SalesChannel, v: number) => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
  actualRevenue?: GridChannelMonthData;
}) {
  const months = getMonths(6);

  // Compute summary: sum of all address targets
  const summaryTargets = useMemo(() => {
    const result: GridChannelMonthData = {};
    for (const addr of addresses) {
      const t = addressTargets[addr.id] || {};
      for (const m of months) {
        if (!result[m.key]) result[m.key] = { glovo: 0, ubereats: 0, justeat: 0 };
        result[m.key].glovo += t[m.key]?.glovo || 0;
        result[m.key].ubereats += t[m.key]?.ubereats || 0;
        result[m.key].justeat += t[m.key]?.justeat || 0;
      }
    }
    return result;
  }, [addressTargets, addresses, months]);

  const summaryBaseline = useMemo(() => {
    const result: ChannelMonthEntry = { glovo: 0, ubereats: 0, justeat: 0 };
    for (const addr of addresses) {
      const b = addressBaselines[addr.id] || { glovo: 0, ubereats: 0, justeat: 0 };
      result.glovo += b.glovo;
      result.ubereats += b.ubereats;
      result.justeat += b.justeat;
    }
    return result;
  }, [addressBaselines, addresses]);

  // For single address, force the tab to that address (no summary)
  const effectiveTab = addresses.length === 1 ? addresses[0].id : activeTab;
  const isSummary = effectiveTab === '__summary__' && addresses.length > 1;

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Objetivos de venta</h3>
        <p className="text-sm text-gray-500">{addresses.length} {addresses.length === 1 ? 'punto de venta' : 'puntos de venta'} · 6 meses</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 border-b border-gray-100">
        {addresses.length > 1 && (
          <button
            onClick={() => onTabChange('__summary__')}
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-t-lg whitespace-nowrap transition-colors',
              isSummary ? 'bg-primary-50 text-primary-700 border-b-2 border-primary-500' : 'text-gray-500 hover:text-gray-700'
            )}
          >
            Agrupado
          </button>
        )}
        {addresses.map((addr, i) => (
          <button
            key={addr.id}
            onClick={() => onTabChange(addr.id)}
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-t-lg whitespace-nowrap transition-colors max-w-[160px] truncate',
              activeTab === addr.id ? 'bg-primary-50 text-primary-700 border-b-2 border-primary-500' : 'text-gray-500 hover:text-gray-700'
            )}
            title={addr.name}
          >
            Local {i + 1}: {addr.name}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {isSummary ? (
        <TargetsStep
          channels={channels}
          targets={summaryTargets}
          onChange={() => {}} // read-only
          baseline={summaryBaseline}
          actualRevenue={actualRevenue}
        />
      ) : (
        <TargetsStep
          channels={channels}
          targets={addressTargets[effectiveTab] || {}}
          onChange={(month, ch, v) => onChangeAddress(effectiveTab, month, ch, v)}
          baseline={addressBaselines[effectiveTab] || { glovo: 0, ubereats: 0, justeat: 0 }}
        />
      )}
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function SalesProjectionSetup({ isOpen, onClose, onComplete, onCompleteBatch, lastMonthRevenue, companyIds: propCompanyIds, brandIds: propBrandIds, addressIds: propAddressIds, existingProjection, addresses, existingAddressProjections, scopeLabel }: SalesProjectionSetupProps) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>('channels');
  const [channels, setChannels] = useState<SalesChannel[]>(['glovo', 'ubereats', 'justeat']);
  const [mode, setMode] = useState<SalesInvestmentMode>('global');
  const [ads, setAds] = useState<number | Record<SalesChannel, number>>(5);
  const [promos, setPromos] = useState<number | Record<SalesChannel, number>>(5);
  const [baseline, setBaseline] = useState<ChannelMonthEntry>(lastMonthRevenue || { glovo: 0, ubereats: 0, justeat: 0 });
  const [baselineLoaded, setBaselineLoaded] = useState(false);
  const [editingBaseline, setEditingBaseline] = useState(false);
  const [targets, setTargets] = useState<GridChannelMonthData>({});

  // Multi-address state
  const hasAddresses = (addresses?.length ?? 0) > 0;
  const [selectedAddressIds, setSelectedAddressIds] = useState<string[]>([]);
  const selectedAddresses = useMemo(() =>
    addresses?.filter(a => selectedAddressIds.includes(a.id)) ?? [],
    [addresses, selectedAddressIds]
  );
  const [addressBaselines, setAddressBaselines] = useState<Record<string, ChannelMonthEntry>>({});
  const [addressTargets, setAddressTargets] = useState<Record<string, GridChannelMonthData>>({});
  const [activeAddressTab, setActiveAddressTab] = useState<string>('__summary__');

  // Pre-fill wizard from existing projection when opening in edit mode
  useEffect(() => {
    if (!isOpen) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStep('channels');
    setEditingBaseline(false);
    setActiveAddressTab('__summary__');

    // Initialize selected addresses: all by default, or from existing projections
    if (hasAddresses && addresses) {
      if (existingAddressProjections && existingAddressProjections.length > 0) {
        // Pre-select addresses that have existing projections
        const existingIds = existingAddressProjections
          .map(p => p.addressId)
          .filter((id): id is string => !!id);
        setSelectedAddressIds(existingIds.length > 0 ? existingIds : addresses.map(a => a.id));
      } else {
        setSelectedAddressIds(addresses.map(a => a.id));
      }
    } else {
      setSelectedAddressIds([]);
    }

    // Multi-address: pre-fill from existing address projections
    if (hasAddresses && existingAddressProjections && existingAddressProjections.length > 0) {
      const first = existingAddressProjections[0];
      setChannels(first.config.activeChannels);
      setMode(first.config.investmentMode);
      setAds(first.config.maxAdsPercent);
      setPromos(first.config.maxPromosPercent);

      const baselines: Record<string, ChannelMonthEntry> = {};
      const targets: Record<string, GridChannelMonthData> = {};
      for (const p of existingAddressProjections) {
        if (p.addressId) {
          baselines[p.addressId] = p.baselineRevenue;
          targets[p.addressId] = p.targetRevenue;
        }
      }
      setAddressBaselines(baselines);
      setAddressTargets(targets);
      setBaselineLoaded(true);
      setBaseline(lastMonthRevenue || { glovo: 0, ubereats: 0, justeat: 0 });
      setTargets({});
    } else if (existingProjection) {
      setChannels(existingProjection.config.activeChannels);
      setMode(existingProjection.config.investmentMode);
      setAds(existingProjection.config.maxAdsPercent);
      setPromos(existingProjection.config.maxPromosPercent);
      setBaseline(existingProjection.baselineRevenue);
      setBaselineLoaded(true);
      setTargets(existingProjection.targetRevenue);
      setAddressBaselines({});
      setAddressTargets({});
    } else {
      setChannels(['glovo', 'ubereats', 'justeat']);
      setMode('global');
      setAds(5);
      setPromos(5);
      setBaseline(lastMonthRevenue || { glovo: 0, ubereats: 0, justeat: 0 });
      setBaselineLoaded(false);
      setTargets({});
      setAddressBaselines({});
      setAddressTargets({});
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch real revenue from CRP Portal for baseline auto-population
  // Use props (from parent page) first, then fallback to store values
  const { companyIds: globalCompanyIds } = useGlobalFiltersStore();
  const { brandIds: filterBrandIds, restaurantIds: filterRestaurantIds } = useDashboardFiltersStore();
  const effectiveCompanyIds = propCompanyIds?.length ? propCompanyIds : (globalCompanyIds.length > 0 ? globalCompanyIds : []);
  const effectiveBrandIds = propBrandIds?.length ? propBrandIds : (filterBrandIds.length > 0 ? filterBrandIds : undefined);
  const effectiveAddressIds = propAddressIds?.length ? propAddressIds : (filterRestaurantIds.length > 0 ? filterRestaurantIds : undefined);
  const { revenueByMonth: autoRevenue, lastMonthRevenue: autoLastMonthRevenue, latestMonthWithData, isLoading: isLoadingRevenue, isError: isRevenueError, error: revenueError } = useActualRevenueByMonth({
    companyIds: isOpen ? effectiveCompanyIds : [],
    brandIds: effectiveBrandIds,
    addressIds: effectiveAddressIds,
    monthsCount: 6,
  });

  // DEV: warn when revenue fetch fails or returns no data despite having company IDs
  useEffect(() => {
    if (import.meta.env.DEV && !isLoadingRevenue && isOpen && effectiveCompanyIds.length > 0) {
      if (isRevenueError) {
        console.warn('[SalesProjectionSetup] Revenue fetch failed:', revenueError?.message);
      } else if (autoLastMonthRevenue === 0 && !latestMonthWithData) {
        console.warn('[SalesProjectionSetup] No revenue data found for companies:', effectiveCompanyIds);
      }
    }
  }, [isLoadingRevenue, isRevenueError, revenueError, autoLastMonthRevenue, latestMonthWithData, effectiveCompanyIds, isOpen]);

  // Multi-address: per-address revenue for baseline auto-population
  const addressRevenueQueries = useQueries({
    queries: (selectedAddresses.length > 0 && isOpen ? selectedAddresses : []).map((addr) => {
      const addrAllIds = expandRestaurantIds([addr.id], addresses || []);
      const d = new Date();
      d.setMonth(d.getMonth() - 1);
      const startDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
      const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      const endDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      return {
        queryKey: ['address-revenue', addr.id, startDate, endDate],
        queryFn: () => fetchMonthlyRevenueByChannel({
          companyIds: effectiveCompanyIds,
          addressIds: addrAllIds.length > 0 ? addrAllIds : [addr.id],
          startDate,
          endDate,
        }),
        enabled: effectiveCompanyIds.length > 0,
        staleTime: QUERY_STALE_MEDIUM,
        gcTime: QUERY_GC_MEDIUM,
      };
    }),
  });

  // Auto-populate addressBaselines from per-address revenue queries
  const [addressBaselineLoaded, setAddressBaselineLoaded] = useState(false);
  useEffect(() => {
    if (selectedAddresses.length === 0 || addressBaselineLoaded || !isOpen) return;
    // Wait for all queries to settle
    const allDone = addressRevenueQueries.every(q => !q.isLoading);
    if (!allDone) return;

    const newBaselines: Record<string, ChannelMonthEntry> = {};
    let hasAnyData = false;
    selectedAddresses.forEach((addr, i) => {
      const result = addressRevenueQueries[i]?.data;
      const entry: ChannelMonthEntry = { glovo: 0, ubereats: 0, justeat: 0 };
      if (result) {
        for (const row of result) {
          const ch = row.channel as SalesChannel;
          if (ch === 'glovo' || ch === 'ubereats' || ch === 'justeat') {
            entry[ch] = Math.round(Number(row.total_revenue) || 0);
            if (entry[ch] > 0) hasAnyData = true;
          }
        }
      }
      newBaselines[addr.id] = entry;
    });

    if (hasAnyData) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAddressBaselines(prev => {
        // Only auto-fill addresses that have no existing data
        const merged = { ...prev };
        for (const [addrId, entry] of Object.entries(newBaselines)) {
          if (!merged[addrId] || (merged[addrId].glovo === 0 && merged[addrId].ubereats === 0 && merged[addrId].justeat === 0)) {
            merged[addrId] = entry;
          }
        }
        return merged;
      });
      setAddressBaselineLoaded(true);
    }
  }, [addressRevenueQueries, selectedAddresses, addressBaselineLoaded, isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset addressBaselineLoaded when wizard closes
  useEffect(() => {
    if (!isOpen) setAddressBaselineLoaded(false);
  }, [isOpen]);

  const handleRetryRevenue = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['actual-revenue-by-month'] });
  }, [queryClient]);

  // Auto-populate baseline when CRP data arrives (only once per wizard open)
  // Tries last month first; if 0, falls back to the latest month with data
  useEffect(() => {
    if (baselineLoaded || lastMonthRevenue) return;

    // Option 1: last month has data
    if (autoLastMonthRevenue > 0) {
      const d = new Date();
      d.setMonth(d.getMonth() - 1);
      const lastMonthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const lastMonthData = autoRevenue[lastMonthKey];

      if (lastMonthData) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setBaseline({
          glovo: lastMonthData.glovo || 0,
          ubereats: lastMonthData.ubereats || 0,
          justeat: lastMonthData.justeat || 0,
        });
        setBaselineLoaded(true);
        return;
      }
    }

    // Option 2: fallback to most recent month with any data
    if (latestMonthWithData && !isLoadingRevenue) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBaseline({
        glovo: latestMonthWithData.revenue.glovo || 0,
        ubereats: latestMonthWithData.revenue.ubereats || 0,
        justeat: latestMonthWithData.revenue.justeat || 0,
      });
      setBaselineLoaded(true);
    }
  }, [autoRevenue, autoLastMonthRevenue, latestMonthWithData, isLoadingRevenue, baselineLoaded, lastMonthRevenue]);

  // Reset baselineLoaded when wizard closes/opens
  useEffect(() => {
    if (!isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBaselineLoaded(false);
    }
  }, [isOpen]);

  // Determine which month the baseline refers to (for labels)
  const baselineMonthInfo = useMemo(() => {
    // If last month has data, use last month
    if (autoLastMonthRevenue > 0) {
      return { label: getLastMonthLabel(), isPartial: false };
    }
    // Fallback to latestMonthWithData
    if (latestMonthWithData) {
      const [yearStr, monthStr] = latestMonthWithData.key.split('-');
      const monthIdx = parseInt(monthStr, 10) - 1;
      const label = `${MONTH_NAMES[monthIdx]} ${yearStr}`;
      // Check if it's the current month
      const now = new Date();
      const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      return { label, isPartial: latestMonthWithData.key === currentKey };
    }
    // No data at all — show last month label
    return { label: getLastMonthLabel(), isPartial: false };
  }, [autoLastMonthRevenue, latestMonthWithData]);

  const months = useMemo(() => getMonths(6), []);
  const steps: Step[] = useMemo(() =>
    hasAddresses
      ? ['channels', 'addresses', 'investment', 'baseline', 'targets']
      : ['channels', 'investment', 'baseline', 'targets'],
    [hasAddresses]
  );
  const idx = steps.indexOf(step);

  const toggleChannel = (ch: SalesChannel) => setChannels((prev) => prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch]);

  const toggleAddress = (id: string) => setSelectedAddressIds((prev) =>
    prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
  );

  const handleTargetChange = (month: string, ch: SalesChannel, value: number) => {
    setTargets((prev) => ({
      ...prev,
      [month]: { ...prev[month], glovo: prev[month]?.glovo || 0, ubereats: prev[month]?.ubereats || 0, justeat: prev[month]?.justeat || 0, [ch]: value },
    }));
  };

  const handleAddressTargetChange = (addressId: string, month: string, ch: SalesChannel, value: number) => {
    setAddressTargets((prev) => ({
      ...prev,
      [addressId]: {
        ...prev[addressId],
        [month]: {
          glovo: prev[addressId]?.[month]?.glovo || 0,
          ubereats: prev[addressId]?.[month]?.ubereats || 0,
          justeat: prev[addressId]?.[month]?.justeat || 0,
          [ch]: value,
        },
      },
    }));
  };

  const handleAddressBaselineChange = (addressId: string, ch: SalesChannel, value: number) => {
    setAddressBaselines((prev) => ({
      ...prev,
      [addressId]: {
        ...prev[addressId] || { glovo: 0, ubereats: 0, justeat: 0 },
        [ch]: value,
      },
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

    if (selectedAddresses.length > 0 && onCompleteBatch) {
      const batchData: AddressBatchEntry[] = selectedAddresses.map((addr) => ({
        addressId: addr.id,
        brandId: addr.brandId,
        targetRevenue: addressTargets[addr.id] || {},
        baselineRevenue: addressBaselines[addr.id] || { glovo: 0, ubereats: 0, justeat: 0 },
      }));
      onCompleteBatch(config, batchData);
    } else {
      onComplete(config, targets, baseline);
    }
  };

  const canProceed = () => {
    if (step === 'channels') return channels.length > 0;
    if (step === 'addresses') return selectedAddressIds.length > 0;
    if (step === 'targets') {
      if (selectedAddresses.length > 0) {
        return selectedAddresses.some((addr) => {
          const t = addressTargets[addr.id];
          if (!t) return false;
          return months.some((m) => channels.some((ch) => (t[m.key]?.[ch] || 0) > 0));
        });
      }
      const total = months.reduce((sum, m) => sum + channels.reduce((chSum, ch) => chSum + (targets[m.key]?.[ch] || 0), 0), 0);
      return total > 0;
    }
    return true;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className={cn('relative w-full mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden', selectedAddresses.length > 1 ? 'max-w-3xl' : 'max-w-2xl')}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Configurar proyección de ventas</h2>
              {scopeLabel ? (
                <p className="text-xs text-gray-500">{scopeLabel} · Paso {idx + 1} de {steps.length}</p>
              ) : (
                <p className="text-xs text-gray-500">Paso {idx + 1} de {steps.length}</p>
              )}
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
          {step === 'addresses' && addresses && (
            <AddressSelectionStep
              addresses={addresses}
              selectedIds={selectedAddressIds}
              onToggle={toggleAddress}
              onSelectAll={() => setSelectedAddressIds(addresses.map(a => a.id))}
              onDeselectAll={() => setSelectedAddressIds([])}
            />
          )}
          {step === 'investment' && (
            <InvestmentStep channels={channels} mode={mode} onModeChange={setMode} ads={ads} promos={promos} onAdsChange={setAds} onPromosChange={setPromos} />
          )}
          {step === 'baseline' && (
            selectedAddresses.length > 0 ? (
              <MultiAddressBaselineStep
                channels={channels}
                addresses={selectedAddresses}
                addressBaselines={addressBaselines}
                onChangeAddress={handleAddressBaselineChange}
                isEditing={editingBaseline}
                onToggleEdit={() => setEditingBaseline(!editingBaseline)}
                monthLabel={baselineMonthInfo.label}
              />
            ) : (
              <BaselineStep channels={channels} baseline={baseline} onChange={(ch, v) => setBaseline((p) => ({ ...p, [ch]: v }))} isEditing={editingBaseline} onToggleEdit={() => setEditingBaseline(!editingBaseline)} isLoadingRevenue={isLoadingRevenue} isError={isRevenueError} onRetry={handleRetryRevenue} monthLabel={baselineMonthInfo.label} isPartialMonth={baselineMonthInfo.isPartial} />
            )
          )}
          {step === 'targets' && (
            selectedAddresses.length > 0 ? (
              <MultiAddressTargetsStep
                channels={channels}
                addresses={selectedAddresses}
                addressTargets={addressTargets}
                addressBaselines={addressBaselines}
                onChangeAddress={handleAddressTargetChange}
                activeTab={activeAddressTab}
                onTabChange={setActiveAddressTab}
                actualRevenue={autoRevenue}
              />
            ) : (
              <TargetsStep channels={channels} targets={targets} onChange={handleTargetChange} baseline={baseline} actualRevenue={autoRevenue} />
            )
          )}
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
              {selectedAddresses.length > 1 ? `Crear ${selectedAddresses.length} proyecciones` : 'Crear proyección'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
