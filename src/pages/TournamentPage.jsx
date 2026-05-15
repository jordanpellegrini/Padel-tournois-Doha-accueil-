import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import {
  computeNumRounds,
  generateSchedule,
  shuffleTeams,
  shufflePlayers,
  computeStandings,
} from '../lib/tournamentLogic'
import MatchTimer from '../components/MatchTimer'

export default function TournamentPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isAdmin } = useAuth()

  const [tournament, setTournament] = useState(null)
  const [teams, setTeams] = useState([])
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [showDrawModal, setShowDrawModal] = useState(false)
  const [currentRound, setCurrentRound] = useState(1)

  // Form ajout équipe
  const [p1, setP1] = useState('')
  const [p2, setP2] = useState('')

  useEffect(() => {
    loadAll()
    // Realtime
    const ch = supabase
      .channel(`tournament-${id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'teams', filter: `tournament_id=eq.${id}` },
        () => loadTeams()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'matches', filter: `tournament_id=eq.${id}` },
        () => loadMatches()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tournaments', filter: `id=eq.${id}` },
        () => loadTournament()
      )
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [id])

  const loadAll = async () => {
    setLoading(true)
    await Promise.all([loadTournament(), loadTeams(), loadMatches()])
    setLoading(false)
  }

  const loadTournament = async () => {
    const { data } = await supabase.from('tournaments').select('*').eq('id', id).single()
    if (data) setTournament(data)
  }

  const loadTeams = async () => {
    const { data } = await supabase
      .from('teams')
      .select('*')
      .eq('tournament_id', id)
      .order('created_at')
    if (data) setTeams(data)
  }

  const loadMatches = async () => {
    const { data } = await supabase
      .from('matches')
      .select('*')
      .eq('tournament_id', id)
      .order('round_number')
      .order('court_number')
    if (data) setMatches(data)
  }

  // ============================================
  // ACTIONS
  // ============================================
  const updateSetup = async (patch) => {
    await supabase.from('tournaments').update(patch).eq('id', id)
  }

  const addTeam = async () => {
    if (!p1.trim() || !p2.trim()) {
      alert('Renseigne les 2 joueurs')
      return
    }
    await supabase.from('teams').insert({
      tournament_id: id,
      player1_name: p1.trim(),
      player2_name: p2.trim(),
      team_name: `${p1.trim()} / ${p2.trim()}`,
    })
    setP1('')
    setP2('')
  }

  const deleteTeam = async (teamId) => {
    if (!confirm('Supprimer cette équipe ?')) return
    await supabase.from('teams').delete().eq('id', teamId)
  }

  const drawTeamsOrder = async () => {
    // Mélange l'ordre d'affichage seulement (visuel) — l'ordre n'a pas d'impact réel sur le planning
    const shuffled = shuffleTeams(teams)
    alert(
      'Ordre tiré au sort :\n\n' +
        shuffled
          .map((t, i) => `${i + 1}. ${t.team_name || `${t.player1_name} / ${t.player2_name}`}`)
          .join('\n')
    )
    setShowDrawModal(false)
  }

  const drawNewPairs = async () => {
    if (
      !confirm(
        'Cela va SUPPRIMER les équipes actuelles et reformer des paires aléatoires à partir des joueurs. Continuer ?'
      )
    )
      return

    const newPairs = shufflePlayers(teams)
    // Delete existing
    await supabase.from('teams').delete().eq('tournament_id', id)
    // Insert new
    await supabase.from('teams').insert(
      newPairs.map((p) => ({
        tournament_id: id,
        player1_name: p.player1_name,
        player2_name: p.player2_name,
        team_name: p.team_name,
      }))
    )
    setShowDrawModal(false)
  }

  const launchTournament = async () => {
    if (teams.length < 2) {
      alert('Il faut au moins 2 équipes')
      return
    }
    const numRounds = computeNumRounds(
      tournament.total_duration_minutes,
      tournament.match_duration_minutes,
      tournament.break_duration_minutes
    )
    if (numRounds === 0) {
      alert('La durée totale est insuffisante pour faire au moins un round')
      return
    }
    const schedule = generateSchedule(teams, tournament.num_courts, numRounds)

    // Supprimer anciens matchs et insérer les nouveaux
    await supabase.from('matches').delete().eq('tournament_id', id)
    await supabase.from('matches').insert(
      schedule.map((m) => ({
        tournament_id: id,
        round_number: m.round_number,
        court_number: m.court_number,
        team_a_id: m.team_a_id,
        team_b_id: m.team_b_id,
      }))
    )
    await updateSetup({ status: 'running' })
    setCurrentRound(1)
  }

  const updateScore = async (matchId, field, value) => {
    const v = Math.max(0, parseInt(value) || 0)
    await supabase.from('matches').update({ [field]: v }).eq('id', matchId)
  }

  const toggleMatchFinished = async (match) => {
    await supabase
      .from('matches')
      .update({ is_finished: !match.is_finished })
      .eq('id', match.id)
  }

  const finishTournament = async () => {
    if (!confirm('Terminer définitivement le tournoi ?')) return
    await updateSetup({ status: 'finished' })
  }

  const reopenTournament = async () => {
    await updateSetup({ status: 'running' })
  }

  const backToSetup = async () => {
    if (!confirm('Retour à la configuration ? Le planning actuel sera conservé.')) return
    await updateSetup({ status: 'setup' })
  }

  const deleteTournament = async () => {
    if (!confirm('Supprimer définitivement ce tournoi et toutes ses données ?')) return
    await supabase.from('tournaments').delete().eq('id', id)
    navigate('/')
  }

  if (loading) {
    return (
      <main className="container">
        <div style={{ textAlign: 'center', padding: 80, color: 'var(--gray)' }}>Chargement...</div>
      </main>
    )
  }

  if (!tournament) {
    return (
      <main className="container">
        <div style={{ textAlign: 'center', padding: 80 }}>
          <p>Tournoi introuvable</p>
          <Link to="/" className="btn btn-primary" style={{ marginTop: 20 }}>
            Retour à l'accueil
          </Link>
        </div>
      </main>
    )
  }

  const numRoundsPossible = computeNumRounds(
    tournament.total_duration_minutes,
    tournament.match_duration_minutes,
    tournament.break_duration_minutes
  )
  const totalRounds = Math.max(...matches.map((m) => m.round_number), 0)
  const finishedRounds = [...new Set(matches.filter((m) => m.is_finished).map((m) => m.round_number))]
  const standings = computeStandings(teams, matches)

  // ============================================
  // RENDER
  // ============================================
  return (
    <main className="container">
      {/* En-tête tournoi */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 32,
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <Link to="/" style={{ color: 'var(--gray)', textDecoration: 'none', fontSize: 14 }}>
            ← Retour
          </Link>
          <h1 className="h-display" style={{ fontSize: 'clamp(36px, 6vw, 56px)', marginTop: 8 }}>
            {tournament.name}
          </h1>
          <div style={{ color: 'var(--gray)', marginTop: 4 }}>
            {new Date(tournament.tournament_date).toLocaleDateString('fr-FR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {tournament.status === 'setup' && <span className="badge badge-warm">CONFIGURATION</span>}
          {tournament.status === 'running' && <span className="badge">EN COURS</span>}
          {tournament.status === 'finished' && <span className="badge badge-coral">TERMINÉ</span>}
          {isAdmin && (
            <button className="btn btn-ghost btn-small" onClick={deleteTournament} style={{ color: 'var(--danger)' }}>
              🗑
            </button>
          )}
        </div>
      </div>

      {/* ============================================
          ÉTAPE 1 : SETUP
          ============================================ */}
      {tournament.status === 'setup' && (
        <>
          <SetupPanel
            tournament={tournament}
            onUpdate={updateSetup}
            isAdmin={isAdmin}
            numRoundsPossible={numRoundsPossible}
          />

          <TeamsPanel
            teams={teams}
            isAdmin={isAdmin}
            p1={p1}
            p2={p2}
            setP1={setP1}
            setP2={setP2}
            addTeam={addTeam}
            deleteTeam={deleteTeam}
            onOpenDraw={() => setShowDrawModal(true)}
          />

          {/* Bouton lancer */}
          {isAdmin && (
            <div className="card" style={{ marginTop: 24, textAlign: 'center' }}>
              <div style={{ marginBottom: 16, color: 'var(--gray)' }}>
                {teams.length < 2
                  ? `Ajoute au moins 2 équipes (${teams.length} actuelle${teams.length > 1 ? 's' : ''})`
                  : numRoundsPossible === 0
                  ? 'Durée totale trop courte'
                  : `Prêt : ${teams.length} équipes · ${numRoundsPossible} round${
                      numRoundsPossible > 1 ? 's' : ''
                    } · ${tournament.num_courts} terrain${tournament.num_courts > 1 ? 's' : ''}`}
              </div>
              <button
                className="btn btn-primary"
                onClick={launchTournament}
                disabled={teams.length < 2 || numRoundsPossible === 0}
                style={{ fontSize: 22, padding: '16px 40px' }}
              >
                🚀 Lancer le tournoi
              </button>
            </div>
          )}
        </>
      )}

      {/* ============================================
          ÉTAPE 2 : RUNNING
          ============================================ */}
      {tournament.status === 'running' && (
        <>
          {/* Timer */}
          {isAdmin && (
            <MatchTimer
              matchDuration={tournament.match_duration_minutes}
              breakDuration={tournament.break_duration_minutes}
              currentRound={currentRound}
              totalRounds={totalRounds}
              onMatchEnd={() => {
                // rien, on attend que l'admin saisisse les scores
              }}
              onBreakEnd={() => setCurrentRound((r) => Math.min(r + 1, totalRounds))}
            />
          )}

          {/* Sélection round */}
          <div
            style={{
              display: 'flex',
              gap: 8,
              marginTop: 24,
              marginBottom: 16,
              overflowX: 'auto',
              paddingBottom: 8,
            }}
          >
            {Array.from({ length: totalRounds }, (_, i) => i + 1).map((r) => {
              const isFinished = finishedRounds.includes(r)
              const isCurrent = r === currentRound
              return (
                <button
                  key={r}
                  onClick={() => setCurrentRound(r)}
                  style={{
                    padding: '10px 18px',
                    border: `2px solid ${isCurrent ? 'var(--neon)' : 'var(--line)'}`,
                    background: isCurrent ? 'var(--neon)' : 'var(--bg-mid)',
                    color: isCurrent ? 'var(--bg-deep)' : 'var(--white)',
                    fontFamily: 'var(--font-display)',
                    letterSpacing: '0.1em',
                    borderRadius: 8,
                    whiteSpace: 'nowrap',
                  }}
                >
                  R{r} {isFinished && '✓'}
                </button>
              )
            })}
          </div>

          {/* Matchs du round courant */}
          <RoundMatches
            matches={matches.filter((m) => m.round_number === currentRound)}
            teams={teams}
            isAdmin={isAdmin}
            updateScore={updateScore}
            toggleMatchFinished={toggleMatchFinished}
          />

          {/* Classement */}
          <Standings standings={standings} />

          {/* Actions admin */}
          {isAdmin && (
            <div style={{ display: 'flex', gap: 12, marginTop: 24, flexWrap: 'wrap' }}>
              <button className="btn btn-secondary" onClick={backToSetup}>
                ← Retour config
              </button>
              <button className="btn btn-primary" onClick={finishTournament}>
                🏆 Terminer le tournoi
              </button>
            </div>
          )}
        </>
      )}

      {/* ============================================
          ÉTAPE 3 : FINISHED
          ============================================ */}
      {tournament.status === 'finished' && (
        <>
          <div className="card" style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ fontSize: 64, marginBottom: 8 }}>🏆</div>
            <h2 className="h-display" style={{ fontSize: 36, color: 'var(--neon)' }}>
              TOURNOI TERMINÉ
            </h2>
            {standings.length > 0 && (
              <p style={{ marginTop: 12, color: 'var(--sand)' }}>
                Vainqueurs : <strong>{standings[0].team.team_name}</strong>
              </p>
            )}
          </div>

          <Standings standings={standings} />

          {/* Détail des matchs par round */}
          <h3 className="h-display" style={{ fontSize: 24, marginTop: 32, marginBottom: 16 }}>
            DÉTAIL DES MATCHS
          </h3>
          {Array.from({ length: totalRounds }, (_, i) => i + 1).map((r) => (
            <div key={r} style={{ marginBottom: 24 }}>
              <h4 style={{ marginBottom: 12, color: 'var(--sand-warm)', fontFamily: 'var(--font-display)', fontSize: 20 }}>
                ROUND {r}
              </h4>
              <RoundMatches
                matches={matches.filter((m) => m.round_number === r)}
                teams={teams}
                isAdmin={false}
                readOnly
              />
            </div>
          ))}

          {isAdmin && (
            <div style={{ marginTop: 24 }}>
              <button className="btn btn-ghost" onClick={reopenTournament}>
                ↺ Réouvrir le tournoi
              </button>
            </div>
          )}
        </>
      )}

      {/* ============================================
          MODAL TIRAGE AU SORT
          ============================================ */}
      {showDrawModal && (
        <div className="modal-backdrop" onClick={() => setShowDrawModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="h-display" style={{ fontSize: 32, marginBottom: 8 }}>
              TIRAGE AU SORT
            </h2>
            <p style={{ color: 'var(--gray)', marginBottom: 24, fontSize: 14 }}>
              Choisis ton mode de tirage
            </p>

            <button
              className="btn btn-primary"
              onClick={drawTeamsOrder}
              style={{ width: '100%', marginBottom: 12, justifyContent: 'flex-start', textAlign: 'left' }}
            >
              <div>
                <div style={{ fontSize: 16 }}>🎲 Tirer l'ordre des équipes</div>
                <div style={{ fontSize: 11, opacity: 0.7, textTransform: 'none', letterSpacing: 'normal' }}>
                  Garde les paires actuelles
                </div>
              </div>
            </button>

            <button
              className="btn btn-secondary"
              onClick={drawNewPairs}
              style={{ width: '100%', justifyContent: 'flex-start', textAlign: 'left' }}
            >
              <div>
                <div style={{ fontSize: 16 }}>🔀 Mélanger les joueurs</div>
                <div style={{ fontSize: 11, opacity: 0.7, textTransform: 'none', letterSpacing: 'normal' }}>
                  Reforme des paires aléatoires
                </div>
              </div>
            </button>

            <button
              className="btn btn-ghost"
              onClick={() => setShowDrawModal(false)}
              style={{ width: '100%', marginTop: 16 }}
            >
              Annuler
            </button>
          </div>
        </div>
      )}
    </main>
  )
}

// ============================================
// SOUS-COMPOSANTS
// ============================================

function SetupPanel({ tournament, onUpdate, isAdmin, numRoundsPossible }) {
  return (
    <div className="card" style={{ marginBottom: 24 }}>
      <h2 className="h-display" style={{ fontSize: 24, marginBottom: 20, color: 'var(--sand)' }}>
        ⚙ CONFIGURATION
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
        <div>
          <label className="label">Durée totale (min)</label>
          <input
            className="input"
            type="number"
            min="20"
            value={tournament.total_duration_minutes}
            disabled={!isAdmin}
            onChange={(e) => onUpdate({ total_duration_minutes: parseInt(e.target.value) || 0 })}
          />
        </div>
        <div>
          <label className="label">Durée match (min)</label>
          <input
            className="input"
            type="number"
            min="1"
            value={tournament.match_duration_minutes}
            disabled={!isAdmin}
            onChange={(e) => onUpdate({ match_duration_minutes: parseInt(e.target.value) || 0 })}
          />
        </div>
        <div>
          <label className="label">Pause (min)</label>
          <input
            className="input"
            type="number"
            min="0"
            value={tournament.break_duration_minutes}
            disabled={!isAdmin}
            onChange={(e) => onUpdate({ break_duration_minutes: parseInt(e.target.value) || 0 })}
          />
        </div>
        <div>
          <label className="label">Nb terrains</label>
          <input
            className="input"
            type="number"
            min="1"
            max="20"
            value={tournament.num_courts}
            disabled={!isAdmin}
            onChange={(e) => onUpdate({ num_courts: parseInt(e.target.value) || 1 })}
          />
        </div>
      </div>

      <div
        style={{
          marginTop: 20,
          padding: 16,
          background: 'var(--bg-deep)',
          borderRadius: 8,
          border: '1px solid var(--line)',
        }}
      >
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '0.15em', color: 'var(--sand-warm)' }}>
          📊 SIMULATION
        </div>
        <div style={{ marginTop: 8, fontSize: 15 }}>
          {numRoundsPossible} round{numRoundsPossible > 1 ? 's' : ''} possibles ·{' '}
          {numRoundsPossible * tournament.num_courts} match{numRoundsPossible * tournament.num_courts > 1 ? 's' : ''} max
        </div>
      </div>
    </div>
  )
}

function TeamsPanel({ teams, isAdmin, p1, p2, setP1, setP2, addTeam, deleteTeam, onOpenDraw }) {
  return (
    <div className="card" style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <h2 className="h-display" style={{ fontSize: 24, color: 'var(--sand)' }}>
          👥 ÉQUIPES <span style={{ color: 'var(--gray)', fontSize: 18 }}>({teams.length})</span>
        </h2>
        {isAdmin && teams.length >= 2 && (
          <button className="btn btn-secondary btn-small" onClick={onOpenDraw}>
            🎲 Tirage au sort
          </button>
        )}
      </div>

      {isAdmin && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr auto',
            gap: 12,
            marginBottom: 20,
          }}
        >
          <input
            className="input"
            placeholder="Joueur 1"
            value={p1}
            onChange={(e) => setP1(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addTeam()}
          />
          <input
            className="input"
            placeholder="Joueur 2"
            value={p2}
            onChange={(e) => setP2(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addTeam()}
          />
          <button className="btn btn-primary" onClick={addTeam}>
            +
          </button>
        </div>
      )}

      {teams.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 32, color: 'var(--gray)' }}>
          {isAdmin ? 'Ajoute la première équipe ↑' : 'Aucune équipe pour le moment'}
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {teams.map((t, idx) => (
            <div
              key={t.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 16px',
                background: 'var(--bg-deep)',
                border: '1px solid var(--line)',
                borderRadius: 8,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span
                  style={{
                    fontFamily: 'var(--font-display)',
                    color: 'var(--neon)',
                    fontSize: 20,
                    minWidth: 32,
                  }}
                >
                  {String(idx + 1).padStart(2, '0')}
                </span>
                <div>
                  <div style={{ fontWeight: 600 }}>{t.player1_name}</div>
                  <div style={{ color: 'var(--gray)', fontSize: 13 }}>+ {t.player2_name}</div>
                </div>
              </div>
              {isAdmin && (
                <button onClick={() => deleteTeam(t.id)} style={{ color: 'var(--danger)', fontSize: 18 }}>
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function RoundMatches({ matches, teams, isAdmin, updateScore, toggleMatchFinished, readOnly }) {
  const teamById = (tid) => teams.find((t) => t.id === tid)

  if (matches.length === 0) {
    return <div style={{ padding: 32, textAlign: 'center', color: 'var(--gray)' }}>Aucun match</div>
  }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {matches.map((m) => {
        const teamA = teamById(m.team_a_id)
        const teamB = teamById(m.team_b_id)
        return (
          <div
            key={m.id}
            className="card"
            style={{
              padding: 16,
              background: m.is_finished ? 'rgba(46, 213, 115, 0.08)' : 'var(--bg-mid)',
              borderColor: m.is_finished ? 'rgba(46, 213, 115, 0.3)' : 'var(--line)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 12,
              }}
            >
              <span
                className="badge"
                style={{ background: 'rgba(212, 255, 58, 0.2)' }}
              >
                TERRAIN {m.court_number}
              </span>
              {m.is_finished && <span style={{ color: 'var(--success)', fontSize: 14 }}>✓ Terminé</span>}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 12, alignItems: 'center' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 600 }}>{teamA?.player1_name}</div>
                <div style={{ color: 'var(--gray)', fontSize: 13 }}>{teamA?.player2_name}</div>
              </div>

              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                {isAdmin && !readOnly ? (
                  <>
                    <input
                      className="input"
                      type="number"
                      min="0"
                      value={m.score_a}
                      onChange={(e) => updateScore(m.id, 'score_a', e.target.value)}
                      style={{ width: 56, padding: 8, fontSize: 22, textAlign: 'center', fontFamily: 'var(--font-display)' }}
                    />
                    <span style={{ color: 'var(--gray)' }}>–</span>
                    <input
                      className="input"
                      type="number"
                      min="0"
                      value={m.score_b}
                      onChange={(e) => updateScore(m.id, 'score_b', e.target.value)}
                      style={{ width: 56, padding: 8, fontSize: 22, textAlign: 'center', fontFamily: 'var(--font-display)' }}
                    />
                  </>
                ) : (
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, letterSpacing: '0.08em' }}>
                    {m.score_a} <span style={{ color: 'var(--gray)' }}>–</span> {m.score_b}
                  </div>
                )}
              </div>

              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 600 }}>{teamB?.player1_name}</div>
                <div style={{ color: 'var(--gray)', fontSize: 13 }}>{teamB?.player2_name}</div>
              </div>
            </div>

            {isAdmin && !readOnly && (
              <div style={{ marginTop: 12, textAlign: 'center' }}>
                <button
                  className={m.is_finished ? 'btn btn-ghost btn-small' : 'btn btn-primary btn-small'}
                  onClick={() => toggleMatchFinished(m)}
                >
                  {m.is_finished ? '↺ Rouvrir' : '✓ Valider le score'}
                </button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function Standings({ standings }) {
  if (standings.length === 0) return null
  return (
    <div className="card" style={{ marginTop: 24 }}>
      <h2 className="h-display" style={{ fontSize: 24, marginBottom: 16, color: 'var(--sand)' }}>
        🏅 CLASSEMENT
      </h2>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 500 }}>
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
            {standings.map((s, i) => (
              <tr key={s.team.id} style={{ borderBottom: '1px solid var(--line)' }}>
                <td style={{ ...tdStyle, textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: 20, color: i === 0 ? 'var(--neon)' : 'var(--white)' }}>
                  {i + 1}
                </td>
                <td style={tdStyle}>
                  <div style={{ fontWeight: 600 }}>{s.team.player1_name}</div>
                  <div style={{ color: 'var(--gray)', fontSize: 12 }}>+ {s.team.player2_name}</div>
                </td>
                <td style={{ ...tdStyle, textAlign: 'center' }}>{s.played}</td>
                <td style={{ ...tdStyle, textAlign: 'center', color: 'var(--success)' }}>{s.wins}</td>
                <td style={{ ...tdStyle, textAlign: 'center', color: s.diff >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                  {s.diff > 0 ? `+${s.diff}` : s.diff}
                </td>
                <td style={{ ...tdStyle, textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
                  {s.pointsFor}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const thStyle = {
  padding: '12px 8px',
  textAlign: 'center',
  fontFamily: 'var(--font-display)',
  fontSize: 13,
  letterSpacing: '0.1em',
  color: 'var(--sand-warm)',
}

const tdStyle = {
  padding: '12px 8px',
}
