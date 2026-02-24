import { useActiveOrders, useUpdateOrderStatus, type Order } from '../hooks/useOrders'
import { useTables } from '../hooks/useTables'
import { Clock, CheckCircle, ChefHat, Bell, DollarSign, UtensilsCrossed, Edit } from 'lucide-react'
import { Button } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import clsx from 'clsx'

const STATUS_CONFIG = {
    pending: { label: 'Pendiente', color: 'bg-gray-700 text-gray-200', icon: Clock },
    cooking: { label: 'Preparando', color: 'bg-orange-500/20 text-orange-400', icon: ChefHat },
    ready: { label: 'Listo', color: 'bg-green-500/20 text-green-400', icon: Bell },
    delivered: { label: 'Entregado', color: 'bg-blue-500/20 text-blue-400', icon: CheckCircle },
}

export default function OrdersView() {
    const { data: orders, isLoading: loadingOrders } = useActiveOrders()
    const { data: tables, isLoading: loadingTables } = useTables()
    const updateStatus = useUpdateOrderStatus()
    const navigate = useNavigate()
    const { role } = useAuth()

    const handleStatusChange = (orderId: number, newStatus: Order['status']) => {
        updateStatus.mutate({ orderId, status: newStatus })
    }

    if (loadingOrders || loadingTables) return <div className="p-8 text-white">Cargando...</div>

    // Sort Tables: With Orders First (Oldest Order), then Empty
    const sortedTables = [...(tables || [])].sort((a, b) => {
        const ordersA = orders?.filter(o => o.table_id === a.id) || []
        const ordersB = orders?.filter(o => o.table_id === b.id) || []

        const hasOrdersA = ordersA.length > 0
        const hasOrdersB = ordersB.length > 0

        // 1. Prioritize tables with orders
        if (hasOrdersA && !hasOrdersB) return -1
        if (!hasOrdersA && hasOrdersB) return 1

        // 2. If both have orders, sort by oldest order creation time (LIFO/FIFO?)
        // Usually, we want the one waiting longest (oldest) to be first (leftmost)
        if (hasOrdersA && hasOrdersB) {
            // Get earliest active order time for table A
            const timeA = Math.min(...ordersA.map(o => new Date(o.created_at).getTime()))
            // Get earliest active order time for table B
            const timeB = Math.min(...ordersB.map(o => new Date(o.created_at).getTime()))

            return timeA - timeB
        }

        // 3. Fallback: Table Number
        return a.number.localeCompare(b.number, undefined, { numeric: true })
    })

    return (
        <div className="flex h-full bg-[#111315] text-gray-200 flex-col overflow-hidden">
            <header className="px-8 py-5 border-b border-[#1F2329] bg-[#141619] flex justify-between items-center z-10 shrink-0">
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-wide">ÓRDENES ACTIVAS</h1>
                    <p className="text-gray-500 text-xs mt-1">Gestiona el flujo de cocina y servicio por mesa</p>
                </div>
            </header>

            {/* Responsive Grid Container */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-20">
                    {sortedTables.map(table => {
                        const tableOrders = orders?.filter(o => o.table_id === table.id) || []
                        const hasOrders = tableOrders.length > 0

                        return (
                            <div key={table.id} className="flex flex-col bg-[#1A1D21] rounded-xl border border-[#2A2E35] overflow-hidden h-fit max-h-[600px] shadow-lg transition-all hover:border-gray-600">
                                {/* Column Header */}
                                <div className={clsx(
                                    "p-4 border-b border-[#2A2E35] flex justify-between items-center transition-colors shrink-0",
                                    hasOrders ? "bg-blue-900/10" : "bg-transparent"
                                )}>
                                    <div className="flex items-center gap-2">
                                        <div className={clsx(
                                            "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm",
                                            hasOrders ? "bg-blue-500 text-white" : "bg-[#2A2E35] text-gray-500"
                                        )}>
                                            {table.number}
                                        </div>
                                        <span className={clsx("font-medium", hasOrders ? "text-white" : "text-gray-500")}>
                                            Mesa {table.number}
                                        </span>
                                    </div>
                                    {hasOrders && (
                                        <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full font-mono">
                                            {tableOrders.length}
                                        </span>
                                    )}
                                </div>

                                {/* Orders List */}
                                <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar min-h-[150px]">
                                    {!hasOrders ? (
                                        <div className="h-full flex flex-col items-center justify-center text-gray-600 space-y-2 opacity-50 py-8">
                                            <UtensilsCrossed size={32} />
                                            <span className="text-sm">Vacía</span>
                                        </div>
                                    ) : (
                                        tableOrders.map(order => {
                                            const StatusIcon = STATUS_CONFIG[order.status as keyof typeof STATUS_CONFIG]?.icon || Clock
                                            const timeElapsed = Math.floor((new Date().getTime() - new Date(order.created_at).getTime()) / 60000)

                                            // Calculate this order's total
                                            const orderTotal = order.total_amount || 0

                                            return (
                                                <div key={order.id} className="bg-[#1F2329] border border-gray-700 rounded-lg overflow-hidden flex flex-col shadow-sm">
                                                    {/* Order Header */}
                                                    <div className="p-3 bg-[#252930] flex justify-between items-start border-b border-gray-700/50">
                                                        <div className="flex flex-col">
                                                            <span className="text-xs font-mono text-gray-500">#{order.id}</span>
                                                            <div className="flex items-center gap-1 text-[10px] text-gray-400 mt-0.5">
                                                                <Clock size={10} />
                                                                <span>{timeElapsed}m</span>
                                                            </div>
                                                        </div>
                                                        <div className={clsx("px-2 py-0.5 rounded text-[10px] font-bold uppercase flex items-center gap-1", STATUS_CONFIG[order.status as keyof typeof STATUS_CONFIG]?.color)}>
                                                            <StatusIcon size={10} />
                                                            {STATUS_CONFIG[order.status as keyof typeof STATUS_CONFIG]?.label || order.status}
                                                        </div>
                                                    </div>

                                                    {/* Items */}
                                                    <div className="p-3 space-y-2">
                                                        {order.order_items?.map(item => (
                                                            <div key={item.id} className="flex justify-between items-start text-sm">
                                                                <div className="flex gap-2">
                                                                    <span className="text-xs font-bold text-[#FBBF24] pt-0.5">{item.quantity}x</span>
                                                                    <span className="text-gray-300 leading-tight">{item.product?.name}</span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>

                                                    {/* Total & Action */}
                                                    <div className="p-2 bg-[#252930] border-t border-gray-700/50 flex flex-col gap-2">
                                                        <div className="flex justify-between items-center text-xs">
                                                            <span className="text-gray-500">Total</span>
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-bold text-[#FBBF24]">${orderTotal.toFixed(2)}</span>
                                                                {role === 'admin' && (
                                                                    <Button
                                                                        variant="outlined"
                                                                        size="small"
                                                                        color="primary"
                                                                        sx={{
                                                                            minWidth: 0,
                                                                            width: 30,
                                                                            height: 30,
                                                                            p: 0,
                                                                            borderRadius: '50%'
                                                                        }}
                                                                        onClick={() => navigate('/tables', { state: { tableId: order.table_id } })}
                                                                    >
                                                                        <Edit size={14} />
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {order.status === 'pending' && (
                                                            <div className="grid grid-cols-2 gap-2">
                                                                <Button variant="outlined" color="error" size="small" sx={{ fontSize: '0.65rem', minWidth: 0, p: 0.5 }} onClick={() => handleStatusChange(order.id, 'cancelled')}>
                                                                    Cancelar
                                                                </Button>
                                                                <Button variant="contained" color="warning" size="small" sx={{ fontSize: '0.65rem', minWidth: 0, p: 0.5 }} onClick={() => handleStatusChange(order.id, 'cooking')}>
                                                                    Cocinar
                                                                </Button>
                                                            </div>
                                                        )}
                                                        {order.status === 'cooking' && (
                                                            <Button fullWidth variant="contained" color="success" size="small" sx={{ fontSize: '0.7rem', py: 0.5 }} onClick={() => handleStatusChange(order.id, 'ready')}>
                                                                Marcar Listo
                                                            </Button>
                                                        )}
                                                        {order.status === 'ready' && (
                                                            <Button fullWidth variant="contained" color="info" size="small" sx={{ fontSize: '0.7rem', py: 0.5 }} onClick={() => handleStatusChange(order.id, 'delivered')}>
                                                                Entregar
                                                            </Button>
                                                        )}
                                                        {order.status === 'delivered' && (
                                                            <Button fullWidth variant="contained" sx={{ bgcolor: '#FBBF24', color: 'black', '&:hover': { bgcolor: '#d9a111' }, fontSize: '0.7rem', py: 0.5 }} onClick={() => handleStatusChange(order.id, 'completed')}>
                                                                <DollarSign size={12} className="mr-1" /> Pagar y Cerrar
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            )
                                        })
                                    )}
                                </div>

                                {/* Table Footer (Summary for >1 orders) */}
                                {tableOrders.length > 1 && (
                                    <div className="p-4 bg-[#252930] border-t border-[#2A2E35] flex flex-col gap-3 shrink-0">
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-400 font-bold text-sm">Total Mesa ({tableOrders.length})</span>
                                            <span className="text-[#FBBF24] font-bold text-xl">
                                                ${tableOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0).toFixed(2)}
                                            </span>
                                        </div>

                                        {/* Only show Pay All button if ALL orders are in 'delivered' status */}
                                        {tableOrders.every(o => o.status === 'delivered') && (
                                            <Button
                                                fullWidth
                                                variant="contained"
                                                sx={{
                                                    bgcolor: '#FBBF24',
                                                    color: 'black',
                                                    '&:hover': { bgcolor: '#d9a111' },
                                                    fontWeight: 'bold'
                                                }}
                                                onClick={() => {
                                                    // Triggering 'completed' on the first order will trigger the backend logic 
                                                    // to close ALL orders for this table (Unified Bill logic in useData.ts)
                                                    if (tableOrders[0]) {
                                                        handleStatusChange(tableOrders[0].id, 'completed')
                                                    }
                                                }}
                                                startIcon={<DollarSign size={18} />}
                                            >
                                                Pagar Todo y Cerrar
                                            </Button>
                                        )}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
