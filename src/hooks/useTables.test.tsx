import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useTables, useTableMutations } from './useTables'
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

describe('useTables', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('fetches tables and subscribes to realtime', async () => {
        const mockData = [{ id: 1, number: '1', status: 'available' }]

        const orderMock = vi.fn().mockResolvedValue({ data: mockData, error: null })
        const selectMock = vi.fn().mockReturnValue({ order: orderMock })
        vi.mocked(supabase.from).mockReturnValue({ select: selectMock } as any)

        const { result, unmount } = renderHook(() => useTables(), { wrapper: createWrapper() })

        await waitFor(() => expect(result.current.isSuccess).toBe(true))

        expect(result.current.data).toEqual(mockData)
        expect(supabase.from).toHaveBeenCalledWith('tables')
        expect(supabase.channel).toHaveBeenCalledWith('tables-sync')

        unmount()
        expect(supabase.removeChannel).toHaveBeenCalled()
    })
})

describe('useTableMutations', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('creates a table successfully', async () => {
        const mockResponse = { id: 2, number: '2', status: 'available' }
        const singleMock = vi.fn().mockResolvedValue({ data: mockResponse, error: null })
        const selectMock = vi.fn().mockReturnValue({ single: singleMock })
        const insertMock = vi.fn().mockReturnValue({ select: selectMock })
        vi.mocked(supabase.from).mockReturnValue({ insert: insertMock } as any)

        const { result } = renderHook(() => useTableMutations(), { wrapper: createWrapper() })

        const mutationResult = await result.current.createTable.mutateAsync({ number: '2', capacity: 4 } as any)

        expect(mutationResult).toEqual(mockResponse)
        expect(supabase.from).toHaveBeenCalledWith('tables')
    })
})
