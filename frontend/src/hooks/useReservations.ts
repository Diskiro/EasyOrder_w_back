import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../lib/api'

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
            const params = new URLSearchParams()
            if (shift) params.append('shift', shift)
            if (startDate) params.append('startDate', startDate)
            if (endDate) params.append('endDate', endDate)

            const queryString = params.toString() ? `?${params.toString()}` : ''
            const data = await apiFetch(`/reservations${queryString}`)
            return data as Reservation[]
        }
    })
}

export function useReservationMutations() {
    const queryClient = useQueryClient()

    const createReservation = useMutation({
        mutationFn: async (newRes: Omit<Reservation, 'id' | 'created_at'>) => {
            const data = await apiFetch('/reservations', {
                method: 'POST',
                body: JSON.stringify(newRes)
            })
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['reservations'] })
        }
    })

    const updateReservation = useMutation({
        mutationFn: async ({ id, updates }: { id: number, updates: Partial<Reservation> }) => {
            const data = await apiFetch(`/reservations/${id}`, {
                method: 'PATCH',
                body: JSON.stringify(updates)
            })
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['reservations'] })
        }
    })

    return { createReservation, updateReservation }
}
