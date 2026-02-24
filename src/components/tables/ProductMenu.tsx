import { Button, Stack } from '@mui/material'
import { Plus } from 'lucide-react'
import clsx from 'clsx'
import type { Category, Product } from '../../hooks/useMenu'

interface ProductMenuProps {
    categories: Category[] | undefined
    products: Product[] // Already filtered products
    selectedCategory: number | null
    onSelectCategory: (id: number | null) => void
    onAddToCart: (product: Product) => void
    canEdit: boolean
}

export default function ProductMenu({
    categories,
    products,
    selectedCategory,
    onSelectCategory,
    onAddToCart,
    canEdit
}: ProductMenuProps) {

    // Helper to group products by category for display
    // Note: The parent passes filtered products, but we still need to structure them by category if "All" is selected,
    // or just show the relevant category if one is selected.

    // Actually, the original implementation iterates categories and filters products for each.
    // Let's keep that logic but adapted.

    const visibleCategories = selectedCategory
        ? categories?.filter(c => c.id === selectedCategory)
        : categories

    return (
        <>
            <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6 sticky top-0 bg-[#111315] z-10 py-2 -mt-2">
                <div className="w-full overflow-x-auto pb-2 custom-scrollbar">
                    <Stack direction="row" spacing={1} sx={{ minWidth: 'max-content', px: 0.5 }}>
                        <Button
                            variant={selectedCategory === null ? "contained" : "outlined"}
                            color="primary"
                            onClick={() => onSelectCategory(null)}
                            sx={{ borderRadius: 8, whiteSpace: 'nowrap', color: selectedCategory === null ? 'black' : 'gray', borderColor: 'gray', minWidth: 'auto', px: 3 }}
                        >
                            Todas
                        </Button>
                        {categories?.map(c => (
                            <Button
                                key={c.id}
                                variant={selectedCategory === c.id ? "contained" : "outlined"}
                                color="primary"
                                onClick={() => onSelectCategory(c.id)}
                                sx={{ borderRadius: 8, whiteSpace: 'nowrap', color: selectedCategory === c.id ? 'black' : 'gray', borderColor: 'gray', minWidth: 'auto', px: 3 }}
                            >
                                {c.name}
                            </Button>
                        ))}
                    </Stack>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                {visibleCategories?.map(category => {
                    const categoryProducts = products.filter(p => p.category_id === category.id)

                    if (categoryProducts.length === 0) return null

                    if (categoryProducts.length === 0) return null

                    return (
                        <div key={category.id} className="mb-6">
                            <h3 className="text-lg font-bold text-[#FBBF24] mb-3 sticky top-0 bg-[#111315] py-2 z-10 border-b border-gray-800">
                                {category.name}
                            </h3>
                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                                {categoryProducts.map(product => (
                                    <button
                                        key={product.id}
                                        onClick={() => onAddToCart(product)}
                                        disabled={!canEdit}
                                        className={clsx(
                                            "group text-left bg-[#1F2329] p-4 rounded-xl border border-transparent transition-all relative overflow-hidden",
                                            canEdit
                                                ? "hover:border-[#FBBF24]/50 hover:bg-[#252a30] cursor-pointer"
                                                : "opacity-50 cursor-not-allowed grayscale"
                                        )}
                                    >
                                        {canEdit && (
                                            <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <div className="bg-[#FBBF24] text-black p-1 rounded-full"><Plus size={14} /></div>
                                            </div>
                                        )}
                                        <div className="flex justify-between items-start mb-1">
                                            <h3 className="font-bold text-gray-200 line-clamp-1 mr-2">{product.name}</h3>
                                            <span className="text-[#FBBF24] font-mono font-bold text-sm">${product.price}</span>
                                        </div>
                                        <p className="text-xs text-gray-500 mb-0 line-clamp-2 h-8">{product.description}</p>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )
                })}
            </div>
        </>
    )
}
