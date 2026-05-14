'use client'

type PlayerCardTier = 'SS' | 'S' | 'A' | 'B' | 'C' | 'D' | 'E'
type PlayerCardVariant = 'oficial' | 'avulso' | 'slot'

type PlayerCardProps = {
  name?: string
  tier?: PlayerCardTier
  number?: number | string
  photoUrl?: string | null
  variant?: PlayerCardVariant
  onClick?: () => void
  className?: string
}

type Palette = {
  start: string
  mid: string
  end: string
  deep: string
  stroke: string
  glow: string
  badge: string
  text: string
}

const tierPalette: Record<PlayerCardTier, Palette> = {
  SS: { start: '#fff7bf', mid: '#facc15', end: '#b7791f', deep: '#4a2604', stroke: '#fde047', glow: '#facc15', badge: '#b91c1c', text: '#111827' },
  S: { start: '#fde68a', mid: '#eab308', end: '#a16207', deep: '#422006', stroke: '#f59e0b', glow: '#fbbf24', badge: '#b91c1c', text: '#111827' },
  A: { start: '#f5d0fe', mid: '#a855f7', end: '#6d28d9', deep: '#2e1065', stroke: '#c084fc', glow: '#a855f7', badge: '#6d28d9', text: '#ffffff' },
  B: { start: '#bfdbfe', mid: '#2563eb', end: '#1d4ed8', deep: '#0f172a', stroke: '#60a5fa', glow: '#3b82f6', badge: '#1d4ed8', text: '#ffffff' },
  C: { start: '#bbf7d0', mid: '#22c55e', end: '#15803d', deep: '#052e16', stroke: '#22c55e', glow: '#22c55e', badge: '#15803d', text: '#ffffff' },
  D: { start: '#f8fafc', mid: '#cbd5e1', end: '#64748b', deep: '#111827', stroke: '#cbd5e1', glow: '#94a3b8', badge: '#334155', text: '#ffffff' },
  E: { start: '#e4e4e7', mid: '#a1a1aa', end: '#52525b', deep: '#18181b', stroke: '#a1a1aa', glow: '#71717a', badge: '#27272a', text: '#ffffff' },
}

function getPalette(tier: PlayerCardTier, variant: PlayerCardVariant): Palette {
  if (variant === 'avulso') {
    return { start: '#ffffff', mid: '#d4d4d8', end: '#71717a', deep: '#18181b', stroke: '#d4d4d8', glow: '#a1a1aa', badge: '#27272a', text: '#ffffff' }
  }

  if (variant === 'slot') {
    return { start: '#1f2937', mid: '#111827', end: '#030712', deep: '#020617', stroke: '#f97316', glow: '#f97316', badge: '#334155', text: '#ffffff' }
  }

  return tierPalette[tier] || tierPalette.C
}

function safeId(value: unknown) {
  return String(value || '').replace(/[^a-zA-Z0-9]/g, '') || 'card'
}

export default function PlayerCard({
  name = 'SIX',
  tier = 'S',
  number = 1,
  photoUrl = null,
  variant = 'oficial',
  onClick,
  className = '',
}: PlayerCardProps) {
  const isSlot = variant === 'slot'
  const isAvulso = variant === 'avulso'
  const p = getPalette(tier, variant)
  const id = `lealt-card-${variant}-${tier}-${safeId(number)}-${safeId(name)}`
  const displayName = (name || 'JOGADOR').slice(0, 12).toUpperCase()

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative block w-full max-w-[190px] border-0 bg-transparent p-0 text-left outline-none transition-transform duration-300 hover:-translate-y-1 active:translate-y-0 ${className}`}
      aria-label={isSlot ? 'Adicionar jogador' : name}
      style={{
        ['--card-glow' as string]: p.glow,
        ['--card-stroke' as string]: p.stroke,
      }}
    >
      <span className="pointer-events-none absolute inset-[7%] rounded-[35%] bg-[var(--card-glow)] opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-30" />

      <svg viewBox="0 0 180 250" className={`relative block h-full w-full drop-shadow-[0_18px_24px_rgba(15,23,42,0.22)] transition duration-300 group-hover:drop-shadow-[0_24px_38px_rgba(15,23,42,0.32)] ${isAvulso ? 'grayscale' : ''}`} role="img">
        <defs>
          <clipPath id={`${id}-clip`}>
            <path d="M90 5 C98 16 106 20 119 17 L143 12 C158 20 166 31 168 45 L168 142 C168 174 162 192 148 202 C127 212 110 216 99 227 L90 237 L81 227 C70 216 53 212 32 202 C18 192 12 174 12 142 L12 45 C14 31 22 20 37 12 L61 17 C74 20 82 16 90 5 Z" />
          </clipPath>

          <clipPath id={`${id}-photo-clip`}>
            <path d="M31 35 H149 V133 H31 Z" />
          </clipPath>

          <linearGradient id={`${id}-bg`} x1="12" y1="0" x2="168" y2="242" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={p.start} />
            <stop offset="35%" stopColor={p.mid} />
            <stop offset="70%" stopColor={p.end} />
            <stop offset="100%" stopColor={p.deep} />
          </linearGradient>

          <radialGradient id={`${id}-light-top`} cx="30%" cy="10%" r="75%">
            <stop offset="0%" stopColor="rgba(255,255,255,.78)" />
            <stop offset="42%" stopColor="rgba(255,255,255,.18)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </radialGradient>

          <radialGradient id={`${id}-light-side`} cx="85%" cy="28%" r="56%">
            <stop offset="0%" stopColor={p.glow} stopOpacity=".58" />
            <stop offset="55%" stopColor={p.glow} stopOpacity=".12" />
            <stop offset="100%" stopColor={p.glow} stopOpacity="0" />
          </radialGradient>

          <linearGradient id={`${id}-shine`} x1="-10" y1="35" x2="190" y2="195" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="rgba(255,255,255,0)" />
            <stop offset="44%" stopColor="rgba(255,255,255,0)" />
            <stop offset="50%" stopColor="rgba(255,255,255,.48)" />
            <stop offset="56%" stopColor="rgba(255,255,255,0)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>

          <linearGradient id={`${id}-black`} x1="0" y1="120" x2="0" y2="235" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#1c1c1c" />
            <stop offset="52%" stopColor="#0b0b0c" />
            <stop offset="100%" stopColor="#030303" />
          </linearGradient>

          <linearGradient id={`${id}-badge`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={p.badge} />
            <stop offset="100%" stopColor={p.glow} />
          </linearGradient>

          <pattern id={`${id}-grid`} width="16" height="16" patternUnits="userSpaceOnUse">
            <path d="M16 0H0V16" fill="none" stroke="rgba(255,255,255,.10)" strokeWidth=".55" />
            <circle cx="3" cy="3" r=".8" fill="rgba(255,255,255,.18)" />
            <path d="M0 16L16 0" stroke="rgba(255,255,255,.045)" strokeWidth=".7" />
          </pattern>

          <pattern id={`${id}-scan`} width="6" height="6" patternUnits="userSpaceOnUse">
            <path d="M0 0H6" stroke="rgba(255,255,255,.08)" strokeWidth="1" />
            <path d="M0 3H6" stroke="rgba(0,0,0,.08)" strokeWidth="1" />
          </pattern>

          <pattern id={`${id}-carbon`} width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M0 0H10V10H0Z" fill="rgba(255,255,255,.025)" />
            <path d="M0 10L10 0" stroke="rgba(255,255,255,.06)" strokeWidth=".7" />
            <path d="M-3 5L5 -3M5 13L13 5" stroke="rgba(0,0,0,.2)" strokeWidth=".8" />
          </pattern>

          <filter id={`${id}-inner-glow`} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="2.2" floodColor={p.glow} floodOpacity=".72" />
          </filter>
        </defs>

        <g clipPath={`url(#${id}-clip)`}>
          <rect x="0" y="0" width="180" height="250" fill={`url(#${id}-bg)`} />
          <rect x="0" y="0" width="180" height="250" fill={`url(#${id}-light-top)`} />
          <rect x="0" y="0" width="180" height="250" fill={`url(#${id}-light-side)`} />
          <rect x="0" y="0" width="180" height="250" fill={`url(#${id}-grid)`} opacity={isSlot ? 0.22 : 0.5} />
          <rect x="0" y="0" width="180" height="250" fill={`url(#${id}-scan)`} opacity=".28" />

          <path d="M20 38 C47 28 76 29 90 16 C104 29 133 28 160 38" fill="none" stroke="rgba(255,255,255,.45)" strokeWidth="1.2" />
          <path d="M22 49 C55 39 125 39 158 49" fill="none" stroke={p.stroke} strokeOpacity=".42" strokeWidth="1" />
          <path d="M20 110 L56 88 H124 L160 110" fill="none" stroke="rgba(255,255,255,.13)" strokeWidth="1" />

          {photoUrl && !isSlot ? (
            <g clipPath={`url(#${id}-photo-clip)`}>
              <image href={photoUrl} x="26" y="26" width="128" height="128" preserveAspectRatio="xMidYMin slice" opacity={isAvulso ? 0.72 : 1} />
              <rect x="24" y="28" width="132" height="125" fill={`url(#${id}-scan)`} opacity=".13" />
            </g>
          ) : (
            <>
              <circle cx="90" cy="68" r="31" fill={isSlot ? '#1f2937' : '#020617'} opacity=".92" />
              <path d="M25 148 C30 94 55 75 90 75 C125 75 150 94 155 148 Z" fill={isSlot ? '#1f2937' : '#020617'} opacity=".92" />
            </>
          )}

          <path d="M12 130 H168 V160 C168 178 162 191 148 202 C127 212 110 216 99 227 L90 237 L81 227 C70 216 53 212 32 202 C18 191 12 178 12 160 Z" fill={`url(#${id}-black)`} />
          <path d="M12 130 H168 V160 C168 178 162 191 148 202 C127 212 110 216 99 227 L90 237 L81 227 C70 216 53 212 32 202 C18 191 12 178 12 160 Z" fill={`url(#${id}-carbon)`} opacity=".78" />
          <path d="M12 130 H168" stroke={p.stroke} strokeWidth="2.2" strokeOpacity=".95" />
          <path d="M28 172 H152" stroke={p.stroke} strokeWidth="1" strokeOpacity=".46" />
          <path d="M38 184 H142" stroke={p.stroke} strokeWidth="1" strokeOpacity=".22" />
          <rect x="0" y="0" width="180" height="250" fill={`url(#${id}-shine)`} opacity=".7" className="origin-center -translate-x-16 transition-transform duration-700 group-hover:translate-x-16" />
        </g>

        <path d="M90 5 C98 16 106 20 119 17 L143 12 C158 20 166 31 168 45 L168 142 C168 174 162 192 148 202 C127 212 110 216 99 227 L90 237 L81 227 C70 216 53 212 32 202 C18 192 12 174 12 142 L12 45 C14 31 22 20 37 12 L61 17 C74 20 82 16 90 5 Z" fill="none" stroke="rgba(255,255,255,.72)" strokeWidth="5" strokeLinejoin="round" opacity=".28" />
        <path d="M90 5 C98 16 106 20 119 17 L143 12 C158 20 166 31 168 45 L168 142 C168 174 162 192 148 202 C127 212 110 216 99 227 L90 237 L81 227 C70 216 53 212 32 202 C18 192 12 174 12 142 L12 45 C14 31 22 20 37 12 L61 17 C74 20 82 16 90 5 Z" fill="none" stroke={p.stroke} strokeWidth="2.8" strokeLinejoin="round" filter={`url(#${id}-inner-glow)`} />
        <path d="M90 12 C97 21 106 25 119 22 L141 18 C153 24 160 35 162 47" fill="none" stroke="rgba(255,255,255,.7)" strokeWidth="1.2" strokeLinecap="round" />

        {!isSlot && (
          <>
            <text x="146" y="43" textAnchor="middle" fontSize="20" fontWeight="900" fill={p.text} style={{ paintOrder: 'stroke', stroke: 'rgba(0,0,0,.28)', strokeWidth: 2 }}>
              {String(number).padStart(2, '0')}
            </text>
            <text x="146" y="55" textAnchor="middle" fontSize="5.5" fontWeight="900" fill={p.text} opacity=".82" letterSpacing="1.2">
              PLAYER
            </text>
          </>
        )}

        <text x="90" y={isSlot ? 162 : 158} textAnchor="middle" fontSize={isSlot ? 38 : 19} fontWeight="900" fill="#ffffff" letterSpacing={isSlot ? 0 : '.4'} style={{ paintOrder: 'stroke', stroke: 'rgba(0,0,0,.58)', strokeWidth: 2.2 }}>
          {isSlot ? '+' : displayName}
        </text>

        {!isSlot && (
          <>
            <path d="M75 170 C82 165 98 165 105 170 L105 190 C102 198 96 203 90 207 C84 203 78 198 75 190 Z" fill={isAvulso ? '#3f3f46' : `url(#${id}-badge)`} stroke={isAvulso ? '#d4d4d8' : p.stroke} strokeWidth="1.8" />
            <path d="M79 173 C84 170 96 170 101 173" fill="none" stroke="rgba(255,255,255,.45)" strokeWidth="1" />
            <text x="90" y="192" textAnchor="middle" fontSize="17" fontWeight="900" fill="#fff" style={{ paintOrder: 'stroke', stroke: 'rgba(0,0,0,.32)', strokeWidth: 1 }}>
              {tier}
            </text>
          </>
        )}

        {isSlot && (
          <text x="90" y="184" textAnchor="middle" fontSize="10" fontWeight="900" fill="#cbd5e1" letterSpacing="1.2">
            ADICIONAR
          </text>
        )}
      </svg>
    </button>
  )
}
