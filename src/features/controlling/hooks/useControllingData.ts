import { useMemo } from 'react';
import { useDashboardFiltersStore, useGlobalFiltersStore } from '@/stores/filtersStore';
import type { ChannelId } from '@/types';
import { useOrdersData } from './useOrdersData';
import { useHierarchyData } from './useHierarchyData';
import { useBrands } from '@/features/dashboard/hooks/useBrands';
import { useRestaurants } from '@/features/dashboard/hooks/useRestaurants';
import { expandBrandIds, expandRestaurantIds } from './idExpansion';
import type { HierarchyDataRow } from '@/services/crp-portal';

// ============================================
// TYPES
// ============================================

export interface PortfolioMetrics {
  ventas: number;
  ventasChange: number;
  pedidos: number;
  pedidosChange: number;
  ticketMedio: number;
  ticketMedioChange: number;
  openTime: number;
  openTimeChange: number;
  inversionAds: number;
  inversionAdsChange: number;
  adsPercentage: number;
  inversionPromos: number;
  inversionPromosChange: number;
  promosPercentage: number;
  reembolsos: number;
  reembolsosChange: number;
  reembolsosPercentage: number;
  netRevenue: number;
  netRevenueChange: number;
  uniqueCustomers: number;
  uniqueCustomersChange: number;
  ordersPerCustomer: number;
  ordersPerCustomerChange: number;
  avgDiscountPerOrder: number;
}

export interface ChannelMetrics {
  channel: ChannelId;
  name: string;
  color: string;
  logo: string;
  revenue: number;
  revenueChange: number;
  percentage: number;
  pedidos: number;
  pedidosPercentage: number;
  ticketMedio: number;
  openTime: number;
  ads: number;
  adsPercentage: number;
  promos: number;
  promosPercentage: number;
  reembolsos: number;
  reembolsosPercentage: number;
  netRevenue: number;
  uniqueCustomers: number;
}

export interface HierarchyRow {
  id: string;
  level: 'company' | 'brand' | 'address' | 'channel';
  name: string;
  subtitle?: string;
  parentId?: string;
  channelId?: ChannelId;
  companyId?: string;
  brandId?: string;

  // Rendimiento (from real data)
  ventas: number;
  ventasChange: number;
  pedidos: number;
  ticketMedio: number;
  nuevosClientes: number;
  porcentajeNuevos: number;
  recurrentesClientes: number;
  porcentajeRecurrentes: number;

  // Operaciones (phase 2 - optional)
  openTime?: number;
  ratioConversion?: number;
  tiempoEspera?: string;
  valoraciones?: number;

  // Publicidad (phase 2 - optional)
  inversionAds?: number;
  adsPercentage?: number;
  roas?: number;

  // Promociones (phase 2 - optional)
  inversionPromos?: number;
  promosPercentage?: number;
  promosRoas?: number;

  // Reembolsos (phase 2 - optional)
  reembolsos?: number;
  reembolsosPercentage?: number;
}

export interface ControllingData {
  portfolio: PortfolioMetrics;
  channels: ChannelMetrics[];
  hierarchy: HierarchyRow[];
}

// ============================================
// TRANSFORM FUNCTIONS
// ============================================

/**
 * Transform HierarchyDataRow from service to HierarchyRow for the component
 */
function transformHierarchyDataRow(row: HierarchyDataRow): HierarchyRow {
  const recurrentesClientes = row.metrics.pedidos - row.metrics.nuevosClientes;
  const porcentajeRecurrentes = row.metrics.pedidos > 0
    ? (recurrentesClientes / row.metrics.pedidos) * 100
    : 0;

  return {
    id: row.id,
    level: row.level,
    name: row.name,
    parentId: row.parentId,
    channelId: row.channelId,
    companyId: row.companyId,
    brandId: row.brandId,
    // Core metrics from real data
    ventas: row.metrics.ventas,
    ventasChange: row.metrics.ventasChange,
    pedidos: row.metrics.pedidos,
    ticketMedio: row.metrics.ticketMedio,
    nuevosClientes: row.metrics.nuevosClientes,
    porcentajeNuevos: row.metrics.porcentajeNuevos,
    recurrentesClientes,
    porcentajeRecurrentes,
    // Phase 2 metrics (not yet available - will be undefined)
  };
}

/**
 * Create default portfolio metrics (when no data)
 */
function createDefaultPortfolio(): PortfolioMetrics {
  return {
    ventas: 0,
    ventasChange: 0,
    pedidos: 0,
    pedidosChange: 0,
    ticketMedio: 0,
    ticketMedioChange: 0,
    openTime: 0,
    openTimeChange: 0,
    inversionAds: 0,
    inversionAdsChange: 0,
    adsPercentage: 0,
    inversionPromos: 0,
    inversionPromosChange: 0,
    promosPercentage: 0,
    reembolsos: 0,
    reembolsosChange: 0,
    reembolsosPercentage: 0,
    netRevenue: 0,
    netRevenueChange: 0,
    uniqueCustomers: 0,
    uniqueCustomersChange: 0,
    ordersPerCustomer: 0,
    ordersPerCustomerChange: 0,
    avgDiscountPerOrder: 0,
  };
}

/**
 * Create default channel metrics
 */
function createDefaultChannels(): ChannelMetrics[] {
  const config = [
    { id: 'glovo' as ChannelId, name: 'Glovo', color: '#FFC244', logo: '' },
    { id: 'ubereats' as ChannelId, name: 'Uber Eats', color: '#06C167', logo: '' },
    { id: 'justeat' as ChannelId, name: 'Just Eat', color: '#FF8000', logo: '' },
  ];

  return config.map((cfg) => ({
    channel: cfg.id,
    name: cfg.name,
    color: cfg.color,
    logo: cfg.logo,
    revenue: 0,
    revenueChange: 0,
    percentage: 0,
    pedidos: 0,
    pedidosPercentage: 0,
    ticketMedio: 0,
    openTime: 0,
    ads: 0,
    adsPercentage: 0,
    promos: 0,
    promosPercentage: 0,
    reembolsos: 0,
    reembolsosPercentage: 0,
    netRevenue: 0,
    uniqueCustomers: 0,
  }));
}

// ============================================
// HOOK
// ============================================

/**
 * Fetches controlling data including portfolio metrics, channel stats, and hierarchy.
 * Automatically filters data based on selected companies in global filters.
 *
 * REAL DATA INTEGRATION:
 * - Portfolio and Channel metrics come from useOrdersData (crp_portal__ft_order_head)
 * - Hierarchy data comes from useHierarchyData (aggregated by company/brand/address/channel)
 */
export function useControllingData() {
  const { companyIds } = useGlobalFiltersStore();
  const { datePreset, dateRange, brandIds, channelIds, restaurantIds } = useDashboardFiltersStore();

  // Fetch brands and restaurants for ID expansion (multi-portal grouping)
  const { data: brands = [] } = useBrands();
  const { data: restaurants = [] } = useRestaurants();

  // Expand selected IDs for multi-portal support
  const expandedBrandIds = useMemo(
    () => expandBrandIds(brandIds, brands),
    [brandIds, brands]
  );
  const expandedRestaurantIds = useMemo(
    () => expandRestaurantIds(restaurantIds, restaurants),
    [restaurantIds, restaurants]
  );

  // Fetch REAL hierarchy data (4 levels: Company → Brand → Address → Channel)
  const hierarchyQuery = useHierarchyData();

  // Fetch REAL order data for portfolio and channel metrics
  const ordersQuery = useOrdersData({
    companyIds,
    brandIds: expandedBrandIds.length > 0 ? expandedBrandIds : undefined,
    addressIds: expandedRestaurantIds.length > 0 ? expandedRestaurantIds : undefined,
    channelIds: channelIds.length > 0 ? channelIds : undefined,
    dateRange,
    datePreset,
  });

  // Compute final data
  const data = useMemo<ControllingData | undefined>(() => {
    // Need at least companies selected to show data
    if (companyIds.length === 0) {
      return {
        portfolio: createDefaultPortfolio(),
        channels: createDefaultChannels(),
        hierarchy: [],
      };
    }

    // Transform hierarchy data
    const hierarchyRows: HierarchyRow[] = (hierarchyQuery.data || []).map(transformHierarchyDataRow);

    // Build portfolio from orders data
    let portfolio = createDefaultPortfolio();
    let channels = createDefaultChannels();

    if (ordersQuery.data) {
      const { current, previous, changes } = ordersQuery.data;

      portfolio = {
        ventas: current.totalRevenue,
        ventasChange: changes.revenueChange,
        pedidos: current.totalOrders,
        pedidosChange: changes.ordersChange,
        ticketMedio: current.avgTicket,
        ticketMedioChange: changes.avgTicketChange,
        // Open time not yet available from CRP Portal
        openTime: 80, // Default
        openTimeChange: 0,
        // Ads not yet available from CRP Portal
        inversionAds: 0,
        inversionAdsChange: 0,
        adsPercentage: 0,
        // Promos/discounts from real data
        inversionPromos: current.totalDiscounts,
        inversionPromosChange: changes.discountsChange,
        promosPercentage: current.promotionRate,
        // Refunds from real data
        reembolsos: current.totalRefunds,
        reembolsosChange: changes.refundsChange,
        reembolsosPercentage: current.refundRate,
        // Net revenue from real data
        netRevenue: current.netRevenue,
        netRevenueChange: changes.netRevenueChange,
        // Customers from real data
        uniqueCustomers: current.uniqueCustomers,
        uniqueCustomersChange: changes.uniqueCustomersChange,
        ordersPerCustomer: current.ordersPerCustomer,
        ordersPerCustomerChange: changes.ordersPerCustomerChange,
        avgDiscountPerOrder: current.avgDiscountPerOrder,
      };

      // Build channels from real data
      const totalChannelRevenue = current.byChannel.glovo.revenue +
        current.byChannel.ubereats.revenue +
        current.byChannel.justeat.revenue;
      const totalChannelOrders = current.byChannel.glovo.orders +
        current.byChannel.ubereats.orders +
        current.byChannel.justeat.orders;

      const channelConfig = [
        { id: 'glovo' as ChannelId, name: 'Glovo', color: '#FFC244', logo: '' },
        { id: 'ubereats' as ChannelId, name: 'Uber Eats', color: '#06C167', logo: '' },
        { id: 'justeat' as ChannelId, name: 'Just Eat', color: '#FF8000', logo: '' },
      ];

      channels = channelConfig.map((cfg) => {
        const channelData = current.byChannel[cfg.id];
        const prevChannelData = previous.byChannel[cfg.id];

        // Calculate per-channel revenue change
        const channelRevenueChange = prevChannelData.revenue > 0
          ? ((channelData.revenue - prevChannelData.revenue) / prevChannelData.revenue) * 100
          : 0;

        return {
          channel: cfg.id,
          name: cfg.name,
          color: cfg.color,
          logo: cfg.logo,
          revenue: channelData.revenue,
          revenueChange: channelRevenueChange,
          percentage: totalChannelRevenue > 0 ? (channelData.revenue / totalChannelRevenue) * 100 : 0,
          pedidos: channelData.orders,
          pedidosPercentage: totalChannelOrders > 0 ? (channelData.orders / totalChannelOrders) * 100 : 0,
          ticketMedio: channelData.orders > 0 ? channelData.revenue / channelData.orders : 0,
          openTime: 80, // Default
          ads: 0, // Not yet available
          adsPercentage: 0,
          promos: channelData.discounts,
          promosPercentage: channelData.revenue > 0 ? (channelData.discounts / channelData.revenue) * 100 : 0,
          reembolsos: channelData.refunds,
          reembolsosPercentage: channelData.revenue > 0 ? (channelData.refunds / channelData.revenue) * 100 : 0,
          netRevenue: channelData.netRevenue,
          uniqueCustomers: channelData.uniqueCustomers,
        };
      });

      // Filter channels if specific channels are selected
      if (channelIds.length > 0) {
        channels = channels.filter((ch) => channelIds.includes(ch.channel));

        // Recalculate percentages
        const filteredTotalRevenue = channels.reduce((sum, ch) => sum + ch.revenue, 0);
        const filteredTotalPedidos = channels.reduce((sum, ch) => sum + ch.pedidos, 0);

        channels = channels.map((ch) => ({
          ...ch,
          percentage: filteredTotalRevenue > 0 ? (ch.revenue / filteredTotalRevenue) * 100 : 0,
          pedidosPercentage: filteredTotalPedidos > 0 ? (ch.pedidos / filteredTotalPedidos) * 100 : 0,
        }));
      }
    }

    return {
      portfolio,
      channels,
      hierarchy: hierarchyRows,
    };
  }, [hierarchyQuery.data, ordersQuery.data, companyIds, channelIds]);

  return {
    data,
    isLoading: hierarchyQuery.isLoading || ordersQuery.isLoading,
    error: hierarchyQuery.error || ordersQuery.error,
  };
}
