'use client'

import { useState, useEffect, createContext, useContext } from 'react'
import { adminLogin } from '@/services/admin-api'
import { getAdminToken, setAdminToken, clearAdminToken } from '@/lib/admin-auth'
import Link from 'next/link'

const AuthContext = createContext<{ token: string; logout: () => void } | null>(null)

export function useAdminAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAdminAuth must be used within admin layout')
  return ctx
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null)
  const [checking, setChecking] = useState(true)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loggingIn, setLoggingIn] = useState(false)

  useEffect(() => {
    const saved = getAdminToken()
    if (saved) setToken(saved)
    setChecking(false)
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoggingIn(true)
    try {
      await adminLogin(password)
      setAdminToken(password)
      setToken(password)
    } catch {
      setError('Invalid password')
    } finally {
      setLoggingIn(false)
    }
  }

  const logout = () => {
    clearAdminToken()
    setToken(null)
  }

  if (checking) return null

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f4f2ef]">
        <form onSubmit={handleLogin} className="bg-white border-2 border-black p-8 w-full max-w-sm space-y-4">
          <h1 className="text-xl font-bold">Admin Login</h1>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full border-2 border-black px-3 py-2 text-sm"
            autoFocus
          />
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loggingIn}
            className="w-full bg-black text-white py-2 text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
          >
            {loggingIn ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    )
  }

  return (
    <AuthContext value={{ token, logout }}>
      <div className="min-h-screen bg-[#f4f2ef]">
        <nav className="bg-black text-white px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="font-bold text-sm">GP Admin</span>
            <Link href="/admin" className="text-sm hover:underline">Dashboard</Link>
            <Link href="/admin/scrape" className="text-sm hover:underline">Scrape</Link>
            <Link href="/admin/upcoming" className="text-sm hover:underline">Upcoming</Link>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/" className="text-xs text-gray-400 hover:underline">View Site</Link>
            <button onClick={logout} className="text-xs text-gray-400 hover:underline">Logout</button>
          </div>
        </nav>
        <div className="max-w-6xl mx-auto px-4 py-6">
          {children}
        </div>
      </div>
    </AuthContext>
  )
}
