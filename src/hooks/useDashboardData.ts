import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabaseClient'
import { format, subDays, startOfDay, endOfDay, isSameDay, getHours } from 'date-fns'
import { es } from 'date-fns/locale'

export interface DashboardStats {
    totalSales: number
    activeOrders: number
    totalProducts: number
    totalStaff: number
}

export interface ChartDataPoint {
    date: string
    amount: number
    orders: number
}

export type TimeRange = 'day' | 'week' | 'month'

export const useDashboardData = (timeRange: TimeRange) => {
    return useQuery({
        queryKey: ['admin-dashboard', timeRange],
        queryFn: async () => {
            const today = new Date()
            const startOfToday = startOfDay(today).toISOString()
            const endOfToday = endOfDay(today).toISOString()

            // Define fetch range based on selection
            let fetchStart = subDays(today, 7).toISOString() // Default week
            if (timeRange === 'day') fetchStart = startOfToday
            if (timeRange === 'month') fetchStart = subDays(today, 30).toISOString()

            // Parallelize all 5 Independent Queries to avoid waterfall latency
            const [
                { data: todaysOrders, error: ordersError },
                { count: activeOrdersCount, error: activeError },
                { count: productsCount, error: productsError },
                { count: staffCount, error: staffError },
                { data: chartOrders, error: chartError }
            ] = await Promise.all([
                supabase
                    .from('orders')
                    .select('total_amount, status, created_at')
                    .gte('created_at', startOfToday)
                    .lte('created_at', endOfToday),
                supabase
                    .from('orders')
                    .select('*', { count: 'exact', head: true })
                    .in('status', ['pending', 'cooking', 'ready']),
                supabase
                    .from('products')
                    .select('*', { count: 'exact', head: true })
                    .eq('is_active', true),
                supabase
                    .from('profiles')
                    .select('*', { count: 'exact', head: true }),
                supabase
                    .from('orders')
                    .select('total_amount, created_at')
                    .gte('created_at', fetchStart)
                    .lte('created_at', endOfToday)
                    .order('created_at', { ascending: true })
            ])

            if (ordersError) throw ordersError
            if (activeError) throw activeError
            if (productsError) throw productsError
            if (staffError) throw staffError
            if (chartError) throw chartError

            // --- Process Stats ---
            const totalSalesToday = todaysOrders?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0

            const stats: DashboardStats = {
                totalSales: totalSalesToday,
                activeOrders: activeOrdersCount || 0,
                totalProducts: productsCount || 0,
                totalStaff: staffCount || 0
            }

            // --- Process Chart Data ---
            let chartData: ChartDataPoint[] = []

            if (timeRange === 'day') {
                // Hourly grouping for today
                for (let i = 0; i < 24; i++) {
                    const hourLabel = `${i}:00`
                    const hourOrders = chartOrders?.filter(o => getHours(new Date(o.created_at)) === i)
                    const hourTotal = hourOrders?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0

                    chartData.push({
                        date: hourLabel,
                        amount: hourTotal,
                        orders: hourOrders?.length || 0
                    })
                }
            } else {
                // Daily grouping for week/month
                const daysBack = timeRange === 'week' ? 6 : 29
                for (let i = daysBack; i >= 0; i--) {
                    const d = subDays(today, i)
                    const dayOrders = chartOrders?.filter(o => isSameDay(new Date(o.created_at), d))
                    const dailyTotal = dayOrders?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0

                    chartData.push({
                        date: format(d, 'EEE d', { locale: es }),
                        amount: dailyTotal,
                        orders: dayOrders?.length || 0
                    })
                }
            }

            return { stats, chartData }
        },
        refetchOnWindowFocus: false, // Disable refetch on tab switch
        refetchInterval: () => {
            const hour = new Date().getHours()
            // Only refresh between 10 AM (10) and 10 PM (22)
            if (hour >= 10 && hour < 22) {
                return 60 * 60 * 1000 // 1 hour
            }
            return false // Stop refreshing outside hours
        }
    })
}
