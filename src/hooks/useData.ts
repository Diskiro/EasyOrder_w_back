import { useEffect } from 'react'
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

export interface Table {
    id: number
    number: string
    capacity: number
    status: 'available' | 'occupied'
    current_order_id: number | null
}

export interface OrderItem {
    id: number
    order_id: number
    product_id: number
    quantity: number
    unit_price: number
    notes?: string // Added
    product?: Product // Joined
}

export interface Order {
    id: number
    table_id: number
    server_id: string
    status: 'pending' | 'cooking' | 'ready' | 'delivered' | 'completed' | 'cancelled'
    total_amount: number
    created_at: string
    table?: Table // Joined
    order_items?: OrderItem[] // Joined
}

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
            const { data, error } = await supabase
                .from('cash_register_sessions')
                .select('*')
                .order('opened_at', { ascending: false })
                .limit(1)
                .maybeSingle()

            if (error) throw error
            return data as CashRegisterSession | null
        }
    })
}

export function useCashRegisterMutations() {
    const queryClient = useQueryClient()

    const openSession = useMutation({
        mutationFn: async ({ startAmount, userId }: { startAmount: number, userId: string }) => {
            const { data, error } = await supabase
                .from('cash_register_sessions')
                .insert({
                    opened_by: userId,
                    start_amount: startAmount,
                    opened_at: new Date().toISOString()
                })
                .select()
                .single()
            if (error) throw error
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cash_register_session'] })
        }
    })

    const closeSession = useMutation({
        mutationFn: async ({ id, endAmount, notes, userId }: { id: number, endAmount: number, notes?: string, userId: string }) => {
            const { data, error } = await supabase
                .from('cash_register_sessions')
                .update({
                    closed_by: userId,
                    end_amount: endAmount,
                    closed_at: new Date().toISOString(),
                    notes: notes
                })
                .eq('id', id)
                .select()
                .single()
            if (error) throw error
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cash_register_session'] })
        }
    })

    return { openSession, closeSession }
}

export function useTables() {
    const queryClient = useQueryClient()

    useEffect(() => {
        const channel = supabase
            .channel('tables-sync')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'tables' },
                () => {
                    queryClient.invalidateQueries({ queryKey: ['tables'] })
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [queryClient])

    return useQuery({
        queryKey: ['tables'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('tables')
                .select('*')
                .order('number')
            if (error) throw error
            return data as Table[]
        }
    })
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

// --- Mutations ---

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


export function useOrderMutation() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ tableId, serverId, items }: { tableId: number, serverId: string, items: { productId: number, quantity: number, price: number }[] }) => {
            // 1. Create Order
            const total = items.reduce((acc, item) => acc + (item.price * item.quantity), 0)

            const { data: order, error: orderError } = await supabase
                .from('orders')
                .insert({
                    table_id: tableId,
                    server_id: serverId,
                    status: 'pending',
                    total_amount: total
                })
                .select()
                .single()

            if (orderError) throw orderError

            // 2. Create Order Items
            const orderItems = items.map(item => ({
                order_id: order.id,
                product_id: item.productId,
                quantity: item.quantity,
                unit_price: item.price
            }))

            const { error: itemsError } = await supabase
                .from('order_items')
                .insert(orderItems)

            if (itemsError) throw itemsError

            // 3. Update Table Status
            await supabase
                .from('tables')
                .update({ status: 'occupied', current_order_id: order.id })
                .eq('id', tableId)

            return order
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tables'] })
            queryClient.invalidateQueries({ queryKey: ['orders'] })
        }
    })
}

export function useTableMutations() {
    const queryClient = useQueryClient()

    const createTable = useMutation({
        mutationFn: async (newTable: Omit<Table, 'id' | 'current_order_id' | 'status'>) => {
            const { data, error } = await supabase
                .from('tables')
                .insert({ ...newTable, status: 'available' })
                .select()
                .single()
            if (error) throw error
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tables'] })
        }
    })

    const updateTable = useMutation({
        mutationFn: async ({ id, updates }: { id: number, updates: Partial<Table> }) => {
            const { data, error } = await supabase
                .from('tables')
                .update(updates)
                .eq('id', id)
                .select()
                .single()
            if (error) throw error
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tables'] })
        }
    })

    const deleteTable = useMutation({
        mutationFn: async (id: number) => {
            const { error } = await supabase
                .from('tables')
                .delete()
                .eq('id', id)
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tables'] })
        }
    })

    return { createTable, updateTable, deleteTable }
}

export function useActiveOrders() {
    const queryClient = useQueryClient()

    // Setup Supabase Realtime Subscription
    useEffect(() => {
        console.log('Setting up Realtime subscription for orders...')
        const channel = supabase
            .channel('active-orders-channel')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'orders' },
                (payload) => {
                    console.log('Realtime Order Update:', payload)
                    queryClient.invalidateQueries({ queryKey: ['orders'] })
                    queryClient.invalidateQueries({ queryKey: ['tables'] })
                }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'order_items' },
                (payload) => {
                    console.log('Realtime OrderItem Update:', payload)
                    queryClient.invalidateQueries({ queryKey: ['orders'] })
                }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'tables' },
                (payload) => {
                    console.log('Realtime Table Update:', payload)
                    queryClient.invalidateQueries({ queryKey: ['tables'] })
                    // Optional: Invalidate orders too if table logic affects it, but usually tables query is enough
                    queryClient.invalidateQueries({ queryKey: ['orders'] })
                }
            )
            .subscribe()

        return () => {
            console.log('Cleaning up subscription...')
            supabase.removeChannel(channel)
        }
    }, [queryClient])

    // Extra robust: Refetch when window regains focus (Handle "tab change" explicitly)
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                queryClient.invalidateQueries({ queryKey: ['orders'] })
                queryClient.invalidateQueries({ queryKey: ['tables'] })
            }
        }

        document.addEventListener('visibilitychange', handleVisibilityChange)
        window.addEventListener('focus', handleVisibilityChange) // Also listen to focus

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange)
            window.removeEventListener('focus', handleVisibilityChange)
        }
    }, [queryClient])

    return useQuery({
        queryKey: ['orders', 'active'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('orders')
                .select(`
                    *,
                    table:tables(*),
                    order_items:order_items(*, product:products(*))
                `)
                .neq('status', 'completed')
                .neq('status', 'cancelled')
                .order('created_at', { ascending: true })

            if (error) throw error
            return data as Order[]
        }
        // refetchInterval REMOVED to save costs
    })
}

export function useUpdateOrderStatus() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ orderId, status }: { orderId: number, status: Order['status'] }) => {
            const { error } = await supabase
                .from('orders')
                .update({ status })
                .eq('id', orderId)

            if (error) throw error

            // If completing (Payment), we want to close ALL orders for this table (Unified Bill)
            if (status === 'completed') {
                const { data: order } = await supabase.from('orders').select('table_id').eq('id', orderId).single()

                if (order) {
                    // 1. Mark ALL active orders for this table as completed
                    await supabase
                        .from('orders')
                        .update({ status: 'completed' })
                        .eq('table_id', order.table_id)
                        .neq('status', 'cancelled')
                        .neq('status', 'completed')

                    // 2. Free the table immediately
                    await supabase
                        .from('tables')
                        .update({ status: 'available', current_order_id: null })
                        .eq('id', order.table_id)
                }
            }
            // If cancelling, we only free table if it was the LAST active order
            else if (status === 'cancelled') {
                const { data: order } = await supabase.from('orders').select('table_id').eq('id', orderId).single()

                if (order) {
                    const { count } = await supabase
                        .from('orders')
                        .select('id', { count: 'exact', head: true })
                        .eq('table_id', order.table_id)
                        .neq('status', 'completed')
                        .neq('status', 'cancelled')
                        .neq('id', orderId)

                    if (count === 0) {
                        await supabase
                            .from('tables')
                            .update({ status: 'available', current_order_id: null })
                            .eq('id', order.table_id)
                    }
                }
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['orders'] })
            queryClient.invalidateQueries({ queryKey: ['tables'] })
        }
    })
}

export function useUpdateOrderItems() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ orderId, items }: { orderId: number, items: { productId: number, quantity: number, price: number }[] }) => {
            // 1. Calculate new total
            const total = items.reduce((acc, item) => acc + (item.price * item.quantity), 0)

            // 2. Delete ALL existing items for this order (Simple "Reset" approach)
            const { error: deleteError } = await supabase
                .from('order_items')
                .delete()
                .eq('order_id', orderId)

            if (deleteError) throw deleteError

            // 3. Insert NEW items
            if (items.length > 0) {
                const orderItems = items.map(item => ({
                    order_id: orderId,
                    product_id: item.productId,
                    quantity: item.quantity,
                    unit_price: item.price
                }))

                const { error: insertError } = await supabase
                    .from('order_items')
                    .insert(orderItems)

                if (insertError) throw insertError
            }

            // 4. Update Order Total
            const { error: updateError } = await supabase
                .from('orders')
                .update({ total_amount: total })
                .eq('id', orderId)

            if (updateError) throw updateError
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['orders'] })
            queryClient.invalidateQueries({ queryKey: ['tables'] })
        }
    })
}
