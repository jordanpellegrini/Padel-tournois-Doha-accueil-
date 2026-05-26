import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from './supabase'
import { ADMIN_USERNAME, ADMIN_PASSWORD } from './config'

const AuthContext = createContext(null)

/**
 * Système d'authentification :
 *  - SUPER-ADMIN (toi) : identifiants dans config.js (ADMIN_USERNAME / ADMIN_PASSWORD)
 *    → peut tout gérer + ajouter/retirer des organisateurs
 *  - ORGANISATEURS : comptes stockés dans la table Supabase `organizers`
 *    → gèrent uniquement leurs propres tournois
 *
 * La session est conservée dans sessionStorage (le temps de l'onglet).
 */
export function AuthProvider({ children }) {
  // currentUser : null | { username, role: 'superadmin' | 'organizer', displayName }
  const [currentUser, setCurrentUser] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // Restaure la session depuis sessionStorage
    try {
      const saved = sessionStorage.getItem('padel_auth')
      if (saved) setCurrentUser(JSON.parse(saved))
    } catch (e) {}
    setReady(true)
  }, [])

  const persist = (user) => {
    setCurrentUser(user)
    try {
      if (user) sessionStorage.setItem('padel_auth', JSON.stringify(user))
      else sessionStorage.removeItem('padel_auth')
    } catch (e) {}
  }

  /**
   * Tente une connexion.
   * Retourne { success: true } ou { success: false, error: '...' }
   */
  const login = async (username, password) => {
    const u = (username || '').trim()
    const p = (password || '').trim()
    if (!u || !p) return { success: false, error: 'Identifiants requis' }

    // 1) Super-admin (toi) via config.js
    if (u.toLowerCase() === ADMIN_USERNAME.toLowerCase() && p === ADMIN_PASSWORD) {
      const user = { username: ADMIN_USERNAME, role: 'superadmin', displayName: 'Administrateur' }
      persist(user)
      return { success: true }
    }

    // 2) Organisateur via la table Supabase
    const { data, error } = await supabase
      .from('organizers')
      .select('*')
      .ilike('username', u)
      .limit(1)

    if (error) {
      return { success: false, error: 'Erreur de connexion au serveur' }
    }
    const org = data && data[0]
    if (org && org.password === p) {
      const user = {
        username: org.username,
        role: 'organizer',
        displayName: org.display_name || org.username,
      }
      persist(user)
      return { success: true }
    }

    return { success: false, error: 'Identifiant ou mot de passe incorrect' }
  }

  const logout = () => persist(null)

  // Helpers de droits
  const isAdmin = !!currentUser // connecté = peut gérer (admin au sens large)
  const isSuperAdmin = currentUser?.role === 'superadmin'

  /**
   * Peut-il gérer CE tournoi précis ?
   * - super-admin : tous
   * - organisateur : seulement ceux qu'il a créés (created_by === son username)
   */
  const canManageTournament = (tournament) => {
    if (!currentUser) return false
    if (currentUser.role === 'superadmin') return true
    if (!tournament) return false
    return tournament.created_by === currentUser.username
  }

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        ready,
        login,
        logout,
        isAdmin,
        isSuperAdmin,
        canManageTournament,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth doit être utilisé dans AuthProvider')
  return ctx
}
