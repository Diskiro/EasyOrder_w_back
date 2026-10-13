import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../lib/api'
import { Shield, UserPlus, Edit2, Check, X, Loader2, UserCheck, UserX, Trash2, Users } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useUI } from '../context/UIContext'
import { useAuth } from '../context/AuthContext'

// --- Interfaces ---
interface Profile {
    id: string
    email: string
    full_name: string
    role: 'admin' | 'waiter' | 'kitchen'
    is_active: boolean
    created_at: string
}

type StatusFilter = 'all' | 'active' | 'inactive'

// --- Component ---
export default function StaffManagement() {
    const queryClient = useQueryClient()
    const { showAlert, showConfirm } = useUI()
    const { user } = useAuth()

    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
    const [editingId, setEditingId] = useState<string | null>(null)
    const [selectedRole, setSelectedRole] = useState<string>('')

    // Create User State
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [newUserEmail, setNewUserEmail] = useState('')
    const [newUserPassword, setNewUserPassword] = useState('')
    const [newUserName, setNewUserName] = useState('')
    const [newUserRole, setNewUserRole] = useState<'waiter' | 'kitchen' | 'admin'>('waiter')
    const [isCreating, setIsCreating] = useState(false)

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

    // --- Create User Logic ---
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

            showAlert(`Usuario "${newUserName}" creado exitosamente!`, 'success')
            setIsCreateModalOpen(false)
            setNewUserEmail('')
            setNewUserPassword('')
            setNewUserName('')
            setNewUserRole('waiter')
            void queryClient.invalidateQueries({ queryKey: ['staff'] })

        } catch (err: any) {
            console.error(err)
            showAlert('Error al crear usuario: ' + err.message, 'error')
        } finally {
            setIsCreating(false)
        }
    }

    if (isLoading) return <div className="p-8 text-gray-400">Cargando personal...</div>
    if (error) return <div className="p-8 text-red-500">Error al cargar personal</div>

    return (
        <div className="flex-1 h-full overflow-y-auto bg-[#111315] p-8 custom-scrollbar relative">
            {/* Header */}
            <header className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-1 flex items-center gap-2">
                        <Users className="text-[#FBBF24]" size={28} />
                        Gestión de Personal
                    </h1>
                    <p className="text-gray-400 text-sm">Administra roles, accesos activos y desvinculaciones del equipo.</p>
                </div>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex items-center justify-center px-4 py-2.5 bg-[#FBBF24] text-black font-bold rounded-xl hover:bg-yellow-500 transition-colors shadow-lg shadow-yellow-500/10 cursor-pointer"
                >
                    <UserPlus size={18} className="mr-2" />
                    Nuevo Usuario
                </button>
            </header>

            {/* Filter Tabs */}
            <div className="flex items-center gap-2 mb-6">
                {(['all', 'active', 'inactive'] as StatusFilter[]).map((filter) => {
                    const label = filter === 'all' ? 'Todos' : filter === 'active' ? 'Activos' : 'Inactivos'
                    const isSelected = statusFilter === filter
                    return (
                        <button
                            key={filter}
                            onClick={() => setStatusFilter(filter)}
                            className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                                isSelected
                                    ? 'bg-[#FBBF24] text-black shadow-md'
                                    : 'bg-[#1F2329] text-gray-400 hover:text-white border border-gray-800 hover:border-gray-700'
                            }`}
                        >
                            {label}
                        </button>
                    )
                })}
            </div>

            {/* Staff Table */}
            <div className="bg-[#1F2329] rounded-2xl border border-gray-800 overflow-hidden shadow-xl">
                <table className="w-full text-left">
                    <thead className="bg-[#141619] text-gray-400 text-xs uppercase font-semibold">
                        <tr>
                            <th className="px-6 py-4">Empleado / Correo</th>
                            <th className="px-6 py-4">Rol</th>
                            <th className="px-6 py-4">Estado</th>
                            <th className="px-6 py-4">Fecha Registro</th>
                            <th className="px-6 py-4 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                        {profiles?.map((profile) => {
                            const isCurrentUser = profile.id === user?.id
                            const isActive = profile.is_active !== false

                            return (
                                <tr key={profile.id} className="hover:bg-[#2A2E35] transition-colors group">
                                    {/* Name / Email */}
                                    <td className="px-6 py-4">
                                        <div className="flex items-center">
                                            <div className="bg-gray-700 h-10 w-10 rounded-full flex items-center justify-center text-white font-bold mr-3 shrink-0">
                                                {profile.full_name?.charAt(0).toUpperCase() || '?'}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className="text-white font-medium">{profile.full_name || 'Sin Nombre'}</p>
                                                    {isCurrentUser && (
                                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#FBBF24]/20 text-[#FBBF24] border border-[#FBBF24]/40">
                                                            Tú
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-gray-500 text-sm">{profile.email}</p>
                                            </div>
                                        </div>
                                    </td>

                                    {/* Role */}
                                    <td className="px-6 py-4">
                                        {editingId === profile.id ? (
                                            <select
                                                value={selectedRole}
                                                onChange={(e) => setSelectedRole(e.target.value)}
                                                className="bg-[#141619] text-white border border-gray-600 rounded-lg px-2.5 py-1 text-sm focus:border-[#FBBF24] outline-none"
                                            >
                                                <option value="waiter">Mesero</option>
                                                <option value="kitchen">Cocina</option>
                                                <option value="admin">Admin</option>
                                            </select>
                                        ) : (
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium capitalize ${
                                                profile.role === 'admin'
                                                    ? 'bg-purple-900/60 text-purple-200 border border-purple-700/50'
                                                    : profile.role === 'kitchen'
                                                    ? 'bg-orange-900/60 text-orange-200 border border-orange-700/50'
                                                    : 'bg-blue-900/60 text-blue-200 border border-blue-700/50'
                                            }`}>
                                                <Shield size={12} className="mr-1" />
                                                {profile.role === 'waiter' ? 'Mesero' : profile.role === 'kitchen' ? 'Cocina' : 'Admin'}
                                            </span>
                                        )}
                                    </td>

                                    {/* Status Badge */}
                                    <td className="px-6 py-4">
                                        {isActive ? (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                                Activo
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                                                <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                                                Inactivo
                                            </span>
                                        )}
                                    </td>

                                    {/* Registration Date */}
                                    <td className="px-6 py-4 text-gray-400 text-sm">
                                        {profile.created_at ? format(new Date(profile.created_at), 'dd MMM yyyy', { locale: es }) : '-'}
                                    </td>

                                    {/* Actions */}
                                    <td className="px-6 py-4 text-right">
                                        {editingId === profile.id ? (
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => handleSaveRole(profile.id)}
                                                    className="p-1.5 text-green-400 hover:bg-green-900/30 rounded-lg cursor-pointer"
                                                    title="Guardar"
                                                >
                                                    <Check size={18} />
                                                </button>
                                                <button
                                                    onClick={handleCancelEdit}
                                                    className="p-1.5 text-red-400 hover:bg-red-900/30 rounded-lg cursor-pointer"
                                                    title="Cancelar"
                                                >
                                                    <X size={18} />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex justify-end items-center gap-1">
                                                {/* Edit Role */}
                                                <button
                                                    onClick={() => handleEditClick(profile)}
                                                    className="p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors cursor-pointer"
                                                    title="Editar Rol"
                                                >
                                                    <Edit2 size={16} />
                                                </button>

                                                {/* Toggle Active / Inactive */}
                                                <button
                                                    disabled={isCurrentUser}
                                                    onClick={() => void handleToggleStatus(profile)}
                                                    className={`p-2 rounded-lg transition-colors cursor-pointer disabled:opacity-20 disabled:cursor-not-allowed ${
                                                        isActive
                                                            ? 'text-amber-400 hover:text-amber-300 hover:bg-amber-500/10'
                                                            : 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10'
                                                    }`}
                                                    title={
                                                        isCurrentUser
                                                            ? 'No puedes cambiar tu propio estado'
                                                            : isActive
                                                            ? 'Desactivar acceso'
                                                            : 'Reactivar acceso'
                                                    }
                                                >
                                                    {isActive ? <UserX size={16} /> : <UserCheck size={16} />}
                                                </button>

                                                {/* Delete / Safe Soft Delete */}
                                                <button
                                                    disabled={isCurrentUser}
                                                    onClick={() => void handleDeleteStaff(profile)}
                                                    className="p-2 text-rose-400/80 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer disabled:opacity-20 disabled:cursor-not-allowed"
                                                    title={isCurrentUser ? 'No puedes eliminar tu propia cuenta' : 'Eliminar personal'}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>

                {profiles?.length === 0 && (
                    <div className="p-8 text-center text-gray-500">
                        No se encontró personal para el filtro seleccionado.
                    </div>
                )}
            </div>

            {/* Create User Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-[#1F2329] rounded-2xl border border-gray-800 w-full max-w-md p-6 shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <UserPlus size={20} className="text-[#FBBF24]" />
                                Crear Nuevo Usuario
                            </h2>
                            <button
                                onClick={() => setIsCreateModalOpen(false)}
                                className="text-gray-400 hover:text-white transition-colors cursor-pointer"
                            >
                                <X size={22} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateUser} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Nombre Completo</label>
                                <input
                                    type="text"
                                    required
                                    value={newUserName}
                                    onChange={e => setNewUserName(e.target.value)}
                                    className="w-full bg-[#141619] border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:border-[#FBBF24] outline-none transition-colors"
                                    placeholder="Ej. Juan Pérez"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Correo Electrónico</label>
                                <input
                                    type="email"
                                    required
                                    value={newUserEmail}
                                    onChange={e => setNewUserEmail(e.target.value)}
                                    className="w-full bg-[#141619] border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:border-[#FBBF24] outline-none transition-colors"
                                    placeholder="correo@ejemplo.com"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Contraseña</label>
                                <input
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
                                <label className="block text-sm font-medium text-gray-300 mb-1">Rol Inicial</label>
                                <select
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
            )}
        </div>
    )
}
