import React, { useState, useEffect, useRef } from 'react'
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTenant, type PlanFeatures } from '../context/TenantContext'
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
import { Button } from '@mui/material'

interface NavItemDef {
    to: string
    icon: any
    label: string
}

interface NavSectionDef {
    title: string
    items: NavItemDef[]
}

function getNavSections(
    role: string | null | undefined,
    isFeatureEnabled: (feature: keyof PlanFeatures) => boolean
): NavSectionDef[] {
    const sections: NavSectionDef[] = []

    if (role === 'superadmin') {
        sections.push({
            title: 'Plataforma',
            items: [{ to: '/superadmin', icon: Building2, label: 'Panel Maestro' }]
        })
    }

    if (role === 'admin') {
        const adminItems: NavItemDef[] = []
        if (isFeatureEnabled('has_analytics')) {
            adminItems.push({ to: '/admin', icon: LayoutDashboard, label: 'Panel Control' })
        }
        adminItems.push(
            { to: '/menu-editor', icon: Menu, label: 'Editar Menú' },
            { to: '/floor-map-editor', icon: Grid, label: 'Editar Mapa' },
            { to: '/staff-management', icon: Users, label: 'Personal' }
        )
        sections.push({ title: 'Gestión', items: adminItems })
    }

    if (role === 'admin' || role === 'waiter') {
        const serviceItems: NavItemDef[] = [{ to: '/tables', icon: Grid, label: 'Mapa Mesas' }]
        if (isFeatureEnabled('has_reservations')) {
            serviceItems.push({ to: '/reservations', icon: CalendarDays, label: 'Reservas' })
        }
        serviceItems.push({ to: '/orders', icon: ClipboardList, label: 'Órdenes Activas' })
        if (isFeatureEnabled('has_cash_register')) {
            serviceItems.push({ to: '/cash', icon: DollarSign, label: 'Caja' })
        }
        sections.push({ title: 'Servicio', items: serviceItems })
    }

    if ((role === 'admin' || role === 'kitchen') && isFeatureEnabled('has_kitchen_display')) {
        sections.push({
            title: 'Cocina',
            items: [{ to: '/kitchen', icon: ChefHat, label: 'Monitor Cocina' }]
        })
    }

    return sections
}

export default function Layout() {
    const { role, fullName, signOut } = useAuth()
    const { tenant, isFeatureEnabled } = useTenant()
    const navigate = useNavigate()
    const location = useLocation()

    const [isSidebarDrawerOpen, setIsSidebarDrawerOpen] = useState(false)
    const primaryColor = tenant?.primary_color || '#FBBF24'

    const triggerElementRef = useRef<HTMLElement | null>(null)
    const closeButtonRef = useRef<HTMLButtonElement | null>(null)
    const mobileTriggerRef = useRef<HTMLButtonElement | null>(null)
    const tabletTriggerRef = useRef<HTMLButtonElement | null>(null)

    // Global realtime sync
    useGlobalRealtimeSync()

    const navSections = React.useMemo(() => {
        return getNavSections(role, isFeatureEnabled)
    }, [role, isFeatureEnabled])

    const handleSignOut = async () => {
        await signOut()
        navigate('/login')
    }

    const openDrawer = (sourceElement?: HTMLElement | null) => {
        triggerElementRef.current = sourceElement || (document.activeElement as HTMLElement) || null
        setIsSidebarDrawerOpen(true)
    }

    const closeDrawer = () => {
        setIsSidebarDrawerOpen(false)
        // Restore focus to the trigger that opened the drawer
        if (triggerElementRef.current && typeof triggerElementRef.current.focus === 'function') {
            setTimeout(() => {
                triggerElementRef.current?.focus()
            }, 50)
        }
    }

    // Keyboard support: Escape key closes the drawer
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isSidebarDrawerOpen) {
                closeDrawer()
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [isSidebarDrawerOpen])

    // Focus management when drawer opens
    useEffect(() => {
        if (isSidebarDrawerOpen) {
            setTimeout(() => {
                closeButtonRef.current?.focus()
            }, 100)
        }
    }, [isSidebarDrawerOpen])

    // Close drawer when route changes
    useEffect(() => {
        setIsSidebarDrawerOpen(false)
    }, [location.pathname])

    // Full Nav Item component (used in Fixed Desktop Sidebar & Drawer)
    const FullNavItem = ({ to, icon: Icon, label, onClick }: { to: string; icon: any; label: string; onClick?: () => void }) => {
        const isActive = location.pathname === to
        return (
            <Link
                to={to}
                onClick={onClick}
                className={clsx(
                    "relative group flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ease-out font-medium",
                    isActive
                        ? "text-black shadow-lg font-bold translate-x-1"
                        : "text-gray-300 hover:text-white hover:bg-[#1F2329]"
                )}
                style={isActive ? { backgroundColor: primaryColor, boxShadow: `0 0 15px ${primaryColor}40` } : undefined}
            >
                <Icon size={20} className={clsx("relative z-10 shrink-0", isActive ? "scale-105" : "group-hover:scale-105")} />
                <span className="relative z-10 truncate text-sm">{label}</span>
            </Link>
        )
    }

    // Compact Nav Item component (used in 72px Tablet Sidebar)
    const CompactNavItem = ({ to, icon: Icon, label }: { to: string; icon: any; label: string }) => {
        const isActive = location.pathname === to
        return (
            <Link
                to={to}
                aria-label={label}
                title={label}
                className={clsx(
                    "relative group flex items-center justify-center w-11 h-11 rounded-xl transition-all duration-200 ease-out shrink-0",
                    isActive
                        ? "text-black shadow-lg font-bold scale-105"
                        : "text-gray-400 hover:text-white hover:bg-[#1F2329]"
                )}
                style={isActive ? { backgroundColor: primaryColor, boxShadow: `0 0 15px ${primaryColor}40` } : undefined}
            >
                <Icon size={20} />
            </Link>
        )
    }

    // Shared Sidebar Content (sections, brand, user profile, logout)
    const renderSidebarContent = (isDrawer = false) => (
        <div className="flex flex-col h-full bg-[#141619]">
            {/* Sidebar Header */}
            <div className="h-16 flex items-center justify-between px-5 border-b border-[#1F2329] shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                    <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-black font-bold shrink-0 shadow-md"
                        style={{ backgroundColor: primaryColor }}
                    >
                        {tenant?.logo_url ? (
                            <img src={tenant.logo_url} alt="Logo" className="w-5 h-5 object-contain" />
                        ) : (
                            <Grid className="text-black" size={20} />
                        )}
                    </div>
                    <div className="min-w-0 flex-1">
                        <h1 className="text-sm font-bold tracking-tight text-white leading-tight truncate">
                            {tenant?.name || 'EASY ORDER'}
                        </h1>
                        <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider truncate">
                            {tenant?.slug ? `${tenant.slug} • ${tenant.plan_id}` : 'RESTAURANT OS'}
                        </p>
                    </div>
                </div>

                {/* Close button in Drawer mode */}
                {isDrawer && (
                    <button
                        ref={closeButtonRef}
                        type="button"
                        onClick={closeDrawer}
                        aria-label="Cerrar menú"
                        className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#1F2329] transition-colors cursor-pointer"
                    >
                        <X size={20} />
                    </button>
                )}
            </div>

            {/* Navigation Sections */}
            <nav className="flex-1 px-3 space-y-5 py-5 overflow-y-auto custom-scrollbar">
                {navSections.map((section) => (
                    <div key={section.title}>
                        <div className="px-4 text-[10px] font-extrabold text-gray-500 uppercase tracking-widest mb-1.5 ml-1">
                            {section.title}
                        </div>
                        <div className="space-y-1">
                            {section.items.map((item) => (
                                <FullNavItem
                                    key={item.to}
                                    to={item.to}
                                    icon={item.icon}
                                    label={item.label}
                                    onClick={isDrawer ? closeDrawer : undefined}
                                />
                            ))}
                        </div>
                    </div>
                ))}
            </nav>

            {/* User Profile / Sign Out */}
            <div className="p-4 border-t border-[#1F2329] bg-[#141619] shrink-0">
                <div className="flex items-center gap-3 mb-3 px-2">
                    <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center font-bold text-xs text-white border border-gray-600 shrink-0">
                        {role?.substring(0, 2).toUpperCase()}
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
                <Button
                    fullWidth
                    onClick={handleSignOut}
                    startIcon={<LogOut size={16} />}
                    sx={{
                        color: 'gray',
                        justifyContent: 'flex-start',
                        px: 2,
                        py: 1,
                        fontSize: '0.8125rem',
                        borderRadius: 2.5,
                        textTransform: 'none',
                        '&:hover': {
                            bgcolor: 'rgba(255,255,255,0.05)',
                            color: 'white'
                        }
                    }}
                >
                    Cerrar Sesión
                </Button>
            </div>
        </div>
    )

    return (
        <div className="flex h-screen bg-[#111315] text-gray-200 font-sans overflow-hidden">

            {/* Mobile Header (< 768px) */}
            <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-[#141619] border-b border-[#1F2329] z-40 flex items-center px-4 justify-between">
                <div className="flex items-center gap-3">
                    <button
                        ref={mobileTriggerRef}
                        type="button"
                        onClick={() => openDrawer(mobileTriggerRef.current)}
                        aria-label="Abrir menú de navegación"
                        aria-expanded={isSidebarDrawerOpen}
                        className="p-2 rounded-xl text-black font-bold shadow-md cursor-pointer transition-transform active:scale-95 flex items-center justify-center"
                        style={{ backgroundColor: primaryColor }}
                    >
                        <Menu size={20} />
                    </button>
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

            {/* Tablet Compact Sidebar (768px - 1023px, 72px width) */}
            <aside
                className="hidden md:flex lg:hidden w-[72px] shrink-0 bg-[#141619] border-r border-[#1F2329] flex-col items-center py-3 h-full z-30"
                aria-label="Barra lateral compacta de navegación"
            >
                {/* Yellow button at the top-left corner */}
                <div className="h-14 flex items-center justify-center shrink-0 mb-3">
                    <button
                        ref={tabletTriggerRef}
                        type="button"
                        onClick={() => openDrawer(tabletTriggerRef.current)}
                        aria-label="Abrir menú lateral completo"
                        aria-expanded={isSidebarDrawerOpen}
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-black font-bold shadow-lg transition-transform hover:scale-105 active:scale-95 cursor-pointer"
                        style={{ backgroundColor: primaryColor, boxShadow: `0 0 16px ${primaryColor}50` }}
                    >
                        {tenant?.logo_url ? (
                            <img src={tenant.logo_url} alt="Logo" className="w-6 h-6 object-contain" />
                        ) : (
                            <Grid size={22} />
                        )}
                    </button>
                </div>

                {/* Compact icon navigation list */}
                <nav className="flex-1 w-full flex flex-col items-center gap-2 overflow-y-auto custom-scrollbar px-1.5 py-1">
                    {navSections.map((section) => (
                        <div key={section.title} className="w-full flex flex-col items-center gap-1.5 mb-1.5">
                            <div className="w-5 h-[1px] bg-gray-800 my-0.5" />
                            {section.items.map((item) => (
                                <CompactNavItem key={item.to} to={item.to} icon={item.icon} label={item.label} />
                            ))}
                        </div>
                    ))}
                </nav>

                {/* Logout button at bottom */}
                <div className="pt-2 border-t border-[#1F2329] flex flex-col items-center shrink-0">
                    <button
                        type="button"
                        onClick={handleSignOut}
                        aria-label="Cerrar Sesión"
                        title="Cerrar Sesión"
                        className="w-11 h-11 rounded-xl flex items-center justify-center text-gray-400 hover:text-white hover:bg-[#1F2329] transition-colors cursor-pointer"
                    >
                        <LogOut size={18} />
                    </button>
                </div>
            </aside>

            {/* Desktop Full Fixed Sidebar (>= 1024px) */}
            <aside
                className="hidden lg:flex w-64 shrink-0 bg-[#141619] border-r border-[#1F2329] flex-col h-full z-30"
                aria-label="Menú principal de escritorio"
            >
                {renderSidebarContent(false)}
            </aside>

            {/* Backdrop for Mobile & Tablet Drawer */}
            <div
                className={clsx(
                    "fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300",
                    isSidebarDrawerOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                )}
                onClick={closeDrawer}
                aria-hidden="true"
            />

            {/* Full Sidebar Drawer Overlay (Appears over content without shrinking or pushing cards) */}
            <aside
                id="responsive-sidebar-drawer"
                role="dialog"
                aria-modal="true"
                aria-label="Menú de navegación completo"
                className={clsx(
                    "fixed inset-y-0 left-0 z-50 w-72 bg-[#141619] border-r border-[#1F2329] flex flex-col shadow-2xl transition-transform duration-300 ease-in-out lg:hidden h-full",
                    isSidebarDrawerOpen ? "translate-x-0" : "-translate-x-full pointer-events-none"
                )}
            >
                {renderSidebarContent(true)}
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

