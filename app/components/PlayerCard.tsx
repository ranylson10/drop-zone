'use client'

type PlayerCardTier = 'SS' | 'S' | 'A' | 'B' | 'C' | 'D' | 'E'
type PlayerCardVariant = 'slot' | 'oficial' | 'avulso'

type PlayerCardProps = {
  name?: string
  tier?: PlayerCardTier
  number?: number | string
  variant?: PlayerCardVariant
  onClick?: () => void
  className?: string
}

const tierColors: Record<PlayerCardTier, string[]> = {
  SS: ['#fde68a', '#facc15', '#ca8a04'],
  S: ['#fde68a', '#eab308', '#a16207'],
  A: ['#d8b4fe', '#9333ea', '#6b21a8'],
  B: ['#93c5fd', '#2563eb', '#1d4ed8'],
  C: ['#86efac', '#22c55e', '#15803d'],
  D: ['#e5e7eb', '#9ca3af', '#52525b'],
  E: ['#e4e4e7', '#a1a1aa', '#3f3f46'],
}

function getTierColor(tier: PlayerCardTier, variant: PlayerCardVariant) {
  if (variant === 'avulso') return ['#ffffff', '#d4d4d8', '#52525b']
  if (variant === 'slot') return ['#111827', '#1f2937', '#020617']
  return tierColors[tier] || tierColors.C
}

export default function PlayerCard({
  name = '',
  tier = 'C',
  number = 1,
  variant = 'slot',
  onClick,
  className = ''
}: PlayerCardProps) {
  const c = getTierColor(tier, variant)
  const isSlot = variant === 'slot'
  const isAvulso = variant === 'avulso'
  const label = isSlot ? '+' : (name || 'JOGADOR')

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full max-w-[180px] bg-transparent border-0 p-0 ${className}`}
    >
      <svg viewBox="0 0 160 222" className="w-full h-full">
        <defs>
          <linearGradient id={`bg-${variant}-${tier}-${number}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={c[0]} />
            <stop offset="50%" stopColor={c[1]} />
            <stop offset="100%" stopColor={c[2]} />
          </linearGradient>

          <pattern id={`noise-${variant}-${tier}-${number}`} width="12" height="12" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1" fill="rgba(255,255,255,.04)" />
            <circle cx="8" cy="6" r=".8" fill="rgba(255,255,255,.03)" />
            <circle cx="4" cy="10" r=".7" fill="rgba(255,255,255,.03)" />
          </pattern>

          <linearGradient id={`bottomBlack-${variant}-${tier}-${number}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1a1a1a" />
            <stop offset="100%" stopColor="#050505" />
          </linearGradient>

          <linearGradient id={`tierBadge-${variant}-${tier}-${number}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#991b1b" />
            <stop offset="100%" stopColor="#dc2626" />
          </linearGradient>
        </defs>

        {/* FUNDO PRINCIPAL - MODELO APROVADO */}
        <path
          d="
            M80 4
            C88 13 95 17 106 14
            L128 10
            C141 16 148 25 150 38
            L150 126
            C150 153 146 169 134 178
            C116 186 101 190 89 199
            L80 207
            L71 199
            C59 190 44 186 26 178
            C14 169 10 153 10 126
            L10 38
            C12 25 19 16 32 10
            L54 14
            C65 17 72 13 80 4
            Z
          "
          fill={isSlot ? 'transparent' : `url(#bg-${variant}-${tier}-${number})`}
          stroke={isSlot ? '#8b95a7' : '#eab308'}
          strokeWidth="2"
          strokeDasharray={isSlot ? '5 5' : undefined}
        />

        {!isSlot && (
          <>
            <text
              x="128"
              y="40"
              textAnchor="middle"
              fontSize="18"
              fontWeight="900"
              fill={isAvulso ? 'rgba(0,0,0,.72)' : 'rgba(0,0,0,.72)'}
            >
              {String(number).padStart(2, '0')}
            </text>

            {/* SILHUETA MAIOR E MAIS ALTA */}
            <circle cx="80" cy="62" r="28" fill="#020617" />
            <path
              d="
                M22 141
                C26 92 48 74 80 74
                C112 74 134 92 138 141
                Z
              "
              fill="#020617"
            />
          </>
        )}

        {isSlot && (
          <>
            <circle cx="80" cy="68" r="28" fill="#111827" opacity=".9" />
            <path
              d="
                M22 141
                C26 96 48 80 80 80
                C112 80 134 96 138 141
                Z
              "
              fill="#111827"
              opacity=".9"
            />
          </>
        )}

        {/* FUNDO INFERIOR */}
        <path
          d="
            M12 119
            H148
            V146
            C148 161 143 171 132 178
            C114 187 99 191 88 199
            L80 205
            L72 199
            C61 191 46 187 28 178
            C17 171 12 161 12 146
            Z
          "
          fill={isSlot ? '#050505' : `url(#bottomBlack-${variant}-${tier}-${number})`}
          opacity={isSlot ? '.92' : '1'}
        />

        {/* TEXTURA */}
        <path
          d="
            M12 119
            H148
            V146
            C148 161 143 171 132 178
            C114 187 99 191 88 199
            L80 205
            L72 199
            C61 191 46 187 28 178
            C17 171 12 161 12 146
            Z
          "
          fill={`url(#noise-${variant}-${tier}-${number})`}
          opacity=".5"
        />

        <path
          d="M14 120 H146"
          stroke="rgba(173, 151, 21, 0.8)"
          strokeWidth="1"
        />

        <path
          d="M14 155 H146"
          stroke="rgba(173, 151, 21, 0.2)"
          strokeWidth="1"
        />

        {/* NOME OU + */}
        <text
          x="80"
          y={isSlot ? '150' : '145'}
          textAnchor="middle"
          fontSize={isSlot ? '34' : '19'}
          fontWeight="900"
          fill="white"
        >
          {label.slice(0, 12).toUpperCase()}
        </text>

        {!isSlot && (
          <>
            {/* BADGE DO TIER ABAIXO DO NOME */}
            <path
              d="
                M67 156
                C74 151 86 151 93 156
                L93 174
                C90 182 86 186 80 190
                C74 186 70 182 67 174
                Z
              "
              fill={`url(#tierBadge-${variant}-${tier}-${number})`}
              stroke="#eab308"
              strokeWidth="1.2"
            />

            <text
              x="80"
              y="176"
              textAnchor="middle"
              fontSize="18"
              fontWeight="900"
              fill="white"
            >
              {tier}
            </text>
          </>
        )}
      </svg>
    </button>
  )
}
