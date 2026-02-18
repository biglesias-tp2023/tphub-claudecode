import { useQuery } from '@tanstack/react-query';
import { fetchCompsetProducts } from '@/services/compset';

export function useCompsetProducts(competitorIds: string[]) {
  return useQuery({
    queryKey: ['compset', 'products', competitorIds],
    queryFn: () => fetchCompsetProducts(competitorIds),
    enabled: competitorIds.length > 0,
  });
}
