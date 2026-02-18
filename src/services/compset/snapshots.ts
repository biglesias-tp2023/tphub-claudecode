import { supabase } from '@/services/supabase';
import { mapSnapshot } from './mappers';
import {
  MOCK_SNAPSHOTS,
  MOCK_HERO_SNAPSHOT,
} from '@/features/compset/config/mockData';
import type { CompsetSnapshot, DbCompsetSnapshot } from '@/types';

const USE_MOCK_DATA = true;

export async function fetchLatestSnapshots(
  competitorIds: string[]
): Promise<CompsetSnapshot[]> {
  if (USE_MOCK_DATA) {
    const all = [MOCK_HERO_SNAPSHOT, ...MOCK_SNAPSHOTS];
    return all.filter((s) => competitorIds.includes(s.competitorId));
  }

  // Fetch the most recent snapshot for each competitor
  const { data, error } = await supabase
    .from('compset_snapshots')
    .select('*')
    .in('competitor_id', competitorIds)
    .order('snapshot_date', { ascending: false });

  if (error) throw error;

  // Deduplicate: keep only latest per competitor
  const seen = new Set<string>();
  const latest: DbCompsetSnapshot[] = [];
  for (const row of data as DbCompsetSnapshot[]) {
    if (!seen.has(row.competitor_id)) {
      seen.add(row.competitor_id);
      latest.push(row);
    }
  }

  return latest.map(mapSnapshot);
}

export async function fetchSnapshotHistory(
  competitorId: string,
  limit = 30
): Promise<CompsetSnapshot[]> {
  if (USE_MOCK_DATA) {
    const all = [MOCK_HERO_SNAPSHOT, ...MOCK_SNAPSHOTS];
    return all.filter((s) => s.competitorId === competitorId);
  }

  const { data, error } = await supabase
    .from('compset_snapshots')
    .select('*')
    .eq('competitor_id', competitorId)
    .order('snapshot_date', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data as DbCompsetSnapshot[]).map(mapSnapshot);
}
