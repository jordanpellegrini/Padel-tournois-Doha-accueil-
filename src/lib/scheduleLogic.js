// ============================================
// LOGIQUE DES HORAIRES DE PLANNING
// ============================================
// Convertit les heures en minutes, calcule les heures de chaque match,
// vérifie si un planning rentre dans les créneaux disponibles.

/**
 * Convertit une TIME Postgres ("HH:MM:SS" ou "HH:MM") en minutes depuis minuit.
 */
export function timeToMinutes(timeStr) {
  if (!timeStr) return 0
  const parts = timeStr.split(':')
  const h = parseInt(parts[0], 10) || 0
  const m = parseInt(parts[1], 10) || 0
  return h * 60 + m
}

/**
 * Convertit des minutes depuis minuit en "HH:MM".
 */
export function minutesToTime(mins) {
  const total = ((mins % (24 * 60)) + 24 * 60) % (24 * 60) // gère négatif
  const h = Math.floor(total / 60)
  const m = total % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/**
 * Durée totale disponible entre start_time et end_time, en minutes.
 * Si end < start, on considère que ça passe minuit (rare, mais on gère).
 */
export function totalDurationMinutes(startTime, endTime) {
  const s = timeToMinutes(startTime)
  let e = timeToMinutes(endTime)
  if (e <= s) e += 24 * 60
  return e - s
}

/**
 * Nombre de rounds possibles étant donné :
 *  - durée totale du créneau
 *  - durée d'un match
 *  - durée de la pause entre rounds
 *
 * Formule : chaque round consomme (match + pause), sauf le dernier qui ne consomme pas la pause.
 * Donc : maxRounds tel que match + (maxRounds - 1) * (match + pause) <= totalDuration
 *      = 1 + floor( (totalDuration - match) / (match + pause) )   si totalDuration >= match
 *      = 0 sinon.
 */
export function maxRoundsInWindow(totalDuration, matchDuration, breakDuration) {
  if (matchDuration <= 0 || totalDuration < matchDuration) return 0
  const cycle = matchDuration + breakDuration
  if (cycle <= 0) return 1
  return 1 + Math.floor((totalDuration - matchDuration) / cycle)
}

/**
 * Vérifie si un planning donné (nombre de rounds nécessaires) rentre dans le créneau.
 * Retourne { fits: bool, requiredMinutes, availableMinutes, missingMinutes }
 */
export function checkScheduleFits(numRoundsNeeded, matchDuration, breakDuration, startTime, endTime) {
  const available = totalDurationMinutes(startTime, endTime)
  const cycle = matchDuration + breakDuration
  const required = numRoundsNeeded > 0
    ? matchDuration + (numRoundsNeeded - 1) * cycle
    : 0
  return {
    fits: required <= available,
    requiredMinutes: required,
    availableMinutes: available,
    missingMinutes: Math.max(0, required - available),
  }
}

/**
 * Calcule les horaires de chaque round avec la nouvelle logique
 * (pause en début = warm-up, puis match).
 * @returns {Array<{warmup: string, match: string, end: string}>}
 *   ex : [{ warmup: "18:00", match: "18:05", end: "18:45" }, ...]
 */
export function computeRoundStartTimes(numRounds, matchDuration, breakDuration, startTime) {
  const startMin = timeToMinutes(startTime)
  const cycle = matchDuration + breakDuration
  const times = []
  for (let r = 0; r < numRounds; r++) {
    const warmupStart = startMin + r * cycle
    const matchStart = warmupStart + breakDuration
    const matchEnd = matchStart + matchDuration
    times.push({
      warmup: minutesToTime(warmupStart),
      match: minutesToTime(matchStart),
      end: minutesToTime(matchEnd),
    })
  }
  return times
}

/**
 * À partir des matchs déjà générés (avec round_number), leur assigne
 * une scheduled_time selon start_time / match_duration / break_duration.
 *
 * NOUVELLE LOGIQUE : la pause est au DÉBUT de chaque créneau (warm-up).
 * Un créneau = [ warm-up (break_duration) ] + [ match (match_duration) ]
 *   Créneau 1 :  start ─── start+break : warm-up  ─── start+break+match : fin match
 *   Créneau 2 :  suite immédiate
 *
 * On stocke l'heure de DÉBUT DU MATCH (pas du warm-up), c'est ce qui compte
 * pour l'utilisateur : "à quelle heure commence à jouer".
 *
 * @returns {Array} matchs enrichis avec scheduled_time (heure de début du match)
 */
export function attachScheduledTimes(matches, matchDuration, breakDuration, startTime) {
  const startMin = timeToMinutes(startTime)
  const cycle = matchDuration + breakDuration
  return matches.map((m) => {
    const r = m.round_number || 1
    // Le warm-up commence à startMin + (r-1)*cycle
    // Le match commence après le warm-up : + breakDuration
    const matchStartMin = startMin + (r - 1) * cycle + breakDuration
    return { ...m, scheduled_time: minutesToTime(matchStartMin) + ':00' }
  })
}

/**
 * Vu l'heure courante, détermine dans quelle phase on est pour un round donné :
 *   - 'before'        : avant le début du tournoi
 *   - 'break'         : warm-up (pause en début de créneau, avant match)
 *   - 'break-mid'     : milieu du warm-up (plus près du match)
 *   - 'match'         : match en cours
 *   - 'match-ending'  : moins de N minutes avant fin de match
 *   - 'after'         : après la fin du tournoi
 *
 * @param {number} nowMinutes    minutes depuis minuit
 * @param {Array<object>} roundStartTimes  [{warmup, match, end}, ...] depuis computeRoundStartTimes
 * @param {number} matchDuration
 * @param {number} breakDuration
 * @param {number} scoreWarnMinBeforeEnd  ex: 3
 * @returns {object} { phase, currentRound, minutesInPhase, minutesUntilNext }
 */
export function getCurrentPhase(nowMinutes, roundStartTimes, matchDuration, breakDuration, scoreWarnMinBeforeEnd = 3) {
  if (roundStartTimes.length === 0) return { phase: 'after', currentRound: 0 }
  const firstWarmup = timeToMinutes(roundStartTimes[0].warmup)
  const lastEnd = timeToMinutes(roundStartTimes[roundStartTimes.length - 1].end)
  if (nowMinutes < firstWarmup) return { phase: 'before', currentRound: 0, minutesUntilNext: firstWarmup - nowMinutes }
  if (nowMinutes >= lastEnd) return { phase: 'after', currentRound: roundStartTimes.length }

  // Trouve le round en cours
  for (let i = 0; i < roundStartTimes.length; i++) {
    const rWarmupStart = timeToMinutes(roundStartTimes[i].warmup)
    const rMatchStart = timeToMinutes(roundStartTimes[i].match)
    const rEnd = timeToMinutes(roundStartTimes[i].end)

    // Warm-up (pause de début)
    if (nowMinutes >= rWarmupStart && nowMinutes < rMatchStart) {
      const pauseLen = rMatchStart - rWarmupStart
      const elapsed = nowMinutes - rWarmupStart
      if (elapsed >= pauseLen / 2) {
        return { phase: 'break-mid', currentRound: i + 1, minutesInPhase: elapsed, minutesUntilNext: rMatchStart - nowMinutes }
      }
      return { phase: 'break', currentRound: i + 1, minutesInPhase: elapsed, minutesUntilNext: rMatchStart - nowMinutes }
    }
    // Match en cours
    if (nowMinutes >= rMatchStart && nowMinutes < rEnd) {
      const minsRemaining = rEnd - nowMinutes
      if (minsRemaining <= scoreWarnMinBeforeEnd) {
        return { phase: 'match-ending', currentRound: i + 1, minutesInPhase: nowMinutes - rMatchStart, minutesUntilNext: minsRemaining }
      }
      return { phase: 'match', currentRound: i + 1, minutesInPhase: nowMinutes - rMatchStart, minutesUntilNext: minsRemaining }
    }
  }
  return { phase: 'after', currentRound: roundStartTimes.length }
}

/**
 * Renvoie l'heure "courante" locale en minutes depuis minuit.
 */
export function nowMinutes() {
  const d = new Date()
  return d.getHours() * 60 + d.getMinutes()
}
