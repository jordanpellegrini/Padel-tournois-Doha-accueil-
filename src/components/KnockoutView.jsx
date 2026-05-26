import { useState } from 'react'
import {
  getNumPools,
  poolName,
  computePoolStandings,
  computeKnockoutFinalRanking,
} from '../lib/knockoutLogic'

/**
 * Vue d'un tournoi KNOCKOUT (poules + phases finales)
 * Affiche selon la phase :
 *  - 'pools' : les poules avec leurs matchs et classements
 *  - 'finals' : le bracket (quarts/demis/finale)
 */
export default function KnockoutView({
  tournament,
  teams,
  matches,
  isAdmin,
  updateScore,
  toggleMatchFinished,
  onEditTeam,
}) {
  const numPools = tournament.num_pools || getNumPools(teams.length)
  const phase = tournament.knockout_phase || 'pools'

  const poolStandings = computePoolStandings(teams, matches, numPools)
  const finalRanking = computeKnockoutFinalRanking(teams, matches)

  const teamById = (id) => teams.find((t) => t.id === id)

  return (
    <div>
      {/* Indicateur de phase */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          marginBottom: 20,
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            padding: '8px 18px',
            borderRadius: 8,
            background: phase === 'pools' ? 'var(--neon)' : 'var(--bg-mid)',
            color: phase === 'pools' ? 'var(--bg-deep)' : 'var(--gray)',
            fontFamily: 'var(--font-display)',
            letterSpacing: '0.1em',
            fontSize: 14,
            border: '1px solid var(--line)',
          }}
        >
          1 · POULES
        </div>
        <div style={{ alignSelf: 'center', color: 'var(--gray)' }}>→</div>
        <div
          style={{
            padding: '8px 18px',
            borderRadius: 8,
            background: phase === 'finals' ? 'var(--coral)' : 'var(--bg-mid)',
            color: phase === 'finals' ? 'var(--bg-deep)' : 'var(--gray)',
            fontFamily: 'var(--font-display)',
            letterSpacing: '0.1em',
            fontSize: 14,
            border: '1px solid var(--line)',
          }}
        >
          2 · PHASES FINALES
        </div>
      </div>

      {/* ============================================
          PHASE POULES
          ============================================ */}
      {phase === 'pools' && (
        <div style={{ display: 'grid', gap: 24 }}>
          {Array.from({ length: numPools }, (_, p) => {
            const poolMatches = matches.filter((m) => m.phase === 'pool' && m.pool_index === p)
            const standing = poolStandings[p] || []
            return (
              <div key={p} className="card">
                <h2
                  className="h-display"
                  style={{ fontSize: 26, marginBottom: 16, color: 'var(--neon)' }}
                >
                  🎾 POULE {poolName(p)}
                </h2>

                {/* Classement de la poule */}
                {standing.length > 0 && (
                  <div style={{ marginBottom: 20, overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 400 }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--line)' }}>
                          <th style={thStyle}>#</th>
                          <th style={{ ...thStyle, textAlign: 'left' }}>Équipe</th>
                          <th style={thStyle}>J</th>
                          <th style={thStyle}>V</th>
                          <th style={thStyle}>+/-</th>
                          <th style={thStyle}>Pts</th>
                        </tr>
                      </thead>
                      <tbody>
                        {standing.map((s, i) => {
                          // Les 2 premiers sont qualifiés
                          const qualified = i < 2
                          return (
                            <tr
                              key={s.team.id}
                              style={{
                                borderBottom: '1px solid var(--line)',
                                background: qualified ? 'rgba(212, 255, 58, 0.06)' : 'transparent',
                              }}
                            >
                              <td
                                style={{
                                  ...tdStyle,
                                  textAlign: 'center',
                                  fontFamily: 'var(--font-display)',
                                  fontSize: 18,
                                  color: qualified ? 'var(--neon)' : 'var(--white)',
                                }}
                              >
                                {i + 1}
                                {qualified && <span style={{ fontSize: 10 }}> ✓</span>}
                              </td>
                              <td style={tdStyle}>
                                <div style={{ fontWeight: 600, fontSize: 14 }}>{s.team.player1_name}</div>
                                <div style={{ color: 'var(--gray)', fontSize: 11 }}>+ {s.team.player2_name}</div>
                              </td>
                              <td style={{ ...tdStyle, textAlign: 'center' }}>{s.played}</td>
                              <td style={{ ...tdStyle, textAlign: 'center', color: 'var(--success)' }}>{s.wins}</td>
                              <td style={{ ...tdStyle, textAlign: 'center', color: s.diff >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                                {s.diff > 0 ? `+${s.diff}` : s.diff}
                              </td>
                              <td style={{ ...tdStyle, textAlign: 'center', fontFamily: 'var(--font-mono)' }}>{s.pointsFor}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                    <p style={{ color: 'var(--gray)', fontSize: 11, marginTop: 8 }}>
                      ✓ Les 2 premiers de chaque poule sont qualifiés pour les phases finales
                    </p>
                  </div>
                )}

                {/* Matchs de la poule */}
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

      {/* ============================================
          PHASE FINALES (BRACKET)
          ============================================ */}
      {phase === 'finals' && (
        <div>
          {/* Rappel des qualifiés */}
          <div className="card" style={{ marginBottom: 24 }}>
            <h3 className="h-display" style={{ fontSize: 18, marginBottom: 12, color: 'var(--sand)' }}>
              ÉQUIPES QUALIFIÉES
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
              {Array.from({ length: numPools }, (_, p) => {
                const standing = poolStandings[p] || []
                return (
                  <div key={p}>
                    <div style={{ color: 'var(--neon)', fontFamily: 'var(--font-display)', fontSize: 14, marginBottom: 6 }}>
                      POULE {poolName(p)}
                    </div>
                    {standing.slice(0, 2).map((s, i) => (
                      <div key={s.team.id} style={{ fontSize: 12, color: 'var(--white)', marginBottom: 2 }}>
                        <span style={{ color: 'var(--sand-warm)' }}>{i + 1}er</span> {s.team.player1_name} / {s.team.player2_name}
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Bracket : on affiche par phase */}
          <BracketSection
            label="QUARTS DE FINALE"
            matches={matches.filter((m) => m.phase === 'quarter')}
            teams={teams}
            isAdmin={isAdmin}
            updateScore={updateScore}
            toggleMatchFinished={toggleMatchFinished}
          />
          <BracketSection
            label="DEMI-FINALES"
            matches={matches.filter((m) => m.phase === 'semi')}
            teams={teams}
            isAdmin={isAdmin}
            updateScore={updateScore}
            toggleMatchFinished={toggleMatchFinished}
          />
          <BracketSection
            label="FINALE & 3E PLACE"
            matches={matches.filter((m) => m.phase === 'final' || m.phase === 'third')}
            teams={teams}
            isAdmin={isAdmin}
            updateScore={updateScore}
            toggleMatchFinished={toggleMatchFinished}
            highlight
          />

          {/* Classement final */}
          {finalRanking.length > 0 && (
            <div className="card" style={{ marginTop: 24, textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 8 }}>🏆</div>
              <h2 className="h-display" style={{ fontSize: 28, color: 'var(--neon)', marginBottom: 20 }}>
                PODIUM
              </h2>
              <div style={{ display: 'grid', gap: 10, maxWidth: 400, margin: '0 auto' }}>
                {finalRanking.map((r) => (
                  <div
                    key={r.rank}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      background: r.rank === 1 ? 'rgba(212, 255, 58, 0.1)' : 'var(--bg-deep)',
                      border: `1px solid ${r.rank === 1 ? 'var(--neon)' : 'var(--line)'}`,
                      borderRadius: 8,
                    }}
                  >
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, letterSpacing: '0.05em' }}>
                      {r.label}
                    </span>
                    <span style={{ fontWeight: 600, textAlign: 'right' }}>
                      {r.team?.player1_name} / {r.team?.player2_name}
                    </span>
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

// ============================================
// SOUS-COMPOSANTS
// ============================================

function BracketSection({ label, matches, teams, isAdmin, updateScore, toggleMatchFinished, highlight }) {
  const teamById = (id) => teams.find((t) => t.id === id)
  if (matches.length === 0) return null

  return (
    <div style={{ marginBottom: 24 }}>
      <h3
        className="h-display"
        style={{
          fontSize: 20,
          marginBottom: 12,
          color: highlight ? 'var(--neon)' : 'var(--sand-warm)',
          letterSpacing: '0.1em',
        }}
      >
        {label}
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
        {matches.map((m) => (
          <BracketMatchCard
            key={m.id}
            match={m}
            teamA={teamById(m.team_a_id)}
            teamB={teamById(m.team_b_id)}
            isAdmin={isAdmin}
            updateScore={updateScore}
            toggleMatchFinished={toggleMatchFinished}
            highlight={highlight}
          />
        ))}
      </div>
    </div>
  )
}

function BracketMatchCard({ match, teamA, teamB, isAdmin, updateScore, toggleMatchFinished, highlight }) {
  const bothTeamsKnown = match.team_a_id && match.team_b_id
  const canEdit = isAdmin && bothTeamsKnown

  const nameA = teamA ? `${teamA.player1_name} / ${teamA.player2_name}` : match.team_a_placeholder || '?'
  const nameB = teamB ? `${teamB.player1_name} / ${teamB.player2_name}` : match.team_b_placeholder || '?'

  const aWins = match.is_finished && match.score_a > match.score_b
  const bWins = match.is_finished && match.score_b > match.score_a

  return (
    <div
      style={{
        background: match.is_finished ? 'rgba(46, 213, 115, 0.06)' : 'var(--bg-mid)',
        border: `1px solid ${highlight ? 'var(--neon)' : 'var(--line)'}`,
        borderRadius: 12,
        padding: 14,
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 13,
          letterSpacing: '0.15em',
          color: highlight ? 'var(--neon)' : 'var(--sand-warm)',
          marginBottom: 12,
          textAlign: 'center',
        }}
      >
        {match.bracket_label}
      </div>

      {/* Équipe A */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          padding: '6px 0',
          opacity: teamA ? 1 : 0.5,
        }}
      >
        <span style={{ fontWeight: aWins ? 700 : 500, fontSize: 13, color: aWins ? 'var(--neon)' : 'var(--white)' }}>
          {aWins && '🏆 '}{nameA}
        </span>
        {canEdit ? (
          <input
            className="input"
            type="number"
            inputMode="numeric"
            min="0"
            max="99"
            value={match.score_a}
            onChange={(e) => updateScore(match.id, 'score_a', e.target.value)}
            onFocus={(e) => e.target.select()}
            style={{ width: 52, padding: '6px', fontSize: 20, fontWeight: 700, textAlign: 'center', fontFamily: 'var(--font-display)' }}
          />
        ) : (
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 22 }}>{bothTeamsKnown ? match.score_a : '-'}</span>
        )}
      </div>

      <div style={{ height: 1, background: 'var(--line)', margin: '4px 0' }} />

      {/* Équipe B */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          padding: '6px 0',
          opacity: teamB ? 1 : 0.5,
        }}
      >
        <span style={{ fontWeight: bWins ? 700 : 500, fontSize: 13, color: bWins ? 'var(--neon)' : 'var(--white)' }}>
          {bWins && '🏆 '}{nameB}
        </span>
        {canEdit ? (
          <input
            className="input"
            type="number"
            inputMode="numeric"
            min="0"
            max="99"
            value={match.score_b}
            onChange={(e) => updateScore(match.id, 'score_b', e.target.value)}
            onFocus={(e) => e.target.select()}
            style={{ width: 52, padding: '6px', fontSize: 20, fontWeight: 700, textAlign: 'center', fontFamily: 'var(--font-display)' }}
          />
        ) : (
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 22 }}>{bothTeamsKnown ? match.score_b : '-'}</span>
        )}
      </div>

      {/* Bouton valider */}
      {canEdit && (
        <button
          onClick={() => toggleMatchFinished(match)}
          style={{
            width: '100%',
            marginTop: 10,
            padding: '8px',
            fontSize: 11,
            fontFamily: 'var(--font-display)',
            letterSpacing: '0.1em',
            borderRadius: 6,
            background: match.is_finished ? 'transparent' : 'var(--neon)',
            color: match.is_finished ? 'var(--gray)' : 'var(--bg-deep)',
            border: match.is_finished ? '1px solid var(--line)' : 'none',
            cursor: 'pointer',
          }}
        >
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
    <div
      style={{
        background: match.is_finished ? 'rgba(46, 213, 115, 0.06)' : 'var(--bg-deep)',
        border: `1px solid ${match.is_finished ? 'rgba(46, 213, 115, 0.3)' : 'var(--line)'}`,
        borderRadius: 10,
        padding: 12,
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        gap: 10,
        alignItems: 'center',
      }}
    >
      <div style={{ textAlign: 'right', minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 13 }}>{teamA?.player1_name}</div>
        <div style={{ color: 'var(--gray)', fontSize: 11 }}>{teamA?.player2_name}</div>
      </div>

      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        {isAdmin ? (
          <>
            <input
              className="input"
              type="number"
              inputMode="numeric"
              min="0"
              max="99"
              value={match.score_a}
              onChange={(e) => updateScore(match.id, 'score_a', e.target.value)}
              onFocus={(e) => e.target.select()}
              style={{ width: 48, padding: '6px', fontSize: 20, fontWeight: 700, textAlign: 'center', fontFamily: 'var(--font-display)' }}
            />
            <span style={{ color: 'var(--gray)' }}>-</span>
            <input
              className="input"
              type="number"
              inputMode="numeric"
              min="0"
              max="99"
              value={match.score_b}
              onChange={(e) => updateScore(match.id, 'score_b', e.target.value)}
              onFocus={(e) => e.target.select()}
              style={{ width: 48, padding: '6px', fontSize: 20, fontWeight: 700, textAlign: 'center', fontFamily: 'var(--font-display)' }}
            />
          </>
        ) : (
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 24 }}>
            {match.score_a} <span style={{ color: 'var(--gray)' }}>-</span> {match.score_b}
          </div>
        )}
      </div>

      <div style={{ textAlign: 'left', minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 13 }}>{teamB?.player1_name}</div>
        <div style={{ color: 'var(--gray)', fontSize: 11 }}>{teamB?.player2_name}</div>
      </div>

      {isAdmin && (
        <div style={{ gridColumn: '1 / -1', textAlign: 'center', marginTop: 4 }}>
          <button
            onClick={() => toggleMatchFinished(match)}
            style={{
              padding: '5px 14px',
              fontSize: 10,
              fontFamily: 'var(--font-display)',
              letterSpacing: '0.1em',
              borderRadius: 6,
              background: match.is_finished ? 'transparent' : 'var(--neon)',
              color: match.is_finished ? 'var(--gray)' : 'var(--bg-deep)',
              border: match.is_finished ? '1px solid var(--line)' : 'none',
              cursor: 'pointer',
            }}
          >
            {match.is_finished ? '↺ ROUVRIR' : '✓ VALIDER'}
          </button>
        </div>
      )}
    </div>
  )
}

const thStyle = {
  padding: '10px 6px',
  textAlign: 'center',
  fontFamily: 'var(--font-display)',
  fontSize: 12,
  letterSpacing: '0.1em',
  color: 'var(--sand-warm)',
}

const tdStyle = {
  padding: '10px 6px',
}
