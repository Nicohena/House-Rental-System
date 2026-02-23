import { QueryClient } from '@tanstack/react-query';
import logger from '../utils/logger';

/**
 * React Query Client Configuration
 * Centralized configuration for data fetching, caching, and error handling
 */

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Retry failed requests
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors (client errors)
        if (error.response?.status >= 400 && error.response?.status < 500) {
          return false;
        }
        // Retry up to 2 times for network errors and 5xx errors
        return failureCount < 2;
      },
      
      // Retry delay with exponential backoff
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      
      // Cache data for 5 minutes
      staleTime: 5 * 60 * 1000,
      
      // Keep unused data in cache for 10 minutes
      cacheTime: 10 * 60 * 1000,
      
      // Refetch on window focus
      refetchOnWindowFocus: true,
      
      // Refetch on reconnect
      refetchOnReconnect: true,
      
      // Don't refetch on mount if data is fresh
      refetchOnMount: false,
      
      // Error handler
      onError: (error) => {
        logger.error('Query error', error);
      },
    },
    
    mutations: {
      // Retry failed mutations once
      retry: 1,
      
      // Error handler for mutations
      onError: (error) => {
        logger.error('Mutation error', error);
      },
    },
  },
});

export default queryClient;
