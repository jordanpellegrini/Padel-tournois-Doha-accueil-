import { useEffect, useRef, useState } from 'react'

/**
 * Timer du tournoi
 * - Match : matchDuration min
 *   - À 5min de la fin → popup + 1 coup de sifflet
 *   - À la fin → popup + 2 coups + pause auto
 * - Pause : breakDuration min
 *   - À 2min de la fin → popup + 1 coup
 *   - À la fin → popup + 2 coups + match auto
 */
export default function MatchTimer({
  matchDuration,
  breakDuration,
  currentRound,
  totalRounds,
  onMatchEnd,
  onBreakEnd,
}) {
  const [phase, setPhase] = useState('idle')
  const [secondsLeft, setSecondsLeft] = useState(matchDuration * 60)
  const [popupType, setPopupType] = useState(null)
  // ⭐ FIX : on utilise un STATE et non une ref pour que React re-render
  // quand on met en pause / reprend
  const [isRunning, setIsRunning] = useState(false)

  const intervalRef = useRef(null)
  const matchWarningShownRef = useRef(false)
  const breakWarningShownRef = useRef(false)

  const phaseRef = useRef(phase)
  useEffect(() => {
    phaseRef.current = phase
  }, [phase])

  useEffect(() => {
    if (phaseRef.current === 'idle') {
      setSecondsLeft(matchDuration * 60)
    }
  }, [matchDuration, breakDuration])

  useEffect(() => {
    return () => {
      clearInterval(intervalRef.current)
    }
  }, [])

  const playSingleBeep = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = 880
      gain.gain.setValueAtTime(0.3, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.0)
      osc.start()
      osc.stop(ctx.currentTime + 1.0)
    } catch (e) {}
  }

  const playDoubleBeep = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      const osc1 = ctx.createOscillator()
      const gain1 = ctx.createGain()
      osc1.connect(gain1)
      gain1.connect(ctx.destination)
      osc1.frequency.value = 880
      gain1.gain.setValueAtTime(0.3, ctx.currentTime)
      gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6)
      osc1.start(ctx.currentTime)
      osc1.stop(ctx.currentTime + 0.6)
      const osc2 = ctx.createOscillator()
      const gain2 = ctx.createGain()
      osc2.connect(gain2)
      gain2.connect(ctx.destination)
      osc2.frequency.value = 880
      gain2.gain.setValueAtTime(0.3, ctx.currentTime + 0.7)
      gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.4)
      osc2.start(ctx.currentTime + 0.7)
      osc2.stop(ctx.currentTime + 1.4)
    } catch (e) {}
  }

  // ============================================
  // FONCTION INTERNE : démarre un intervalle qui décrémente
  // ============================================
  const startInterval = (currentPhase) => {
    clearInterval(intervalRef.current)
    setIsRunning(true) // ⭐ on met le state à true

    intervalRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        const newSeconds = s - 1

        // Avertissements
        if (currentPhase === 'match' && !matchWarningShownRef.current && newSeconds === 5 * 60) {
          matchWarningShownRef.current = true
          playSingleBeep()
          setPopupType('match-warning')
        } else if (currentPhase === 'break' && !breakWarningShownRef.current && newSeconds === 2 * 60) {
          breakWarningShownRef.current = true
          playSingleBeep()
          setPopupType('break-warning')
        }

        // Fin du timer
        if (s <= 1) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
          setIsRunning(false)
          playDoubleBeep()

          if (currentPhase === 'match') {
            setPopupType('match-end')
            setPhase('match-ending')
            if (currentRound >= totalRounds) {
              setPhase('done')
              return 0
            }
            setTimeout(() => startBreakAuto(), 500)
          } else if (currentPhase === 'break') {
            setPopupType('break-end')
            setPhase('break-ending')
            setTimeout(() => startMatchAuto(), 500)
          }
          return 0
        }

        return newSeconds
      })
    }, 1000)
  }

  const startTimer = (durationSeconds, currentPhase) => {
    setSecondsLeft(durationSeconds)
    if (currentPhase === 'match') matchWarningShownRef.current = false
    else if (currentPhase === 'break') breakWarningShownRef.current = false
    startInterval(currentPhase)
  }

  const startBreakAuto = () => {
    if (onMatchEnd) onMatchEnd()
    setPhase('break')
    startTimer(breakDuration * 60, 'break')
  }

  const startMatchAuto = () => {
    if (onBreakEnd) onBreakEnd()
    setPhase('match')
    startTimer(matchDuration * 60, 'match')
  }

  const handleStartMatch = () => {
    setPhase('match')
    startTimer(matchDuration * 60, 'match')
  }

  const handleClosePopup = () => {
    setPopupType(null)
  }

  // ⭐ PAUSE : arrête l'intervalle et passe isRunning à false
  const handlePause = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
      setIsRunning(false)
    }
  }

  // ⭐ RESUME : redémarre l'intervalle et passe isRunning à true
  const handleResume = () => {
    if (!intervalRef.current && secondsLeft > 0) {
      const currentPhase = phase === 'match' ? 'match' : 'break'
      startInterval(currentPhase)
    }
  }

  const handleReset = () => {
    clearInterval(intervalRef.current)
    intervalRef.current = null
    setIsRunning(false)
    setPhase('idle')
    setSecondsLeft(matchDuration * 60)
    setPopupType(null)
    matchWarningShownRef.current = false
    breakWarningShownRef.current = false
  }

  const handleSkipToBreak = () => {
    clearInterval(intervalRef.current)
    intervalRef.current = null
    setIsRunning(false)
    playDoubleBeep()
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
    setIsRunning(false)
    playDoubleBeep()
    setPopupType('break-end')
    setPhase('break-ending')
    setTimeout(() => startMatchAuto(), 500)
  }

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0')
  const ss = String(secondsLeft % 60).padStart(2, '0')

  const isMatchPhase = phase === 'match'
  const isBreakPhase = phase === 'break'
  const isActivePhase = isMatchPhase || isBreakPhase

  return (
    <>
      <div
        style={{
          background: isMatchPhase
            ? 'linear-gradient(135deg, var(--neon) 0%, var(--neon-soft) 100%)'
            : isBreakPhase
            ? 'linear-gradient(135deg, var(--sand-warm) 0%, var(--coral) 100%)'
            : 'var(--bg-mid)',
          color: isActivePhase ? 'var(--bg-deep)' : 'var(--white)',
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
            // ⭐ Visuel "pause" : on fait clignoter le timer en pause
            opacity: isActivePhase && !isRunning ? 0.5 : 1,
            transition: 'opacity 0.2s ease',
          }}
        >
          {mm}:{ss}
        </div>

        {/* Indicateur "EN PAUSE" quand on a appuyé sur ⏸ */}
        {isActivePhase && !isRunning && (
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              letterSpacing: '0.3em',
              opacity: 0.7,
              marginTop: 4,
            }}
          >
            ⏸ EN PAUSE
          </div>
        )}

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

          {/* ⭐ Quand actif ET en cours : bouton ⏸ Pause */}
          {isActivePhase && isRunning && (
            <>
              <button
                className="btn btn-ghost"
                onClick={handlePause}
                style={{
                  background: 'rgba(10,25,41,0.2)',
                  color: 'inherit',
                  borderColor: 'rgba(10,25,41,0.3)',
                }}
              >
                ⏸ Pause
              </button>
              {isMatchPhase && (
                <button
                  className="btn btn-ghost"
                  onClick={handleSkipToBreak}
                  style={{
                    background: 'rgba(10,25,41,0.2)',
                    color: 'inherit',
                    borderColor: 'rgba(10,25,41,0.3)',
                  }}
                  title="Forcer la fin du match"
                >
                  ⏭ Fin match
                </button>
              )}
              {isBreakPhase && (
                <button
                  className="btn btn-ghost"
                  onClick={handleSkipToMatch}
                  style={{
                    background: 'rgba(10,25,41,0.2)',
                    color: 'inherit',
                    borderColor: 'rgba(10,25,41,0.3)',
                  }}
                  title="Forcer la fin de la pause"
                >
                  ⏭ Fin pause
                </button>
              )}
            </>
          )}

          {/* ⭐ Quand actif MAIS pas en cours (en pause) : bouton ▶ Reprendre */}
          {isActivePhase && !isRunning && secondsLeft > 0 && (
            <button
              className="btn btn-primary"
              onClick={handleResume}
              style={{
                background: 'var(--bg-deep)',
                color: isMatchPhase ? 'var(--neon)' : 'var(--coral)',
                fontSize: 18,
              }}
            >
              ▶ Reprendre
            </button>
          )}

          {phase !== 'idle' && phase !== 'done' && (
            <button
              className="btn btn-ghost"
              onClick={handleReset}
              style={{
                background: 'rgba(10,25,41,0.2)',
                color: 'inherit',
                borderColor: 'rgba(10,25,41,0.3)',
              }}
            >
              ↺ Reset
            </button>
          )}
        </div>
      </div>

      {/* POPUP : 5 MIN AVANT FIN DU MATCH */}
      {popupType === 'match-warning' && (
        <div className="modal-backdrop" onClick={handleClosePopup}>
          <div className="modal-content" style={{ textAlign: 'center', maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 64, marginBottom: 12 }}>⏰</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.25em', color: 'var(--sand-warm)', marginBottom: 8 }}>
              🔔 1 COUP DE SIFFLET
            </div>
            <h2 className="h-display" style={{ fontSize: 36, marginBottom: 8, color: 'var(--neon)' }}>
              5 MINUTES
            </h2>
            <p style={{ color: 'var(--gray)', marginBottom: 24 }}>
              Plus que 5 minutes avant la fin du match.
            </p>
            <button className="btn btn-primary" onClick={handleClosePopup} style={{ width: '100%' }}>
              ✓ OK
            </button>
          </div>
        </div>
      )}

      {/* POPUP : FIN DU MATCH */}
      {popupType === 'match-end' && (
        <div className="modal-backdrop" onClick={handleClosePopup}>
          <div className="modal-content" style={{ textAlign: 'center', maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 64, marginBottom: 12 }}>🎾</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.25em', color: 'var(--sand-warm)', marginBottom: 8 }}>
              🔔🔔 2 COUPS DE SIFFLET
            </div>
            <h2 className="h-display" style={{ fontSize: 36, marginBottom: 8 }}>
              FIN DU MATCH
            </h2>
            <p style={{ color: 'var(--gray)', marginBottom: 24 }}>
              Round {currentRound} terminé.
              {currentRound >= totalRounds
                ? ' Tournoi terminé !'
                : ` Pause de ${breakDuration} min lancée automatiquement.`}
            </p>
            <button className="btn btn-primary" onClick={handleClosePopup} style={{ width: '100%' }}>
              ✓ OK
            </button>
          </div>
        </div>
      )}

      {/* POPUP : 2 MIN AVANT FIN DE PAUSE */}
      {popupType === 'break-warning' && (
        <div className="modal-backdrop" onClick={handleClosePopup}>
          <div className="modal-content" style={{ textAlign: 'center', maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 64, marginBottom: 12 }}>☕</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.25em', color: 'var(--sand-warm)', marginBottom: 8 }}>
              🔔 1 COUP DE SIFFLET
            </div>
            <h2 className="h-display" style={{ fontSize: 36, marginBottom: 8, color: 'var(--coral)' }}>
              2 MINUTES
            </h2>
            <p style={{ color: 'var(--gray)', marginBottom: 24 }}>
              Plus que 2 minutes de pause. Préparez-vous à reprendre les terrains !
            </p>
            <button className="btn btn-primary" onClick={handleClosePopup} style={{ width: '100%' }}>
              ✓ OK
            </button>
          </div>
        </div>
      )}

      {/* POPUP : REPRISE DES MATCHS */}
      {popupType === 'break-end' && (
        <div className="modal-backdrop" onClick={handleClosePopup}>
          <div className="modal-content" style={{ textAlign: 'center', maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 64, marginBottom: 12 }}>🔔</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.25em', color: 'var(--sand-warm)', marginBottom: 8 }}>
              🔔🔔 2 COUPS DE SIFFLET
            </div>
            <h2 className="h-display" style={{ fontSize: 36, marginBottom: 8 }}>
              REPRISE DES MATCHS
            </h2>
            <p style={{ color: 'var(--gray)', marginBottom: 24 }}>
              Place sur les terrains ! Round {currentRound} lancé automatiquement.
            </p>
            <button className="btn btn-primary" onClick={handleClosePopup} style={{ width: '100%' }}>
              ✓ OK
            </button>
          </div>
        </div>
      )}
    </>
  )
}
