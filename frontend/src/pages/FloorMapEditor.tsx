import React, { useState } from 'react'
import { useTables, useTableMutations, type Table } from '../hooks/useTables'
import { Plus, Edit2, Trash2, X, Save, Square } from 'lucide-react'
import { Button, IconButton, TextField, Grid } from '@mui/material'
import { useUI } from '../context/UIContext'

export default function FloorMapEditor() {
    const { showAlert, showConfirm } = useUI()
    const { data: tables, isLoading } = useTables()
    const { createTable, updateTable, deleteTable } = useTableMutations()

    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const [editingTable, setEditingTable] = useState<Table | null>(null)
    const [formData, setFormData] = useState({ number: '', capacity: 4 })

    const handleCreate = () => {
        setEditingTable(null)
        setFormData({ number: '', capacity: 4 })
        setIsSidebarOpen(true)
    }

    const handleEdit = (table: Table) => {
        setEditingTable(table)
        setFormData({ number: table.number, capacity: table.capacity })
        setIsSidebarOpen(true)
    }

    const handleDelete = async (id: number) => {
        const confirmed = await showConfirm('Eliminar Mesa', '¿Estás seguro de que deseas eliminar esta mesa?')
        if (confirmed) {
            try {
                await deleteTable.mutateAsync(id)
                showAlert('Mesa eliminada correctamente', 'success')
            } catch (error) {
                console.error(error)
                showAlert('Error al eliminar mesa', 'error')
            }
        }
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            if (editingTable) {
                await updateTable.mutateAsync({ id: editingTable.id, updates: { number: formData.number, capacity: formData.capacity } })
                showAlert('Mesa actualizada correctamente', 'success')
            } else {
                // @ts-ignore
                await createTable.mutateAsync({ number: formData.number, capacity: formData.capacity })
                showAlert('Mesa creada correctamente', 'success')
            }
            setIsSidebarOpen(false)
        } catch (error) {
            console.error(error)
            showAlert('Error al guardar mesa', 'error')
        }
    }

    if (isLoading) return <div className="text-gray-400 p-8">Cargando...</div>

    return (
        <div className="flex h-full bg-[#111315] text-gray-200">
            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <header className="px-8 py-5 border-b border-[#1F2329] bg-[#141619] flex justify-between items-center z-10">
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-wide">EDITOR DE PLANO</h1>
                        <p className="text-gray-500 text-xs mt-1">Gestiona las mesas y capacidad</p>
                    </div>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={handleCreate}
                        startIcon={<Plus size={18} />}
                        sx={{ color: 'black', fontWeight: 'bold' }}
                    >
                        Agregar Mesa
                    </Button>
                </header>

                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                        <Grid container spacing={3} columns={{ xs: 10, md: 10, lg: 10, xl: 10 }}>
                            {tables?.map(table => (
                                <Grid size={{ xs: 5, sm: 3.33, md: 2.5, lg: 2 }} key={table.id}>
                                    <div className="bg-[#1F2329] rounded-xl p-6 border border-gray-800 flex flex-col items-center justify-center relative group hover:border-gray-600 transition-colors h-full">
                                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <IconButton size="small" onClick={() => handleEdit(table)} sx={{ color: 'gray', '&:hover': { color: 'white' } }}>
                                                <Edit2 size={16} />
                                            </IconButton>
                                            <IconButton size="small" onClick={() => handleDelete(table.id)} sx={{ color: 'gray', '&:hover': { color: '#ef4444' } }}>
                                                <Trash2 size={16} />
                                            </IconButton>
                                        </div>

                                        <div className="w-16 h-16 bg-[#111315] rounded-full flex items-center justify-center mb-3 border border-dashed border-gray-700">
                                            <Square size={24} className="text-gray-500" />
                                        </div>

                                        <h3 className="text-xl font-bold text-white mb-1">
                                            Mesa {table.number}
                                        </h3>
                                        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">
                                            Capacidad: {table.capacity}
                                        </p>
                                        <div className={`mt-3 px-2 py-1 rounded text-[10px] font-bold uppercase ${table.status === 'available' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                            {table.status === 'available' ? 'DISPONIBLE' : table.status === 'occupied' ? 'OCUPADA' : 'RESERVADA'}
                                        </div>
                                    </div>
                                </Grid>
                            ))}
                        </Grid>
                    </div>
                </div>
            </div>

            {/* Sidebar */}
            {isSidebarOpen && (
                <div className="w-96 bg-[#141619] border-l border-[#1F2329] flex flex-col animate-slide-in-right shadow-2xl z-20">
                    <div className="p-5 border-b border-[#1F2329] flex justify-between items-center bg-[#141619]">
                        <h2 className="text-lg font-bold text-white">
                            {editingTable ? 'Editar Mesa' : 'Nueva Mesa'}
                        </h2>
                        <IconButton onClick={() => setIsSidebarOpen(false)} sx={{ color: 'gray' }}>
                            <X size={20} />
                        </IconButton>
                    </div>

                    <form onSubmit={handleSave} className="flex-1 p-6 space-y-6">
                        <TextField
                            label="Número / Nombre de Mesa"
                            variant="outlined"
                            fullWidth
                            required
                            value={formData.number}
                            onChange={e => setFormData({ ...formData, number: e.target.value })}
                            InputLabelProps={{ sx: { color: 'gray', '&.Mui-focused': { color: '#FBBF24' } } }}
                            InputProps={{
                                sx: { color: 'white', '& fieldset': { borderColor: '#374151' }, '&:hover fieldset': { borderColor: '#4B5563' }, '&.Mui-focused fieldset': { borderColor: '#FBBF24' } }
                            }}
                        />

                        <TextField
                            label="Capacidad (Personas)"
                            variant="outlined"
                            type="number"
                            fullWidth
                            required
                            value={formData.capacity}
                            onChange={e => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
                            InputLabelProps={{ sx: { color: 'gray', '&.Mui-focused': { color: '#FBBF24' } } }}
                            InputProps={{
                                sx: { color: 'white', '& fieldset': { borderColor: '#374151' }, '&:hover fieldset': { borderColor: '#4B5563' }, '&.Mui-focused fieldset': { borderColor: '#FBBF24' } }
                            }}
                        />

                        <div className="pt-4">
                            <Button
                                type="submit"
                                fullWidth
                                variant="contained"
                                color="primary"
                                disabled={createTable.isPending || updateTable.isPending}
                                startIcon={<Save size={16} />}
                                sx={{ color: 'black', fontWeight: 'bold', paddingY: 1.5 }}
                            >
                                {editingTable ? 'Actualizar Mesa' : 'Crear Mesa'}
                            </Button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    )
}
