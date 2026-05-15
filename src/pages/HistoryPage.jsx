import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function HistoryPage() {
  const [tournaments, setTournaments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    const { data } = await supabase
      .from('tournaments')
      .select('*')
      .order('tournament_date', { ascending: false })
    if (data) setTournaments(data)
    setLoading(false)
  }

  return (
    <main className="container">
      <Link to="/" style={{ color: 'var(--gray)', textDecoration: 'none', fontSize: 14 }}>
        ← Accueil
      </Link>
      <h1 className="h-display" style={{ fontSize: 'clamp(36px, 6vw, 56px)', marginTop: 8, marginBottom: 32 }}>
        HISTORIQUE
      </h1>

      {loading ? (
        <div style={{ color: 'var(--gray)' }}>Chargement...</div>
      ) : tournaments.length === 0 ? (
        <div style={{ color: 'var(--gray)', textAlign: 'center', padding: 60 }}>
          Aucun tournoi enregistré.
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {tournaments.map((t) => (
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
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--neon)')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--line)')}
              >
                <div>
                  <div className="h-display" style={{ fontSize: 22, marginBottom: 4 }}>
                    {t.name}
                  </div>
                  <div style={{ color: 'var(--gray)', fontSize: 13 }}>
                    {new Date(t.tournament_date).toLocaleDateString('fr-FR', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </div>
                </div>
                <span
                  className={`badge ${
                    t.status === 'setup'
                      ? 'badge-warm'
                      : t.status === 'finished'
                      ? 'badge-coral'
                      : ''
                  }`}
                >
                  {t.status === 'setup' ? 'Config' : t.status === 'running' ? 'En cours' : 'Terminé'}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  )
}
