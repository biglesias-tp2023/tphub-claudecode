import type { NormalizedCategory } from '@/types';

export interface CategoryConfig {
  id: NormalizedCategory;
  label: string;
  color: string;
  icon: string; // Lucide icon name
}

export const NORMALIZED_CATEGORIES: CategoryConfig[] = [
  { id: 'principales', label: 'Principales', color: '#095789', icon: 'UtensilsCrossed' },
  { id: 'entrantes', label: 'Entrantes', color: '#0b7bb8', icon: 'Salad' },
  { id: 'postres', label: 'Postres', color: '#ffa166', icon: 'Cake' },
  { id: 'combos', label: 'Combos', color: '#3a9fd4', icon: 'Package' },
  { id: 'bebidas', label: 'Bebidas', color: '#6bb8e0', icon: 'Wine' },
];

export const CATEGORY_MAP = Object.fromEntries(
  NORMALIZED_CATEGORIES.map((c) => [c.id, c])
) as Record<NormalizedCategory, CategoryConfig>;

export const PLATFORM_COLORS: Record<string, string> = {
  glovo: '#FFC244',
  ubereats: '#06C167',
  justeat: '#FF8000',
};

export const PLATFORM_LABELS: Record<string, string> = {
  glovo: 'Glovo',
  ubereats: 'UberEats',
  justeat: 'JustEat',
};
