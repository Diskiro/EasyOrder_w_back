import { useActiveOrders, useUpdateOrderStatus, useUpdateOrderItemReady, type Order } from '../hooks/useOrders'
import { Clock, CheckCircle, Flame, ChefHat, CheckSquare, Square } from 'lucide-react'

const StatusBadge = ({ status }: { status: string }) => {
    const colors: Record<string, string> = {
        pending: 'bg-yellow-900/40 text-yellow-400 border-yellow-700',
        cooking: 'bg-orange-900/40 text-orange-400 border-orange-700',
        ready: 'bg-green-900/40 text-green-400 border-green-700',
    }

    return (
        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase border ${colors[status] || 'bg-gray-800'}`}>
            {status}
        </span>
    )
}

export default function KitchenView() {
    const { data: allOrders, isLoading } = useActiveOrders()
    const updateStatus = useUpdateOrderStatus()
    const updateItemReady = useUpdateOrderItemReady()

    if (isLoading) return <div className="p-8 text-white">Loading orders...</div>

    // Filter out orders that are waiting for waiter ('ready') or completely finished ('delivered' / 'completed')
    const orders = allOrders?.filter(o => o.status !== 'ready' && o.status !== 'delivered' && o.status !== 'completed') || []

    // Group by status for Kanban-like feel, or just list. 
    // Let's do a Grid of cards sorted by time.

    const handleNextStatus = (order: Order) => {
        const nextStatusMap: Partial<Record<Order['status'], Order['status']>> = {
            'pending': 'cooking',
            'cooking': 'ready',
            'ready': 'delivered' // Delivered removes it from this view
        }
        const next = nextStatusMap[order.status]
        if (next) {
            updateStatus.mutate({ orderId: order.id, status: next })
        }
    }

    return (
        <div className="p-6 h-full flex flex-col">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                    <ChefHat size={32} />
                    Sistema de visualización de cocina
                </h1>
                <div className="text-gray-400 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    Actualización en tiempo real
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {orders?.length === 0 && (
                    <div className="col-span-full flex flex-col items-center justify-center text-gray-500 py-20">
                        <CheckCircle size={64} className="mb-4 opacity-20" />
                        <p className="text-xl">todas las ordenes completadas</p>
                    </div>
                )}

                {orders?.map((order: Order) => (
                    <div
                        key={order.id}
                        className={`
              relative flex flex-col bg-[#242424] rounded-xl overflow-hidden border-2 transition-all
              ${order.status === 'pending' ? 'border-yellow-700/50' : ''}
              ${order.status === 'cooking' ? 'border-orange-700/50' : ''}
              ${order.status === 'ready' ? 'border-green-700/50' : ''}
            `}
                    >
                        {/* Header */}
                        <div className="bg-[#1a1a1a] p-4 flex justify-between items-start">
                            <div>
                                <h3 className="text-xl font-bold text-white">Table {order.table?.number || '?'}</h3>
                                <div className="flex items-center gap-1 text-sm text-gray-400 mt-1">
                                    <Clock size={14} />
                                    <span>{new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                            </div>
                            <StatusBadge status={order.status} />
                        </div>

                        {/* Items */}
                        <div className="p-4 flex-1 space-y-3">
                            {order.order_items?.map((item) => (
                                <div key={item.id} className="flex justify-between items-start border-b border-gray-800 pb-2 last:border-0 hover:bg-white/5 p-2 -mx-2 rounded transition-colors"
                                    onClick={() => updateItemReady.mutate({ itemId: item.id, isReady: !item.is_ready, orderId: order.id })}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <div className={`flex gap-3 transition-opacity ${item.is_ready ? 'opacity-50 line-through' : 'opacity-100'}`}>
                                        <span className="font-bold text-lg text-blue-400 w-6">{item.quantity}x</span>
                                        <div>
                                            <span className="text-gray-200 font-medium block">{item.product?.name || 'Unknown Item'}</span>
                                            {item.notes && <span className="text-sm text-yellow-500 italic mt-0.5">{item.notes}</span>}
                                        </div>
                                    </div>
                                    <div className="pt-1">
                                        {item.is_ready ? (
                                            <CheckSquare className="text-green-500" size={24} />
                                        ) : (
                                            <Square className="text-gray-500 hover:text-gray-300" size={24} />
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Actions */}
                        <div className="p-4 bg-[#1a1a1a] border-t border-gray-800">
                            <button
                                onClick={() => handleNextStatus(order)}
                                disabled={updateStatus.isPending}
                                className={`
                  w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors
                  ${order.status === 'pending' ? 'bg-orange-600 hover:bg-orange-700 text-white' : ''}
                  ${order.status === 'cooking' ? 'bg-green-600 hover:bg-green-700 text-white' : ''}
                  ${order.status === 'ready' ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : ''}
                `}
                            >
                                {order.status === 'pending' && <><Flame size={20} /> Start Cooking</>}
                                {order.status === 'cooking' && <><CheckCircle size={20} /> Mark Ready</>}
                                {order.status === 'ready' && <span>Waiting for Waiter</span>}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
