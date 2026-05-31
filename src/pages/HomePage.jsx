import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { useAppSettings } from '../lib/useAppSettings'
import LogoBanner from '../components/LogoBanner'

export default function HomePage() {
  const navigate = useNavigate()
  const { isAdmin, currentUser } = useAuth()
  const { orgName } = useAppSettings()
  const [recentTournaments, setRecentTournaments] = useState([])
  const [creating, setCreating] = useState(false)
  const [showTypeModal, setShowTypeModal] = useState(false)

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

  const handleNewTournamentClick = () => {
    if (!isAdmin) {
      alert('Connecte-toi en admin pour créer un tournoi')
      return
    }
    setShowTypeModal(true)
  }

  const createTournament = async (type) => {
    setCreating(true)
    setShowTypeModal(false)
    const today = new Date()
    const dateStr = today.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })

    let typeLabel = 'Pádel'
    if (type === 'knockout') typeLabel = 'Knockout'
    if (type === 'corporate') typeLabel = 'Inter-entreprises'

    const baseData = {
      name: `${typeLabel} du ${dateStr}`,
      tournament_date: today.toISOString().split('T')[0],
      status: 'setup',
      tournament_type: type,
      created_by: currentUser?.username || 'admin',
    }
    if (type === 'knockout') baseData.knockout_phase = 'pools'
    if (type === 'corporate') {
      baseData.num_companies = 4
      baseData.teams_per_company = 8
      baseData.company_names = ['Entreprise A', 'Entreprise B', 'Entreprise C', 'Entreprise D']
      baseData.match_duration_minutes = 40
    }

    const { data, error } = await supabase.from('tournaments').insert(baseData).select().single()

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

  const typeBadge = (type) => {
    if (type === 'knockout') return { label: '🏆 Knockout', color: 'var(--coral)', bg: 'rgba(255, 107, 74, 0.15)' }
    if (type === 'corporate') return { label: '🏢 Inter-entreprises', color: 'var(--sand-warm)', bg: 'rgba(201, 169, 110, 0.15)' }
    return { label: '🎯 Au temps', color: 'var(--neon)', bg: 'rgba(212, 255, 58, 0.15)' }
  }

  return (
    <main className="container">
      {/* BANDEAU DES LOGOS (Doha Accueil + entreprises) */}
      <div style={{ marginBottom: 32 }}>
        <LogoBanner />
      </div>

      {/* HERO */}
      <section style={{ position: 'relative', padding: '20px 0 60px', textAlign: 'center' }}>
        <div style={{ position: 'absolute', top: 0, right: '5%', width: 80, height: 80, borderRadius: '50%', background: 'var(--neon)', opacity: 0.15, filter: 'blur(20px)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '10%', left: '8%', width: 120, height: 120, borderRadius: '50%', background: 'var(--sand-warm)', opacity: 0.1, filter: 'blur(30px)', pointerEvents: 'none' }} />

        <div style={{ display: 'inline-block', fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '0.3em', color: 'var(--sand-warm)', marginBottom: 24, padding: '6px 16px', border: '1px solid var(--line)', borderRadius: 999 }}>
          🌴 QATAR · {new Date().getFullYear()}
        </div>

        <h1 className="h-display" style={{ fontSize: 'clamp(40px, 8vw, 80px)', marginBottom: 20, lineHeight: 0.95 }}>
          BIENVENUE AU
          <br />
          <span style={{ color: 'var(--neon)' }}>TOURNOI DE PÁDEL</span>
        </h1>

        <p style={{ color: 'var(--sand)', fontSize: 20, maxWidth: 560, margin: '0 auto 40px', fontWeight: 300, letterSpacing: '0.02em' }}>
          Organisé par <strong style={{ color: 'var(--white)' }}>{orgName}</strong>
        </p>

        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={handleNewTournamentClick} disabled={creating} style={{ fontSize: 22, padding: '18px 36px' }}>
            {creating ? '⏳ Création...' : '🎾 Nouveau tournoi'}
          </button>
          <Link to="/history" className="btn btn-secondary" style={{ fontSize: 18 }}>📅 Historique</Link>
          {isAdmin && <Link to="/players" className="btn btn-secondary" style={{ fontSize: 18 }}>👥 Joueurs</Link>}
          <Link to="/rules" className="btn btn-secondary" style={{ fontSize: 18 }}>📄 Règlement</Link>
        </div>

        {!isAdmin && <p style={{ marginTop: 20, color: 'var(--gray)', fontSize: 14 }}>🔒 Connecte-toi en admin pour créer un tournoi</p>}
      </section>

      {/* TOURNOIS RÉCENTS */}
      {recentTournaments.length > 0 && (
        <section style={{ marginTop: 20 }}>
          <h2 className="h-display" style={{ fontSize: 28, marginBottom: 20, color: 'var(--sand)' }}>DERNIERS TOURNOIS</h2>
          <div style={{ display: 'grid', gap: 12 }}>
            {recentTournaments.map((t) => {
              const s = formatStatus(t.status)
              const tb = typeBadge(t.tournament_type)
              return (
                <Link key={t.id} to={`/tournament/${t.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', transition: 'all 0.2s ease' }} onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--neon)')} onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--line)')}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                        <div className="h-display" style={{ fontSize: 20 }}>{t.name}</div>
                        <span className="badge" style={{ background: tb.bg, color: tb.color }}>{tb.label}</span>
                      </div>
                      <div style={{ color: 'var(--gray)', fontSize: 13 }}>
                        {new Date(t.tournament_date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
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

      {/* MODALE CHOIX DU TYPE */}
      {showTypeModal && (
        <div className="modal-backdrop" onClick={() => setShowTypeModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
            <h2 className="h-display" style={{ fontSize: 32, marginBottom: 8 }}>TYPE DE TOURNOI</h2>
            <p style={{ color: 'var(--gray)', marginBottom: 24, fontSize: 14 }}>Choisis le format de ton tournoi</p>

            <div style={{ display: 'grid', gap: 12 }}>
              {/* Au temps */}
              <button onClick={() => createTournament('points')} style={{ textAlign: 'left', padding: 18, background: 'var(--bg-deep)', border: '2px solid var(--neon)', borderRadius: 12, cursor: 'pointer', transition: 'all 0.2s ease' }} onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(212, 255, 58, 0.08)')} onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--bg-deep)')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                  <span style={{ fontSize: 28 }}>🎯</span>
                  <span className="h-display" style={{ fontSize: 20, color: 'var(--neon)' }}>TOURNOI AU TEMPS</span>
                </div>
                <p style={{ color: 'var(--sand)', fontSize: 12, lineHeight: 1.5, margin: 0 }}>
                  Round-robin équilibré · Classement par points · Tout le monde joue autant · Convivial
                </p>
              </button>

              {/* Knockout */}
              <button onClick={() => createTournament('knockout')} style={{ textAlign: 'left', padding: 18, background: 'var(--bg-deep)', border: '2px solid var(--coral)', borderRadius: 12, cursor: 'pointer', transition: 'all 0.2s ease' }} onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 107, 74, 0.08)')} onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--bg-deep)')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                  <span style={{ fontSize: 28 }}>🏆</span>
                  <span className="h-display" style={{ fontSize: 20, color: 'var(--coral)' }}>TOURNOI KNOCKOUT</span>
                </div>
                <p style={{ color: 'var(--sand)', fontSize: 12, lineHeight: 1.5, margin: 0 }}>
                  Poules au temps · Demi-finales croisées + finale · Tableau consolante · Désigne un champion 🥇
                </p>
              </button>

              {/* Inter-entreprises */}
              <button onClick={() => createTournament('corporate')} style={{ textAlign: 'left', padding: 18, background: 'var(--bg-deep)', border: '2px solid var(--sand-warm)', borderRadius: 12, cursor: 'pointer', transition: 'all 0.2s ease' }} onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(201, 169, 110, 0.08)')} onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--bg-deep)')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                  <span style={{ fontSize: 28 }}>🏢</span>
                  <span className="h-display" style={{ fontSize: 20, color: 'var(--sand-warm)' }}>INTER-ENTREPRISES</span>
                </div>
                <p style={{ color: 'var(--sand)', fontSize: 12, lineHeight: 1.5, margin: 0 }}>
                  2 à 6 entreprises · Équipes par niveau · Les mêmes niveaux s'affrontent · Classement par entreprise
                </p>
              </button>
            </div>

            <button className="btn btn-ghost" onClick={() => setShowTypeModal(false)} style={{ width: '100%', marginTop: 16 }}>Annuler</button>
          </div>
        </div>
      )}
    </main>
  )
}
