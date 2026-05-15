// ============================================
// LOGIQUE TOURNOI - V2 (round-robin équilibré)
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
 */
export function shufflePlayers(teams) {
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
 */
export function computeNumRounds(totalMinutes, matchMinutes, breakMinutes) {
  const cycleMinutes = matchMinutes + breakMinutes
  if (cycleMinutes <= 0) return 0
  const numRounds = Math.floor((totalMinutes + breakMinutes) / cycleMinutes)
  return Math.max(0, numRounds)
}

/**
 * Algorithme du cercle : génère un round-robin complet
 * Chaque équipe rencontre chaque autre une fois.
 */
function buildRoundRobinRounds(teamIds) {
  const teams = [...teamIds]
  if (teams.length % 2 === 1) teams.push(null) // bye si impair
  const n = teams.length
  const numRounds = n - 1
  const half = n / 2
  const rounds = []
  const rotating = teams.slice(1)

  for (let r = 0; r < numRounds; r++) {
    const roundMatches = []
    const first = teams[0]
    const opponent = rotating[0]
    if (first !== null && opponent !== null) {
      roundMatches.push([first, opponent])
    }
    for (let i = 1; i < half; i++) {
      const a = rotating[i]
      const b = rotating[rotating.length - i]
      if (a !== null && b !== null) {
        roundMatches.push([a, b])
      }
    }
    rounds.push(roundMatches)
    rotating.unshift(rotating.pop())
  }

  return rounds
}

/**
 * Génère le planning des matchs avec équilibrage intelligent :
 * - Round-robin garantit que les affrontements varient
 * - Si on a plus de matchs possibles que de terrains, on priorise les équipes
 *   qui ont le moins joué pour équilibrer
 * - Si on dépasse N-1 rounds (cycle complet), on rejoue avec ordre re-mélangé
 */
export function generateSchedule(teams, numCourts, numRounds) {
  if (teams.length < 2 || numRounds === 0 || numCourts === 0) return []

  // Mélange l'ordre des équipes pour rendre chaque tournoi unique
  const shuffledTeams = shuffle(teams)
  const teamIds = shuffledTeams.map((t) => t.id)

  // Génère les rounds round-robin théoriques
  let allRoundRobinRounds = buildRoundRobinRounds(teamIds)

  // Si on a besoin de plus de rounds, on enchaîne un nouveau cycle avec ordre différent
  while (allRoundRobinRounds.length < numRounds) {
    const reshuffled = shuffle(teamIds)
    const moreRounds = buildRoundRobinRounds(reshuffled)
    allRoundRobinRounds = allRoundRobinRounds.concat(moreRounds)
  }

  allRoundRobinRounds = allRoundRobinRounds.slice(0, numRounds)

  // Assignation aux terrains avec équilibrage
  const matches = []
  const playCount = {}
  teamIds.forEach((id) => (playCount[id] = 0))

  allRoundRobinRounds.forEach((roundMatches, roundIdx) => {
    const roundNum = roundIdx + 1
    // Trie : priorité aux matchs où les équipes ont le moins joué
    const sortedMatches = [...roundMatches].sort((a, b) => {
      const minA = Math.min(playCount[a[0]], playCount[a[1]])
      const minB = Math.min(playCount[b[0]], playCount[b[1]])
      if (minA !== minB) return minA - minB
      const sumA = playCount[a[0]] + playCount[a[1]]
      const sumB = playCount[b[0]] + playCount[b[1]]
      return sumA - sumB
    })

    const playableMatches = sortedMatches.slice(0, numCourts)
    playableMatches.forEach((pair, courtIdx) => {
      matches.push({
        round_number: roundNum,
        court_number: courtIdx + 1,
        team_a_id: pair[0],
        team_b_id: pair[1],
      })
      playCount[pair[0]]++
      playCount[pair[1]]++
    })
  })

  return matches
}

/**
 * Calcule le classement à partir des matchs joués
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
