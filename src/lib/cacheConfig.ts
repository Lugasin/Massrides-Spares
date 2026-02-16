import { QueryClient } from '@tanstack/react-query';
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';

// Advanced caching configuration for optimal performance
export const createAdvancedQueryClient = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // Cache data for 5 minutes by default
        staleTime: 5 * 60 * 1000, // 5 minutes
        // Keep data in cache for 10 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
        // Retry failed requests 3 times with exponential backoff
        retry: (failureCount, error: any) => {
          // Don't retry on 4xx errors (client errors)
          if (error?.status >= 400 && error?.status < 500) {
            return false;
          }
          // Retry up to 3 times for other errors
          return failureCount < 3;
        },
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        // Refetch on window focus for critical data
        refetchOnWindowFocus: false,
        // Don't refetch on reconnect by default (let staleTime handle it)
        refetchOnReconnect: false,
        // Network mode: always fetch from network when online
        networkMode: 'online',
      },
      mutations: {
        // Retry mutations once on failure
        retry: 1,
        retryDelay: 1000,
        // Network mode for mutations
        networkMode: 'online',
      },
    },
  });

  // Add persistence for offline support
  if (typeof window !== 'undefined') {
    const persister = createSyncStoragePersister({
      storage: window.localStorage,
      key: 'massrides-cache',
      // Only persist specific queries
      serialize: JSON.stringify,
      deserialize: JSON.parse,
    });

    persistQueryClient({
      queryClient,
      persister,
      // Only persist these query keys
      dehydrateOptions: {
        shouldDehydrateQuery: (query) => {
          const queryKey = query.queryKey;
          // Persist product data, user profile, cart data
          return (
            queryKey[0] === 'products' ||
            queryKey[0] === 'user' ||
            queryKey[0] === 'cart' ||
            queryKey[0] === 'inventory'
          );
        },
      },
      // Max age for persisted queries: 24 hours
      maxAge: 24 * 60 * 60 * 1000,
    });
  }

  return queryClient;
};

// Cache invalidation helpers
export const cacheHelpers = {
  // Invalidate all product-related queries
  invalidateProducts: (queryClient: QueryClient) => {
    queryClient.invalidateQueries({ queryKey: ['products'] });
    queryClient.invalidateQueries({ queryKey: ['inventory'] });
  },

  // Invalidate user-related queries
  invalidateUser: (queryClient: QueryClient) => {
    queryClient.invalidateQueries({ queryKey: ['user'] });
    queryClient.invalidateQueries({ queryKey: ['profile'] });
  },

  // Invalidate cart-related queries
  invalidateCart: (queryClient: QueryClient) => {
    queryClient.invalidateQueries({ queryKey: ['cart'] });
  },

  // Invalidate all cached data
  invalidateAll: (queryClient: QueryClient) => {
    queryClient.invalidateQueries();
    queryClient.clear();
  },

  // Prefetch critical data
  prefetchCriticalData: async (queryClient: QueryClient) => {
    // Prefetch user profile if authenticated
    // Prefetch cart data
    // Prefetch featured products
    // This would be called on app initialization
  },
};

// Custom hooks for advanced caching
export const useOptimisticUpdate = () => {
  // Hook for optimistic updates
  return {
    updateOptimistically: (queryKey: string[], updater: (old: any) => any) => {
      // Implementation for optimistic updates
    },
    rollbackOptimisticUpdate: (queryKey: string[]) => {
      // Implementation for rollback
    },
  };
};

// Background sync for offline changes
export const setupBackgroundSync = (queryClient: QueryClient) => {
  if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
    navigator.serviceWorker.ready.then((registration) => {
      // Register background sync for cart operations
      registration.sync.register('cart-sync');
      registration.sync.register('order-sync');
    });
  }

  // Listen for online events to sync pending changes
  window.addEventListener('online', () => {
    queryClient.invalidateQueries({ queryKey: ['cart'] });
    queryClient.invalidateQueries({ queryKey: ['orders'] });
  });
};