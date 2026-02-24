import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabaseClient'

export interface Reservation {
    id: number
    table_id: number | null
    customer_name: string
    pax: number
    reservation_time: string // ISO string
    shift: 'lunch' | 'dinner'
    status: 'pending' | 'confirmed' | 'arrived' | 'completed' | 'cancelled'
    notes?: string
    created_at: string
}

export function useReservations(shift?: 'lunch' | 'dinner', startDate?: string, endDate?: string) {
    return useQuery({
        queryKey: ['reservations', shift, startDate, endDate],
        queryFn: async () => {
            let query = supabase
                .from('reservations')
                .select('*')
                .order('reservation_time', { ascending: true })

            // Filter by shift if provided
            if (shift) {
                query = query.eq('shift', shift)
            }

            // Filter by date range
            if (startDate) {
                query = query.gte('reservation_time', startDate)
            }
            if (endDate) {
                query = query.lte('reservation_time', endDate)
            }

            const { data, error } = await query
            if (error) throw error
            return data as Reservation[]
        }
    })
}

export function useReservationMutations() {
    const queryClient = useQueryClient()

    const createReservation = useMutation({
        mutationFn: async (newRes: Omit<Reservation, 'id' | 'created_at'>) => {
            const { data, error } = await supabase
                .from('reservations')
                .insert(newRes)
                .select()
                .single()
            if (error) throw error
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['reservations'] })
        }
    })

    const updateReservation = useMutation({
        mutationFn: async ({ id, updates }: { id: number, updates: Partial<Reservation> }) => {
            const { data, error } = await supabase
                .from('reservations')
                .update(updates)
                .eq('id', id)
                .select()
                .single()
            if (error) throw error
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['reservations'] })
        }
    })

    return { createReservation, updateReservation }
}
