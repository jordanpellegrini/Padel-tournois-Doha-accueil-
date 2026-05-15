import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'

export default function HomePage() {
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const [recentTournaments, setRecentTournaments] = useState([])
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    loadRecent()
  }, [])

  const loadRecent = async () => {
    const { data, error } = await supabase
      .from('tournaments')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5)
    if (!error && data) setRecentTournaments(data)
  }

  const handleNewTournament = async () => {
    if (!isAdmin) {
      alert('Connecte-toi en admin pour créer un tournoi')
      return
    }
    setCreating(true)
    const today = new Date()
    const dateStr = today.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })
    const { data, error } = await supabase
      .from('tournaments')
      .insert({
        name: `Pádel du ${dateStr}`,
        tournament_date: today.toISOString().split('T')[0],
        status: 'setup',
      })
      .select()
      .single()

    setCreating(false)
    if (error) {
      alert('Erreur création tournoi : ' + error.message)
      return
    }
    navigate(`/tournament/${data.id}`)
  }

  const formatStatus = (status) => {
    if (status === 'setup') return { label: 'Configuration', cls: 'badge-warm' }
    if (status === 'running') return { label: 'En cours', cls: '' }
    return { label: 'Terminé', cls: 'badge-coral' }
  }

  return (
    <main className="container">
      {/* BANDEAU DOHA ACCUEIL */}
      <div
        style={{
          background: 'var(--white)',
          borderRadius: 12,
          padding: '20px 24px',
          marginBottom: 32,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 24,
          boxShadow: '0 4px 30px rgba(0,0,0,0.2)',
        }}
      >
        <svg
          viewBox="0 0 400 140"
          style={{ width: '100%', maxWidth: 460, height: 'auto' }}
          xmlns="http://www.w3.org/2000/svg"
        >
          <g stroke="#1d6fcb" strokeWidth="1.2" fill="none" strokeLinecap="round">
            <path d="M 30 55 L 30 12 L 105 50 Z" strokeWidth="1.5" />
            <line x1="35" y1="20" x2="80" y2="40" strokeWidth="0.6" opacity="0.6" />
            <line x1="40" y1="28" x2="85" y2="45" strokeWidth="0.6" opacity="0.6" />
            <line x1="45" y1="36" x2="90" y2="48" strokeWidth="0.6" opacity="0.6" />
            <line x1="30" y1="12" x2="30" y2="62" strokeWidth="1.2" />
            <path d="M 5 62 Q 50 78 110 62 L 100 70 Q 50 82 15 70 Z" fill="#1d6fcb" stroke="none" />
            <path d="M 0 62 Q 50 80 115 62" strokeWidth="1.2" />
            <line x1="20" y1="78" x2="40" y2="78" strokeWidth="0.6" opacity="0.5" />
            <line x1="55" y1="80" x2="80" y2="80" strokeWidth="0.6" opacity="0.5" />
            <line x1="90" y1="78" x2="105" y2="78" strokeWidth="0.6" opacity="0.5" />
          </g>

          <g stroke="#1d6fcb" strokeWidth="1.2" fill="none" strokeLinejoin="round">
            <path d="M 155 65 L 152 35 Q 155 28 158 35 L 158 22 Q 161 18 164 22 L 164 35 Q 167 28 170 35 L 167 65 Z" />
            <rect x="178" y="30" width="14" height="35" />
            <line x1="178" y1="38" x2="192" y2="38" strokeWidth="0.5" />
            <line x1="178" y1="46" x2="192" y2="46" strokeWidth="0.5" />
            <line x1="178" y1="54" x2="192" y2="54" strokeWidth="0.5" />
            <path d="M 200 65 L 202 25 L 207 15 L 212 25 L 214 65 Z" />
            <line x1="200" y1="35" x2="214" y2="35" strokeWidth="0.5" />
            <line x1="200" y1="45" x2="214" y2="45" strokeWidth="0.5" />
            <line x1="200" y1="55" x2="214" y2="55" strokeWidth="0.5" />
            <rect x="222" y="20" width="18" height="45" />
            <line x1="222" y1="28" x2="240" y2="28" strokeWidth="0.5" />
            <line x1="222" y1="36" x2="240" y2="36" strokeWidth="0.5" />
            <line x1="222" y1="44" x2="240" y2="44" strokeWidth="0.5" />
            <line x1="222" y1="52" x2="240" y2="52" strokeWidth="0.5" />
            <line x1="228" y1="20" x2="228" y2="65" strokeWidth="0.5" />
            <line x1="234" y1="20" x2="234" y2="65" strokeWidth="0.5" />
            <ellipse cx="255" cy="40" rx="9" ry="22" />
            <line x1="246" y1="40" x2="264" y2="40" strokeWidth="0.5" />
            <line x1="248" y1="30" x2="262" y2="30" strokeWidth="0.5" />
            <line x1="248" y1="50" x2="262" y2="50" strokeWidth="0.5" />
            <line x1="255" y1="62" x2="255" y2="65" />
            <path d="M 272 65 L 274 10 L 278 10 L 280 65 Z" />
            <path d="M 290 65 L 290 30 L 300 18 L 310 30 L 310 65 Z" />
            <line x1="290" y1="30" x2="310" y2="30" strokeWidth="0.5" />
            <line x1="295" y1="40" x2="305" y2="40" strokeWidth="0.5" />
            <line x1="295" y1="50" x2="305" y2="50" strokeWidth="0.5" />
            <rect x="320" y="40" width="10" height="25" />
            <rect x="335" y="35" width="12" height="30" />
            <line x1="335" y1="45" x2="347" y2="45" strokeWidth="0.5" />
            <line x1="335" y1="55" x2="347" y2="55" strokeWidth="0.5" />
            <path d="M 355 65 L 357 30 L 363 22 L 369 30 L 371 65 Z" />
            <rect x="378" y="42" width="8" height="23" />
            <line x1="145" y1="65" x2="395" y2="65" strokeWidth="1.5" />
          </g>

          <text
            x="20"
            y="115"
            fontFamily="'Bebas Neue', Impact, sans-serif"
            fontSize="32"
            fontWeight="700"
            fill="#f4b400"
            letterSpacing="2"
          >
            DOHA
          </text>
          <text
            x="115"
            y="115"
            fontFamily="'Bebas Neue', Impact, sans-serif"
            fontSize="32"
            fontWeight="400"
            fill="#1d6fcb"
            letterSpacing="2"
          >
            ACCUEIL
          </text>
        </svg>
      </div>

      {/* HERO */}
      <section style={{ position: 'relative', padding: '20px 0 60px', textAlign: 'center' }}>
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: '5%',
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: 'var(--neon)',
            opacity: 0.15,
            filter: 'blur(20px)',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '10%',
            left: '8%',
            width: 120,
            height: 120,
            borderRadius: '50%',
            background: 'var(--sand-warm)',
            opacity: 0.1,
            filter: 'blur(30px)',
            pointerEvents: 'none',
          }}
        />

        <div
          style={{
            display: 'inline-block',
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            letterSpacing: '0.3em',
            color: 'var(--sand-warm)',
            marginBottom: 24,
            padding: '6px 16px',
            border: '1px solid var(--line)',
            borderRadius: 999,
          }}
        >
          🌴 QATAR · {new Date().getFullYear()}
        </div>

        <h1
          className="h-display"
          style={{
            fontSize: 'clamp(40px, 8vw, 80px)',
            marginBottom: 20,
            lineHeight: 0.95,
          }}
        >
          BIENVENUE AU
          <br />
          <span style={{ color: 'var(--neon)' }}>TOURNOI DE PÁDEL</span>
        </h1>

        <p
          style={{
            color: 'var(--sand)',
            fontSize: 20,
            maxWidth: 560,
            margin: '0 auto 40px',
            fontWeight: 300,
            letterSpacing: '0.02em',
          }}
        >
          Organisé par <strong style={{ color: 'var(--white)' }}>Doha Accueil</strong>
        </p>

        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            className="btn btn-primary"
            onClick={handleNewTournament}
            disabled={creating}
            style={{ fontSize: 22, padding: '18px 36px' }}
          >
            {creating ? '⏳ Création...' : '🎾 Nouveau tournoi'}
          </button>
          <Link to="/history" className="btn btn-secondary" style={{ fontSize: 18 }}>
            📅 Historique
          </Link>
          {/* NOUVEAU : Bouton Règlement (ouvre le PDF dans un nouvel onglet) */}
          <a
            href="/Reglement-Tournoi-Padel-Doha.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary"
            style={{ fontSize: 18, textDecoration: 'none' }}
          >
            📄 Règlement
          </a>
        </div>

        {!isAdmin && (
          <p style={{ marginTop: 20, color: 'var(--gray)', fontSize: 14 }}>
            🔒 Connecte-toi en admin pour créer un tournoi
          </p>
        )}
      </section>

      {/* TOURNOIS RÉCENTS */}
      {recentTournaments.length > 0 && (
        <section style={{ marginTop: 20 }}>
          <h2 className="h-display" style={{ fontSize: 28, marginBottom: 20, color: 'var(--sand)' }}>
            DERNIERS TOURNOIS
          </h2>
          <div style={{ display: 'grid', gap: 12 }}>
            {recentTournaments.map((t) => {
              const s = formatStatus(t.status)
              return (
                <Link
                  key={t.id}
                  to={`/tournament/${t.id}`}
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  <div
                    className="card"
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.borderColor = 'var(--neon)')
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.borderColor = 'var(--line)')
                    }
                  >
                    <div>
                      <div className="h-display" style={{ fontSize: 20, marginBottom: 4 }}>
                        {t.name}
                      </div>
                      <div style={{ color: 'var(--gray)', fontSize: 13 }}>
                        {new Date(t.tournament_date).toLocaleDateString('fr-FR', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long',
                        })}
                      </div>
                    </div>
                    <span className={`badge ${s.cls}`}>{s.label}</span>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      )}
    </main>
  )
}
