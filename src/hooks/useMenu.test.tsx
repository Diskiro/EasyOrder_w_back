import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useCategories, useProducts, useCategoryMutations, useProductMutations } from './useMenu'
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

describe('useMenu Queries', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('fetches categories correctly', async () => {
        const mockData = [{ id: 1, name: 'Food' }]

        const orderMock = vi.fn().mockResolvedValue({ data: mockData, error: null })
        const eqMock = vi.fn().mockReturnValue({ order: orderMock })
        const selectMock = vi.fn().mockReturnValue({ eq: eqMock })
        vi.mocked(supabase.from).mockReturnValue({ select: selectMock } as any)

        const { result } = renderHook(() => useCategories(), { wrapper: createWrapper() })
        await waitFor(() => expect(result.current.isSuccess).toBe(true))

        expect(result.current.data).toEqual(mockData)
        expect(supabase.from).toHaveBeenCalledWith('categories')
        expect(selectMock).toHaveBeenCalledWith('*')
        expect(eqMock).toHaveBeenCalledWith('is_active', true)
    })

    it('fetches products correctly', async () => {
        const mockData = [{ id: 10, name: 'Burger' }]

        const orderMock = vi.fn().mockResolvedValue({ data: mockData, error: null })
        const selectMock = vi.fn().mockReturnValue({ order: orderMock })
        vi.mocked(supabase.from).mockReturnValue({ select: selectMock } as any)

        const { result } = renderHook(() => useProducts(), { wrapper: createWrapper() })
        await waitFor(() => expect(result.current.isSuccess).toBe(true))

        expect(result.current.data).toEqual(mockData)
        expect(supabase.from).toHaveBeenCalledWith('products')
    })
})

describe('useMenu Mutations', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('deletes a product successfully', async () => {
        const eqMock = vi.fn().mockResolvedValue({ error: null })
        const deleteMock = vi.fn().mockReturnValue({ eq: eqMock })
        vi.mocked(supabase.from).mockReturnValue({ delete: deleteMock } as any)

        const { result } = renderHook(() => useProductMutations(), { wrapper: createWrapper() })

        await result.current.deleteProduct.mutateAsync(5)

        expect(supabase.from).toHaveBeenCalledWith('products')
        expect(deleteMock).toHaveBeenCalled()
        expect(eqMock).toHaveBeenCalledWith('id', 5)
    })

    it('creates a category successfully', async () => {
        const mockNewCat = { name: 'Drinks', type: 'drink', sort_order: 1 }
        const mockResponse = { id: 2, ...mockNewCat }

        const singleMock = vi.fn().mockResolvedValue({ data: mockResponse, error: null })
        const selectMock = vi.fn().mockReturnValue({ single: singleMock })
        const insertMock = vi.fn().mockReturnValue({ select: selectMock })
        vi.mocked(supabase.from).mockReturnValue({ insert: insertMock } as any)

        const { result } = renderHook(() => useCategoryMutations(), { wrapper: createWrapper() })

        const mutationResult = await result.current.createCategory.mutateAsync(mockNewCat)

        expect(mutationResult).toEqual(mockResponse)
        expect(supabase.from).toHaveBeenCalledWith('categories')
        expect(insertMock).toHaveBeenCalledWith(mockNewCat)
    })
})
