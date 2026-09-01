// ============================================
// GENERATION PDF DU PLANNING (via window.print)
// ============================================
// Ouvre une nouvelle fenetre avec un HTML formaté imprimable/téléchargeable en PDF.
// Aucune dépendance externe : on utilise juste window.print() du navigateur.

import { computeRoundStartTimes, timeToMinutes, minutesToTime } from './scheduleLogic'

/**
 * Génère et ouvre le planning imprimable.
 * @param {object} tournament
 * @param {Array} teams
 * @param {Array} matches
 * @param {string} orgName  Nom de l'organisation
 */
export function openPlanningPDF(tournament, teams, matches, orgName = 'Doha Accueil') {
  const matchDuration = tournament.match_duration_minutes || 40
  const breakDuration = tournament.break_duration_minutes || 5
  const startTime = (tournament.start_time || '18:00').slice(0, 5)
  const numCourts = tournament.num_courts || 4
  const companyNames = tournament.company_names || []

  const totalRounds = Math.max(0, ...matches.map((m) => m.round_number || 0))
  const roundStartTimes = computeRoundStartTimes(totalRounds, matchDuration, breakDuration, startTime)

  const teamById = (id) => teams.find((t) => t.id === id)

  // Construit les lignes du planning : une par round
  const rows = []
  for (let r = 1; r <= totalRounds; r++) {
    const startMin = timeToMinutes(roundStartTimes[r - 1] || startTime)
    const endMin = startMin + matchDuration
    const roundMatches = matches.filter((m) => m.round_number === r)
    const byCourt = {}
    for (let c = 1; c <= numCourts; c++) byCourt[c] = null
    roundMatches.forEach((m) => { byCourt[m.court_number] = m })
    rows.push({
      round: r,
      startLabel: roundStartTimes[r - 1] || '--:--',
      endLabel: minutesToTime(endMin),
      courts: byCourt,
    })
  }

  const isCorporate = tournament.tournament_type === 'corporate'
  const isKnockout = tournament.tournament_type === 'knockout'
  const typeLabel = isCorporate ? 'Inter-entreprises' : isKnockout ? 'Knockout' : 'Au temps'

  // Description d'un match : "Marie/Paul (Total) vs Ana/Léo (Dassault)"
  const describeMatch = (m) => {
    if (!m) return { html: '<span class="empty">—</span>', level: '' }
    const a = teamById(m.team_a_id)
    const b = teamById(m.team_b_id)
    const compA = a && companyNames[a.company_index]
    const compB = b && companyNames[b.company_index]
    const nameA = a ? `${a.player1_name} / ${a.player2_name}` : (m.team_a_placeholder || '?')
    const nameB = b ? `${b.player1_name} / ${b.player2_name}` : (m.team_b_placeholder || '?')
    const compHtml = (c) => c ? `<span class="comp">${escapeHtml(c)}</span>` : ''
    const level = m.level ? `Niv. ${m.level}` : (m.pool_index !== null && m.pool_index !== undefined ? `Poule ${String.fromCharCode(65 + m.pool_index)}` : (m.bracket_label || ''))
    return {
      html: `
        <div class="teamline"><span class="tname">${escapeHtml(nameA)}</span> ${compHtml(compA)}</div>
        <div class="vs">vs</div>
        <div class="teamline"><span class="tname">${escapeHtml(nameB)}</span> ${compHtml(compB)}</div>
      `,
      level,
    }
  }

  // ================= HTML =================
  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<title>Planning · ${escapeHtml(tournament.name || 'Tournoi')}</title>
<style>
  @page { size: A4 portrait; margin: 14mm; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1a2634; margin: 0; padding: 24px; background: #fff; }
  .header { border-bottom: 3px solid #1a2634; padding-bottom: 14px; margin-bottom: 20px; }
  h1 { font-size: 28px; margin: 0; letter-spacing: 0.02em; text-transform: uppercase; }
  .subtitle { color: #6b7c8f; font-size: 14px; margin-top: 6px; }
  .badges { margin-top: 10px; display: flex; gap: 8px; flex-wrap: wrap; }
  .badge { display: inline-block; padding: 4px 10px; background: #eef2f6; border: 1px solid #d5dde5; border-radius: 999px; font-size: 12px; }
  .meta { margin: 16px 0 24px; display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 8px; }
  .meta-item { padding: 10px 12px; background: #f6f8fa; border-radius: 8px; border: 1px solid #e0e6ec; }
  .meta-item .label { font-size: 11px; color: #6b7c8f; text-transform: uppercase; letter-spacing: 0.1em; }
  .meta-item .value { font-size: 15px; font-weight: 700; margin-top: 2px; }
  h2 { font-size: 18px; margin: 20px 0 10px; padding-bottom: 6px; border-bottom: 2px solid #d5dde5; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  th, td { border: 1px solid #d5dde5; padding: 8px 6px; text-align: left; vertical-align: top; font-size: 12px; }
  th { background: #1a2634; color: #fff; font-size: 12px; letter-spacing: 0.05em; text-transform: uppercase; }
  .time-col { width: 90px; }
  .round-col { width: 60px; }
  td.round-cell { text-align: center; font-weight: 700; font-size: 15px; background: #f6f8fa; }
  td.time-cell { text-align: center; font-family: 'Menlo', monospace; background: #f6f8fa; }
  td.time-cell .start { font-weight: 700; font-size: 14px; }
  td.time-cell .end { color: #6b7c8f; font-size: 11px; }
  .teamline { font-size: 11px; line-height: 1.3; }
  .tname { font-weight: 600; }
  .comp { display: inline-block; margin-left: 4px; padding: 1px 5px; background: #eef2f6; border-radius: 3px; font-size: 10px; color: #4a5b6f; }
  .vs { text-align: center; color: #a0aabb; font-size: 10px; font-weight: 700; padding: 2px 0; }
  .level { font-size: 10px; color: #6b7c8f; text-align: center; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.05em; }
  .empty { color: #c5cfd9; font-style: italic; }
  .companies { display: flex; flex-wrap: wrap; gap: 6px; margin: 12px 0 24px; }
  .company-tag { padding: 4px 10px; background: #f6f8fa; border: 1px solid #d5dde5; border-radius: 6px; font-size: 12px; font-weight: 600; }
  .footer { margin-top: 30px; padding-top: 10px; border-top: 1px solid #d5dde5; font-size: 11px; color: #6b7c8f; text-align: center; }
  .print-btn { position: fixed; top: 20px; right: 20px; padding: 12px 20px; background: #d4ff3a; color: #0a1929; border: none; border-radius: 8px; font-size: 15px; font-weight: 700; cursor: pointer; box-shadow: 0 4px 14px rgba(0,0,0,0.2); }
  @media print { .print-btn { display: none; } body { padding: 0; } }
</style>
</head>
<body>
  <button class="print-btn" onclick="window.print()">🖨️ Imprimer / PDF</button>

  <div class="header">
    <h1>${escapeHtml(tournament.name || 'Tournoi de Pádel')}</h1>
    <div class="subtitle">Organisé par ${escapeHtml(orgName)} · Planning des matchs</div>
    <div class="badges">
      <span class="badge">🎾 ${escapeHtml(typeLabel)}</span>
      <span class="badge">📅 ${escapeHtml(tournament.tournament_date || '')}</span>
    </div>
  </div>

  <div class="meta">
    <div class="meta-item"><div class="label">Début</div><div class="value">${escapeHtml(startTime)}</div></div>
    <div class="meta-item"><div class="label">Fin prévue</div><div class="value">${escapeHtml((tournament.end_time || '').slice(0,5))}</div></div>
    <div class="meta-item"><div class="label">Durée match</div><div class="value">${matchDuration} min</div></div>
    <div class="meta-item"><div class="label">Pause</div><div class="value">${breakDuration} min</div></div>
    <div class="meta-item"><div class="label">Terrains</div><div class="value">${numCourts}</div></div>
    <div class="meta-item"><div class="label">Équipes</div><div class="value">${teams.length}</div></div>
  </div>

  ${isCorporate && companyNames.length ? `
    <h2>🏢 Entreprises participantes</h2>
    <div class="companies">
      ${companyNames.map((n) => `<span class="company-tag">${escapeHtml(n)}</span>`).join('')}
    </div>
  ` : ''}

  <h2>📋 Planning des matchs</h2>
  <table>
    <thead>
      <tr>
        <th class="round-col">R</th>
        <th class="time-col">Horaire</th>
        ${Array.from({ length: numCourts }, (_, i) => `<th>Terrain ${i + 1}</th>`).join('')}
      </tr>
    </thead>
    <tbody>
      ${rows.map((row) => `
        <tr>
          <td class="round-cell">${row.round}</td>
          <td class="time-cell">
            <div class="start">${row.startLabel}</div>
            <div class="end">→ ${row.endLabel}</div>
          </td>
          ${Array.from({ length: numCourts }, (_, i) => {
            const m = row.courts[i + 1]
            const desc = describeMatch(m)
            return `<td>${desc.html}${desc.level ? `<div class="level">${escapeHtml(desc.level)}</div>` : ''}</td>`
          }).join('')}
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="footer">
    Généré le ${new Date().toLocaleString('fr-FR')} · ${escapeHtml(orgName)}
  </div>
</body>
</html>`

  // Ouvre dans un nouvel onglet
  const w = window.open('', '_blank')
  if (!w) {
    alert("Le navigateur a bloqué la fenêtre pop-up. Autorise les pop-ups pour ce site et réessaie.")
    return
  }
  w.document.open()
  w.document.write(html)
  w.document.close()
}

function escapeHtml(s) {
  if (s === null || s === undefined) return ''
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
