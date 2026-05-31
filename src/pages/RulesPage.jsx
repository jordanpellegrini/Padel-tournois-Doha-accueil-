import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { computeNumRounds } from '../lib/tournamentLogic'
import { getNumPools } from '../lib/knockoutLogic'
import { useAppSettings } from '../lib/useAppSettings'
import LogoBanner from '../components/LogoBanner'

export default function RulesPage() {
  const { id } = useParams()
  const { orgName } = useAppSettings()
  const [tournament, setTournament] = useState(null)
  const [teamCount, setTeamCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTournament()
  }, [id])

  const loadTournament = async () => {
    let t = null
    if (!id) {
      const { data } = await supabase
        .from('tournaments')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      t = data
    } else {
      const { data } = await supabase.from('tournaments').select('*').eq('id', id).single()
      t = data
    }
    if (t) {
      setTournament(t)
      const { count } = await supabase
        .from('teams')
        .select('*', { count: 'exact', head: true })
        .eq('tournament_id', t.id)
      setTeamCount(count || 0)
    }
    setLoading(false)
  }

  const handlePrint = () => window.print()

  if (loading) {
    return (
      <main className="container">
        <div style={{ textAlign: 'center', padding: 80, color: 'var(--gray)' }}>Chargement...</div>
      </main>
    )
  }

  const matchDuration = tournament?.match_duration_minutes ?? 20
  const breakDuration = tournament?.break_duration_minutes ?? 5
  const totalDuration = tournament?.total_duration_minutes ?? 240
  const numCourts = tournament?.num_courts ?? 4
  const numRounds = computeNumRounds(totalDuration, matchDuration, breakDuration)
  const isKnockout = tournament?.tournament_type === 'knockout'
  const numPools = tournament?.num_pools || (teamCount >= 4 ? getNumPools(teamCount) : 2)

  const matchWarningMin = Math.min(5, Math.max(1, Math.floor(matchDuration / 4)))
  const breakWarningMin = Math.min(2, Math.max(1, Math.floor(breakDuration / 2)))

  return (
    <>
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 12mm; }
          body, html { background: #0a1929 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .no-print { display: none !important; }
          .rules-page { padding: 0 !important; max-width: 100% !important; }
          .app-header { display: none !important; }
        }
        .rules-page { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      `}</style>

      <main className="container rules-page">
        <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <Link to={id ? `/tournament/${id}` : '/'} style={{ color: 'var(--gray)', textDecoration: 'none', fontSize: 14 }}>← Retour</Link>
          <button className="btn btn-primary" onClick={handlePrint}>🖨️ Imprimer / PDF</button>
        </div>

        {/* Bandeau des logos (imprimé aussi) */}
        <LogoBanner />

        {/* Titre */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '4px 12px', border: '1px solid var(--line)', borderRadius: 999, fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.25em', color: 'var(--sand-warm)', marginBottom: 12 }}>
            🎾 RÈGLEMENT OFFICIEL
            {tournament && <> · {tournament.name}</>}
          </div>
          <h1 className="h-display" style={{ fontSize: 'clamp(32px, 6vw, 48px)', lineHeight: 0.95 }}>
            TOURNOI DE <span style={{ color: 'var(--neon)' }}>PÁDEL</span>
          </h1>
          <p style={{ color: 'var(--sand)', fontSize: 14, marginTop: 8, fontStyle: 'italic' }}>
            Organisé par {orgName}
            {isKnockout && <span style={{ color: 'var(--coral)' }}> · Format Knockout</span>}
          </p>
        </div>

        {/* Format des matchs */}
        <Section title="Format des matchs" icon="⏱">
          <RuleItem>Marquer un maximum de jeux en <strong style={{ color: 'var(--neon)' }}>{matchDuration} minutes</strong></RuleItem>
          {isKnockout ? (
            <RuleItem>Phase de poules : chaque équipe joue contre toutes celles de sa poule</RuleItem>
          ) : (
            <RuleItem>
              <strong style={{ color: 'var(--neon)' }}>{numRounds} × {matchDuration} minutes</strong> par équipe
              {numRounds > 0 && <span style={{ color: 'var(--gray)', fontSize: 13 }}> (soit {numRounds} round{numRounds > 1 ? 's' : ''})</span>}
            </RuleItem>
          )}
          <RuleItem><strong style={{ color: 'var(--neon)' }}>{breakDuration} minute{breakDuration > 1 ? 's' : ''}</strong> de pause entre chaque match</RuleItem>
          <RuleItem>Golden point à 40 / 40</RuleItem>
        </Section>

        {/* SECTION FORMAT KNOCKOUT (uniquement si knockout) */}
        {isKnockout && (
          <Section title="Format du tournoi" icon="🏆">
            <RuleItem>
              <strong style={{ color: 'var(--coral)' }}>{numPools} poules</strong>
              {teamCount > 0 && <span style={{ color: 'var(--gray)', fontSize: 13 }}> ({teamCount} équipes réparties)</span>}
            </RuleItem>
            <RuleItem>
              <strong style={{ color: 'var(--neon)' }}>Les 2 premiers de chaque poule</strong> sont qualifiés pour le tableau principal (places 1 à 4)
            </RuleItem>
            <RuleItem>
              <strong style={{ color: 'var(--sand-warm)' }}>Les 3e et 4e de chaque poule</strong> jouent le tableau consolante (places 5 à 8)
            </RuleItem>

            {/* Mini-schéma des tableaux */}
            <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
              {/* Tableau principal */}
              <div style={{ background: 'var(--bg-mid)', border: '1px solid var(--neon)', borderRadius: 10, padding: 14 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, letterSpacing: '0.1em', color: 'var(--neon)', marginBottom: 10 }}>
                  🏆 TABLEAU PRINCIPAL
                </div>
                {numPools === 2 ? (
                  <div style={{ fontSize: 12, color: 'var(--white)', lineHeight: 1.8 }}>
                    <div>Demi 1 : <span style={{ color: 'var(--sand-warm)' }}>1er A vs 2e B</span></div>
                    <div>Demi 2 : <span style={{ color: 'var(--sand-warm)' }}>1er B vs 2e A</span></div>
                    <div style={{ marginTop: 4, borderTop: '1px solid var(--line)', paddingTop: 4 }}>
                      Finale : <span style={{ color: 'var(--neon)' }}>vainqueurs</span> (1re place)
                    </div>
                    <div>Petite finale : perdants (3e place)</div>
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: 'var(--white)', lineHeight: 1.8 }}>
                    <div>Quarts croisés (1er vs 2e)</div>
                    <div>Demi-finales</div>
                    <div style={{ marginTop: 4, borderTop: '1px solid var(--line)', paddingTop: 4 }}>
                      Finale (1re place) + 3e place
                    </div>
                  </div>
                )}
              </div>

              {/* Tableau consolante (uniquement 2 poules) */}
              {numPools === 2 && (
                <div style={{ background: 'var(--bg-mid)', border: '1px solid var(--sand-warm)', borderRadius: 10, padding: 14 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, letterSpacing: '0.1em', color: 'var(--sand-warm)', marginBottom: 10 }}>
                    🎾 TABLEAU CONSOLANTE
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--white)', lineHeight: 1.8 }}>
                    <div>Demi 1 : <span style={{ color: 'var(--sand-warm)' }}>3e A vs 4e B</span></div>
                    <div>Demi 2 : <span style={{ color: 'var(--sand-warm)' }}>3e B vs 4e A</span></div>
                    <div style={{ marginTop: 4, borderTop: '1px solid var(--line)', paddingTop: 4 }}>
                      Finale consolante (5e place)
                    </div>
                    <div>Petite finale (7e place)</div>
                  </div>
                </div>
              )}
            </div>
          </Section>
        )}

        {/* Fin de match */}
        <Section title="Fin de match" icon="🏁">
          <RuleItem>On arrête de jouer à la fin du temps</RuleItem>
          <RuleItem>Si égalité de jeu à la fin du temps → on finit le jeu en cours</RuleItem>
        </Section>

        {/* IMPÉRATIF */}
        <div style={{ background: 'var(--neon)', color: 'var(--bg-deep)', borderRadius: 12, padding: '16px 20px', margin: '20px 0', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ fontSize: 32 }}>⚠️</div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, letterSpacing: '0.15em' }}>IMPÉRATIF</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, letterSpacing: '0.05em' }}>IL FAUT UN VAINQUEUR À LA FIN DU TEMPS IMPARTI</div>
          </div>
        </div>

        {/* Signaux sonores */}
        <Section title="Signaux sonores" icon="🔔">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginTop: 12 }}>
            <SignalCard count="1" label="COUP DE SIFFLET" desc1={`${matchWarningMin} min avant`} desc2="la fin du match" />
            <SignalCard count="2" label="COUPS DE SIFFLET" desc1="FIN" desc2="du match" />
            <SignalCard count="1" label="COUP DE SIFFLET" desc1={`${breakWarningMin} min avant`} desc2="la fin de la pause" />
            <SignalCard count="2" label="COUPS DE SIFFLET" desc1="REPRISE" desc2="des matchs" />
          </div>
        </Section>

        {/* Balles */}
        <div style={{ background: 'var(--bg-mid)', border: '1px solid var(--sand-warm)', borderRadius: 12, padding: 20, display: 'flex', alignItems: 'center', gap: 16, marginTop: 20 }}>
          <div style={{ fontSize: 40 }}>🎾</div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, letterSpacing: '0.1em', color: 'var(--sand-warm)', marginBottom: 4 }}>GESTION DES BALLES</div>
            <div style={{ fontSize: 14, color: 'var(--white)' }}>Les balles restent sur le terrain.</div>
            <div style={{ fontSize: 14, color: 'var(--neon)', fontWeight: 700, marginTop: 2 }}>Remplacement toutes les 2 heures de jeu par terrain.</div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: 32, paddingTop: 16, borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--gray)', fontSize: 11, fontFamily: 'var(--font-mono)', flexWrap: 'wrap', gap: 8 }}>
          <span>Tournoi de Pádel · {orgName}</span>
          <span style={{ color: 'var(--neon)', fontFamily: 'var(--font-display)', fontSize: 14, letterSpacing: '0.15em' }}>BONNE CHANCE À TOUS !</span>
          <span>Qatar · {new Date().getFullYear()}</span>
        </div>
      </main>
    </>
  )
}

function Section({ title, icon, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{ width: 24, height: 1, background: 'var(--sand-warm)' }} />
        <span style={{ fontSize: 18 }}>{icon}</span>
        <h2 className="h-display" style={{ fontSize: 18, color: 'var(--neon)', letterSpacing: '0.08em', margin: 0 }}>{title.toUpperCase()}</h2>
      </div>
      <div style={{ paddingLeft: 8 }}>{children}</div>
    </div>
  )
}

function RuleItem({ children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '6px 0' }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--neon)', flexShrink: 0, marginTop: 7 }} />
      <div style={{ fontSize: 14, color: 'var(--white)', lineHeight: 1.5 }}>{children}</div>
    </div>
  )
}

function SignalCard({ count, label, desc1, desc2 }) {
  return (
    <div style={{ background: 'var(--bg-mid)', border: '1px solid var(--line)', borderRadius: 10, padding: '14px 8px', textAlign: 'center' }}>
      <div style={{ fontSize: 20, marginBottom: 4 }}>🔔</div>
      <div className="h-display" style={{ fontSize: 32, color: 'var(--neon)', lineHeight: 1, letterSpacing: '0.05em' }}>{count}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 9, letterSpacing: '0.1em', color: 'var(--sand-warm)', marginTop: 4, marginBottom: 8 }}>{label}</div>
      <div style={{ height: 1, background: 'var(--line)', margin: '6px 12px' }} />
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--white)', marginTop: 6 }}>{desc1}</div>
      <div style={{ fontSize: 11, color: 'var(--gray)', marginTop: 2 }}>{desc2}</div>
    </div>
  )
}
