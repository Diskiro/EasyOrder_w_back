import { useState, useCallback } from 'react'

interface ValidationRules {
    required?: boolean
    minLength?: number
    maxLength?: number
    pattern?: RegExp
    validate?: (value: any) => boolean | string
}

interface Errors {
    [key: string]: string
}

export function useFormValidation<T extends Record<string, any>>(initialState: T, rules?: Partial<Record<keyof T, ValidationRules>>) {
    const [values, setValues] = useState<T>(initialState)
    const [errors, setErrors] = useState<Errors>({})
    const [isValid, setIsValid] = useState(true)

    const validate = useCallback((fieldName: keyof T, value: any): string => {
        if (!rules || !rules[fieldName]) return ''

        const rule = rules[fieldName]

        if (rule.required && !value) {
            return 'Este campo es requerido'
        }

        if (rule.minLength && String(value).length < rule.minLength) {
            return `Mínimo ${rule.minLength} caracteres`
        }

        if (rule.maxLength && String(value).length > rule.maxLength) {
            return `Máximo ${rule.maxLength} caracteres`
        }

        if (rule.pattern && !rule.pattern.test(String(value))) {
            return 'Formato inválido'
        }

        if (rule.validate) {
            const customResult = rule.validate(value)
            if (typeof customResult === 'string') return customResult
            if (!customResult) return 'Valor inválido'
        }

        return ''
    }, [rules])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target
        setValues(prev => ({ ...prev, [name]: value }))

        const error = validate(name as keyof T, value)
        setErrors(prev => {
            const newErrors = {
                ...prev,
                [name]: error
            }
            // Check if there are any errors remaining
            const hasErrors = Object.values(newErrors).some(err => err !== '')
            setIsValid(!hasErrors)
            return newErrors
        })
    }

    const validateAll = useCallback(() => {
        const newErrors: Errors = {}
        let valid = true

        Object.keys(values).forEach(key => {
            const error = validate(key, values[key])
            if (error) {
                newErrors[key] = error
                valid = false
            }
        })

        setErrors(newErrors)
        setIsValid(valid)
        return valid
    }, [values, validate])

    return {
        values,
        errors,
        isValid,
        handleChange,
        validateAll,
        setValues
    }
}
