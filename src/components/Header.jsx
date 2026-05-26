import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth'

export default function Header() {
  const { currentUser, isSuperAdmin, login, logout } = useAuth()
  const [showLogin, setShowLogin] = useState(false)
  const [showManage, setShowManage] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleLogin = async () => {
    setSubmitting(true)
    setError('')
    const res = await login(username, password)
    setSubmitting(false)
    if (res.success) {
      setShowLogin(false)
      setUsername('')
      setPassword('')
    } else {
      setError(res.error || 'Connexion impossible')
    }
  }

  return (
    <>
      <header
        className="app-header"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          background: 'rgba(10, 25, 41, 0.85)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid var(--line)',
        }}
      >
        <div
          style={{
            maxWidth: 1100,
            margin: '0 auto',
            padding: '12px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
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
                  <button className="btn btn-ghost btn-small" onClick={() => setShowManage(true)} title="Gérer les organisateurs">
                    ⚙ Organisateurs
                  </button>
                )}
                <button className="btn btn-ghost btn-small" onClick={logout}>
                  Déconnexion
                </button>
              </>
            ) : (
              <button className="btn btn-secondary btn-small" onClick={() => setShowLogin(true)}>
                🔑 Connexion
              </button>
            )}
          </div>
        </div>
      </header>

      {/* MODALE DE CONNEXION */}
      {showLogin && (
        <div className="modal-backdrop" onClick={() => setShowLogin(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <h2 className="h-display" style={{ fontSize: 28, marginBottom: 8 }}>CONNEXION</h2>
            <p style={{ color: 'var(--gray)', marginBottom: 20, fontSize: 14 }}>
              Espace organisateur
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="label">Identifiant</label>
                <input
                  className="input"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  autoFocus
                  autoComplete="username"
                />
              </div>
              <div>
                <label className="label">Mot de passe</label>
                <input
                  className="input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  autoComplete="current-password"
                />
              </div>

              {error && (
                <div style={{ color: 'var(--danger)', fontSize: 13, padding: '8px 12px', background: 'rgba(255,71,87,0.1)', borderRadius: 8 }}>
                  ⚠️ {error}
                </div>
              )}

              <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                <button className="btn btn-primary" onClick={handleLogin} disabled={submitting} style={{ flex: 1 }}>
                  {submitting ? '⏳...' : 'Se connecter'}
                </button>
                <button className="btn btn-ghost" onClick={() => setShowLogin(false)}>Annuler</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODALE GESTION DES ORGANISATEURS (super-admin uniquement) */}
      {showManage && isSuperAdmin && (
        <ManageOrganizers onClose={() => setShowManage(false)} />
      )}
    </>
  )
}

// ============================================
// GESTION DES ORGANISATEURS (super-admin)
// ============================================
import { useEffect } from 'react'
import { supabase } from '../lib/supabase'

function ManageOrganizers({ onClose }) {
  const [organizers, setOrganizers] = useState([])
  const [loading, setLoading] = useState(true)
  const [newUsername, setNewUsername] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newDisplayName, setNewDisplayName] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    const { data } = await supabase.from('organizers').select('*').order('created_at')
    if (data) setOrganizers(data)
    setLoading(false)
  }

  const addOrganizer = async () => {
    setError('')
    const u = newUsername.trim()
    const p = newPassword.trim()
    if (!u || !p) {
      setError('Identifiant et mot de passe obligatoires')
      return
    }
    // Vérifie l'unicité
    const exists = organizers.some((o) => o.username.toLowerCase() === u.toLowerCase())
    if (exists) {
      setError('Cet identifiant existe déjà')
      return
    }
    const { error: insErr } = await supabase.from('organizers').insert({
      username: u,
      password: p,
      display_name: newDisplayName.trim() || u,
    })
    if (insErr) {
      setError('Erreur : ' + insErr.message)
      return
    }
    setNewUsername('')
    setNewPassword('')
    setNewDisplayName('')
    load()
  }

  const deleteOrganizer = async (id, username) => {
    if (!confirm(`Supprimer l'organisateur "${username}" ? Il ne pourra plus se connecter.`)) return
    await supabase.from('organizers').delete().eq('id', id)
    load()
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
        <h2 className="h-display" style={{ fontSize: 28, marginBottom: 8 }}>
          ⚙ GÉRER LES ORGANISATEURS
        </h2>
        <p style={{ color: 'var(--gray)', marginBottom: 20, fontSize: 14 }}>
          Crée des comptes pour que d'autres personnes gèrent leurs propres tournois.
        </p>

        {/* Formulaire d'ajout */}
        <div style={{ background: 'var(--bg-deep)', border: '1px solid var(--line)', borderRadius: 10, padding: 16, marginBottom: 20 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, color: 'var(--neon)', marginBottom: 12, letterSpacing: '0.05em' }}>
            ➕ NOUVEL ORGANISATEUR
          </div>
          <div style={{ display: 'grid', gap: 10 }}>
            <div>
              <label className="label">Nom affiché (ex: Marie)</label>
              <input className="input" value={newDisplayName} onChange={(e) => setNewDisplayName(e.target.value)} placeholder="Marie Dupont" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label className="label">Identifiant</label>
                <input className="input" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} placeholder="marie" autoComplete="off" />
              </div>
              <div>
                <label className="label">Mot de passe</label>
                <input className="input" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••" autoComplete="off" />
              </div>
            </div>
            {error && (
              <div style={{ color: 'var(--danger)', fontSize: 13 }}>⚠️ {error}</div>
            )}
            <button className="btn btn-primary" onClick={addOrganizer}>➕ Ajouter</button>
          </div>
        </div>

        {/* Liste des organisateurs */}
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, color: 'var(--sand)', marginBottom: 12, letterSpacing: '0.05em' }}>
          ORGANISATEURS ({organizers.length})
        </div>
        {loading ? (
          <div style={{ color: 'var(--gray)', padding: 20, textAlign: 'center' }}>Chargement...</div>
        ) : organizers.length === 0 ? (
          <div style={{ color: 'var(--gray)', padding: 20, textAlign: 'center', fontSize: 14 }}>
            Aucun organisateur pour le moment.
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 8, maxHeight: 240, overflowY: 'auto' }}>
            {organizers.map((o) => (
              <div key={o.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg-deep)', border: '1px solid var(--line)', borderRadius: 8 }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>👤 {o.display_name || o.username}</div>
                  <div style={{ color: 'var(--gray)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>
                    {o.username} · mdp : {o.password}
                  </div>
                </div>
                <button onClick={() => deleteOrganizer(o.id, o.username)} style={{ background: 'transparent', border: 'none', color: 'var(--danger)', fontSize: 20, cursor: 'pointer', padding: '4px 8px' }} title="Supprimer">
                  🗑
                </button>
              </div>
            ))}
          </div>
        )}

        <button className="btn btn-ghost" onClick={onClose} style={{ width: '100%', marginTop: 20 }}>Fermer</button>
      </div>
    </div>
  )
}
