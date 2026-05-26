import {
  computeCorporateStandings,
  computeLevelStandings,
} from '../lib/corporateLogic'

/**
 * Vue d'un tournoi INTER-ENTREPRISES
 * - Matchs groupés par niveau (avec terrain)
 * - Classement principal par entreprise
 * - Classement secondaire par niveau (panneau latéral)
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

  const corporateStandings = computeCorporateStandings(teams, matches, companyNames)
  const levelStandings = computeLevelStandings(teams, matches, maxLevel, companyNames)

  const teamById = (id) => teams.find((t) => t.id === id)
  const companyColor = (idx) => {
    const colors = ['var(--neon)', 'var(--coral)', 'var(--sand-warm)', '#5b9bd5', '#b07cc6', '#5fd0a0']
    return colors[idx % colors.length]
  }

  // Liste des niveaux qui ont des matchs
  const levelsWithMatches = [...new Set(matches.filter((m) => m.phase === 'corporate').map((m) => m.level))].sort((a, b) => a - b)

  return (
    <div>
      {/* CLASSEMENT PRINCIPAL PAR ENTREPRISE */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h2 className="h-display" style={{ fontSize: 26, marginBottom: 16, color: 'var(--neon)' }}>
          🏢 CLASSEMENT PAR ENTREPRISE
        </h2>
        <div style={{ display: 'grid', gap: 10 }}>
          {corporateStandings.map((s, i) => (
            <div
              key={s.company_index}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '14px 16px',
                background: i === 0 ? 'rgba(212, 255, 58, 0.1)' : 'var(--bg-deep)',
                border: `1px solid ${i === 0 ? 'var(--neon)' : 'var(--line)'}`,
                borderRadius: 10,
              }}
            >
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: i === 0 ? 'var(--neon)' : 'var(--white)', minWidth: 36 }}>
                {i + 1}
              </span>
              <div style={{ width: 6, alignSelf: 'stretch', borderRadius: 3, background: companyColor(s.company_index) }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 18 }}>{s.company_name}</div>
                <div style={{ color: 'var(--gray)', fontSize: 12 }}>
                  {s.played} match{s.played > 1 ? 's' : ''} joué{s.played > 1 ? 's' : ''} · {s.wins} victoire{s.wins > 1 ? 's' : ''}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--neon)' }}>{s.pointsFor}</div>
                <div style={{ fontSize: 11, color: 'var(--gray)' }}>jeux gagnés</div>
              </div>
              <div style={{ textAlign: 'right', minWidth: 50 }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 16, color: s.diff >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                  {s.diff > 0 ? `+${s.diff}` : s.diff}
                </div>
                <div style={{ fontSize: 11, color: 'var(--gray)' }}>diff.</div>
              </div>
            </div>
          ))}
        </div>
        <p style={{ color: 'var(--gray)', fontSize: 11, marginTop: 12 }}>
          🏆 Le classement par entreprise additionne les jeux gagnés par toutes ses équipes.
        </p>
      </div>

      {/* Layout : matchs à gauche, classement par niveau à droite (responsive) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr)',
          gap: 24,
        }}
        className="corporate-grid"
      >
        {/* MATCHS PAR NIVEAU */}
        <div>
          <h2 className="h-display" style={{ fontSize: 24, marginBottom: 16, color: 'var(--sand)' }}>
            🎾 MATCHS PAR NIVEAU
          </h2>
          {levelsWithMatches.map((lvl) => {
            const levelMatches = matches.filter((m) => m.phase === 'corporate' && m.level === lvl)
            return (
              <div key={lvl} className="card" style={{ marginBottom: 16 }}>
                <h3 className="h-display" style={{ fontSize: 20, marginBottom: 12, color: 'var(--neon)', letterSpacing: '0.08em' }}>
                  NIVEAU {lvl}
                </h3>

                {/* Classement de ce niveau (compact) */}
                {levelStandings[lvl] && levelStandings[lvl].length > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    {levelStandings[lvl].map((s, i) => (
                      <div
                        key={s.team.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '6px 10px',
                          background: 'var(--bg-deep)',
                          borderRadius: 6,
                          marginBottom: 4,
                          fontSize: 13,
                        }}
                      >
                        <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: i === 0 ? 'var(--neon)' : 'var(--gray)', minWidth: 20 }}>
                          {i + 1}
                        </span>
                        <div style={{ width: 4, alignSelf: 'stretch', borderRadius: 2, background: companyColor(s.team.company_index) }} />
                        <span style={{ flex: 1, minWidth: 0, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          <span style={{ color: 'var(--sand-warm)' }}>{s.company_name}</span>
                          <span style={{ color: 'var(--gray)', fontSize: 11 }}> · {s.team.player1_name}/{s.team.player2_name}</span>
                        </span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--success)' }}>{s.wins}V</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--neon)' }}>{s.pointsFor}pts</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Matchs du niveau */}
                <div style={{ display: 'grid', gap: 8 }}>
                  {levelMatches.map((m) => (
                    <CorporateMatchRow
                      key={m.id}
                      match={m}
                      teamA={teamById(m.team_a_id)}
                      teamB={teamById(m.team_b_id)}
                      companyNames={companyNames}
                      companyColor={companyColor}
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
      </div>
    </div>
  )
}

function CorporateMatchRow({ match, teamA, teamB, companyNames, companyColor, isAdmin, updateScore, toggleMatchFinished }) {
  const nameCompanyA = teamA ? companyNames[teamA.company_index] : '?'
  const nameCompanyB = teamB ? companyNames[teamB.company_index] : '?'

  return (
    <div
      style={{
        background: match.is_finished ? 'rgba(46, 213, 115, 0.06)' : 'var(--bg-deep)',
        border: `1px solid ${match.is_finished ? 'rgba(46, 213, 115, 0.3)' : 'var(--line)'}`,
        borderRadius: 10,
        padding: 12,
      }}
    >
      {/* En-tête terrain */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', color: 'var(--neon)', background: 'rgba(212,255,58,0.1)', padding: '2px 8px', borderRadius: 4 }}>
          🎾 TERRAIN {match.court_number}
        </span>
        {match.is_finished && <span style={{ color: 'var(--success)', fontSize: 11 }}>✓ Terminé</span>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 10, alignItems: 'center' }}>
        {/* Équipe A */}
        <div style={{ textAlign: 'right', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
            <span style={{ fontWeight: 700, fontSize: 13, color: companyColor(teamA?.company_index ?? 0) }}>{nameCompanyA}</span>
          </div>
          <div style={{ color: 'var(--gray)', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {teamA?.player1_name} / {teamA?.player2_name}
          </div>
        </div>

        {/* Scores */}
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

        {/* Équipe B */}
        <div style={{ textAlign: 'left', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontWeight: 700, fontSize: 13, color: companyColor(teamB?.company_index ?? 0) }}>{nameCompanyB}</span>
          </div>
          <div style={{ color: 'var(--gray)', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {teamB?.player1_name} / {teamB?.player2_name}
          </div>
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
