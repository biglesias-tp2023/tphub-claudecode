import { useQuery } from '@tanstack/react-query';
import { fetchLatestSnapshots } from '@/services/compset';

export function useCompsetSnapshots(competitorIds: string[]) {
  return useQuery({
    queryKey: ['compset', 'snapshots', competitorIds],
    queryFn: () => fetchLatestSnapshots(competitorIds),
    enabled: competitorIds.length > 0,
  });
}
