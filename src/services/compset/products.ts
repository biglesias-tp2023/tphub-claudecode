import { supabase } from '@/services/supabase';
import { mapProduct } from './mappers';
import {
  MOCK_PRODUCTS,
  MOCK_HERO_PRODUCTS,
} from '@/features/compset/config/mockData';
import type { CompsetProduct, DbCompsetProduct, NormalizedCategory } from '@/types';

const USE_MOCK_DATA = true;

export async function fetchCompsetProducts(
  competitorIds: string[]
): Promise<CompsetProduct[]> {
  if (USE_MOCK_DATA) {
    const all = [...MOCK_HERO_PRODUCTS, ...MOCK_PRODUCTS];
    return all.filter((p) => competitorIds.includes(p.competitorId));
  }

  const { data, error } = await supabase
    .from('compset_products')
    .select('*')
    .in('competitor_id', competitorIds)
    .eq('is_available', true);

  if (error) throw error;
  return (data as DbCompsetProduct[]).map(mapProduct);
}

export async function fetchAllCompsetProducts(): Promise<CompsetProduct[]> {
  if (USE_MOCK_DATA) {
    return [...MOCK_HERO_PRODUCTS, ...MOCK_PRODUCTS];
  }

  const { data, error } = await supabase
    .from('compset_products')
    .select('*')
    .order('competitor_id')
    .order('name');

  if (error) throw error;
  return (data as DbCompsetProduct[]).map(mapProduct);
}

export async function fetchUnmappedProducts(): Promise<CompsetProduct[]> {
  if (USE_MOCK_DATA) {
    return [...MOCK_HERO_PRODUCTS, ...MOCK_PRODUCTS].filter(
      (p) => p.normalizedCategory === null
    );
  }

  const { data, error } = await supabase
    .from('compset_products')
    .select('*')
    .is('normalized_category', null)
    .order('competitor_id')
    .order('raw_category');

  if (error) throw error;
  return (data as DbCompsetProduct[]).map(mapProduct);
}

export async function updateProductCategory(
  productId: string,
  category: NormalizedCategory
): Promise<CompsetProduct> {
  if (USE_MOCK_DATA) {
    const all = [...MOCK_HERO_PRODUCTS, ...MOCK_PRODUCTS];
    const product = all.find((p) => p.id === productId);
    if (!product) throw new Error('Product not found');
    return { ...product, normalizedCategory: category };
  }

  const { data, error } = await supabase
    .from('compset_products')
    .update({ normalized_category: category })
    .eq('id', productId)
    .select()
    .single();

  if (error) throw error;
  return mapProduct(data as DbCompsetProduct);
}
