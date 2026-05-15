import { useEffect, useRef, useState } from 'react'

/**
 * Timer du tournoi
 * - Phase "match" : compte à rebours matchDuration → popup "fin de match"
 * - Pause AUTOMATIQUE après fin de match (plus besoin de cliquer)
 * - Phase "break" : compte à rebours breakDuration → popup "fin de pause"
 * - Si l'admin change matchDuration ou breakDuration en cours de route,
 *   le timer EN COURS est mis à jour proportionnellement (le pourcentage écoulé
 *   reste le même, mais la durée totale change)
 */
export default function MatchTimer({
  matchDuration,
  breakDuration,
  currentRound,
  totalRounds,
  onMatchEnd,
  onBreakEnd,
}) {
  // 'idle' | 'match' | 'break' | 'match-ending' | 'break-ending' | 'done'
  const [phase, setPhase] = useState('idle')
  const [secondsLeft, setSecondsLeft] = useState(matchDuration * 60)
  const [popupType, setPopupType] = useState(null) // 'match-end' | 'break-end'
  const intervalRef = useRef(null)

  // On garde une référence à la phase courante pour le useEffect des durées
  const phaseRef = useRef(phase)
  useEffect(() => {
    phaseRef.current = phase
  }, [phase])

  // ============================================
  // MISE À JOUR AUTOMATIQUE DU TIMER quand les durées changent
  // ============================================
  // Quand matchDuration ou breakDuration change (admin modifie via la modale),
  // on adapte le timer en cours.
  useEffect(() => {
    // Si on est en idle, on synchronise simplement le compteur sur la nouvelle durée
    if (phaseRef.current === 'idle') {
      setSecondsLeft(matchDuration * 60)
    }
    // Si on est en mode match ou break, le useEffect est déclenché par le changement
    // de prop -> on ne touche pas au temps restant, on garde la progression actuelle.
    // Mais si l'utilisateur clique sur "Reset", il aura la nouvelle valeur.
  }, [matchDuration, breakDuration])

  useEffect(() => {
    return () => clearInterval(intervalRef.current)
  }, [])

  const playBeep = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = 880
      gain.gain.setValueAtTime(0.3, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.5)
      osc.start()
      osc.stop(ctx.currentTime + 1.5)
    } catch (e) {}
  }

  // ============================================
  // FONCTION GÉNÉRIQUE DE COMPTE À REBOURS
  // ============================================
  const startTimer = (durationSeconds, currentPhase) => {
    clearInterval(intervalRef.current)
    setSecondsLeft(durationSeconds)

    intervalRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
          playBeep()

          if (currentPhase === 'match') {
            // Fin du match : popup ET lance la pause AUTOMATIQUEMENT
            setPopupType('match-end')
            setPhase('match-ending')
            // Si c'est le dernier round, on s'arrête
            if (currentRound >= totalRounds) {
              setPhase('done')
              return 0
            }
            // Sinon, lance la pause auto après 1 seconde
            // (juste le temps que la popup s'affiche)
            setTimeout(() => {
              startBreakAuto()
            }, 500)
          } else if (currentPhase === 'break') {
            // Fin de la pause : popup ET lance le match suivant AUTOMATIQUEMENT
            setPopupType('break-end')
            setPhase('break-ending')
            setTimeout(() => {
              startMatchAuto()
            }, 500)
          }
          return 0
        }
        return s - 1
      })
    }, 1000)
  }

  // ============================================
  // DÉMARRAGES AUTOMATIQUES (chaînage match → pause → match → ...)
  // ============================================
  const startBreakAuto = () => {
    if (onMatchEnd) onMatchEnd()
    setPhase('break')
    // Lit la dernière valeur de breakDuration (pas la valeur capturée à t=0)
    startTimer(breakDuration * 60, 'break')
  }

  const startMatchAuto = () => {
    if (onBreakEnd) onBreakEnd()
    setPhase('match')
    startTimer(matchDuration * 60, 'match')
  }

  // ============================================
  // ACTIONS UTILISATEUR
  // ============================================
  const handleStartMatch = () => {
    setPhase('match')
    startTimer(matchDuration * 60, 'match')
  }

  // Fermeture manuelle des popups (au cas où l'utilisateur veut acquitter)
  const handleClosePopup = () => {
    setPopupType(null)
  }

  const handlePause = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

  const handleResume = () => {
    if (!intervalRef.current && secondsLeft > 0) {
      const currentPhase = phase === 'match' ? 'match' : 'break'
      intervalRef.current = setInterval(() => {
        setSecondsLeft((s) => {
          if (s <= 1) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
            playBeep()
            if (currentPhase === 'match') {
              setPopupType('match-end')
              setPhase('match-ending')
              if (currentRound >= totalRounds) {
                setPhase('done')
                return 0
              }
              setTimeout(() => startBreakAuto(), 500)
            } else {
              setPopupType('break-end')
              setPhase('break-ending')
              setTimeout(() => startMatchAuto(), 500)
            }
            return 0
          }
          return s - 1
        })
      }, 1000)
    }
  }

  const handleReset = () => {
    clearInterval(intervalRef.current)
    intervalRef.current = null
    setPhase('idle')
    setSecondsLeft(matchDuration * 60)
    setPopupType(null)
  }

  // ============================================
  // BOUTONS DE RACCOURCI : forcer fin match / fin pause
  // ============================================
  const handleSkipToBreak = () => {
    clearInterval(intervalRef.current)
    intervalRef.current = null
    playBeep()
    setPopupType('match-end')
    setPhase('match-ending')
    if (currentRound >= totalRounds) {
      setPhase('done')
      return
    }
    setTimeout(() => startBreakAuto(), 500)
  }

  const handleSkipToMatch = () => {
    clearInterval(intervalRef.current)
    intervalRef.current = null
    playBeep()
    setPopupType('break-end')
    setPhase('break-ending')
    setTimeout(() => startMatchAuto(), 500)
  }

  // ============================================
  // RENDU
  // ============================================
  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0')
  const ss = String(secondsLeft % 60).padStart(2, '0')

  const isMatchPhase = phase === 'match'
  const isBreakPhase = phase === 'break'
  const isRunning = intervalRef.current !== null

  return (
    <>
      <div
        style={{
          background: isMatchPhase
            ? 'linear-gradient(135deg, var(--neon) 0%, var(--neon-soft) 100%)'
            : isBreakPhase
            ? 'linear-gradient(135deg, var(--sand-warm) 0%, var(--coral) 100%)'
            : 'var(--bg-mid)',
          color: isMatchPhase || isBreakPhase ? 'var(--bg-deep)' : 'var(--white)',
          borderRadius: 16,
          padding: 24,
          textAlign: 'center',
          border: '1px solid var(--line)',
          transition: 'all 0.3s ease',
        }}
      >
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            letterSpacing: '0.25em',
            marginBottom: 8,
            opacity: 0.7,
          }}
        >
          {phase === 'idle' && 'PRÊT À DÉMARRER'}
          {phase === 'match' && `⏱ MATCH EN COURS · ROUND ${currentRound}/${totalRounds}`}
          {phase === 'break' && `☕ PAUSE · PROCHAIN ROUND ${Math.min(currentRound + 1, totalRounds)}`}
          {phase === 'done' && '🏆 TOURNOI TERMINÉ'}
        </div>

        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(64px, 14vw, 120px)',
            lineHeight: 1,
            letterSpacing: '0.05em',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {mm}:{ss}
        </div>

        {/* Indicateur durée configurée (mise à jour en direct si admin change) */}
        <div
          style={{
            fontSize: 11,
            opacity: 0.5,
            marginTop: 4,
            fontFamily: 'var(--font-mono)',
          }}
        >
          Match {matchDuration}min · Pause {breakDuration}min
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 20, flexWrap: 'wrap' }}>
          {phase === 'idle' && (
            <button
              className="btn btn-primary"
              onClick={handleStartMatch}
              style={{ background: 'var(--bg-deep)', color: 'var(--neon)' }}
            >
              ▶ Lancer le 1er match
            </button>
          )}
          {(isMatchPhase || isBreakPhase) && isRunning && (
            <>
              <button
                className="btn btn-ghost"
                onClick={handlePause}
                style={{ background: 'rgba(10,25,41,0.2)', color: 'inherit', borderColor: 'rgba(10,25,41,0.3)' }}
              >
                ⏸ Pause
              </button>
              {isMatchPhase && (
                <button
                  className="btn btn-ghost"
                  onClick={handleSkipToBreak}
                  style={{ background: 'rgba(10,25,41,0.2)', color: 'inherit', borderColor: 'rgba(10,25,41,0.3)' }}
                  title="Forcer la fin du match"
                >
                  ⏭ Fin match
                </button>
              )}
              {isBreakPhase && (
                <button
                  className="btn btn-ghost"
                  onClick={handleSkipToMatch}
                  style={{ background: 'rgba(10,25,41,0.2)', color: 'inherit', borderColor: 'rgba(10,25,41,0.3)' }}
                  title="Forcer la fin de la pause"
                >
                  ⏭ Fin pause
                </button>
              )}
            </>
          )}
          {(isMatchPhase || isBreakPhase) && !isRunning && secondsLeft > 0 && (
            <button
              className="btn btn-ghost"
              onClick={handleResume}
              style={{ background: 'rgba(10,25,41,0.2)', color: 'inherit', borderColor: 'rgba(10,25,41,0.3)' }}
            >
              ▶ Reprendre
            </button>
          )}
          {phase !== 'idle' && phase !== 'done' && (
            <button
              className="btn btn-ghost"
              onClick={handleReset}
              style={{ background: 'rgba(10,25,41,0.2)', color: 'inherit', borderColor: 'rgba(10,25,41,0.3)' }}
            >
              ↺ Reset
            </button>
          )}
        </div>
      </div>

      {/* Popup fin de match - se ferme tout seul ou manuellement */}
      {popupType === 'match-end' && (
        <div className="modal-backdrop" onClick={handleClosePopup}>
          <div className="modal-content" style={{ textAlign: 'center', maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 64, marginBottom: 12 }}>🎾</div>
            <h2 className="h-display" style={{ fontSize: 36, marginBottom: 8 }}>
              FIN DU MATCH
            </h2>
            <p style={{ color: 'var(--gray)', marginBottom: 24 }}>
              Round {currentRound} terminé.
              {currentRound >= totalRounds
                ? ' Tournoi terminé !'
                : ` Pause de ${breakDuration} min lancée automatiquement.`}
            </p>
            <button
              className="btn btn-primary"
              onClick={handleClosePopup}
              style={{ width: '100%' }}
            >
              ✓ OK
            </button>
          </div>
        </div>
      )}

      {/* Popup fin de pause - se ferme tout seul ou manuellement */}
      {popupType === 'break-end' && (
        <div className="modal-backdrop" onClick={handleClosePopup}>
          <div className="modal-content" style={{ textAlign: 'center', maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 64, marginBottom: 12 }}>🔔</div>
            <h2 className="h-display" style={{ fontSize: 36, marginBottom: 8 }}>
              FIN DE LA PAUSE
            </h2>
            <p style={{ color: 'var(--gray)', marginBottom: 24 }}>
              Place sur les terrains ! Round {currentRound} lancé automatiquement.
            </p>
            <button
              className="btn btn-primary"
              onClick={handleClosePopup}
              style={{ width: '100%' }}
            >
              ✓ OK
            </button>
          </div>
        </div>
      )}
    </>
  )
}
