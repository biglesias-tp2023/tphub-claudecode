/**
 * useDetailPanelData Hook
 *
 * Consumes weeklyMetrics from useWeeklyRevenue and computes derived
 * metrics for the detail panel charts (ADS rate, ROAS, promo rate, etc.)
 *
 * @module features/controlling/hooks/useDetailPanelData
 */

import { useMemo } from 'react';
import type { WeekMetrics } from './useWeeklyRevenue';

/** Derived metrics for a single week, used by the detail panel charts */
export interface DetailWeekData {
  weekLabel: string;
  weekStart: string;
  // Chart 1: Revenue by channel
  ventasGlovo: number;
  ventasUbereats: number;
  // Chart 3: ADS rate + ROAS
  adsRate: number;     // ad_spent / ventas * 100
  roas: number;        // ad_revenue / ad_spent
  // Chart 4: Promos rate + organic revenue
  promosRate: number;  // descuentos / ventas * 100
  organicRevenue: number; // ventas - ad_revenue (approximation)
  // Chart 4: Promos return multiplier
  promosRetorno: number; // promoRevenue / descuentos (multiplier, like ROAS for promos)
  // Chart 5: Promo vs organic revenue
  promoRevenue: number;  // ad_revenue (revenue from promoted orders)
  // Raw values for tooltips
  ventas: number;
  pedidos: number;
  adSpent: number;
  adRevenue: number;
  descuentos: number;
  promotedOrders: number;
}

interface UseDetailPanelDataParams {
  rowId: string | null;
  weeklyMetrics: Map<string, WeekMetrics[]>;
}

export function useDetailPanelData({ rowId, weeklyMetrics }: UseDetailPanelDataParams) {
  const data = useMemo((): DetailWeekData[] | null => {
    if (!rowId) return null;
    const metrics = weeklyMetrics.get(rowId);
    if (!metrics || metrics.length === 0) return null;

    return metrics.map((m) => {
      const adsRate = m.ventas > 0 ? (m.adSpent / m.ventas) * 100 : 0;
      const roas = m.adSpent > 0 ? m.adRevenue / m.adSpent : 0;
      const promosRate = m.ventas > 0 ? (m.descuentos / m.ventas) * 100 : 0;
      const organicRevenue = Math.max(0, m.ventas - m.adRevenue);
      const promoRevenue = m.adRevenue;
      const promosRetorno = m.descuentos > 0 ? promoRevenue / m.descuentos : 0;

      return {
        weekLabel: m.weekLabel,
        weekStart: m.weekStart,
        ventasGlovo: m.ventasGlovo,
        ventasUbereats: m.ventasUbereats,
        adsRate,
        roas,
        promosRate,
        promosRetorno,
        organicRevenue,
        promoRevenue,
        ventas: m.ventas,
        pedidos: m.pedidos,
        adSpent: m.adSpent,
        adRevenue: m.adRevenue,
        descuentos: m.descuentos,
        promotedOrders: m.promotedOrders,
      };
    });
  }, [rowId, weeklyMetrics]);

  return { data };
}
