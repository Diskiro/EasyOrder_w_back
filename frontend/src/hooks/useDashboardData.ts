import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '../lib/api'
import { format, subDays, isSameDay, getHours } from 'date-fns'
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
            const data = await apiFetch(`/analytics/dashboard?timeRange=${timeRange}`)
            const today = new Date()

            // --- Process Chart Data (Format dates on client) ---
            let chartData: ChartDataPoint[] = []

            if (timeRange === 'day') {
                // Hourly grouping for today
                for (let i = 0; i < 24; i++) {
                    const hourLabel = `${i}:00`
                    const hourOrders = data.chartOrders?.filter((o: any) => getHours(new Date(o.created_at)) === i)
                    const hourTotal = hourOrders?.reduce((sum: number, o: any) => sum + (o.total_amount || 0), 0) || 0

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
                    const dayOrders = data.chartOrders?.filter((o: any) => isSameDay(new Date(o.created_at), d))
                    const dailyTotal = dayOrders?.reduce((sum: number, o: any) => sum + (o.total_amount || 0), 0) || 0

                    chartData.push({
                        date: format(d, 'EEE d', { locale: es }),
                        amount: dailyTotal,
                        orders: dayOrders?.length || 0
                    })
                }
            }

            return { stats: data.stats, chartData }
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
