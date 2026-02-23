import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/constants/queryKeys';
import { QUERY_GC_MEDIUM } from '@/constants/queryConfig';
import { fetchCrpCompanies, fetchCrpCompanyById } from '@/services/crp-portal';
import type { Company } from '@/types';

/**
 * Fetches all companies from CRP Portal.
 * Only returns companies with valid status: Onboarding, Cliente Activo, Stand By, PiP
 *
 * @param userId - Optional user ID (defaults to 'current')
 * @returns React Query result with companies array
 *
 * @example
 * const { data: companies, isLoading } = useCompanies();
 */
export function useCompanies(userId?: string) {
  return useQuery({
    queryKey: queryKeys.companies.list(userId || 'current'),
    queryFn: fetchCrpCompanies,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: QUERY_GC_MEDIUM,
  });
}

/**
 * Fetches a single company by ID from CRP Portal.
 *
 * @param companyId - The company ID to fetch
 * @returns React Query result with company object
 *
 * @example
 * const { data: company } = useCompany('uuid-here');
 */
export function useCompany(companyId: string) {
  return useQuery({
    queryKey: queryKeys.companies.detail(companyId),
    queryFn: () => fetchCrpCompanyById(companyId),
    enabled: !!companyId,
  });
}

/**
 * Returns company objects for given IDs from the cached companies list.
 *
 * @param companyIds - Array of company IDs to look up
 * @returns Array of Company objects (filtered to only include found companies)
 *
 * @example
 * const companies = useCompaniesById(['uuid-1', 'uuid-2']);
 */
export function useCompaniesById(companyIds: string[]) {
  const { data: allCompanies = [] } = useCompanies();

  return companyIds
    .map((id) => allCompanies.find((c) => c.id === id))
    .filter((c): c is Company => c !== undefined);
}
