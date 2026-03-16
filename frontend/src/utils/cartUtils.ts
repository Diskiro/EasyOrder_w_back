import type { Product } from '../hooks/useMenu'

export interface CartItem extends Product {
    quantity: number
}

export const calculateCartTotal = (cart: CartItem[]): number => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0)
}

export const calculateTotalItems = (cart: CartItem[]): number => {
    return cart.reduce((acc, item) => acc + item.quantity, 0)
}

export const formatCurrency = (amount: number): string => {
    return `$${amount.toFixed(2)}`
}
