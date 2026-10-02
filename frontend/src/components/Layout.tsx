import React from 'react'
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTenant } from '../context/TenantContext'
import { useGlobalRealtimeSync } from '../hooks/useGlobalRealtimeSync'
import {
    LogOut,
    LayoutDashboard,
    ChefHat,
    ClipboardList,
    Menu,
    Grid,
    DollarSign,
    CalendarDays,
    Building2,
    Users
} from 'lucide-react'
import clsx from 'clsx'
import { Button } from '@mui/material'

export default function Layout() {
    const { role, fullName, signOut } = useAuth()
    const { tenant, isFeatureEnabled } = useTenant()
    const navigate = useNavigate()
    const location = useLocation()
    const [isMobileOpen, setIsMobileOpen] = React.useState(false)

    const primaryColor = tenant?.primary_color || '#FBBF24'

    // Initialize global realtime subscriptions exactly once
    useGlobalRealtimeSync()

    const handleSignOut = async () => {
        await signOut()
        navigate('/login')
    }

    // Close mobile menu when route changes
    React.useEffect(() => {
        setIsMobileOpen(false)
    }, [location.pathname])

    const NavItem = ({ to, icon: Icon, label }: { to: string, icon: any, label: string }) => {
        const isActive = location.pathname === to
        return (
            <Link
                to={to}
                className={clsx(
                    "relative group flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 ease-out font-medium",
                    isActive
                        ? "text-black shadow-lg font-bold translate-x-1"
                        : "text-white hover:bg-[#1F2329]"
                )}
                style={isActive ? { backgroundColor: primaryColor, boxShadow: `0 0 15px ${primaryColor}40` } : undefined}
            >
                <Icon size={20} className={clsx("relative z-10", isActive ? "scale-105" : "group-hover:scale-105")} />
                <span className="relative z-10">{label}</span>
            </Link>
        )
    }

    return (
        <div className="flex h-screen bg-[#111315] text-gray-200 font-sans overflow-hidden">

            {/* Mobile Header */}
            <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-[#141619] border-b border-[#1F2329] z-40 flex items-center px-4 justify-between">
                <div className="flex items-center gap-3">
                    <Button
                        onClick={() => setIsMobileOpen(true)}
                        sx={{ minWidth: 'auto', p: 1, color: primaryColor }}
                    >
                        <Menu size={24} />
                    </Button>
                    <div className="flex flex-col">
                        <h1 className="text-sm font-bold tracking-tight text-white leading-tight">
                            {tenant?.name || 'EASY ORDER'}
                        </h1>
                        <p className="text-[9px] text-gray-500 font-medium uppercase tracking-wider">
                            {tenant?.slug || 'RESTAURANT OS'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Mobile Backdrop */}
            {isMobileOpen && (
                <div
                    className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={clsx(
                "fixed inset-y-0 left-0 z-50 w-64 bg-[#141619] border-r border-[#1F2329] flex flex-col transition-transform duration-300 ease-in-out md:relative md:translate-x-0 h-full",
                isMobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
            )}>
                <div className="h-16 flex items-center gap-3 px-6 border-b border-[#1F2329] shrink-0">
                    <div className="p-1.5 rounded-lg" style={{ backgroundColor: primaryColor }}>
                        {tenant?.logo_url ? (
                            <img src={tenant.logo_url} alt="Logo" className="w-5 h-5 object-contain" />
                        ) : (
                            <Grid className="text-black" size={20} />
                        )}
                    </div>
                    <div className="min-w-0 flex-1">
                        <h1 className="text-base font-bold tracking-tight text-white leading-tight truncate">
                            {tenant?.name || 'EASY ORDER'}
                        </h1>
                        <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider truncate">
                            {tenant?.slug ? `${tenant.slug} • ${tenant.plan_id}` : 'RESTAURANT OS'}
                        </p>
                    </div>
                </div>

                <nav className="flex-1 px-4 space-y-1 py-6 overflow-y-auto custom-scrollbar">

                    {/* SuperAdmin Master Route */}
                    {role === 'superadmin' && (
                        <div className="mb-6">
                            <div className="px-4 text-[10px] font-extrabold text-gray-500 uppercase tracking-widest mb-2 ml-1">Plataforma</div>
                            <NavItem to="/superadmin" icon={Building2} label="Panel Maestro" />
                        </div>
                    )}

                    {/* Admin Routes */}
                    {role === 'admin' && (
                        <div className="mb-6">
                            <div className="px-4 text-[10px] font-extrabold text-gray-500 uppercase tracking-widest mb-2 ml-1">Gestión</div>
                            {isFeatureEnabled('has_analytics') && (
                                <NavItem to="/admin" icon={LayoutDashboard} label="Panel Control" />
                            )}
                            <NavItem to="/menu-editor" icon={Menu} label="Editar Menú" />
                            <NavItem to="/floor-map-editor" icon={Grid} label="Editar Mapa" />
                            <NavItem to="/staff-management" icon={Users} label="Personal" />
                        </div>
                    )}

                    {/* Waiter / Admin Routes */}
                    {(role === 'admin' || role === 'waiter') && (
                        <div className="mb-6">
                            <div className="px-4 text-[10px] font-extrabold text-gray-500 uppercase tracking-widest mb-2 ml-1">Servicio</div>
                            <NavItem to="/tables" icon={Grid} label="Mapa Mesas" />
                            {isFeatureEnabled('has_reservations') && (
                                <NavItem to="/reservations" icon={CalendarDays} label="Reservas" />
                            )}
                            <NavItem to="/orders" icon={ClipboardList} label="Órdenes Activas" />
                            {isFeatureEnabled('has_cash_register') && (
                                <NavItem to="/cash" icon={DollarSign} label="Caja" />
                            )}
                        </div>
                    )}

                    {/* Kitchen / Admin Routes */}
                    {(role === 'admin' || role === 'kitchen') && isFeatureEnabled('has_kitchen_display') && (
                        <div className="mb-6">
                            <div className="px-4 text-[10px] font-extrabold text-gray-500 uppercase tracking-widest mb-2 ml-1">Cocina</div>
                            <NavItem to="/kitchen" icon={ChefHat} label="Monitor Cocina" />
                        </div>
                    )}

                </nav>

                {/* User / Sign Out */}
                <div className="p-4 border-t border-[#1F2329] bg-[#141619] shrink-0">
                    <div className="flex items-center gap-3 mb-4 px-2">
                        <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center font-bold text-xs text-white border border-gray-600">
                            {role?.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-white truncate capitalize">
                                {role ? `${role} - ` : ''}{fullName || 'User'}
                            </p>
                            <p className="text-[10px] text-[#FBBF24] flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#FBBF24] animate-pulse"></span> En Línea
                            </p>
                        </div>
                    </div>
                    <Button
                        fullWidth
                        onClick={handleSignOut}
                        startIcon={<LogOut size={18} />}
                        sx={{
                            color: 'gray',
                            justifyContent: 'flex-start',
                            px: 2,
                            py: 1.5,
                            borderRadius: 3,
                            '&:hover': {
                                bgcolor: 'rgba(255,255,255,0.05)',
                                color: 'white'
                            }
                        }}
                    >
                        Cerrar Sesión
                    </Button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 overflow-hidden relative bg-[#111315] pt-16 md:pt-0">
                <div className="h-full overflow-y-auto custom-scrollbar relative z-10 text-gray-200">
                    <Outlet />
                </div>
            </main>
        </div>
    )
}
