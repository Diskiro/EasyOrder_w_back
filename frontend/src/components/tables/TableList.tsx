import clsx from 'clsx'
import type { Table } from '../../hooks/useTables'

interface TableListProps {
    tables: Table[] | undefined
    onTableClick: (table: Table) => void
}

export default function TableList({ tables, onTableClick }: TableListProps) {
    return (
        <div className="bg-[#1F2329] rounded-2xl p-6 border border-gray-800">
            <h2 className="text-xl font-bold text-white mb-4">Vista de Lista</h2>
            <div className="grid gap-4">
                {tables?.map(table => (
                    <div key={table.id} onClick={() => onTableClick(table)} className="flex items-center justify-between p-4 bg-[#141619] rounded-xl border border-gray-800 hover:border-gray-600 cursor-pointer">
                        <div className="flex items-center gap-4">
                            <div className={clsx(
                                "w-10 h-10 rounded-full flex items-center justify-center font-bold",
                                table.status === 'occupied' ? "bg-pink-500 text-white" : "bg-green-500 text-white"
                            )}>
                                {table.number}
                            </div>
                            <div>
                                <div className="font-bold text-gray-200">Mesa {table.number}</div>
                                <div className="text-sm text-gray-500">{table.capacity} Personas</div>
                            </div>
                        </div>
                        <div className={clsx("px-3 py-1 rounded-full text-xs font-bold uppercase", table.status === 'occupied' ? "bg-pink-500/20 text-pink-400" : "bg-green-500/20 text-green-400")}>
                            {table.status === 'occupied' ? 'Ocupada' : 'Disponible'}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
