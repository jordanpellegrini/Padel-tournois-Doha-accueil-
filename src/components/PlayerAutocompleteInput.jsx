import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Input avec autocomplétion sur la table `players`.
 * - L'utilisateur tape librement (texte normal)
 * - Si ça correspond à un joueur de la base, suggestions affichées en dessous
 * - Clic sur une suggestion → remplit le champ + appelle onPlayerSelected(player)
 *
 * Props :
 *  - value : valeur actuelle du champ (string)
 *  - onChange(newValue) : appelé à chaque frappe libre
 *  - onPlayerSelected(player) : appelé quand on clique sur une suggestion
 *      (player a tous les champs : first_name, last_name, level, company, etc.)
 *  - placeholder, autoFocus, className, style : passés à l'input
 *  - id : id HTML optionnel
 */
export default function PlayerAutocompleteInput({
  value,
  onChange,
  onPlayerSelected,
  placeholder,
  autoFocus,
  className = 'input',
  style,
  id,
}) {
  const [suggestions, setSuggestions] = useState([])
  const [show, setShow] = useState(false)
  const [highlighted, setHighlighted] = useState(-1)
  const wrapperRef = useRef(null)
  const timeoutRef = useRef(null)

  // Ferme la liste au clic à l'extérieur
  useEffect(() => {
    const handleClick = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShow(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Recherche dans Supabase quand value change (avec debounce 200ms)
  useEffect(() => {
    clearTimeout(timeoutRef.current)
    const q = (value || '').trim()
    if (q.length < 2) {
      setSuggestions([])
      setShow(false)
      return
    }
    timeoutRef.current = setTimeout(async () => {
      // Cherche par prénom OU nom (cas insensible)
      const { data } = await supabase
        .from('players')
        .select('*')
        .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%`)
        .limit(8)
      const results = data || []
      setSuggestions(results)
      setShow(results.length > 0)
      setHighlighted(-1)
    }, 200)
    return () => clearTimeout(timeoutRef.current)
  }, [value])

  const handleSelect = (player) => {
    const display = `${player.first_name} ${player.last_name}`
    onChange(display)
    setShow(false)
    setSuggestions([])
    if (onPlayerSelected) onPlayerSelected(player)
  }

  const handleKeyDown = (e) => {
    if (!show || suggestions.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlighted((h) => Math.min(h + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlighted((h) => Math.max(h - 1, 0))
    } else if (e.key === 'Enter' && highlighted >= 0) {
      e.preventDefault()
      handleSelect(suggestions[highlighted])
    } else if (e.key === 'Escape') {
      setShow(false)
    }
  }

  return (
    <div ref={wrapperRef} style={{ position: 'relative', ...(style || {}) }}>
      <input
        id={id}
        className={className}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => { if (suggestions.length > 0) setShow(true) }}
        placeholder={placeholder}
        autoFocus={autoFocus}
        autoComplete="off"
      />
      {show && suggestions.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: 4,
            background: 'var(--bg-mid)',
            border: '1px solid var(--neon)',
            borderRadius: 8,
            boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
            zIndex: 100,
            maxHeight: 280,
            overflowY: 'auto',
          }}
        >
          {suggestions.map((p, i) => (
            <div
              key={p.id}
              onMouseDown={(e) => { e.preventDefault(); handleSelect(p) }}
              onMouseEnter={() => setHighlighted(i)}
              style={{
                padding: '8px 12px',
                cursor: 'pointer',
                background: highlighted === i ? 'rgba(212, 255, 58, 0.15)' : 'transparent',
                borderBottom: i < suggestions.length - 1 ? '1px solid var(--line)' : 'none',
              }}
            >
              <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--white)' }}>
                {p.first_name} {p.last_name}
              </div>
              <div style={{ fontSize: 11, color: 'var(--gray)', marginTop: 1, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {p.level !== null && p.level !== undefined && (
                  <span style={{ color: 'var(--neon)' }}>🎾 N{p.level}</span>
                )}
                {p.company && <span>🏢 {p.company}</span>}
              </div>
            </div>
          ))}
          <div style={{ padding: '6px 12px', fontSize: 10, color: 'var(--gray)', borderTop: '1px solid var(--line)', fontStyle: 'italic' }}>
            ↑↓ pour naviguer · Entrée pour sélectionner
          </div>
        </div>
      )}
    </div>
  )
}
