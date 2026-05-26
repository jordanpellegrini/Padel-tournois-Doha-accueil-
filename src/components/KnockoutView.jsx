import {
  getNumPools,
  poolName,
  computePoolStandings,
  computeKnockoutFinalRanking,
} from '../lib/knockoutLogic'

/**
 * Vue d'un tournoi KNOCKOUT (poules + phases finales + consolante)
 */
export default function KnockoutView({
  tournament,
  teams,
  matches,
  isAdmin,
  updateScore,
  toggleMatchFinished,
}) {
  const numPools = tournament.num_pools || getNumPools(teams.length)
  const phase = tournament.knockout_phase || 'pools'

  const poolStandings = computePoolStandings(teams, matches, numPools)
  const finalRanking = computeKnockoutFinalRanking(teams, matches)

  const teamById = (id) => teams.find((t) => t.id === id)

  return (
    <div>
      {/* Indicateur de phase */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, justifyContent: 'center', flexWrap: 'wrap' }}>
        <div style={{ padding: '8px 18px', borderRadius: 8, background: phase === 'pools' ? 'var(--neon)' : 'var(--bg-mid)', color: phase === 'pools' ? 'var(--bg-deep)' : 'var(--gray)', fontFamily: 'var(--font-display)', letterSpacing: '0.1em', fontSize: 14, border: '1px solid var(--line)' }}>
          1 · POULES
        </div>
        <div style={{ alignSelf: 'center', color: 'var(--gray)' }}>→</div>
        <div style={{ padding: '8px 18px', borderRadius: 8, background: phase === 'finals' ? 'var(--coral)' : 'var(--bg-mid)', color: phase === 'finals' ? 'var(--bg-deep)' : 'var(--gray)', fontFamily: 'var(--font-display)', letterSpacing: '0.1em', fontSize: 14, border: '1px solid var(--line)' }}>
          2 · PHASES FINALES
        </div>
      </div>

      {/* ============================================ PHASE POULES ============================================ */}
      {phase === 'pools' && (
        <div style={{ display: 'grid', gap: 24 }}>
          {Array.from({ length: numPools }, (_, p) => {
            const poolMatches = matches.filter((m) => m.phase === 'pool' && m.pool_index === p)
            const standing = poolStandings[p] || []
            return (
              <div key={p} className="card">
                <h2 className="h-display" style={{ fontSize: 26, marginBottom: 16, color: 'var(--neon)' }}>
                  🎾 POULE {poolName(p)}
                </h2>

                {/* Classement de la poule (compact pour tenir sur mobile) */}
                {standing.length > 0 && (
                  <div style={{ marginBottom: 20 }}>
                    {standing.map((s, i) => {
                      const qualified = i < 2
                      return (
                        <div
                          key={s.team.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            padding: '10px 12px',
                            background: qualified ? 'rgba(212, 255, 58, 0.08)' : 'var(--bg-deep)',
                            border: `1px solid ${qualified ? 'rgba(212,255,58,0.25)' : 'var(--line)'}`,
                            borderRadius: 8,
                            marginBottom: 6,
                          }}
                        >
                          <span style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: qualified ? 'var(--neon)' : 'var(--white)', minWidth: 28 }}>
                            {i + 1}{qualified && <span style={{ fontSize: 11 }}> ✓</span>}
                          </span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {s.team.player1_name} / {s.team.player2_name}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 12, fontSize: 13, fontFamily: 'var(--font-mono)' }}>
                            <span title="Joués" style={{ color: 'var(--gray)' }}>J{s.played}</span>
                            <span title="Victoires" style={{ color: 'var(--success)' }}>V{s.wins}</span>
                            <span title="Différence" style={{ color: s.diff >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                              {s.diff > 0 ? `+${s.diff}` : s.diff}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                    <p style={{ color: 'var(--gray)', fontSize: 11, marginTop: 8 }}>
                      ✓ Les 2 premiers sont qualifiés pour le tableau principal · les 3e et 4e jouent la consolante
                    </p>
                  </div>
                )}

                {/* Matchs de la poule (avec numéro de terrain) */}
                <div style={{ display: 'grid', gap: 8 }}>
                  {poolMatches.map((m) => (
                    <MatchRow
                      key={m.id}
                      match={m}
                      teamA={teamById(m.team_a_id)}
                      teamB={teamById(m.team_b_id)}
                      isAdmin={isAdmin}
                      updateScore={updateScore}
                      toggleMatchFinished={toggleMatchFinished}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ============================================ PHASE FINALES ============================================ */}
      {phase === 'finals' && (
        <div>
          {/* Qualifiés */}
          <div className="card" style={{ marginBottom: 24 }}>
            <h3 className="h-display" style={{ fontSize: 18, marginBottom: 12, color: 'var(--sand)' }}>
              CLASSEMENT FINAL DES POULES
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
              {Array.from({ length: numPools }, (_, p) => {
                const standing = poolStandings[p] || []
                return (
                  <div key={p}>
                    <div style={{ color: 'var(--neon)', fontFamily: 'var(--font-display)', fontSize: 14, marginBottom: 6 }}>
                      POULE {poolName(p)}
                    </div>
                    {standing.map((s, i) => (
                      <div key={s.team.id} style={{ fontSize: 12, color: i < 2 ? 'var(--white)' : 'var(--gray)', marginBottom: 2 }}>
                        <span style={{ color: i < 2 ? 'var(--neon)' : 'var(--sand-warm)' }}>{i + 1}{i === 0 ? 'er' : 'e'}</span> {s.team.player1_name} / {s.team.player2_name}
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          </div>

          {/* TABLEAU PRINCIPAL */}
          <div style={{ marginBottom: 8 }}>
            <div style={{ display: 'inline-block', padding: '6px 16px', background: 'rgba(212, 255, 58, 0.15)', color: 'var(--neon)', borderRadius: 999, fontFamily: 'var(--font-display)', fontSize: 13, letterSpacing: '0.15em', marginBottom: 16 }}>
              🏆 TABLEAU PRINCIPAL (places 1 à 4)
            </div>
          </div>
          <BracketSection label="QUARTS DE FINALE" matches={matches.filter((m) => m.phase === 'quarter')} teams={teams} isAdmin={isAdmin} updateScore={updateScore} toggleMatchFinished={toggleMatchFinished} />
          <BracketSection label="DEMI-FINALES" matches={matches.filter((m) => m.phase === 'semi')} teams={teams} isAdmin={isAdmin} updateScore={updateScore} toggleMatchFinished={toggleMatchFinished} />
          <BracketSection label="FINALE & 3E PLACE" matches={matches.filter((m) => m.phase === 'final' || m.phase === 'third')} teams={teams} isAdmin={isAdmin} updateScore={updateScore} toggleMatchFinished={toggleMatchFinished} highlight />

          {/* TABLEAU CONSOLANTE */}
          {matches.some((m) => m.phase.startsWith('cons')) && (
            <>
              <div style={{ marginTop: 32, marginBottom: 8 }}>
                <div style={{ display: 'inline-block', padding: '6px 16px', background: 'rgba(201, 169, 110, 0.15)', color: 'var(--sand-warm)', borderRadius: 999, fontFamily: 'var(--font-display)', fontSize: 13, letterSpacing: '0.15em', marginBottom: 16 }}>
                  🎾 TABLEAU CONSOLANTE (places 5 à 8)
                </div>
              </div>
              <BracketSection label="DEMI-CONSOLANTES" matches={matches.filter((m) => m.phase === 'cons-semi')} teams={teams} isAdmin={isAdmin} updateScore={updateScore} toggleMatchFinished={toggleMatchFinished} sand />
              <BracketSection label="FINALE CONSOLANTE & 7E PLACE" matches={matches.filter((m) => m.phase === 'cons-final' || m.phase === 'cons-third')} teams={teams} isAdmin={isAdmin} updateScore={updateScore} toggleMatchFinished={toggleMatchFinished} sand />
            </>
          )}

          {/* Classement final complet */}
          {finalRanking.length > 0 && (
            <div className="card" style={{ marginTop: 24, textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 8 }}>🏆</div>
              <h2 className="h-display" style={{ fontSize: 28, color: 'var(--neon)', marginBottom: 20 }}>
                CLASSEMENT FINAL
              </h2>
              <div style={{ display: 'grid', gap: 8, maxWidth: 420, margin: '0 auto' }}>
                {finalRanking.map((r) => (
                  <div key={r.rank} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: r.rank === 1 ? 'rgba(212, 255, 58, 0.1)' : 'var(--bg-deep)', border: `1px solid ${r.rank === 1 ? 'var(--neon)' : r.rank <= 4 ? 'var(--line)' : 'rgba(201,169,110,0.3)'}`, borderRadius: 8 }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: 15, letterSpacing: '0.05em', color: r.rank <= 4 ? 'var(--white)' : 'var(--sand-warm)' }}>{r.label}</span>
                    <span style={{ fontWeight: 600, textAlign: 'right', fontSize: 13 }}>{r.team?.player1_name} / {r.team?.player2_name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ============================================ SOUS-COMPOSANTS ============================================

function BracketSection({ label, matches, teams, isAdmin, updateScore, toggleMatchFinished, highlight, sand }) {
  const teamById = (id) => teams.find((t) => t.id === id)
  if (matches.length === 0) return null
  const accentColor = highlight ? 'var(--neon)' : sand ? 'var(--sand-warm)' : 'var(--sand-warm)'

  return (
    <div style={{ marginBottom: 24 }}>
      <h3 className="h-display" style={{ fontSize: 18, marginBottom: 12, color: accentColor, letterSpacing: '0.1em' }}>
        {label}
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
        {matches.map((m) => (
          <BracketMatchCard
            key={m.id}
            match={m}
            teamA={teamById(m.team_a_id)}
            teamB={teamById(m.team_b_id)}
            isAdmin={isAdmin}
            updateScore={updateScore}
            toggleMatchFinished={toggleMatchFinished}
            accentColor={accentColor}
          />
        ))}
      </div>
    </div>
  )
}

function BracketMatchCard({ match, teamA, teamB, isAdmin, updateScore, toggleMatchFinished, accentColor }) {
  const bothTeamsKnown = match.team_a_id && match.team_b_id
  const canEdit = isAdmin && bothTeamsKnown
  const nameA = teamA ? `${teamA.player1_name} / ${teamA.player2_name}` : match.team_a_placeholder || '?'
  const nameB = teamB ? `${teamB.player1_name} / ${teamB.player2_name}` : match.team_b_placeholder || '?'
  const aWins = match.is_finished && match.score_a > match.score_b
  const bWins = match.is_finished && match.score_b > match.score_a

  return (
    <div style={{ background: match.is_finished ? 'rgba(46, 213, 115, 0.06)' : 'var(--bg-mid)', border: `1px solid ${accentColor === 'var(--neon)' ? 'var(--neon)' : 'var(--line)'}`, borderRadius: 12, padding: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 13, letterSpacing: '0.12em', color: accentColor }}>
          {match.bracket_label}
        </span>
        {match.court_number && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', color: 'var(--gray)', background: 'var(--bg-deep)', padding: '2px 8px', borderRadius: 4 }}>
            TERRAIN {match.court_number}
          </span>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '6px 0', opacity: teamA ? 1 : 0.5 }}>
        <span style={{ fontWeight: aWins ? 700 : 500, fontSize: 13, color: aWins ? 'var(--neon)' : 'var(--white)' }}>
          {aWins && '🏆 '}{nameA}
        </span>
        {canEdit ? (
          <input className="input" type="number" inputMode="numeric" min="0" max="99" value={match.score_a} onChange={(e) => updateScore(match.id, 'score_a', e.target.value)} onFocus={(e) => e.target.select()} style={{ width: 52, padding: '6px', fontSize: 20, fontWeight: 700, textAlign: 'center', fontFamily: 'var(--font-display)' }} />
        ) : (
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 22 }}>{bothTeamsKnown ? match.score_a : '-'}</span>
        )}
      </div>

      <div style={{ height: 1, background: 'var(--line)', margin: '4px 0' }} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '6px 0', opacity: teamB ? 1 : 0.5 }}>
        <span style={{ fontWeight: bWins ? 700 : 500, fontSize: 13, color: bWins ? 'var(--neon)' : 'var(--white)' }}>
          {bWins && '🏆 '}{nameB}
        </span>
        {canEdit ? (
          <input className="input" type="number" inputMode="numeric" min="0" max="99" value={match.score_b} onChange={(e) => updateScore(match.id, 'score_b', e.target.value)} onFocus={(e) => e.target.select()} style={{ width: 52, padding: '6px', fontSize: 20, fontWeight: 700, textAlign: 'center', fontFamily: 'var(--font-display)' }} />
        ) : (
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 22 }}>{bothTeamsKnown ? match.score_b : '-'}</span>
        )}
      </div>

      {canEdit && (
        <button onClick={() => toggleMatchFinished(match)} style={{ width: '100%', marginTop: 10, padding: '8px', fontSize: 11, fontFamily: 'var(--font-display)', letterSpacing: '0.1em', borderRadius: 6, background: match.is_finished ? 'transparent' : 'var(--neon)', color: match.is_finished ? 'var(--gray)' : 'var(--bg-deep)', border: match.is_finished ? '1px solid var(--line)' : 'none', cursor: 'pointer' }}>
          {match.is_finished ? '↺ ROUVRIR' : '✓ VALIDER'}
        </button>
      )}
      {!bothTeamsKnown && (
        <div style={{ textAlign: 'center', marginTop: 8, color: 'var(--gray)', fontSize: 11, fontStyle: 'italic' }}>
          En attente des résultats précédents
        </div>
      )}
    </div>
  )
}

function MatchRow({ match, teamA, teamB, isAdmin, updateScore, toggleMatchFinished }) {
  return (
    <div style={{ background: match.is_finished ? 'rgba(46, 213, 115, 0.06)' : 'var(--bg-deep)', border: `1px solid ${match.is_finished ? 'rgba(46, 213, 115, 0.3)' : 'var(--line)'}`, borderRadius: 10, padding: 12 }}>
      {/* En-tête : numéro de terrain */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', color: 'var(--neon)', background: 'rgba(212,255,58,0.1)', padding: '2px 8px', borderRadius: 4 }}>
          🎾 TERRAIN {match.court_number}
        </span>
        {match.is_finished && <span style={{ color: 'var(--success)', fontSize: 11 }}>✓ Terminé</span>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 10, alignItems: 'center' }}>
        <div style={{ textAlign: 'right', minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{teamA?.player1_name}</div>
          <div style={{ color: 'var(--gray)', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{teamA?.player2_name}</div>
        </div>

        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {isAdmin ? (
            <>
              <input className="input" type="number" inputMode="numeric" min="0" max="99" value={match.score_a} onChange={(e) => updateScore(match.id, 'score_a', e.target.value)} onFocus={(e) => e.target.select()} style={{ width: 48, padding: '6px', fontSize: 20, fontWeight: 700, textAlign: 'center', fontFamily: 'var(--font-display)' }} />
              <span style={{ color: 'var(--gray)' }}>-</span>
              <input className="input" type="number" inputMode="numeric" min="0" max="99" value={match.score_b} onChange={(e) => updateScore(match.id, 'score_b', e.target.value)} onFocus={(e) => e.target.select()} style={{ width: 48, padding: '6px', fontSize: 20, fontWeight: 700, textAlign: 'center', fontFamily: 'var(--font-display)' }} />
            </>
          ) : (
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 24 }}>
              {match.score_a} <span style={{ color: 'var(--gray)' }}>-</span> {match.score_b}
            </div>
          )}
        </div>

        <div style={{ textAlign: 'left', minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{teamB?.player1_name}</div>
          <div style={{ color: 'var(--gray)', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{teamB?.player2_name}</div>
        </div>
      </div>

      {isAdmin && (
        <div style={{ textAlign: 'center', marginTop: 8 }}>
          <button onClick={() => toggleMatchFinished(match)} style={{ padding: '5px 14px', fontSize: 10, fontFamily: 'var(--font-display)', letterSpacing: '0.1em', borderRadius: 6, background: match.is_finished ? 'transparent' : 'var(--neon)', color: match.is_finished ? 'var(--gray)' : 'var(--bg-deep)', border: match.is_finished ? '1px solid var(--line)' : 'none', cursor: 'pointer' }}>
            {match.is_finished ? '↺ ROUVRIR' : '✓ VALIDER'}
          </button>
        </div>
      )}
    </div>
  )
}
