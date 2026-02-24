import { useState } from 'react'
import { Button, IconButton, TextField } from '@mui/material'
import { Edit2, Trash2, X } from 'lucide-react'
import { useCategoryMutations, type Category } from '../../hooks/useMenu'
import { useUI } from '../../context/UIContext'

interface CategoryManagerProps {
    categories: Category[] | undefined
    isOpen: boolean
    onClose: () => void
}

export default function CategoryManager({ categories, isOpen, onClose }: CategoryManagerProps) {
    const { showAlert, showConfirm } = useUI()
    const { createCategory, updateCategory, deleteCategory } = useCategoryMutations()

    const [categoryForm, setCategoryForm] = useState<Partial<Category>>({ name: '', sort_order: 0, type: 'food' })
    const [editingCategory, setEditingCategory] = useState<Category | null>(null)

    const resetCategoryForm = () => {
        setCategoryForm({ name: '', sort_order: (categories?.length || 0) + 1, type: 'food' })
        setEditingCategory(null)
    }

    const handleEditCategory = (cat: Category) => {
        setEditingCategory(cat)
        setCategoryForm(cat)
    }

    const handleSaveCategory = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            if (editingCategory) {
                await updateCategory.mutateAsync({ id: editingCategory.id, updates: categoryForm })
                showAlert('Categoría actualizada', 'success')
            } else {
                // @ts-ignore
                await createCategory.mutateAsync(categoryForm)
                showAlert('Categoría creada', 'success')
            }
            resetCategoryForm()
        } catch (error) {
            console.error(error)
            showAlert('Error al guardar categoría', 'error')
        }
    }

    const handleDeleteCategory = async (id: number) => {
        const confirmed = await showConfirm('Eliminar Categoría', '¿Eliminar esta categoría? Los productos podrían quedar ocultos.')
        if (confirmed) {
            try {
                await deleteCategory.mutateAsync(id)
                showAlert('Categoría eliminada', 'success')
            } catch (error) {
                console.error(error)
                showAlert('Error al eliminar categoría', 'error')
            }
        }
    }

    if (!isOpen) return null

    return (
        <div className="w-96 bg-[#141619] border-l border-[#1F2329] flex flex-col animate-slide-in-right shadow-[0_0_50px_rgba(0,0,0,0.5)] z-20 fixed right-0 top-0 bottom-0 pt-16 md:pt-0">
            {/* Header */}
            <div className="p-5 border-b border-[#1F2329] flex justify-between items-center bg-[#141619]">
                <h2 className="text-lg font-bold text-white">
                    Gestionar Categorías
                </h2>
                <IconButton onClick={onClose} sx={{ color: 'gray' }}>
                    <X size={20} />
                </IconButton>
            </div>

            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                {/* New/Edit Form */}
                <div className="bg-[#1F2329] rounded-xl p-4 mb-6 border border-gray-700">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                        {editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}
                    </h3>
                    <form onSubmit={handleSaveCategory} className="space-y-6">
                        <TextField
                            label="Nombre de Categoría"
                            variant="outlined"
                            fullWidth
                            required
                            value={categoryForm.name}
                            onChange={e => setCategoryForm({ ...categoryForm, name: e.target.value })}
                            InputLabelProps={{ sx: { color: 'gray', '&.Mui-focused': { color: '#FBBF24' } } }}
                            InputProps={{
                                sx: { color: 'white', '& fieldset': { borderColor: '#374151' }, '&:hover fieldset': { borderColor: '#4B5563' }, '&.Mui-focused fieldset': { borderColor: '#FBBF24' } }
                            }}
                        />

                        <div className="flex gap-3 pt-4">
                            {editingCategory && (
                                <Button
                                    size="small"
                                    variant="outlined"
                                    onClick={resetCategoryForm}
                                    sx={{ color: 'gray', borderColor: 'gray' }}
                                >
                                    Cancelar
                                </Button>
                            )}
                            <Button
                                type="submit"
                                fullWidth
                                variant="contained"
                                color="primary"
                                disabled={createCategory.isPending || updateCategory.isPending}
                                sx={{ color: 'black', fontWeight: 'bold', paddingY: 1.5 }}
                            >
                                {editingCategory ? 'Actualizar' : 'Agregar Categoría'}
                            </Button>
                        </div>
                    </form>
                </div>

                {/* List */}
                <div className="space-y-2">
                    {categories?.map(cat => (
                        <div key={cat.id} className="flex items-center justify-between p-3 bg-[#111315] rounded-lg border border-gray-800 group hover:border-gray-600 transition-colors">
                            <div>
                                <div className="font-bold text-gray-200">{cat.name}</div>
                                <div className="text-[10px] text-gray-500 uppercase font-bold flex gap-2">
                                    <span>Orden: {cat.sort_order}</span>
                                </div>
                            </div>
                            <div className="flex gap-1 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                                <IconButton size="small" onClick={() => handleEditCategory(cat)} sx={{ color: 'gray', '&:hover': { color: 'white' } }}>
                                    <Edit2 size={16} />
                                </IconButton>
                                <IconButton size="small" onClick={() => handleDeleteCategory(cat.id)} sx={{ color: 'gray', '&:hover': { color: '#ef4444' } }}>
                                    <Trash2 size={16} />
                                </IconButton>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
