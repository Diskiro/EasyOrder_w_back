import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';

export interface Category {
    id: number;
    name: string;
    type: string; // Required by DB (e.g. 'food', 'drink')
    sort_order: number;
}

export interface Product {
    id: number;
    category_id: number;
    name: string;
    description: string;
    price: number;
    image_url: string;
    stock_status: string;
    is_active: boolean;
}

export function useCategories() {
    return useQuery({
        queryKey: ['categories'],
        queryFn: async () => {
            return await apiFetch('/menu/categories') as Category[];
        }
    });
}

export function useProducts() {
    return useQuery({
        queryKey: ['products'],
        queryFn: async () => {
            return await apiFetch('/menu/products') as Product[];
        }
    });
}

export function useProductMutations() {
    const queryClient = useQueryClient();

    const createProduct = useMutation({
        mutationFn: async (newProduct: Omit<Product, 'id'>) => {
            return await apiFetch('/menu/products', {
                method: 'POST',
                body: JSON.stringify(newProduct)
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
        }
    });

    const updateProduct = useMutation({
        mutationFn: async ({ id, updates }: { id: number, updates: Partial<Product> }) => {
            return await apiFetch(`/menu/products/${id}`, {
                method: 'PATCH',
                body: JSON.stringify(updates)
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
        }
    });

    const deleteProduct = useMutation({
        mutationFn: async (id: number) => {
            return await apiFetch(`/menu/products/${id}`, { method: 'DELETE' });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
        }
    });

    return { createProduct, updateProduct, deleteProduct };
}

export function useCategoryMutations() {
    const queryClient = useQueryClient();

    const createCategory = useMutation({
        mutationFn: async (newCategory: Omit<Category, 'id'>) => {
            return await apiFetch('/menu/categories', {
                method: 'POST',
                body: JSON.stringify(newCategory)
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
        }
    });

    const deleteCategory = useMutation({
        mutationFn: async (id: number) => {
            return await apiFetch(`/menu/categories/${id}`, { method: 'DELETE' });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
        }
    });

    const updateCategory = useMutation({
        mutationFn: async ({ id, updates }: { id: number, updates: Partial<Category> }) => {
            return await apiFetch(`/menu/categories/${id}`, {
                method: 'PATCH',
                body: JSON.stringify(updates)
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
        }
    });

    return { createCategory, updateCategory, deleteCategory };
}
