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
      {/* Hero */}
      <section style={{ position: 'relative', padding: '40px 0 80px', textAlign: 'center' }}>
        {/* Décoration : balle qui bounce */}
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
            fontSize: 'clamp(48px, 9vw, 96px)',
            marginBottom: 16,
            lineHeight: 0.9,
          }}
        >
          BIENVENUE AU
          <br />
          <span style={{ color: 'var(--neon)' }}>TOURNOI DE PÁDEL</span>
          <br />
          DE DOHA
        </h1>

        <p
          style={{
            color: 'var(--gray)',
            fontSize: 18,
            maxWidth: 520,
            margin: '0 auto 40px',
          }}
        >
          Inscris les équipes, lance le tirage, gère les matchs et les terrains —
          tout en un seul endroit.
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
        </div>

        {!isAdmin && (
          <p style={{ marginTop: 20, color: 'var(--gray)', fontSize: 14 }}>
            🔒 Connecte-toi en admin pour créer un tournoi
          </p>
        )}
      </section>

      {/* Tournois récents */}
      {recentTournaments.length > 0 && (
        <section style={{ marginTop: 40 }}>
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
                      <div
                        className="h-display"
                        style={{ fontSize: 20, marginBottom: 4 }}
                      >
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
