import clsx from 'clsx'
import { User } from 'lucide-react'
import type { Table } from '../../hooks/useTables'
import type { Order } from '../../hooks/useOrders'

interface TableListProps {
    tables: Table[] | undefined
    onTableClick: (table: Table) => void
    activeOrders?: Order[]
}

export default function TableList({ tables, onTableClick, activeOrders }: Readonly<TableListProps>) {
    return (
        <div className="bg-[#1F2329] rounded-2xl p-6 border border-gray-800 shadow-xl">
            <h2 className="text-xl font-bold text-white mb-4">Vista de Lista</h2>
            <div className="grid gap-3">
                {tables?.map(table => {
                    const isOccupied = table.status === 'occupied'
                    const order = isOccupied
                        ? activeOrders?.find(o => o.table_id === table.id && o.status !== 'completed' && o.status !== 'cancelled')
                        : undefined

                    return (
                        <button
                            type="button"
                            key={table.id}
                            onClick={() => onTableClick(table)}
                            className="w-full flex items-center justify-between p-4 bg-[#141619] rounded-xl border border-gray-800 hover:border-gray-700 transition-colors cursor-pointer text-left"
                        >
                            <div className="flex items-center gap-4">
                                <div className={clsx(
                                    "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 shadow-md",
                                    isOccupied ? "bg-pink-500 text-white" : "bg-green-500 text-white"
                                )}>
                                    {table.number}
                                </div>
                                <div>
                                    <div className="font-bold text-gray-200">Mesa {table.number}</div>
                                    <div className="text-xs text-gray-400">{table.capacity} Personas</div>
                                    {isOccupied && order?.server_name && (
                                        <div className="flex items-center gap-1.5 text-xs text-pink-300 font-medium mt-1">
                                            <User size={12} className="text-pink-400" />
                                            <span>Atiende: <strong className="text-pink-200">{order.server_name}</strong></span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className={clsx(
                                "px-3 py-1 rounded-full text-xs font-bold uppercase",
                                isOccupied ? "bg-pink-500/20 text-pink-400 border border-pink-500/30" : "bg-green-500/20 text-green-400 border border-green-500/30"
                            )}>
                                {isOccupied ? 'Ocupada' : 'Disponible'}
                            </div>
                        </button>
                    )
                })}
            </div>
        </div>
    )
}
