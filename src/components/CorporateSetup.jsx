import { useState } from 'react'

/**
 * Panneau de configuration spécifique au tournoi INTER-ENTREPRISES.
 * - Définir le nombre d'entreprises (2-6) et leurs noms
 * - Définir le nombre d'équipes par entreprise (= niveaux)
 * - Saisir les équipes de chaque entreprise, classées par niveau
 *
 * Props :
 *  tournament, isAdmin
 *  teams : équipes déjà enregistrées
 *  onUpdateTournament(patch) : maj du tournoi (num_companies, company_names, teams_per_company)
 *  onAddTeam(companyIndex, level, p1, p2)
 *  onDeleteTeam(teamId)
 *  onEditTeam(team)
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

  // Saisie en cours par cellule (companyIndex-level)
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

  return (
    <>
      {/* Réglages généraux */}
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
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '0.15em', color: 'var(--sand-warm)' }}>📊 SIMULATION</div>
          <div style={{ marginTop: 8, fontSize: 15 }}>
            {numCompanies} entreprises × {teamsPerCompany} équipes = {numCompanies * teamsPerCompany} équipes au total.
            Chaque équipe joue <strong style={{ color: 'var(--neon)' }}>{numCompanies - 1} match{numCompanies - 1 > 1 ? 's' : ''}</strong> (contre les équipes de même niveau).
          </div>
        </div>
      </div>

      {/* Noms des entreprises */}
      {isAdmin && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h2 className="h-display" style={{ fontSize: 20, marginBottom: 16, color: 'var(--sand)' }}>🏢 NOMS DES ENTREPRISES</h2>
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

      {/* Grille de saisie des équipes par entreprise et niveau */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h2 className="h-display" style={{ fontSize: 20, marginBottom: 8, color: 'var(--sand)' }}>
          👥 ÉQUIPES PAR NIVEAU
        </h2>
        <p style={{ color: 'var(--gray)', fontSize: 13, marginBottom: 20 }}>
          Niveau 1 = meilleure équipe de l'entreprise · les équipes de même niveau s'affrontent.
        </p>

        <div style={{ display: 'grid', gap: 20 }}>
          {Array.from({ length: numCompanies }, (_, c) => (
            <div key={c} style={{ border: `1px solid ${companyColor(c)}`, borderRadius: 12, padding: 16, background: 'var(--bg-deep)' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: companyColor(c), marginBottom: 14, letterSpacing: '0.05em' }}>
                {companyNames[c] || `Entreprise ${String.fromCharCode(65 + c)}`}
              </h3>

              <div style={{ display: 'grid', gap: 8 }}>
                {Array.from({ length: teamsPerCompany }, (_, l) => {
                  const level = l + 1
                  const existing = teamAt(c, level)
                  const key = `${c}-${level}`
                  const inp = inputs[key] || {}

                  return (
                    <div key={level} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: 'var(--sand-warm)', minWidth: 64 }}>
                        NIV. {level}
                      </span>

                      {existing ? (
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '8px 12px', background: 'var(--bg-mid)', borderRadius: 8, border: '1px solid var(--line)' }}>
                          <span style={{ fontSize: 14 }}>
                            <strong>{existing.player1_name}</strong> <span style={{ color: 'var(--gray)' }}>/ {existing.player2_name}</span>
                          </span>
                          {isAdmin && (
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button onClick={() => onEditTeam(existing)} style={{ background: 'transparent', border: 'none', color: 'var(--sand-warm)', cursor: 'pointer', fontSize: 14 }} title="Modifier">✏️</button>
                              <button onClick={() => onDeleteTeam(existing.id)} style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: 18 }}>×</button>
                            </div>
                          )}
                        </div>
                      ) : isAdmin ? (
                        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 6 }}>
                          <input className="input" placeholder="Joueur 1" value={inp.p1 || ''} onChange={(e) => setInput(key, 'p1', e.target.value)} style={{ padding: '8px 10px', fontSize: 13 }} onKeyDown={(e) => e.key === 'Enter' && handleAdd(c, level)} />
                          <input className="input" placeholder="Joueur 2" value={inp.p2 || ''} onChange={(e) => setInput(key, 'p2', e.target.value)} style={{ padding: '8px 10px', fontSize: 13 }} onKeyDown={(e) => e.key === 'Enter' && handleAdd(c, level)} />
                          <button className="btn btn-primary" onClick={() => handleAdd(c, level)} style={{ padding: '8px 14px' }}>+</button>
                        </div>
                      ) : (
                        <span style={{ flex: 1, color: 'var(--gray)', fontSize: 13, fontStyle: 'italic' }}>—</span>
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
