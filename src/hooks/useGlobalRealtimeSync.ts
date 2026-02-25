import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabaseClient'

export function useGlobalRealtimeSync() {
    const queryClient = useQueryClient()

    useEffect(() => {
        console.log('Setting up Global Realtime subscriptions...')

        const channel = supabase
            .channel('global-sync-channel')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'orders' },
                () => {
                    queryClient.invalidateQueries({ queryKey: ['orders'] })
                    queryClient.invalidateQueries({ queryKey: ['tables'] })
                }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'order_items' },
                () => {
                    queryClient.invalidateQueries({ queryKey: ['orders'] })
                }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'tables' },
                () => {
                    queryClient.invalidateQueries({ queryKey: ['tables'] })
                    queryClient.invalidateQueries({ queryKey: ['orders'] })
                }
            )
            .subscribe()

        return () => {
            console.log('Cleaning up Global Realtime subscriptions...')
            supabase.removeChannel(channel)
        }
    }, [queryClient])
}
