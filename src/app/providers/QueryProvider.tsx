import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { QUERY_STALE_MEDIUM, QUERY_GC_LONG } from '@/constants/queryConfig';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: QUERY_STALE_MEDIUM,  // 5 min default (use SHORT/LONG per hook)
      gcTime: QUERY_GC_LONG,          // 30 min garbage collection
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

interface QueryProviderProps {
  children: ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

// Exportar queryClient para invalidaciones manuales si es necesario
// eslint-disable-next-line react-refresh/only-export-components
export { queryClient };
