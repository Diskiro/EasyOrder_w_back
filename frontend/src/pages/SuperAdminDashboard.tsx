import { useEffect, useState, useMemo } from 'react';
import {
    getSuperAdminRestaurants,
    getSubscriptionPlans,
    updateRestaurantSubscription,
    type RestaurantRecord,
    type SubscriptionPlanRecord
} from '../lib/superadmin';
import { CreateRestaurantModal } from '../components/superadmin/CreateRestaurantModal';
import { SubscriptionActionDialog } from '../components/superadmin/SubscriptionActionDialog';
import {
    Building2,
    Users,
    AlertTriangle,
    DollarSign,
    Plus,
    Search,
    ExternalLink,
    RefreshCw,
    CalendarPlus,
    Settings2
} from 'lucide-react';
import { Button, TextField } from '@mui/material';

export default function SuperAdminDashboard() {
    const [restaurants, setRestaurants] = useState<RestaurantRecord[]>([]);
    const [plans, setPlans] = useState<SubscriptionPlanRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedRestaurant, setSelectedRestaurant] = useState<RestaurantRecord | null>(null);
    const [isActionDialogOpen, setIsActionDialogOpen] = useState(false);

    const loadData = async () => {
        try {
            setIsLoading(true);
            const [restData, plansData] = await Promise.all([
                getSuperAdminRestaurants(),
                getSubscriptionPlans()
            ]);
            setRestaurants(restData);
            setPlans(plansData);
        } catch (error) {
            console.error('Error al cargar datos del SuperAdmin:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // Cálculo de métricas globales
    const metrics = useMemo(() => {
        const total = restaurants.length;
        const active = restaurants.filter(r => r.status === 'active' && new Date(r.subscription_expires_at).getTime() >= Date.now()).length;
        const suspended = restaurants.filter(r => r.status === 'suspended').length;
        const expired = restaurants.filter(r => r.status !== 'suspended' && new Date(r.subscription_expires_at).getTime() < Date.now()).length;
        const mrr = restaurants
            .filter(r => r.status === 'active')
            .reduce((sum, r) => sum + Number(r.price_monthly || 0), 0);

        return { total, active, suspended, expired, mrr };
    }, [restaurants]);

    const filteredRestaurants = useMemo(() => {
        return restaurants.filter(r =>
            r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.slug.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [restaurants, searchTerm]);

    const handleQuickRenew = async (restaurant: RestaurantRecord) => {
        try {
            const response = await updateRestaurantSubscription(restaurant.id, { addDays: 30 });
            setRestaurants(prev => prev.map(r => r.id === restaurant.id ? response.restaurant : r));
        } catch (error) {
            console.error('Error al renovar días:', error);
        }
    };

    const calculateDaysLeft = (expiresAt: string) => {
        const diff = new Date(expiresAt).getTime() - Date.now();
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
        return days;
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8 animate-fadeIn">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1F2329] pb-6">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="bg-amber-500/20 text-amber-400 text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border border-amber-500/30">
                            Consola Maestra
                        </span>
                        <span className="text-gray-500 text-xs">EasyOrder SaaS Platform</span>
                    </div>
                    <h1 className="text-3xl font-extrabold text-white tracking-tight">
                        Gestión de Restaurantes y Suscripciones
                    </h1>
                </div>

                <div className="flex items-center gap-3">
                    <Button
                        variant="outlined"
                        onClick={loadData}
                        disabled={isLoading}
                        startIcon={<RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />}
                        sx={{
                            color: '#9CA3AF',
                            borderColor: '#2D333B',
                            textTransform: 'none',
                            borderRadius: 2.5,
                            '&:hover': { borderColor: '#4B5563', bgcolor: '#1E2228' }
                        }}
                    >
                        Actualizar
                    </Button>

                    <Button
                        variant="contained"
                        onClick={() => setIsCreateModalOpen(true)}
                        startIcon={<Plus size={18} />}
                        sx={{
                            bgcolor: '#FBBF24',
                            color: '#111315',
                            fontWeight: 'bold',
                            textTransform: 'none',
                            px: 3,
                            py: 1,
                            borderRadius: 2.5,
                            boxShadow: '0 4px 15px rgba(251,191,36,0.2)',
                            '&:hover': { bgcolor: '#e5ab1f' }
                        }}
                    >
                        Alta de Restaurante
                    </Button>
                </div>
            </div>

            {/* Tarjetas de Métricas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-[#141619] p-5 rounded-2xl border border-[#1F2329] flex items-center justify-between shadow-lg">
                    <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Restaurantes Totales</p>
                        <h3 className="text-3xl font-black text-white mt-1">{metrics.total}</h3>
                        <p className="text-xs text-gray-500 mt-1">Inquilinos en el sistema</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-[#FBBF24] flex items-center justify-center border border-amber-500/20">
                        <Building2 size={24} />
                    </div>
                </div>

                <div className="bg-[#141619] p-5 rounded-2xl border border-[#1F2329] flex items-center justify-between shadow-lg">
                    <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Suscripciones Activas</p>
                        <h3 className="text-3xl font-black text-emerald-400 mt-1">{metrics.active}</h3>
                        <p className="text-xs text-emerald-500/80 mt-1">Operando al día</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                        <Users size={24} />
                    </div>
                </div>

                <div className="bg-[#141619] p-5 rounded-2xl border border-[#1F2329] flex items-center justify-between shadow-lg">
                    <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Suspendidas / Vencidas</p>
                        <h3 className="text-3xl font-black text-rose-400 mt-1">{metrics.suspended + metrics.expired}</h3>
                        <p className="text-xs text-rose-500/80 mt-1">{metrics.suspended} suspendidos • {metrics.expired} vencidos</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center border border-rose-500/20">
                        <AlertTriangle size={24} />
                    </div>
                </div>

                <div className="bg-[#141619] p-5 rounded-2xl border border-[#1F2329] flex items-center justify-between shadow-lg">
                    <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">MRR Estimado</p>
                        <h3 className="text-3xl font-black text-white mt-1">${metrics.mrr.toLocaleString()} MXN</h3>
                        <p className="text-xs text-gray-500 mt-1">Ingresos mensuales recurrentes</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
                        <DollarSign size={24} />
                    </div>
                </div>
            </div>

            {/* Listado y Búsqueda */}
            <div className="bg-[#141619] rounded-2xl border border-[#1F2329] overflow-hidden shadow-xl">
                <div className="p-5 border-b border-[#1F2329] flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="relative w-full sm:w-80">
                        <TextField
                            size="small"
                            placeholder="Buscar por nombre o subdominio..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            fullWidth
                            InputProps={{
                                startAdornment: <Search size={16} className="text-gray-400 mr-2" />,
                                sx: { color: 'white', bgcolor: '#1E2228', borderRadius: 2 }
                            }}
                        />
                    </div>
                    <p className="text-xs text-gray-400">
                        Mostrando <strong className="text-white">{filteredRestaurants.length}</strong> restaurantes
                    </p>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                        <thead>
                            <tr className="border-b border-[#1F2329] bg-[#111315] text-gray-400 text-xs uppercase tracking-wider">
                                <th className="py-4 px-6 font-semibold">Restaurante / Subdominio</th>
                                <th className="py-4 px-6 font-semibold">Plan Actual</th>
                                <th className="py-4 px-6 font-semibold">Estado</th>
                                <th className="py-4 px-6 font-semibold">Vencimiento</th>
                                <th className="py-4 px-6 font-semibold text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1F2329]">
                            {filteredRestaurants.map((r) => {
                                const daysLeft = calculateDaysLeft(r.subscription_expires_at);
                                const isExpired = daysLeft <= 0;
                                const isSuspended = r.status === 'suspended';

                                return (
                                    <tr key={r.id} className="hover:bg-[#1A1D21] transition-colors">
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm"
                                                    style={{ backgroundColor: r.primary_color || '#FBBF24' }}
                                                />
                                                <div>
                                                    <p className="font-bold text-white text-base leading-snug">{r.name}</p>
                                                    <a
                                                        href={`https://${r.slug}.useeasyorder.com`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-xs text-[#FBBF24] hover:underline flex items-center gap-1 mt-0.5"
                                                    >
                                                        {r.slug}.useeasyorder.com
                                                        <ExternalLink size={11} />
                                                    </a>
                                                </div>
                                            </div>
                                        </td>

                                        <td className="py-4 px-6">
                                            <span className="font-semibold text-gray-200 capitalize">
                                                {r.plan_name || r.plan_id}
                                            </span>
                                            <p className="text-xs text-gray-500">${r.price_monthly || 0} / mes</p>
                                        </td>

                                        <td className="py-4 px-6">
                                            {isSuspended ? (
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                                                    Suspendido
                                                </span>
                                            ) : isExpired ? (
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                                    Vencido
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                                    Activo
                                                </span>
                                            )}
                                        </td>

                                        <td className="py-4 px-6">
                                            <p className="text-gray-300 font-mono text-xs">
                                                {new Date(r.subscription_expires_at).toLocaleDateString()}
                                            </p>
                                            <p className={`text-xs mt-0.5 ${
                                                isSuspended ? 'text-gray-500' : isExpired ? 'text-rose-400 font-bold' : daysLeft < 5 ? 'text-amber-400 font-bold' : 'text-gray-500'
                                            }`}>
                                                {isSuspended ? 'Bloqueado' : isExpired ? `Venció hace ${Math.abs(daysLeft)} días` : `${daysLeft} días restantes`}
                                            </p>
                                        </td>

                                        <td className="py-4 px-6 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button
                                                    size="small"
                                                    variant="outlined"
                                                    onClick={() => handleQuickRenew(r)}
                                                    startIcon={<CalendarPlus size={14} />}
                                                    sx={{
                                                        color: '#FBBF24',
                                                        borderColor: '#FBBF24',
                                                        textTransform: 'none',
                                                        fontSize: '0.75rem',
                                                        px: 1.5,
                                                        py: 0.5,
                                                        borderRadius: 2,
                                                        '&:hover': { bgcolor: 'rgba(251,191,36,0.1)', borderColor: '#FBBF24' }
                                                    }}
                                                >
                                                    +30 Días
                                                </Button>

                                                <Button
                                                    size="small"
                                                    variant="contained"
                                                    onClick={() => {
                                                        setSelectedRestaurant(r);
                                                        setIsActionDialogOpen(true);
                                                    }}
                                                    startIcon={<Settings2 size={14} />}
                                                    sx={{
                                                        bgcolor: '#1E2228',
                                                        color: 'white',
                                                        textTransform: 'none',
                                                        fontSize: '0.75rem',
                                                        px: 1.5,
                                                        py: 0.5,
                                                        borderRadius: 2,
                                                        '&:hover': { bgcolor: '#2D333B' }
                                                    }}
                                                >
                                                    Gestionar
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modales */}
            <CreateRestaurantModal
                open={isCreateModalOpen}
                plans={plans}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={(newRest) => setRestaurants(prev => [newRest, ...prev])}
            />

            <SubscriptionActionDialog
                open={isActionDialogOpen}
                restaurant={selectedRestaurant}
                plans={plans}
                onClose={() => {
                    setIsActionDialogOpen(false);
                    setSelectedRestaurant(null);
                }}
                onSuccess={(updated) => {
                    setRestaurants(prev => prev.map(r => r.id === updated.id ? updated : r));
                }}
            />
        </div>
    );
}
