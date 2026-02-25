import {
    ArrowUpRight,
    ArrowDownRight
} from 'lucide-react'

interface StatCardProps {
    title: string
    value: string | number
    icon: any
    color: string
    trend?: number
}

export default function StatCard({ title, value, icon: Icon, color, trend }: StatCardProps) {
    return (
        <div className="bg-[#1F2329] p-6 rounded-2xl border text-gray-200 border-gray-800 shadow-sm relative overflow-hidden group">
            <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity ${color}`}>
                <Icon size={64} />
            </div>
            <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-xl bg-opacity-10 ${color} bg-white`}>
                    <Icon size={24} className={color.replace('bg-', 'text-')} />
                </div>
                {trend !== undefined && (
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
