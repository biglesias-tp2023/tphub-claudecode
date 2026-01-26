import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

// Stale times por tipo de dato
export const STALE_TIMES = {
  clients: 10 * 60 * 1000,    // 10 min - cambian poco
  locations: 10 * 60 * 1000,  // 10 min - cambian poco
  orders: 2 * 60 * 1000,      // 2 min - pueden llegar nuevos
  analytics: 5 * 60 * 1000,   // 5 min - datos agregados
  products: 10 * 60 * 1000,   // 10 min - catálogo estable
} as const;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,       // 5 minutos por defecto
      gcTime: 30 * 60 * 1000,         // Garbage collection: 30 minutos
      retry: 1,
      refetchOnWindowFocus: false,    // Evitar refetch excesivo
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
