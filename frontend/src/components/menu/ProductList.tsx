import { useState } from 'react'
import { IconButton, TextField, Box, FormControl, InputLabel, NativeSelect, Grid } from '@mui/material'
import { Edit2, Trash2, Search, Image as ImageIcon } from 'lucide-react'
import clsx from 'clsx'
import type { Product, Category } from '../../hooks/useMenu'
import { useUI } from '../../context/UIContext'
import { useProductMutations } from '../../hooks/useMenu'

interface ProductListProps {
    products: Product[] | undefined
    categories: Category[] | undefined
    onEdit: (product: Product) => void
}

export default function ProductList({ products, categories, onEdit }: ProductListProps) {
    const { showAlert, showConfirm } = useUI()
    const { deleteProduct } = useProductMutations()

    const [searchQuery, setSearchQuery] = useState('')
    const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<number | null>(null)

    const handleDelete = async (id: number) => {
        const confirmed = await showConfirm('Eliminar Producto', '¿Seguro que quieres eliminar este producto?')
        if (confirmed) {
            try {
                await deleteProduct.mutateAsync(id)
                showAlert('Producto eliminado correctamente', 'success')
            } catch (error) {
                console.error(error)
                showAlert('Error al eliminar producto', 'error')
            }
        }
    }

    const filteredProducts = products?.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesCategory = selectedCategoryFilter ? p.category_id === selectedCategoryFilter : true
        return matchesSearch && matchesCategory
    })

    return (
        <>
            {/* Filters */}
            <div className="px-8 py-4 border-b border-[#1F2329] bg-[#111315] flex gap-4 items-center sticky top-0 z-10">
                <div className="relative w-64">
                    <TextField
                        variant="outlined"
                        placeholder="Buscar productos..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        fullWidth
                        size="small"
                        InputProps={{
                            startAdornment: <Search size={16} className="text-gray-500 mr-2" />,
                            sx: {
                                color: 'white',
                                backgroundColor: '#1F2329',
                                borderRadius: 2,
                                '& fieldset': { borderColor: '#374151' },
                                '&:hover fieldset': { borderColor: '#4B5563' },
                                '&.Mui-focused fieldset': { borderColor: '#FBBF24' }
                            }
                        }}
                    />
                </div>
                <Box sx={{ minWidth: 200 }}>
                    <FormControl fullWidth>
                        <InputLabel shrink={true} variant="standard" htmlFor="filter-category" sx={{ color: 'gray', '&.Mui-focused': { color: '#FBBF24' } }}>
                            Categoría
                        </InputLabel>
                        <NativeSelect
                            value={selectedCategoryFilter || ''}
                            onChange={(e) => setSelectedCategoryFilter(e.target.value ? Number(e.target.value) : null)}
                            inputProps={{
                                name: 'category',
                                id: 'filter-category',
                            }}
                            sx={{
                                color: 'white',
                                '&:before': { borderBottomColor: '#333' },
                                '&:after': { borderBottomColor: '#FBBF24' },
                                '& .MuiNativeSelect-select': { color: 'white' },
                                '& svg': { color: 'gray' }
                            }}
                        >
                            <option value="" style={{ color: 'black' }}>Todas</option>
                            {categories?.map(c => (
                                <option key={c.id} value={c.id} style={{ color: 'black' }}>{c.name}</option>
                            ))}
                        </NativeSelect>
                    </FormControl>
                </Box>
            </div>

            {/* Product Grid Grouped by Category */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                {categories?.map(category => {
                    const categoryProducts = filteredProducts?.filter(p => p.category_id === category.id)
                    if (!categoryProducts || categoryProducts.length === 0) return null

                    return (
                        <div key={category.id} className="mb-8">
                            <h2 className="text-xl font-bold text-[#FBBF24] mb-4 border-b border-gray-800 pb-2">
                                {category.name}
                            </h2>
                            <Grid sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 2 }}>
                                {categoryProducts.map(product => (
                                    <div key={product.id} className="group bg-[#1F2329] rounded-xl overflow-hidden hover:shadow-xl transition-all border border-transparent hover:border-gray-700 relative">
                                        <div className="h-40 bg-[#15171a] relative">
                                            {product.image_url ? (
                                                <img src={product.image_url} alt={product.name} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-700">
                                                    <ImageIcon size={48} />
                                                </div>
                                            )}

                                            <div className="absolute top-2 right-2 flex gap-2 transition-opacity">
                                                <IconButton
                                                    size="small"
                                                    onClick={() => onEdit(product)}
                                                    sx={{ bgcolor: 'white', '&:hover': { bgcolor: '#f0f0f0' }, color: 'black' }}
                                                >
                                                    <Edit2 size={14} />
                                                </IconButton>
                                                <IconButton
                                                    size="small"
                                                    onClick={() => handleDelete(product.id)}
                                                    sx={{ bgcolor: '#dc2626', '&:hover': { bgcolor: '#b91c1c' }, color: 'white' }}
                                                >
                                                    <Trash2 size={14} />
                                                </IconButton>
                                            </div>
                                        </div>

                                        <div className="p-4">
                                            <div className="flex justify-between items-start mb-1">
                                                <h3 className="font-bold text-base text-gray-200 line-clamp-1">{product.name}</h3>
                                                <span className="font-mono text-[#FBBF24] font-bold text-sm">${product.price}</span>
                                            </div>
                                            <p className="text-xs text-gray-500 line-clamp-2 mb-3 h-8">{product.description}</p>

                                            <div className="flex items-center gap-2 border-t border-gray-800 pt-3 mt-1">
                                                <span className={clsx(
                                                    "w-2 h-2 rounded-full",
                                                    product.is_active ? "bg-green-500" : "bg-red-500"
                                                )} />
                                                <span className={clsx("text-xs font-bold", product.is_active ? "text-green-500" : "text-red-500")}>
                                                    {product.is_active ? 'VISIBLE' : 'OCULTO'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </Grid>
                        </div>
                    )
                })}

                {/* Uncategorized or Hidden Categories Products (Optional fallback) */}
                {(filteredProducts?.filter(p => !categories?.find(c => c.id === p.category_id))?.length ?? 0) > 0 && (
                    <div className="mb-8">
                        <h2 className="text-xl font-bold text-gray-500 mb-4 border-b border-gray-800 pb-2">
                            Sin Categoría
                        </h2>
                        <Grid sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 2 }}>
                            {filteredProducts?.filter(p => !categories?.find(c => c.id === p.category_id)).map(product => (
                                <div key={product.id} className="group bg-[#1F2329] rounded-xl overflow-hidden hover:shadow-xl transition-all border border-transparent hover:border-gray-700 relative">
                                    <div className="p-4">
                                        <h3 className="font-bold text-gray-200">{product.name}</h3>
                                        <IconButton size="small" onClick={() => onEdit(product)} sx={{ color: 'white' }}><Edit2 size={14} /></IconButton>
                                    </div>
                                </div>
                            ))}
                        </Grid>
                    </div>
                )}
            </div>
        </>
    )
}
