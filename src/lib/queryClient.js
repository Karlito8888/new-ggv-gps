import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache pendant 5 minutes
      staleTime: 5 * 60 * 1000,
      // Garde en cache pendant 10 minutes
      gcTime: 10 * 60 * 1000,
      // Retry 2 fois en cas d'erreur
      retry: 2,
      // Refetch en arrière-plan quand la fenêtre reprend le focus
      refetchOnWindowFocus: false,
    },
  },
});
