import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabaseClient'

export interface CashRegisterSession {
    id: number
    opened_by: string // uuid
    closed_by?: string // uuid
    start_amount: number
    end_amount?: number
    opened_at: string
    closed_at?: string
    notes?: string
}

export function useCashRegister() {
    return useQuery({
        queryKey: ['cash_register_session'],
        queryFn: async () => {
            // Get the LAST session (open or closed)
            const { data, error } = await supabase
                .from('cash_register_sessions')
                .select('*')
                .order('opened_at', { ascending: false })
                .limit(1)
                .maybeSingle()

            if (error) throw error
            return data as CashRegisterSession | null
        }
    })
}

export function useCashRegisterMutations() {
    const queryClient = useQueryClient()

    const openSession = useMutation({
        mutationFn: async ({ startAmount, userId }: { startAmount: number, userId: string }) => {
            const { data, error } = await supabase
                .from('cash_register_sessions')
                .insert({
                    opened_by: userId,
                    start_amount: startAmount,
                    opened_at: new Date().toISOString()
                })
                .select()
                .single()
            if (error) throw error
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cash_register_session'] })
        }
    })

    const closeSession = useMutation({
        mutationFn: async ({ id, endAmount, notes, userId }: { id: number, endAmount: number, notes?: string, userId: string }) => {
            const { data, error } = await supabase
                .from('cash_register_sessions')
                .update({
                    closed_by: userId,
                    end_amount: endAmount,
                    closed_at: new Date().toISOString(),
                    notes: notes
                })
                .eq('id', id)
                .select()
                .single()
            if (error) throw error
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cash_register_session'] })
        }
    })

    return { openSession, closeSession }
}
