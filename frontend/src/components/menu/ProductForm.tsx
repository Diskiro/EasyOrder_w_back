import { useEffect } from 'react'
import { Button, IconButton, TextField, Box, FormControl, InputLabel, NativeSelect } from '@mui/material'
import { X, Save } from 'lucide-react'
import clsx from 'clsx'
import { useProductMutations, type Product, type Category } from '../../hooks/useMenu'
import { useUI } from '../../context/UIContext'
import { useFormValidation } from '../../hooks/useFormValidation'

interface ProductFormProps {
    categories: Category[] | undefined
    productToEdit?: Product | null
    isOpen: boolean
    onClose: () => void
}

export default function ProductForm({ categories, productToEdit, isOpen, onClose }: ProductFormProps) {
    const { showAlert } = useUI()
    const { createProduct, updateProduct } = useProductMutations()

    const initialFormState: Partial<Product> = {
        name: '',
        description: '',
        price: 0,
        category_id: categories?.[0]?.id || 0,
        image_url: '',
        is_active: true
    }

    const { values, errors, handleChange, setValues, validateAll, isValid } = useFormValidation(initialFormState, {
        name: { required: true, minLength: 3 },
        price: { required: true, validate: (val) => Number(val) > 0 || 'El precio debe ser mayor a 0' },
        category_id: { required: true },
        image_url: { pattern: /^https?:\/\/.+/ }
    })

    useEffect(() => {
        if (isOpen) {
            if (productToEdit) {
                setValues(productToEdit)
            } else {
                setValues({
                    ...initialFormState,
                    category_id: categories?.[0]?.id || 0
                })
            }
        }
    }, [isOpen, productToEdit, categories])

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!validateAll()) return

        try {
            if (productToEdit && productToEdit.id) {
                await updateProduct.mutateAsync({ id: productToEdit.id, updates: values })
                showAlert('Producto actualizado correctamente', 'success')
            } else {
                // @ts-ignore
                await createProduct.mutateAsync(values)
                showAlert('Producto creado correctamente', 'success')
            }
            onClose()
        } catch (error) {
            console.error(error)
            showAlert('Error al guardar producto', 'error')
        }
    }

    if (!isOpen) return null

    return (
        <div className="w-96 bg-[#141619] border-l border-[#1F2329] flex flex-col animate-slide-in-right shadow-[0_0_50px_rgba(0,0,0,0.5)] z-20 fixed right-0 top-0 bottom-0 pt-16 md:pt-0">
            <div className="p-5 border-b border-[#1F2329] flex justify-between items-center bg-[#141619]">
                <h2 className="text-lg font-bold text-white">
                    {productToEdit ? 'Editar Producto' : 'Nuevo Producto'}
                </h2>
                <IconButton onClick={onClose} sx={{ color: 'gray' }}>
                    <X size={20} />
                </IconButton>
            </div>

            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
                <div>
                    <TextField
                        label="Nombre del Producto"
                        variant="outlined"
                        fullWidth
                        name="name"
                        value={values.name}
                        onChange={handleChange}
                        error={!!errors.name}
                        helperText={errors.name}
                        InputLabelProps={{ sx: { color: 'gray', '&.Mui-focused': { color: '#FBBF24' } } }}
                        InputProps={{
                            sx: { color: 'white', '& fieldset': { borderColor: '#374151' }, '&:hover fieldset': { borderColor: '#4B5563' }, '&.Mui-focused fieldset': { borderColor: '#FBBF24' } }
                        }}
                    />
                </div>

                <div>
                    <TextField
                        label="Precio"
                        variant="outlined"
                        type="number"
                        fullWidth
                        name="price"
                        value={values.price}
                        onChange={handleChange}
                        error={!!errors.price}
                        helperText={errors.price}
                        InputLabelProps={{ sx: { color: 'gray', '&.Mui-focused': { color: '#FBBF24' } } }}
                        InputProps={{
                            startAdornment: <span className="text-gray-500 mr-1">$</span>,
                            sx: { color: 'white', '& fieldset': { borderColor: '#374151' }, '&:hover fieldset': { borderColor: '#4B5563' }, '&.Mui-focused fieldset': { borderColor: '#FBBF24' } }
                        }}
                    />
                </div>

                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Categoría</label>
                    <Box sx={{ minWidth: 120 }}>
                        <FormControl fullWidth error={!!errors.category_id}>
                            <InputLabel shrink={true} variant="standard" htmlFor="product-category" sx={{ color: 'gray', '&.Mui-focused': { color: '#FBBF24' } }}>
                                Categoría
                            </InputLabel>
                            <NativeSelect
                                value={values.category_id}
                                onChange={(e) => handleChange(e as any)}
                                inputProps={{
                                    name: 'category_id',
                                    id: 'product-category',
                                }}
                                sx={{
                                    color: 'white',
                                    '&:before': { borderBottomColor: '#333' },
                                    '&:after': { borderBottomColor: '#FBBF24' },
                                    '& .MuiNativeSelect-select': { color: 'white' },
                                    '& svg': { color: 'gray' }
                                }}
                            >
                                {categories?.map(c => (
                                    <option key={c.id} value={c.id} style={{ color: 'black' }}>{c.name}</option>
                                ))}
                            </NativeSelect>
                        </FormControl>
                    </Box>
                </div>

                <div>
                    <TextField
                        label="Descripción"
                        variant="outlined"
                        fullWidth
                        multiline
                        rows={3}
                        name="description"
                        value={values.description || ''}
                        onChange={handleChange}
                        InputLabelProps={{ sx: { color: 'gray', '&.Mui-focused': { color: '#FBBF24' } } }}
                        InputProps={{
                            sx: { color: 'white', '& fieldset': { borderColor: '#374151' }, '&:hover fieldset': { borderColor: '#4B5563' }, '&.Mui-focused fieldset': { borderColor: '#FBBF24' } }
                        }}
                    />
                </div>

                <div>
                    <TextField
                        label="URL de Imagen"
                        variant="outlined"
                        fullWidth
                        name="image_url"
                        value={values.image_url || ''}
                        onChange={handleChange}
                        error={!!errors.image_url}
                        helperText={errors.image_url}
                        placeholder="https://..."
                        InputLabelProps={{ sx: { color: 'gray', '&.Mui-focused': { color: '#FBBF24' } } }}
                        InputProps={{
                            sx: { color: 'white', '& fieldset': { borderColor: '#374151' }, '&:hover fieldset': { borderColor: '#4B5563' }, '&.Mui-focused fieldset': { borderColor: '#FBBF24' } }
                        }}
                    />
                </div>

                <div className="flex items-center justify-between p-4 bg-[#1F2329] rounded-xl border border-gray-800">
                    <span className="text-sm font-bold text-gray-300">
                        {values.is_active ? 'Visible en Menú' : 'Oculto del Menú'}
                    </span>
                    <button
                        type="button"
                        onClick={() => setValues(prev => ({ ...prev, is_active: !prev.is_active }))}
                        className={clsx(
                            "w-12 h-6 rounded-full relative transition-colors duration-300",
                            values.is_active ? "bg-green-500" : "bg-gray-600"
                        )}
                    >
                        <div className={clsx(
                            "absolute top-1 w-4 h-4 bg-white rounded-full transition-transform duration-300 shadow",
                            values.is_active ? "left-7" : "left-1"
                        )} />
                    </button>
                </div>
            </form>

            <div className="p-6 border-t border-[#1F2329] bg-[#141619] flex gap-3">
                <Button
                    fullWidth
                    variant="outlined"
                    onClick={onClose}
                    sx={{ color: 'gray', borderColor: 'gray' }}
                >
                    Cancelar
                </Button>
                <Button
                    fullWidth
                    variant="contained"
                    color="primary"
                    onClick={handleSave}
                    disabled={createProduct.isPending || updateProduct.isPending || !isValid}
                    startIcon={<Save size={16} />}
                    sx={{ color: 'black', fontWeight: 'bold' }}
                >
                    {(createProduct.isPending || updateProduct.isPending) ? 'Guardando...' : 'GUARDAR'}
                </Button>
            </div>
        </div>
    )
}
