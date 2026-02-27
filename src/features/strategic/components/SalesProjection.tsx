/**
 * SalesProjection - Componente de proyeccion de ventas
 *
 * SOLID Principles:
 * - S: Componente principal orquesta subcomponentes especializados
 * - O: Extensible via props y composicion
 * - D: Depende de abstracciones (tipos) no implementaciones
 *
 * @module features/strategic/components/SalesProjection
 */
import { useState, useMemo, useCallback } from 'react';
import {
  TrendingUp, Eye, EyeOff, Megaphone, Percent,
  Calendar, Edit3, ChevronDown, Settings2,
} from 'lucide-react';
import { AreaChart } from '@/components/charts/rosen/AreaChart';
import type { AreaSeriesConfig, ReferenceLineConfig } from '@/components/charts/rosen/types';
import { cn } from '@/utils/cn';
import { ExportButtons, type ExportFormat } from '@/components/common';
import {
  exportSalesProjectionToPDF,
  exportSalesProjectionToExcel,
  exportSalesProjectionToCSV,
  type SalesProjectionExportData,
} from '@/utils/export';
import type {
  SalesChannel, GridChannelMonthData,
} from '@/types';

import type { SalesProjectionProps, TabType } from './salesProjectionTypes';
import {
  CHANNELS, getFixedMonthWindow, fmt, fmtK,
  calcInvestment, getPercent,
} from './salesProjectionTypes';
import { Scorecard, Row } from './SalesScorecard';
import { SalesTableRow } from './SalesTableRow';

// ============================================
// MAIN COMPONENT
// ============================================

export function SalesProjection({
  config, targetRevenue, actualRevenue = {}, actualAds = {}, actualPromos = {},
  onTargetChange, onEditConfig,
  restaurantName = 'Restaurante',
  realRevenueByMonth,
  realPromosByMonth,
  realAdsByMonth,
  commissions,
}: SalesProjectionProps) {
  const [showActual, setShowActual] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('revenue');
  const [showTable, setShowTable] = useState(false);

  const months = useMemo(() => getFixedMonthWindow(), []);
  const { activeChannels } = config;

  // Use CRP Portal data for actual revenue when available, fallback to localStorage
  const hasRealRevenue = !!realRevenueByMonth && Object.keys(realRevenueByMonth).length > 0;
  const effectiveActualRevenue = hasRealRevenue ? realRevenueByMonth! : actualRevenue;

  // Use CRP Portal data for actual promos when available, fallback to localStorage
  const hasRealPromos = !!realPromosByMonth && Object.keys(realPromosByMonth).length > 0;
  const effectiveActualPromos = hasRealPromos ? realPromosByMonth! : actualPromos;

  // Use CRP Portal data for actual ads when available, fallback to localStorage
  const hasRealAds = !!realAdsByMonth && Object.keys(realAdsByMonth).length > 0;
  const effectiveActualAds = hasRealAds ? realAdsByMonth! : actualAds;

  // Memoized calculations
  const calculations = useMemo(() => {
    const getMonthTotal = (data: GridChannelMonthData, key: string) =>
      activeChannels.reduce((sum, ch) => sum + (data[key]?.[ch] || 0), 0);

    const getChannelTotal = (data: GridChannelMonthData, ch: SalesChannel) =>
      months.reduce((sum, m) => sum + (data[m.key]?.[ch] || 0), 0);

    const grandTarget = months.reduce((sum, m) => sum + getMonthTotal(targetRevenue, m.key), 0);
    const grandActual = months.reduce((sum, m) => sum + getMonthTotal(effectiveActualRevenue, m.key), 0);

    const calcTargetAds = (key: string, ch: SalesChannel) =>
      calcInvestment(targetRevenue[key]?.[ch] || 0, getPercent(config.maxAdsPercent, ch));
    const calcTargetPromos = (key: string, ch: SalesChannel) =>
      calcInvestment(targetRevenue[key]?.[ch] || 0, getPercent(config.maxPromosPercent, ch));

    const totalTargetAds = months.reduce((sum, m) =>
      sum + activeChannels.reduce((chSum, ch) => chSum + calcTargetAds(m.key, ch), 0), 0);
    const totalTargetPromos = months.reduce((sum, m) =>
      sum + activeChannels.reduce((chSum, ch) => chSum + calcTargetPromos(m.key, ch), 0), 0);
    const totalActualAds = months.reduce((sum, m) => sum + getMonthTotal(effectiveActualAds, m.key), 0);
    const totalActualPromos = months.reduce((sum, m) => sum + getMonthTotal(effectiveActualPromos, m.key), 0);

    // Current month only (for scorecards)
    const currentKey = months.find((m) => m.isCurrent)?.key || '';
    const currentTarget = getMonthTotal(targetRevenue, currentKey);
    const currentActual = getMonthTotal(effectiveActualRevenue, currentKey);
    const currentTargetAds = activeChannels.reduce((sum, ch) => sum + calcTargetAds(currentKey, ch), 0);
    const currentActualAds = getMonthTotal(effectiveActualAds, currentKey);
    const currentTargetPromos = activeChannels.reduce((sum, ch) => sum + calcTargetPromos(currentKey, ch), 0);
    const currentActualPromos = getMonthTotal(effectiveActualPromos, currentKey);

    // Rentabilidad: 100% - ADS% - Promos% - weighted commission%
    const currentAdsPercent = currentActual > 0 ? (currentActualAds / currentActual) * 100 : 0;
    const currentPromosPercent = currentActual > 0 ? (currentActualPromos / currentActual) * 100 : 0;

    const defaultFee = 30;
    const weightedCommission = (() => {
      if (!commissions || currentActual <= 0) return defaultFee;
      const glovoRev = effectiveActualRevenue[currentKey]?.glovo || 0;
      const uberRev = effectiveActualRevenue[currentKey]?.ubereats || 0;
      const justeatRev = effectiveActualRevenue[currentKey]?.justeat || 0;
      const totalRev = glovoRev + uberRev + justeatRev;
      if (totalRev <= 0) return defaultFee;
      return (glovoRev * commissions.glovo + uberRev * commissions.ubereats + justeatRev * commissions.justeat) / totalRev;
    })();

    const currentRentabilidad = currentActual > 0
      ? 100 - currentAdsPercent - currentPromosPercent - weightedCommission
      : null;

    return {
      getMonthTotal, getChannelTotal, grandTarget, grandActual,
      calcTargetAds, calcTargetPromos, totalTargetAds, totalTargetPromos, totalActualAds, totalActualPromos,
      currentTarget, currentActual, currentTargetAds, currentActualAds, currentTargetPromos, currentActualPromos,
      currentAdsPercent, currentPromosPercent, weightedCommission, currentRentabilidad,
    };
  }, [months, activeChannels, targetRevenue, effectiveActualRevenue, effectiveActualAds, effectiveActualPromos, config, commissions]);

  // Chart data
  const chartData = useMemo(() => months.map((m) => ({
    month: m.label,
    targetRevenue: calculations.getMonthTotal(targetRevenue, m.key),
    actualRevenue: calculations.getMonthTotal(effectiveActualRevenue, m.key),
    targetAds: activeChannels.reduce((sum, ch) => sum + calculations.calcTargetAds(m.key, ch), 0),
    actualAds: calculations.getMonthTotal(effectiveActualAds, m.key),
    targetPromos: activeChannels.reduce((sum, ch) => sum + calculations.calcTargetPromos(m.key, ch), 0),
    actualPromos: calculations.getMonthTotal(effectiveActualPromos, m.key),
    isCurrent: m.isCurrent,
  })), [months, targetRevenue, effectiveActualRevenue, effectiveActualAds, effectiveActualPromos, activeChannels, calculations]);

  const currentMonthIndex = useMemo(() => months.findIndex((m) => m.isCurrent), [months]);
  /* eslint-disable react-hooks/purity */
  const daysRemaining = useMemo(() => {
    const diff = new Date(config.endDate).getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }, [config.endDate]);
  /* eslint-enable react-hooks/purity */

  // Update handlers
  const updateData = useCallback((
    current: GridChannelMonthData,
    setter: ((data: GridChannelMonthData) => void) | undefined,
    month: string, ch: SalesChannel, val: string
  ) => {
    if (!setter) return;
    const newData = { ...current };
    if (!newData[month]) newData[month] = { glovo: 0, ubereats: 0, justeat: 0 };
    newData[month] = { ...newData[month], [ch]: parseFloat(val) || 0 };
    setter(newData);
  }, []);

  const updateTarget = (m: string, ch: SalesChannel, v: string) => updateData(targetRevenue, onTargetChange, m, ch, v);
  // Actual data is read-only (comes from CRP Portal), no setter needed
  const updateActualRevenue = (_m: string, _ch: SalesChannel, _v: string) => {};
  const updateActualAds = (_m: string, _ch: SalesChannel, _v: string) => {};
  const updateActualPromos = (_m: string, _ch: SalesChannel, _v: string) => {};

  // Export handler
  const handleExport = useCallback((format: ExportFormat) => {
    const targetAdsData: GridChannelMonthData = {};
    const targetPromosData: GridChannelMonthData = {};

    months.forEach((m) => {
      targetAdsData[m.key] = { glovo: 0, ubereats: 0, justeat: 0 };
      targetPromosData[m.key] = { glovo: 0, ubereats: 0, justeat: 0 };
      activeChannels.forEach((ch) => {
        targetAdsData[m.key][ch] = calculations.calcTargetAds(m.key, ch);
        targetPromosData[m.key][ch] = calculations.calcTargetPromos(m.key, ch);
      });
    });

    const exportData: SalesProjectionExportData = {
      title: restaurantName,
      dateRange: `${config.startDate} - ${config.endDate}`,
      channels: activeChannels,
      months: months.map((m) => ({ key: m.key, label: m.label })),
      targetRevenue: targetRevenue as unknown as Record<string, Record<string, number>>,
      actualRevenue: actualRevenue as unknown as Record<string, Record<string, number>>,
      targetAds: targetAdsData as unknown as Record<string, Record<string, number>>,
      actualAds: actualAds as unknown as Record<string, Record<string, number>>,
      targetPromos: targetPromosData as unknown as Record<string, Record<string, number>>,
      actualPromos: effectiveActualPromos as unknown as Record<string, Record<string, number>>,
    };

    switch (format) {
      case 'pdf':
        exportSalesProjectionToPDF(exportData);
        break;
      case 'excel':
        exportSalesProjectionToExcel(exportData);
        break;
      case 'csv':
        exportSalesProjectionToCSV(exportData);
        break;
    }
  }, [months, activeChannels, calculations, config, restaurantName, targetRevenue, actualRevenue, actualAds, effectiveActualPromos]);

  // Memoized chart series config
  const chartSeries = useMemo<AreaSeriesConfig[]>(() => [
    { dataKey: 'targetRevenue', name: 'Objetivo', color: '#095789', gradientOpacity: [0.15, 0], strokeWidth: 2 },
    ...(showActual ? [{ dataKey: 'actualRevenue', name: 'Real', color: '#10B981', gradientOpacity: [0.15, 0] as [number, number], strokeWidth: 2 }] : []),
  ], [showActual]);

  // Memoized reference lines config
  const chartReferenceLines = useMemo<ReferenceLineConfig[]>(() =>
    currentMonthIndex >= 0 ? [{
      x: months[currentMonthIndex].label,
      stroke: '#6366F1',
      strokeDasharray: '4 4',
      label: 'Hoy',
      labelColor: '#6366F1',
    }] : [],
  [currentMonthIndex, months]);

  // Memoized tooltip renderer
  const renderChartTooltip = useCallback((dataPoint: Record<string, unknown>, xLabel: string) => {
    const d = dataPoint as Record<string, number>;
    return (
      <div className="bg-white/95 backdrop-blur-sm px-4 py-3 shadow-lg rounded-xl border border-gray-100 text-xs">
        <p className="font-semibold text-gray-900 mb-2">{xLabel}</p>
        <div className="space-y-1.5">
          <Row label="Objetivo de Ventas" value={d.targetRevenue} color="text-primary-600" />
          {d.actualRevenue > 0 && <Row label="Venta Actual" value={d.actualRevenue} color="text-emerald-600" />}
          <div className="border-t border-gray-100 pt-1.5 mt-1.5">
            <Row label="Presupuesto ADS" value={d.targetAds} color="text-amber-600" />
            {d.actualAds > 0 && <Row label="Inv. Actual ADS" value={d.actualAds} color="text-amber-500" />}
          </div>
          <div className="border-t border-gray-100 pt-1.5 mt-1.5">
            <Row label="Presupuesto Promo" value={d.targetPromos} color="text-purple-600" />
            {d.actualPromos > 0 && <Row label="Inv. Actual Promo" value={d.actualPromos} color="text-purple-500" />}
          </div>
        </div>
      </div>
    );
  }, []);

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-primary-600 text-white">
            <TrendingUp className="w-3.5 h-3.5" />
            <span className="text-xs font-medium">Proyección de ventas</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Calendar className="w-3 h-3" />
            <span>{config.startDate} → {config.endDate}</span>
            {daysRemaining <= 60 && daysRemaining > 0 && (
              <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded font-medium">{daysRemaining}d restantes</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 px-2 py-1 bg-gray-50 rounded-lg">
            {activeChannels.map((ch) => {
              const channel = CHANNELS.find((c) => c.id === ch);
              return channel ? (
                <img key={ch} src={channel.logo} alt={channel.name} className="w-4 h-4 rounded-full object-cover" />
              ) : null;
            })}
          </div>
          <ExportButtons onExport={handleExport} size="sm" />
          <button
            onClick={() => setShowActual(!showActual)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
              showActual ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
            )}
          >
            {showActual ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            {showActual ? 'Real visible' : 'Ver real'}
          </button>
          {onEditConfig && (
            <button onClick={onEditConfig} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
              <Edit3 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Scorecards - Use real data when available, fallback to manual entry */}
      <div className="grid grid-cols-4 gap-4 px-5 py-4 bg-gray-50 border-b border-gray-100">
        <Scorecard
          label="Ventas"
          value={calculations.currentTarget}
          actual={calculations.currentActual}
          color="text-primary-600"
          showActual={showActual}
          isRealData={hasRealRevenue}
          isInvestment={false}
        />
        <Scorecard
          label="Presupuesto ADS"
          value={calculations.currentTargetAds}
          actual={calculations.currentActualAds}
          color="text-amber-600"
          showActual={showActual}
          isRealData={hasRealAds}
          isInvestment
        />
        <Scorecard
          label="Presupuesto Promo"
          value={calculations.currentTargetPromos}
          actual={calculations.currentActualPromos}
          color="text-purple-600"
          showActual={showActual}
          isRealData={hasRealPromos}
          isInvestment
        />
        {showActual && calculations.currentRentabilidad !== null && (
          <div>
            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Rentabilidad</p>
            <p className={cn(
              'text-xl font-bold tabular-nums',
              calculations.currentRentabilidad >= 0 ? 'text-emerald-600' : 'text-red-500'
            )}>
              {calculations.currentRentabilidad.toFixed(1)}%
            </p>
            <p className="text-[10px] text-gray-400 mt-0.5">
              ADS {calculations.currentAdsPercent.toFixed(1)}% · Promos {calculations.currentPromosPercent.toFixed(1)}% · Fee {calculations.weightedCommission.toFixed(0)}%
            </p>
          </div>
        )}
      </div>

      {/* Chart */}
      <div className="px-5 py-4 border-b border-gray-100">
        <div className="h-48">
          <AreaChart
            data={chartData}
            xKey="month"
            series={chartSeries}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            gridVertical={false}
            tickFontSize={10}
            tickColor="#9CA3AF"
            yTickFormatter={fmtK}
            referenceLines={chartReferenceLines}
            renderTooltip={renderChartTooltip}
          />
        </div>
        <div className="flex items-center justify-center gap-6 mt-3 text-[10px]">
          <div className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-primary-500 rounded" /><span className="text-gray-500">Objetivo ventas</span></div>
          {showActual && <div className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-emerald-500 rounded" /><span className="text-gray-500">Real acumulado</span></div>}
          <div className="flex items-center gap-1.5"><span className="w-3 h-3 border-2 border-dashed border-indigo-400 rounded" /><span className="text-gray-500">Fecha actual</span></div>
        </div>
      </div>

      {/* Collapsible Table */}
      <div className="border-t border-gray-100">
        <button
          onClick={() => setShowTable(!showTable)}
          className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-medium text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <Settings2 className="w-3.5 h-3.5" />
          <span>Ajustar objetivos</span>
          <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', showTable && 'rotate-180')} />
        </button>

        {showTable && (
          <>
            <div className="flex items-center gap-1 px-5 py-2 border-t border-gray-100 bg-gray-50">
              {[
                { id: 'revenue', label: 'Facturación', icon: TrendingUp },
                { id: 'ads', label: 'ADS', icon: Megaphone },
                { id: 'promos', label: 'Promos', icon: Percent },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                    activeTab === tab.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  )}
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="px-5 py-4 overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="text-left text-[10px] text-gray-400 font-medium py-2 w-24">Canal</th>
                    {months.map((m) => (
                      <th key={m.key} className={cn('text-center text-[10px] font-medium py-2 min-w-[60px]', m.isCurrent ? 'text-primary-600 bg-primary-50 rounded-t-lg' : 'text-gray-400')}>
                        {m.label}
                        {m.isCurrent && <span className="block text-[8px] text-primary-500">HOY</span>}
                      </th>
                    ))}
                    <th className="text-right text-[10px] text-gray-400 font-medium py-2 w-20">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {activeTab === 'revenue' && (
                    <>
                      {activeChannels.map((ch) => {
                        const channel = CHANNELS.find((c) => c.id === ch);
                        return (
                          <SalesTableRow
                            key={`target-${ch}`}
                            label={channel?.name || ch}
                            logoUrl={channel?.logo || '/images/platforms/glovo.png'}
                            months={months}
                            values={targetRevenue}
                            channel={ch}
                            onChange={(m, v) => updateTarget(m, ch, v)}
                            total={calculations.getChannelTotal(targetRevenue, ch)}
                            variant="target"
                          />
                        );
                      })}
                      {showActual && activeChannels.map((ch) => {
                        const channel = CHANNELS.find((c) => c.id === ch);
                        return (
                          <SalesTableRow
                            key={`actual-${ch}`}
                            label={channel?.name || ch}
                            logoUrl={channel?.logo || '/images/platforms/glovo.png'}
                            months={months}
                            values={effectiveActualRevenue}
                            channel={ch}
                            onChange={hasRealRevenue ? undefined : (m, v) => updateActualRevenue(m, ch, v)}
                            total={calculations.getChannelTotal(effectiveActualRevenue, ch)}
                            variant="actual"
                            readOnly={hasRealRevenue}
                          />
                        );
                      })}
                      <tr className="border-t-2 border-gray-200">
                        <td className="py-2 text-xs font-bold text-gray-900">Total</td>
                        {months.map((m) => (
                          <td key={m.key} className={cn('py-2 text-center', m.isCurrent && 'bg-primary-50')}>
                            <span className="text-xs font-bold text-primary-600 tabular-nums">{fmt(calculations.getMonthTotal(targetRevenue, m.key))}€</span>
                            {showActual && calculations.grandActual > 0 && (
                              <span className="block text-[10px] font-medium text-emerald-600 tabular-nums">{fmt(calculations.getMonthTotal(effectiveActualRevenue, m.key))}€</span>
                            )}
                          </td>
                        ))}
                        <td className="py-2 text-right">
                          <span className="text-sm font-bold text-primary-700 tabular-nums">{fmt(calculations.grandTarget)}€</span>
                          {showActual && calculations.grandActual > 0 && (
                            <span className="block text-xs font-semibold text-emerald-600 tabular-nums">{fmt(calculations.grandActual)}€</span>
                          )}
                        </td>
                      </tr>
                    </>
                  )}

                  {activeTab === 'ads' && (
                    <>
                      {activeChannels.map((ch) => {
                        const channel = CHANNELS.find((c) => c.id === ch);
                        const targetData: GridChannelMonthData = {};
                        months.forEach((m) => {
                          if (!targetData[m.key]) targetData[m.key] = { glovo: 0, ubereats: 0, justeat: 0 };
                          targetData[m.key][ch] = calculations.calcTargetAds(m.key, ch);
                        });
                        const total = months.reduce((sum, m) => sum + calculations.calcTargetAds(m.key, ch), 0);
                        return (
                          <SalesTableRow
                            key={`ads-${ch}`}
                            label={`${channel?.name} (${getPercent(config.maxAdsPercent, ch)}%)`}
                            logoUrl={channel?.logo || '/images/platforms/glovo.png'}
                            months={months}
                            values={targetData}
                            channel={ch}
                            total={total}
                            variant="target"
                            readOnly
                          />
                        );
                      })}
                      {showActual && activeChannels.map((ch) => {
                        const channel = CHANNELS.find((c) => c.id === ch);
                        return (
                          <SalesTableRow
                            key={`ads-actual-${ch}`}
                            label={channel?.name || ch}
                            logoUrl={channel?.logo || '/images/platforms/glovo.png'}
                            months={months}
                            values={effectiveActualAds}
                            channel={ch}
                            onChange={hasRealAds ? undefined : (m, v) => updateActualAds(m, ch, v)}
                            total={calculations.getChannelTotal(effectiveActualAds, ch)}
                            variant="actual"
                            readOnly={hasRealAds}
                          />
                        );
                      })}
                      <tr className="border-t-2 border-gray-200">
                        <td className="py-2 text-xs font-bold text-gray-900">Total</td>
                        {months.map((m) => {
                          const monthTargetAds = activeChannels.reduce((sum, ch) => sum + calculations.calcTargetAds(m.key, ch), 0);
                          return (
                            <td key={m.key} className={cn('py-2 text-center', m.isCurrent && 'bg-primary-50')}>
                              <span className="text-xs font-bold text-amber-600 tabular-nums">{fmt(monthTargetAds)}€</span>
                              {showActual && calculations.totalActualAds > 0 && (
                                <span className="block text-[10px] font-medium text-amber-500 tabular-nums">{fmt(calculations.getMonthTotal(effectiveActualAds, m.key))}€</span>
                              )}
                            </td>
                          );
                        })}
                        <td className="py-2 text-right">
                          <span className="text-sm font-bold text-amber-700 tabular-nums">{fmt(calculations.totalTargetAds)}€</span>
                          {showActual && calculations.totalActualAds > 0 && (
                            <span className="block text-xs font-semibold text-amber-500 tabular-nums">{fmt(calculations.totalActualAds)}€</span>
                          )}
                        </td>
                      </tr>
                    </>
                  )}

                  {activeTab === 'promos' && (
                    <>
                      {activeChannels.map((ch) => {
                        const channel = CHANNELS.find((c) => c.id === ch);
                        const targetData: GridChannelMonthData = {};
                        months.forEach((m) => {
                          if (!targetData[m.key]) targetData[m.key] = { glovo: 0, ubereats: 0, justeat: 0 };
                          targetData[m.key][ch] = calculations.calcTargetPromos(m.key, ch);
                        });
                        const total = months.reduce((sum, m) => sum + calculations.calcTargetPromos(m.key, ch), 0);
                        return (
                          <SalesTableRow
                            key={`promos-${ch}`}
                            label={`${channel?.name} (${getPercent(config.maxPromosPercent, ch)}%)`}
                            logoUrl={channel?.logo || '/images/platforms/glovo.png'}
                            months={months}
                            values={targetData}
                            channel={ch}
                            total={total}
                            variant="target"
                            readOnly
                          />
                        );
                      })}
                      {showActual && activeChannels.map((ch) => {
                        const channel = CHANNELS.find((c) => c.id === ch);
                        return (
                          <SalesTableRow
                            key={`promos-actual-${ch}`}
                            label={channel?.name || ch}
                            logoUrl={channel?.logo || '/images/platforms/glovo.png'}
                            months={months}
                            values={effectiveActualPromos}
                            channel={ch}
                            onChange={hasRealPromos ? undefined : (m, v) => updateActualPromos(m, ch, v)}
                            total={calculations.getChannelTotal(effectiveActualPromos, ch)}
                            variant="actual"
                            readOnly={hasRealPromos}
                          />
                        );
                      })}
                      <tr className="border-t-2 border-gray-200">
                        <td className="py-2 text-xs font-bold text-gray-900">Total</td>
                        {months.map((m) => {
                          const monthTargetPromos = activeChannels.reduce((sum, ch) => sum + calculations.calcTargetPromos(m.key, ch), 0);
                          return (
                            <td key={m.key} className={cn('py-2 text-center', m.isCurrent && 'bg-primary-50')}>
                              <span className="text-xs font-bold text-purple-600 tabular-nums">{fmt(monthTargetPromos)}€</span>
                              {showActual && calculations.totalActualPromos > 0 && (
                                <span className="block text-[10px] font-medium text-purple-500 tabular-nums">{fmt(calculations.getMonthTotal(effectiveActualPromos, m.key))}€</span>
                              )}
                            </td>
                          );
                        })}
                        <td className="py-2 text-right">
                          <span className="text-sm font-bold text-purple-700 tabular-nums">{fmt(calculations.totalTargetPromos)}€</span>
                          {showActual && calculations.totalActualPromos > 0 && (
                            <span className="block text-xs font-semibold text-purple-500 tabular-nums">{fmt(calculations.totalActualPromos)}€</span>
                          )}
                        </td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
