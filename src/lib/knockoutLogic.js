// ============================================
// LOGIQUE KNOCKOUT (poules + phases finales + consolante)
// ============================================
import { shuffle, computeStandings } from './tournamentLogic'

export function getNumPools(numTeams) {
  if (numTeams <= 8) return 2
  return 4
}

export function poolName(index) {
  return String.fromCharCode(65 + index)
}

export function distributeIntoPools(teams, numPools) {
  const shuffled = shuffle(teams)
  const result = []
  let dir = 1
  let poolIdx = 0
  shuffled.forEach((team) => {
    result.push({ team, poolIndex: poolIdx })
    poolIdx += dir
    if (poolIdx >= numPools) {
      poolIdx = numPools - 1
      dir = -1
    } else if (poolIdx < 0) {
      poolIdx = 0
      dir = 1
    }
  })
  return result
}

function buildRoundRobinRounds(teamIds) {
  const teams = [...teamIds]
  if (teams.length % 2 === 1) teams.push(null)
  const n = teams.length
  const numRounds = n - 1
  const half = n / 2
  const rounds = []
  const rotating = teams.slice(1)
  for (let r = 0; r < numRounds; r++) {
    const roundMatches = []
    const first = teams[0]
    const opponent = rotating[0]
    if (first !== null && opponent !== null) roundMatches.push([first, opponent])
    for (let i = 1; i < half; i++) {
      const a = rotating[i]
      const b = rotating[rotating.length - i]
      if (a !== null && b !== null) roundMatches.push([a, b])
    }
    rounds.push(roundMatches)
    rotating.unshift(rotating.pop())
  }
  return rounds
}

export function generatePoolMatches(teamsWithPool, numPools, numCourts) {
  const poolRounds = []
  for (let p = 0; p < numPools; p++) {
    const poolTeams = teamsWithPool.filter((t) => t.pool_index === p).map((t) => t.id)
    poolRounds[p] = buildRoundRobinRounds(poolTeams)
  }
  const maxRounds = Math.max(...poolRounds.map((r) => r.length), 0)
  const matches = []
  let globalRound = 0

  for (let r = 0; r < maxRounds; r++) {
    const roundMatchesAllPools = []
    for (let p = 0; p < numPools; p++) {
      if (poolRounds[p][r]) {
        poolRounds[p][r].forEach((pair) => {
          roundMatchesAllPools.push({ poolIndex: p, pair })
        })
      }
    }
    let courtCounter = 0
    let currentGlobalRound = globalRound + 1
    roundMatchesAllPools.forEach((m) => {
      if (courtCounter >= numCourts) {
        currentGlobalRound++
        courtCounter = 0
      }
      matches.push({
        phase: 'pool',
        pool_index: m.poolIndex,
        round_number: currentGlobalRound,
        court_number: courtCounter + 1,
        team_a_id: m.pair[0],
        team_b_id: m.pair[1],
        bracket_label: `POULE ${poolName(m.poolIndex)}`,
      })
      courtCounter++
    })
    globalRound = currentGlobalRound
  }
  return matches
}

export function computePoolStandings(teams, matches, numPools) {
  const standings = {}
  for (let p = 0; p < numPools; p++) {
    const poolTeams = teams.filter((t) => t.pool_index === p)
    const poolMatches = matches.filter((m) => m.phase === 'pool' && m.pool_index === p)
    standings[p] = computeStandings(poolTeams, poolMatches)
  }
  return standings
}

/**
 * Génère le bracket complet (principal + consolante) avec affectation aux terrains.
 * @param {number} numPools
 * @param {number} startRound
 * @param {number} numCourts
 */
export function generateFinalsBracket(numPools, startRound, numCourts = 4) {
  const matches = []
  let round = startRound

  if (numPools === 2) {
    // ===== TABLEAU PRINCIPAL : demi-finales =====
    // ===== TABLEAU CONSOLANTE : demi-consolantes =====
    // On joue les 4 demies en même temps (réparties sur les terrains)
    const semisRound = round
    const semis = [
      { phase: 'semi', bracket_label: 'DEMI-FINALE 1', a: '1er Poule A', b: '2e Poule B' },
      { phase: 'semi', bracket_label: 'DEMI-FINALE 2', a: '1er Poule B', b: '2e Poule A' },
      { phase: 'cons-semi', bracket_label: 'CONSOLANTE 1', a: '3e Poule A', b: '4e Poule B' },
      { phase: 'cons-semi', bracket_label: 'CONSOLANTE 2', a: '3e Poule B', b: '4e Poule A' },
    ]
    semis.forEach((m, i) => {
      matches.push({
        phase: m.phase,
        round_number: semisRound + Math.floor(i / numCourts),
        court_number: (i % numCourts) + 1,
        bracket_label: m.bracket_label,
        team_a_placeholder: m.a,
        team_b_placeholder: m.b,
        team_a_id: null,
        team_b_id: null,
      })
    })

    // ===== FINALES (principal + consolante) =====
    const finalsRound = semisRound + Math.ceil(semis.length / numCourts)
    const finals = [
      { phase: 'final', bracket_label: 'FINALE', a: 'Vainqueur DF1', b: 'Vainqueur DF2' },
      { phase: 'third', bracket_label: '3E PLACE', a: 'Perdant DF1', b: 'Perdant DF2' },
      { phase: 'cons-final', bracket_label: 'FINALE CONSOLANTE', a: 'Vainqueur DCF1', b: 'Vainqueur DCF2' },
      { phase: 'cons-third', bracket_label: '7E PLACE', a: 'Perdant DCF1', b: 'Perdant DCF2' },
    ]
    finals.forEach((m, i) => {
      matches.push({
        phase: m.phase,
        round_number: finalsRound + Math.floor(i / numCourts),
        court_number: (i % numCourts) + 1,
        bracket_label: m.bracket_label,
        team_a_placeholder: m.a,
        team_b_placeholder: m.b,
        team_a_id: null,
        team_b_id: null,
      })
    })
  } else if (numPools === 4) {
    // Quarts de finale (8 équipes : les 2 premiers de chaque poule)
    const qfRound = round
    const qfPairs = [
      ['1er Poule A', '2e Poule B', 'QUART 1'],
      ['1er Poule B', '2e Poule A', 'QUART 2'],
      ['1er Poule C', '2e Poule D', 'QUART 3'],
      ['1er Poule D', '2e Poule C', 'QUART 4'],
    ]
    qfPairs.forEach((qf, i) => {
      matches.push({
        phase: 'quarter',
        round_number: qfRound + Math.floor(i / numCourts),
        court_number: (i % numCourts) + 1,
        bracket_label: qf[2],
        team_a_placeholder: qf[0],
        team_b_placeholder: qf[1],
        team_a_id: null,
        team_b_id: null,
      })
    })
    // Demi-finales
    const sfRound = qfRound + Math.ceil(4 / numCourts)
    matches.push(
      { phase: 'semi', round_number: sfRound, court_number: 1, bracket_label: 'DEMI-FINALE 1', team_a_placeholder: 'Vainqueur QF1', team_b_placeholder: 'Vainqueur QF3', team_a_id: null, team_b_id: null },
      { phase: 'semi', round_number: sfRound, court_number: 2, bracket_label: 'DEMI-FINALE 2', team_a_placeholder: 'Vainqueur QF2', team_b_placeholder: 'Vainqueur QF4', team_a_id: null, team_b_id: null }
    )
    // Finale + 3e place
    const fRound = sfRound + 1
    matches.push(
      { phase: 'final', round_number: fRound, court_number: 1, bracket_label: 'FINALE', team_a_placeholder: 'Vainqueur DF1', team_b_placeholder: 'Vainqueur DF2', team_a_id: null, team_b_id: null },
      { phase: 'third', round_number: fRound, court_number: 2, bracket_label: '3E PLACE', team_a_placeholder: 'Perdant DF1', team_b_placeholder: 'Perdant DF2', team_a_id: null, team_b_id: null }
    )
  }

  return matches
}

/**
 * Résout les placeholders du bracket
 */
export function resolveBracket(teams, matches, numPools) {
  const updates = []
  const poolStandings = computePoolStandings(teams, matches, numPools)

  const poolMatches = matches.filter((m) => m.phase === 'pool')
  const allPoolsFinished = poolMatches.length > 0 && poolMatches.every((m) => m.is_finished)

  const getTeamAtRank = (poolIndex, rank) => {
    const st = poolStandings[poolIndex]
    if (!st || !st[rank - 1]) return null
    return st[rank - 1].team.id
  }

  const resolvePlaceholder = (placeholder) => {
    if (!placeholder) return null

    // "1er Poule A", "2e Poule B", "3e Poule A", "4e Poule B"...
    const poolMatch = placeholder.match(/(\d)e?r? Poule ([A-D])/)
    if (poolMatch) {
      if (!allPoolsFinished) return null
      const rank = parseInt(poolMatch[1])
      const poolIdx = poolMatch[2].charCodeAt(0) - 65
      return getTeamAtRank(poolIdx, rank)
    }

    // "Vainqueur QF1", "Perdant DF2", "Vainqueur DCF1", "Perdant DCF2"...
    const bracketMatch = placeholder.match(/(Vainqueur|Perdant) (QF|DF|DCF)(\d)/)
    if (bracketMatch) {
      const type = bracketMatch[1]
      const phaseCode = bracketMatch[2] // QF | DF | DCF
      const num = parseInt(bracketMatch[3])
      let phaseName, labelPrefix
      if (phaseCode === 'QF') {
        phaseName = 'quarter'
        labelPrefix = 'QUART'
      } else if (phaseCode === 'DF') {
        phaseName = 'semi'
        labelPrefix = 'DEMI-FINALE'
      } else {
        // DCF = demi-consolante
        phaseName = 'cons-semi'
        labelPrefix = 'CONSOLANTE'
      }
      const sourceMatch = matches.find(
        (m) => m.phase === phaseName && m.bracket_label === `${labelPrefix} ${num}`
      )
      if (!sourceMatch || !sourceMatch.is_finished) return null
      if (!sourceMatch.team_a_id || !sourceMatch.team_b_id) return null
      const aWins = sourceMatch.score_a > sourceMatch.score_b
      if (type === 'Vainqueur') {
        return aWins ? sourceMatch.team_a_id : sourceMatch.team_b_id
      } else {
        return aWins ? sourceMatch.team_b_id : sourceMatch.team_a_id
      }
    }
    return null
  }

  matches
    .filter((m) => m.phase !== 'pool')
    .forEach((m) => {
      let newA = m.team_a_id
      let newB = m.team_b_id
      if (!m.team_a_id && m.team_a_placeholder) newA = resolvePlaceholder(m.team_a_placeholder)
      if (!m.team_b_id && m.team_b_placeholder) newB = resolvePlaceholder(m.team_b_placeholder)
      if (newA !== m.team_a_id || newB !== m.team_b_id) {
        updates.push({ matchId: m.id, team_a_id: newA, team_b_id: newB })
      }
    })

  return updates
}

/**
 * Classement final knockout ROBUSTE.
 * - Si les phases finales ont des résultats → utilise le bracket (champion, finaliste, etc.)
 * - Complète/remplace par un classement global basé sur les poules pour les équipes
 *   non classées par le bracket (ou si le tournoi est terminé avant la fin des finales).
 * Retourne TOUJOURS un classement de toutes les équipes.
 */
export function computeKnockoutFinalRanking(teams, matches) {
  const teamById = (id) => teams.find((t) => t.id === id)
  const ranking = []
  const placedTeamIds = new Set()

  const pushTeam = (teamId, label) => {
    const team = teamById(teamId)
    if (!team || placedTeamIds.has(teamId)) return
    placedTeamIds.add(teamId)
    ranking.push({ rank: ranking.length + 1, team, label })
  }

  // --- 1) Résultats du bracket (si finales jouées) ---
  const finalMatch = matches.find((m) => m.phase === 'final' && m.is_finished)
  const thirdMatch = matches.find((m) => m.phase === 'third' && m.is_finished)
  const consFinalMatch = matches.find((m) => m.phase === 'cons-final' && m.is_finished)
  const consThirdMatch = matches.find((m) => m.phase === 'cons-third' && m.is_finished)

  if (finalMatch && finalMatch.team_a_id && finalMatch.team_b_id) {
    const aWins = finalMatch.score_a > finalMatch.score_b
    pushTeam(aWins ? finalMatch.team_a_id : finalMatch.team_b_id, '🥇 Champion')
    pushTeam(aWins ? finalMatch.team_b_id : finalMatch.team_a_id, '🥈 Finaliste')
  }
  if (thirdMatch && thirdMatch.team_a_id && thirdMatch.team_b_id) {
    const aWins = thirdMatch.score_a > thirdMatch.score_b
    pushTeam(aWins ? thirdMatch.team_a_id : thirdMatch.team_b_id, '🥉 3e place')
    pushTeam(aWins ? thirdMatch.team_b_id : thirdMatch.team_a_id, '4e place')
  }
  if (consFinalMatch && consFinalMatch.team_a_id && consFinalMatch.team_b_id) {
    const aWins = consFinalMatch.score_a > consFinalMatch.score_b
    pushTeam(aWins ? consFinalMatch.team_a_id : consFinalMatch.team_b_id, '5e place')
    pushTeam(aWins ? consFinalMatch.team_b_id : consFinalMatch.team_a_id, '6e place')
  }
  if (consThirdMatch && consThirdMatch.team_a_id && consThirdMatch.team_b_id) {
    const aWins = consThirdMatch.score_a > consThirdMatch.score_b
    pushTeam(aWins ? consThirdMatch.team_a_id : consThirdMatch.team_b_id, '7e place')
    pushTeam(aWins ? consThirdMatch.team_b_id : consThirdMatch.team_a_id, '8e place')
  }

  // --- 2) Fallback : toutes les équipes restantes, classées par perfs globales ---
  // (utile si finales non terminées ou tournoi clôturé en phase de poules)
  const globalStats = computeStandings(teams, matches.filter((m) => m.is_finished))
  globalStats.forEach((s) => {
    if (!placedTeamIds.has(s.team.id)) {
      pushTeam(s.team.id, `${ranking.length + 1}e place`)
    }
  })

  // Au cas où certaines équipes n'ont aucun match (jamais joué) : on les ajoute en fin
  teams.forEach((t) => {
    if (!placedTeamIds.has(t.id)) pushTeam(t.id, `${ranking.length + 1}e place`)
  })

  return ranking
}
