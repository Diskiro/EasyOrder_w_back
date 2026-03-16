import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';

export interface Table {
    id: number;
    number: string;
    capacity: number;
    status: 'available' | 'occupied';
    current_order_id: number | null;
}

export function useTables() {
    return useQuery({
        queryKey: ['tables'],
        queryFn: async () => {
            return await apiFetch('/tables') as Table[];
        }
    });
}

export function useTableMutations() {
    const queryClient = useQueryClient();

    const createTable = useMutation({
        mutationFn: async (newTable: Omit<Table, 'id' | 'current_order_id' | 'status'>) => {
            return await apiFetch('/tables', {
                method: 'POST',
                body: JSON.stringify(newTable),
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tables'] });
        }
    });

    const updateTable = useMutation({
        mutationFn: async ({ id, updates }: { id: number, updates: Partial<Table> }) => {
            return await apiFetch(`/tables/${id}`, {
                method: 'PATCH',
                body: JSON.stringify(updates),
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tables'] });
        }
    });

    const deleteTable = useMutation({
        mutationFn: async (id: number) => {
            return await apiFetch(`/tables/${id}`, {
                method: 'DELETE',
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tables'] });
        }
    });

    return { createTable, updateTable, deleteTable };
}
