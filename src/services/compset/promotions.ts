import { supabase } from '@/services/supabase';
import { mapPromotion } from './mappers';
import {
  MOCK_PROMOTIONS,
  MOCK_HERO_PROMOTIONS,
} from '@/features/compset/config/mockData';
import type { CompsetPromotion, DbCompsetPromotion } from '@/types';

const USE_MOCK_DATA = true;

export async function fetchCompsetPromotions(
  competitorIds: string[]
): Promise<CompsetPromotion[]> {
  if (USE_MOCK_DATA) {
    const all = [...MOCK_HERO_PROMOTIONS, ...MOCK_PROMOTIONS];
    return all.filter((p) => competitorIds.includes(p.competitorId));
  }

  const { data, error } = await supabase
    .from('compset_promotions')
    .select('*')
    .in('competitor_id', competitorIds)
    .eq('is_active', true)
    .order('last_seen_at', { ascending: false });

  if (error) throw error;
  return (data as DbCompsetPromotion[]).map(mapPromotion);
}

export async function fetchActivePromotions(
  competitorIds: string[]
): Promise<CompsetPromotion[]> {
  if (USE_MOCK_DATA) {
    const all = [...MOCK_HERO_PROMOTIONS, ...MOCK_PROMOTIONS];
    return all.filter((p) => competitorIds.includes(p.competitorId) && p.isActive);
  }

  const { data, error } = await supabase
    .from('compset_promotions')
    .select('*')
    .in('competitor_id', competitorIds)
    .eq('is_active', true)
    .order('competitor_id')
    .order('last_seen_at', { ascending: false });

  if (error) throw error;
  return (data as DbCompsetPromotion[]).map(mapPromotion);
}
