// ============================================
// LOGIQUE TOURNOI INTER-ENTREPRISES
// ============================================
// Format : N entreprises (2-6), chacune a M équipes classées par niveau (1=meilleure)
// Les équipes de MÊME NIVEAU s'affrontent en round-robin (entre entreprises)
//
// SCORING (nouvelle logique) :
//   - Classement par niveau : 3 points par victoire (pas de match nul)
//     Départage : différence de jeux, puis jeux gagnés
//   - Classement par entreprise : points positionnels selon le rang dans chaque niveau
//     1er = 4 pts · 2e = 3 pts · 3e = 2 pts · 4e = 1 pt · 5e+ = 0 pt
//     Total = somme sur tous les niveaux
//     Départage : différence de jeux totale (toutes équipes de l'entreprise)

// Points attribués selon la position dans le classement d'un niveau
const POSITION_POINTS = [4, 3, 2, 1] // index 0 = 1er, 1 = 2e, etc. Après : 0

/**
 * Round-robin (algorithme du cercle) pour un groupe d'équipes
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
 * Nombre de matchs que chaque équipe jouera (= nombre d'entreprises - 1)
 */
export function matchesPerTeam(numCompanies) {
  return numCompanies - 1
}

/**
 * Génère les matchs d'un tournoi inter-entreprises.
 */
export function generateCorporateMatches(teams, numCompanies, maxLevel, numCourts) {
  const levelRounds = {}
  for (let lvl = 1; lvl <= maxLevel; lvl++) {
    const levelTeams = teams.filter((t) => t.level === lvl).map((t) => t.id)
    levelRounds[lvl] = buildRoundRobinRounds(levelTeams)
  }

  const maxRounds = Math.max(...Object.values(levelRounds).map((r) => r.length), 0)
  const matches = []
  let globalRound = 0

  for (let r = 0; r < maxRounds; r++) {
    const roundMatchesAllLevels = []
    for (let lvl = 1; lvl <= maxLevel; lvl++) {
      if (levelRounds[lvl][r]) {
        levelRounds[lvl][r].forEach((pair) => {
          roundMatchesAllLevels.push({ level: lvl, pair })
        })
      }
    }
    let courtCounter = 0
    let currentGlobalRound = globalRound + 1
    roundMatchesAllLevels.forEach((m) => {
      if (courtCounter >= numCourts) {
        currentGlobalRound++
        courtCounter = 0
      }
      matches.push({
        phase: 'corporate',
        level: m.level,
        round_number: currentGlobalRound,
        court_number: courtCounter + 1,
        team_a_id: m.pair[0],
        team_b_id: m.pair[1],
        bracket_label: `NIVEAU ${m.level}`,
      })
      courtCounter++
    })
    globalRound = currentGlobalRound
  }

  return matches
}

/**
 * Classement PAR NIVEAU (nouveau système : 3 points par victoire)
 * Départage : différence de jeux → jeux gagnés
 *
 * @returns {Object} { level: [classement des équipes de ce niveau] }
 *   Chaque entrée contient : team, company_name, wins, losses, played,
 *   pointsFor, pointsAgainst, diff, rankPoints
 */
export function computeLevelStandings(teams, matches, maxLevel, companyNames) {
  const result = {}
  const names = Array.isArray(companyNames) ? companyNames : []

  for (let lvl = 1; lvl <= maxLevel; lvl++) {
    const levelTeams = teams.filter((t) => t.level === lvl)
    const levelMatches = matches.filter((m) => m.phase === 'corporate' && m.level === lvl)

    const stats = {}
    levelTeams.forEach((t) => {
      stats[t.id] = {
        team: t,
        company_name: names[t.company_index] || `Entreprise ${String.fromCharCode(65 + t.company_index)}`,
        wins: 0,
        losses: 0,
        played: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        rankPoints: 0, // 3 points par victoire
      }
    })

    levelMatches
      .filter((m) => m.is_finished)
      .forEach((m) => {
        if (!stats[m.team_a_id] || !stats[m.team_b_id]) return
        stats[m.team_a_id].played++
        stats[m.team_b_id].played++
        stats[m.team_a_id].pointsFor += m.score_a
        stats[m.team_a_id].pointsAgainst += m.score_b
        stats[m.team_b_id].pointsFor += m.score_b
        stats[m.team_b_id].pointsAgainst += m.score_a
        if (m.score_a > m.score_b) {
          stats[m.team_a_id].wins++
          stats[m.team_a_id].rankPoints += 3
          stats[m.team_b_id].losses++
        } else if (m.score_b > m.score_a) {
          stats[m.team_b_id].wins++
          stats[m.team_b_id].rankPoints += 3
          stats[m.team_a_id].losses++
        }
      })

    // Tri : points d'abord, puis diff de jeux, puis jeux gagnés
    result[lvl] = Object.values(stats)
      .map((s) => ({ ...s, diff: s.pointsFor - s.pointsAgainst }))
      .sort((a, b) => b.rankPoints - a.rankPoints || b.diff - a.diff || b.pointsFor - a.pointsFor)
  }
  return result
}

/**
 * Classement PAR ENTREPRISE (nouveau système : points positionnels)
 * On calcule d'abord le classement de chaque niveau, puis on attribue
 * 4-3-2-1-0 points selon la position de chaque équipe dans son niveau.
 * On additionne pour chaque entreprise et on trie.
 * Départage : différence de jeux totale.
 *
 * @returns {Array} trié [{ company_index, company_name, totalPoints,
 *   totalPointsFor, totalPointsAgainst, totalWins, diff, positionsByLevel }]
 */
export function computeCorporateStandings(teams, matches, companyNames, maxLevel) {
  const names = Array.isArray(companyNames) ? [...companyNames] : []

  // Détermine la liste des entreprises (à partir de companyNames + company_index des équipes)
  const indexesFromTeams = [...new Set(teams.map((t) => t.company_index).filter((i) => i !== null && i !== undefined))]
  const maxIndex = Math.max(names.length - 1, ...(indexesFromTeams.length ? indexesFromTeams : [-1]))

  // Détermine le maxLevel si pas fourni
  const actualMaxLevel = maxLevel || Math.max(1, ...teams.map((t) => t.level || 0))

  // Initialise les stats de chaque entreprise
  const stats = {}
  for (let idx = 0; idx <= maxIndex; idx++) {
    stats[idx] = {
      company_index: idx,
      company_name: names[idx] || `Entreprise ${String.fromCharCode(65 + idx)}`,
      totalPoints: 0,          // Somme des points positionnels (garanti nombre)
      totalPointsFor: 0,       // Jeux gagnés (pour départage)
      totalPointsAgainst: 0,
      totalWins: 0,
      played: 0,
      positionsByLevel: {},    // {level: rank} pour affichage
    }
  }

  // Calcule le classement de chaque niveau
  const levelStandings = computeLevelStandings(teams, matches, actualMaxLevel, names)

  // Attribue les points positionnels
  Object.entries(levelStandings).forEach(([lvl, ranking]) => {
    // Ne prend en compte que les niveaux où au moins 1 match a été joué ET validé
    const hasFinishedMatches = ranking.some((s) => (s.played || 0) > 0)
    if (!hasFinishedMatches) return

    ranking.forEach((s, idx) => {
      const positionPoints = POSITION_POINTS[idx] || 0
      const cIdx = s.team.company_index
      if (cIdx === null || cIdx === undefined) return
      // Si le cIdx sort du tableau stats (bug data), on l'ignore proprement
      if (stats[cIdx] === undefined) return

      stats[cIdx].totalPoints = (stats[cIdx].totalPoints || 0) + positionPoints
      stats[cIdx].totalPointsFor = (stats[cIdx].totalPointsFor || 0) + (s.pointsFor || 0)
      stats[cIdx].totalPointsAgainst = (stats[cIdx].totalPointsAgainst || 0) + (s.pointsAgainst || 0)
      stats[cIdx].totalWins = (stats[cIdx].totalWins || 0) + (s.wins || 0)
      stats[cIdx].played = (stats[cIdx].played || 0) + (s.played || 0)
      stats[cIdx].positionsByLevel[lvl] = idx + 1
    })
  })

  // Tri : points totaux d'abord, puis différence de jeux
  // Garantit que TOUS les champs numériques ont une valeur (0 par défaut, pas undefined)
  return Object.values(stats)
    .map((s) => ({
      ...s,
      totalPoints: s.totalPoints || 0,
      totalPointsFor: s.totalPointsFor || 0,
      totalPointsAgainst: s.totalPointsAgainst || 0,
      totalWins: s.totalWins || 0,
      played: s.played || 0,
      diff: (s.totalPointsFor || 0) - (s.totalPointsAgainst || 0),
    }))
    .sort((a, b) => b.totalPoints - a.totalPoints || b.diff - a.diff)
}
