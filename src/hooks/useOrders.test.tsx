import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useActiveOrders, useUpdateOrderStatus } from './useOrders'
import { supabase } from '../lib/supabaseClient'

vi.mock('../lib/supabaseClient', () => {
    return {
        supabase: {
            from: vi.fn(),
            channel: vi.fn().mockReturnValue({
                on: vi.fn().mockReturnThis(),
                subscribe: vi.fn().mockReturnThis()
            }),
            removeChannel: vi.fn()
        }
    }
})

const createWrapper = () => {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } }
    })
    return ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    )
}

describe('useOrders', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('fetches active orders and mounts realtime subscriptions', async () => {
        const mockData = [{ id: 1, status: 'pending' }]

        const orderMock = vi.fn().mockResolvedValue({ data: mockData, error: null })
        const neqMock2 = vi.fn().mockReturnValue({ order: orderMock })
        const neqMock1 = vi.fn().mockReturnValue({ neq: neqMock2 })
        const selectMock = vi.fn().mockReturnValue({ neq: neqMock1 })
        vi.mocked(supabase.from).mockReturnValue({ select: selectMock } as any)

        const { result, unmount } = renderHook(() => useActiveOrders(), { wrapper: createWrapper() })

        await waitFor(() => expect(result.current.isSuccess).toBe(true))

        expect(result.current.data).toEqual(mockData)
        expect(supabase.from).toHaveBeenCalledWith('orders')
        expect(supabase.channel).toHaveBeenCalledWith('active-orders-channel')

        unmount()
        expect(supabase.removeChannel).toHaveBeenCalled()
    })
})

describe('useOrderMutations', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('updates order status correctly', async () => {
        const eqMock = vi.fn().mockResolvedValue({ error: null })
        const updateMock = vi.fn().mockReturnValue({ eq: eqMock })
        vi.mocked(supabase.from).mockReturnValue({ update: updateMock } as any)

        const { result } = renderHook(() => useUpdateOrderStatus(), { wrapper: createWrapper() })

        await result.current.mutateAsync({ orderId: 10, status: 'cooking' })

        expect(supabase.from).toHaveBeenCalledWith('orders')
        expect(updateMock).toHaveBeenCalledWith({ status: 'cooking' })
        expect(eqMock).toHaveBeenCalledWith('id', 10)
    })
})
