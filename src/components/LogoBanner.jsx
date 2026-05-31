import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'

/**
 * Bandeau de logos : Doha Accueil + entreprises participantes.
 * Logos cliquables : clic → page Joueurs filtrée sur l'entreprise.
 * (Le clic ne fonctionne que pour les organisateurs connectés.)
 */
export default function LogoBanner({ compact = false }) {
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const logoHeight = compact ? 42 : 56
  const cardPadding = compact ? '8px 10px' : '10px 14px'

  // Chaque logo est lié au nom d'entreprise utilisé dans la fiche des joueurs.
  // C'est ce qui permet de filtrer correctement quand on clique.
  const companyLogos = [
    { src: '/logos/dci.png',        alt: 'DCI',                  company: 'DCI' },
    { src: '/logos/leonardo.png',   alt: 'Leonardo Helicopters', company: 'Leonardo Helicopters' },
    { src: '/logos/asm.png',        alt: 'Advanced Services & Maintenance', company: 'ASM' },
    { src: '/logos/barbarians.png', alt: 'Barbarians',           company: 'Barbarians' },
    { src: '/logos/dassault.png',   alt: 'Dassault Aviation',    company: 'Dassault Aviation' },
  ]

  const handleCompanyClick = (company) => {
    if (!isAdmin) return // Non-connectés : pas de redirection
    // Navigue vers /players avec le filtre entreprise pré-rempli
    navigate(`/players?company=${encodeURIComponent(company)}`)
  }

  const handleDohaClick = () => {
    if (!isAdmin) return
    navigate('/players')
  }

  const cardStyleBase = {
    background: 'var(--white)',
    borderRadius: 10,
    padding: cardPadding,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
  }

  const clickableStyle = isAdmin
    ? { cursor: 'pointer', border: 'none' }
    : { cursor: 'default' }

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'center',
        gap: compact ? 8 : 12,
        marginBottom: compact ? 16 : 32,
      }}
    >
      {/* Logo Doha Accueil — cliquable : toute la liste */}
      <button
        onClick={handleDohaClick}
        style={{ ...cardStyleBase, ...clickableStyle }}
        onMouseEnter={(e) => { if (isAdmin) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 18px rgba(212,255,58,0.3)' } }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.15)' }}
        title={isAdmin ? 'Voir tous les joueurs Doha Accueil' : undefined}
      >
        <svg viewBox="0 0 400 140" style={{ height: logoHeight, width: 'auto' }} xmlns="http://www.w3.org/2000/svg">
          <g stroke="#1d6fcb" strokeWidth="1.2" fill="none" strokeLinecap="round">
            <path d="M 30 55 L 30 12 L 105 50 Z" strokeWidth="1.5" />
            <line x1="35" y1="20" x2="80" y2="40" strokeWidth="0.6" opacity="0.6" />
            <line x1="40" y1="28" x2="85" y2="45" strokeWidth="0.6" opacity="0.6" />
            <line x1="45" y1="36" x2="90" y2="48" strokeWidth="0.6" opacity="0.6" />
            <line x1="30" y1="12" x2="30" y2="62" strokeWidth="1.2" />
            <path d="M 5 62 Q 50 78 110 62 L 100 70 Q 50 82 15 70 Z" fill="#1d6fcb" stroke="none" />
            <path d="M 0 62 Q 50 80 115 62" strokeWidth="1.2" />
          </g>
          <g stroke="#1d6fcb" strokeWidth="1.2" fill="none" strokeLinejoin="round">
            <path d="M 155 65 L 152 35 Q 155 28 158 35 L 158 22 Q 161 18 164 22 L 164 35 Q 167 28 170 35 L 167 65 Z" />
            <rect x="178" y="30" width="14" height="35" />
            <path d="M 200 65 L 202 25 L 207 15 L 212 25 L 214 65 Z" />
            <rect x="222" y="20" width="18" height="45" />
            <ellipse cx="255" cy="40" rx="9" ry="22" />
            <path d="M 272 65 L 274 10 L 278 10 L 280 65 Z" />
            <path d="M 290 65 L 290 30 L 300 18 L 310 30 L 310 65 Z" />
            <rect x="320" y="40" width="10" height="25" />
            <rect x="335" y="35" width="12" height="30" />
            <path d="M 355 65 L 357 30 L 363 22 L 369 30 L 371 65 Z" />
            <rect x="378" y="42" width="8" height="23" />
            <line x1="145" y1="65" x2="395" y2="65" strokeWidth="1.5" />
          </g>
          <text x="20" y="115" fontFamily="'Bebas Neue', Impact, sans-serif" fontSize="34" fontWeight="700" fill="#f4b400" letterSpacing="2">DOHA</text>
          <text x="120" y="115" fontFamily="'Bebas Neue', Impact, sans-serif" fontSize="34" fontWeight="400" fill="#1d6fcb" letterSpacing="2">ACCUEIL</text>
        </svg>
      </button>

      {/* Logos des entreprises — cliquables : joueurs de l'entreprise */}
      {companyLogos.map((logo) => (
        <button
          key={logo.src}
          onClick={() => handleCompanyClick(logo.company)}
          style={{ ...cardStyleBase, ...clickableStyle }}
          onMouseEnter={(e) => { if (isAdmin) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 18px rgba(212,255,58,0.3)' } }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.15)' }}
          title={isAdmin ? `Voir les joueurs de ${logo.company}` : undefined}
        >
          <img
            src={logo.src}
            alt={logo.alt}
            style={{ height: logoHeight, width: 'auto', display: 'block', objectFit: 'contain', pointerEvents: 'none' }}
          />
        </button>
      ))}
    </div>
  )
}
