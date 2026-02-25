import { useState, useEffect } from 'react'
import {
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    AreaChart, Area
} from 'recharts'
import { TrendingUp } from 'lucide-react'
import type { ChartDataPoint, TimeRange } from '../../hooks/useDashboardData'

interface SalesChartProps {
    data: ChartDataPoint[]
    timeRange: TimeRange
    onTimeRangeChange: (range: TimeRange) => void
}

export default function SalesChart({ data, timeRange, onTimeRangeChange }: SalesChartProps) {
    // Fix for Recharts ResponsiveContainer warning during StrictMode/SSR
    const [isMounted, setIsMounted] = useState(false)
    useEffect(() => {
        const timeout = setTimeout(() => setIsMounted(true), 50)
        return () => clearTimeout(timeout)
    }, [])

    return (
        <div className="lg:col-span-2 bg-[#1F2329] p-6 rounded-2xl border border-gray-800">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
                <h3 className="text-lg font-bold text-white flex items-center">
                    <TrendingUp size={20} className="mr-2 text-[#FBBF24]" />
                    Análisis de Ventas
                </h3>
                <div className="flex bg-[#141619] p-1 rounded-lg border border-gray-800">
                    <button
                        onClick={() => onTimeRangeChange('day')}
                        className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${timeRange === 'day' ? 'bg-[#FBBF24] text-black' : 'text-gray-400 hover:text-white'}`}
                    >
                        Hoy
                    </button>
                    <button
                        onClick={() => onTimeRangeChange('week')}
                        className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${timeRange === 'week' ? 'bg-[#FBBF24] text-black' : 'text-gray-400 hover:text-white'}`}
                    >
                        7 Días
                    </button>
                    <button
                        onClick={() => onTimeRangeChange('month')}
                        className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${timeRange === 'month' ? 'bg-[#FBBF24] text-black' : 'text-gray-400 hover:text-white'}`}
                    >
                        30 Días
                    </button>
                </div>
            </div>

            <div className="h-80 w-full" style={{ minHeight: 320, minWidth: 0 }}>
                {isMounted && (
                    <ResponsiveContainer width="99%" height="100%" minWidth={0}>
                        <AreaChart data={data}>
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
    )
}
