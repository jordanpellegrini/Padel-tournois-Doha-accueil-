/**
 * Podium final affiché en GRAND quand un tournoi est terminé.
 * Réutilisable pour les 3 types de tournoi.
 *
 * Props :
 *  - title : titre (ex: "CLASSEMENT FINAL")
 *  - entries : [{ rank, name, sub, value, valueLabel }]
 *      rank      : 1, 2, 3...
 *      name      : nom principal (équipe ou entreprise)
 *      sub       : sous-texte optionnel (joueurs, stats...)
 *      value     : valeur à afficher à droite (points, victoires...) optionnel
 *      valueLabel: label sous la valeur optionnel
 */
export default function FinalPodium({ title = 'CLASSEMENT FINAL', entries = [] }) {
  if (entries.length === 0) return null

  const top3 = entries.slice(0, 3)
  const rest = entries.slice(3)

  // Ordre d'affichage du podium : 2e - 1er - 3e (le 1er au milieu, plus haut)
  const podiumOrder = []
  if (top3[1]) podiumOrder.push({ ...top3[1], podiumRank: 2 })
  if (top3[0]) podiumOrder.push({ ...top3[0], podiumRank: 1 })
  if (top3[2]) podiumOrder.push({ ...top3[2], podiumRank: 3 })

  const podiumStyle = {
    1: { height: 160, bg: 'linear-gradient(180deg, var(--neon) 0%, var(--neon-soft, #b8e62e) 100%)', medal: '🥇', color: 'var(--bg-deep)' },
    2: { height: 120, bg: 'linear-gradient(180deg, #c0c8d0 0%, #8da5b8 100%)', medal: '🥈', color: 'var(--bg-deep)' },
    3: { height: 95, bg: 'linear-gradient(180deg, #cd9b62 0%, #a87844 100%)', medal: '🥉', color: 'var(--bg-deep)' },
  }

  return (
    <div
      style={{
        background: 'linear-gradient(180deg, rgba(212,255,58,0.08) 0%, var(--bg-mid) 60%)',
        border: '2px solid var(--neon)',
        borderRadius: 20,
        padding: '32px 20px',
        marginBottom: 24,
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Halo décoratif */}
      <div style={{ position: 'absolute', top: -40, left: '50%', transform: 'translateX(-50%)', width: 200, height: 200, borderRadius: '50%', background: 'var(--neon)', opacity: 0.12, filter: 'blur(50px)', pointerEvents: 'none' }} />

      <div style={{ fontSize: 56, marginBottom: 4, position: 'relative' }}>🏆</div>
      <h2 className="h-display" style={{ fontSize: 'clamp(28px, 6vw, 44px)', color: 'var(--neon)', letterSpacing: '0.08em', marginBottom: 28, position: 'relative' }}>
        {title}
      </h2>

      {/* PODIUM 1-2-3 */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 10, marginBottom: rest.length > 0 ? 28 : 8, position: 'relative', flexWrap: 'nowrap' }}>
        {podiumOrder.map((e) => {
          const st = podiumStyle[e.podiumRank]
          return (
            <div key={e.rank} style={{ flex: '1 1 0', maxWidth: 160, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              {/* Médaille + nom au-dessus de la marche */}
              <div style={{ fontSize: e.podiumRank === 1 ? 40 : 32, marginBottom: 4 }}>{st.medal}</div>
              <div style={{ fontWeight: 700, fontSize: e.podiumRank === 1 ? 15 : 13, color: 'var(--white)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%', padding: '0 4px' }}>
                {e.name}
              </div>
              {e.sub && (
                <div style={{ fontSize: 10, color: 'var(--gray)', marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%', padding: '0 4px' }}>
                  {e.sub}
                </div>
              )}
              {e.value !== undefined && e.value !== null && (
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--neon)', marginBottom: 6 }}>
                  {e.value}
                  {e.valueLabel && <span style={{ fontSize: 9, color: 'var(--gray)', marginLeft: 3 }}>{e.valueLabel}</span>}
                </div>
              )}
              {/* Marche du podium */}
              <div
                style={{
                  width: '100%',
                  height: st.height,
                  background: st.bg,
                  borderRadius: '8px 8px 0 0',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'center',
                  paddingTop: 10,
                  boxShadow: '0 -4px 20px rgba(0,0,0,0.2)',
                }}
              >
                <span style={{ fontFamily: 'var(--font-display)', fontSize: e.podiumRank === 1 ? 48 : 38, color: st.color, lineHeight: 1 }}>
                  {e.rank}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* RESTE DU CLASSEMENT (4e et +) */}
      {rest.length > 0 && (
        <div style={{ display: 'grid', gap: 8, maxWidth: 480, margin: '0 auto', position: 'relative' }}>
          {rest.map((e) => (
            <div
              key={e.rank}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '12px 16px',
                background: 'var(--bg-deep)',
                border: '1px solid var(--line)',
                borderRadius: 10,
                textAlign: 'left',
              }}
            >
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--gray)', minWidth: 30 }}>{e.rank}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.name}</div>
                {e.sub && <div style={{ fontSize: 11, color: 'var(--gray)' }}>{e.sub}</div>}
              </div>
              {e.value !== undefined && e.value !== null && (
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--neon)' }}>{e.value}</span>
                  {e.valueLabel && <span style={{ fontSize: 9, color: 'var(--gray)', marginLeft: 3 }}>{e.valueLabel}</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
