import { useMemo } from 'react'
import { Button } from '@mui/material'
import { ShoppingCart, ChevronLeft, Minus, Plus } from 'lucide-react'
import clsx from 'clsx'
import type { Product } from '../../hooks/useMenu'
import type { Order } from '../../hooks/useOrders'

// Cart Item Type
export interface CartItem extends Product {
    quantity: number
    notes?: string
}

interface OrderCartProps {
    cart: CartItem[]
    activeOrder: Order | null | undefined
    canEdit: boolean
    isMobile?: boolean
    isLoading: boolean
    onUpdateQuantity: (itemId: number, delta: number) => void
    onUpdateNote: (itemId: number, note: string) => void
    onSubmit: () => void
    onClose?: () => void
    isOpen?: boolean
}

export default function OrderCart({
    cart,
    activeOrder,
    canEdit,
    isMobile = false,
    isLoading,
    onUpdateQuantity,
    onUpdateNote,
    onSubmit,
    onClose
}: OrderCartProps) {

    // Calculate total items for badge
    const totalItems = useMemo(() => cart.reduce((acc, item) => acc + item.quantity, 0), [cart])

    const cartTotal = useMemo(() => {
        return cart.reduce((total, item) => total + (item.price * item.quantity), 0)
    }, [cart])

    return (
        <div className={clsx(
            "bg-[#1F2329] border-l border-gray-800 flex flex-col shadow-2xl transition-all duration-300",
            isMobile
                ? "fixed inset-y-0 right-0 z-[60] w-full md:w-[450px] h-full pt-16 md:pt-0"
                : "w-80 rounded-2xl h-full border"
        )}>
            <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-[#1F2329] shrink-0"
                style={isMobile ? {} : { borderTopLeftRadius: '1rem', borderTopRightRadius: '1rem' }}>
                <h3 className="font-bold text-white flex items-center gap-2">
                    {isMobile && onClose && (
                        <Button onClick={onClose} sx={{ color: 'gray', minWidth: 'auto', p: 1, mr: 1 }}>
                            <ChevronLeft size={24} />
                        </Button>
                    )}
                    <ShoppingCart size={18} />
                    {activeOrder ? `Orden #${activeOrder.id} ` : 'Orden Actual'}
                </h3>
                <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded">{totalItems} art.</span>
            </div>

            {/* Warning Banner */}
            {!canEdit && (
                <div className="bg-red-500/20 text-red-200 px-4 py-2 text-xs font-bold border-b border-red-500/20 flex items-center justify-center shrink-0">
                    <div className="mr-2">Solo Lectura</div>
                    Requiere acceso de administrador
                </div>
            )}

            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {cart.length === 0 && (
                    <div className="text-center text-gray-500 mt-10 p-4">
                        <p className="mb-2">El carrito está vacío</p>
                        <p className="text-xs">Selecciona productos del menú para agregar.</p>
                    </div>
                )}
                {cart.map(item => (
                    <div key={item.id} className="flex flex-col bg-[#141619] p-3 rounded-lg border border-gray-800">
                        <div className="flex justify-between items-center">
                            <div className="flex-1 min-w-0 mr-2">
                                <div className="text-sm font-bold text-gray-300 truncate">{item.name}</div>
                                <div className="text-xs text-[#FBBF24]">${(item.price * item.quantity).toFixed(2)}</div>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="flex items-center bg-gray-800 rounded">
                                    <Button size="small" disabled={!canEdit} onClick={() => onUpdateQuantity(item.id, -1)} sx={{ minWidth: 32, p: 0.5, color: 'gray' }}><Minus size={12} /></Button>
                                    <span className="text-xs font-bold w-4 text-center text-white">{item.quantity}</span>
                                    <Button size="small" disabled={!canEdit} onClick={() => onUpdateQuantity(item.id, 1)} sx={{ minWidth: 32, p: 0.5, color: 'gray' }}><Plus size={12} /></Button>
                                </div>
                            </div>
                        </div>

                        <div className="mt-2 pt-2 border-t border-gray-800/50">
                            <input
                                type="text"
                                value={item.notes || ''}
                                onChange={(e) => onUpdateNote(item.id, e.target.value)}
                                placeholder="Ej. Sin cebolla, extra picante..."
                                className="w-full bg-black/50 border border-gray-700 rounded px-2 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-blue-500 transition-colors"
                                disabled={!canEdit}
                            />
                        </div>
                    </div>
                ))}
            </div>

            <div className="p-4 bg-[#141619] border-t border-gray-800 shrink-0"
                style={isMobile ? { paddingBottom: '2rem' } : { borderBottomLeftRadius: '1rem', borderBottomRightRadius: '1rem' }}>
                <div className="flex justify-between items-end mb-4">
                    <span className="text-gray-400 text-sm">Total a pagar</span>
                    <span className="text-2xl font-bold text-white">${cartTotal.toFixed(2)}</span>
                </div>
                <Button
                    fullWidth
                    variant="contained"
                    color="primary"
                    size="large"
                    onClick={onSubmit}
                    disabled={isLoading || !canEdit || cart.length === 0}
                    sx={{ color: 'black', fontWeight: 'bold' }}
                >
                    {isLoading
                        ? 'Procesando...'
                        : !canEdit
                            ? 'SOLO LECTURA'
                            : (activeOrder ? 'ACTUALIZAR ORDEN' : 'CONFIRMAR PEDIDO')}
                </Button>
            </div>
        </div>
    )
}
