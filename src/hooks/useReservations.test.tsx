import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useReservations, useReservationMutations } from './useReservations'
import { supabase } from '../lib/supabaseClient'

// Mock Supabase
vi.mock('../lib/supabaseClient', () => ({
    supabase: {
        from: vi.fn(),
    }
}))

const createWrapper = () => {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } }
    })
    return ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client= { queryClient } >
        { children }
        </QueryClientProvider>
    )
}

describe('useReservations', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('fetches reservations correctly', async () => {
        const mockData = [{ id: 1, customer_name: 'John Doe', pax: 2 }]

        // Setup complex mock chain: from().select().order()
        const orderMock = vi.fn().mockResolvedValue({ data: mockData, error: null })
        const selectMock = vi.fn().mockReturnValue({ order: orderMock })
        vi.mocked(supabase.from).mockReturnValue({ select: selectMock } as any)

        const { result } = renderHook(() => useReservations(), { wrapper: createWrapper() })

        await waitFor(() => expect(result.current.isSuccess).toBe(true))

        expect(result.current.data).toEqual(mockData)
        expect(supabase.from).toHaveBeenCalledWith('reservations')
        expect(selectMock).toHaveBeenCalledWith('*')
        expect(orderMock).toHaveBeenCalledWith('reservation_time', { ascending: true })
    })
})

describe('useReservationMutations', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('creates a reservation successfully', async () => {
        const mockNewRes = { customer_name: 'Jane', pax: 4, shift: 'dinner' as const, status: 'pending' as const, reservation_time: '2026-01-01T20:00:00Z', table_id: null }
        const mockResponse = { id: 2, ...mockNewRes, created_at: 'now' }

        // from().insert().select().single()
        const singleMock = vi.fn().mockResolvedValue({ data: mockResponse, error: null })
        const selectMock = vi.fn().mockReturnValue({ single: singleMock })
        const insertMock = vi.fn().mockReturnValue({ select: selectMock })
        vi.mocked(supabase.from).mockReturnValue({ insert: insertMock } as any)

        const { result } = renderHook(() => useReservationMutations(), { wrapper: createWrapper() })

        let mutationResult: any
        await result.current.createReservation.mutateAsync(mockNewRes).then(data => {
            mutationResult = data
        })

        expect(mutationResult).toEqual(mockResponse)
        expect(supabase.from).toHaveBeenCalledWith('reservations')
        expect(insertMock).toHaveBeenCalledWith(mockNewRes)
    })
})
