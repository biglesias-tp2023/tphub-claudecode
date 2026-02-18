import { useQuery } from '@tanstack/react-query';
import { fetchActivePromotions } from '@/services/compset';

export function useCompsetPromotions(competitorIds: string[]) {
  return useQuery({
    queryKey: ['compset', 'promotions', competitorIds],
    queryFn: () => fetchActivePromotions(competitorIds),
    enabled: competitorIds.length > 0,
  });
}
