import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useGlobalFiltersStore, useDashboardFiltersStore } from '@/stores/filtersStore';
import type { ChannelId } from '@/types';

// ============================================
// TYPES
// ============================================

export interface ChannelRating {
  channel: ChannelId;
  name: string;
  color: string;
  rating: number; // 0-100 for Glovo (%), 1-5 for UberEats (stars)
  totalReviews: number;
  positivePercent: number;
  negativePercent: number;
  ratingType: 'percent' | 'stars';
}

export interface ReputationSummary {
  totalBilling: number;
  totalRefunds: number;
  refundsCount: number;
}

export interface HeatmapCell {
  day: number; // 0-6 (Lun-Dom)
  hour: number; // 10-23
  count: number;
}

export interface ErrorType {
  id: string;
  label: string;
  count: number;
  color: string;
}

export type ReviewTag =
  | 'POSITIVE'
  | 'NOT_FRESH'
  | 'MISSING_OR_MISTAKEN_ITEMS'
  | 'SPEED'
  | 'PACKAGING_QUALITY'
  | 'TASTED_BAD'
  | 'TEMPERATURE'
  | 'QUALITY';

export interface Review {
  id: string;
  orderId: string;
  channel: ChannelId;
  orderDate: string; // ISO date string (YYYY-MM-DD)
  orderTime: string; // Time string (HH:MM)
  value: number;
  deliveryTime: number; // minutes
  isDelayed: boolean;
  tag: ReviewTag;
  products: string[];
  rating: 'thumbsUp' | 'thumbsDown' | number; // number for stars (1-5)
  comment: string | null;
}

export interface ReputationData {
  channelRatings: ChannelRating[];
  summary: ReputationSummary;
  heatmap: HeatmapCell[];
  errorTypes: ErrorType[];
  reviews: Review[];
}

// ============================================
// DEMO DATA
// ============================================

const DEMO_CHANNEL_RATINGS: ChannelRating[] = [
  {
    channel: 'glovo',
    name: 'Glovo',
    color: '#FFC244',
    rating: 91,
    totalReviews: 234,
    positivePercent: 91,
    negativePercent: 9,
    ratingType: 'percent',
  },
  {
    channel: 'ubereats',
    name: 'Uber Eats',
    color: '#06C167',
    rating: 4.3,
    totalReviews: 156,
    positivePercent: 86,
    negativePercent: 14,
    ratingType: 'stars',
  },
];

const DEMO_SUMMARY: ReputationSummary = {
  totalBilling: 4594,
  totalRefunds: 127,
  refundsCount: 8,
};

const DEMO_HEATMAP: HeatmapCell[] = [
  // Lunes
  { day: 0, hour: 13, count: 1 },
  // Martes
  { day: 1, hour: 14, count: 2 },
  // Miércoles
  { day: 2, hour: 12, count: 1 },
  // Viernes
  { day: 4, hour: 13, count: 1 },
  { day: 4, hour: 21, count: 2 },
  // Sábado
  { day: 5, hour: 20, count: 1 },
  { day: 5, hour: 21, count: 3 },
  // Domingo
  { day: 6, hour: 14, count: 1 },
];

const DEMO_ERROR_TYPES: ErrorType[] = [
  { id: 'not_fresh', label: 'No fresco', count: 4, color: '#DC2626' },
  { id: 'missing', label: 'Producto incorrecto/faltante', count: 3, color: '#8B5CF6' },
  { id: 'bad_taste', label: 'Mal sabor', count: 3, color: '#EF4444' },
  { id: 'packaging', label: 'Calidad del empaque', count: 2, color: '#14B8A6' },
  { id: 'quality', label: 'Calidad', count: 2, color: '#6366F1' },
  { id: 'notes', label: 'No siguió notas del pedido', count: 1, color: '#EC4899' },
  { id: 'portion', label: 'Tamaño de porción', count: 2, color: '#3B82F6' },
];

const DEMO_REVIEWS: Review[] = [
  {
    id: '1',
    orderId: '89234',
    channel: 'glovo',
    orderDate: '2026-01-21',
    orderTime: '13:45',
    value: 24.50,
    deliveryTime: 42,
    isDelayed: true,
    tag: 'NOT_FRESH',
    products: ['Kale Caesar Salad', 'Agua mineral'],
    rating: 'thumbsUp',
    comment: 'La burrata estaba pasada.',
  },
  {
    id: '2',
    orderId: '45123',
    channel: 'ubereats',
    orderDate: '2026-01-21',
    orderTime: '12:30',
    value: 18.90,
    deliveryTime: 22,
    isDelayed: false,
    tag: 'POSITIVE',
    products: ['ELG Salad', 'Zumo natural'],
    rating: 5,
    comment: 'Todo perfecto, muy rico!',
  },
  {
    id: '3',
    orderId: '89456',
    channel: 'glovo',
    orderDate: '2026-01-20',
    orderTime: '20:15',
    value: 32.00,
    deliveryTime: 35,
    isDelayed: true,
    tag: 'MISSING_OR_MISTAKEN_ITEMS',
    products: ['Buddha Bowl', 'Hummus'],
    rating: 'thumbsDown',
    comment: 'No lleva aguacate',
  },
  {
    id: '4',
    orderId: '45789',
    channel: 'ubereats',
    orderDate: '2026-01-20',
    orderTime: '14:00',
    value: 15.50,
    deliveryTime: 55,
    isDelayed: true,
    tag: 'SPEED',
    products: ['Poke Bowl'],
    rating: 4,
    comment: 'Tardó demasiado en llegar, comida fría.',
  },
  {
    id: '5',
    orderId: '89567',
    channel: 'glovo',
    orderDate: '2026-01-19',
    orderTime: '21:30',
    value: 28.75,
    deliveryTime: 18,
    isDelayed: false,
    tag: 'POSITIVE',
    products: ['Quinoa Salad', 'Smoothie verde'],
    rating: 'thumbsUp',
    comment: 'Excelente como siempre',
  },
  {
    id: '6',
    orderId: '45456',
    channel: 'ubereats',
    orderDate: '2026-01-19',
    orderTime: '13:15',
    value: 22.30,
    deliveryTime: 28,
    isDelayed: false,
    tag: 'PACKAGING_QUALITY',
    products: ['Wrap mediterráneo', 'Patatas'],
    rating: 4,
    comment: 'El envase venía abierto, todo mezclado',
  },
  {
    id: '7',
    orderId: '89678',
    channel: 'glovo',
    orderDate: '2026-01-18',
    orderTime: '19:45',
    value: 41.20,
    deliveryTime: 31,
    isDelayed: true,
    tag: 'TASTED_BAD',
    products: ['Ensalada griega', 'Falafel'],
    rating: 'thumbsUp',
    comment: 'El falafel estaba rancio, muy decepcionante',
  },
  {
    id: '8',
    orderId: '45234',
    channel: 'ubereats',
    orderDate: '2026-01-18',
    orderTime: '12:00',
    value: 19.90,
    deliveryTime: 20,
    isDelayed: false,
    tag: 'POSITIVE',
    products: ['Açaí Bowl'],
    rating: 5,
    comment: null,
  },
  {
    id: '9',
    orderId: '89789',
    channel: 'glovo',
    orderDate: '2026-01-17',
    orderTime: '20:30',
    value: 27.50,
    deliveryTime: 48,
    isDelayed: true,
    tag: 'TEMPERATURE',
    products: ['Sopa del día', 'Ensalada templada'],
    rating: 'thumbsUp',
    comment: 'La sopa llegó fría',
  },
  {
    id: '10',
    orderId: '45567',
    channel: 'ubereats',
    orderDate: '2026-01-17',
    orderTime: '14:30',
    value: 35.00,
    deliveryTime: 25,
    isDelayed: false,
    tag: 'QUALITY',
    products: ['Menu ejecutivo', 'Postre del día'],
    rating: 4,
    comment: 'Buena calidad en general',
  },
];

// ============================================
// FETCH FUNCTION
// ============================================

async function fetchReputationData(): Promise<ReputationData> {
  await new Promise((resolve) => setTimeout(resolve, 300));

  return {
    channelRatings: DEMO_CHANNEL_RATINGS,
    summary: DEMO_SUMMARY,
    heatmap: DEMO_HEATMAP,
    errorTypes: DEMO_ERROR_TYPES,
    reviews: DEMO_REVIEWS,
  };
}

// ============================================
// HOOK
// ============================================

export function useReputationData() {
  const { companyIds } = useGlobalFiltersStore();
  const { channelIds } = useDashboardFiltersStore();

  const query = useQuery({
    queryKey: ['reputation', companyIds],
    queryFn: fetchReputationData,
    staleTime: 2 * 60 * 1000,
  });

  // Filter data based on selected channels
  const filteredData = useMemo<ReputationData | undefined>(() => {
    if (!query.data) return undefined;

    const data = query.data;

    // If no channel filter, return all data
    if (channelIds.length === 0) {
      return data;
    }

    // Filter channel ratings
    const filteredRatings = data.channelRatings.filter((r) =>
      channelIds.includes(r.channel)
    );

    // Filter reviews by channel
    const filteredReviews = data.reviews.filter((r) =>
      channelIds.includes(r.channel)
    );

    // Recalculate summary from filtered reviews
    const filteredSummary: ReputationSummary = {
      totalBilling: filteredReviews.reduce((sum, r) => sum + r.value, 0),
      totalRefunds: filteredReviews
        .filter((r) => r.tag !== 'POSITIVE')
        .reduce((sum, r) => sum + r.value * 0.1, 0),
      refundsCount: filteredReviews.filter((r) => r.tag !== 'POSITIVE').length,
    };

    // Recalculate error types from filtered reviews
    const errorCounts: Record<string, number> = {};
    filteredReviews
      .filter((r) => r.tag !== 'POSITIVE')
      .forEach((r) => {
        const errorId = r.tag.toLowerCase();
        errorCounts[errorId] = (errorCounts[errorId] || 0) + 1;
      });

    const filteredErrorTypes = data.errorTypes
      .map((et) => ({
        ...et,
        count: errorCounts[et.id] || 0,
      }))
      .filter((et) => et.count > 0);

    return {
      channelRatings: filteredRatings,
      summary: filteredSummary,
      heatmap: data.heatmap, // Heatmap stays the same for demo
      errorTypes: filteredErrorTypes.length > 0 ? filteredErrorTypes : data.errorTypes,
      reviews: filteredReviews,
    };
  }, [query.data, channelIds]);

  return {
    data: filteredData,
    isLoading: query.isLoading,
    error: query.error,
  };
}
