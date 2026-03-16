import clsx from 'clsx'
import type { Table } from '../../hooks/useTables'
import type { Reservation } from '../../hooks/useReservations'

interface TableGridProps {
    tables: Table[] | undefined
    onTableClick: (table: Table) => void
    assigningReservation: Reservation | null
}

export default function TableGrid({ tables, onTableClick, assigningReservation }: TableGridProps) {
    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6 pb-20">
            {tables?.map(table => (
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
                        table.status === 'occupied'
                            ? "border-pink-500/50 bg-pink-500/10"
                            : assigningReservation ? "border-blue-500/50 bg-blue-500/10 cursor-alias animate-pulse" : "border-green-500/50 bg-green-500/10"
                    )}>
                        <div className={clsx(
                            "w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center mb-1 md:mb-2 shadow-lg",
                            table.status === 'occupied' ? "bg-pink-500 text-white" : assigningReservation ? "bg-blue-500 text-white" : "bg-green-500 text-white"
                        )}>
                            <span className="text-lg md:text-xl font-bold">{table.number}</span>
                        </div>
                        <span className={clsx("text-[10px] md:text-xs font-bold uppercase", table.status === 'occupied' ? "text-pink-400" : assigningReservation ? "text-blue-400" : "text-green-400")}>
                            {table.status === 'occupied' ? 'Ocupada' : assigningReservation ? 'Asignar' : 'Disponible'}
                        </span>
                    </div>
                    <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="bg-black/80 text-white text-[10px] px-2 py-1 rounded">{table.capacity} Pax</div>
                    </div>
                </button>
            ))}
        </div>
    )
}
