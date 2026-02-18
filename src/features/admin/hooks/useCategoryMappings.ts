import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchAllCompsetProducts,
  fetchUnmappedProducts,
  updateProductCategory,
} from '@/services/compset';
import { fetchCompsetCompetitors, fetchCompsetHero } from '@/services/compset';
import type { NormalizedCategory } from '@/types';

export function useAllCompsetProducts() {
  return useQuery({
    queryKey: ['compset', 'products', 'all'],
    queryFn: fetchAllCompsetProducts,
  });
}

export function useUnmappedProducts() {
  return useQuery({
    queryKey: ['compset', 'products', 'unmapped'],
    queryFn: fetchUnmappedProducts,
  });
}

export function useAllCompetitorsForMapping() {
  const competitors = useQuery({
    queryKey: ['compset', 'competitors', 'all-mapping'],
    queryFn: async () => {
      const [hero, comps] = await Promise.all([
        fetchCompsetHero('1'),
        fetchCompsetCompetitors('1'),
      ]);
      return hero ? [hero, ...comps] : comps;
    },
  });
  return competitors;
}

export function useUpdateProductCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, category }: { productId: string; category: NormalizedCategory }) =>
      updateProductCategory(productId, category),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compset', 'products'] });
    },
  });
}
