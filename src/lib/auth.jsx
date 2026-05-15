import { createContext, useContext, useState, useEffect } from 'react'
import { ADMIN_USERNAME, ADMIN_PASSWORD } from './config'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    // On lit l'état au démarrage (mémorisé entre rafraîchissements)
    const saved = window.sessionStorage?.getItem('padel-admin') === 'true'
    setIsAdmin(saved)
  }, [])

  const login = (username, password) => {
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      setIsAdmin(true)
      window.sessionStorage?.setItem('padel-admin', 'true')
      return true
    }
    return false
  }

  const logout = () => {
    setIsAdmin(false)
    window.sessionStorage?.removeItem('padel-admin')
  }

  return (
    <AuthContext.Provider value={{ isAdmin, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
