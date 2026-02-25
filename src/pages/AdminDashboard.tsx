import { useState } from 'react'
import {
    ShoppingBag, DollarSign,
    Calendar, Activity, Users
} from 'lucide-react'
import { useDashboardData, type TimeRange } from '../hooks/useDashboardData'
import StatCard from '../components/dashboard/StatCard'
import SalesChart from '../components/dashboard/SalesChart'

export default function AdminDashboard() {
    const [timeRange, setTimeRange] = useState<TimeRange>('week')
    const { data, isLoading, error } = useDashboardData(timeRange)



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
                <SalesChart
                    data={chartData}
                    timeRange={timeRange}
                    onTimeRangeChange={setTimeRange}
                />

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
