import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { computeNumRounds } from '../lib/tournamentLogic'

export default function RulesPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [tournament, setTournament] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTournament()
  }, [id])

  const loadTournament = async () => {
    if (!id) {
      // Pas d'ID fourni → on prend le tournoi le plus récent
      const { data } = await supabase
        .from('tournaments')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      if (data) setTournament(data)
    } else {
      const { data } = await supabase.from('tournaments').select('*').eq('id', id).single()
      if (data) setTournament(data)
    }
    setLoading(false)
  }

  const handlePrint = () => {
    window.print()
  }

  if (loading) {
    return (
      <main className="container">
        <div style={{ textAlign: 'center', padding: 80, color: 'var(--gray)' }}>Chargement...</div>
      </main>
    )
  }

  // Valeurs par défaut si aucun tournoi
  const matchDuration = tournament?.match_duration_minutes ?? 20
  const breakDuration = tournament?.break_duration_minutes ?? 5
  const totalDuration = tournament?.total_duration_minutes ?? 240
  const numCourts = tournament?.num_courts ?? 4
  const numRounds = computeNumRounds(totalDuration, matchDuration, breakDuration)

  // Calcul moment des avertissements
  // - Sifflet à 5 min de la fin du match (ou matchDuration/4 si match court)
  const matchWarningMin = Math.min(5, Math.max(1, Math.floor(matchDuration / 4)))
  // - Sifflet à 2 min de la fin de la pause (ou breakDuration/2 si pause courte)
  const breakWarningMin = Math.min(2, Math.max(1, Math.floor(breakDuration / 2)))

  return (
    <>
      {/* Styles d'impression */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm;
          }
          body, html {
            background: #0a1929 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
          .rules-page {
            padding: 0 !important;
            max-width: 100% !important;
          }
          .app-header {
            display: none !important;
          }
        }
        .rules-page {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
      `}</style>

      <main className="container rules-page">
        {/* Boutons de navigation - non imprimés */}
        <div
          className="no-print"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 20,
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <Link
            to={id ? `/tournament/${id}` : '/'}
            style={{ color: 'var(--gray)', textDecoration: 'none', fontSize: 14 }}
          >
            ← Retour
          </Link>
          <button className="btn btn-primary" onClick={handlePrint}>
            🖨️ Imprimer / PDF
          </button>
        </div>

        {/* ============================================
            CONTENU DU RÈGLEMENT (imprimé)
            ============================================ */}

        {/* Bandeau Doha Accueil */}
        <div
          style={{
            background: 'var(--white)',
            borderRadius: 12,
            padding: '16px 20px',
            marginBottom: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg viewBox="0 0 400 140" style={{ width: '100%', maxWidth: 380, height: 'auto' }}>
            <g stroke="#1d6fcb" strokeWidth="1.2" fill="none" strokeLinecap="round">
              <path d="M 30 55 L 30 12 L 105 50 Z" strokeWidth="1.5" />
              <line x1="35" y1="20" x2="80" y2="40" strokeWidth="0.6" opacity="0.6" />
              <line x1="40" y1="28" x2="85" y2="45" strokeWidth="0.6" opacity="0.6" />
              <line x1="45" y1="36" x2="90" y2="48" strokeWidth="0.6" opacity="0.6" />
              <line x1="30" y1="12" x2="30" y2="62" strokeWidth="1.2" />
              <path d="M 5 62 Q 50 78 110 62 L 100 70 Q 50 82 15 70 Z" fill="#1d6fcb" stroke="none" />
              <path d="M 0 62 Q 50 80 115 62" strokeWidth="1.2" />
            </g>
            <g stroke="#1d6fcb" strokeWidth="1.2" fill="none" strokeLinejoin="round">
              <path d="M 155 65 L 152 35 Q 155 28 158 35 L 158 22 Q 161 18 164 22 L 164 35 Q 167 28 170 35 L 167 65 Z" />
              <rect x="178" y="30" width="14" height="35" />
              <path d="M 200 65 L 202 25 L 207 15 L 212 25 L 214 65 Z" />
              <rect x="222" y="20" width="18" height="45" />
              <ellipse cx="255" cy="40" rx="9" ry="22" />
              <path d="M 272 65 L 274 10 L 278 10 L 280 65 Z" />
              <path d="M 290 65 L 290 30 L 300 18 L 310 30 L 310 65 Z" />
              <rect x="320" y="40" width="10" height="25" />
              <rect x="335" y="35" width="12" height="30" />
              <path d="M 355 65 L 357 30 L 363 22 L 369 30 L 371 65 Z" />
              <rect x="378" y="42" width="8" height="23" />
              <line x1="145" y1="65" x2="395" y2="65" strokeWidth="1.5" />
            </g>
            <text x="20" y="115" fontFamily="'Bebas Neue', Impact, sans-serif" fontSize="32" fontWeight="700" fill="#f4b400" letterSpacing="2">DOHA</text>
            <text x="115" y="115" fontFamily="'Bebas Neue', Impact, sans-serif" fontSize="32" fontWeight="400" fill="#1d6fcb" letterSpacing="2">ACCUEIL</text>
          </svg>
        </div>

        {/* Titre */}
        <div style={{ marginBottom: 24 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '4px 12px',
              border: '1px solid var(--line)',
              borderRadius: 999,
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              letterSpacing: '0.25em',
              color: 'var(--sand-warm)',
              marginBottom: 12,
            }}
          >
            🎾 RÈGLEMENT OFFICIEL
            {tournament && (
              <>
                {' · '}
                {tournament.name}
              </>
            )}
          </div>
          <h1 className="h-display" style={{ fontSize: 'clamp(32px, 6vw, 48px)', lineHeight: 0.95 }}>
            TOURNOI DE <span style={{ color: 'var(--neon)' }}>PÁDEL</span>
          </h1>
          <p style={{ color: 'var(--sand)', fontSize: 14, marginTop: 8, fontStyle: 'italic' }}>
            Organisé par Doha Accueil
          </p>
        </div>

        {/* SECTION : Format des matchs */}
        <Section title="Format des matchs" icon="⏱">
          <RuleItem>Marquer un maximum de jeux en <strong style={{ color: 'var(--neon)' }}>{matchDuration} minutes</strong></RuleItem>
          <RuleItem>
            <strong style={{ color: 'var(--neon)' }}>{numRounds} × {matchDuration} minutes</strong> par équipe
            {numRounds > 0 && (
              <span style={{ color: 'var(--gray)', fontSize: 13 }}>
                {' '}(soit {numRounds} round{numRounds > 1 ? 's' : ''})
              </span>
            )}
          </RuleItem>
          <RuleItem>
            <strong style={{ color: 'var(--neon)' }}>{breakDuration} minute{breakDuration > 1 ? 's' : ''}</strong> de pause entre chaque match
          </RuleItem>
          <RuleItem>Golden point à 40 / 40</RuleItem>
        </Section>

        {/* SECTION : Fin de match */}
        <Section title="Fin de match" icon="🏁">
          <RuleItem>On arrête de jouer à la fin du temps</RuleItem>
          <RuleItem>Si égalité de jeu à la fin du temps → on finit le jeu en cours</RuleItem>
        </Section>

        {/* ENCADRÉ IMPÉRATIF */}
        <div
          style={{
            background: 'var(--neon)',
            color: 'var(--bg-deep)',
            borderRadius: 12,
            padding: '16px 20px',
            margin: '20px 0',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <div style={{ fontSize: 32 }}>⚠️</div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, letterSpacing: '0.15em' }}>
              IMPÉRATIF
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, letterSpacing: '0.05em' }}>
              IL FAUT UN VAINQUEUR À LA FIN DU TEMPS IMPARTI
            </div>
          </div>
        </div>

        {/* SECTION : Signaux sonores - 4 cartes */}
        <Section title="Signaux sonores" icon="🔔">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: 10,
              marginTop: 12,
            }}
          >
            <SignalCard
              count="1"
              label="COUP DE SIFFLET"
              desc1={`${matchWarningMin} min avant`}
              desc2="la fin du match"
            />
            <SignalCard
              count="2"
              label="COUPS DE SIFFLET"
              desc1="FIN"
              desc2="du match"
            />
            <SignalCard
              count="1"
              label="COUP DE SIFFLET"
              desc1={`${breakWarningMin} min avant`}
              desc2="la fin de la pause"
            />
            <SignalCard
              count="2"
              label="COUPS DE SIFFLET"
              desc1="REPRISE"
              desc2="des matchs"
            />
          </div>
        </Section>

        {/* SECTION : Balles */}
        <div
          style={{
            background: 'var(--bg-mid)',
            border: '1px solid var(--sand-warm)',
            borderRadius: 12,
            padding: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            marginTop: 20,
          }}
        >
          <div style={{ fontSize: 40 }}>🎾</div>
          <div>
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 16,
                letterSpacing: '0.1em',
                color: 'var(--sand-warm)',
                marginBottom: 4,
              }}
            >
              GESTION DES BALLES
            </div>
            <div style={{ fontSize: 14, color: 'var(--white)' }}>
              Les balles restent sur le terrain.
            </div>
            <div style={{ fontSize: 14, color: 'var(--neon)', fontWeight: 700, marginTop: 2 }}>
              Remplacement toutes les 2 heures de jeu par terrain.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            marginTop: 32,
            paddingTop: 16,
            borderTop: '1px solid var(--line)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            color: 'var(--gray)',
            fontSize: 11,
            fontFamily: 'var(--font-mono)',
          }}
        >
          <span>Tournoi de Pádel · Doha Accueil</span>
          <span
            style={{
              color: 'var(--neon)',
              fontFamily: 'var(--font-display)',
              fontSize: 14,
              letterSpacing: '0.15em',
            }}
          >
            BONNE CHANCE À TOUS !
          </span>
          <span>Qatar · {new Date().getFullYear()}</span>
        </div>
      </main>
    </>
  )
}

// ============================================
// SOUS-COMPOSANTS
// ============================================

function Section({ title, icon, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 12,
        }}
      >
        <div style={{ width: 24, height: 1, background: 'var(--sand-warm)' }} />
        <span style={{ fontSize: 18 }}>{icon}</span>
        <h2
          className="h-display"
          style={{
            fontSize: 18,
            color: 'var(--neon)',
            letterSpacing: '0.08em',
            margin: 0,
          }}
        >
          {title.toUpperCase()}
        </h2>
      </div>
      <div style={{ paddingLeft: 8 }}>{children}</div>
    </div>
  )
}

function RuleItem({ children }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        padding: '6px 0',
      }}
    >
      <div
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: 'var(--neon)',
          flexShrink: 0,
          marginTop: 7,
        }}
      />
      <div style={{ fontSize: 14, color: 'var(--white)', lineHeight: 1.5 }}>{children}</div>
    </div>
  )
}

function SignalCard({ count, label, desc1, desc2 }) {
  return (
    <div
      style={{
        background: 'var(--bg-mid)',
        border: '1px solid var(--line)',
        borderRadius: 10,
        padding: '14px 8px',
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: 20, marginBottom: 4 }}>🔔</div>
      <div
        className="h-display"
        style={{
          fontSize: 32,
          color: 'var(--neon)',
          lineHeight: 1,
          letterSpacing: '0.05em',
        }}
      >
        {count}
      </div>
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 9,
          letterSpacing: '0.1em',
          color: 'var(--sand-warm)',
          marginTop: 4,
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      <div style={{ height: 1, background: 'var(--line)', margin: '6px 12px' }} />
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--white)', marginTop: 6 }}>
        {desc1}
      </div>
      <div style={{ fontSize: 11, color: 'var(--gray)', marginTop: 2 }}>{desc2}</div>
    </div>
  )
}
