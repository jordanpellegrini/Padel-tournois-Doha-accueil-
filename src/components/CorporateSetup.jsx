import { useState } from 'react'
import PlayerAutocompleteInput from './PlayerAutocompleteInput'
import { totalDurationMinutes, checkScheduleFits, maxRoundsInWindow, timeToMinutes, minutesToTime } from '../lib/scheduleLogic'

/**
 * Config d'un tournoi INTER-ENTREPRISES.
 * Ajoute la saisie des HORAIRES de location (début / fin)
 * avec vérification que le planning tient dans le créneau.
 */
export default function CorporateSetup({
  tournament,
  isAdmin,
  teams,
  onUpdateTournament,
  onAddTeam,
  onDeleteTeam,
  onEditTeam,
}) {
  const numCompanies = tournament.num_companies || 4
  const teamsPerCompany = tournament.teams_per_company || 8
  const companyNames = tournament.company_names || Array.from({ length: numCompanies }, (_, i) => `Entreprise ${String.fromCharCode(65 + i)}`)

  const [inputs, setInputs] = useState({})

  const companyColor = (idx) => {
    const colors = ['var(--neon)', 'var(--coral)', 'var(--sand-warm)', '#5b9bd5', '#b07cc6', '#5fd0a0']
    return colors[idx % colors.length]
  }

  const setInput = (key, field, value) => {
    setInputs((prev) => ({ ...prev, [key]: { ...prev[key], [field]: value } }))
  }

  const handleNumCompaniesChange = (n) => {
    const newNum = Math.max(2, Math.min(6, n))
    let names = [...companyNames]
    if (newNum > names.length) {
      while (names.length < newNum) names.push(`Entreprise ${String.fromCharCode(65 + names.length)}`)
    } else {
      names = names.slice(0, newNum)
    }
    onUpdateTournament({ num_companies: newNum, company_names: names })
  }

  const handleCompanyNameChange = (idx, name) => {
    const names = [...companyNames]
    names[idx] = name
    onUpdateTournament({ company_names: names })
  }

  const teamAt = (companyIndex, level) =>
    teams.find((t) => t.company_index === companyIndex && t.level === level)

  const handleAdd = (companyIndex, level) => {
    const key = `${companyIndex}-${level}`
    const inp = inputs[key] || {}
    if (!inp.p1?.trim() || !inp.p2?.trim()) {
      alert('Renseigne les 2 joueurs')
      return
    }
    onAddTeam(companyIndex, level, inp.p1.trim(), inp.p2.trim())
    setInput(key, 'p1', '')
    setInput(key, 'p2', '')
  }

  // ============ CALCULS DE PLANNING ============
  const matchDuration = tournament.match_duration_minutes || 40
  const breakDuration = tournament.break_duration_minutes || 5
  const startTime = (tournament.start_time || '18:00').slice(0, 5)
  const endTime = (tournament.end_time || '22:00').slice(0, 5)
  const roundsNeeded = numCompanies - 1 // chaque équipe joue numCompanies-1 matchs = ce nb de rounds min
  const scheduleCheck = checkScheduleFits(roundsNeeded, matchDuration, breakDuration, startTime, endTime)
  const totalWindow = totalDurationMinutes(startTime, endTime)
  const maxPossible = maxRoundsInWindow(totalWindow, matchDuration, breakDuration)

  return (
    <>
      {/* ============ HORAIRES DE LOCATION ============ */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h2 className="h-display" style={{ fontSize: 24, marginBottom: 16, color: 'var(--sand)' }}>🕐 HORAIRES DE LOCATION</h2>
        <p style={{ color: 'var(--gray)', fontSize: 14, marginBottom: 16 }}>
          Créneau pendant lequel les terrains sont réservés (mêmes horaires pour tous les terrains).
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14 }}>
          <div>
            <label className="label">Début</label>
            <input
              className="input"
              type="time"
              value={startTime}
              disabled={!isAdmin}
              onChange={(e) => onUpdateTournament({ start_time: e.target.value + ':00' })}
            />
          </div>
          <div>
            <label className="label">Fin</label>
            <input
              className="input"
              type="time"
              value={endTime}
              disabled={!isAdmin}
              onChange={(e) => onUpdateTournament({ end_time: e.target.value + ':00' })}
            />
          </div>
          <div>
            <label className="label">Durée totale</label>
            <div className="input" style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-deep)' }}>
              {Math.floor(totalWindow / 60)}h{String(totalWindow % 60).padStart(2, '0')}
            </div>
          </div>
        </div>

        {/* Alerte débordement */}
        <div style={{ marginTop: 16, padding: 14, borderRadius: 10, border: `2px solid ${scheduleCheck.fits ? 'var(--success)' : 'var(--danger)'}`, background: scheduleCheck.fits ? 'rgba(46,213,115,0.08)' : 'rgba(255,71,87,0.08)' }}>
          {scheduleCheck.fits ? (
            <div style={{ fontSize: 15, color: 'var(--success)' }}>
              ✅ <strong>Ça rentre !</strong> Le tournoi prendra {scheduleCheck.requiredMinutes} min (marge : {scheduleCheck.availableMinutes - scheduleCheck.requiredMinutes} min).
              <br />
              <span style={{ color: 'var(--gray)', fontSize: 13 }}>
                {roundsNeeded} round{roundsNeeded > 1 ? 's' : ''} nécessaire{roundsNeeded > 1 ? 's' : ''} · {maxPossible} possible{maxPossible > 1 ? 's' : ''} dans le créneau.
              </span>
            </div>
          ) : (
            <div style={{ fontSize: 15, color: 'var(--danger)' }}>
              ⚠️ <strong>Ça déborde de {scheduleCheck.missingMinutes} min !</strong>
              <br />
              <span style={{ fontSize: 13 }}>
                Besoin : {scheduleCheck.requiredMinutes} min · Disponible : {scheduleCheck.availableMinutes} min.
                <br />
                → Augmente le créneau, réduis la durée des matchs, ou réduis le nombre d'entreprises.
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ============ CONFIGURATION GÉNÉRALE ============ */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h2 className="h-display" style={{ fontSize: 24, marginBottom: 20, color: 'var(--sand)' }}>⚙ CONFIGURATION</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 16 }}>
          <div>
            <label className="label">Nb entreprises (2-6)</label>
            <input className="input" type="number" min="2" max="6" value={numCompanies} disabled={!isAdmin} onChange={(e) => handleNumCompaniesChange(parseInt(e.target.value) || 2)} />
          </div>
          <div>
            <label className="label">Équipes / entreprise</label>
            <input className="input" type="number" min="1" max="12" value={teamsPerCompany} disabled={!isAdmin} onChange={(e) => onUpdateTournament({ teams_per_company: Math.max(1, Math.min(12, parseInt(e.target.value) || 1)) })} />
          </div>
          <div>
            <label className="label">Durée match (min)</label>
            <input className="input" type="number" min="1" value={tournament.match_duration_minutes} disabled={!isAdmin} onChange={(e) => onUpdateTournament({ match_duration_minutes: parseInt(e.target.value) || 0 })} />
          </div>
          <div>
            <label className="label">Pause (min)</label>
            <input className="input" type="number" min="0" value={tournament.break_duration_minutes} disabled={!isAdmin} onChange={(e) => onUpdateTournament({ break_duration_minutes: parseInt(e.target.value) || 0 })} />
          </div>
          <div>
            <label className="label">Nb terrains</label>
            <input className="input" type="number" min="1" max="20" value={tournament.num_courts} disabled={!isAdmin} onChange={(e) => onUpdateTournament({ num_courts: parseInt(e.target.value) || 1 })} />
          </div>
        </div>
        <div style={{ marginTop: 20, padding: 16, background: 'var(--bg-deep)', borderRadius: 8, border: '1px solid var(--line)' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, letterSpacing: '0.15em', color: 'var(--sand-warm)' }}>📊 SIMULATION</div>
          <div style={{ marginTop: 8, fontSize: 15 }}>
            {numCompanies} entreprises × {teamsPerCompany} équipes = <strong>{numCompanies * teamsPerCompany} équipes</strong> au total.
            <br />
            Chaque équipe joue <strong style={{ color: 'var(--neon)' }}>{roundsNeeded} match{roundsNeeded > 1 ? 's' : ''}</strong> (contre les équipes de même niveau).
          </div>
        </div>
      </div>

      {/* ============ NOMS DES ENTREPRISES ============ */}
      {isAdmin && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h2 className="h-display" style={{ fontSize: 22, marginBottom: 16, color: 'var(--sand)' }}>🏢 NOMS DES ENTREPRISES</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            {Array.from({ length: numCompanies }, (_, i) => (
              <div key={i}>
                <label className="label" style={{ color: companyColor(i) }}>Entreprise {i + 1}</label>
                <input
                  className="input"
                  value={companyNames[i] || ''}
                  placeholder={`Entreprise ${String.fromCharCode(65 + i)}`}
                  onChange={(e) => handleCompanyNameChange(i, e.target.value)}
                  style={{ borderColor: companyColor(i) }}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============ ÉQUIPES PAR NIVEAU ============ */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h2 className="h-display" style={{ fontSize: 22, marginBottom: 8, color: 'var(--sand)' }}>
          👥 ÉQUIPES PAR NIVEAU
        </h2>
        <p style={{ color: 'var(--gray)', fontSize: 14, marginBottom: 20 }}>
          Niveau 1 = meilleure équipe de l'entreprise · les équipes de même niveau s'affrontent.
        </p>

        <div style={{ display: 'grid', gap: 20 }}>
          {Array.from({ length: numCompanies }, (_, c) => (
            <div key={c} style={{ border: `1px solid ${companyColor(c)}`, borderRadius: 12, padding: 16, background: 'var(--bg-deep)' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: companyColor(c), marginBottom: 14, letterSpacing: '0.05em' }}>
                {companyNames[c] || `Entreprise ${String.fromCharCode(65 + c)}`}
              </h3>

              <div style={{ display: 'grid', gap: 10 }}>
                {Array.from({ length: teamsPerCompany }, (_, l) => {
                  const level = l + 1
                  const existing = teamAt(c, level)
                  const key = `${c}-${level}`
                  const inp = inputs[key] || {}

                  return (
                    <div key={level} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: 17, color: 'var(--sand-warm)', minWidth: 70 }}>
                        NIV. {level}
                      </span>

                      {existing ? (
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '10px 14px', background: 'var(--bg-mid)', borderRadius: 8, border: '1px solid var(--line)' }}>
                          <span style={{ fontSize: 15 }}>
                            <strong>{existing.player1_name}</strong> <span style={{ color: 'var(--gray)' }}>/ {existing.player2_name}</span>
                          </span>
                          {isAdmin && (
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button onClick={() => onEditTeam(existing)} style={{ background: 'transparent', border: 'none', color: 'var(--sand-warm)', cursor: 'pointer', fontSize: 15 }} title="Modifier">✏️</button>
                              <button onClick={() => onDeleteTeam(existing.id)} style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: 20 }}>×</button>
                            </div>
                          )}
                        </div>
                      ) : isAdmin ? (
                        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 6 }}>
                          <PlayerAutocompleteInput value={inp.p1 || ''} onChange={(v) => setInput(key, 'p1', v)} placeholder="Joueur 1" />
                          <PlayerAutocompleteInput value={inp.p2 || ''} onChange={(v) => setInput(key, 'p2', v)} placeholder="Joueur 2" />
                          <button className="btn btn-primary" onClick={() => handleAdd(c, level)} style={{ padding: '10px 16px' }}>+</button>
                        </div>
                      ) : (
                        <span style={{ flex: 1, color: 'var(--gray)', fontSize: 14, fontStyle: 'italic' }}>—</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
