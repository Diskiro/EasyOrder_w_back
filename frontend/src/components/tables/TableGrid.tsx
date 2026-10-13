import clsx from 'clsx'
import { User } from 'lucide-react'
import type { Table } from '../../hooks/useTables'
import type { Reservation } from '../../hooks/useReservations'
import type { Order } from '../../hooks/useOrders'

interface TableGridProps {
    tables: Table[] | undefined
    onTableClick: (table: Table) => void
    assigningReservation: Reservation | null
    activeOrders?: Order[]
}

function getTableCardStyle(isOccupied: boolean, isAssigning: boolean) {
    if (isOccupied) {
        return {
            containerClass: "border-pink-500/50 bg-pink-500/10",
            circleClass: "bg-pink-500 text-white",
            labelClass: "text-pink-400",
            label: "Ocupada"
        }
    }
    if (isAssigning) {
        return {
            containerClass: "border-blue-500/50 bg-blue-500/10 cursor-alias animate-pulse",
            circleClass: "bg-blue-500 text-white",
            labelClass: "text-blue-400",
            label: "Asignar"
        }
    }
    return {
        containerClass: "border-green-500/50 bg-green-500/10",
        circleClass: "bg-green-500 text-white",
        labelClass: "text-green-400",
        label: "Disponible"
    }
}

export default function TableGrid({ tables, onTableClick, assigningReservation, activeOrders }: Readonly<TableGridProps>) {
    const isAssigning = Boolean(assigningReservation)

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6 pb-20">
            {tables?.map(table => {
                const isOccupied = table.status === 'occupied'
                const style = getTableCardStyle(isOccupied, isAssigning)
                const order = isOccupied
                    ? activeOrders?.find(o => o.table_id === table.id && o.status !== 'completed' && o.status !== 'cancelled')
                    : undefined

                return (
                    <button
                        key={table.id}
                        onClick={() => onTableClick(table)}
                        className={clsx(
                            "aspect-square rounded-2xl relative group transition-all duration-300 hover:scale-[1.02]",
                            "bg-[#1F2329]"
                        )}
                    >
                        <div className={clsx(
                            "absolute inset-2 md:inset-4 rounded-xl flex flex-col items-center justify-center border-2 transition-all shadow-xl",
                            style.containerClass
                        )}>
                            <div className={clsx(
                                "w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center mb-1 md:mb-1.5 shadow-lg",
                                style.circleClass
                            )}>
                                <span className="text-lg md:text-xl font-bold">{table.number}</span>
                            </div>
                            <span className={clsx("text-[10px] md:text-xs font-bold uppercase", style.labelClass)}>
                                {style.label}
                            </span>

                            {/* Attending Server Badge */}
                            {isOccupied && order?.server_name && (
                                <div
                                    className="mt-1.5 flex items-center gap-1 max-w-[90%] px-2 py-0.5 rounded-md bg-black/60 border border-pink-500/30 text-pink-200 text-[10px] truncate shadow-sm"
                                    title={`Atendido por: ${order.server_name}`}
                                >
                                    <User size={10} className="shrink-0 text-pink-400" />
                                    <span className="truncate font-medium">{order.server_name}</span>
                                </div>
                            )}
                        </div>
                        <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="bg-black/80 text-white text-[10px] px-2 py-1 rounded">{table.capacity} Pax</div>
                        </div>
                    </button>
                )
            })}
        </div>
    )
}
