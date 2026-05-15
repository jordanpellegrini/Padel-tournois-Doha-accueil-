import { Link } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../lib/auth'

export default function Header() {
  const { isAdmin, login, logout } = useAuth()
  const [showLogin, setShowLogin] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleLogin = () => {
    if (login(username, password)) {
      setShowLogin(false)
      setUsername('')
      setPassword('')
      setError('')
    } else {
      setError('Identifiants incorrects')
    }
  }

  return (
    <>
      <header className="app-header">
        <Link to="/" className="app-header__brand">
          <svg className="app-header__logo" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="#d4ff3a" />
            <circle cx="50" cy="50" r="38" fill="none" stroke="#0a1929" strokeWidth="2.5" />
            <path d="M 20 30 Q 50 50 80 30" stroke="#0a1929" strokeWidth="2.5" fill="none" />
            <path d="M 20 70 Q 50 50 80 70" stroke="#0a1929" strokeWidth="2.5" fill="none" />
          </svg>
          <div className="app-header__title">
            PÁDEL <span>DOHA</span>
          </div>
        </Link>

        <div className="app-header__user">
          {isAdmin ? (
            <>
              <span className="badge">ADMIN</span>
              <button className="btn btn-ghost btn-small" onClick={logout}>
                Déconnexion
              </button>
            </>
          ) : (
            <button className="btn btn-ghost btn-small" onClick={() => setShowLogin(true)}>
              🔒 Admin
            </button>
          )}
        </div>
      </header>

      {showLogin && (
        <div className="modal-backdrop" onClick={() => setShowLogin(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="h-display" style={{ fontSize: 32, marginBottom: 24 }}>
              CONNEXION ADMIN
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label className="label">Utilisateur</label>
                <input
                  className="input"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Admin"
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
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
                />
              </div>
              {error && (
                <div style={{ color: 'var(--danger)', fontSize: 14 }}>{error}</div>
              )}
              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button className="btn btn-primary" onClick={handleLogin} style={{ flex: 1 }}>
                  Se connecter
                </button>
                <button className="btn btn-ghost" onClick={() => setShowLogin(false)}>
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
