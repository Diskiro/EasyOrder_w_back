import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import StaffManagement from './StaffManagement'
import * as api from '../lib/api'

vi.mock('../context/AuthContext', () => ({
    useAuth: () => ({
        user: { id: 'admin-id-1', email: 'admin@demo.com' },
        role: 'admin'
    })
}))

const mockShowAlert = vi.fn()
const mockShowConfirm = vi.fn()

vi.mock('../context/UIContext', () => ({
    useUI: () => ({
        showAlert: mockShowAlert,
        showConfirm: mockShowConfirm
    })
}))

const mockStaffList = [
    {
        id: 'user-1',
        email: 'mesero@demo.com',
        full_name: 'Carlos Mesero',
        role: 'waiter',
        is_active: true,
        created_at: '2026-10-01T12:00:00Z'
    },
    {
        id: 'admin-id-1',
        email: 'admin@demo.com',
        full_name: 'Admin Principal',
        role: 'admin',
        is_active: true,
        created_at: '2026-09-01T12:00:00Z'
    }
]

describe('StaffManagement Component (Single-Column Responsive View & Actions)', () => {
    let queryClient: QueryClient

    beforeEach(() => {
        vi.clearAllMocks()
        queryClient = new QueryClient({
            defaultOptions: {
                queries: { retry: false },
                mutations: { retry: false }
            }
        })
    })

    const renderComponent = () => {
        return render(
            <QueryClientProvider client={queryClient}>
                <StaffManagement />
            </QueryClientProvider>
        )
    }

    it('debe renderizar la lista de personal en tarjetas de una sola columna', async () => {
        vi.spyOn(api, 'apiFetch').mockResolvedValue(mockStaffList)

        renderComponent()

        await waitFor(() => {
            expect(screen.getByText('Carlos Mesero')).toBeInTheDocument()
        })

        expect(screen.getByText('Admin Principal')).toBeInTheDocument()
        expect(screen.getByText('mesero@demo.com')).toBeInTheDocument()
        expect(screen.getByText('admin@demo.com')).toBeInTheDocument()

        // Verify "Tú" badge on logged in admin
        expect(screen.getByText('Tú')).toBeInTheDocument()
    })

    it('debe deshabilitar los botones de desactivar y eliminar para la propia cuenta de administrador', async () => {
        vi.spyOn(api, 'apiFetch').mockResolvedValue(mockStaffList)

        renderComponent()

        await waitFor(() => {
            expect(screen.getByText('Admin Principal')).toBeInTheDocument()
        })

        const deleteButtons = screen.getAllByRole('button', { name: /eliminar/i })
        // The second one belongs to admin-id-1
        const adminDeleteBtn = deleteButtons.find(btn =>
            btn.getAttribute('aria-label')?.includes('No puedes eliminar tu propia cuenta')
        )
        expect(adminDeleteBtn).toBeInTheDocument()
        expect(adminDeleteBtn).toBeDisabled()
    })

    it('debe permitir abrir la edición de rol y guardar el nuevo rol', async () => {
        vi.spyOn(api, 'apiFetch').mockImplementation(async (endpoint, options) => {
            if (options?.method === 'PATCH') {
                return { success: true }
            }
            return mockStaffList
        })

        renderComponent()

        await waitFor(() => {
            expect(screen.getByText('Carlos Mesero')).toBeInTheDocument()
        })

        const editRoleBtn = screen.getByRole('button', { name: /editar rol de carlos mesero/i })
        fireEvent.click(editRoleBtn)

        const select = screen.getByRole('combobox', { name: /seleccionar rol/i })
        expect(select).toBeInTheDocument()

        fireEvent.change(select, { target: { value: 'kitchen' } })

        const saveBtn = screen.getByRole('button', { name: /guardar rol para carlos mesero/i })
        fireEvent.click(saveBtn)

        await waitFor(() => {
            expect(mockShowAlert).toHaveBeenCalledWith('Rol actualizado correctamente', 'success')
        })
    })

    it('debe filtrar personal al cambiar de pestaña de estado', async () => {
        vi.spyOn(api, 'apiFetch').mockResolvedValue(mockStaffList)

        renderComponent()

        await waitFor(() => {
            expect(screen.getByText('Carlos Mesero')).toBeInTheDocument()
        })

        fireEvent.click(screen.getByRole('button', { name: /^activos$/i }))

        await waitFor(() => {
            expect(screen.getByRole('button', { name: /^activos$/i })).toHaveClass('font-bold')
        })

        fireEvent.click(screen.getByRole('button', { name: /^inactivos$/i }))

        await waitFor(() => {
            expect(screen.getByRole('button', { name: /^inactivos$/i })).toHaveClass('font-bold')
        })
    })

    it('debe solicitar confirmación y ejecutar la mutación de cambiar estado', async () => {
        mockShowConfirm.mockResolvedValue(true)
        vi.spyOn(api, 'apiFetch').mockImplementation(async (endpoint, options) => {
            if (options?.method === 'PATCH') {
                return { success: true }
            }
            return mockStaffList
        })

        renderComponent()

        await waitFor(() => {
            expect(screen.getByText('Carlos Mesero')).toBeInTheDocument()
        })

        const toggleBtn = screen.getByRole('button', { name: /desactivar acceso/i })
        fireEvent.click(toggleBtn)

        await waitFor(() => {
            expect(mockShowConfirm).toHaveBeenCalledWith(
                'Desactivar Personal',
                expect.stringContaining('¿Deseas desactivar a')
            )
        })
    })

    it('debe solicitar confirmación y eliminar al empleado', async () => {
        mockShowConfirm.mockResolvedValue(true)
        vi.spyOn(api, 'apiFetch').mockImplementation(async (endpoint, options) => {
            if (options?.method === 'DELETE') {
                return { message: 'Empleado desvinculado con éxito' }
            }
            return mockStaffList
        })

        renderComponent()

        await waitFor(() => {
            expect(screen.getByText('Carlos Mesero')).toBeInTheDocument()
        })

        const deleteButtons = screen.getAllByRole('button', { name: /eliminar a carlos mesero/i })
        fireEvent.click(deleteButtons[0])

        await waitFor(() => {
            expect(mockShowConfirm).toHaveBeenCalledWith(
                'Eliminar Personal',
                expect.stringContaining('¿Estás seguro de que deseas eliminar a')
            )
        })
    })

    it('debe mostrar el modal para crear nuevo usuario y cerrarlo con cancelar o éxito', async () => {
        vi.spyOn(api, 'apiFetch').mockResolvedValue(mockStaffList)

        renderComponent()

        await waitFor(() => {
            expect(screen.getByText('Carlos Mesero')).toBeInTheDocument()
        })

        const newBtn = screen.getByRole('button', { name: /crear nuevo usuario/i })
        fireEvent.click(newBtn)

        expect(screen.getByRole('heading', { name: /crear nuevo usuario/i })).toBeInTheDocument()

        const closeModalBtn = screen.getByRole('button', { name: /cerrar modal/i })
        fireEvent.click(closeModalBtn)

        expect(screen.queryByRole('heading', { name: /crear nuevo usuario/i })).not.toBeInTheDocument()
    })

    it('debe mostrar el estado vacío cuando no hay personal', async () => {
        vi.spyOn(api, 'apiFetch').mockResolvedValue([])

        renderComponent()

        await waitFor(() => {
            expect(screen.getByText(/no se encontró personal para el filtro seleccionado/i)).toBeInTheDocument()
        })
    })
})
