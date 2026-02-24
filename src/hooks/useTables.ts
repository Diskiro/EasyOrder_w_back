import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabaseClient'

export interface Table {
    id: number
    number: string
    capacity: number
    status: 'available' | 'occupied'
    current_order_id: number | null
}

export function useTables() {
    const queryClient = useQueryClient()

    useEffect(() => {
        const channel = supabase
            .channel('tables-sync')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'tables' },
                () => {
                    queryClient.invalidateQueries({ queryKey: ['tables'] })
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [queryClient])

    return useQuery({
        queryKey: ['tables'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('tables')
                .select('*')
                .order('number')
            if (error) throw error
            return data as Table[]
        }
    })
}

export function useTableMutations() {
    const queryClient = useQueryClient()

    const createTable = useMutation({
        mutationFn: async (newTable: Omit<Table, 'id' | 'current_order_id' | 'status'>) => {
            const { data, error } = await supabase
                .from('tables')
                .insert({ ...newTable, status: 'available' })
                .select()
                .single()
            if (error) throw error
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tables'] })
        }
    })

    const updateTable = useMutation({
        mutationFn: async ({ id, updates }: { id: number, updates: Partial<Table> }) => {
            const { data, error } = await supabase
                .from('tables')
                .update(updates)
                .eq('id', id)
                .select()
                .single()
            if (error) throw error
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tables'] })
        }
    })

    const deleteTable = useMutation({
        mutationFn: async (id: number) => {
            const { error } = await supabase
                .from('tables')
                .delete()
                .eq('id', id)
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tables'] })
        }
    })

    return { createTable, updateTable, deleteTable }
}
