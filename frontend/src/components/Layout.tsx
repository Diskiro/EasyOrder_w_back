import React, { useState, useEffect, useRef, useMemo } from 'react'
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
    Users,
    X
} from 'lucide-react'
import clsx from 'clsx'

interface NavItemDef {
    to: string
    icon: React.ComponentType<{ size?: number; className?: string }>
    label: string
    section: string
}

function useNavigationItems() {
    const { role } = useAuth()
    const { isFeatureEnabled } = useTenant()

    return useMemo(() => {
        const items: NavItemDef[] = []

        if (role === 'superadmin') {
            items.push({ to: '/superadmin', icon: Building2, label: 'Panel Maestro', section: 'Plataforma' })
        }

        if (role === 'admin') {
            if (isFeatureEnabled('has_analytics')) {
                items.push({ to: '/admin', icon: LayoutDashboard, label: 'Panel Control', section: 'Gestión' })
            }
            items.push(
                { to: '/menu-editor', icon: Menu, label: 'Editar Menú', section: 'Gestión' },
                { to: '/floor-map-editor', icon: Grid, label: 'Editar Mapa', section: 'Gestión' },
                { to: '/staff-management', icon: Users, label: 'Personal', section: 'Gestión' }
            )
        }

        if (role === 'admin' || role === 'waiter') {
            items.push({ to: '/tables', icon: Grid, label: 'Mapa Mesas', section: 'Servicio' })
            if (isFeatureEnabled('has_reservations')) {
                items.push({ to: '/reservations', icon: CalendarDays, label: 'Reservas', section: 'Servicio' })
            }
            items.push({ to: '/orders', icon: ClipboardList, label: 'Órdenes Activas', section: 'Servicio' })
            if (isFeatureEnabled('has_cash_register')) {
                items.push({ to: '/cash', icon: DollarSign, label: 'Caja', section: 'Servicio' })
            }
        }

        if ((role === 'admin' || role === 'kitchen') && isFeatureEnabled('has_kitchen_display')) {
            items.push({ to: '/kitchen', icon: ChefHat, label: 'Monitor Cocina', section: 'Cocina' })
        }

        return items
    }, [role, isFeatureEnabled])
}

export default function Layout() {
    const { role, fullName, signOut } = useAuth()
    const { tenant } = useTenant()
    const navigate = useNavigate()
    const location = useLocation()
    const [isDrawerOpen, setIsDrawerOpen] = useState(false)

    const toggleButtonRef = useRef<HTMLButtonElement | null>(null)
    const mobileButtonRef = useRef<HTMLButtonElement | null>(null)
    const closeButtonRef = useRef<HTMLButtonElement | null>(null)

    const navItems = useNavigationItems()

    // Initialize global realtime subscriptions exactly once
    useGlobalRealtimeSync()

    const handleSignOut = async () => {
        await signOut()
        navigate('/login')
    }

    // Close drawer when route changes
    useEffect(() => {
        setIsDrawerOpen(false)
    }, [location.pathname])

    // Keyboard listener: Escape closes drawer and restores focus
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isDrawerOpen) {
                setIsDrawerOpen(false)
                toggleButtonRef.current?.focus() || mobileButtonRef.current?.focus()
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [isDrawerOpen])

    // Move focus to close button when drawer opens
    useEffect(() => {
        if (isDrawerOpen) {
            closeButtonRef.current?.focus()
        }
    }, [isDrawerOpen])

    const userInitials = useMemo(() => {
        if (fullName) {
            const parts = fullName.trim().split(/\s+/)
            if (parts.length >= 2) {
                return (parts[0][0] + parts[1][0]).toUpperCase()
            }
            return parts[0].substring(0, 2).toUpperCase()
        }
        return (role?.substring(0, 2) || 'US').toUpperCase()
    }, [fullName, role])

    // Group items by section
    const sections = useMemo(() => {
        const map = new Map<string, NavItemDef[]>()
        for (const item of navItems) {
            const list = map.get(item.section) || []
            list.push(item)
            map.set(item.section, list)
        }
        return Array.from(map.entries())
    }, [navItems])

    return (
        <div className="flex h-screen bg-[#0D0F12] text-gray-200 font-sans overflow-hidden">
            {/* Mobile Top Header (< md) */}
            <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-[#0E1015] border-b border-[#1F2430] z-40 flex items-center px-4 justify-between">
                <div className="flex items-center gap-3">
                    <button
                        ref={mobileButtonRef}
                        type="button"
                        onClick={() => setIsDrawerOpen(true)}
                        aria-label="Abrir menú de navegación"
                        aria-expanded={isDrawerOpen}
                        aria-controls="navigation-drawer"
                        className="w-10 h-10 bg-[#FBBF24] text-black rounded-xl flex items-center justify-center cursor-pointer shadow-md hover:bg-yellow-400 active:scale-95 transition-all"
                    >
                        <Grid size={20} className="stroke-[2.5]" />
                    </button>
                    <div className="flex flex-col min-w-0">
                        <h1 className="text-sm font-bold tracking-tight text-white leading-tight truncate">
                            {tenant?.name || 'EASY ORDER'}
                        </h1>
                        <p className="text-[9px] text-gray-500 font-medium uppercase tracking-wider truncate">
                            {tenant?.slug ? `${tenant.slug} • ${tenant.plan_id || 'ENTERPRISE'}` : 'RESTAURANT OS'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Tablet Compact Sidebar (72px wide: md to xl) */}
            <aside
                aria-label="Barra lateral compacta"
                className="w-[72px] shrink-0 bg-[#0E1116] border-r border-[#1B1F27] hidden md:flex xl:hidden flex-col items-center py-4 justify-between h-full z-30 select-none"
            >
                <div className="flex flex-col items-center gap-3 w-full">
                    {/* Yellow trigger button for full drawer menu */}
                    <button
                        ref={toggleButtonRef}
                        type="button"
                        onClick={() => setIsDrawerOpen(prev => !prev)}
                        aria-label="Abrir menú lateral completo"
                        aria-expanded={isDrawerOpen}
                        aria-controls="navigation-drawer"
                        className="w-11 h-11 bg-[#FBBF24] text-black rounded-xl flex items-center justify-center cursor-pointer shadow-md hover:bg-yellow-400 active:scale-95 transition-all mb-3 shrink-0"
                    >
                        <Grid size={22} className="stroke-[2.5]" />
                    </button>

                    {/* Compact Icon Navigation List */}
                    <nav className="flex flex-col items-center gap-2 w-full px-2 overflow-y-auto custom-scrollbar max-h-[calc(100vh-190px)] py-1" aria-label="Navegación compacta">
                        {navItems.map((item) => {
                            const isActive = location.pathname === item.to
                            return (
                                <Link
                                    key={item.to}
                                    to={item.to}
                                    title={item.label}
                                    aria-label={item.label}
                                    className={clsx(
                                        "w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-200 cursor-pointer",
                                        isActive
                                            ? "bg-[#FBBF24] text-black shadow-lg shadow-yellow-500/20 font-bold"
                                            : "text-gray-400 hover:text-white hover:bg-[#181B22]"
                                    )}
                                >
                                    <item.icon size={20} className={isActive ? "stroke-[2.5]" : "stroke-2"} />
                                </Link>
                            )
                        })}
                    </nav>
                </div>

                {/* Bottom User Avatar & Logout */}
                <div className="flex flex-col items-center gap-3 shrink-0 pt-2 border-t border-[#1B1F27] w-full px-2">
                    <div
                        title={fullName || role || 'Usuario'}
                        className="w-9 h-9 rounded-full bg-[#1F232D] border border-gray-700 text-white font-bold text-xs flex items-center justify-center shadow-inner"
                    >
                        {userInitials}
                    </div>
                    <button
                        type="button"
                        onClick={handleSignOut}
                        aria-label="Cerrar sesión"
                        title="Cerrar sesión"
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-400 hover:text-rose-400 hover:bg-[#1A1E27] transition-colors cursor-pointer"
                    >
                        <LogOut size={18} />
                    </button>
                </div>
            </aside>

            {/* Desktop Fixed Sidebar (>= xl, 1280px+) */}
            <aside
                aria-label="Menú principal de escritorio"
                className="w-64 bg-[#0E1116] border-r border-[#1B1F27] hidden xl:flex flex-col h-full shrink-0 z-30"
            >
                <div className="h-16 flex items-center gap-3 px-6 border-b border-[#1B1F27] shrink-0">
                    <div className="p-2 rounded-xl bg-[#FBBF24] text-black shrink-0">
                        <Grid size={20} className="stroke-[2.5]" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <h1 className="text-base font-bold tracking-tight text-white leading-tight truncate">
                            {tenant?.name || 'EASY ORDER'}
                        </h1>
                        <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider truncate">
                            {tenant?.slug ? `${tenant.slug} • ${tenant.plan_id || 'ENTERPRISE'}` : 'RESTAURANT OS'}
                        </p>
                    </div>
                </div>

                <nav className="flex-1 px-4 space-y-6 py-6 overflow-y-auto custom-scrollbar" aria-label="Navegación de escritorio">
                    {sections.map(([sectionName, items]) => (
                        <div key={sectionName}>
                            <div className="px-3 text-[10px] font-extrabold text-gray-500 uppercase tracking-widest mb-2 ml-1">
                                {sectionName}
                            </div>
                            <div className="space-y-1">
                                {items.map((item) => {
                                    const isActive = location.pathname === item.to
                                    return (
                                        <Link
                                            key={item.to}
                                            to={item.to}
                                            className={clsx(
                                                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ease-out font-medium text-sm",
                                                isActive
                                                    ? "bg-[#FBBF24] text-black font-bold shadow-lg shadow-yellow-500/20 translate-x-1"
                                                    : "text-gray-300 hover:text-white hover:bg-[#181B22]"
                                            )}
                                        >
                                            <item.icon size={19} className={isActive ? "stroke-[2.5]" : "stroke-2"} />
                                            <span>{item.label}</span>
                                        </Link>
                                    )
                                })}
                            </div>
                        </div>
                    ))}
                </nav>

                {/* User / Sign Out */}
                <div className="p-4 border-t border-[#1B1F27] bg-[#0E1116] shrink-0">
                    <div className="flex items-center gap-3 mb-3 px-2">
                        <div className="w-8 h-8 rounded-full bg-[#1F232D] border border-gray-700 flex items-center justify-center font-bold text-xs text-white">
                            {userInitials}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-white truncate capitalize">
                                {role ? `${role} - ` : ''}{fullName || 'Usuario'}
                            </p>
                            <p className="text-[10px] text-[#FBBF24] flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#FBBF24] animate-pulse"></span> En Línea
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors cursor-pointer"
                    >
                        <LogOut size={16} />
                        <span>Cerrar Sesión</span>
                    </button>
                </div>
            </aside>

            {/* Drawer Overlay (Available for Mobile and Tablet, slides over content without shrinking cards) */}
            <div
                className={clsx(
                    "fixed inset-0 bg-black/70 backdrop-blur-sm z-50 transition-opacity duration-300 xl:hidden",
                    isDrawerOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                )}
                onClick={() => {
                    setIsDrawerOpen(false)
                    toggleButtonRef.current?.focus() || mobileButtonRef.current?.focus()
                }}
                aria-hidden="true"
            />

            <aside
                id="navigation-drawer"
                role="dialog"
                aria-modal="true"
                aria-label="Menú de navegación completo"
                className={clsx(
                    "fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-[#12141A] border-r border-[#1F2430] shadow-2xl flex flex-col transition-transform duration-300 ease-out xl:hidden",
                    isDrawerOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                {/* Drawer Header with Close Button */}
                <div className="h-16 flex items-center justify-between px-5 border-b border-[#1F2430] shrink-0 bg-[#0E1015]">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 rounded-xl bg-[#FBBF24] text-black shrink-0">
                            <Grid size={18} className="stroke-[2.5]" />
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-sm font-bold text-white tracking-tight truncate">{tenant?.name || 'Restaurante Demo'}</h2>
                            <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider truncate">
                                {tenant?.slug ? `${tenant.slug} • ${tenant.plan_id || 'ENTERPRISE'}` : 'DEMO • ENTERPRISE'}
                            </p>
                        </div>
                    </div>
                    <button
                        ref={closeButtonRef}
                        type="button"
                        onClick={() => {
                            setIsDrawerOpen(false)
                            toggleButtonRef.current?.focus() || mobileButtonRef.current?.focus()
                        }}
                        aria-label="Cerrar menú"
                        className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-xl transition-colors cursor-pointer"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Drawer Nav Items */}
                <nav className="flex-1 px-4 space-y-6 py-5 overflow-y-auto custom-scrollbar" aria-label="Navegación del menú lateral">
                    {sections.map(([sectionName, items]) => (
                        <div key={sectionName}>
                            <div className="px-3 text-[10px] font-extrabold text-gray-500 uppercase tracking-widest mb-2">
                                {sectionName}
                            </div>
                            <div className="space-y-1">
                                {items.map((item) => {
                                    const isActive = location.pathname === item.to
                                    return (
                                        <Link
                                            key={item.to}
                                            to={item.to}
                                            onClick={() => setIsDrawerOpen(false)}
                                            className={clsx(
                                                "flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all duration-200 font-medium text-sm cursor-pointer",
                                                isActive
                                                    ? "bg-[#FBBF24] text-black font-bold shadow-md shadow-yellow-500/20 translate-x-1"
                                                    : "text-gray-300 hover:text-white hover:bg-[#1A1E26]"
                                            )}
                                        >
                                            <item.icon size={19} className={isActive ? "stroke-[2.5]" : "stroke-2"} />
                                            <span>{item.label}</span>
                                        </Link>
                                    )
                                })}
                            </div>
                        </div>
                    ))}
                </nav>

                {/* Footer User Info & Logout */}
                <div className="p-4 border-t border-[#1F2430] bg-[#0E1015] shrink-0">
                    <div className="flex items-center gap-3 mb-3 px-1">
                        <div className="w-8 h-8 rounded-full bg-[#1F2430] border border-gray-700 flex items-center justify-center font-bold text-xs text-white">
                            {userInitials}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-white truncate capitalize">
                                {role ? `${role} - ` : ''}{fullName || 'Usuario'}
                            </p>
                            <p className="text-[10px] text-[#FBBF24] flex items-center gap-1 font-medium">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#FBBF24] animate-pulse"></span> En Línea
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors cursor-pointer"
                    >
                        <LogOut size={16} />
                        <span>Cerrar Sesión</span>
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 overflow-x-hidden overflow-y-auto relative bg-[#0D0F12] pt-16 md:pt-0 custom-scrollbar">
                <Outlet />
            </main>
        </div>
    )
}

