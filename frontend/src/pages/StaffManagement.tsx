import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../lib/api'
import { Shield, UserPlus, Edit2, Check, X, Loader2, UserCheck, UserX, Trash2, Users } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useUI } from '../context/UIContext'
import { useAuth } from '../context/AuthContext'

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

function getFilterLabel(filter: StatusFilter): string {
    if (filter === 'active') return 'Activos'
    if (filter === 'inactive') return 'Inactivos'
    return 'Todos'
}

function getRoleBadge(role: string) {
    if (role === 'admin') {
        return {
            className: 'bg-purple-900/60 text-purple-200 border-purple-700/50',
            label: 'Admin'
        }
    }
    if (role === 'kitchen') {
        return {
            className: 'bg-orange-900/60 text-orange-200 border-orange-700/50',
            label: 'Cocina'
        }
    }
    return {
        className: 'bg-blue-900/60 text-blue-200 border-blue-700/50',
        label: 'Mesero'
    }
}

function getToggleActionTitle(isCurrentUser: boolean, isActive: boolean): string {
    if (isCurrentUser) {
        return 'No puedes cambiar tu propio estado'
    }
    if (isActive) {
        return 'Desactivar acceso'
    }
    return 'Reactivar acceso'
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[#1F2329] rounded-2xl border border-gray-800 w-full max-w-md p-6 shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <UserPlus size={20} className="text-[#FBBF24]" />
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
                            className="w-full bg-[#141619] border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:border-[#FBBF24] outline-none transition-colors"
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
                            className="w-full bg-[#141619] border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:border-[#FBBF24] outline-none transition-colors"
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
                            className="w-full bg-[#141619] border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:border-[#FBBF24] outline-none transition-colors"
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
                            className="w-full bg-[#141619] border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:border-[#FBBF24] outline-none transition-colors"
                        >
                            <option value="waiter">Mesero</option>
                            <option value="kitchen">Cocina</option>
                            <option value="admin">Admin</option>
                        </select>
                    </div>

                    <button
                        type="submit"
                        disabled={isCreating}
                        className="w-full bg-[#FBBF24] text-black font-bold py-3 rounded-xl hover:bg-yellow-500 transition-colors flex justify-center items-center mt-6 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                        {isCreating ? <Loader2 size={20} className="animate-spin" /> : 'Crear Usuario'}
                    </button>
                </form>
            </div>
        </div>
    )
}

// --- Subcomponents with SRP ---
interface StaffItemProps {
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

interface StaffRoleBadgeProps {
    role: string
    isEditing: boolean
    selectedRole: string
    onChangeRole: (role: string) => void
}

function StaffRoleBadge({ role, isEditing, selectedRole, onChangeRole }: Readonly<StaffRoleBadgeProps>) {
    if (isEditing) {
        return (
            <select
                aria-label="Seleccionar rol"
                value={selectedRole}
                onChange={(e) => onChangeRole(e.target.value)}
                className="bg-[#141619] text-white border border-gray-600 rounded-lg px-2.5 py-1 text-sm focus:border-[#FBBF24] outline-none"
            >
                <option value="waiter">Mesero</option>
                <option value="kitchen">Cocina</option>
                <option value="admin">Admin</option>
            </select>
        )
    }

    const roleBadge = getRoleBadge(role)
    return (
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium capitalize border ${roleBadge.className}`}>
            <Shield size={12} className="mr-1" />
            <span>{roleBadge.label}</span>
        </span>
    )
}

function StaffStatusBadge({ isActive }: Readonly<{ isActive: boolean }>) {
    if (isActive) {
        return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Activo</span>
            </span>
        )
    }

    return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            <span>Inactivo</span>
        </span>
    )
}

interface StaffActionButtonsProps {
    profile: Profile
    isCurrentUser: boolean
    isEditing: boolean
    isActive: boolean
    toggleTitle: string
    onEditClick: (profile: Profile) => void
    onSaveRole: (id: string) => void
    onCancelEdit: () => void
    onToggleStatus: (profile: Profile) => void
    onDeleteStaff: (profile: Profile) => void
    isMobile?: boolean
}

function StaffActionButtons({
    profile,
    isCurrentUser,
    isEditing,
    isActive,
    toggleTitle,
    onEditClick,
    onSaveRole,
    onCancelEdit,
    onToggleStatus,
    onDeleteStaff,
    isMobile = false
}: Readonly<StaffActionButtonsProps>) {
    if (isEditing) {
        return (
            <div className={`flex items-center gap-2 ${isMobile ? 'w-full justify-end' : 'justify-end'}`}>
                <button
                    type="button"
                    onClick={() => onSaveRole(profile.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 rounded-xl cursor-pointer transition-colors"
                    title="Guardar"
                >
                    <Check size={16} />
                    <span>Guardar</span>
                </button>
                <button
                    type="button"
                    onClick={onCancelEdit}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-gray-800 text-gray-300 border border-gray-700 hover:bg-gray-700 rounded-xl cursor-pointer transition-colors"
                    title="Cancelar"
                >
                    <X size={16} />
                    <span>Cancelar</span>
                </button>
            </div>
        )
    }

    return (
        <div className={`flex items-center gap-1.5 ${isMobile ? 'w-full justify-end' : 'justify-end'}`}>
            <button
                type="button"
                onClick={() => onEditClick(profile)}
                className="p-2 text-gray-300 hover:text-white bg-gray-800/80 hover:bg-gray-700 border border-gray-700/60 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 text-xs font-medium"
                title="Editar Rol"
            >
                <Edit2 size={15} />
                {isMobile && <span>Rol</span>}
            </button>

            <button
                type="button"
                disabled={isCurrentUser}
                onClick={() => void onToggleStatus(profile)}
                className={`p-2 rounded-xl border transition-all cursor-pointer disabled:opacity-20 disabled:cursor-not-allowed flex items-center gap-1.5 text-xs font-medium ${
                    isActive
                        ? 'text-amber-400 bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20 hover:text-amber-300'
                        : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20 hover:text-emerald-300'
                }`}
                title={toggleTitle}
            >
                {isActive ? <UserX size={15} /> : <UserCheck size={15} />}
                {isMobile && <span>{isActive ? 'Desactivar' : 'Reactivar'}</span>}
            </button>

            <button
                type="button"
                disabled={isCurrentUser}
                onClick={() => void onDeleteStaff(profile)}
                className="p-2 text-rose-400 bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 hover:text-rose-300 rounded-xl transition-all cursor-pointer disabled:opacity-20 disabled:cursor-not-allowed flex items-center gap-1.5 text-xs font-medium"
                title={isCurrentUser ? 'No puedes eliminar tu propia cuenta' : 'Eliminar personal'}
            >
                <Trash2 size={15} />
                {isMobile && <span>Eliminar</span>}
            </button>
        </div>
    )
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
}: Readonly<StaffItemProps>) {
    const isActive = profile.is_active !== false
    const toggleTitle = getToggleActionTitle(isCurrentUser, isActive)

    return (
        <div className="bg-[#1A1D21] rounded-2xl border border-gray-800/80 p-4 shadow-lg hover:border-gray-700/80 transition-all flex flex-col justify-between gap-3.5">
            {/* Top row: Avatar, Info & Status */}
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="bg-gradient-to-br from-gray-700 to-gray-800 h-11 w-11 rounded-xl flex items-center justify-center text-white font-bold text-base shadow-inner shrink-0 border border-gray-700/50">
                        {profile.full_name?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <p className="text-white font-semibold text-sm truncate">{profile.full_name || 'Sin Nombre'}</p>
                            {isCurrentUser && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#FBBF24]/20 text-[#FBBF24] border border-[#FBBF24]/40 shrink-0">
                                    Tú
                                </span>
                            )}
                        </div>
                        <p className="text-gray-400 text-xs truncate mt-0.5">{profile.email}</p>
                    </div>
                </div>
                <StaffStatusBadge isActive={isActive} />
            </div>

            {/* Middle row: Role & Registration Date */}
            <div className="flex items-center justify-between pt-2.5 border-t border-gray-800/60 text-xs">
                <div className="flex items-center gap-2">
                    <span className="text-gray-500 font-medium">Rol:</span>
                    <StaffRoleBadge
                        role={profile.role}
                        isEditing={isEditing}
                        selectedRole={selectedRole}
                        onChangeRole={onChangeRole}
                    />
                </div>
                <span className="text-gray-500 text-[11px]">
                    {profile.created_at ? format(new Date(profile.created_at), 'dd MMM yyyy', { locale: es }) : '-'}
                </span>
            </div>

            {/* Bottom row: Action Buttons */}
            <div className="pt-2.5 border-t border-gray-800/60 flex items-center justify-end">
                <StaffActionButtons
                    profile={profile}
                    isCurrentUser={isCurrentUser}
                    isEditing={isEditing}
                    isActive={isActive}
                    toggleTitle={toggleTitle}
                    onEditClick={onEditClick}
                    onSaveRole={onSaveRole}
                    onCancelEdit={onCancelEdit}
                    onToggleStatus={onToggleStatus}
                    onDeleteStaff={onDeleteStaff}
                    isMobile={true}
                />
            </div>
        </div>
    )
}

function StaffTableRow({
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
}: Readonly<StaffItemProps>) {
    const isActive = profile.is_active !== false
    const toggleTitle = getToggleActionTitle(isCurrentUser, isActive)

    return (
        <tr className="hover:bg-[#22262C] transition-colors group">
            {/* Name / Email */}
            <td className="py-3.5 px-4 lg:px-5">
                <div className="flex items-center">
                    <div className="bg-gradient-to-br from-gray-700 to-gray-800 h-10 w-10 rounded-xl flex items-center justify-center text-white font-bold mr-3 shrink-0 border border-gray-700/50">
                        {profile.full_name?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <p className="text-white font-semibold text-sm truncate">{profile.full_name || 'Sin Nombre'}</p>
                            {isCurrentUser && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#FBBF24]/20 text-[#FBBF24] border border-[#FBBF24]/40 shrink-0">
                                    Tú
                                </span>
                            )}
                        </div>
                        <p className="text-gray-400 text-xs truncate mt-0.5">{profile.email}</p>
                        <p className="text-gray-500 text-[11px] xl:hidden mt-0.5">
                            {profile.created_at ? format(new Date(profile.created_at), 'dd MMM yyyy', { locale: es }) : ''}
                        </p>
                    </div>
                </div>
            </td>

            {/* Role */}
            <td className="py-3.5 px-3 lg:px-4">
                <StaffRoleBadge
                    role={profile.role}
                    isEditing={isEditing}
                    selectedRole={selectedRole}
                    onChangeRole={onChangeRole}
                />
            </td>

            {/* Status Badge */}
            <td className="py-3.5 px-3 lg:px-4">
                <StaffStatusBadge isActive={isActive} />
            </td>

            {/* Registration Date (Hidden on 1024px screens, shown on >= 1280px) */}
            <td className="py-3.5 px-3 lg:px-4 text-gray-400 text-xs hidden xl:table-cell whitespace-nowrap">
                {profile.created_at ? format(new Date(profile.created_at), 'dd MMM yyyy', { locale: es }) : '-'}
            </td>

            {/* Actions */}
            <td className="py-3.5 px-4 lg:px-5 text-right whitespace-nowrap">
                <StaffActionButtons
                    profile={profile}
                    isCurrentUser={isCurrentUser}
                    isEditing={isEditing}
                    isActive={isActive}
                    toggleTitle={toggleTitle}
                    onEditClick={onEditClick}
                    onSaveRole={onSaveRole}
                    onCancelEdit={onCancelEdit}
                    onToggleStatus={onToggleStatus}
                    onDeleteStaff={onDeleteStaff}
                    isMobile={false}
                />
            </td>
        </tr>
    )
}

// --- Main StaffManagement Component ---
export default function StaffManagement() {
    const queryClient = useQueryClient()
    const { showAlert, showConfirm } = useUI()
    const { user } = useAuth()

    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
    const [editingId, setEditingId] = useState<string | null>(null)
    const [selectedRole, setSelectedRole] = useState<string>('')
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

    // 1. Fetch Profiles with Filter
    const { data: profiles, isLoading, error } = useQuery({
        queryKey: ['staff', statusFilter],
        queryFn: async () => {
            const queryParam = statusFilter === 'all' ? '' : `?status=${statusFilter}`
            const data = await apiFetch(`/auth/staff${queryParam}`)
            return data as Profile[]
        }
    })

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
        <div className="w-full p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-800/80 pb-5">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-2.5">
                        <Users className="text-[#FBBF24] shrink-0" size={28} />
                        Gestión de Personal
                    </h1>
                    <p className="text-gray-400 text-xs sm:text-sm mt-1">
                        Administra roles, accesos activos y desvinculaciones del equipo.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(true)}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#FBBF24] text-black font-bold text-sm rounded-xl hover:bg-yellow-400 active:scale-95 transition-all shadow-lg shadow-yellow-500/10 cursor-pointer self-start sm:self-auto shrink-0"
                >
                    <UserPlus size={18} />
                    <span>Nuevo Usuario</span>
                </button>
            </header>

            {/* Filter Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
                {(['all', 'active', 'inactive'] as StatusFilter[]).map((filter) => {
                    const label = getFilterLabel(filter)
                    const isSelected = statusFilter === filter
                    return (
                        <button
                            type="button"
                            key={filter}
                            onClick={() => setStatusFilter(filter)}
                            className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                                isSelected
                                    ? 'bg-[#FBBF24] text-black shadow-md font-bold'
                                    : 'bg-[#1A1D21] text-gray-400 hover:text-white border border-gray-800 hover:border-gray-700'
                            }`}
                        >
                            {label}
                        </button>
                    )
                })}
            </div>

            {/* Adaptive Cards Grid (Mobile 1-col, Tablet 2-col: < lg) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:hidden">
                {profiles?.map((profile) => (
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

            {/* Desktop Table View (>= lg, 1024px+) - Completely fits without horizontal scroll */}
            <div className="hidden lg:block bg-[#1A1D21] rounded-2xl border border-gray-800/80 shadow-xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-[#141619] text-gray-400 text-xs uppercase font-semibold tracking-wider border-b border-gray-800">
                        <tr>
                            <th className="py-3.5 px-4 lg:px-5">Empleado / Correo</th>
                            <th className="py-3.5 px-3 lg:px-4 w-32">Rol</th>
                            <th className="py-3.5 px-3 lg:px-4 w-28">Estado</th>
                            <th className="py-3.5 px-3 lg:px-4 w-36 hidden xl:table-cell">Fecha Registro</th>
                            <th className="py-3.5 px-4 lg:px-5 text-right w-36">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/60 text-sm">
                        {profiles?.map((profile) => (
                            <StaffTableRow
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
                    </tbody>
                </table>
            </div>

            {profiles?.length === 0 && (
                <div className="p-8 text-center text-gray-500 bg-[#1A1D21] rounded-2xl border border-gray-800">
                    No se encontró personal para el filtro seleccionado.
                </div>
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
