'use client'

import { useId } from 'react'

type PlayerCardTier = 'SS' | 'S' | 'A' | 'B' | 'C' | 'D' | 'E'
type PlayerCardVariant = 'oficial' | 'avulso' | 'empty'

type PlayerCardProps = {
  name?: string
  tier?: PlayerCardTier
  number?: number | string
  variant?: PlayerCardVariant
  active?: boolean
  onClick?: () => void
  className?: string
}

const tierColors: Record<PlayerCardTier, {
  bg1: string
  bg2: string
  bg3: string
  badge1: string
  badge2: string
  stroke: string
}> = {
  SS: { bg1: '#fff2a8', bg2: '#facc15', bg3: '#b77905', badge1: '#7c2d12', badge2: '#dc2626', stroke: '#eab308' },
  S: { bg1: '#fde68a', bg2: '#facc15', bg3: '#ca8a04', badge1: '#991b1b', badge2: '#dc2626', stroke: '#eab308' },
  A: { bg1: '#d8b4fe', bg2: '#9333ea', bg3: '#581c87', badge1: '#581c87', badge2: '#a855f7', stroke: '#9333ea' },
  B: { bg1: '#93c5fd', bg2: '#2563eb', bg3: '#1e3a8a', badge1: '#1e3a8a', badge2: '#3b82f6', stroke: '#2563eb' },
  C: { bg1: '#86efac', bg2: '#22c55e', bg3: '#166534', badge1: '#14532d', badge2: '#22c55e', stroke: '#16a34a' },
  D: { bg1: '#e5e7eb', bg2: '#9ca3af', bg3: '#52525b', badge1: '#27272a', badge2: '#71717a', stroke: '#a1a1aa' },
  E: { bg1: '#e4e4e7', bg2: '#a1a1aa', bg3: '#3f3f46', badge1: '#18181b', badge2: '#52525b', stroke: '#71717a' },
}

export default function PlayerCard({
  name = 'JOGADOR',
  tier = 'S',
  number = 1,
  variant = 'oficial',
  active = false,
  onClick,
  className = '',
}: PlayerCardProps) {
  const uid = useId().replace(/:/g, '')
  const isEmpty = variant === 'empty'
  const isAvulso = variant === 'avulso'
  const c = isAvulso || isEmpty
    ? { bg1: '#f8fafc', bg2: '#cbd5e1', bg3: '#64748b', badge1: '#111827', badge2: '#374151', stroke: '#94a3b8' }
    : tierColors[tier]

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative w-full max-w-[180px] border-0 bg-transparent p-0 text-left outline-none ${className}`}
    >
      <svg viewBox="0 0 160 222" className="h-full w-full">
        <defs>
          <linearGradient id={`bg-${uid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={c.bg1} />
            <stop offset="50%" stopColor={c.bg2} />
            <stop offset="100%" stopColor={c.bg3} />
          </linearGradient>

          <pattern id={`noise-${uid}`} width="12" height="12" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1" fill="rgba(255,255,255,.04)" />
            <circle cx="8" cy="6" r=".8" fill="rgba(255,255,255,.03)" />
            <circle cx="4" cy="10" r=".7" fill="rgba(255,255,255,.03)" />
          </pattern>

          <linearGradient id={`bottom-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1a1a1a" />
            <stop offset="100%" stopColor="#050505" />
          </linearGradient>

          <linearGradient id={`badge-${uid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={c.badge1} />
            <stop offset="100%" stopColor={c.badge2} />
          </linearGradient>
        </defs>

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
          fill={`url(#bg-${uid})`}
          stroke={active ? '#22c55e' : c.stroke}
          strokeWidth={active ? '3' : '2'}
        />

        <text x="128" y="40" textAnchor="middle" fontSize="18" fontWeight="900" fill="rgba(0,0,0,.72)">
          {String(number).padStart(2, '0')}
        </text>

        <circle cx="80" cy="62" r="28" fill="#020617" opacity={isEmpty ? '.28' : '1'} />
        <path
          d="M22 141 C26 92 48 74 80 74 C112 74 134 92 138 141 Z"
          fill="#020617"
          opacity={isEmpty ? '.28' : '1'}
        />

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
          fill={`url(#bottom-${uid})`}
        />

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
          fill={`url(#noise-${uid})`}
          opacity=".5"
        />

        <path d="M14 120 H146" stroke="rgba(173,151,21,.8)" strokeWidth="1" />
        <path d="M14 155 H146" stroke="rgba(173,151,21,.2)" strokeWidth="1" />

        <text x="80" y="145" textAnchor="middle" fontSize={isEmpty ? '13' : '19'} fontWeight="900" fill="white">
          {isEmpty ? '+' : name.slice(0, 10).toUpperCase()}
        </text>

        {!isEmpty ? (
          <>
            <path
              d="
                M67 156
                C74 151 86 151 93 156
                L93 174
                C90 182 86 186 80 190
                C74 186 70 182 67 174
                Z
              "
              fill={`url(#badge-${uid})`}
              stroke={c.stroke}
              strokeWidth="1.2"
            />
            <text x="80" y="176" textAnchor="middle" fontSize="18" fontWeight="900" fill="white">
              {tier}
            </text>
          </>
        ) : (
          <text x="80" y="165" textAnchor="middle" fontSize="8" fontWeight="900" fill="#facc15">
            ADICIONAR
          </text>
        )}
      </svg>
    </button>
  )
}
