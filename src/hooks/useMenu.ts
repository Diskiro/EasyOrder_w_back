import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabaseClient'

export interface Category {
    id: number
    name: string
    type: string // Required by DB (e.g. 'food', 'drink')
    sort_order: number
}

export interface Product {
    id: number
    category_id: number
    name: string
    description: string
    price: number
    image_url: string
    stock_status: string
    is_active: boolean // Added missing field
}

export function useCategories() {
    return useQuery({
        queryKey: ['categories'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('categories')
                .select('*')
                .eq('is_active', true)
                .order('sort_order')
            if (error) throw error
            return data as Category[]
        }
    })
}

export function useProducts() {
    return useQuery({
        queryKey: ['products'],
        queryFn: async () => {
            // Fetch ALL products so Admin can manage them.
            // UI should filter for non-admins if needed, or use a separate hook.
            const { data, error } = await supabase
                .from('products')
                .select('*')
                .order('name')

            if (error) throw error
            return data as Product[]
        }
    })
}

export function useProductMutations() {
    const queryClient = useQueryClient()

    const createProduct = useMutation({
        mutationFn: async (newProduct: Omit<Product, 'id'>) => {
            const { data, error } = await supabase
                .from('products')
                .insert(newProduct)
                .select()
                .single()
            if (error) throw error
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] })
        }
    })

    const updateProduct = useMutation({
        mutationFn: async ({ id, updates }: { id: number, updates: Partial<Product> }) => {
            const { data, error } = await supabase
                .from('products')
                .update(updates)
                .eq('id', id)
                .select()
                .single()
            if (error) throw error
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] })
        }
    })

    const deleteProduct = useMutation({
        mutationFn: async (id: number) => {
            const { error } = await supabase
                .from('products')
                .delete()
                .eq('id', id)
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] })
        }
    })

    return { createProduct, updateProduct, deleteProduct }
}

export function useCategoryMutations() {
    const queryClient = useQueryClient()

    const createCategory = useMutation({
        mutationFn: async (newCategory: Omit<Category, 'id'>) => {
            const { data, error } = await supabase
                .from('categories')
                .insert(newCategory)
                .select()
                .single()
            if (error) throw error
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] })
        }
    })

    const deleteCategory = useMutation({
        mutationFn: async (id: number) => {
            const { error } = await supabase
                .from('categories')
                .delete()
                .eq('id', id)
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] })
        }
    })

    const updateCategory = useMutation({
        mutationFn: async ({ id, updates }: { id: number, updates: Partial<Category> }) => {
            const { data, error } = await supabase
                .from('categories')
                .update(updates)
                .eq('id', id)
                .select()
                .single()
            if (error) throw error
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] })
        }
    })

    return { createCategory, updateCategory, deleteCategory }
}
