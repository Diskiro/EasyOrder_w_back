import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import Layout from './Layout'

// Mock dependencies
vi.mock('../context/AuthContext', () => ({
    useAuth: () => ({
        role: 'admin',
        fullName: 'Admin Demo',
        signOut: vi.fn()
    })
}))

vi.mock('../context/TenantContext', () => ({
    useTenant: () => ({
        tenant: {
            name: 'Restaurante Demo',
            slug: 'demo',
            plan_id: 'enterprise',
            primary_color: '#FBBF24',
            logo_url: ''
        },
        isFeatureEnabled: () => true
    })
}))

vi.mock('../hooks/useGlobalRealtimeSync', () => ({
    useGlobalRealtimeSync: () => {}
}))

describe('Layout Navigation & Responsive Drawer Accessibility', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    const renderLayout = (initialRoute = '/staff-management') => {
        return render(
            <MemoryRouter initialEntries={[initialRoute]}>
                <Layout />
            </MemoryRouter>
        )
    }

    it('debe renderizar el botón disparador amarillo en tablet y la barra compacta', () => {
        renderLayout()

        const tabletTrigger = screen.getByRole('button', { name: /abrir menú lateral completo/i })
        expect(tabletTrigger).toBeInTheDocument()
        expect(tabletTrigger).toHaveAttribute('aria-expanded', 'false')

        const mobileTrigger = screen.getByRole('button', { name: /abrir menú de navegación/i })
        expect(mobileTrigger).toBeInTheDocument()
        expect(mobileTrigger).toHaveAttribute('aria-expanded', 'false')
    })

    it('al hacer clic en el cuadro amarillo debe abrir el drawer y actualizar aria-expanded', () => {
        renderLayout()

        const tabletTrigger = screen.getByRole('button', { name: /abrir menú lateral completo/i })
        fireEvent.click(tabletTrigger)

        expect(tabletTrigger).toHaveAttribute('aria-expanded', 'true')
        const drawer = screen.getByRole('dialog', { name: /menú de navegación completo/i })
        expect(drawer).toBeInTheDocument()
        expect(drawer).toHaveClass('translate-x-0')
    })

    it('debe cerrar el menú lateral al presionar la tecla Escape', () => {
        renderLayout()

        const tabletTrigger = screen.getByRole('button', { name: /abrir menú lateral completo/i })
        fireEvent.click(tabletTrigger)

        const drawer = screen.getByRole('dialog', { name: /menú de navegación completo/i })
        expect(drawer).toHaveClass('translate-x-0')

        fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' })

        expect(tabletTrigger).toHaveAttribute('aria-expanded', 'false')
        expect(drawer).toHaveClass('-translate-x-full')
    })

    it('debe cerrar el menú lateral al hacer clic en el botón de cerrar', () => {
        renderLayout()

        const tabletTrigger = screen.getByRole('button', { name: /abrir menú lateral completo/i })
        fireEvent.click(tabletTrigger)

        const closeButton = screen.getByRole('button', { name: /cerrar menú/i })
        expect(closeButton).toBeInTheDocument()

        fireEvent.click(closeButton)

        const drawer = screen.getByRole('dialog', { name: /menú de navegación completo/i })
        expect(drawer).toHaveClass('-translate-x-full')
        expect(tabletTrigger).toHaveAttribute('aria-expanded', 'false')
    })

    it('debe cerrar el menú al hacer clic en una sección de navegación del drawer', () => {
        renderLayout()

        const mobileTrigger = screen.getByRole('button', { name: /abrir menú de navegación/i })
        fireEvent.click(mobileTrigger)

        const drawer = screen.getByRole('dialog', { name: /menú de navegación completo/i })
        expect(drawer).toHaveClass('translate-x-0')

        const drawerLink = within(drawer).getByRole('link', { name: /personal/i })
        fireEvent.click(drawerLink)

        expect(drawer).toHaveClass('-translate-x-full')
    })

    it('debe cerrar el menú al hacer clic en el backdrop oscuro', () => {
        const { container } = renderLayout()

        const tabletTrigger = screen.getByRole('button', { name: /abrir menú lateral completo/i })
        fireEvent.click(tabletTrigger)

        const backdrop = container.querySelector('.bg-black\\/70')
        expect(backdrop).toBeInTheDocument()
        expect(backdrop).toHaveClass('opacity-100')

        fireEvent.click(backdrop!)

        const drawer = screen.getByRole('dialog', { name: /menú de navegación completo/i })
        expect(drawer).toHaveClass('-translate-x-full')
    })
})
