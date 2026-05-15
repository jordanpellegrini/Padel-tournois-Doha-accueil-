import { useEffect, useRef, useState } from 'react'

/**
 * Timer du tournoi en cours
 * - Phase "match" : compte à rebours matchDuration → popup "fin de match"
 * - Phase "break" : compte à rebours breakDuration → popup "fin de pause"
 */
export default function MatchTimer({
  matchDuration,
  breakDuration,
  currentRound,
  totalRounds,
  onMatchEnd,
  onBreakEnd,
}) {
  // 'idle' | 'match' | 'break' | 'done'
  const [phase, setPhase] = useState('idle')
  const [secondsLeft, setSecondsLeft] = useState(matchDuration * 60)
  const [popupType, setPopupType] = useState(null) // 'match-end' | 'break-end'
  const intervalRef = useRef(null)
  const audioRef = useRef(null)

  useEffect(() => {
    return () => clearInterval(intervalRef.current)
  }, [])

  const playBeep = () => {
    try {
      // Beep simple via Web Audio API
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
    } catch (e) {
      // pas grave si le navigateur bloque
    }
  }

  const startTimer = (durationSeconds, nextPhase) => {
    clearInterval(intervalRef.current)
    setSecondsLeft(durationSeconds)
    intervalRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(intervalRef.current)
          playBeep()
          if (nextPhase === 'match') {
            setPopupType('match-end')
            setPhase('match-ending')
          } else {
            setPopupType('break-end')
            setPhase('break-ending')
          }
          return 0
        }
        return s - 1
      })
    }, 1000)
  }

  const handleStartMatch = () => {
    setPhase('match')
    startTimer(matchDuration * 60, 'match')
  }

  // Popup fin de match → utilisateur clique "OK pause" → démarre la pause
  const handleMatchEndConfirm = () => {
    setPopupType(null)
    if (onMatchEnd) onMatchEnd()
    if (currentRound >= totalRounds) {
      setPhase('done')
      return
    }
    setPhase('break')
    startTimer(breakDuration * 60, 'break')
  }

  // Popup fin de pause → utilisateur clique "Démarrer match suivant"
  const handleBreakEndConfirm = () => {
    setPopupType(null)
    if (onBreakEnd) onBreakEnd()
    setPhase('match')
    startTimer(matchDuration * 60, 'match')
  }

  const handlePause = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

  const handleResume = () => {
    if (!intervalRef.current && secondsLeft > 0) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft((s) => {
          if (s <= 1) {
            clearInterval(intervalRef.current)
            playBeep()
            if (phase === 'match') {
              setPopupType('match-end')
              setPhase('match-ending')
            } else if (phase === 'break') {
              setPopupType('break-end')
              setPhase('break-ending')
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
          {phase === 'break' && '☕ PAUSE'}
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
            <button
              className="btn btn-ghost"
              onClick={handlePause}
              style={{ background: 'rgba(10,25,41,0.2)', color: 'inherit', borderColor: 'rgba(10,25,41,0.3)' }}
            >
              ⏸ Pause
            </button>
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

      {/* Popup fin de match */}
      {popupType === 'match-end' && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ textAlign: 'center', maxWidth: 420 }}>
            <div style={{ fontSize: 64, marginBottom: 12 }}>🎾</div>
            <h2 className="h-display" style={{ fontSize: 36, marginBottom: 8 }}>
              FIN DU MATCH
            </h2>
            <p style={{ color: 'var(--gray)', marginBottom: 24 }}>
              Round {currentRound} terminé. Saisis les scores puis lance la pause.
            </p>
            <button
              className="btn btn-primary"
              onClick={handleMatchEndConfirm}
              style={{ width: '100%' }}
            >
              {currentRound >= totalRounds ? '🏆 Terminer le tournoi' : `☕ Démarrer pause (${breakDuration}min)`}
            </button>
          </div>
        </div>
      )}

      {/* Popup fin de pause */}
      {popupType === 'break-end' && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ textAlign: 'center', maxWidth: 420 }}>
            <div style={{ fontSize: 64, marginBottom: 12 }}>🔔</div>
            <h2 className="h-display" style={{ fontSize: 36, marginBottom: 8 }}>
              FIN DE LA PAUSE
            </h2>
            <p style={{ color: 'var(--gray)', marginBottom: 24 }}>
              Place sur les terrains ! Round {currentRound + 1} va commencer.
            </p>
            <button
              className="btn btn-primary"
              onClick={handleBreakEndConfirm}
              style={{ width: '100%' }}
            >
              ▶ Démarrer le match suivant
            </button>
          </div>
        </div>
      )}
    </>
  )
}
