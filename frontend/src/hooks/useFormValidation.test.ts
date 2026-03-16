import { renderHook, act } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { useFormValidation } from './useFormValidation'

describe('useFormValidation', () => {
    it('initializes with default values', () => {
        const initialState = { name: '', email: '' }
        const { result } = renderHook(() => useFormValidation(initialState))

        expect(result.current.values).toEqual(initialState)
        expect(result.current.errors).toEqual({})
        expect(result.current.isValid).toBe(true)
    })

    it('updates values on change', () => {
        const initialState = { name: '' }
        const { result } = renderHook(() => useFormValidation(initialState))

        act(() => {
            // Mock event structure
            const event = {
                target: { name: 'name', value: 'John' }
            } as React.ChangeEvent<HTMLInputElement>

            result.current.handleChange(event)
        })

        expect(result.current.values.name).toBe('John')
    })

    it('validates required fields', () => {
        const initialState = { name: '' }
        const rules = {
            name: { required: true }
        }
        const { result } = renderHook(() => useFormValidation(initialState, rules))

        act(() => {
            // Trigger validation by calling validateAll or changing value
            result.current.validateAll()
        })

        expect(result.current.isValid).toBe(false)
        expect(result.current.errors.name).toBe('Este campo es requerido')
    })

    it('validates minLength', () => {
        const initialState = { password: '' }
        const rules = {
            password: { minLength: 6 }
        }
        const { result } = renderHook(() => useFormValidation(initialState, rules))

        act(() => {
            const event = {
                target: { name: 'password', value: '123' }
            } as React.ChangeEvent<HTMLInputElement>
            result.current.handleChange(event)
        })

        expect(result.current.errors.password).toBe('Mínimo 6 caracteres')
    })

    it('validates pattern (email)', () => {
        const initialState = { email: '' }
        const rules = {
            email: { pattern: /^\S+@\S+\.\S+$/ }
        }
        const { result } = renderHook(() => useFormValidation(initialState, rules))

        act(() => {
            const event = {
                target: { name: 'email', value: 'invalid-email' }
            } as React.ChangeEvent<HTMLInputElement>
            result.current.handleChange(event)
        })

        expect(result.current.errors.email).toBe('Formato inválido')
    })

    it('clears error when input becomes valid', () => {
        const initialState = { name: '' }
        const rules = {
            name: { required: true }
        }
        const { result } = renderHook(() => useFormValidation(initialState, rules))

        // First make it invalid
        act(() => {
            const event = {
                target: { name: 'name', value: '' }
            } as React.ChangeEvent<HTMLInputElement>
            result.current.handleChange(event)
        })
        expect(result.current.errors.name).toBe('Este campo es requerido')

        // Then make it valid
        act(() => {
            const event = {
                target: { name: 'name', value: 'John' }
            } as React.ChangeEvent<HTMLInputElement>
            result.current.handleChange(event)
        })
        expect(result.current.errors.name).toBe('')
    })

    it('updates isValid when errors are resolved', () => {
        const initialState = { name: '' }
        const rules = {
            name: { required: true }
        }
        const { result } = renderHook(() => useFormValidation(initialState, rules))

        // Trigger validation to make it invalid
        act(() => {
            result.current.validateAll()
        })
        expect(result.current.isValid).toBe(false)
        expect(result.current.errors.name).toBe('Este campo es requerido')

        // Fix the error
        act(() => {
            const event = {
                target: { name: 'name', value: 'Valid Name' }
            } as React.ChangeEvent<HTMLInputElement>
            result.current.handleChange(event)
        })

        // Expect it to become valid again
        expect(result.current.errors.name).toBe('')
        expect(result.current.isValid).toBe(true)
    })
})
