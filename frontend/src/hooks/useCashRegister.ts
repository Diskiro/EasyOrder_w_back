import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../lib/api'

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
            const data = await apiFetch('/cash-register')
            return data as CashRegisterSession | null
        }
    })
}

export function useCashRegisterMutations() {
    const queryClient = useQueryClient()

    const openSession = useMutation({
        mutationFn: async ({ startAmount, userId }: { startAmount: number, userId: string }) => {
            const data = await apiFetch('/cash-register/open', {
                method: 'POST',
                body: JSON.stringify({ startAmount, userId })
            })
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cash_register_session'] })
        }
    })

    const closeSession = useMutation({
        mutationFn: async ({ id, endAmount, notes, userId }: { id: number, endAmount: number, notes?: string, userId: string }) => {
            const data = await apiFetch(`/cash-register/close/${id}`, {
                method: 'PATCH',
                body: JSON.stringify({ endAmount, notes, userId })
            })
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cash_register_session'] })
        }
    })

    return { openSession, closeSession }
}
