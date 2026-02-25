import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabaseClient'
import {
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    AreaChart, Area
} from 'recharts'
import {
    TrendingUp, Users, ShoppingBag, DollarSign,
    Calendar, ArrowUpRight, ArrowDownRight, Activity
} from 'lucide-react'
import { format, subDays, startOfDay, endOfDay, isSameDay, getHours } from 'date-fns'
import { es } from 'date-fns/locale'

// --- Interfaces ---
interface DashboardStats {
    totalSales: number
    activeOrders: number
    totalProducts: number
    totalStaff: number
}

interface ChartDataPoint {
    date: string
    amount: number
    orders: number
}

type TimeRange = 'day' | 'week' | 'month'

// --- Data Fetching ---
const useDashboardData = (timeRange: TimeRange) => {
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

            // 1. Fetch Stats Data (Always for today mostly, but let's keep stats real-time for Today)
            // Note: The top cards usually show "Today's Status", regardless of the chart filter.
            // We will keep the stats queries focused on "Right Now" / "Today".

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

// --- Components ---

function StatCard({ title, value, icon: Icon, color, trend }: any) {
    return (
        <div className="bg-[#1F2329] p-6 rounded-2xl border border text-gray-200 border-gray-800 shadow-sm relative overflow-hidden group">
            <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity ${color}`}>
                <Icon size={64} />
            </div>
            <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-xl bg-opacity-10 ${color} bg-white`}>
                    <Icon size={24} className={color.replace('bg-', 'text-')} />
                </div>
                {trend && (
                    <div className={`flex items-center text-xs font-bold ${trend >= 0 ? 'text-green-500' : 'text-red-500'} bg-black/20 px-2 py-1 rounded-lg`}>
                        {trend >= 0 ? <ArrowUpRight size={14} className="mr-1" /> : <ArrowDownRight size={14} className="mr-1" />}
                        {Math.abs(trend)}%
                    </div>
                )}
            </div>
            <h3 className="text-gray-500 text-sm font-medium mb-1">{title}</h3>
            <p className="text-3xl font-bold text-white tracking-tight">{value}</p>
        </div>
    )
}

export default function AdminDashboard() {
    const [timeRange, setTimeRange] = useState<TimeRange>('week')
    const { data, isLoading, error } = useDashboardData(timeRange)

    // Fix for Recharts ResponsiveContainer warning during StrictMode/SSR
    const [isMounted, setIsMounted] = useState(false)
    useEffect(() => {
        const timeout = setTimeout(() => setIsMounted(true), 50)
        return () => clearTimeout(timeout)
    }, [])

    if (isLoading) return <div className="p-8 text-gray-400">Cargando panel...</div>
    if (error) return <div className="p-8 text-red-500">Error al cargar panel</div>

    const { stats, chartData } = data!

    return (
        <div className="flex-1 h-full overflow-y-auto bg-[#111315] p-8 custom-scrollbar">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">Panel de Control</h1>
                <p className="text-gray-500">Resumen del rendimiento del restaurante hoy.</p>
            </header>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard
                    title="Ventas de Hoy"
                    value={`$${stats.totalSales.toFixed(2)}`}
                    icon={DollarSign}
                    color="text-green-500"
                />
                <StatCard
                    title="Órdenes Activas"
                    value={stats.activeOrders}
                    icon={Activity}
                    color="text-blue-500"
                />
                <StatCard
                    title="Items en Menú"
                    value={stats.totalProducts}
                    icon={ShoppingBag}
                    color="text-purple-500"
                />
                <StatCard
                    title="Miembros del Staff"
                    value={stats.totalStaff}
                    icon={Users}
                    color="text-orange-500"
                />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Sales Chart */}
                <div className="lg:col-span-2 bg-[#1F2329] p-6 rounded-2xl border border-gray-800">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
                        <h3 className="text-lg font-bold text-white flex items-center">
                            <TrendingUp size={20} className="mr-2 text-[#FBBF24]" />
                            Análisis de Ventas
                        </h3>
                        <div className="flex bg-[#141619] p-1 rounded-lg border border-gray-800">
                            <button
                                onClick={() => setTimeRange('day')}
                                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${timeRange === 'day' ? 'bg-[#FBBF24] text-black' : 'text-gray-400 hover:text-white'}`}
                            >
                                Hoy
                            </button>
                            <button
                                onClick={() => setTimeRange('week')}
                                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${timeRange === 'week' ? 'bg-[#FBBF24] text-black' : 'text-gray-400 hover:text-white'}`}
                            >
                                7 Días
                            </button>
                            <button
                                onClick={() => setTimeRange('month')}
                                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${timeRange === 'month' ? 'bg-[#FBBF24] text-black' : 'text-gray-400 hover:text-white'}`}
                            >
                                30 Días
                            </button>
                        </div>
                    </div>

                    <div className="h-80 w-full" style={{ minHeight: 320, minWidth: 0 }}>
                        {isMounted && (
                            <ResponsiveContainer width="99%" height="100%" minWidth={0}>
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#FBBF24" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#FBBF24" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                                    <XAxis
                                        dataKey="date"
                                        stroke="#9CA3AF"
                                        tick={{ fill: '#9CA3AF', fontSize: 12 }}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <YAxis
                                        stroke="#9CA3AF"
                                        tick={{ fill: '#9CA3AF', fontSize: 12 }}
                                        axisLine={false}
                                        tickLine={false}
                                        tickFormatter={(value) => `$${value}`}
                                    />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#141619', borderColor: '#374151', color: 'white' }}
                                        itemStyle={{ color: '#FBBF24' }}
                                        formatter={(value: any) => [`$${value}`, 'Ventas']}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="amount"
                                        stroke="#FBBF24"
                                        strokeWidth={3}
                                        fillOpacity={1}
                                        fill="url(#colorSales)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                {/* Recent Activity / Simple List */}
                <div className="bg-[#1F2329] p-6 rounded-2xl border border-gray-800 flex flex-col">
                    <h3 className="text-lg font-bold text-white mb-6 flex items-center">
                        <Calendar size={20} className="mr-2 text-blue-400" />
                        Acciones Rápidas
                    </h3>

                    <div className="space-y-4 flex-1">
                        <div className="p-4 bg-[#141619] rounded-xl border border-gray-800 hover:border-gray-600 transition-colors cursor-pointer" onClick={() => window.location.href = '/menu-editor'}>
                            <h4 className="font-bold text-white text-sm mb-1">Gestionar Menú</h4>
                            <p className="text-xs text-gray-500">Actualizar precios, items o disponibilidad.</p>
                        </div>
                        <div className="p-4 bg-[#141619] rounded-xl border border-gray-800 hover:border-gray-600 transition-colors cursor-pointer" onClick={() => window.location.href = '/tables'}>
                            <h4 className="font-bold text-white text-sm mb-1">Ver Mapa en Vivo</h4>
                            <p className="text-xs text-gray-500">Ver estado de mesas y órdenes en tiempo real.</p>
                        </div>
                        <div className="p-4 bg-[#141619] rounded-xl border border-gray-800 hover:border-gray-600 transition-colors cursor-pointer" onClick={() => window.location.href = '/staff-management'}>
                            <h4 className="font-bold text-white text-sm mb-1">Gestión de Personal</h4>
                            <p className="text-xs text-gray-500">Administrar roles y permisos.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
