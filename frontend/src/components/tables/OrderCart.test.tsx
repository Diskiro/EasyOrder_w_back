import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import OrderCart, { type CartItem } from './OrderCart'
import '@testing-library/jest-dom' // Ensure jest-dom matchers are available

describe('OrderCart Component', () => {
    const mockOnUpdateQuantity = vi.fn()
    const mockOnUpdateNote = vi.fn()
    const mockOnSubmit = vi.fn()

    it('calculates and displays the correct total price', () => {
        const mockCart: CartItem[] = [
            {
                id: 1,
                name: 'Burger',
                price: 10,
                quantity: 2,
                category_id: 1,
                image_url: '',
                description: '',
                stock_status: 'in_stock',
                is_active: true,

            },
            {
                id: 2,
                name: 'Fries',
                price: 5,
                quantity: 1,
                category_id: 1,
                image_url: '',
                description: '',
                stock_status: 'in_stock',
                is_active: true,

            }
        ]

        // Expected Total: (10 * 2) + (5 * 1) = 25
        const expectedTotal = '$25.00'

        render(
            <OrderCart
                cart={mockCart}
                activeOrder={null}
                canEdit={true}
                isLoading={false}
                onUpdateQuantity={mockOnUpdateQuantity}
                onUpdateNote={mockOnUpdateNote}
                onSubmit={mockOnSubmit}
                isMobile={false}
            />
        )

        // Check if the total is displayed
        // We can search for the text exactly, or use a partially matching regex if needed.
        // The component renders: ${cartTotal.toFixed(2)}
        expect(screen.getByText(expectedTotal)).toBeInTheDocument()
    })

    it('displays $0.00 when cart is empty', () => {
        render(
            <OrderCart
                cart={[]}
                activeOrder={null}
                canEdit={true}
                isLoading={false}
                onUpdateQuantity={mockOnUpdateQuantity}
                onUpdateNote={mockOnUpdateNote}
                onSubmit={mockOnSubmit}
                isMobile={false}
            />
        )

        expect(screen.getByText('$0.00')).toBeInTheDocument()
    })
})
