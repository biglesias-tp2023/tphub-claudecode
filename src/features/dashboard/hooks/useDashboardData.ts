import { useQuery } from '@tanstack/react-query';
import { QUERY_GC_SHORT } from '@/constants/queryConfig';
import { subDays, format } from 'date-fns';
import { useDashboardFiltersStore, useGlobalFiltersStore } from '@/stores/filtersStore';
import type { ChannelId } from '@/types';

// ============================================
// TYPES
// ============================================

export interface DailyRevenue {
  date: string;
  revenue: number;
  orders: number;
  glovo: number;
  ubereats: number;
  justeat: number;
}

export interface ChannelStats {
  channel: ChannelId;
  name: string;
  revenue: number;
  orders: number;
  percentage: number;
  color: string;
}

export interface RecentOrder {
  id: string;
  externalId: string;
  channel: ChannelId;
  restaurant: string;
  total: number;
  status: 'delivered' | 'cancelled' | 'pending';
  createdAt: Date;
}

export interface DashboardMetrics {
  totalRevenue: number;
  totalOrders: number;
  averageTicket: number;
  newCustomers: number;
  revenueChange: number;
  ordersChange: number;
  ticketChange: number;
  customersChange: number;
}

export interface DashboardData {
  metrics: DashboardMetrics;
  dailyRevenue: DailyRevenue[];
  channelStats: ChannelStats[];
  recentOrders: RecentOrder[];
}

// ============================================
// DEMO DATA GENERATOR
// ============================================

const CHANNEL_CONFIG: Record<ChannelId, { name: string; color: string }> = {
  glovo: { name: 'Glovo', color: '#FFC244' },
  ubereats: { name: 'Uber Eats', color: '#06C167' },
  justeat: { name: 'Just Eat', color: '#FF8000' },
};

function generateDailyRevenue(days: number): DailyRevenue[] {
  const data: DailyRevenue[] = [];
  const baseRevenue = 1500;

  for (let i = days - 1; i >= 0; i--) {
    const date = subDays(new Date(), i);
    const dayOfWeek = date.getDay();

    // Weekend has more revenue
    const weekendMultiplier = (dayOfWeek === 5 || dayOfWeek === 6) ? 1.4 : 1;
    const randomVariation = 0.8 + Math.random() * 0.4;

    const dailyRevenue = Math.round(baseRevenue * weekendMultiplier * randomVariation);
    const glovoShare = 0.4 + Math.random() * 0.1;
    const ubereatsShare = 0.35 + Math.random() * 0.1;
    const justeatShare = 1 - glovoShare - ubereatsShare;

    data.push({
      date: format(date, 'yyyy-MM-dd'),
      revenue: dailyRevenue,
      orders: Math.round(dailyRevenue / 35),
      glovo: Math.round(dailyRevenue * glovoShare),
      ubereats: Math.round(dailyRevenue * ubereatsShare),
      justeat: Math.round(dailyRevenue * justeatShare),
    });
  }

  return data;
}

function calculateChannelStats(dailyRevenue: DailyRevenue[]): ChannelStats[] {
  const totals = dailyRevenue.reduce(
    (acc, day) => ({
      glovo: acc.glovo + day.glovo,
      ubereats: acc.ubereats + day.ubereats,
      justeat: acc.justeat + day.justeat,
      total: acc.total + day.revenue,
    }),
    { glovo: 0, ubereats: 0, justeat: 0, total: 0 }
  );

  return [
    {
      channel: 'glovo',
      name: CHANNEL_CONFIG.glovo.name,
      revenue: totals.glovo,
      orders: Math.round(totals.glovo / 34),
      percentage: Math.round((totals.glovo / totals.total) * 100),
      color: CHANNEL_CONFIG.glovo.color,
    },
    {
      channel: 'ubereats',
      name: CHANNEL_CONFIG.ubereats.name,
      revenue: totals.ubereats,
      orders: Math.round(totals.ubereats / 36),
      percentage: Math.round((totals.ubereats / totals.total) * 100),
      color: CHANNEL_CONFIG.ubereats.color,
    },
    {
      channel: 'justeat',
      name: CHANNEL_CONFIG.justeat.name,
      revenue: totals.justeat,
      orders: Math.round(totals.justeat / 38),
      percentage: Math.round((totals.justeat / totals.total) * 100),
      color: CHANNEL_CONFIG.justeat.color,
    },
  ];
}

function generateRecentOrders(): RecentOrder[] {
  const restaurants = [
    '100 Montaditos - Gran Vía',
    'TGB - Fuencarral',
    'VIPS - Princesa',
    'Goiko - Chueca',
    'Grosso Napoletano - Malasaña',
    "Domino's - Chamberí",
  ];

  const channels: ChannelId[] = ['glovo', 'ubereats', 'justeat'];
  const statuses: RecentOrder['status'][] = ['delivered', 'delivered', 'delivered', 'pending', 'cancelled'];

  return Array.from({ length: 10 }, (_, i) => ({
    id: `order-${1000 + i}`,
    externalId: `#${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
    channel: channels[Math.floor(Math.random() * channels.length)],
    restaurant: restaurants[Math.floor(Math.random() * restaurants.length)],
    total: Math.round((20 + Math.random() * 60) * 100) / 100,
    status: statuses[Math.floor(Math.random() * statuses.length)],
    createdAt: subDays(new Date(), Math.random() * 2),
  })).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

function calculateMetrics(dailyRevenue: DailyRevenue[]): DashboardMetrics {
  const totalRevenue = dailyRevenue.reduce((sum, d) => sum + d.revenue, 0);
  const totalOrders = dailyRevenue.reduce((sum, d) => sum + d.orders, 0);

  return {
    totalRevenue,
    totalOrders,
    averageTicket: totalOrders > 0 ? totalRevenue / totalOrders : 0,
    newCustomers: Math.round(totalOrders * 0.12),
    revenueChange: 8.5 + Math.random() * 8,
    ordersChange: 5.2 + Math.random() * 6,
    ticketChange: -2 + Math.random() * 4,
    customersChange: 12 + Math.random() * 8,
  };
}

// ============================================
// FETCH FUNCTION
// ============================================

async function fetchDashboardData(
  _companyIds: string[],
  _brandIds: string[],
  _channelIds: ChannelId[],
  days: number
): Promise<DashboardData> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 300));

  const dailyRevenue = generateDailyRevenue(days);
  const channelStats = calculateChannelStats(dailyRevenue);
  const recentOrders = generateRecentOrders();
  const metrics = calculateMetrics(dailyRevenue);

  return {
    metrics,
    dailyRevenue,
    channelStats,
    recentOrders,
  };
}

// ============================================
// HOOK
// ============================================

/**
 * Fetches dashboard data including metrics, revenue trends, and channel stats.
 * Currently uses demo data, will use API when VITE_API_URL is configured.
 *
 * @returns React Query result with dashboard data
 *
 * @example
 * const { data, isLoading } = useDashboardData();
 * // data.metrics, data.dailyRevenue, data.channelStats, data.recentOrders
 */
export function useDashboardData() {
  const { companyIds } = useGlobalFiltersStore();
  const { brandIds, channelIds, datePreset } = useDashboardFiltersStore();

  // Convert preset to days
  const daysMap: Record<string, number> = {
    today: 1,
    yesterday: 1,
    '7d': 7,
    '30d': 30,
    '90d': 90,
    year: 365,
    custom: 30,
  };
  const days = daysMap[datePreset] || 30;

  return useQuery({
    queryKey: ['dashboard', companyIds, brandIds, channelIds, datePreset],
    queryFn: () => fetchDashboardData(companyIds, brandIds, channelIds, days),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: QUERY_GC_SHORT,
  });
}
