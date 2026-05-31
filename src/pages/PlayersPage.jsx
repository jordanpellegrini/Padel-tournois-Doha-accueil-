import { useState, useEffect, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'

/**
 * Page ANNUAIRE DES JOUEURS Doha Accueil.
 * - Accessible aux organisateurs connectés
 * - Liste recherchable + ajout/édition/suppression
 * - Import en masse via copier-coller Excel/TSV
 */
export default function PlayersPage() {
  const { isAdmin } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  // Filtre entreprise initialisé depuis l'URL (?company=...)
  const [companyFilter, setCompanyFilter] = useState(searchParams.get('company') || '')
  const [editing, setEditing] = useState(null) // null | player | 'new'
  const [showImport, setShowImport] = useState(false)
  const [stats, setStats] = useState({}) // {playerId: {tournaments, wins}}

  useEffect(() => { load() }, [])

  // Synchronise le filtre avec l'URL (au cas où on clique sur un autre logo)
  useEffect(() => {
    const c = searchParams.get('company') || ''
    if (c !== companyFilter) setCompanyFilter(c)
  }, [searchParams])

  // Quand l'utilisateur change le filtre, on met à jour l'URL
  const updateCompanyFilter = (v) => {
    setCompanyFilter(v)
    if (v) setSearchParams({ company: v })
    else setSearchParams({})
  }

  const load = async () => {
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .order('last_name')
      .order('first_name')
    if (!error && data) setPlayers(data)
    setLoading(false)
    loadStats()
  }

  // Statistiques : on cherche dans les tables teams + matches combien de tournois
  // chaque joueur a fait et combien de victoires
  const loadStats = async () => {
    const { data: teamsData } = await supabase
      .from('teams')
      .select('id, tournament_id, player1_name, player2_name')
    if (!teamsData) return

    const { data: matchesData } = await supabase
      .from('matches')
      .select('team_a_id, team_b_id, score_a, score_b, is_finished')
    const matches = matchesData || []

    // Compte par nom complet "Prénom Nom" (case-insensitive)
    const newStats = {}
    teamsData.forEach((t) => {
      const names = [t.player1_name, t.player2_name].filter(Boolean)
      names.forEach((name) => {
        const k = name.toLowerCase().trim()
        if (!newStats[k]) newStats[k] = { tournaments: new Set(), wins: 0 }
        newStats[k].tournaments.add(t.tournament_id)
        const teamMatches = matches.filter((m) => m.is_finished && (m.team_a_id === t.id || m.team_b_id === t.id))
        teamMatches.forEach((m) => {
          if (m.team_a_id === t.id && m.score_a > m.score_b) newStats[k].wins++
          if (m.team_b_id === t.id && m.score_b > m.score_a) newStats[k].wins++
        })
      })
    })
    // Convertit les Set en nombre
    Object.keys(newStats).forEach((k) => { newStats[k].tournaments = newStats[k].tournaments.size })
    setStats(newStats)
  }

  const getPlayerStats = (p) => {
    const k = `${p.first_name} ${p.last_name}`.toLowerCase().trim()
    return stats[k] || { tournaments: 0, wins: 0 }
  }

  // Liste des entreprises distinctes
  const companies = useMemo(() => {
    const s = new Set(players.map((p) => p.company).filter(Boolean))
    return [...s].sort()
  }, [players])

  // Liste filtrée par recherche + entreprise (matching tolérant)
  const filteredPlayers = useMemo(() => {
    let list = players
    if (companyFilter) {
      // Matching insensible à la casse et aux espaces multiples
      const norm = (s) => (s || '').toLowerCase().replace(/\s+/g, ' ').trim()
      const target = norm(companyFilter)
      list = list.filter((p) => norm(p.company) === target)
    }
    if (search.trim()) {
      const q = search.toLowerCase().trim()
      list = list.filter((p) =>
        `${p.first_name} ${p.last_name}`.toLowerCase().includes(q) ||
        (p.company || '').toLowerCase().includes(q) ||
        (p.email || '').toLowerCase().includes(q)
      )
    }
    return list
  }, [players, search, companyFilter])

  const deletePlayer = async (id, name) => {
    if (!confirm(`Supprimer "${name}" de l'annuaire ?`)) return
    await supabase.from('players').delete().eq('id', id)
    load()
  }

  // Si pas connecté : redirection avec message
  if (!isAdmin) {
    return (
      <main className="container">
        <div className="card" style={{ textAlign: 'center', marginTop: 40 }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🔒</div>
          <h2 className="h-display" style={{ fontSize: 28, marginBottom: 12 }}>ACCÈS RÉSERVÉ</h2>
          <p style={{ color: 'var(--gray)', marginBottom: 24 }}>
            Connecte-toi en tant qu'organisateur pour accéder à l'annuaire des joueurs.
          </p>
          <Link to="/" className="btn btn-primary">← Retour à l'accueil</Link>
        </div>
      </main>
    )
  }

  return (
    <main className="container">
      {/* En-tête */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <Link to="/" style={{ color: 'var(--gray)', textDecoration: 'none', fontSize: 14 }}>← Retour</Link>
          <h1 className="h-display" style={{ fontSize: 'clamp(28px, 5vw, 40px)', marginTop: 8 }}>
            👥 ANNUAIRE <span style={{ color: 'var(--neon)' }}>JOUEURS</span>
          </h1>
          {companyFilter ? (
            <p style={{ color: 'var(--sand-warm)', fontSize: 14, marginTop: 4 }}>
              🏢 Filtré sur <strong style={{ color: 'var(--neon)' }}>{companyFilter}</strong> · {filteredPlayers.length} joueur{filteredPlayers.length > 1 ? 's' : ''}
              <button onClick={() => updateCompanyFilter('')} style={{ background: 'transparent', border: 'none', color: 'var(--gray)', cursor: 'pointer', marginLeft: 8, textDecoration: 'underline', fontSize: 12 }}>✕ tout afficher</button>
            </p>
          ) : (
            <p style={{ color: 'var(--gray)', fontSize: 14, marginTop: 4 }}>
              {players.length} joueur{players.length > 1 ? 's' : ''} enregistré{players.length > 1 ? 's' : ''}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={() => setShowImport(true)}>📋 Import</button>
          <button className="btn btn-primary" onClick={() => setEditing('new')}>➕ Nouveau joueur</button>
        </div>
      </div>

      {/* Filtres */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          <div>
            <label className="label">🔍 Rechercher</label>
            <input className="input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nom, prénom, email..." />
          </div>
          <div>
            <label className="label">Entreprise</label>
            <select className="input" value={companyFilter} onChange={(e) => updateCompanyFilter(e.target.value)}>
              <option value="">Toutes</option>
              {companies.map((c) => <option key={c} value={c}>{c}</option>)}
              {/* Affiche le filtre venu de l'URL s'il n'est pas dans la liste actuelle */}
              {companyFilter && !companies.includes(companyFilter) && (
                <option value={companyFilter}>{companyFilter}</option>
              )}
            </select>
          </div>
        </div>
      </div>

      {/* Liste */}
      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--gray)' }}>Chargement...</div>
      ) : filteredPlayers.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--gray)' }}>
          {players.length === 0 ? (
            <>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
              <p>Aucun joueur dans l'annuaire pour le moment.</p>
              <p style={{ marginTop: 8, fontSize: 13 }}>Ajoute un joueur ou importe une liste pour commencer.</p>
            </>
          ) : (
            <p>Aucun joueur ne correspond à ta recherche.</p>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {filteredPlayers.map((p) => {
            const st = getPlayerStats(p)
            return (
              <div key={p.id} className="card" style={{ padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                  <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>
                      {p.first_name} {p.last_name}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--gray)', marginTop: 2, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      {p.company && <span>🏢 {p.company}</span>}
                      {p.phone && <span>📞 {p.phone}</span>}
                      {p.email && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 200 }}>✉️ {p.email}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                    {p.level !== null && p.level !== undefined && (
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--neon)', lineHeight: 1 }}>{p.level}</div>
                        <div style={{ fontSize: 9, color: 'var(--gray)', letterSpacing: '0.1em' }}>NIVEAU</div>
                      </div>
                    )}
                    <div style={{ textAlign: 'center', minWidth: 60 }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--sand-warm)', lineHeight: 1 }}>
                        {st.tournaments}
                      </div>
                      <div style={{ fontSize: 9, color: 'var(--gray)', letterSpacing: '0.1em' }}>TOURNOIS</div>
                    </div>
                    <div style={{ textAlign: 'center', minWidth: 50 }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--success)', lineHeight: 1 }}>
                        {st.wins}
                      </div>
                      <div style={{ fontSize: 9, color: 'var(--gray)', letterSpacing: '0.1em' }}>VICT.</div>
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button onClick={() => setEditing(p)} style={{ background: 'transparent', border: '1px solid var(--line)', color: 'var(--sand-warm)', cursor: 'pointer', fontSize: 14, padding: '6px 10px', borderRadius: 6 }} title="Modifier">✏️</button>
                      <button onClick={() => deletePlayer(p.id, `${p.first_name} ${p.last_name}`)} style={{ background: 'transparent', border: '1px solid var(--line)', color: 'var(--danger)', cursor: 'pointer', fontSize: 16, padding: '6px 10px', borderRadius: 6 }} title="Supprimer">🗑</button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* MODALES */}
      {editing && (
        <PlayerEditModal
          player={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load() }}
        />
      )}
      {showImport && (
        <ImportModal onClose={() => setShowImport(false)} onImported={() => { setShowImport(false); load() }} />
      )}
    </main>
  )
}

// ============================================
// MODALE EDITION / CREATION D'UN JOUEUR
// ============================================
function PlayerEditModal({ player, onClose, onSaved }) {
  const [firstName, setFirstName] = useState(player?.first_name || '')
  const [lastName, setLastName] = useState(player?.last_name || '')
  const [level, setLevel] = useState(player?.level ?? '')
  const [company, setCompany] = useState(player?.company || '')
  const [phone, setPhone] = useState(player?.phone || '')
  const [email, setEmail] = useState(player?.email || '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setError('')
    if (!firstName.trim() || !lastName.trim()) {
      setError('Prénom et nom obligatoires')
      return
    }
    const lvlNum = level === '' ? null : parseFloat(level)
    if (lvlNum !== null && (isNaN(lvlNum) || lvlNum < 0 || lvlNum > 7)) {
      setError('Le niveau doit être entre 0 et 7 (ex: 3.2)')
      return
    }

    setSaving(true)
    const payload = {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      level: lvlNum,
      company: company.trim() || null,
      phone: phone.trim() || null,
      email: email.trim() || null,
      updated_at: new Date().toISOString(),
    }
    let res
    if (player) {
      res = await supabase.from('players').update(payload).eq('id', player.id)
    } else {
      res = await supabase.from('players').insert(payload)
    }
    setSaving(false)
    if (res.error) {
      setError('Erreur : ' + res.error.message)
      return
    }
    onSaved()
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
        <h2 className="h-display" style={{ fontSize: 26, marginBottom: 20 }}>
          {player ? '✏️ MODIFIER JOUEUR' : '➕ NOUVEAU JOUEUR'}
        </h2>

        <div style={{ display: 'grid', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label className="label">Prénom *</label>
              <input className="input" value={firstName} onChange={(e) => setFirstName(e.target.value)} autoFocus />
            </div>
            <div>
              <label className="label">Nom *</label>
              <input className="input" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label">Niveau Playtomic (0 à 7)</label>
            <input className="input" type="number" step="0.1" min="0" max="7" value={level} onChange={(e) => setLevel(e.target.value)} placeholder="ex: 3.2" />
          </div>
          <div>
            <label className="label">Entreprise</label>
            <input className="input" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="ex: Dassault Aviation" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label className="label">Téléphone</label>
              <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+974 ..." />
            </div>
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>

          {error && <div style={{ color: 'var(--danger)', fontSize: 13, padding: '8px 12px', background: 'rgba(255,71,87,0.1)', borderRadius: 8 }}>⚠️ {error}</div>}

          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button className="btn btn-primary" onClick={save} disabled={saving} style={{ flex: 1 }}>
              {saving ? '⏳...' : (player ? '✓ Enregistrer' : '➕ Ajouter')}
            </button>
            <button className="btn btn-ghost" onClick={onClose}>Annuler</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================
// MODALE IMPORT EN MASSE (copier-coller Excel/TSV)
// ============================================
function ImportModal({ onClose, onImported }) {
  const [text, setText] = useState('')
  const [preview, setPreview] = useState([])
  const [error, setError] = useState('')
  const [importing, setImporting] = useState(false)

  // Parse le texte collé. Détecte automatiquement séparateur (tab ou virgule ou ;)
  const parsePastedData = (raw) => {
    if (!raw || !raw.trim()) return []
    const lines = raw.split(/\r?\n/).filter((l) => l.trim())
    if (lines.length === 0) return []

    // Détecte le séparateur (sur la première ligne)
    const first = lines[0]
    let sep = '\t'
    if (first.includes('\t')) sep = '\t'
    else if (first.includes(';')) sep = ';'
    else if (first.includes(',')) sep = ','

    return lines.map((line) => {
      const cells = line.split(sep).map((c) => c.trim())
      return {
        first_name: cells[0] || '',
        last_name: cells[1] || '',
        level: cells[2] || '',
        company: cells[3] || '',
        phone: cells[4] || '',
        email: cells[5] || '',
      }
    })
  }

  const handleTextChange = (val) => {
    setText(val)
    setError('')
    setPreview(parsePastedData(val))
  }

  const doImport = async () => {
    setError('')
    // Garde seulement les lignes valides (prénom + nom)
    const valid = preview.filter((p) => p.first_name && p.last_name)
    if (valid.length === 0) {
      setError('Aucune ligne valide à importer (prénom et nom requis)')
      return
    }
    setImporting(true)
    const payload = valid.map((p) => ({
      first_name: p.first_name,
      last_name: p.last_name,
      level: p.level ? parseFloat(p.level) || null : null,
      company: p.company || null,
      phone: p.phone || null,
      email: p.email || null,
    }))
    const { error: insErr } = await supabase.from('players').insert(payload)
    setImporting(false)
    if (insErr) {
      setError('Erreur : ' + insErr.message)
      return
    }
    alert(`✓ ${valid.length} joueur${valid.length > 1 ? 's' : ''} importé${valid.length > 1 ? 's' : ''} !`)
    onImported()
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 720 }}>
        <h2 className="h-display" style={{ fontSize: 26, marginBottom: 12 }}>📋 IMPORTER DES JOUEURS</h2>
        <p style={{ color: 'var(--gray)', fontSize: 13, marginBottom: 16 }}>
          Colle ici un tableau (depuis Excel, Google Sheets, etc.). Une ligne par joueur, colonnes dans cet ordre :
        </p>

        <div style={{ background: 'var(--bg-deep)', border: '1px solid var(--line)', borderRadius: 8, padding: 10, marginBottom: 16, fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--sand-warm)' }}>
          Prénom · Nom · Niveau · Entreprise · Téléphone · Email
        </div>

        <textarea
          className="input"
          value={text}
          onChange={(e) => handleTextChange(e.target.value)}
          placeholder={`Marie\tDupont\t3.2\tDassault\t+974...\tmarie@...\nPaul\tMartin\t4.1\tASM\t\t`}
          rows={8}
          style={{ width: '100%', fontFamily: 'var(--font-mono)', fontSize: 13, resize: 'vertical' }}
        />

        {/* Aperçu */}
        {preview.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, color: 'var(--sand)', marginBottom: 8 }}>
              APERÇU ({preview.filter((p) => p.first_name && p.last_name).length} valide{preview.filter((p) => p.first_name && p.last_name).length > 1 ? 's' : ''} / {preview.length} ligne{preview.length > 1 ? 's' : ''})
            </div>
            <div style={{ maxHeight: 200, overflowY: 'auto', background: 'var(--bg-deep)', border: '1px solid var(--line)', borderRadius: 8, padding: 8 }}>
              {preview.map((p, i) => {
                const ok = p.first_name && p.last_name
                return (
                  <div key={i} style={{ padding: '4px 6px', fontSize: 12, fontFamily: 'var(--font-mono)', color: ok ? 'var(--white)' : 'var(--danger)' }}>
                    {ok ? '✓' : '✗'} {p.first_name} {p.last_name} {p.level && `· N${p.level}`} {p.company && `· ${p.company}`}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {error && <div style={{ color: 'var(--danger)', fontSize: 13, padding: '8px 12px', background: 'rgba(255,71,87,0.1)', borderRadius: 8, marginTop: 12 }}>⚠️ {error}</div>}

        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <button className="btn btn-primary" onClick={doImport} disabled={importing || preview.length === 0} style={{ flex: 1 }}>
            {importing ? '⏳ Import...' : `✓ Importer ${preview.filter((p) => p.first_name && p.last_name).length} joueur(s)`}
          </button>
          <button className="btn btn-ghost" onClick={onClose}>Annuler</button>
        </div>
      </div>
    </div>
  )
}
