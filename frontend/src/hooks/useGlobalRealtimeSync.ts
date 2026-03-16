import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { socket } from '../lib/socket';

export function useGlobalRealtimeSync() {
    const queryClient = useQueryClient();

    useEffect(() => {
        console.log('Setting up Socket.IO Realtime subscriptions...');

        socket.connect();

        const handleDbChange = (payload: { table: string }) => {
            console.log('Realtime change received from Socket.IO:', payload);
            if (payload.table === 'orders') {
                queryClient.invalidateQueries({ queryKey: ['orders'] });
                queryClient.invalidateQueries({ queryKey: ['tables'] });
                queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
            } else if (payload.table === 'order_items') {
                queryClient.invalidateQueries({ queryKey: ['orders'] });
                queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
            } else if (payload.table === 'tables') {
                queryClient.invalidateQueries({ queryKey: ['tables'] });
                queryClient.invalidateQueries({ queryKey: ['orders'] });
            } else if (payload.table === 'categories') {
                queryClient.invalidateQueries({ queryKey: ['categories'] });
            } else if (payload.table === 'products') {
                queryClient.invalidateQueries({ queryKey: ['products'] });
            }
        };

        socket.on('db_change', handleDbChange);

        return () => {
            console.log('Cleaning up Socket.IO subscriptions...');
            socket.off('db_change', handleDbChange);
            socket.disconnect();
        };
    }, [queryClient]);
}
