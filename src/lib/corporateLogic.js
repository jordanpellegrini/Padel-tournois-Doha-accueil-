// ============================================
// LOGIQUE TOURNOI INTER-ENTREPRISES
// ============================================
// Format : N entreprises (2-6), chacune a M équipes classées par niveau (1=meilleure)
// Les équipes de MÊME NIVEAU s'affrontent en round-robin (entre entreprises)
// Classement principal : par entreprise (somme des jeux gagnés de toutes ses équipes)
// Classement secondaire : par niveau

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
  // round-robin entre 1 équipe par entreprise => chacune joue (numCompanies - 1) matchs
  // (si numCompanies impair, une équipe est "exempt" à chaque round, donc un peu moins)
  return numCompanies - 1
}

/**
 * Génère les matchs d'un tournoi inter-entreprises.
 * @param {Array} teams - [{id, company_index, level}]
 * @param {number} numCompanies
 * @param {number} maxLevel - nombre d'équipes par entreprise (= nombre de niveaux)
 * @param {number} numCourts
 * @returns {Array} matchs [{phase:'corporate', level, round_number, court_number, team_a_id, team_b_id, bracket_label}]
 */
export function generateCorporateMatches(teams, numCompanies, maxLevel, numCourts) {
  // Pour chaque niveau, on fait un round-robin entre les équipes de ce niveau
  const levelRounds = {} // levelRounds[level] = [[matchs r1], [matchs r2], ...]
  for (let lvl = 1; lvl <= maxLevel; lvl++) {
    const levelTeams = teams.filter((t) => t.level === lvl).map((t) => t.id)
    levelRounds[lvl] = buildRoundRobinRounds(levelTeams)
  }

  const maxRounds = Math.max(...Object.values(levelRounds).map((r) => r.length), 0)
  const matches = []
  let globalRound = 0

  // À chaque round du round-robin, on collecte les matchs de TOUS les niveaux
  // et on les répartit sur les terrains disponibles
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
 * Classement par ENTREPRISE
 * On additionne les jeux gagnés et les victoires de toutes les équipes de chaque entreprise
 * @returns {Array} trié [{company_index, company_name, wins, pointsFor, pointsAgainst, diff, played}]
 */
export function computeCorporateStandings(teams, matches, companyNames) {
  const stats = {}
  // Initialise une entrée par entreprise
  companyNames.forEach((name, idx) => {
    stats[idx] = {
      company_index: idx,
      company_name: name,
      wins: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      played: 0,
    }
  })

  const teamById = (id) => teams.find((t) => t.id === id)

  matches
    .filter((m) => m.phase === 'corporate' && m.is_finished)
    .forEach((m) => {
      const teamA = teamById(m.team_a_id)
      const teamB = teamById(m.team_b_id)
      if (!teamA || !teamB) return
      const cA = teamA.company_index
      const cB = teamB.company_index
      if (stats[cA] === undefined || stats[cB] === undefined) return

      stats[cA].played++
      stats[cB].played++
      stats[cA].pointsFor += m.score_a
      stats[cA].pointsAgainst += m.score_b
      stats[cB].pointsFor += m.score_b
      stats[cB].pointsAgainst += m.score_a
      if (m.score_a > m.score_b) stats[cA].wins++
      else if (m.score_b > m.score_a) stats[cB].wins++
    })

  // Classement : total de jeux gagnés (pointsFor) d'abord, puis différence, puis victoires
  return Object.values(stats)
    .map((s) => ({ ...s, diff: s.pointsFor - s.pointsAgainst }))
    .sort((a, b) => b.pointsFor - a.pointsFor || b.diff - a.diff || b.wins - a.wins)
}

/**
 * Classement PAR NIVEAU (pour le panneau latéral)
 * @returns {Object} { level: [classement des équipes de ce niveau] }
 */
export function computeLevelStandings(teams, matches, maxLevel, companyNames) {
  const result = {}
  for (let lvl = 1; lvl <= maxLevel; lvl++) {
    const levelTeams = teams.filter((t) => t.level === lvl)
    const levelMatches = matches.filter((m) => m.phase === 'corporate' && m.level === lvl)

    const stats = {}
    levelTeams.forEach((t) => {
      stats[t.id] = {
        team: t,
        company_name: companyNames[t.company_index] || `Entreprise ${t.company_index + 1}`,
        wins: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        played: 0,
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
        if (m.score_a > m.score_b) stats[m.team_a_id].wins++
        else if (m.score_b > m.score_a) stats[m.team_b_id].wins++
      })

    result[lvl] = Object.values(stats)
      .map((s) => ({ ...s, diff: s.pointsFor - s.pointsAgainst }))
      .sort((a, b) => b.wins - a.wins || b.diff - a.diff || b.pointsFor - a.pointsFor)
  }
  return result
}
