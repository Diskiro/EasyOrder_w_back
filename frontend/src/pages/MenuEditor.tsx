import { useState } from 'react'
import { useProducts, useCategories, type Product } from '../hooks/useMenu'
import { Plus, Grid } from 'lucide-react'
import { Button, Stack } from '@mui/material'

import CategoryManager from '../components/menu/CategoryManager'
import ProductForm from '../components/menu/ProductForm'
import ProductList from '../components/menu/ProductList'

export default function MenuEditor() {
    const { data: products, isLoading: productsLoading } = useProducts()
    const { data: categories, isLoading: categoriesLoading } = useCategories()

    // UI State
    const [isManagingCategories, setIsManagingCategories] = useState(false)
    const [isProductFormOpen, setIsProductFormOpen] = useState(false)
    const [productToEdit, setProductToEdit] = useState<Product | null>(null)

    const handleCreateProduct = () => {
        setProductToEdit(null)
        setIsProductFormOpen(true)
        setIsManagingCategories(false)
    }

    const handleEditProduct = (product: Product) => {
        setProductToEdit(product)
        setIsProductFormOpen(true)
        setIsManagingCategories(false)
    }

    const handleManageCategories = () => {
        setIsProductFormOpen(false)
        setIsManagingCategories(true)
    }

    if (productsLoading || categoriesLoading) return <div className="text-gray-400 p-8">Cargando...</div>

    return (
        <div className="flex h-full bg-[#111315] text-gray-200">
            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Header */}
                <header className="px-8 py-5 border-b border-[#1F2329] bg-[#141619] flex justify-between items-center z-10">
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-wide">
                            EDITOR DE MENÚ
                        </h1>
                        <p className="text-gray-500 text-xs mt-1">Gestiona el catálogo del restaurante</p>
                    </div>

                    <Stack direction="row" spacing={2}>
                        <Button
                            variant="outlined"
                            onClick={handleManageCategories}
                            startIcon={<Grid size={18} />}
                            sx={{ color: 'gray', borderColor: 'gray' }}
                        >
                            Categorías
                        </Button>
                        <Button
                            variant="contained"
                            color="primary"
                            onClick={handleCreateProduct}
                            startIcon={<Plus size={18} />}
                            sx={{ color: 'black', fontWeight: 'bold' }}
                        >
                            Agregar Producto
                        </Button>
                    </Stack>
                </header>

                {/* Product List (Handles its own filters) */}
                <ProductList
                    products={products}
                    categories={categories}
                    onEdit={handleEditProduct}
                />
            </div>

            {/* Modals / Sidebars */}
            <ProductForm
                categories={categories}
                productToEdit={productToEdit}
                isOpen={isProductFormOpen}
                onClose={() => setIsProductFormOpen(false)}
            />

            <CategoryManager
                categories={categories}
                isOpen={isManagingCategories}
                onClose={() => setIsManagingCategories(false)}
            />
        </div>
    )
}
