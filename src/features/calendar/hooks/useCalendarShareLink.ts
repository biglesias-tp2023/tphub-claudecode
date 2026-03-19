/**
 * Calendar Share Link Hook
 *
 * React Query hook for managing calendar share links.
 *
 * @module features/calendar/hooks/useCalendarShareLink
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { queryKeys } from '@/constants/queryKeys';
import { QUERY_STALE_LONG, QUERY_GC_LONG } from '@/constants/queryConfig';
import {
  createCalendarShareLink,
  fetchCalendarShareLinks,
  fetchCalendarShareLinkByToken,
  updateCalendarShareLink,
  deleteCalendarShareLink,
  regenerateCalendarShareLinkToken,
  getCalendarShareLinkUrl,
  isCalendarShareLinkValid,
  type CalendarShareConfig,
  type CalendarShareLink,
} from '@/services/calendarShareLinks';

/**
 * Hook to manage calendar share links.
 */
export function useCalendarShareLinkManager() {
  const queryClient = useQueryClient();

  const { data: links = [], ...query } = useQuery({
    queryKey: queryKeys.calendarShareLinks.all,
    queryFn: fetchCalendarShareLinks,
    staleTime: QUERY_STALE_LONG,
    gcTime: QUERY_GC_LONG,
  });

  const activeLink = links.find(l => isCalendarShareLinkValid(l)) ?? null;

  const createMutation = useMutation({
    mutationFn: (config: CalendarShareConfig) => createCalendarShareLink(config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.calendarShareLinks.all });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: { isActive?: boolean; expiresAt?: string | null; config?: CalendarShareConfig } }) =>
      updateCalendarShareLink(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.calendarShareLinks.all });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCalendarShareLink(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.calendarShareLinks.all });
    },
  });

  const regenerateMutation = useMutation({
    mutationFn: (id: string) => regenerateCalendarShareLinkToken(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.calendarShareLinks.all });
    },
  });

  const copyToClipboard = useCallback(async (link: CalendarShareLink) => {
    const url = getCalendarShareLinkUrl(link.token);
    await navigator.clipboard.writeText(url);
  }, []);

  return {
    links,
    activeLink,
    url: activeLink ? getCalendarShareLinkUrl(activeLink.token) : null,
    isActive: activeLink ? isCalendarShareLinkValid(activeLink) : false,
    viewCount: activeLink?.viewCount ?? 0,
    create: createMutation,
    update: updateMutation,
    remove: deleteMutation,
    regenerate: regenerateMutation,
    copyToClipboard,
    ...query,
  };
}

/**
 * Hook to fetch a share link by token (for public calendar page).
 */
export function useCalendarShareLinkByToken(token: string | undefined) {
  return useQuery({
    queryKey: queryKeys.calendarShareLinks.byToken(token ?? ''),
    queryFn: () => fetchCalendarShareLinkByToken(token!),
    enabled: !!token,
    staleTime: QUERY_STALE_LONG,
    gcTime: QUERY_GC_LONG,
  });
}

export type { CalendarShareLink, CalendarShareConfig };
