import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useCashRegister, useCashRegisterMutations } from './useCashRegister'
import { supabase } from '../lib/supabaseClient'

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
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    )
}

describe('useCashRegister', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('fetches the latest cash register session', async () => {
        const mockData = { id: 1, opened_by: 'user-id', start_amount: 100 }

        // Mock chain: from().select().order().limit().maybeSingle()
        const singleMock = vi.fn().mockResolvedValue({ data: mockData, error: null })
        const limitMock = vi.fn().mockReturnValue({ maybeSingle: singleMock })
        const orderMock = vi.fn().mockReturnValue({ limit: limitMock })
        const selectMock = vi.fn().mockReturnValue({ order: orderMock })
        vi.mocked(supabase.from).mockReturnValue({ select: selectMock } as any)

        const { result } = renderHook(() => useCashRegister(), { wrapper: createWrapper() })

        await waitFor(() => expect(result.current.isSuccess).toBe(true))

        expect(result.current.data).toEqual(mockData)
        expect(supabase.from).toHaveBeenCalledWith('cash_register_sessions')
        expect(selectMock).toHaveBeenCalledWith('*')
        expect(orderMock).toHaveBeenCalledWith('opened_at', { ascending: false })
    })
})

describe('useCashRegisterMutations', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('opens a session successfully', async () => {
        const mockResponse = { id: 2, start_amount: 200 }

        const singleMock = vi.fn().mockResolvedValue({ data: mockResponse, error: null })
        const selectMock = vi.fn().mockReturnValue({ single: singleMock })
        const insertMock = vi.fn().mockReturnValue({ select: selectMock })
        vi.mocked(supabase.from).mockReturnValue({ insert: insertMock } as any)

        const { result } = renderHook(() => useCashRegisterMutations(), { wrapper: createWrapper() })

        const mutationResult = await result.current.openSession.mutateAsync({ startAmount: 200, userId: 'u1' })

        expect(mutationResult).toEqual(mockResponse)
        expect(supabase.from).toHaveBeenCalledWith('cash_register_sessions')
        expect(insertMock).toHaveBeenCalled()
    })

    it('closes a session successfully', async () => {
        const mockResponse = { id: 1, end_amount: 300 }

        const singleMock = vi.fn().mockResolvedValue({ data: mockResponse, error: null })
        const selectMock = vi.fn().mockReturnValue({ single: singleMock })
        const eqMock = vi.fn().mockReturnValue({ select: selectMock })
        const updateMock = vi.fn().mockReturnValue({ eq: eqMock })
        vi.mocked(supabase.from).mockReturnValue({ update: updateMock } as any)

        const { result } = renderHook(() => useCashRegisterMutations(), { wrapper: createWrapper() })

        const mutationResult = await result.current.closeSession.mutateAsync({ id: 1, endAmount: 300, userId: 'u2' })

        expect(mutationResult).toEqual(mockResponse)
        expect(supabase.from).toHaveBeenCalledWith('cash_register_sessions')
        expect(updateMock).toHaveBeenCalled()
        expect(eqMock).toHaveBeenCalledWith('id', 1)
    })
})
