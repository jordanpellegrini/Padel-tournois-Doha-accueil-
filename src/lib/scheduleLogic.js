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
 * Calcule l'heure de début (HH:MM) de chaque round.
 * @param {number} numRounds
 * @param {number} matchDuration
 * @param {number} breakDuration
 * @param {string} startTime  "HH:MM" ou "HH:MM:SS"
 * @returns {Array<string>} ["18:00", "18:45", "19:30", ...]
 */
export function computeRoundStartTimes(numRounds, matchDuration, breakDuration, startTime) {
  const startMin = timeToMinutes(startTime)
  const cycle = matchDuration + breakDuration
  const times = []
  for (let r = 0; r < numRounds; r++) {
    times.push(minutesToTime(startMin + r * cycle))
  }
  return times
}

/**
 * À partir des matchs déjà générés (avec round_number), leur assigne
 * une scheduled_time selon start_time / match_duration / break_duration.
 * @returns {Array} matchs enrichis avec scheduled_time
 */
export function attachScheduledTimes(matches, matchDuration, breakDuration, startTime) {
  const startMin = timeToMinutes(startTime)
  const cycle = matchDuration + breakDuration
  return matches.map((m) => {
    const r = m.round_number || 1
    const mins = startMin + (r - 1) * cycle
    return { ...m, scheduled_time: minutesToTime(mins) + ':00' } // format TIME "HH:MM:SS"
  })
}

/**
 * Vu l'heure courante, détermine dans quelle phase on est pour un round donné :
 *   - 'match'         : match en cours
 *   - 'match-ending'  : moins de N minutes avant fin de match
 *   - 'break'         : pause entre rounds
 *   - 'break-mid'     : milieu de la pause (moitié écoulée)
 *   - 'before'        : avant le début du tournoi
 *   - 'after'         : après la fin du tournoi
 *
 * @param {number} nowMinutes    minutes depuis minuit (Date.now() converti)
 * @param {Array<string>} roundStartTimes  ex: ["18:00","18:45",...]
 * @param {number} matchDuration
 * @param {number} breakDuration
 * @param {number} scoreWarnMinBeforeEnd  ex: 3 (min avant fin de match on bascule sur saisie)
 * @returns {object} { phase, currentRound, minutesInPhase, minutesUntilNext }
 */
export function getCurrentPhase(nowMinutes, roundStartTimes, matchDuration, breakDuration, scoreWarnMinBeforeEnd = 3) {
  if (roundStartTimes.length === 0) return { phase: 'after', currentRound: 0 }
  const firstStart = timeToMinutes(roundStartTimes[0])
  const lastStart = timeToMinutes(roundStartTimes[roundStartTimes.length - 1])
  const lastEnd = lastStart + matchDuration
  if (nowMinutes < firstStart) return { phase: 'before', currentRound: 0, minutesUntilNext: firstStart - nowMinutes }
  if (nowMinutes >= lastEnd) return { phase: 'after', currentRound: roundStartTimes.length }

  // Trouve le round en cours
  for (let i = 0; i < roundStartTimes.length; i++) {
    const rStart = timeToMinutes(roundStartTimes[i])
    const rEnd = rStart + matchDuration
    const nextStart = i + 1 < roundStartTimes.length ? timeToMinutes(roundStartTimes[i + 1]) : rEnd + breakDuration

    if (nowMinutes >= rStart && nowMinutes < rEnd) {
      // Match en cours
      const minsRemaining = rEnd - nowMinutes
      if (minsRemaining <= scoreWarnMinBeforeEnd) {
        return { phase: 'match-ending', currentRound: i + 1, minutesInPhase: nowMinutes - rStart, minutesUntilNext: minsRemaining }
      }
      return { phase: 'match', currentRound: i + 1, minutesInPhase: nowMinutes - rStart, minutesUntilNext: minsRemaining }
    }
    if (nowMinutes >= rEnd && nowMinutes < nextStart) {
      // Pause
      const pauseLen = nextStart - rEnd
      const elapsed = nowMinutes - rEnd
      if (elapsed >= pauseLen / 2) {
        return { phase: 'break-mid', currentRound: i + 1, minutesInPhase: elapsed, minutesUntilNext: nextStart - nowMinutes }
      }
      return { phase: 'break', currentRound: i + 1, minutesInPhase: elapsed, minutesUntilNext: nextStart - nowMinutes }
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
