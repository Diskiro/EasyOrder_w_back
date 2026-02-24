
import React, { useState, useMemo } from 'react'
import { useUI } from '../context/UIContext'
import { useTables, useTableMutations, type Table } from '../hooks/useTables'
import { useCategories, useProducts, type Product } from '../hooks/useMenu'
import { useOrderMutation, useActiveOrders, useUpdateOrderItems } from '../hooks/useOrders'
import { useReservationMutations, type Reservation } from '../hooks/useReservations'
import { useAuth } from '../context/AuthContext'
import { Search, ShoppingCart, CheckCircle, LayoutGrid, List as ListIcon, ChevronLeft } from 'lucide-react'
import { Button, ButtonGroup } from '@mui/material'
import { useLocation } from 'react-router-dom'
import TableGrid from '../components/tables/TableGrid'
import TableList from '../components/tables/TableList'
import OrderCart, { type CartItem } from '../components/tables/OrderCart'
import ProductMenu from '../components/tables/ProductMenu'

export default function TablesView() {
    const { showAlert, showConfirm } = useUI()
    const { user } = useAuth()
    const location = useLocation()
    const { data: tables, isLoading: loadingTables } = useTables()
    const { data: categories, isLoading: loadingCats } = useCategories()
    const { data: products, isLoading: loadingProds } = useProducts()

    // Fetch active orders to find if selected table has one
    const { data: activeOrders } = useActiveOrders()

    const createOrder = useOrderMutation()
    const updateOrderItems = useUpdateOrderItems() // New mutation

    const [selectedTableId, setSelectedTableId] = useState<number | null>(null)
    const selectedTable = tables?.find(t => t.id === selectedTableId)
    const [selectedCategory, setSelectedCategory] = useState<number | null>(null)
    const [cart, setCart] = useState<CartItem[]>([])
    const [searchQuery, setSearchQuery] = useState('')
    const [isCartOpen, setIsCartOpen] = useState(false)

    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
    const [assigningReservation, setAssigningReservation] = useState<Reservation | null>(null)

    const { updateReservation } = useReservationMutations()
    const { updateTable } = useTableMutations()

    // Filter products
    const filteredProducts = useMemo(() => {
        if (!products) return []
        let result = products
        if (searchQuery) {
            const query = searchQuery.toLowerCase()
            result = result.filter(p => p.name.toLowerCase().includes(query))
        }
        return result
    }, [products, searchQuery])

    // Derived state: Is there an active order for the selected table?
    const activeOrder = useMemo(() => {
        if (!selectedTableId || !activeOrders) return null
        return activeOrders.find(o => o.table_id === selectedTableId && o.status !== 'completed' && o.status !== 'cancelled')
    }, [selectedTableId, activeOrders])

    // Effect: Handle navigation from OrdersView (Edit Order) or ReservationsView (Assign Table)
    React.useEffect(() => {
        if (location.state) {
            const state = location.state as any
            if (state.tableId) {
                setSelectedTableId(Number(state.tableId))
            }
            if (state.assignReservation) {
                setAssigningReservation(state.assignReservation)
            }
        }
    }, [location.state])

    // Effect: Load active order into cart when selecting a table
    React.useEffect(() => {
        if (activeOrder && products) {
            // Map existing order items to CartItem format
            const existingItems: CartItem[] = activeOrder.order_items?.map(item => {
                const product = products.find(p => p.id === item.product_id)
                if (!product) return null
                return {
                    ...product,
                    quantity: item.quantity
                }
            }).filter(Boolean) as CartItem[] || []

            setCart(existingItems)
        } else if (!activeOrder) {
            // Reset cart if no active order (New Order mode)
            setCart([])
        }
    }, [activeOrder, products])

    // Check permissions
    const { role } = useAuth()
    const isEditing = !!activeOrder
    const canEdit = !isEditing || (isEditing && role === 'admin') // Only admins can edit active orders

    const handleAddToOrder = (product: Product) => {
        if (!canEdit) return // Block adding items if restricted
        setCart(prev => {
            const existing = prev.find(item => item.id === product.id)
            if (existing) {
                return prev.map(item =>
                    item.id === product.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                )
            }
            return [...prev, { ...product, quantity: 1 }]
        })
    }

    const handleUpdateQuantity = (itemId: number, delta: number) => {
        if (!canEdit) return // Block updating quantity if restricted
        setCart(prev => prev.map(item => {
            if (item.id === itemId) {
                const newQuantity = Math.max(0, item.quantity + delta)
                return { ...item, quantity: newQuantity }
            }
            return item
        }).filter(item => item.quantity > 0))
    }

    const handleSubmitOrder = async () => {
        if (!selectedTableId || !user) return
        if (!canEdit) return

        if (cart.length === 0) {
            showAlert('No se puede crear una orden vacía. Agrega productos.', 'warning')
            return
        }

        try {
            if (activeOrder) {
                await updateOrderItems.mutateAsync({
                    orderId: activeOrder.id,
                    items: cart.map(item => ({
                        productId: item.id,
                        quantity: item.quantity,
                        price: item.price
                    }))
                })
                showAlert('Orden actualizada con éxito!', 'success')
            } else {
                await createOrder.mutateAsync({
                    tableId: selectedTableId,
                    serverId: user.id,
                    items: cart.map(item => ({
                        productId: item.id,
                        quantity: item.quantity,
                        price: item.price
                    }))
                })
                showAlert('Orden creada con éxito!', 'success')
            }

            setCart([])
            setSelectedTableId(null)
        } catch (error) {
            console.error(error)
            showAlert('Error al guardar la orden', 'error')
        }
    }

    const handleTableClick = async (table: Table) => {
        if (assigningReservation) {
            if (table.status === 'occupied') {
                showAlert('Esta mesa está ocupada. Selecciona una libre.', 'warning')
                return
            }

            const confirmed = await showConfirm('Confirmar Asignación', `¿Asignar a ${assigningReservation.customer_name} a la mesa ${table.number}?`)

            if (confirmed) {
                try {
                    await updateTable.mutateAsync({ id: table.id, updates: { status: 'occupied' } })
                    await updateReservation.mutateAsync({
                        id: assigningReservation.id,
                        updates: {
                            status: 'completed',
                            table_id: table.id
                        }
                    })
                    setAssigningReservation(null)
                    showAlert('Cliente asignado correctamente', 'success')
                    setSelectedTableId(table.id)
                } catch (error) {
                    console.error(error)
                    showAlert('Error al asignar mesa', 'error')
                }
            }
        } else {
            setSelectedTableId(table.id)
        }
    }

    const cancelAssigning = () => {
        setAssigningReservation(null)
    }

    // Calculate total items for badge
    const totalItems = useMemo(() => cart.reduce((acc, item) => acc + item.quantity, 0), [cart])
    const cartTotal = useMemo(() => cart.reduce((total, item) => total + (item.price * item.quantity), 0), [cart])

    if (loadingTables || loadingCats || loadingProds) return <div className="p-8 text-white">Cargando datos...</div>

    return (
        <div className="flex flex-col h-full bg-[#111315] font-sans text-gray-200 overflow-hidden relative">

            {/* Assignment Overlay Banner */}
            {assigningReservation && (
                <div className="absolute top-0 left-0 right-0 bg-blue-600 text-white z-50 p-4 shadow-xl flex justify-between items-center animate-bounce-in">
                    <div className="flex items-center gap-2">
                        <CheckCircle size={20} className="animate-pulse" />
                        <span className="font-bold">MODO ASIGNACIÓN: Selecciona una mesa para {assigningReservation.customer_name} ({assigningReservation.pax} Pax)</span>
                    </div>
                    <Button variant="contained" color="inherit" size="small" onClick={cancelAssigning} sx={{ color: 'blue', bgcolor: 'white', '&:hover': { bgcolor: '#f0f0f0' } }}>
                        Cancelar
                    </Button>
                </div>
            )}


            {/* RIGHT PANEL */}
            <div className="flex-1 flex flex-col bg-[#111315] relative min-h-0">

                {/* Top Bar */}
                <header className="h-16 border-b border-gray-800 flex justify-between items-center px-4 md:px-6 bg-[#141619] shrink-0">
                    <div className="flex items-center gap-4">
                        <h1 className="text-lg md:text-xl font-bold text-white tracking-wide">RESTAURANTE</h1>
                    </div>

                    <div className="flex-1 max-w-md mx-4 hidden md:block">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                            <input
                                type="text"
                                placeholder="Buscar mesa..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-[#1F2329] border border-gray-700 rounded-lg py-2 pl-9 pr-4 text-sm focus:outline-none focus:border-[#FBBF24] transition-colors text-white"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-2 md:gap-4">
                        <div className="flex bg-[#1F2329] rounded-lg p-1">
                            {/* Toggle View Mode using MUI Buttons */}
                            <ButtonGroup variant="text" color="inherit" size="small">
                                <Button onClick={() => setViewMode('grid')} sx={{ color: viewMode === 'grid' ? 'white' : 'gray', minWidth: 40 }}><LayoutGrid size={18} /></Button>
                                <Button onClick={() => setViewMode('list')} sx={{ color: viewMode === 'list' ? 'white' : 'gray', minWidth: 40 }}><ListIcon size={18} /></Button>
                            </ButtonGroup>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <div className="flex-1 overflow-auto p-4 md:p-8 relative">

                    {!selectedTableId ? (
                        <>
                            {viewMode === 'grid' ? (
                                <TableGrid
                                    tables={tables}
                                    onTableClick={handleTableClick}
                                    assigningReservation={assigningReservation}
                                />
                            ) : (
                                <TableList
                                    tables={tables}
                                    onTableClick={handleTableClick}
                                />
                            )}
                        </>
                    ) : (
                        /* ORDER VIEW */
                        <div className="flex h-full gap-6 animate-fade-in relative">
                            {/* Product List */}
                            <div className="flex-1 flex flex-col min-w-0 pb-20 lg:pb-0">
                                <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6 sticky top-0 bg-[#111315] z-20 py-4 -mt-4 border-b border-gray-800/50 backdrop-blur-sm">
                                    <div className="flex items-center gap-4 flex-1">
                                        <Button onClick={() => setSelectedTableId(null)} sx={{ color: 'gray', minWidth: 40, borderRadius: '50%' }}>
                                            <ChevronLeft size={24} />
                                        </Button>
                                        <h2 className="text-2xl font-bold text-white whitespace-nowrap">
                                            Mesa {selectedTable?.number}
                                        </h2>
                                        {selectedTable?.status === 'occupied' && !activeOrder && (
                                            <Button
                                                variant="outlined"
                                                color="warning"
                                                size="small"
                                                onClick={async () => {
                                                    if (await showConfirm('¿Liberar mesa?', 'Esta mesa está marcada como ocupada pero no tiene órdenes activas. ¿Liberarla ahora?')) {
                                                        await updateTable.mutateAsync({ id: selectedTable!.id, updates: { status: 'available' } })
                                                        showAlert('Mesa liberada', 'success')
                                                        setSelectedTableId(null)
                                                    }
                                                }}
                                                className="ml-auto"
                                            >
                                                Liberar Mesa
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                <ProductMenu
                                    categories={categories}
                                    products={filteredProducts}
                                    selectedCategory={selectedCategory}
                                    onSelectCategory={setSelectedCategory}
                                    onAddToCart={handleAddToOrder}
                                    canEdit={canEdit}
                                />
                            </div>

                            {/* Desktop static Cart */}
                            <div className="hidden lg:flex w-80 h-full">
                                <OrderCart
                                    cart={cart}
                                    activeOrder={activeOrder}
                                    canEdit={canEdit}
                                    isLoading={createOrder.isPending || updateOrderItems.isPending}
                                    onUpdateQuantity={handleUpdateQuantity}
                                    onSubmit={handleSubmitOrder}
                                />
                            </div>

                            {/* Mobile Cart Modal/Drawer */}
                            {isCartOpen && (
                                <>
                                    {/* Backdrop */}
                                    <div
                                        className="lg:hidden fixed inset-0 z-[55] bg-black/60 backdrop-blur-sm transition-opacity"
                                        onClick={() => setIsCartOpen(false)}
                                    />
                                    {/* Drawer is self-positioned by OrderCart's isMobile prop */}
                                    <OrderCart
                                        cart={cart}
                                        activeOrder={activeOrder}
                                        canEdit={canEdit}
                                        isLoading={createOrder.isPending || updateOrderItems.isPending}
                                        onUpdateQuantity={handleUpdateQuantity}
                                        onSubmit={handleSubmitOrder}
                                        isMobile={true}
                                        onClose={() => setIsCartOpen(false)}
                                    />
                                </>
                            )}

                        </div>
                    )}
                </div>

                {/* Mobile Cart Toggle Button (Floating) - Outside scroll area */}
                {selectedTableId && (
                    <div className="lg:hidden absolute bottom-0 left-0 right-0 p-4 bg-[#141619] border-t border-gray-800 z-30">
                        <Button
                            fullWidth
                            variant="contained"
                            color="primary"
                            size="large"
                            onClick={() => setIsCartOpen(true)}
                            sx={{ color: 'black', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', px: 3 }}
                        >
                            <span className="flex items-center gap-2 text-black">
                                <ShoppingCart size={20} className="text-black" />
                                <span className="text-black">Ver Orden ({totalItems})</span>
                            </span>
                            <span className="text-black">${cartTotal.toFixed(2)}</span>
                        </Button>
                    </div>
                )}
            </div>
        </div>
    )
}
