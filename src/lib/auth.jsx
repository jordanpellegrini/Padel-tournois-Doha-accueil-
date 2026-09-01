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
  // currentUser : null | { username, role: 'superadmin' | 'organizer' | 'user', displayName }
  // - superadmin : toi (via config.js) — tout peut faire
  // - organizer  : peut créer/gérer SES tournois + accès annuaire joueurs
  // - user       : peut voir + saisir des scores (rôle limité)
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
        role: org.role || 'organizer',  // rôle depuis la base (par défaut : organizer)
        displayName: org.display_name || org.username,
      }
      persist(user)
      return { success: true }
    }

    return { success: false, error: 'Identifiant ou mot de passe incorrect' }
  }

  const logout = () => persist(null)

  /**
   * Inscription d'un nouvel organisateur avec un code d'invitation.
   * Vérifie que le code existe, que l'identifiant est libre, puis crée le compte.
   * Retourne { success: true } ou { success: false, error: '...' }
   */
  const register = async (inviteCode, username, password, displayName) => {
    const code = (inviteCode || '').trim()
    const u = (username || '').trim()
    const p = (password || '').trim()
    if (!code || !u || !p) return { success: false, error: 'Tous les champs sont requis' }

    // L'identifiant ne doit pas être celui du super-admin
    if (u.toLowerCase() === ADMIN_USERNAME.toLowerCase()) {
      return { success: false, error: 'Cet identifiant est réservé' }
    }

    // 1) Vérifie le code d'invitation
    const { data: codes, error: codeErr } = await supabase
      .from('invite_codes')
      .select('*')
      .eq('code', code)
      .limit(1)
    if (codeErr) return { success: false, error: 'Erreur serveur' }
    if (!codes || codes.length === 0) {
      return { success: false, error: "Code d'invitation invalide" }
    }
    // Le rôle du compte est déterminé par le code d'invitation utilisé
    const roleFromCode = codes[0].role || 'organizer'

    // 2) Vérifie que l'identifiant est libre
    const { data: existing } = await supabase
      .from('organizers')
      .select('id')
      .ilike('username', u)
      .limit(1)
    if (existing && existing.length > 0) {
      return { success: false, error: 'Cet identifiant existe déjà, choisis-en un autre' }
    }

    // 3) Crée le compte avec le rôle du code
    const { error: insErr } = await supabase.from('organizers').insert({
      username: u,
      password: p,
      display_name: (displayName || '').trim() || u,
      role: roleFromCode,
    })
    if (insErr) return { success: false, error: 'Erreur : ' + insErr.message }

    // 4) Connecte directement la personne
    const user = { username: u, role: roleFromCode, displayName: (displayName || '').trim() || u }
    persist(user)
    return { success: true }
  }

  // Helpers de rôles
  const isSuperAdmin = currentUser?.role === 'superadmin'
  const isOrganizer = currentUser?.role === 'organizer' || isSuperAdmin
  const isUser = currentUser?.role === 'user' || isOrganizer
  const isLoggedIn = !!currentUser

  // Alias de compatibilité avec le code existant
  // isAdmin = "connecté avec des droits de gestion" (organisateur ou super-admin)
  const isAdmin = isOrganizer

  /**
   * Peut-il GÉRER ce tournoi (créer/modifier config, ajouter équipes, lancer) ?
   * - super-admin : tous les tournois
   * - organisateur : seulement ceux qu'il a créés
   * - user : aucun (peut voir seulement)
   */
  const canManageTournament = (tournament) => {
    if (!currentUser) return false
    if (currentUser.role === 'superadmin') return true
    if (currentUser.role === 'organizer') {
      if (!tournament) return false
      return tournament.created_by === currentUser.username
    }
    return false // 'user' ne peut pas gérer
  }

  /**
   * Peut-il SAISIR LES SCORES d'un tournoi ?
   * - super-admin & organisateur créateur : oui
   * - user connecté : oui (accès plus large pour aider à saisir)
   * - non connecté : non
   */
  const canEnterScores = (tournament) => {
    if (!currentUser) return false
    if (canManageTournament(tournament)) return true
    return currentUser.role === 'user' // les users peuvent saisir sur tous les tournois
  }

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        ready,
        login,
        register,
        logout,
        isAdmin,
        isSuperAdmin,
        isOrganizer,
        isUser,
        isLoggedIn,
        canManageTournament,
        canEnterScores,
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
