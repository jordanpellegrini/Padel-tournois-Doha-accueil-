import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { useAppSettings } from '../lib/useAppSettings'

export default function Header() {
  const { currentUser, isSuperAdmin, login, register, logout } = useAuth()
  const [showAuth, setShowAuth] = useState(false)
  const [showManage, setShowManage] = useState(false)
  const [mode, setMode] = useState('login') // 'login' | 'register'

  // Champs login
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  // Champs inscription
  const [regCode, setRegCode] = useState('')
  const [regName, setRegName] = useState('')
  const [regUsername, setRegUsername] = useState('')
  const [regPassword, setRegPassword] = useState('')

  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const resetForm = () => {
    setUsername(''); setPassword('')
    setRegCode(''); setRegName(''); setRegUsername(''); setRegPassword('')
    setError('')
  }

  const closeAuth = () => {
    setShowAuth(false)
    resetForm()
    setMode('login')
  }

  const handleLogin = async () => {
    setSubmitting(true); setError('')
    const res = await login(username, password)
    setSubmitting(false)
    if (res.success) closeAuth()
    else setError(res.error || 'Connexion impossible')
  }

  const handleRegister = async () => {
    setSubmitting(true); setError('')
    const res = await register(regCode, regUsername, regPassword, regName)
    setSubmitting(false)
    if (res.success) closeAuth()
    else setError(res.error || 'Inscription impossible')
  }

  return (
    <>
      <header className="app-header" style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(10, 25, 41, 0.85)', backdropFilter: 'blur(10px)', borderBottom: '1px solid var(--line)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 24 }}>🎾</span>
            <span className="h-display" style={{ fontSize: 22, color: 'var(--white)', letterSpacing: '0.05em' }}>
              PÁDEL <span style={{ color: 'var(--neon)' }}>DOHA</span>
            </span>
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {currentUser ? (
              <>
                <span style={{ fontSize: 13, color: 'var(--gray)' }}>
                  {isSuperAdmin ? '👑' : '👤'} {currentUser.displayName}
                </span>
                {isSuperAdmin && (
                  <button className="btn btn-ghost btn-small" onClick={() => setShowManage(true)} title="Gérer les organisateurs et codes">
                    ⚙ Gérer
                  </button>
                )}
                <button className="btn btn-ghost btn-small" onClick={logout}>Déconnexion</button>
              </>
            ) : (
              <button className="btn btn-secondary btn-small" onClick={() => setShowAuth(true)}>
                🔑 Connexion
              </button>
            )}
          </div>
        </div>
      </header>

      {/* MODALE CONNEXION / INSCRIPTION */}
      {showAuth && (
        <div className="modal-backdrop" onClick={closeAuth}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
            {/* Onglets */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              <button
                onClick={() => { setMode('login'); setError('') }}
                style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: 'var(--font-display)', letterSpacing: '0.05em', fontSize: 14, background: mode === 'login' ? 'var(--neon)' : 'var(--bg-deep)', color: mode === 'login' ? 'var(--bg-deep)' : 'var(--gray)' }}
              >
                SE CONNECTER
              </button>
              <button
                onClick={() => { setMode('register'); setError('') }}
                style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: 'var(--font-display)', letterSpacing: '0.05em', fontSize: 14, background: mode === 'register' ? 'var(--neon)' : 'var(--bg-deep)', color: mode === 'register' ? 'var(--bg-deep)' : 'var(--gray)' }}
              >
                CRÉER UN COMPTE
              </button>
            </div>

            {mode === 'login' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label className="label">Identifiant</label>
                  <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleLogin()} autoFocus autoComplete="username" />
                </div>
                <div>
                  <label className="label">Mot de passe</label>
                  <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleLogin()} autoComplete="current-password" />
                </div>
                {error && <div style={{ color: 'var(--danger)', fontSize: 13, padding: '8px 12px', background: 'rgba(255,71,87,0.1)', borderRadius: 8 }}>⚠️ {error}</div>}
                <button className="btn btn-primary" onClick={handleLogin} disabled={submitting}>
                  {submitting ? '⏳...' : 'Se connecter'}
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <p style={{ color: 'var(--gray)', fontSize: 13, margin: 0 }}>
                  Entre le code d'invitation fourni par l'organisateur principal pour créer ton compte.
                </p>
                <div>
                  <label className="label">Code d'invitation</label>
                  <input className="input" value={regCode} onChange={(e) => setRegCode(e.target.value)} placeholder="ex: DOHA2026" autoFocus />
                </div>
                <div>
                  <label className="label">Ton nom (affiché)</label>
                  <input className="input" value={regName} onChange={(e) => setRegName(e.target.value)} placeholder="Marie Dupont" />
                </div>
                <div>
                  <label className="label">Identifiant de connexion</label>
                  <input className="input" value={regUsername} onChange={(e) => setRegUsername(e.target.value)} placeholder="marie" autoComplete="off" />
                </div>
                <div>
                  <label className="label">Mot de passe</label>
                  <input className="input" type="password" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleRegister()} autoComplete="off" />
                </div>
                {error && <div style={{ color: 'var(--danger)', fontSize: 13, padding: '8px 12px', background: 'rgba(255,71,87,0.1)', borderRadius: 8 }}>⚠️ {error}</div>}
                <button className="btn btn-primary" onClick={handleRegister} disabled={submitting}>
                  {submitting ? '⏳...' : '✓ Créer mon compte'}
                </button>
              </div>
            )}

            <button className="btn btn-ghost" onClick={closeAuth} style={{ width: '100%', marginTop: 16 }}>Annuler</button>
          </div>
        </div>
      )}

      {/* MODALE GESTION (super-admin) */}
      {showManage && isSuperAdmin && <ManagePanel onClose={() => setShowManage(false)} />}
    </>
  )
}

// ============================================
// PANNEAU DE GESTION (super-admin) : organisateurs + codes
// ============================================
function ManagePanel({ onClose }) {
  const [tab, setTab] = useState('organizers') // 'organizers' | 'codes' | 'settings'

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
        <h2 className="h-display" style={{ fontSize: 26, marginBottom: 16 }}>⚙ GESTION</h2>

        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          <button onClick={() => setTab('organizers')} style={{ flex: '1 1 110px', padding: '10px', borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: 'var(--font-display)', fontSize: 13, letterSpacing: '0.05em', background: tab === 'organizers' ? 'var(--neon)' : 'var(--bg-deep)', color: tab === 'organizers' ? 'var(--bg-deep)' : 'var(--gray)' }}>
            👤 ORGANISATEURS
          </button>
          <button onClick={() => setTab('codes')} style={{ flex: '1 1 110px', padding: '10px', borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: 'var(--font-display)', fontSize: 13, letterSpacing: '0.05em', background: tab === 'codes' ? 'var(--neon)' : 'var(--bg-deep)', color: tab === 'codes' ? 'var(--bg-deep)' : 'var(--gray)' }}>
            🎟 CODES
          </button>
          <button onClick={() => setTab('settings')} style={{ flex: '1 1 110px', padding: '10px', borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: 'var(--font-display)', fontSize: 13, letterSpacing: '0.05em', background: tab === 'settings' ? 'var(--neon)' : 'var(--bg-deep)', color: tab === 'settings' ? 'var(--bg-deep)' : 'var(--gray)' }}>
            ⚙ PARAMÈTRES
          </button>
        </div>

        {tab === 'organizers' && <OrganizersTab />}
        {tab === 'codes' && <CodesTab />}
        {tab === 'settings' && <SettingsTab />}

        <button className="btn btn-ghost" onClick={onClose} style={{ width: '100%', marginTop: 20 }}>Fermer</button>
      </div>
    </div>
  )
}

function OrganizersTab() {
  const [organizers, setOrganizers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])
  const load = async () => {
    const { data } = await supabase.from('organizers').select('*').order('created_at')
    if (data) setOrganizers(data)
    setLoading(false)
  }

  const deleteOrganizer = async (id, username) => {
    if (!confirm(`Supprimer l'organisateur "${username}" ? Il ne pourra plus se connecter.`)) return
    await supabase.from('organizers').delete().eq('id', id)
    load()
  }

  return (
    <div>
      <p style={{ color: 'var(--gray)', fontSize: 13, marginBottom: 16 }}>
        Les organisateurs créent leur compte eux-mêmes avec un code d'invitation. Tu peux les retirer ici.
      </p>
      {loading ? (
        <div style={{ color: 'var(--gray)', padding: 20, textAlign: 'center' }}>Chargement...</div>
      ) : organizers.length === 0 ? (
        <div style={{ color: 'var(--gray)', padding: 20, textAlign: 'center', fontSize: 14 }}>Aucun organisateur inscrit.</div>
      ) : (
        <div style={{ display: 'grid', gap: 8, maxHeight: 280, overflowY: 'auto' }}>
          {organizers.map((o) => (
            <div key={o.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg-deep)', border: '1px solid var(--line)', borderRadius: 8 }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontWeight: 600 }}>👤 {o.display_name || o.username}</div>
                <div style={{ color: 'var(--gray)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>{o.username}</div>
              </div>
              <button onClick={() => deleteOrganizer(o.id, o.username)} style={{ background: 'transparent', border: 'none', color: 'var(--danger)', fontSize: 20, cursor: 'pointer', padding: '4px 8px' }} title="Supprimer">🗑</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function CodesTab() {
  const [codes, setCodes] = useState([])
  const [loading, setLoading] = useState(true)
  const [newCode, setNewCode] = useState('')
  const [newLabel, setNewLabel] = useState('')
  const [error, setError] = useState('')

  useEffect(() => { load() }, [])
  const load = async () => {
    const { data } = await supabase.from('invite_codes').select('*').order('created_at')
    if (data) setCodes(data)
    setLoading(false)
  }

  const addCode = async () => {
    setError('')
    const c = newCode.trim()
    if (!c) { setError('Entre un code'); return }
    if (codes.some((x) => x.code.toLowerCase() === c.toLowerCase())) {
      setError('Ce code existe déjà'); return
    }
    const { error: insErr } = await supabase.from('invite_codes').insert({ code: c, label: newLabel.trim() || null })
    if (insErr) { setError('Erreur : ' + insErr.message); return }
    setNewCode(''); setNewLabel(''); load()
  }

  const deleteCode = async (id, code) => {
    if (!confirm(`Supprimer le code "${code}" ? Les nouvelles inscriptions avec ce code seront refusées.`)) return
    await supabase.from('invite_codes').delete().eq('id', id)
    load()
  }

  return (
    <div>
      <p style={{ color: 'var(--gray)', fontSize: 13, marginBottom: 16 }}>
        Communique un de ces codes aux personnes que tu veux autoriser à créer un compte organisateur.
      </p>

      <div style={{ background: 'var(--bg-deep)', border: '1px solid var(--line)', borderRadius: 10, padding: 16, marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
          <div>
            <label className="label">Nouveau code</label>
            <input className="input" value={newCode} onChange={(e) => setNewCode(e.target.value)} placeholder="ex: PADEL2026" />
          </div>
          <div>
            <label className="label">Note (optionnel)</label>
            <input className="input" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="ex: Tournoi de mai" />
          </div>
        </div>
        {error && <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 10 }}>⚠️ {error}</div>}
        <button className="btn btn-primary" onClick={addCode} style={{ width: '100%' }}>➕ Créer le code</button>
      </div>

      {loading ? (
        <div style={{ color: 'var(--gray)', padding: 20, textAlign: 'center' }}>Chargement...</div>
      ) : codes.length === 0 ? (
        <div style={{ color: 'var(--gray)', padding: 20, textAlign: 'center', fontSize: 14 }}>Aucun code. Crée-en un pour autoriser les inscriptions.</div>
      ) : (
        <div style={{ display: 'grid', gap: 8, maxHeight: 200, overflowY: 'auto' }}>
          {codes.map((c) => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg-deep)', border: '1px solid var(--line)', borderRadius: 8 }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--neon)', fontSize: 16 }}>{c.code}</div>
                {c.label && <div style={{ color: 'var(--gray)', fontSize: 12 }}>{c.label}</div>}
              </div>
              <button onClick={() => deleteCode(c.id, c.code)} style={{ background: 'transparent', border: 'none', color: 'var(--danger)', fontSize: 20, cursor: 'pointer', padding: '4px 8px' }} title="Supprimer">🗑</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================
// ONGLET PARAMETRES (nom de l'organisation)
// ============================================
function SettingsTab() {
  const { orgName, updateOrgName, ready } = useAppSettings()
  const [name, setName] = useState('')
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (ready) setName(orgName)
  }, [ready, orgName])

  const save = async () => {
    setSaving(true)
    setError('')
    const res = await updateOrgName(name)
    setSaving(false)
    if (res.success) {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } else {
      setError(res.error || 'Erreur')
    }
  }

  return (
    <div>
      <p style={{ color: 'var(--gray)', fontSize: 13, marginBottom: 16 }}>
        Ce nom apparaît sur la page d'accueil ("Organisé par ...") et le règlement.
      </p>
      <div style={{ background: 'var(--bg-deep)', border: '1px solid var(--line)', borderRadius: 10, padding: 16 }}>
        <label className="label">Nom de l'organisation</label>
        <input
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="ex: Doha Accueil"
          onKeyDown={(e) => e.key === 'Enter' && save()}
        />
        {error && <div style={{ color: 'var(--danger)', fontSize: 13, marginTop: 10 }}>⚠️ {error}</div>}
        {saved && <div style={{ color: 'var(--success)', fontSize: 13, marginTop: 10 }}>✓ Enregistré ! (rafraîchis la page pour voir le changement partout)</div>}
        <button className="btn btn-primary" onClick={save} disabled={saving || !ready} style={{ width: '100%', marginTop: 14 }}>
          {saving ? '⏳...' : '✓ Enregistrer'}
        </button>
      </div>
    </div>
  )
}
