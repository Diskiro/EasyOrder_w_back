import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../lib/api'
import { Lock, CheckCircle } from 'lucide-react'
import { useUI } from '../context/UIContext'

export default function UpdatePassword() {
    const { showAlert } = useUI()
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const navigate = useNavigate()

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault()
        if (password !== confirmPassword) {
            setError('Passwords do not match')
            return
        }

        setLoading(true)
        setError(null)

        try {
            await apiFetch('/auth/change-password', {
                method: 'POST',
                body: JSON.stringify({ password })
            })
            showAlert('Password updated successfully!', 'success')
            navigate('/')
        } catch (err: any) {
            setError(err.message)
            showAlert(err.message, 'error')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#121212] p-4">
            <div className="w-full max-w-md bg-[#242424] rounded-2xl shadow-xl p-8 border border-gray-800">
                <div className="flex justify-center mb-6">
                    <div className="bg-green-600/20 p-4 rounded-full">
                        <Lock size={40} className="text-green-500" />
                    </div>
                </div>

                <h2 className="text-3xl font-bold text-center text-white mb-2">New Password</h2>
                <p className="text-gray-400 text-center mb-8">Enter your new password below</p>

                {error && (
                    <div className="bg-red-900/30 border border-red-800 text-red-200 px-4 py-3 rounded-lg mb-6 text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleUpdate} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">New Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="w-full bg-[#1a1a1a] border border-gray-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                            placeholder="••••••••"
                            minLength={6}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Confirm New Password</label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            className="w-full bg-[#1a1a1a] border border-gray-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                            placeholder="••••••••"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                    >
                        {loading ? 'Updating...' : <><CheckCircle size={20} /> Update Password</>}
                    </button>
                </form>
            </div>
        </div>
    )
}
