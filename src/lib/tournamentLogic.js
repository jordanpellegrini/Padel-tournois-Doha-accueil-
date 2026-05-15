// ============================================
// LOGIQUE TOURNOI
// ============================================

/**
 * Mélange un tableau (Fisher-Yates)
 */
export function shuffle(array) {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

/**
 * Tirage au sort : mélange l'ordre des équipes existantes
 */
export function shuffleTeams(teams) {
  return shuffle(teams)
}

/**
 * Tirage au sort : reformer des paires aléatoires à partir des joueurs individuels
 * Renvoie un tableau de { player1_name, player2_name }
 */
export function shufflePlayers(teams) {
  // Récupère tous les joueurs individuels
  const allPlayers = []
  teams.forEach((t) => {
    if (t.player1_name) allPlayers.push(t.player1_name)
    if (t.player2_name) allPlayers.push(t.player2_name)
  })

  const shuffled = shuffle(allPlayers)
  const newTeams = []

  for (let i = 0; i < shuffled.length - 1; i += 2) {
    newTeams.push({
      player1_name: shuffled[i],
      player2_name: shuffled[i + 1],
      team_name: `${shuffled[i]} / ${shuffled[i + 1]}`,
    })
  }

  // Si nombre impair de joueurs, le dernier reste seul
  if (shuffled.length % 2 === 1) {
    newTeams.push({
      player1_name: shuffled[shuffled.length - 1],
      player2_name: '(en attente partenaire)',
      team_name: `${shuffled[shuffled.length - 1]} / ?`,
    })
  }

  return newTeams
}

/**
 * Calcule combien de rounds (sessions) tiennent dans la durée totale
 * @param {number} totalMinutes - durée totale du tournoi
 * @param {number} matchMinutes - durée d'un match
 * @param {number} breakMinutes - durée pause entre matchs
 */
export function computeNumRounds(totalMinutes, matchMinutes, breakMinutes) {
  // 1 round = 1 match + 1 pause (sauf le dernier qui n'a pas besoin de pause)
  // Mais on simplifie : on compte avec la pause pour avoir un buffer
  const cycleMinutes = matchMinutes + breakMinutes
  if (cycleMinutes <= 0) return 0
  // On peut faire un dernier match sans pause après, donc :
  const numRounds = Math.floor((totalMinutes + breakMinutes) / cycleMinutes)
  return Math.max(0, numRounds)
}

/**
 * Génère le planning des matchs :
 * - Pour chaque round (session), on fait jouer numCourts matchs en parallèle
 * - On essaie d'équilibrer le nombre de matchs joués par chaque équipe
 * - On évite de faire jouer une équipe 2 fois dans le même round
 * - On évite de répéter les mêmes affrontements quand c'est possible
 *
 * @param {Array} teams - liste d'équipes [{id, ...}]
 * @param {number} numCourts - nombre de terrains
 * @param {number} numRounds - nombre de rounds calculés
 * @returns {Array} liste de matchs [{round_number, court_number, team_a_id, team_b_id}]
 */
export function generateSchedule(teams, numCourts, numRounds) {
  if (teams.length < 2 || numRounds === 0 || numCourts === 0) return []

  const matches = []
  // Compte des matchs joués par chaque équipe (pour équilibrage)
  const playCount = {}
  teams.forEach((t) => (playCount[t.id] = 0))
  // Historique des affrontements pour éviter les répétitions
  const pairKey = (a, b) => [a, b].sort().join('|')
  const facedAlready = new Set()

  for (let round = 1; round <= numRounds; round++) {
    // Équipes déjà placées sur ce round
    const usedThisRound = new Set()
    // Combien de matchs maximum sur ce round
    const maxMatchesThisRound = Math.min(
      numCourts,
      Math.floor(teams.length / 2)
    )

    for (let court = 1; court <= maxMatchesThisRound; court++) {
      // Trie les équipes par nombre de matchs joués (les moins joué d'abord)
      const available = teams
        .filter((t) => !usedThisRound.has(t.id))
        .sort((a, b) => playCount[a.id] - playCount[b.id])

      if (available.length < 2) break

      const teamA = available[0]
      // Cherche un adversaire qu'on n'a pas (ou peu) déjà rencontré
      let teamB = null
      for (const candidate of available.slice(1)) {
        if (!facedAlready.has(pairKey(teamA.id, candidate.id))) {
          teamB = candidate
          break
        }
      }
      // Si tout le monde a déjà été affronté, on prend le moins joué quand même
      if (!teamB) teamB = available[1]

      matches.push({
        round_number: round,
        court_number: court,
        team_a_id: teamA.id,
        team_b_id: teamB.id,
      })

      usedThisRound.add(teamA.id)
      usedThisRound.add(teamB.id)
      playCount[teamA.id]++
      playCount[teamB.id]++
      facedAlready.add(pairKey(teamA.id, teamB.id))
    }
  }

  return matches
}

/**
 * Calcule le classement à partir des matchs joués
 * @param {Array} teams
 * @param {Array} matches
 * @returns {Array} classement trié [{team, wins, played, pointsFor, pointsAgainst, diff}]
 */
export function computeStandings(teams, matches) {
  const stats = {}
  teams.forEach((t) => {
    stats[t.id] = {
      team: t,
      played: 0,
      wins: 0,
      losses: 0,
      pointsFor: 0,
      pointsAgainst: 0,
    }
  })

  matches
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
        stats[m.team_b_id].losses++
      } else if (m.score_b > m.score_a) {
        stats[m.team_b_id].wins++
        stats[m.team_a_id].losses++
      }
    })

  return Object.values(stats)
    .map((s) => ({ ...s, diff: s.pointsFor - s.pointsAgainst }))
    .sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins
      if (b.diff !== a.diff) return b.diff - a.diff
      return b.pointsFor - a.pointsFor
    })
}
