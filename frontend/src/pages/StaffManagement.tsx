import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../lib/api'
import { Shield, UserPlus, Edit2, Check, X, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useUI } from '../context/UIContext'

// --- Interfaces ---
interface Profile {
    id: string
    email: string
    full_name: string
    role: 'admin' | 'waiter' | 'kitchen'
    created_at: string
}

// --- Component ---
export default function StaffManagement() {
    const queryClient = useQueryClient()
    const { showAlert } = useUI()
    const [editingId, setEditingId] = useState<string | null>(null)
    const [selectedRole, setSelectedRole] = useState<string>('')

    // Create User State
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [newUserEmail, setNewUserEmail] = useState('')
    const [newUserPassword, setNewUserPassword] = useState('')
    const [newUserName, setNewUserName] = useState('')
    const [newUserRole, setNewUserRole] = useState<'waiter' | 'kitchen' | 'admin'>('waiter')
    const [isCreating, setIsCreating] = useState(false)

    // 1. Fetch Profiles
    const { data: profiles, isLoading, error } = useQuery({
        queryKey: ['staff'],
        queryFn: async () => {
            const data = await apiFetch('/auth/staff')
            return data as Profile[]
        }
    })

    // 2. Update Role Mutation
    const updateRoleMutation = useMutation({
        mutationFn: async ({ id, newRole }: { id: string, newRole: string }) => {
            await apiFetch(`/auth/staff/${id}`, {
                method: 'PATCH',
                body: JSON.stringify({ role: newRole })
            })
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['staff'] })
            setEditingId(null)
            showAlert('Rol actualizado correctamente', 'success')
        },
        onError: (err: any) => {
            showAlert('Error al actualizar rol: ' + err.message, 'error')
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

    // --- Create User Logic ---
    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsCreating(true)

        try {
            // 1. Call local backend to register a user
            await apiFetch('/auth/register', {
                method: 'POST',
                body: JSON.stringify({
                    email: newUserEmail,
                    password: newUserPassword,
                    fullName: newUserName,
                    role: newUserRole
                })
            })

            // 2. Cleanup
            showAlert(`Usuario ${newUserName} creado exitosamente!`, 'success')
            setIsCreateModalOpen(false)
            setNewUserEmail('')
            setNewUserPassword('')
            setNewUserName('')
            setNewUserRole('waiter')
            queryClient.invalidateQueries({ queryKey: ['staff'] })

        } catch (err: any) {
            console.error(err)
            showAlert('Error al crear usuario: ' + err.message, 'error')
        } finally {
            setIsCreating(false)
        }
    }

    if (isLoading) return <div className="p-8 text-gray-400">Cargando personal...</div>
    if (error) return <div className="p-8 text-red-500">Error al cargar personal</div>

    // ... (imports and interfaces match original)

    // ... (Component logic matches original until render)

    return (
        <div className="flex-1 h-full overflow-y-auto bg-[#111315] p-8 custom-scrollbar relative">
            <header className="mb-8 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Gestión de Personal</h1>
                    <p className="text-gray-500">Administra roles y permisos de usuarios.</p>
                </div>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex items-center px-4 py-2 bg-[#FBBF24] text-black font-bold rounded-xl hover:bg-yellow-500 transition-colors"
                >
                    <UserPlus size={20} className="mr-2" />
                    Nuevo Usuario
                </button>
            </header>

            <div className="bg-[#1F2329] rounded-2xl border border-gray-800 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-[#141619] text-gray-400 text-xs uppercase font-semibold">
                        <tr>
                            <th className="px-6 py-4">Nombre / Email</th>
                            <th className="px-6 py-4">Rol</th>
                            <th className="px-6 py-4">Fecha Registro</th>
                            <th className="px-6 py-4 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                        {profiles?.map((profile) => (
                            <tr key={profile.id} className="hover:bg-[#2A2E35] transition-colors group">
                                <td className="px-6 py-4">
                                    <div className="flex items-center">
                                        <div className="bg-gray-700 h-10 w-10 rounded-full flex items-center justify-center text-white font-bold mr-3">
                                            {profile.full_name?.charAt(0).toUpperCase() || '?'}
                                        </div>
                                        <div>
                                            <p className="text-white font-medium">{profile.full_name || 'Sin Nombre'}</p>
                                            <p className="text-gray-500 text-sm">{profile.email}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    {editingId === profile.id ? (
                                        <select
                                            value={selectedRole}
                                            onChange={(e) => setSelectedRole(e.target.value)}
                                            className="bg-[#141619] text-white border border-gray-600 rounded px-2 py-1 text-sm focus:border-[#FBBF24] outline-none"
                                        >
                                            <option value="waiter">Mesero</option>
                                            <option value="kitchen">Cocina</option>
                                            <option value="admin">Admin</option>
                                        </select>
                                    ) : (
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                                            ${profile.role === 'admin' ? 'bg-purple-900 text-purple-200' :
                                                profile.role === 'kitchen' ? 'bg-orange-900 text-orange-200' :
                                                    'bg-blue-900 text-blue-200'}`}>
                                            <Shield size={12} className="mr-1" />
                                            {profile.role === 'waiter' ? 'Mesero' : profile.role === 'kitchen' ? 'Cocina' : 'Admin'}
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-gray-400 text-sm">
                                    {profile.created_at ? format(new Date(profile.created_at), 'dd MMM yyyy', { locale: es }) : '-'}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    {editingId === profile.id ? (
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => handleSaveRole(profile.id)}
                                                className="p-1 text-green-500 hover:bg-green-900/30 rounded"
                                                title="Guardar"
                                            >
                                                <Check size={18} />
                                            </button>
                                            <button
                                                onClick={handleCancelEdit}
                                                className="p-1 text-red-500 hover:bg-red-900/30 rounded"
                                                title="Cancelar"
                                            >
                                                <X size={18} />
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => handleEditClick(profile)}
                                            className="p-2 text-gray-500 hover:text-white hover:bg-gray-700 rounded transition-colors"
                                            title="Editar Rol"
                                        >
                                            <Edit2 size={18} />
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {profiles?.length === 0 && (
                    <div className="p-8 text-center text-gray-500">
                        No se encontraron empleados activos.
                    </div>
                )}
            </div>

            {/* Create User Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-[#1F2329] rounded-2xl border border-gray-800 w-full max-w-md p-6 shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-white">Crear Nuevo Usuario</h2>
                            <button onClick={() => setIsCreateModalOpen(false)} className="text-gray-400 hover:text-white">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateUser} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Nombre Completo</label>
                                <input
                                    type="text"
                                    required
                                    value={newUserName}
                                    onChange={e => setNewUserName(e.target.value)}
                                    className="w-full bg-[#141619] border border-gray-700 rounded-xl px-4 py-2 text-white focus:border-[#FBBF24] outline-none transition-colors"
                                    placeholder="Ej. Juan Perez"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Email</label>
                                <input
                                    type="email"
                                    required
                                    value={newUserEmail}
                                    onChange={e => setNewUserEmail(e.target.value)}
                                    className="w-full bg-[#141619] border border-gray-700 rounded-xl px-4 py-2 text-white focus:border-[#FBBF24] outline-none transition-colors"
                                    placeholder="email@ejemplo.com"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Contraseña</label>
                                <input
                                    type="password"
                                    required
                                    minLength={6}
                                    value={newUserPassword}
                                    onChange={e => setNewUserPassword(e.target.value)}
                                    className="w-full bg-[#141619] border border-gray-700 rounded-xl px-4 py-2 text-white focus:border-[#FBBF24] outline-none transition-colors"
                                    placeholder="Mín. 6 caracteres"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Rol</label>
                                <select
                                    value={newUserRole}
                                    onChange={e => setNewUserRole(e.target.value as any)}
                                    className="w-full bg-[#141619] border border-gray-700 rounded-xl px-4 py-2 text-white focus:border-[#FBBF24] outline-none transition-colors"
                                >
                                    <option value="waiter">Mesero</option>
                                    <option value="kitchen">Cocina</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>

                            <button
                                type="submit"
                                disabled={isCreating}
                                className="w-full bg-[#FBBF24] text-black font-bold py-3 rounded-xl hover:bg-yellow-500 transition-colors flex justify-center items-center mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
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
