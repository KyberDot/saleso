import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../utils/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const checkAuth = useCallback(async () => {
    try {
      const res = await api.get('/api/auth/status')
      setUser(res.data.authenticated ? res.data.user : null)
    } catch { setUser(null) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    checkAuth()
    const handler = () => setUser(null)
    window.addEventListener('auth:logout', handler)
    return () => window.removeEventListener('auth:logout', handler)
  }, [checkAuth])

  const login = async (email, password) => {
    await api.post('/api/auth/login', { email, password })
    // Always fetch full user from status endpoint so ebay_username
    // and all other fields are included
    await checkAuth()
  }

  const logout = async () => {
    await api.post('/api/auth/logout')
    setUser(null)
  }

  const updateUser = (data) => setUser(prev => ({ ...prev, ...data }))

  return (
    <AuthContext.Provider value={{ user, loading, checkAuth, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
