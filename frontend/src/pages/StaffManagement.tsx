import React, { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../lib/api'
import {
    Shield,
    Users,
    Plus,
    Pencil,
    UserCheck,
    UserX,
    User,
    MoreVertical,
    Calendar,
    Check,
    X,
    Loader2
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useUI } from '../context/UIContext'
import { useAuth } from '../context/AuthContext'
import { useTenantOptional } from '../context/TenantContext'

// --- Interfaces ---
export interface Profile {
    id: string
    email: string
    full_name: string
    role: 'admin' | 'waiter' | 'kitchen'
    is_active: boolean
    created_at: string
}

type StatusFilter = 'all' | 'active' | 'inactive'

function getRoleBadge(role: string) {
    if (role === 'admin') {
        return {
            className: 'bg-[#2D1B4E] text-[#C084FC] border-[#A855F7]/40',
            label: 'Admin'
        }
    }
    if (role === 'kitchen') {
        return {
            className: 'bg-[#3B2214] text-[#FB923C] border-[#EA580C]/40',
            label: 'Cocina'
        }
    }
    return {
        className: 'bg-[#132A46] text-[#60A5FA] border-[#2563EB]/40',
        label: 'Mesero'
    }
}

// --- Subcomponent: Create Staff Modal ---
interface CreateStaffModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: (name: string) => void
}

function CreateStaffModal({ isOpen, onClose, onSuccess }: Readonly<CreateStaffModalProps>) {
    const { showAlert } = useUI()
    const [newUserEmail, setNewUserEmail] = useState('')
    const [newUserPassword, setNewUserPassword] = useState('')
    const [newUserName, setNewUserName] = useState('')
    const [newUserRole, setNewUserRole] = useState<'waiter' | 'kitchen' | 'admin'>('waiter')
    const [isCreating, setIsCreating] = useState(false)

    if (!isOpen) return null

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newUserEmail.trim() || !newUserName.trim() || !newUserPassword.trim()) {
            showAlert('Todos los campos son obligatorios', 'warning')
            return
        }

        setIsCreating(true)

        try {
            await apiFetch('/auth/register', {
                method: 'POST',
                body: JSON.stringify({
                    email: newUserEmail.trim(),
                    password: newUserPassword,
                    fullName: newUserName.trim(),
                    role: newUserRole
                })
            })

            const createdName = newUserName.trim()
            setNewUserEmail('')
            setNewUserPassword('')
            setNewUserName('')
            setNewUserRole('waiter')
            onSuccess(createdName)
        } catch (err: any) {
            showAlert('Error al crear usuario: ' + err.message, 'error')
        } finally {
            setIsCreating(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[#14171E] rounded-2xl border border-gray-800 w-full max-w-md p-6 shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Users size={20} className="text-[#FBBF24]" />
                        Crear Nuevo Usuario
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors cursor-pointer"
                        aria-label="Cerrar modal"
                    >
                        <X size={22} />
                    </button>
                </div>

                <form onSubmit={handleCreateUser} className="space-y-4">
                    <div>
                        <label htmlFor="create-full-name" className="block text-sm font-medium text-gray-300 mb-1">
                            Nombre Completo
                        </label>
                        <input
                            id="create-full-name"
                            type="text"
                            required
                            value={newUserName}
                            onChange={e => setNewUserName(e.target.value)}
                            className="w-full bg-[#0D0F13] border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:border-[#FBBF24] outline-none transition-colors text-sm"
                            placeholder="Ej. Juan Pérez"
                        />
                    </div>

                    <div>
                        <label htmlFor="create-email" className="block text-sm font-medium text-gray-300 mb-1">
                            Correo Electrónico
                        </label>
                        <input
                            id="create-email"
                            type="email"
                            required
                            value={newUserEmail}
                            onChange={e => setNewUserEmail(e.target.value)}
                            className="w-full bg-[#0D0F13] border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:border-[#FBBF24] outline-none transition-colors text-sm"
                            placeholder="correo@ejemplo.com"
                        />
                    </div>

                    <div>
                        <label htmlFor="create-password" className="block text-sm font-medium text-gray-300 mb-1">
                            Contraseña
                        </label>
                        <input
                            id="create-password"
                            type="password"
                            required
                            minLength={6}
                            value={newUserPassword}
                            onChange={e => setNewUserPassword(e.target.value)}
                            className="w-full bg-[#0D0F13] border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:border-[#FBBF24] outline-none transition-colors text-sm"
                            placeholder="Mínimo 6 caracteres"
                        />
                    </div>

                    <div>
                        <label htmlFor="create-role" className="block text-sm font-medium text-gray-300 mb-1">
                            Rol Inicial
                        </label>
                        <select
                            id="create-role"
                            value={newUserRole}
                            onChange={e => setNewUserRole(e.target.value as any)}
                            className="w-full bg-[#0D0F13] border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:border-[#FBBF24] outline-none transition-colors text-sm"
                        >
                            <option value="waiter">Mesero</option>
                            <option value="kitchen">Cocina</option>
                            <option value="admin">Admin</option>
                        </select>
                    </div>

                    <button
                        type="submit"
                        disabled={isCreating}
                        className="w-full bg-[#FBBF24] text-black font-bold py-3 rounded-xl hover:bg-yellow-400 active:scale-95 transition-all flex justify-center items-center mt-6 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-lg shadow-yellow-500/10 text-sm"
                    >
                        {isCreating ? <Loader2 size={18} className="animate-spin" /> : 'Crear Usuario'}
                    </button>
                </form>
            </div>
        </div>
    )
}

// --- Subcomponent: Staff Status Badge ---
function StaffStatusBadge({ isActive }: Readonly<{ isActive: boolean }>) {
    if (isActive) {
        return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#0D2821] text-[#2DD4BF] border border-[#2DD4BF]/30 shrink-0 select-none">
                <span className="w-2 h-2 rounded-full bg-[#2DD4BF] animate-pulse" />
                <span>Activo</span>
            </span>
        )
    }

    return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#2D121B] text-[#FF5C7A] border border-[#FF5C7A]/30 shrink-0 select-none">
            <span className="w-2 h-2 rounded-full bg-[#FF5C7A]" />
            <span>Inactivo</span>
        </span>
    )
}

// --- Subcomponent: Staff Card (Single Column View) ---
interface StaffCardProps {
    profile: Profile
    isCurrentUser: boolean
    isEditing: boolean
    selectedRole: string
    onEditClick: (profile: Profile) => void
    onSaveRole: (id: string) => void
    onCancelEdit: () => void
    onChangeRole: (role: string) => void
    onToggleStatus: (profile: Profile) => void
    onDeleteStaff: (profile: Profile) => void
}

function StaffCard({
    profile,
    isCurrentUser,
    isEditing,
    selectedRole,
    onEditClick,
    onSaveRole,
    onCancelEdit,
    onChangeRole,
    onToggleStatus,
    onDeleteStaff
}: Readonly<StaffCardProps>) {
    const isActive = profile.is_active !== false
    const roleBadge = getRoleBadge(profile.role)

    const formattedDate = profile.created_at
        ? format(new Date(profile.created_at), 'dd MMM yyyy', { locale: es })
        : '-'

    return (
        <div className="bg-[#14171E] rounded-2xl border border-[#202530] p-5 shadow-lg hover:border-gray-700/70 transition-all space-y-4">
            {/* Top row: Avatar, Info & Status */}
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-[#202533] text-white font-bold text-lg flex items-center justify-center shrink-0 border border-gray-700/40 shadow-inner">
                        {profile.full_name?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <h3 className="text-white font-bold text-base truncate">{profile.full_name || 'Sin Nombre'}</h3>
                            {isCurrentUser && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#FBBF24]/20 text-[#FBBF24] border border-[#FBBF24]/40 shrink-0">
                                    Tú
                                </span>
                            )}
                        </div>
                        <p className="text-gray-400 text-sm truncate mt-0.5">{profile.email}</p>
                    </div>
                </div>
                <StaffStatusBadge isActive={isActive} />
            </div>

            {/* Middle row: Role & Registration Date */}
            <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-gray-800/60 text-xs">
                <div className="flex items-center gap-2">
                    <span className="text-gray-400 font-medium">Rol:</span>
                    {isEditing ? (
                        <select
                            aria-label="Seleccionar rol"
                            value={selectedRole}
                            onChange={(e) => onChangeRole(e.target.value)}
                            className="bg-[#0D0F13] text-white border border-gray-600 rounded-lg px-2.5 py-1 text-xs focus:border-[#FBBF24] outline-none"
                        >
                            <option value="waiter">Mesero</option>
                            <option value="kitchen">Cocina</option>
                            <option value="admin">Admin</option>
                        </select>
                    ) : (
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium capitalize border ${roleBadge.className}`}>
                            <Shield size={13} />
                            <span>{roleBadge.label}</span>
                        </span>
                    )}
                </div>

                <span className="h-3.5 w-px bg-gray-800 hidden sm:inline-block" aria-hidden="true" />

                <div className="flex items-center gap-1.5 text-gray-400 text-xs">
                    <Calendar size={14} className="text-gray-400 shrink-0" />
                    <span>Alta: {formattedDate}</span>
                </div>
            </div>

            {/* Bottom row: Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-gray-800/60">
                <div className="flex items-center gap-2.5 flex-wrap">
                    {isEditing ? (
                        <>
                            <button
                                type="button"
                                onClick={() => onSaveRole(profile.id)}
                                aria-label={`Guardar rol para ${profile.full_name || profile.email}`}
                                className="px-4 py-2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                            >
                                <Check size={14} />
                                <span>Guardar</span>
                            </button>
                            <button
                                type="button"
                                onClick={onCancelEdit}
                                aria-label="Cancelar edición de rol"
                                className="px-4 py-2 bg-gray-800 text-gray-300 border border-gray-700 hover:bg-gray-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                            >
                                <X size={14} />
                                <span>Cancelar</span>
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                type="button"
                                onClick={() => onEditClick(profile)}
                                aria-label={`Editar rol de ${profile.full_name || profile.email}`}
                                className="px-4 py-2 rounded-xl border border-gray-700/80 hover:border-gray-500 bg-[#161922]/50 text-gray-300 hover:text-white text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer"
                            >
                                <Pencil size={13} />
                                <span>Cambiar rol</span>
                            </button>

                            {isActive ? (
                                isCurrentUser ? (
                                    <button
                                        type="button"
                                        disabled
                                        aria-label="Tu cuenta de administrador"
                                        className="px-4 py-2 rounded-xl border border-gray-800 text-gray-500 bg-gray-900/40 text-xs font-medium flex items-center gap-2 cursor-not-allowed"
                                    >
                                        <User size={13} />
                                        <span>Tu cuenta</span>
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => void onToggleStatus(profile)}
                                        aria-label="Desactivar acceso"
                                        className="px-4 py-2 rounded-xl border border-amber-500/50 text-amber-400 hover:bg-amber-500/10 bg-amber-950/20 text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer"
                                    >
                                        <UserX size={13} />
                                        <span>Desactivar</span>
                                    </button>
                                )
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => void onToggleStatus(profile)}
                                    aria-label="Reactivar acceso"
                                    className="px-4 py-2 rounded-xl border border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10 bg-emerald-950/20 text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer"
                                >
                                    <UserCheck size={13} />
                                    <span>Reactivar</span>
                                </button>
                            )}
                        </>
                    )}
                </div>

                {/* More options button (Safe delete) */}
                <button
                    type="button"
                    disabled={isCurrentUser}
                    onClick={() => void onDeleteStaff(profile)}
                    aria-label={isCurrentUser ? 'No puedes eliminar tu propia cuenta' : `Eliminar a ${profile.full_name || profile.email}`}
                    title={isCurrentUser ? 'No puedes eliminar tu propia cuenta' : 'Eliminar personal'}
                    className="p-2 border border-gray-700/80 hover:border-gray-500 text-gray-400 hover:text-rose-400 rounded-xl transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                >
                    <MoreVertical size={16} />
                </button>
            </div>
        </div>
    )
}

// --- Main StaffManagement Component ---
export default function StaffManagement() {
    const queryClient = useQueryClient()
    const { showAlert, showConfirm } = useUI()
    const { user } = useAuth()
    const tenantCtx = useTenantOptional()
    const tenant = tenantCtx?.tenant

    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
    const [editingId, setEditingId] = useState<string | null>(null)
    const [selectedRole, setSelectedRole] = useState<string>('')
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

    // 1. Fetch all profiles once
    const { data: allProfiles, isLoading, error } = useQuery({
        queryKey: ['staff'],
        queryFn: async () => {
            const data = await apiFetch('/auth/staff')
            return data as Profile[]
        }
    })

    const profilesList = allProfiles || []
    const totalCount = profilesList.length
    const activeCount = profilesList.filter(p => p.is_active !== false).length
    const inactiveCount = profilesList.filter(p => p.is_active === false).length

    const filteredProfiles = useMemo(() => {
        if (statusFilter === 'active') {
            return profilesList.filter(p => p.is_active !== false)
        }
        if (statusFilter === 'inactive') {
            return profilesList.filter(p => p.is_active === false)
        }
        return profilesList
    }, [profilesList, statusFilter])

    // 2. Update Role Mutation
    const updateRoleMutation = useMutation({
        mutationFn: async ({ id, newRole }: { id: string; newRole: string }) => {
            await apiFetch(`/auth/staff/${id}`, {
                method: 'PATCH',
                body: JSON.stringify({ role: newRole })
            })
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['staff'] })
            setEditingId(null)
            showAlert('Rol actualizado correctamente', 'success')
        },
        onError: (err: any) => {
            showAlert('Error al actualizar rol: ' + err.message, 'error')
        }
    })

    // 3. Toggle Status Mutation
    const toggleStatusMutation = useMutation({
        mutationFn: async ({ id, nextStatus }: { id: string; nextStatus: boolean }) => {
            await apiFetch(`/auth/staff/${id}`, {
                method: 'PATCH',
                body: JSON.stringify({ isActive: nextStatus })
            })
        },
        onSuccess: (_, variables) => {
            void queryClient.invalidateQueries({ queryKey: ['staff'] })
            showAlert(
                variables.nextStatus
                    ? 'Empleado reactivado exitosamente.'
                    : 'Empleado desactivado. Se ha revocado su acceso y cerrado su sesión.',
                'success'
            )
        },
        onError: (err: any) => {
            showAlert('Error al actualizar estado: ' + err.message, 'error')
        }
    })

    // 4. Safe Delete Mutation
    const deleteStaffMutation = useMutation({
        mutationFn: async (id: string) => {
            return await apiFetch(`/auth/staff/${id}`, {
                method: 'DELETE'
            })
        },
        onSuccess: (data: any) => {
            void queryClient.invalidateQueries({ queryKey: ['staff'] })
            showAlert(data?.message || 'Operación completada exitosamente', 'success')
        },
        onError: (err: any) => {
            showAlert('Error al procesar la solicitud: ' + err.message, 'error')
        }
    })

    const handleEditClick = (profile: Profile) => {
        setEditingId(profile.id)
        setSelectedRole(profile.role)
    }

    const handleSaveRole = (id: string) => {
        if (!selectedRole) return
        updateRoleMutation.mutate({ id, newRole: selectedRole })
    }

    const handleCancelEdit = () => {
        setEditingId(null)
        setSelectedRole('')
    }

    const handleToggleStatus = async (profile: Profile) => {
        if (profile.id === user?.id) {
            showAlert('No puedes desactivar tu propia cuenta de administrador.', 'warning')
            return
        }

        const nextStatus = profile.is_active === false
        const title = nextStatus ? 'Reactivar Personal' : 'Desactivar Personal'
        const message = nextStatus
            ? `¿Deseas reactivar el acceso para "${profile.full_name || profile.email}"?`
            : `¿Deseas desactivar a "${profile.full_name || profile.email}"? Su sesión actual se cerrará inmediatamente y no podrá acceder al sistema.`

        const confirmed = await showConfirm(title, message)
        if (!confirmed) return

        toggleStatusMutation.mutate({ id: profile.id, nextStatus })
    }

    const handleDeleteStaff = async (profile: Profile) => {
        if (profile.id === user?.id) {
            showAlert('No puedes eliminar tu propia cuenta de administrador.', 'warning')
            return
        }

        const confirmed = await showConfirm(
            'Eliminar Personal',
            `¿Estás seguro de que deseas eliminar a "${profile.full_name || profile.email}"? Si el empleado cuenta con historial de pedidos o turnos de caja registrados, el sistema lo desactivará de forma segura para proteger la integridad contable.`
        )
        if (!confirmed) return

        deleteStaffMutation.mutate(profile.id)
    }

    const handleCreatedUserSuccess = (createdName: string) => {
        showAlert(`Usuario "${createdName}" creado exitosamente!`, 'success')
        setIsCreateModalOpen(false)
        void queryClient.invalidateQueries({ queryKey: ['staff'] })
    }

    if (isLoading) return <div className="p-8 text-gray-400">Cargando personal...</div>
    if (error) return <div className="p-8 text-red-500">Error al cargar personal</div>

    return (
        <div className="w-full max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
            {/* Top Restaurant Subtitle / Plan Tag */}
            <div className="space-y-0.5">
                <p className="text-sm font-bold text-white tracking-wide">{tenant?.name || 'Restaurante Demo'}</p>
                <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
                    {tenant?.slug ? `${tenant.slug} • ${tenant.plan_id || 'ENTERPRISE'}` : 'DEMO • ENTERPRISE'}
                </p>
            </div>

            {/* Main Header */}
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
                        <Users className="text-[#FBBF24] shrink-0" size={30} />
                        <span>Gestión de personal</span>
                    </h1>
                    <p className="text-gray-400 text-xs sm:text-sm mt-1">
                        Administra roles y accesos del equipo.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(true)}
                    aria-label="Crear nuevo usuario"
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#FBBF24] text-black font-bold text-sm rounded-xl hover:bg-yellow-400 active:scale-95 transition-all shadow-lg shadow-yellow-500/10 cursor-pointer self-start sm:self-auto shrink-0"
                >
                    <Plus size={18} className="stroke-[2.5]" />
                    <span>Nuevo usuario</span>
                </button>
            </header>

            {/* Filter Tabs with Count Badges */}
            <div className="flex items-center gap-2.5 overflow-x-auto pb-1 custom-scrollbar">
                <button
                    type="button"
                    onClick={() => setStatusFilter('all')}
                    aria-label="Todos"
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                        statusFilter === 'all'
                            ? 'bg-[#FBBF24] text-black shadow-md font-bold'
                            : 'bg-[#14171E] text-gray-400 hover:text-white border border-[#202530] hover:border-gray-700'
                    }`}
                >
                    <span>Todos</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                        statusFilter === 'all' ? 'bg-black/20 text-black' : 'bg-[#222836] text-gray-300'
                    }`}>
                        {totalCount}
                    </span>
                </button>

                <button
                    type="button"
                    onClick={() => setStatusFilter('active')}
                    aria-label="Activos"
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                        statusFilter === 'active'
                            ? 'bg-[#FBBF24] text-black shadow-md font-bold'
                            : 'bg-[#14171E] text-gray-400 hover:text-white border border-[#202530] hover:border-gray-700'
                    }`}
                >
                    <span>Activos</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                        statusFilter === 'active' ? 'bg-black/20 text-black' : 'bg-[#222836] text-gray-300'
                    }`}>
                        {activeCount}
                    </span>
                </button>

                <button
                    type="button"
                    onClick={() => setStatusFilter('inactive')}
                    aria-label="Inactivos"
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                        statusFilter === 'inactive'
                            ? 'bg-[#FBBF24] text-black shadow-md font-bold'
                            : 'bg-[#14171E] text-gray-400 hover:text-white border border-[#202530] hover:border-gray-700'
                    }`}
                >
                    <span>Inactivos</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                        statusFilter === 'inactive' ? 'bg-black/20 text-black' : 'bg-[#222836] text-gray-300'
                    }`}>
                        {inactiveCount}
                    </span>
                </button>
            </div>

            {/* Single Column User Cards */}
            <div className="space-y-4">
                {filteredProfiles.map((profile) => (
                    <StaffCard
                        key={profile.id}
                        profile={profile}
                        isCurrentUser={profile.id === user?.id}
                        isEditing={editingId === profile.id}
                        selectedRole={selectedRole}
                        onEditClick={handleEditClick}
                        onSaveRole={handleSaveRole}
                        onCancelEdit={handleCancelEdit}
                        onChangeRole={setSelectedRole}
                        onToggleStatus={handleToggleStatus}
                        onDeleteStaff={handleDeleteStaff}
                    />
                ))}
            </div>

            {filteredProfiles.length === 0 && (
                <div className="p-8 text-center text-gray-500 bg-[#14171E] rounded-2xl border border-[#202530]">
                    No se encontró personal para el filtro seleccionado.
                </div>
            )}

            {/* Total Count Footer Note */}
            {filteredProfiles.length > 0 && (
                <p className="text-xs text-gray-500 pt-2 font-medium">
                    {filteredProfiles.length} {filteredProfiles.length === 1 ? 'usuario en total' : 'usuarios en total'}
                </p>
            )}

            {/* Create User Modal */}
            <CreateStaffModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={handleCreatedUserSuccess}
            />
        </div>
    )
}
