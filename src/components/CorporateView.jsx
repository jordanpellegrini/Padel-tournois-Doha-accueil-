import { useState, useEffect } from 'react'
import {
  computeCorporateStandings,
  computeLevelStandings,
} from '../lib/corporateLogic'
import {
  computeRoundStartTimes,
  getCurrentPhase,
  nowMinutes,
  timeToMinutes,
  minutesToTime,
} from '../lib/scheduleLogic'

/**
 * Vue d'un tournoi INTER-ENTREPRISES
 *
 * Nouveautés :
 *  - Matchs groupés par TERRAIN (pas par niveau)
 *  - Affiche uniquement le ROUND EN COURS + le SUIVANT (pas tous)
 *  - Défilement cyclique automatique classements ↔ saisie scores
 *      basé sur l'heure courante et les horaires du planning
 *  - Boutons manuels pour forcer l'affichage
 */
export default function CorporateView({
  tournament,
  teams,
  matches,
  isAdmin,
  updateScore,
  toggleMatchFinished,
}) {
  const companyNames = tournament.company_names || []
  const maxLevel = tournament.teams_per_company || 8

  const corporateStandings = computeCorporateStandings(teams, matches, companyNames, maxLevel)
  const levelStandings = computeLevelStandings(teams, matches, maxLevel, companyNames)

  // ============ HORAIRES ============
  const matchDuration = tournament.match_duration_minutes || 40
  const breakDuration = tournament.break_duration_minutes || 5
  const startTime = tournament.start_time || '18:00'

  // Nombre de rounds total (calculé à partir des matchs existants)
  const totalRounds = Math.max(0, ...matches.filter((m) => m.phase === 'corporate').map((m) => m.round_number || 0))
  const roundStartTimes = computeRoundStartTimes(totalRounds, matchDuration, breakDuration, startTime)

  // ============ DÉFILEMENT CYCLIQUE ============
  // 'auto' : suit le timer réel · 'scores' : force saisie · 'ranking' : force classements
  const [displayMode, setDisplayMode] = useState('auto')
  const [phaseInfo, setPhaseInfo] = useState({ phase: 'match', currentRound: 1 })

  useEffect(() => {
    const tick = () => {
      const info = getCurrentPhase(nowMinutes(), roundStartTimes, matchDuration, breakDuration, 3)
      setPhaseInfo(info)
    }
    tick()
    const id = setInterval(tick, 30 * 1000) // recheck toutes les 30s
    return () => clearInterval(id)
  }, [roundStartTimes.join('|'), matchDuration, breakDuration])

  // Décide de l'affichage à montrer selon le mode et la phase
  const shouldShowScores =
    displayMode === 'scores' ? true :
    displayMode === 'ranking' ? false :
    // Mode auto : saisie durant "match-ending" et "break" (début de pause)
    (phaseInfo.phase === 'match-ending' || phaseInfo.phase === 'break')

  // ============ TERRAINS & MATCHS DU ROUND EN COURS + SUIVANT ============
  const currentRound = phaseInfo.currentRound || 1
  const numCourts = tournament.num_courts || 4

  const teamById = (id) => teams.find((t) => t.id === id)

  // Récupère les matchs d'un round donné, indexés par n° de terrain
  const matchesByCourtForRound = (roundNum) => {
    const roundMatches = matches.filter((m) => m.phase === 'corporate' && m.round_number === roundNum)
    const byCourt = {}
    for (let c = 1; c <= numCourts; c++) byCourt[c] = null
    roundMatches.forEach((m) => { byCourt[m.court_number] = m })
    return byCourt
  }

  const roundToShow = phaseInfo.phase === 'before' ? 1 : currentRound
  const currentByCourt = matchesByCourtForRound(roundToShow)
  const nextByCourt = matchesByCourtForRound(roundToShow + 1)
  const hasNext = roundToShow < totalRounds

  const companyColor = (idx) => {
    const colors = ['var(--neon)', 'var(--coral)', 'var(--sand-warm)', '#5b9bd5', '#b07cc6', '#5fd0a0']
    return colors[idx % colors.length]
  }

  // Libellés des rounds courant/suivant
  const roundLabel = (r) => {
    const idx = r - 1
    if (idx < 0 || idx >= roundStartTimes.length) return `Round ${r}`
    const start = roundStartTimes[idx]
    const end = minutesToTime(timeToMinutes(start) + matchDuration)
    return `${start} → ${end}`
  }

  // ============ BANDEAU DE STATUT (phase courante) ============
  const phaseLabels = {
    'before':       { txt: '⏰ Avant le tournoi',           color: 'var(--gray)' },
    'match':        { txt: '🎾 Match en cours',              color: 'var(--success)' },
    'match-ending': { txt: '⚠️ Fin de match imminente',     color: 'var(--coral)' },
    'break':        { txt: '☕ Pause · saisie des scores',   color: 'var(--sand-warm)' },
    'break-mid':    { txt: '📊 Milieu de pause',             color: 'var(--sand-warm)' },
    'after':        { txt: '🏁 Tournoi terminé',            color: 'var(--gray)' },
  }
  const currentPhaseLabel = phaseLabels[phaseInfo.phase] || phaseLabels.match

  return (
    <div style={{ fontSize: 16 }}>
      {/* ============ BANDEAU DE STATUT + BASCULE ============ */}
      <div className="card" style={{ marginBottom: 20, padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: currentPhaseLabel.color }}>
              {currentPhaseLabel.txt}
            </div>
            <div style={{ fontSize: 14, color: 'var(--gray)', marginTop: 4 }}>
              {phaseInfo.phase === 'before' && phaseInfo.minutesUntilNext !== undefined && (
                <>Début dans {phaseInfo.minutesUntilNext} min · {roundStartTimes[0]}</>
              )}
              {(phaseInfo.phase === 'match' || phaseInfo.phase === 'match-ending') && (
                <>Round {currentRound}/{totalRounds} · {roundLabel(currentRound)} · {phaseInfo.minutesUntilNext} min restantes</>
              )}
              {(phaseInfo.phase === 'break' || phaseInfo.phase === 'break-mid') && (
                <>Pause · Round {currentRound + 1} dans {phaseInfo.minutesUntilNext} min</>
              )}
              {phaseInfo.phase === 'after' && <>Tous les rounds sont joués</>}
            </div>
          </div>

          {/* Boutons pour forcer l'affichage */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button
              onClick={() => setDisplayMode('auto')}
              style={{ padding: '10px 14px', fontSize: 14, fontWeight: 600, borderRadius: 8, border: 'none', cursor: 'pointer', background: displayMode === 'auto' ? 'var(--neon)' : 'var(--bg-deep)', color: displayMode === 'auto' ? 'var(--bg-deep)' : 'var(--gray)' }}
              title="Défilement automatique selon la phase"
            >
              ⏱ AUTO
            </button>
            <button
              onClick={() => setDisplayMode('scores')}
              style={{ padding: '10px 14px', fontSize: 14, fontWeight: 600, borderRadius: 8, border: 'none', cursor: 'pointer', background: displayMode === 'scores' ? 'var(--coral)' : 'var(--bg-deep)', color: displayMode === 'scores' ? 'var(--white)' : 'var(--gray)' }}
            >
              📝 SCORES
            </button>
            <button
              onClick={() => setDisplayMode('ranking')}
              style={{ padding: '10px 14px', fontSize: 14, fontWeight: 600, borderRadius: 8, border: 'none', cursor: 'pointer', background: displayMode === 'ranking' ? 'var(--sand-warm)' : 'var(--bg-deep)', color: displayMode === 'ranking' ? 'var(--bg-deep)' : 'var(--gray)' }}
            >
              🏆 CLASSEMENTS
            </button>
          </div>
        </div>
      </div>

      {/* ============ AFFICHAGE PRINCIPAL ============ */}
      {shouldShowScores ? (
        // === MODE SAISIE DES SCORES : matchs par terrain, round courant + suivant ===
        <div>
          <RoundByCourt
            title={`ROUND ${roundToShow} · ${roundLabel(roundToShow)}`}
            highlight
            byCourt={currentByCourt}
            teamById={teamById}
            companyNames={companyNames}
            companyColor={companyColor}
            isAdmin={isAdmin}
            updateScore={updateScore}
            toggleMatchFinished={toggleMatchFinished}
          />
          {hasNext && (
            <div style={{ marginTop: 20 }}>
              <RoundByCourt
                title={`ROUND SUIVANT · ${roundLabel(roundToShow + 1)}`}
                byCourt={nextByCourt}
                teamById={teamById}
                companyNames={companyNames}
                companyColor={companyColor}
                isAdmin={false} // pas de saisie sur les futurs matchs
                updateScore={updateScore}
                toggleMatchFinished={toggleMatchFinished}
                dimmed
              />
            </div>
          )}
        </div>
      ) : (
        // === MODE CLASSEMENTS ===
        <div>
          {/* Classement principal par entreprise */}
          <div className="card" style={{ marginBottom: 24 }}>
            <h2 className="h-display" style={{ fontSize: 32, marginBottom: 18, color: 'var(--neon)' }}>
              🏢 CLASSEMENT PAR ENTREPRISE
            </h2>
            <div style={{ display: 'grid', gap: 10 }}>
              {corporateStandings.map((s, i) => (
                <div
                  key={s.company_index}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    padding: '16px 18px',
                    background: i === 0 ? 'rgba(212, 255, 58, 0.1)' : 'var(--bg-deep)',
                    border: `1px solid ${i === 0 ? 'var(--neon)' : 'var(--line)'}`,
                    borderRadius: 10,
                  }}
                >
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 34, color: i === 0 ? 'var(--neon)' : 'var(--white)', minWidth: 44 }}>
                    {i + 1}
                  </span>
                  <div style={{ width: 6, alignSelf: 'stretch', borderRadius: 3, background: companyColor(s.company_index) }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 22 }}>{s.company_name}</div>
                    <div style={{ color: 'var(--gray)', fontSize: 14, marginTop: 2 }}>
                      {s.totalWins} victoire{s.totalWins > 1 ? 's' : ''} · {s.totalPointsFor} jeux
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 34, color: 'var(--neon)' }}>{s.totalPoints}</div>
                    <div style={{ fontSize: 12, color: 'var(--gray)' }}>points</div>
                  </div>
                  <div style={{ textAlign: 'right', minWidth: 56 }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, color: s.diff >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                      {s.diff > 0 ? `+${s.diff}` : s.diff}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--gray)' }}>diff.</div>
                  </div>
                </div>
              ))}
            </div>
            <p style={{ color: 'var(--gray)', fontSize: 13, marginTop: 14 }}>
              🏆 4 pts au 1er · 3 pts au 2e · 2 pts au 3e · 1 pt au 4e · 0 pt aux suivants (par niveau). Départage : diff de jeux.
            </p>
          </div>

          {/* Classements par niveau (compacts) */}
          <h2 className="h-display" style={{ fontSize: 26, marginBottom: 14, color: 'var(--sand)' }}>
            🎾 CLASSEMENTS PAR NIVEAU
          </h2>
          <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
            {Object.entries(levelStandings).map(([lvl, ranking]) => {
              if (!ranking.some((r) => r.played > 0)) return null // masque les niveaux non joués
              return (
                <div key={lvl} className="card" style={{ padding: 14 }}>
                  <h3 className="h-display" style={{ fontSize: 20, marginBottom: 12, color: 'var(--neon)', letterSpacing: '0.08em' }}>
                    NIVEAU {lvl}
                  </h3>
                  <div>
                    {ranking.map((s, i) => (
                      <div key={s.team.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: 'var(--bg-deep)', borderRadius: 6, marginBottom: 5, fontSize: 15 }}>
                        <span style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: i === 0 ? 'var(--neon)' : 'var(--gray)', minWidth: 24 }}>{i + 1}</span>
                        <div style={{ width: 4, alignSelf: 'stretch', borderRadius: 2, background: companyColor(s.team.company_index) }} />
                        <span style={{ flex: 1, minWidth: 0, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          <span style={{ color: 'var(--sand-warm)' }}>{s.company_name}</span>
                        </span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--success)' }}>{s.wins}V</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: s.diff >= 0 ? 'var(--sand-warm)' : 'var(--danger)' }}>
                          {s.diff > 0 ? `+${s.diff}` : s.diff}
                        </span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 16, color: 'var(--neon)', fontWeight: 700 }}>{s.rankPoints}p</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================
// AFFICHAGE D'UN ROUND PAR TERRAIN
// ============================================
function RoundByCourt({ title, byCourt, teamById, companyNames, companyColor, isAdmin, updateScore, toggleMatchFinished, highlight, dimmed }) {
  const courts = Object.keys(byCourt).map((n) => parseInt(n, 10)).sort((a, b) => a - b)

  return (
    <div>
      <h2 className="h-display" style={{ fontSize: highlight ? 30 : 24, marginBottom: 14, color: highlight ? 'var(--neon)' : 'var(--sand)', letterSpacing: '0.05em' }}>
        {title}
      </h2>
      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', opacity: dimmed ? 0.7 : 1 }}>
        {courts.map((c) => {
          const m = byCourt[c]
          return (
            <div key={c} style={{ background: 'var(--bg-mid)', border: `2px solid ${highlight ? 'var(--neon)' : 'var(--line)'}`, borderRadius: 12, padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: highlight ? 'var(--neon)' : 'var(--sand-warm)', letterSpacing: '0.1em' }}>
                  🎾 TERRAIN {c}
                </span>
                {m && (
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '0.1em', color: 'var(--gray)', background: 'var(--bg-deep)', padding: '3px 10px', borderRadius: 4 }}>
                    NIVEAU {m.level}
                  </span>
                )}
              </div>

              {m ? (
                <CourtMatchDisplay match={m} teamById={teamById} companyNames={companyNames} companyColor={companyColor} isAdmin={isAdmin} updateScore={updateScore} toggleMatchFinished={toggleMatchFinished} />
              ) : (
                <div style={{ textAlign: 'center', padding: 20, color: 'var(--gray)', fontStyle: 'italic', fontSize: 14 }}>
                  Terrain libre
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function CourtMatchDisplay({ match, teamById, companyNames, companyColor, isAdmin, updateScore, toggleMatchFinished }) {
  const teamA = teamById(match.team_a_id)
  const teamB = teamById(match.team_b_id)
  const nameCompanyA = teamA ? companyNames[teamA.company_index] : '?'
  const nameCompanyB = teamB ? companyNames[teamB.company_index] : '?'

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 10, alignItems: 'center' }}>
        <div style={{ textAlign: 'right', minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: companyColor(teamA?.company_index ?? 0) }}>{nameCompanyA}</div>
          <div style={{ color: 'var(--white)', fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {teamA?.player1_name} / {teamA?.player2_name}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {isAdmin ? (
            <>
              <input className="input" type="number" inputMode="numeric" min="0" max="99" value={match.score_a} onChange={(e) => updateScore(match.id, 'score_a', e.target.value)} onFocus={(e) => e.target.select()} style={{ width: 56, padding: '8px', fontSize: 24, fontWeight: 700, textAlign: 'center', fontFamily: 'var(--font-display)' }} />
              <span style={{ color: 'var(--gray)', fontSize: 20 }}>-</span>
              <input className="input" type="number" inputMode="numeric" min="0" max="99" value={match.score_b} onChange={(e) => updateScore(match.id, 'score_b', e.target.value)} onFocus={(e) => e.target.select()} style={{ width: 56, padding: '8px', fontSize: 24, fontWeight: 700, textAlign: 'center', fontFamily: 'var(--font-display)' }} />
            </>
          ) : (
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 30 }}>
              {match.score_a ?? '-'} <span style={{ color: 'var(--gray)' }}>-</span> {match.score_b ?? '-'}
            </div>
          )}
        </div>

        <div style={{ textAlign: 'left', minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: companyColor(teamB?.company_index ?? 0) }}>{nameCompanyB}</div>
          <div style={{ color: 'var(--white)', fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {teamB?.player1_name} / {teamB?.player2_name}
          </div>
        </div>
      </div>

      {isAdmin && (
        <div style={{ textAlign: 'center', marginTop: 10 }}>
          <button onClick={() => toggleMatchFinished(match)} style={{ padding: '7px 18px', fontSize: 12, fontFamily: 'var(--font-display)', letterSpacing: '0.1em', borderRadius: 6, background: match.is_finished ? 'transparent' : 'var(--neon)', color: match.is_finished ? 'var(--gray)' : 'var(--bg-deep)', border: match.is_finished ? '1px solid var(--line)' : 'none', cursor: 'pointer' }}>
            {match.is_finished ? '↺ ROUVRIR' : '✓ VALIDER'}
          </button>
        </div>
      )}
    </div>
  )
}
