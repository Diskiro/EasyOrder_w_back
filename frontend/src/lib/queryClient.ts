import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60 * 5, // 5 minutes
            gcTime: 1000 * 60 * 60 * 24, // 24 hours (preserves cache for offline)
            retry: 1,
            networkMode: 'offlineFirst', // Critical for offline usage
        },
        mutations: {
            networkMode: 'offlineFirst',
        },
    },
})
