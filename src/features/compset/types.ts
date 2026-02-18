import type {
  CompsetCompetitor,
  CompsetSnapshot,
  CompsetProduct,
  CompsetPromotion,
  NormalizedCategory,
} from '@/types';

/** Competitor with all related data merged */
export interface CompetitorWithData {
  competitor: CompsetCompetitor;
  snapshot: CompsetSnapshot | null;
  products: CompsetProduct[];
  promotions: CompsetPromotion[];
}

/** Calculated averages across the entire compset */
export interface CompsetAverage {
  rating: number | null;
  reviewCount: number | null;
  avgTicket: number | null;
  deliveryFee: number | null;
  serviceFee: number | null;
  minOrder: number | null;
  totalProducts: number | null;
  totalCategories: number | null;
  deliveryTimeMin: number | null;
  activePromoCount: number | null;
}

/** Price comparison data for a single category */
export interface CategoryPriceComparison {
  category: NormalizedCategory;
  entries: {
    competitorId: string;
    competitorName: string;
    avgPrice: number;
    productCount: number;
    isHero: boolean;
  }[];
}

/** Tab IDs for the Compset page */
export type CompsetTabId = 'overview' | 'products' | 'reputation' | 'promotions' | 'config';
