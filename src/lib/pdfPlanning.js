// ============================================
// GENERATION PDF DU PLANNING (via window.print)
// ============================================
// Ouvre une nouvelle fenetre avec un HTML formaté imprimable/téléchargeable en PDF.
// Chaque équipe/entreprise a une couleur pastel unique pour repérage rapide.

import { computeRoundStartTimes } from './scheduleLogic'

// ================= PALETTE DE COULEURS PASTEL =================
// Fond doux + bordure plus foncée pour bien identifier chaque groupe.
// Choisi pour rester lisible en impression (fond clair, texte noir).
const PASTEL_COLORS = [
  { bg: '#FFE4CC', border: '#E8863A', name: 'Pêche' },
  { bg: '#CCE7FF', border: '#3A80E8', name: 'Bleu' },
  { bg: '#D5F5C7', border: '#5FA83A', name: 'Vert' },
  { bg: '#FFCCD9', border: '#E83A6A', name: 'Rose' },
  { bg: '#E1CCFF', border: '#7A3AE8', name: 'Violet' },
  { bg: '#FFF3CC', border: '#D4B000', name: 'Jaune' },
  { bg: '#CCFFF0', border: '#3AE8B0', name: 'Menthe' },
  { bg: '#FBCCFF', border: '#C13AE8', name: 'Magenta' },
  { bg: '#FFD9CC', border: '#E8603A', name: 'Orange' },
  { bg: '#CCD5FF', border: '#3A50E8', name: 'Indigo' },
  { bg: '#EFE9D0', border: '#8F7C3A', name: 'Sable' },
  { bg: '#CCF5F5', border: '#3AC7C7', name: 'Cyan' },
]

const FALLBACK_COLOR = { bg: '#F0F2F5', border: '#B5C0CC' }

/**
 * Génère et ouvre le planning imprimable dans un nouvel onglet.
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

  const isCorporate = tournament.tournament_type === 'corporate'
  const isKnockout = tournament.tournament_type === 'knockout'
  const typeLabel = isCorporate ? 'Inter-entreprises' : isKnockout ? 'Knockout' : 'Au temps'

  // ================= ATTRIBUTION DES COULEURS =================
  // Corporate : couleur par entreprise · Autres : couleur par équipe
  // On génère une CLASSE CSS par groupe (plus fiable que style inline pour l'impression)

  const colorClasses = [] // liste des règles CSS à générer
  const groupKeyToClass = {} // "company:0" → "grp-0", "team:abc123" → "grp-3"

  const getColorForTeam = (team) => {
    if (!team) return null
    const key = isCorporate
      ? `company:${team.company_index}`
      : `team:${team.id}`
    if (groupKeyToClass[key]) return groupKeyToClass[key]

    // Nouvelle couleur pour ce groupe
    const idx = Object.keys(groupKeyToClass).length
    const color = PASTEL_COLORS[idx % PASTEL_COLORS.length]
    const className = `grp-${idx}`
    groupKeyToClass[key] = className
    colorClasses.push({ className, color })
    return className
  }

  // Pré-génère les couleurs pour tous les groupes (ordre stable)
  if (isCorporate) {
    // Trier par company_index pour un mapping cohérent
    const companyIndexes = [...new Set(teams.map((t) => t.company_index).filter((i) => i !== null && i !== undefined))].sort((a, b) => a - b)
    companyIndexes.forEach((ci) => {
      const teamOfCompany = teams.find((t) => t.company_index === ci)
      if (teamOfCompany) getColorForTeam(teamOfCompany)
    })
  } else {
    // Trier par ID pour un mapping stable
    const sortedTeams = [...teams].sort((a, b) => (a.id || '').localeCompare(b.id || ''))
    sortedTeams.forEach((t) => getColorForTeam(t))
  }

  // Construit les lignes du planning : une par round
  const rows = []
  for (let r = 1; r <= totalRounds; r++) {
    const t = roundStartTimes[r - 1]
    const roundMatches = matches.filter((m) => m.round_number === r)
    const byCourt = {}
    for (let c = 1; c <= numCourts; c++) byCourt[c] = null
    roundMatches.forEach((m) => { byCourt[m.court_number] = m })
    rows.push({
      round: r,
      warmupLabel: t?.warmup || '--:--',
      startLabel: t?.match || '--:--',
      endLabel: t?.end || '--:--',
      courts: byCourt,
    })
  }

  // Description d'un match : équipe A vs équipe B, avec fond coloré selon la classe
  const describeMatch = (m) => {
    if (!m) return { html: '<span class="empty">—</span>', level: '' }
    const a = teamById(m.team_a_id)
    const b = teamById(m.team_b_id)
    const compA = a && companyNames[a.company_index]
    const compB = b && companyNames[b.company_index]
    const nameA = a ? `${a.player1_name} / ${a.player2_name}` : (m.team_a_placeholder || '?')
    const nameB = b ? `${b.player1_name} / ${b.player2_name}` : (m.team_b_placeholder || '?')
    const classA = getColorForTeam(a) || 'grp-empty'
    const classB = getColorForTeam(b) || 'grp-empty'
    const compHtml = (c) => c ? `<span class="comp">${escapeHtml(c)}</span>` : ''
    const level = m.level
      ? `Niv. ${m.level}`
      : (m.pool_index !== null && m.pool_index !== undefined
          ? `Poule ${String.fromCharCode(65 + m.pool_index)}`
          : (m.bracket_label || ''))
    return {
      html: `
        <div class="teamline ${classA}"><span class="tname">${escapeHtml(nameA)}</span> ${compHtml(compA)}</div>
        <div class="vs">vs</div>
        <div class="teamline ${classB}"><span class="tname">${escapeHtml(nameB)}</span> ${compHtml(compB)}</div>
      `,
      level,
    }
  }

  // ================= LÉGENDE =================
  let legendHtml = ''
  if (isCorporate && companyNames.length > 0) {
    legendHtml = `
      <h2>Légende des couleurs</h2>
      <div class="legend">
        ${companyNames.map((name, idx) => {
          const teamOfCompany = teams.find((t) => t.company_index === idx)
          const className = teamOfCompany ? getColorForTeam(teamOfCompany) : null
          if (!className) return ''
          return `<div class="legend-item ${className}"><strong>${escapeHtml(name)}</strong></div>`
        }).join('')}
      </div>
    `
  } else if (!isCorporate && teams.length > 0) {
    const sortedTeams = [...teams].sort((a, b) => (a.id || '').localeCompare(b.id || ''))
    legendHtml = `
      <h2>Légende des couleurs</h2>
      <div class="legend">
        ${sortedTeams.map((t) => {
          const className = getColorForTeam(t)
          const label = t.team_name || `${t.player1_name} / ${t.player2_name}`
          return `<div class="legend-item ${className}">${escapeHtml(label)}</div>`
        }).join('')}
      </div>
    `
  }

  // ================= CSS DES COULEURS =================
  // On génère les règles CSS pour chaque classe (bg + bordure gauche)
  // avec `-webkit-print-color-adjust: exact` pour forcer l'impression des couleurs
  const colorCss = colorClasses.map(({ className, color }) => `
    .teamline.${className}, .legend-item.${className} {
      background-color: ${color.bg} !important;
      border-left: 4px solid ${color.border} !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
  `).join('\n')

  // ================= HTML COMPLET =================
  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<title>Planning · ${escapeHtml(tournament.name || 'Tournoi')}</title>
<style>
  @page { size: A4 portrait; margin: 14mm; }

  /* Force TOUS les éléments à imprimer leurs couleurs de fond */
  * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    color-adjust: exact !important;
    box-sizing: border-box;
  }

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

  /* LÉGENDE */
  .legend { display: flex; flex-wrap: wrap; gap: 8px; margin: 12px 0 24px; }
  .legend-item {
    padding: 8px 14px;
    border-radius: 6px;
    font-size: 12px;
    background-color: #f0f2f5;
    border-left: 4px solid #b5c0cc;
  }

  /* TABLEAU */
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  th, td { border: 1px solid #d5dde5; padding: 8px 6px; text-align: left; vertical-align: top; font-size: 12px; }
  th { background-color: #1a2634 !important; color: #fff !important; font-size: 12px; letter-spacing: 0.05em; text-transform: uppercase; }
  .time-col { width: 90px; }
  .round-col { width: 60px; }
  td.round-cell { text-align: center; font-weight: 700; font-size: 15px; background-color: #f6f8fa !important; }
  td.time-cell { text-align: center; font-family: 'Menlo', monospace; background-color: #f6f8fa !important; }
  td.time-cell .warmup { color: #a67c3d; font-size: 10px; font-weight: 600; }
  td.time-cell .start { font-weight: 700; font-size: 14px; }
  td.time-cell .end { color: #6b7c8f; font-size: 11px; }

  /* LIGNES ÉQUIPES (avec fond de couleur) */
  .teamline {
    font-size: 11px;
    line-height: 1.3;
    padding: 6px 8px;
    border-radius: 4px;
    margin: 3px 0;
    background-color: #f0f2f5;
    border-left: 4px solid #b5c0cc;
  }
  .tname { font-weight: 600; color: #1a2634; }
  .comp {
    display: inline-block;
    margin-left: 4px;
    padding: 1px 6px;
    background-color: rgba(0,0,0,0.08);
    border-radius: 3px;
    font-size: 10px;
    color: #333;
  }
  .vs { text-align: center; color: #a0aabb; font-size: 10px; font-weight: 700; padding: 3px 0; }
  .level { font-size: 10px; color: #6b7c8f; text-align: center; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.05em; }
  .empty { color: #c5cfd9; font-style: italic; }

  /* RÈGLES DE COULEUR PAR GROUPE (générées dynamiquement) */
  ${colorCss}

  .footer { margin-top: 30px; padding-top: 10px; border-top: 1px solid #d5dde5; font-size: 11px; color: #6b7c8f; text-align: center; }

  /* BOUTON PRINT */
  .print-btn {
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 20px;
    background-color: #d4ff3a;
    color: #0a1929;
    border: none;
    border-radius: 8px;
    font-size: 15px;
    font-weight: 700;
    cursor: pointer;
    box-shadow: 0 4px 14px rgba(0,0,0,0.2);
    z-index: 1000;
  }
  @media print {
    .print-btn { display: none !important; }
    body { padding: 0; }
  }
</style>
</head>
<body>
  <button class="print-btn" onclick="window.print()">Imprimer / PDF</button>

  <div class="header">
    <h1>${escapeHtml(tournament.name || 'Tournoi de Pádel')}</h1>
    <div class="subtitle">Organisé par ${escapeHtml(orgName)} · Planning des matchs</div>
    <div class="badges">
      <span class="badge">${escapeHtml(typeLabel)}</span>
      <span class="badge">${escapeHtml(tournament.tournament_date || '')}</span>
    </div>
  </div>

  <div class="meta">
    <div class="meta-item"><div class="label">Début</div><div class="value">${escapeHtml(startTime)}</div></div>
    <div class="meta-item"><div class="label">Fin prévue</div><div class="value">${escapeHtml((tournament.end_time || '').slice(0, 5))}</div></div>
    <div class="meta-item"><div class="label">Durée match</div><div class="value">${matchDuration} min</div></div>
    <div class="meta-item"><div class="label">Warm-up</div><div class="value">${breakDuration} min</div></div>
    <div class="meta-item"><div class="label">Terrains</div><div class="value">${numCourts}</div></div>
    <div class="meta-item"><div class="label">Équipes</div><div class="value">${teams.length}</div></div>
  </div>

  ${legendHtml}

  <h2>Planning des matchs</h2>
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
            <div class="warmup">☕ ${row.warmupLabel}</div>
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
