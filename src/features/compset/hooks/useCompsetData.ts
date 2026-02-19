import { useMemo } from 'react';
import { useCompetitors, useHero } from './useCompetitors';
import { useCompsetSnapshots } from './useCompsetSnapshots';
import { useCompsetProducts } from './useCompsetProducts';
import { useCompsetPromotions } from './useCompsetPromotions';
import type { CompetitorWithData, CompsetAverage } from '../types';
import type { CompsetSnapshot } from '@/types';

function calcAverage(
  snapshots: CompsetSnapshot[],
  key: keyof CompsetSnapshot
): number | null {
  const vals = snapshots
    .map((s) => s[key])
    .filter((v): v is number => v !== null && typeof v === 'number');
  if (vals.length === 0) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

export function useCompsetData(companyId: string | undefined) {
  const { data: competitors = [], isLoading: loadingCompetitors, error: errCompetitors } = useCompetitors(companyId);
  const { data: hero, isLoading: loadingHero, error: errHero } = useHero(companyId);

  const allIds = useMemo(() => {
    const ids = competitors.map((c) => c.id);
    if (hero) ids.unshift(hero.id);
    return ids;
  }, [competitors, hero]);

  const { data: snapshots = [], isLoading: loadingSnapshots, error: errSnapshots } = useCompsetSnapshots(allIds);
  const { data: products = [], isLoading: loadingProducts, error: errProducts } = useCompsetProducts(allIds);
  const { data: promotions = [], isLoading: loadingPromotions, error: errPromotions } = useCompsetPromotions(allIds);

  const heroWithData: CompetitorWithData | null = useMemo(() => {
    if (!hero) return null;
    return {
      competitor: hero,
      snapshot: snapshots.find((s) => s.competitorId === hero.id) ?? null,
      products: products.filter((p) => p.competitorId === hero.id),
      promotions: promotions.filter((p) => p.competitorId === hero.id),
    };
  }, [hero, snapshots, products, promotions]);

  const competitorsWithData: CompetitorWithData[] = useMemo(
    () =>
      competitors.map((c) => ({
        competitor: c,
        snapshot: snapshots.find((s) => s.competitorId === c.id) ?? null,
        products: products.filter((p) => p.competitorId === c.id),
        promotions: promotions.filter((p) => p.competitorId === c.id),
      })),
    [competitors, snapshots, products, promotions]
  );

  const compsetAverage: CompsetAverage = useMemo(() => {
    const compSnapshots = snapshots.filter(
      (s) => s.competitorId !== hero?.id
    );
    return {
      rating: calcAverage(compSnapshots, 'rating'),
      reviewCount: calcAverage(compSnapshots, 'reviewCount'),
      avgTicket: calcAverage(compSnapshots, 'avgTicket'),
      deliveryFee: calcAverage(compSnapshots, 'deliveryFee'),
      serviceFee: calcAverage(compSnapshots, 'serviceFee'),
      minOrder: calcAverage(compSnapshots, 'minOrder'),
      totalProducts: calcAverage(compSnapshots, 'totalProducts'),
      totalCategories: calcAverage(compSnapshots, 'totalCategories'),
      deliveryTimeMin: calcAverage(compSnapshots, 'deliveryTimeMin'),
      activePromoCount: calcAverage(compSnapshots, 'activePromoCount'),
    };
  }, [snapshots, hero]);

  const error = errCompetitors || errHero || errSnapshots || errProducts || errPromotions;

  return {
    hero: heroWithData,
    competitors: competitorsWithData,
    compsetAverage,
    allProducts: products,
    allPromotions: promotions,
    isLoading:
      loadingCompetitors || loadingHero || loadingSnapshots || loadingProducts || loadingPromotions,
    error,
  };
}
