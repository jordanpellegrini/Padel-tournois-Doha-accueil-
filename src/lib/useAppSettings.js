import { useState, useEffect } from 'react'
import { supabase } from './supabase'

/**
 * Paramètres globaux de l'app (nom de l'organisation, etc.)
 * Stockés dans la table app_settings (clé/valeur).
 *
 * Utilisation :
 *   const { orgName, ready, updateOrgName } = useAppSettings()
 *
 * Le cache mémoire évite de recharger entre les pages.
 */

// Cache global partagé entre tous les composants
let cache = null
const listeners = new Set()

const notifyListeners = () => {
  listeners.forEach((cb) => cb(cache))
}

const fetchSettings = async () => {
  const { data } = await supabase.from('app_settings').select('key, value')
  const map = {}
  ;(data || []).forEach((row) => { map[row.key] = row.value })
  cache = map
  notifyListeners()
  return map
}

export function useAppSettings() {
  const [settings, setSettings] = useState(cache || {})
  const [ready, setReady] = useState(cache !== null)

  useEffect(() => {
    // Charge si pas encore en cache
    if (cache === null) {
      fetchSettings().then(() => setReady(true))
    } else {
      setReady(true)
    }
    // S'abonne aux maj du cache
    const cb = (newCache) => setSettings({ ...newCache })
    listeners.add(cb)
    return () => listeners.delete(cb)
  }, [])

  const orgName = settings.organization_name || 'Doha Accueil'

  // Met à jour le nom de l'organisation (super-admin uniquement, contrôle frontend)
  const updateOrgName = async (newName) => {
    const trimmed = (newName || '').trim() || 'Doha Accueil'
    const { error } = await supabase
      .from('app_settings')
      .upsert({ key: 'organization_name', value: trimmed, updated_at: new Date().toISOString() })
    if (error) return { success: false, error: error.message }
    // Met à jour le cache local
    cache = { ...(cache || {}), organization_name: trimmed }
    notifyListeners()
    return { success: true }
  }

  return { orgName, settings, ready, updateOrgName }
}
