import { describe, it, expect } from 'vitest'
import { calculateCartTotal, calculateTotalItems, formatCurrency } from './cartUtils'
import type { CartItem } from './cartUtils'

describe('cartUtils', () => {
    const mockCart: CartItem[] = [
        {
            id: 1,
            name: 'Item 1',
            price: 10,
            quantity: 2,
            category_id: 1,
            image_url: '',
            description: '',
            is_active: true,
            stock_status: 'in_stock'
        },
        {
            id: 2,
            name: 'Item 2',
            price: 5.5,
            quantity: 3,
            category_id: 1,
            image_url: '',
            description: '',
            is_active: true,
            stock_status: 'in_stock'
        }
    ]

    describe('calculateCartTotal', () => {
        it('should calculate the total price correctly', () => {
            // (10 * 2) + (5.5 * 3) = 20 + 16.5 = 36.5
            expect(calculateCartTotal(mockCart)).toBe(36.5)
        })

        it('should return 0 for an empty cart', () => {
            expect(calculateCartTotal([])).toBe(0)
        })
    })

    describe('calculateTotalItems', () => {
        it('should sum up all quantities', () => {
            // 2 + 3 = 5
            expect(calculateTotalItems(mockCart)).toBe(5)
        })

        it('should return 0 for an empty cart', () => {
            expect(calculateTotalItems([])).toBe(0)
        })
    })

    describe('formatCurrency', () => {
        it('should format numbers as currency string', () => {
            expect(formatCurrency(10)).toBe('$10.00')
            expect(formatCurrency(10.5)).toBe('$10.50')
            expect(formatCurrency(0)).toBe('$0.00')
        })
    })
})
