// ============================================
// LOGIQUE KNOCKOUT (poules + phases finales)
// ============================================
import { shuffle, computeStandings } from './tournamentLogic'

/**
 * Détermine le nombre de poules selon le nombre d'équipes
 * <= 8 équipes : 2 poules
 * > 8 équipes : 4 poules
 */
export function getNumPools(numTeams) {
  if (numTeams <= 8) return 2
  return 4
}

/**
 * Nom lisible d'une poule (0 -> A, 1 -> B, ...)
 */
export function poolName(index) {
  return String.fromCharCode(65 + index)
}

/**
 * Répartit les équipes dans les poules en serpentin (pour équilibrer)
 * Retourne un tableau de pool_index assigné à chaque équipe (dans l'ordre mélangé)
 * @returns {Array} [{team, poolIndex}]
 */
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

/**
 * Round-robin (algorithme du cercle) pour une poule
 */
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

/**
 * Génère les matchs de poule pour le knockout
 * Toutes les poules jouent leurs round-robin en parallèle, réparties sur les terrains
 *
 * @param {Array} teamsWithPool - [{id, pool_index, ...}]
 * @param {number} numPools
 * @param {number} numCourts
 * @returns {Array} matchs [{phase:'pool', pool_index, round_number, court_number, team_a_id, team_b_id}]
 */
export function generatePoolMatches(teamsWithPool, numPools, numCourts) {
  // Pour chaque poule, on génère les rounds round-robin
  const poolRounds = [] // poolRounds[poolIndex] = [[matchs R1], [matchs R2], ...]
  for (let p = 0; p < numPools; p++) {
    const poolTeams = teamsWithPool.filter((t) => t.pool_index === p).map((t) => t.id)
    poolRounds[p] = buildRoundRobinRounds(poolTeams)
  }

  // Nombre max de rounds parmi toutes les poules
  const maxRounds = Math.max(...poolRounds.map((r) => r.length), 0)

  // On entremêle : à chaque "round global", on prend le round de chaque poule
  const matches = []
  let globalRound = 0

  for (let r = 0; r < maxRounds; r++) {
    // Collecte tous les matchs de ce round across pools
    const roundMatchesAllPools = []
    for (let p = 0; p < numPools; p++) {
      if (poolRounds[p][r]) {
        poolRounds[p][r].forEach((pair) => {
          roundMatchesAllPools.push({ poolIndex: p, pair })
        })
      }
    }

    // Répartit ces matchs sur les terrains (numCourts par round global)
    let courtCounter = 0
    let currentGlobalRound = globalRound + 1

    roundMatchesAllPools.forEach((m) => {
      if (courtCounter >= numCourts) {
        // Nouveau round global si on dépasse le nombre de terrains
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

/**
 * Calcule le classement par poule
 * @returns {Object} { poolIndex: [classement trié] }
 */
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
 * Génère les matchs de phase finale (bracket) selon le nombre de poules.
 * Les équipes sont des placeholders au départ ("1er Poule A", etc.)
 * et seront résolues quand les poules seront terminées.
 *
 * Pour 2 poules :
 *   DF1 : 1er A vs 2e B
 *   DF2 : 1er B vs 2e A
 *   FINALE : Vainqueur DF1 vs Vainqueur DF2
 *   3E PLACE : Perdant DF1 vs Perdant DF2
 *
 * Pour 4 poules :
 *   QF1 : 1er A vs 2e B
 *   QF2 : 1er B vs 2e A
 *   QF3 : 1er C vs 2e D
 *   QF4 : 1er D vs 2e C
 *   DF1 : Vainqueur QF1 vs Vainqueur QF3
 *   DF2 : Vainqueur QF2 vs Vainqueur QF4
 *   FINALE : Vainqueur DF1 vs Vainqueur DF2
 *   3E PLACE : Perdant DF1 vs Perdant DF2
 *
 * @returns {Array} matchs de phase finale
 */
export function generateFinalsBracket(numPools, startRound) {
  const matches = []
  let round = startRound

  if (numPools === 2) {
    // Demi-finales
    matches.push({
      phase: 'semi',
      round_number: round,
      court_number: 1,
      bracket_label: 'DEMI-FINALE 1',
      team_a_placeholder: '1er Poule A',
      team_b_placeholder: '2e Poule B',
      team_a_id: null,
      team_b_id: null,
    })
    matches.push({
      phase: 'semi',
      round_number: round,
      court_number: 2,
      bracket_label: 'DEMI-FINALE 2',
      team_a_placeholder: '1er Poule B',
      team_b_placeholder: '2e Poule A',
      team_a_id: null,
      team_b_id: null,
    })
    round++
    // Finale + 3e place
    matches.push({
      phase: 'third',
      round_number: round,
      court_number: 1,
      bracket_label: '3E PLACE',
      team_a_placeholder: 'Perdant DF1',
      team_b_placeholder: 'Perdant DF2',
      team_a_id: null,
      team_b_id: null,
    })
    matches.push({
      phase: 'final',
      round_number: round,
      court_number: 2,
      bracket_label: 'FINALE',
      team_a_placeholder: 'Vainqueur DF1',
      team_b_placeholder: 'Vainqueur DF2',
      team_a_id: null,
      team_b_id: null,
    })
  } else if (numPools === 4) {
    // Quarts de finale
    const qfPairs = [
      ['1er Poule A', '2e Poule B', 'QUART 1'],
      ['1er Poule B', '2e Poule A', 'QUART 2'],
      ['1er Poule C', '2e Poule D', 'QUART 3'],
      ['1er Poule D', '2e Poule C', 'QUART 4'],
    ]
    qfPairs.forEach((qf, i) => {
      matches.push({
        phase: 'quarter',
        round_number: round,
        court_number: i + 1,
        bracket_label: qf[2],
        team_a_placeholder: qf[0],
        team_b_placeholder: qf[1],
        team_a_id: null,
        team_b_id: null,
      })
    })
    round++
    // Demi-finales
    matches.push({
      phase: 'semi',
      round_number: round,
      court_number: 1,
      bracket_label: 'DEMI-FINALE 1',
      team_a_placeholder: 'Vainqueur QF1',
      team_b_placeholder: 'Vainqueur QF3',
      team_a_id: null,
      team_b_id: null,
    })
    matches.push({
      phase: 'semi',
      round_number: round,
      court_number: 2,
      bracket_label: 'DEMI-FINALE 2',
      team_a_placeholder: 'Vainqueur QF2',
      team_b_placeholder: 'Vainqueur QF4',
      team_a_id: null,
      team_b_id: null,
    })
    round++
    // Finale + 3e place
    matches.push({
      phase: 'third',
      round_number: round,
      court_number: 1,
      bracket_label: '3E PLACE',
      team_a_placeholder: 'Perdant DF1',
      team_b_placeholder: 'Perdant DF2',
      team_a_id: null,
      team_b_id: null,
    })
    matches.push({
      phase: 'final',
      round_number: round,
      court_number: 2,
      bracket_label: 'FINALE',
      team_a_placeholder: 'Vainqueur DF1',
      team_b_placeholder: 'Vainqueur DF2',
      team_a_id: null,
      team_b_id: null,
    })
  }

  return matches
}

/**
 * Résout les placeholders des phases finales :
 * - Quand les poules sont finies, remplit les quarts/demis avec les vraies équipes qualifiées
 * - Quand un match de bracket est fini, propage le vainqueur/perdant au tour suivant
 *
 * @param {Array} teams
 * @param {Array} matches (tous)
 * @param {number} numPools
 * @returns {Array} mises à jour à appliquer [{matchId, team_a_id, team_b_id}]
 */
export function resolveBracket(teams, matches, numPools) {
  const updates = []
  const poolStandings = computePoolStandings(teams, matches, numPools)

  // Vérifie si toutes les poules sont terminées
  const poolMatches = matches.filter((m) => m.phase === 'pool')
  const allPoolsFinished = poolMatches.length > 0 && poolMatches.every((m) => m.is_finished)

  // Fonction utilitaire : récupère l'équipe à un rang donné d'une poule
  const getTeamAtRank = (poolIndex, rank) => {
    const st = poolStandings[poolIndex]
    if (!st || !st[rank - 1]) return null
    return st[rank - 1].team.id
  }

  // Résout un placeholder texte en team_id
  const resolvePlaceholder = (placeholder) => {
    if (!placeholder) return null

    // "1er Poule A", "2e Poule B"...
    const poolMatch = placeholder.match(/(\d)e?r? Poule ([A-D])/)
    if (poolMatch) {
      if (!allPoolsFinished) return null
      const rank = parseInt(poolMatch[1])
      const poolIdx = poolMatch[2].charCodeAt(0) - 65
      return getTeamAtRank(poolIdx, rank)
    }

    // "Vainqueur QF1", "Perdant DF2"...
    const bracketMatch = placeholder.match(/(Vainqueur|Perdant) (QF|DF)(\d)/)
    if (bracketMatch) {
      const type = bracketMatch[1]
      const phaseCode = bracketMatch[2] // QF ou DF
      const num = parseInt(bracketMatch[3])
      const phaseName = phaseCode === 'QF' ? 'quarter' : 'semi'
      // Trouve le match correspondant
      const labelPrefix = phaseCode === 'QF' ? 'QUART' : 'DEMI-FINALE'
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

  // Parcourt tous les matchs de phase finale et tente de résoudre leurs placeholders
  matches
    .filter((m) => m.phase !== 'pool')
    .forEach((m) => {
      let newA = m.team_a_id
      let newB = m.team_b_id

      if (!m.team_a_id && m.team_a_placeholder) {
        newA = resolvePlaceholder(m.team_a_placeholder)
      }
      if (!m.team_b_id && m.team_b_placeholder) {
        newB = resolvePlaceholder(m.team_b_placeholder)
      }

      if (newA !== m.team_a_id || newB !== m.team_b_id) {
        updates.push({
          matchId: m.id,
          team_a_id: newA,
          team_b_id: newB,
        })
      }
    })

  return updates
}

/**
 * Calcule le classement final d'un tournoi knockout terminé
 */
export function computeKnockoutFinalRanking(teams, matches) {
  const teamById = (id) => teams.find((t) => t.id === id)
  const ranking = []

  const finalMatch = matches.find((m) => m.phase === 'final' && m.is_finished)
  const thirdMatch = matches.find((m) => m.phase === 'third' && m.is_finished)

  if (finalMatch && finalMatch.team_a_id && finalMatch.team_b_id) {
    const aWins = finalMatch.score_a > finalMatch.score_b
    const winner = aWins ? finalMatch.team_a_id : finalMatch.team_b_id
    const runner = aWins ? finalMatch.team_b_id : finalMatch.team_a_id
    ranking.push({ rank: 1, team: teamById(winner), label: '🥇 Champion' })
    ranking.push({ rank: 2, team: teamById(runner), label: '🥈 Finaliste' })
  }

  if (thirdMatch && thirdMatch.team_a_id && thirdMatch.team_b_id) {
    const aWins = thirdMatch.score_a > thirdMatch.score_b
    const third = aWins ? thirdMatch.team_a_id : thirdMatch.team_b_id
    const fourth = aWins ? thirdMatch.team_b_id : thirdMatch.team_a_id
    ranking.push({ rank: 3, team: teamById(third), label: '🥉 3e place' })
    ranking.push({ rank: 4, team: teamById(fourth), label: '4e place' })
  }

  return ranking
}
