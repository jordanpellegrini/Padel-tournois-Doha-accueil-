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
import {
  getNumPools,
  distributeIntoPools,
  generatePoolMatches,
  generateFinalsBracket,
  resolveBracket,
} from '../lib/knockoutLogic'
import { generateCorporateMatches, computeCorporateStandings } from '../lib/corporateLogic'
import { computeKnockoutFinalRanking } from '../lib/knockoutLogic'
import MatchTimer from '../components/MatchTimer'
import KnockoutView from '../components/KnockoutView'
import CorporateView from '../components/CorporateView'
import CorporateSetup from '../components/CorporateSetup'
import FinalPodium from '../components/FinalPodium'

export default function TournamentPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { canManageTournament, currentUser } = useAuth()

  const [tournament, setTournament] = useState(null)
  const [teams, setTeams] = useState([])
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [showDrawModal, setShowDrawModal] = useState(false)
  const [currentRound, setCurrentRound] = useState(1)

  const [editingTeam, setEditingTeam] = useState(null)
  const [editingName, setEditingName] = useState(false)
  const [editingSettings, setEditingSettings] = useState(false)

  const [p1, setP1] = useState('')
  const [p2, setP2] = useState('')

  const isKnockout = tournament?.tournament_type === 'knockout'
  const isCorporate = tournament?.tournament_type === 'corporate'
  // Droit de GÉRER ce tournoi : super-admin (tous) ou organisateur créateur (les siens)
  const isAdmin = canManageTournament(tournament)

  useEffect(() => {
    loadAll()
    const ch = supabase
      .channel(`tournament-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams', filter: `tournament_id=eq.${id}` }, () => loadTeams())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches', filter: `tournament_id=eq.${id}` }, () => loadMatches())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tournaments', filter: `id=eq.${id}` }, () => loadTournament())
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [id])

  // À chaque changement de matchs, on tente de résoudre le bracket (knockout)
  useEffect(() => {
    if (isKnockout && tournament?.knockout_phase === 'finals' && isAdmin) {
      tryResolveBracket()
    }
  }, [matches, tournament])

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
    const { data } = await supabase.from('teams').select('*').eq('tournament_id', id).order('created_at')
    if (data) setTeams(data)
  }

  const loadMatches = async () => {
    const { data } = await supabase.from('matches').select('*').eq('tournament_id', id).order('round_number').order('court_number')
    if (data) setMatches(data)
  }

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

  const updateTeam = async (teamId, newP1, newP2) => {
    if (!newP1.trim() || !newP2.trim()) {
      alert('Les 2 noms sont obligatoires')
      return
    }
    await supabase
      .from('teams')
      .update({ player1_name: newP1.trim(), player2_name: newP2.trim(), team_name: `${newP1.trim()} / ${newP2.trim()}` })
      .eq('id', teamId)
    setEditingTeam(null)
  }

  const drawTeamsOrder = async () => {
    const shuffled = shuffleTeams(teams)
    alert('Ordre tiré au sort :\n\n' + shuffled.map((t, i) => `${i + 1}. ${t.team_name || `${t.player1_name} / ${t.player2_name}`}`).join('\n'))
    setShowDrawModal(false)
  }

  const drawNewPairs = async () => {
    if (!confirm('Cela va SUPPRIMER les équipes actuelles et reformer des paires aléatoires. Continuer ?')) return
    const newPairs = shufflePlayers(teams)
    await supabase.from('teams').delete().eq('tournament_id', id)
    await supabase.from('teams').insert(
      newPairs.map((p) => ({ tournament_id: id, player1_name: p.player1_name, player2_name: p.player2_name, team_name: p.team_name }))
    )
    setShowDrawModal(false)
  }

  // ============================================
  // LANCEMENT TOURNOI AU TEMPS (points)
  // ============================================
  const launchPointsTournament = async () => {
    if (teams.length < 2) {
      alert('Il faut au moins 2 équipes')
      return
    }
    const numRounds = computeNumRounds(tournament.total_duration_minutes, tournament.match_duration_minutes, tournament.break_duration_minutes)
    if (numRounds === 0) {
      alert('La durée totale est insuffisante')
      return
    }
    const schedule = generateSchedule(teams, tournament.num_courts, numRounds)
    await supabase.from('matches').delete().eq('tournament_id', id)
    await supabase.from('matches').insert(
      schedule.map((m) => ({
        tournament_id: id,
        round_number: m.round_number,
        court_number: m.court_number,
        team_a_id: m.team_a_id,
        team_b_id: m.team_b_id,
        phase: 'pool', // réutilise 'pool' comme phase neutre
      }))
    )
    await updateSetup({ status: 'running' })
    setCurrentRound(1)
  }

  // ============================================
  // LANCEMENT TOURNOI KNOCKOUT - PHASE POULES
  // ============================================
  const launchKnockoutPools = async () => {
    if (teams.length < 4) {
      alert('Il faut au moins 4 équipes pour un tournoi knockout')
      return
    }
    const numPools = getNumPools(teams.length)

    // Vérif : assez d'équipes par poule (min 2 par poule pour avoir un 1er et 2e)
    if (teams.length < numPools * 2) {
      alert(`Il faut au moins ${numPools * 2} équipes pour ${numPools} poules`)
      return
    }

    // Répartit les équipes dans les poules
    const distribution = distributeIntoPools(teams, numPools)

    // Met à jour le pool_index de chaque équipe
    for (const { team, poolIndex } of distribution) {
      await supabase.from('teams').update({ pool_index: poolIndex }).eq('id', team.id)
    }

    // Recharge les équipes avec leur pool_index
    const { data: updatedTeams } = await supabase.from('teams').select('*').eq('tournament_id', id).order('created_at')

    // Génère les matchs de poule
    const poolMatches = generatePoolMatches(updatedTeams, numPools, tournament.num_courts)
    await supabase.from('matches').delete().eq('tournament_id', id)
    await supabase.from('matches').insert(
      poolMatches.map((m) => ({
        tournament_id: id,
        phase: m.phase,
        pool_index: m.pool_index,
        round_number: m.round_number,
        court_number: m.court_number,
        team_a_id: m.team_a_id,
        team_b_id: m.team_b_id,
        bracket_label: m.bracket_label,
      }))
    )

    await updateSetup({ status: 'running', num_pools: numPools, knockout_phase: 'pools' })
    setCurrentRound(1)
  }

  // ============================================
  // FONCTIONS INTER-ENTREPRISES
  // ============================================
  // Ajoute une équipe à une entreprise/niveau précis
  const addTeamCorporate = async (companyIndex, level, np1, np2) => {
    await supabase.from('teams').insert({
      tournament_id: id,
      player1_name: np1,
      player2_name: np2,
      team_name: `${np1} / ${np2}`,
      company_index: companyIndex,
      level: level,
    })
  }

  const launchCorporate = async () => {
    const numCompanies = tournament.num_companies || 4
    const maxLevel = tournament.teams_per_company || 8

    // Vérifie qu'il y a au moins 2 équipes par niveau pour pouvoir jouer
    const levelsOk = []
    for (let lvl = 1; lvl <= maxLevel; lvl++) {
      const count = teams.filter((t) => t.level === lvl).length
      if (count >= 2) levelsOk.push(lvl)
    }
    if (levelsOk.length === 0) {
      alert('Ajoute au moins 2 équipes de même niveau pour pouvoir lancer le tournoi')
      return
    }

    const companyNames = tournament.company_names || []
    const matchesToCreate = generateCorporateMatches(teams, numCompanies, maxLevel, tournament.num_courts)

    await supabase.from('matches').delete().eq('tournament_id', id)
    await supabase.from('matches').insert(
      matchesToCreate.map((m) => ({
        tournament_id: id,
        phase: m.phase,
        level: m.level,
        round_number: m.round_number,
        court_number: m.court_number,
        team_a_id: m.team_a_id,
        team_b_id: m.team_b_id,
        bracket_label: m.bracket_label,
      }))
    )
    await updateSetup({ status: 'running' })
    setCurrentRound(1)
  }

  // ============================================
  // TRANSITION POULES -> PHASES FINALES
  // ============================================
  const startFinals = async () => {
    const poolMatches = matches.filter((m) => m.phase === 'pool')
    const allFinished = poolMatches.length > 0 && poolMatches.every((m) => m.is_finished)
    if (!allFinished) {
      if (!confirm('Tous les matchs de poule ne sont pas terminés. Lancer quand même les phases finales ?')) return
    }

    const numPools = tournament.num_pools || getNumPools(teams.length)
    const maxPoolRound = Math.max(...poolMatches.map((m) => m.round_number), 0)

    // Génère le bracket (en répartissant sur le nombre de terrains du tournoi)
    const bracket = generateFinalsBracket(numPools, maxPoolRound + 1, tournament.num_courts || 4)
    await supabase.from('matches').insert(
      bracket.map((m) => ({
        tournament_id: id,
        phase: m.phase,
        round_number: m.round_number,
        court_number: m.court_number,
        bracket_label: m.bracket_label,
        team_a_placeholder: m.team_a_placeholder,
        team_b_placeholder: m.team_b_placeholder,
        team_a_id: m.team_a_id,
        team_b_id: m.team_b_id,
      }))
    )

    await updateSetup({ knockout_phase: 'finals' })
  }

  // Résout les placeholders du bracket (qualifiés, vainqueurs...)
  const tryResolveBracket = async () => {
    const numPools = tournament.num_pools || getNumPools(teams.length)
    const updates = resolveBracket(teams, matches, numPools)
    for (const u of updates) {
      await supabase.from('matches').update({ team_a_id: u.team_a_id, team_b_id: u.team_b_id }).eq('id', u.matchId)
    }
  }

  const updateScore = async (matchId, field, value) => {
    const v = Math.max(0, Math.min(99, parseInt(value) || 0))
    await supabase.from('matches').update({ [field]: v }).eq('id', matchId)
  }

  const toggleMatchFinished = async (match) => {
    await supabase.from('matches').update({ is_finished: !match.is_finished }).eq('id', match.id)
  }

  const finishTournament = async () => {
    if (!confirm('Terminer définitivement le tournoi ?')) return
    await updateSetup({ status: 'finished' })
  }

  const reopenTournament = async () => {
    await updateSetup({ status: 'running' })
  }

  const backToSetup = async () => {
    if (!confirm('Retour à la configuration ?')) return
    await updateSetup({ status: 'setup', knockout_phase: isKnockout ? 'pools' : null })
  }

  const deleteTournament = async () => {
    if (!confirm('Supprimer définitivement ce tournoi ?')) return
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
          <Link to="/" className="btn btn-primary" style={{ marginTop: 20 }}>Retour à l'accueil</Link>
        </div>
      </main>
    )
  }

  const numRoundsPossible = computeNumRounds(tournament.total_duration_minutes, tournament.match_duration_minutes, tournament.break_duration_minutes)
  const roundPhases = isCorporate ? ['corporate'] : ['pool']
  const totalRounds = Math.max(...matches.filter((m) => roundPhases.includes(m.phase)).map((m) => m.round_number), 0)
  const finishedRounds = [...new Set(matches.filter((m) => m.is_finished && roundPhases.includes(m.phase)).map((m) => m.round_number))]
  const standings = computeStandings(teams, matches)
  const poolMatchesAllFinished = (() => {
    const pm = matches.filter((m) => m.phase === 'pool')
    return pm.length > 0 && pm.every((m) => m.is_finished)
  })()

  // ============================================
  // CONSTRUCTION DU PODIUM FINAL (selon le type)
  // ============================================
  const buildPodiumEntries = () => {
    if (isCorporate) {
      // Classement par entreprise (jeux gagnés)
      const cs = computeCorporateStandings(teams, matches, tournament.company_names || [])
      return cs.map((s, i) => ({
        rank: i + 1,
        name: s.company_name,
        sub: `${s.wins} victoire${s.wins > 1 ? 's' : ''} · diff ${s.diff > 0 ? '+' : ''}${s.diff}`,
        value: s.pointsFor,
        valueLabel: 'jeux',
      }))
    }
    if (isKnockout) {
      // Classement final knockout (toujours rempli grâce au fallback)
      const kr = computeKnockoutFinalRanking(teams, matches)
      return kr
        .filter((r) => r.team)
        .map((r) => ({
          rank: r.rank,
          name: r.team.team_name || `${r.team.player1_name} / ${r.team.player2_name}`,
          sub: r.team.team_name ? `${r.team.player1_name} / ${r.team.player2_name}` : null,
        }))
    }
    // Tournoi au temps : classement par points
    return standings.map((s, i) => ({
      rank: i + 1,
      name: s.team.team_name || `${s.team.player1_name} / ${s.team.player2_name}`,
      sub: `${s.wins} victoire${s.wins > 1 ? 's' : ''} · diff ${s.diff > 0 ? '+' : ''}${s.diff}`,
      value: s.pointsFor,
      valueLabel: 'jeux',
    }))
  }

  return (
    <main className="container">
      {/* En-tête */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32, gap: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Link to="/" style={{ color: 'var(--gray)', textDecoration: 'none', fontSize: 14 }}>← Retour</Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            <h1 className="h-display" style={{ fontSize: 'clamp(28px, 6vw, 56px)', minWidth: 0, wordBreak: 'break-word' }}>{tournament.name}</h1>
            {isAdmin && (
              <button onClick={() => setEditingName(true)} style={{ background: 'transparent', border: '1px solid var(--line)', borderRadius: 6, padding: '4px 8px', color: 'var(--sand-warm)', fontSize: 14, cursor: 'pointer' }} title="Renommer">✏️</button>
            )}
            <Link to={`/rules/${id}`} style={{ background: 'transparent', border: '1px solid var(--neon)', borderRadius: 6, padding: '6px 12px', color: 'var(--neon)', fontSize: 13, fontFamily: 'var(--font-display)', letterSpacing: '0.1em', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }} title="Voir le règlement">
              📄 RÈGLEMENT
            </Link>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
            <span className="badge" style={{ background: isCorporate ? 'rgba(201, 169, 110, 0.15)' : isKnockout ? 'rgba(255, 107, 74, 0.15)' : 'rgba(212, 255, 58, 0.15)', color: isCorporate ? 'var(--sand-warm)' : isKnockout ? 'var(--coral)' : 'var(--neon)' }}>
              {isCorporate ? '🏢 Inter-entreprises' : isKnockout ? '🏆 Knockout' : '🎯 Au temps'}
            </span>
            <span style={{ color: 'var(--gray)', fontSize: 14 }}>
              {new Date(tournament.tournament_date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {tournament.status === 'setup' && <span className="badge badge-warm">CONFIGURATION</span>}
          {tournament.status === 'running' && <span className="badge">EN COURS</span>}
          {tournament.status === 'finished' && <span className="badge badge-coral">TERMINÉ</span>}
          {isAdmin && (
            <button className="btn btn-ghost btn-small" onClick={deleteTournament} style={{ color: 'var(--danger)' }}>🗑</button>
          )}
        </div>
      </div>

      {/* ============================================
          SETUP (commun aux 2 types)
          ============================================ */}
      {tournament.status === 'setup' && (
        <>
          {isCorporate ? (
            <>
              <CorporateSetup
                tournament={tournament}
                isAdmin={isAdmin}
                teams={teams}
                onUpdateTournament={updateSetup}
                onAddTeam={addTeamCorporate}
                onDeleteTeam={deleteTeam}
                onEditTeam={setEditingTeam}
              />
              {isAdmin && (
                <div className="card" style={{ marginTop: 24, textAlign: 'center' }}>
                  <div style={{ marginBottom: 16, color: 'var(--gray)' }}>
                    {teams.length === 0
                      ? 'Ajoute les équipes de chaque entreprise par niveau'
                      : `${teams.length} équipes enregistrées · chaque équipe jouera ${(tournament.num_companies || 4) - 1} match(s)`}
                  </div>
                  <button className="btn btn-primary" onClick={launchCorporate} disabled={teams.length < 2} style={{ fontSize: 22, padding: '16px 40px', background: 'var(--sand-warm)', color: 'var(--bg-deep)' }}>
                    🏢 Lancer le tournoi
                  </button>
                </div>
              )}
            </>
          ) : (
            <>
              <SetupPanel tournament={tournament} onUpdate={updateSetup} isAdmin={isAdmin} numRoundsPossible={numRoundsPossible} isKnockout={isKnockout} numTeams={teams.length} />
              <TeamsPanel teams={teams} isAdmin={isAdmin} p1={p1} p2={p2} setP1={setP1} setP2={setP2} addTeam={addTeam} deleteTeam={deleteTeam} onEditTeam={setEditingTeam} onOpenDraw={() => setShowDrawModal(true)} />

              {isAdmin && (
                <div className="card" style={{ marginTop: 24, textAlign: 'center' }}>
                  {isKnockout ? (
                    <>
                      <div style={{ marginBottom: 16, color: 'var(--gray)' }}>
                        {teams.length < 4
                          ? `Ajoute au moins 4 équipes (${teams.length} actuelle${teams.length > 1 ? 's' : ''})`
                          : `Prêt : ${teams.length} équipes → ${getNumPools(teams.length)} poules · phase de poules au temps`}
                      </div>
                      <button className="btn btn-primary" onClick={launchKnockoutPools} disabled={teams.length < 4} style={{ fontSize: 22, padding: '16px 40px' }}>
                        🏆 Lancer les poules
                      </button>
                    </>
                  ) : (
                    <>
                      <div style={{ marginBottom: 16, color: 'var(--gray)' }}>
                        {teams.length < 2
                          ? `Ajoute au moins 2 équipes (${teams.length} actuelle${teams.length > 1 ? 's' : ''})`
                          : numRoundsPossible === 0
                          ? 'Durée totale trop courte'
                          : `Prêt : ${teams.length} équipes · ${numRoundsPossible} round${numRoundsPossible > 1 ? 's' : ''} · ${tournament.num_courts} terrain${tournament.num_courts > 1 ? 's' : ''}`}
                      </div>
                      <button className="btn btn-primary" onClick={launchPointsTournament} disabled={teams.length < 2 || numRoundsPossible === 0} style={{ fontSize: 22, padding: '16px 40px' }}>
                        🚀 Lancer le tournoi
                      </button>
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ============================================
          RUNNING
          ============================================ */}
      {tournament.status === 'running' && (
        <>
          {/* Timer (commun) */}
          {isAdmin && (
            <MatchTimer
              matchDuration={tournament.match_duration_minutes}
              breakDuration={tournament.break_duration_minutes}
              currentRound={currentRound}
              totalRounds={totalRounds}
              onMatchEnd={() => {}}
              onBreakEnd={() => setCurrentRound((r) => Math.min(r + 1, totalRounds))}
            />
          )}

          {isAdmin && (
            <div style={{ marginTop: 16, marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
              <button className="btn btn-ghost btn-small" onClick={() => setEditingSettings(true)}>⚙ Modifier durées</button>
            </div>
          )}

          {/* ===== VUE SELON LE TYPE ===== */}
          {isCorporate ? (
            <CorporateView
              tournament={tournament}
              teams={teams}
              matches={matches}
              isAdmin={isAdmin}
              updateScore={updateScore}
              toggleMatchFinished={toggleMatchFinished}
            />
          ) : isKnockout ? (
            <>
              <KnockoutView
                tournament={tournament}
                teams={teams}
                matches={matches}
                isAdmin={isAdmin}
                updateScore={updateScore}
                toggleMatchFinished={toggleMatchFinished}
                onEditTeam={setEditingTeam}
              />

              {/* Bouton transition poules -> finales */}
              {isAdmin && tournament.knockout_phase === 'pools' && (
                <div className="card" style={{ marginTop: 24, textAlign: 'center' }}>
                  <div style={{ marginBottom: 16, color: poolMatchesAllFinished ? 'var(--neon)' : 'var(--gray)' }}>
                    {poolMatchesAllFinished
                      ? '✅ Toutes les poules sont terminées !'
                      : '⏳ Termine tous les matchs de poule, puis lance les phases finales'}
                  </div>
                  <button className="btn btn-primary" onClick={startFinals} style={{ fontSize: 20, padding: '14px 32px', background: 'var(--coral)', color: 'var(--bg-deep)' }}>
                    🏆 Lancer les phases finales
                  </button>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Sélecteur de round (au temps) */}
              <div style={{ display: 'flex', gap: 8, marginTop: 8, marginBottom: 20, overflowX: 'auto', paddingBottom: 8 }}>
                {Array.from({ length: totalRounds }, (_, i) => i + 1).map((r) => {
                  const isFinished = finishedRounds.includes(r)
                  const isCurrent = r === currentRound
                  return (
                    <button key={r} onClick={() => setCurrentRound(r)} style={{ padding: '10px 18px', border: `2px solid ${isCurrent ? 'var(--neon)' : 'var(--line)'}`, background: isCurrent ? 'var(--neon)' : 'var(--bg-mid)', color: isCurrent ? 'var(--bg-deep)' : 'var(--white)', fontFamily: 'var(--font-display)', letterSpacing: '0.1em', borderRadius: 8, whiteSpace: 'nowrap' }}>
                      R{r} {isFinished && '✓'}
                    </button>
                  )
                })}
              </div>

              <CourtsLayout matches={matches.filter((m) => m.round_number === currentRound)} teams={teams} isAdmin={isAdmin} updateScore={updateScore} toggleMatchFinished={toggleMatchFinished} />

              <Standings standings={standings} isAdmin={isAdmin} onEditTeam={setEditingTeam} />
            </>
          )}

          {isAdmin && (
            <div style={{ display: 'flex', gap: 12, marginTop: 24, flexWrap: 'wrap' }}>
              <button className="btn btn-secondary" onClick={backToSetup}>← Retour config</button>
              <button className="btn btn-primary" onClick={finishTournament}>🏆 Terminer le tournoi</button>
            </div>
          )}
        </>
      )}

      {/* ============================================
          FINISHED
          ============================================ */}
      {tournament.status === 'finished' && (
        <>
          {/* PODIUM FINAL EN GRAND (tous types) */}
          <FinalPodium
            title="CLASSEMENT FINAL"
            entries={buildPodiumEntries()}
          />

          {/* Détail selon le type (sous le podium) */}
          {isCorporate ? (
            <CorporateView tournament={tournament} teams={teams} matches={matches} isAdmin={false} updateScore={updateScore} toggleMatchFinished={toggleMatchFinished} />
          ) : isKnockout ? (
            <KnockoutView tournament={tournament} teams={teams} matches={matches} isAdmin={false} updateScore={updateScore} toggleMatchFinished={toggleMatchFinished} onEditTeam={setEditingTeam} hideFinalRanking />
          ) : (
            <Standings standings={standings} isAdmin={isAdmin} onEditTeam={setEditingTeam} />
          )}

          {isAdmin && (
            <div style={{ display: 'flex', gap: 12, marginTop: 24, flexWrap: 'wrap', justifyContent: 'center' }}>
              <button className="btn btn-ghost" onClick={reopenTournament}>↺ Réouvrir le tournoi</button>
              <button className="btn btn-primary" onClick={() => navigate('/')}>✓ Clôturer · retour à l'accueil</button>
            </div>
          )}
        </>
      )}

      {/* MODALES */}
      {showDrawModal && (
        <div className="modal-backdrop" onClick={() => setShowDrawModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="h-display" style={{ fontSize: 32, marginBottom: 8 }}>TIRAGE AU SORT</h2>
            <p style={{ color: 'var(--gray)', marginBottom: 24, fontSize: 14 }}>Choisis ton mode de tirage</p>
            <button className="btn btn-primary" onClick={drawTeamsOrder} style={{ width: '100%', marginBottom: 12, justifyContent: 'flex-start', textAlign: 'left' }}>
              <div>
                <div style={{ fontSize: 16 }}>🎲 Tirer l'ordre des équipes</div>
                <div style={{ fontSize: 11, opacity: 0.7, textTransform: 'none', letterSpacing: 'normal' }}>Garde les paires actuelles</div>
              </div>
            </button>
            <button className="btn btn-secondary" onClick={drawNewPairs} style={{ width: '100%', justifyContent: 'flex-start', textAlign: 'left' }}>
              <div>
                <div style={{ fontSize: 16 }}>🔀 Mélanger les joueurs</div>
                <div style={{ fontSize: 11, opacity: 0.7, textTransform: 'none', letterSpacing: 'normal' }}>Reforme des paires aléatoires</div>
              </div>
            </button>
            <button className="btn btn-ghost" onClick={() => setShowDrawModal(false)} style={{ width: '100%', marginTop: 16 }}>Annuler</button>
          </div>
        </div>
      )}

      {editingTeam && <EditTeamModal team={editingTeam} onSave={updateTeam} onClose={() => setEditingTeam(null)} />}
      {editingName && <EditNameModal currentName={tournament.name} onSave={async (newName) => { await updateSetup({ name: newName }); setEditingName(false) }} onClose={() => setEditingName(false)} />}
      {editingSettings && <EditSettingsModal tournament={tournament} onSave={async (patch) => { await updateSetup(patch); setEditingSettings(false) }} onClose={() => setEditingSettings(false)} />}
    </main>
  )
}

// ============================================
// SOUS-COMPOSANTS COMMUNS
// ============================================

function SetupPanel({ tournament, onUpdate, isAdmin, numRoundsPossible, isKnockout, numTeams }) {
  return (
    <div className="card" style={{ marginBottom: 24 }}>
      <h2 className="h-display" style={{ fontSize: 24, marginBottom: 20, color: 'var(--sand)' }}>⚙ CONFIGURATION</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 16 }}>
        <div>
          <label className="label">Durée totale (min)</label>
          <input className="input" type="number" min="20" value={tournament.total_duration_minutes} disabled={!isAdmin} onChange={(e) => onUpdate({ total_duration_minutes: parseInt(e.target.value) || 0 })} />
        </div>
        <div>
          <label className="label">Durée match (min)</label>
          <input className="input" type="number" min="1" value={tournament.match_duration_minutes} disabled={!isAdmin} onChange={(e) => onUpdate({ match_duration_minutes: parseInt(e.target.value) || 0 })} />
        </div>
        <div>
          <label className="label">Pause (min)</label>
          <input className="input" type="number" min="0" value={tournament.break_duration_minutes} disabled={!isAdmin} onChange={(e) => onUpdate({ break_duration_minutes: parseInt(e.target.value) || 0 })} />
        </div>
        <div>
          <label className="label">Nb terrains</label>
          <input className="input" type="number" min="1" max="20" value={tournament.num_courts} disabled={!isAdmin} onChange={(e) => onUpdate({ num_courts: parseInt(e.target.value) || 1 })} />
        </div>
      </div>
      <div style={{ marginTop: 20, padding: 16, background: 'var(--bg-deep)', borderRadius: 8, border: '1px solid var(--line)' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '0.15em', color: 'var(--sand-warm)' }}>📊 SIMULATION</div>
        {isKnockout ? (
          <div style={{ marginTop: 8, fontSize: 15 }}>
            {numTeams >= 4
              ? `${numTeams} équipes → ${getNumPools(numTeams)} poules de ~${Math.ceil(numTeams / getNumPools(numTeams))} · puis ${getNumPools(numTeams) === 2 ? 'demi-finales' : 'quarts'} → finale`
              : 'Ajoute au moins 4 équipes'}
          </div>
        ) : (
          <div style={{ marginTop: 8, fontSize: 15 }}>
            {numRoundsPossible} round{numRoundsPossible > 1 ? 's' : ''} possibles · {numRoundsPossible * tournament.num_courts} match{numRoundsPossible * tournament.num_courts > 1 ? 's' : ''} max
          </div>
        )}
      </div>
    </div>
  )
}

function TeamsPanel({ teams, isAdmin, p1, p2, setP1, setP2, addTeam, deleteTeam, onEditTeam, onOpenDraw }) {
  return (
    <div className="card" style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <h2 className="h-display" style={{ fontSize: 24, color: 'var(--sand)' }}>👥 ÉQUIPES <span style={{ color: 'var(--gray)', fontSize: 18 }}>({teams.length})</span></h2>
        {isAdmin && teams.length >= 2 && <button className="btn btn-secondary btn-small" onClick={onOpenDraw}>🎲 Tirage au sort</button>}
      </div>
      {isAdmin && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 12, marginBottom: 20 }}>
          <input className="input" placeholder="Joueur 1" value={p1} onChange={(e) => setP1(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addTeam()} />
          <input className="input" placeholder="Joueur 2" value={p2} onChange={(e) => setP2(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addTeam()} />
          <button className="btn btn-primary" onClick={addTeam}>+</button>
        </div>
      )}
      {teams.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 32, color: 'var(--gray)' }}>{isAdmin ? 'Ajoute la première équipe ↑' : 'Aucune équipe'}</div>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {teams.map((t, idx) => (
            <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--bg-deep)', border: '1px solid var(--line)', borderRadius: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                <span style={{ fontFamily: 'var(--font-display)', color: 'var(--neon)', fontSize: 20, minWidth: 32 }}>{String(idx + 1).padStart(2, '0')}</span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{t.player1_name}</div>
                  <div style={{ color: 'var(--gray)', fontSize: 13 }}>+ {t.player2_name}</div>
                </div>
              </div>
              {isAdmin && (
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => onEditTeam(t)} style={{ color: 'var(--sand-warm)', fontSize: 16, padding: '4px 8px', background: 'transparent', border: 'none', cursor: 'pointer' }} title="Modifier">✏️</button>
                  <button onClick={() => deleteTeam(t.id)} style={{ color: 'var(--danger)', fontSize: 20, padding: '4px 8px', background: 'transparent', border: 'none', cursor: 'pointer' }}>×</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function CourtsLayout({ matches, teams, isAdmin, updateScore, toggleMatchFinished, readOnly }) {
  const teamById = (tid) => teams.find((t) => t.id === tid)
  if (matches.length === 0) return <div style={{ padding: 32, textAlign: 'center', color: 'var(--gray)' }}>Aucun match</div>
  const courtsUsed = [...new Set(matches.map((m) => m.court_number))].sort((a, b) => a - b)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${courtsUsed.length}, minmax(0, 1fr))`, gap: 12 }}>
      {courtsUsed.map((courtNum) => {
        const courtMatches = matches.filter((m) => m.court_number === courtNum)
        return (
          <div key={courtNum}>
            <div style={{ background: 'var(--bg-mid)', border: '1px solid var(--line)', borderRadius: '12px 12px 0 0', padding: '10px 14px', textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: 16, letterSpacing: '0.15em', color: 'var(--neon)', borderBottom: 'none' }}>
              🎾 TERRAIN {courtNum}
            </div>
            <div style={{ display: 'grid', gap: 8, border: '1px solid var(--line)', borderTop: 'none', borderRadius: '0 0 12px 12px', padding: 8, background: 'rgba(17, 42, 64, 0.4)' }}>
              {courtMatches.map((m) => (
                <CourtMatchCard key={m.id} match={m} teamA={teamById(m.team_a_id)} teamB={teamById(m.team_b_id)} isAdmin={isAdmin} readOnly={readOnly} updateScore={updateScore} toggleMatchFinished={toggleMatchFinished} />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function CourtMatchCard({ match, teamA, teamB, isAdmin, readOnly, updateScore, toggleMatchFinished }) {
  const scoreInputStyle = { width: 60, padding: '10px 8px', fontSize: 24, fontWeight: 700, textAlign: 'center', fontFamily: 'var(--font-display)' }
  const scoreDisplayStyle = { fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, minWidth: 32, textAlign: 'center' }

  return (
    <div style={{ background: match.is_finished ? 'rgba(46, 213, 115, 0.08)' : 'var(--bg-deep)', border: `1px solid ${match.is_finished ? 'rgba(46, 213, 115, 0.3)' : 'var(--line)'}`, borderRadius: 10, padding: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{teamA?.player1_name}</div>
          <div style={{ color: 'var(--gray)', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{teamA?.player2_name}</div>
        </div>
        {isAdmin && !readOnly ? (
          <input className="input" type="number" inputMode="numeric" min="0" max="99" value={match.score_a} onChange={(e) => updateScore(match.id, 'score_a', e.target.value)} onFocus={(e) => e.target.select()} style={scoreInputStyle} />
        ) : (
          <div style={scoreDisplayStyle}>{match.score_a}</div>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '8px 0' }}>
        <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
        <span style={{ color: 'var(--gray)', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.2em' }}>VS</span>
        <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{teamB?.player1_name}</div>
          <div style={{ color: 'var(--gray)', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{teamB?.player2_name}</div>
        </div>
        {isAdmin && !readOnly ? (
          <input className="input" type="number" inputMode="numeric" min="0" max="99" value={match.score_b} onChange={(e) => updateScore(match.id, 'score_b', e.target.value)} onFocus={(e) => e.target.select()} style={scoreInputStyle} />
        ) : (
          <div style={scoreDisplayStyle}>{match.score_b}</div>
        )}
      </div>
      {isAdmin && !readOnly && (
        <button onClick={() => toggleMatchFinished(match)} style={{ width: '100%', marginTop: 10, padding: '8px', fontSize: 11, fontFamily: 'var(--font-display)', letterSpacing: '0.1em', borderRadius: 6, background: match.is_finished ? 'transparent' : 'var(--neon)', color: match.is_finished ? 'var(--gray)' : 'var(--bg-deep)', border: match.is_finished ? '1px solid var(--line)' : 'none', cursor: 'pointer' }}>
          {match.is_finished ? '↺ ROUVRIR' : '✓ VALIDER'}
        </button>
      )}
      {readOnly && match.is_finished && <div style={{ textAlign: 'center', marginTop: 6, color: 'var(--success)', fontSize: 11 }}>✓ Terminé</div>}
    </div>
  )
}

function Standings({ standings, isAdmin, onEditTeam }) {
  if (standings.length === 0) return null
  return (
    <div className="card" style={{ marginTop: 24 }}>
      <h2 className="h-display" style={{ fontSize: 24, marginBottom: 16, color: 'var(--sand)' }}>🏅 CLASSEMENT</h2>
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
              {isAdmin && <th style={thStyle}></th>}
            </tr>
          </thead>
          <tbody>
            {standings.map((s, i) => (
              <tr key={s.team.id} style={{ borderBottom: '1px solid var(--line)' }}>
                <td style={{ ...tdStyle, textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: 20, color: i === 0 ? 'var(--neon)' : 'var(--white)' }}>{i + 1}</td>
                <td style={tdStyle}>
                  <div style={{ fontWeight: 600 }}>{s.team.player1_name}</div>
                  <div style={{ color: 'var(--gray)', fontSize: 12 }}>+ {s.team.player2_name}</div>
                </td>
                <td style={{ ...tdStyle, textAlign: 'center' }}>{s.played}</td>
                <td style={{ ...tdStyle, textAlign: 'center', color: 'var(--success)' }}>{s.wins}</td>
                <td style={{ ...tdStyle, textAlign: 'center', color: s.diff >= 0 ? 'var(--success)' : 'var(--danger)' }}>{s.diff > 0 ? `+${s.diff}` : s.diff}</td>
                <td style={{ ...tdStyle, textAlign: 'center', fontFamily: 'var(--font-mono)' }}>{s.pointsFor}</td>
                {isAdmin && (
                  <td style={{ ...tdStyle, textAlign: 'center' }}>
                    <button onClick={() => onEditTeam(s.team)} style={{ color: 'var(--sand-warm)', fontSize: 16, padding: '4px 8px', background: 'transparent', border: 'none', cursor: 'pointer' }} title="Corriger un nom">✏️</button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function EditTeamModal({ team, onSave, onClose }) {
  const [p1, setP1] = useState(team.player1_name)
  const [p2, setP2] = useState(team.player2_name)
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2 className="h-display" style={{ fontSize: 28, marginBottom: 8 }}>✏️ MODIFIER L'ÉQUIPE</h2>
        <p style={{ color: 'var(--gray)', marginBottom: 20, fontSize: 14 }}>Corrige les noms des joueurs</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label className="label">Joueur 1</label>
            <input className="input" value={p1} onChange={(e) => setP1(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && onSave(team.id, p1, p2)} autoFocus />
          </div>
          <div>
            <label className="label">Joueur 2</label>
            <input className="input" value={p2} onChange={(e) => setP2(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && onSave(team.id, p1, p2)} />
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <button className="btn btn-primary" onClick={() => onSave(team.id, p1, p2)} style={{ flex: 1 }}>💾 Sauvegarder</button>
            <button className="btn btn-ghost" onClick={onClose}>Annuler</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function EditNameModal({ currentName, onSave, onClose }) {
  const [name, setName] = useState(currentName)
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2 className="h-display" style={{ fontSize: 28, marginBottom: 20 }}>✏️ RENOMMER LE TOURNOI</h2>
        <div>
          <label className="label">Nom du tournoi</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && name.trim() && onSave(name.trim())} autoFocus />
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
          <button className="btn btn-primary" onClick={() => name.trim() && onSave(name.trim())} style={{ flex: 1 }}>💾 Sauvegarder</button>
          <button className="btn btn-ghost" onClick={onClose}>Annuler</button>
        </div>
      </div>
    </div>
  )
}

function EditSettingsModal({ tournament, onSave, onClose }) {
  const [matchDur, setMatchDur] = useState(tournament.match_duration_minutes)
  const [breakDur, setBreakDur] = useState(tournament.break_duration_minutes)
  const handleSave = () => onSave({ match_duration_minutes: parseInt(matchDur) || 1, break_duration_minutes: parseInt(breakDur) || 0 })
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2 className="h-display" style={{ fontSize: 28, marginBottom: 8 }}>⚙ MODIFIER LES DURÉES</h2>
        <p style={{ color: 'var(--gray)', marginBottom: 20, fontSize: 14 }}>S'applique au prochain timer.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label className="label">Durée match (min)</label>
            <input className="input" type="number" min="1" value={matchDur} onChange={(e) => setMatchDur(e.target.value)} autoFocus />
          </div>
          <div>
            <label className="label">Durée pause (min)</label>
            <input className="input" type="number" min="0" value={breakDur} onChange={(e) => setBreakDur(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <button className="btn btn-primary" onClick={handleSave} style={{ flex: 1 }}>💾 Sauvegarder</button>
            <button className="btn btn-ghost" onClick={onClose}>Annuler</button>
          </div>
        </div>
      </div>
    </div>
  )
}

const thStyle = { padding: '12px 8px', textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: 13, letterSpacing: '0.1em', color: 'var(--sand-warm)' }
const tdStyle = { padding: '12px 8px' }
