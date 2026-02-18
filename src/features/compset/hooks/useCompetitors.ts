import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchCompsetCompetitors,
  fetchCompsetHero,
  createCompsetCompetitor,
  updateCompsetCompetitor,
  deleteCompsetCompetitor,
} from '@/services/compset';
import type { CompsetCompetitor } from '@/types';

export function useCompetitors(companyId: string | undefined) {
  return useQuery({
    queryKey: ['compset', 'competitors', companyId],
    queryFn: () => fetchCompsetCompetitors(companyId!),
    enabled: !!companyId,
  });
}

export function useHero(companyId: string | undefined) {
  return useQuery({
    queryKey: ['compset', 'hero', companyId],
    queryFn: () => fetchCompsetHero(companyId!),
    enabled: !!companyId,
  });
}

export function useCreateCompetitor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Omit<CompsetCompetitor, 'id' | 'createdAt' | 'updatedAt'>) =>
      createCompsetCompetitor(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compset'] });
    },
  });
}

export function useUpdateCompetitor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<CompsetCompetitor> }) =>
      updateCompsetCompetitor(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compset'] });
    },
  });
}

export function useDeleteCompetitor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCompsetCompetitor(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compset'] });
    },
  });
}
