import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabaseClient'
import type { Table } from './useTables'
import type { Product } from './useMenu'

export interface OrderItem {
    id: number
    order_id: number
    product_id: number
    quantity: number
    unit_price: number
    is_ready?: boolean
    notes?: string
    product?: Product
}

export interface Order {
    id: number
    table_id: number
    server_id: string
    status: 'pending' | 'cooking' | 'ready' | 'delivered' | 'completed' | 'cancelled'
    total_amount: number
    created_at: string
    table?: Table
    order_items?: OrderItem[]
}

export function useActiveOrders() {
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
                    await supabase
                        .from('orders')
                        .update({ status: 'completed' })
                        .eq('table_id', order.table_id)
                        .neq('status', 'cancelled')
                        .neq('status', 'completed')

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
        mutationFn: async ({ orderId, items }: { orderId: number, items: { productId: number, quantity: number, price: number, notes?: string }[] }) => {
            const total = items.reduce((acc, item) => acc + (item.price * item.quantity), 0)

            // 1. Fetch existing items and order status
            const [{ data: existingItems, error: fetchError }, { data: orderData, error: orderFetchError }] = await Promise.all([
                supabase.from('order_items').select('*').eq('order_id', orderId),
                supabase.from('orders').select('status').eq('id', orderId).single()
            ])

            if (fetchError) throw fetchError
            if (orderFetchError) throw orderFetchError

            const currentStatus = orderData?.status
            let needsKitchenAttention = false

            const existingMap = new Map(existingItems?.map(item => [item.product_id, item]) || [])
            const incomingProductIds = new Set(items.map(item => item.productId))

            // 2. Identify items to DELETE (were in existing, but not in incoming)
            const idsToDelete = (existingItems || [])
                .filter(item => !incomingProductIds.has(item.product_id))
                .map(item => item.id)

            if (idsToDelete.length > 0) {
                const { error: deleteError } = await supabase
                    .from('order_items')
                    .delete()
                    .in('id', idsToDelete)
                if (deleteError) throw deleteError
            }

            // 3. Identify items to UPSERT (update or insert)
            for (const item of items) {
                const existing = existingMap.get(item.productId)

                if (existing) {
                    // Update existing item
                    // If quantity increased, it means new items were added, so it's no longer fully "ready"
                    const isQuantityIncreased = item.quantity > existing.quantity

                    if (isQuantityIncreased) {
                        needsKitchenAttention = true
                    }

                    const { error: updateError } = await supabase
                        .from('order_items')
                        .update({
                            quantity: item.quantity,
                            unit_price: item.price,
                            is_ready: isQuantityIncreased ? false : existing.is_ready, // Reset if increased
                            notes: item.notes || null // clear if undefined/empty
                        })
                        .eq('id', existing.id)

                    if (updateError) throw updateError
                } else {
                    // Insert new item
                    needsKitchenAttention = true

                    const { error: insertError } = await supabase
                        .from('order_items')
                        .insert({
                            order_id: orderId,
                            product_id: item.productId,
                            quantity: item.quantity,
                            unit_price: item.price,
                            is_ready: false,
                            notes: item.notes || null
                        })

                    if (insertError) throw insertError
                }
            }

            // 4. Update the total amount on the order and status if needed
            const updatePayload: any = { total_amount: total }

            if (needsKitchenAttention && (currentStatus === 'ready' || currentStatus === 'delivered')) {
                updatePayload.status = 'cooking'
            }

            const { error: updateOrderError } = await supabase
                .from('orders')
                .update(updatePayload)
                .eq('id', orderId)

            if (updateOrderError) throw updateOrderError
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['orders'] })
            queryClient.invalidateQueries({ queryKey: ['tables'] })
        }
    })
}

export function useUpdateOrderItemReady() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ itemId, isReady, orderId }: { itemId: number, isReady: boolean, orderId: number }) => {
            const { error } = await supabase
                .from('order_items')
                .update({ is_ready: isReady })
                .eq('id', itemId)

            if (error) throw error

            // Check if all items in the order are now ready
            const { data: allItems, error: fetchError } = await supabase
                .from('order_items')
                .select('is_ready')
                .eq('order_id', orderId)

            if (!fetchError && allItems && allItems.length > 0) {
                const isAllReady = allItems.every(item => item.is_ready)

                if (isAllReady) {
                    await supabase
                        .from('orders')
                        .update({ status: 'ready' })
                        .eq('id', orderId)
                } else if (!isReady) {
                    // If an item is unchecked, ensure the order is set to 'cooking' if it was accidentally marked ready earlier
                    await supabase
                        .from('orders')
                        .update({ status: 'cooking' })
                        .eq('id', orderId)
                }
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['orders'] })
            queryClient.invalidateQueries({ queryKey: ['tables'] })
        }
    })
}

export function useOrderMutation() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ tableId, serverId, items }: { tableId: number, serverId: string, items: { productId: number, quantity: number, price: number, notes?: string }[] }) => {
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

            const orderItems = items.map(item => ({
                order_id: order.id,
                product_id: item.productId,
                quantity: item.quantity,
                unit_price: item.price,
                notes: item.notes || null
            }))

            const { error: itemsError } = await supabase
                .from('order_items')
                .insert(orderItems)

            if (itemsError) throw itemsError

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
