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

const SVG_COREL = String.raw`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
<!-- Creator: CorelDRAW -->
<svg xmlns="http://www.w3.org/2000/svg" xml:space="preserve" width="500.2mm" height="669.541mm" version="1.1" style="shape-rendering:geometricPrecision; text-rendering:geometricPrecision; image-rendering:optimizeQuality; fill-rule:evenodd; clip-rule:evenodd"
viewBox="0 0 393869.11 527212.6"
 xmlns:xlink="http://www.w3.org/1999/xlink"
 xmlns:xodm="http://www.corel.com/coreldraw/odm/2003">
 <defs>
  <style type="text/css">
   <![CDATA[
    .str0 {stroke:#373435;stroke-width:157.48;stroke-miterlimit:22.9256}
    .fil0 {fill:#A8518A}
   ]]>
  </style>
 </defs>
 <g id="Camada_x0020_1">
  <metadata id="CorelCorpID_0Corel-Layer"/>
  <path class="fil0 str0" d="M196897.55 526907.87c0,0 -6777.43,-37542.39 -147909.49,-61820.55 0,0 -49017.2,-3613.25 -48909.32,-48909.32l107.88 -324907.11c0,0 46589.1,-3912.79 45323.94,-55036.97 0,0 49715.64,-24062.64 109692.12,-36144.87 0,0 12477.99,24775.42 41731.87,24888.57 15454.6,107.8 32195.15,-8069.52 41731.87,-24888.57 39071.64,8172.91 74495.94,19917.25 109692.12,36144.87 -786.95,20790.97 7290.44,48765.38 45323.94,55036.97l107.88 324907.11c-107.96,28215.12 -19360.62,45229.45 -48909.32,48909.32 -54361.99,8183.93 -137737.94,33074.86 -147983.5,61820.55z"/>
 </g>
</svg>`

const tierPalette: Record<PlayerCardTier, {
  start: string
  mid: string
  end: string
  stroke: string
  badge: string
}> = {
  SS: { start: '#fff1a8', mid: '#facc15', end: '#b7791f', stroke: '#f6c343', badge: '#b91c1c' },
  S:  { start: '#fde68a', mid: '#eab308', end: '#a16207', stroke: '#eab308', badge: '#b91c1c' },
  A:  { start: '#e9d5ff', mid: '#9333ea', end: '#581c87', stroke: '#a855f7', badge: '#6d28d9' },
  B:  { start: '#bfdbfe', mid: '#2563eb', end: '#1e3a8a', stroke: '#3b82f6', badge: '#1d4ed8' },
  C:  { start: '#bbf7d0', mid: '#22c55e', end: '#166534', stroke: '#22c55e', badge: '#15803d' },
  D:  { start: '#f8fafc', mid: '#cbd5e1', end: '#64748b', stroke: '#cbd5e1', badge: '#334155' },
  E:  { start: '#e4e4e7', mid: '#a1a1aa', end: '#3f3f46', stroke: '#a1a1aa', badge: '#27272a' },
}

function palette(tier: PlayerCardTier, variant: PlayerCardVariant) {
  if (variant === 'avulso') {
    return { start: '#ffffff', mid: '#d4d4d8', end: '#52525b', stroke: '#d4d4d8', badge: '#27272a' }
  }

  if (variant === 'slot') {
    return { start: '#111827', mid: '#172033', end: '#050816', stroke: '#f97316', badge: '#334155' }
  }

  return tierPalette[tier] || tierPalette.C
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
  const p = palette(tier, variant)
  const id = `lealt-card-${variant}-${tier}-${String(number).replace(/[^a-zA-Z0-9]/g, '')}`

  return (
    <button
      type="button"
      onClick={onClick}
      className={`block w-full max-w-[180px] border-0 bg-transparent p-0 text-left ${className}`}
      aria-label={isSlot ? 'Adicionar jogador' : name}
    >
      <svg viewBox="0 0 180 250" className={`block h-full w-full ${isAvulso ? 'grayscale' : ''}`} role="img">
        <defs>
          {/*
            Base do Corel usada como máscara. 
            A carta colorida fica por baixo, e a máscara garante o shape certo.
          */}
          <clipPath id={`${id}-clip`}>
            <path d="
              M90 5
              C98 16 106 20 119 17
              L143 12
              C158 20 166 31 168 45
              L168 142
              C168 174 162 192 148 202
              C127 212 110 216 99 227
              L90 237
              L81 227
              C70 216 53 212 32 202
              C18 192 12 174 12 142
              L12 45
              C14 31 22 20 37 12
              L61 17
              C74 20 82 16 90 5
              Z
            " />
          </clipPath>

          <linearGradient id={`${id}-bg`} x1="18" y1="8" x2="162" y2="232" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={p.start} />
            <stop offset="48%" stopColor={p.mid} />
            <stop offset="100%" stopColor={p.end} />
          </linearGradient>

          <linearGradient id={`${id}-shine`} x1="20" y1="15" x2="150" y2="190" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="rgba(255,255,255,.45)" />
            <stop offset="45%" stopColor="rgba(255,255,255,.08)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>

          <linearGradient id={`${id}-black`} x1="0" y1="120" x2="0" y2="235" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#1c1c1c" />
            <stop offset="100%" stopColor="#050505" />
          </linearGradient>

          <linearGradient id={`${id}-badge`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={p.badge} />
            <stop offset="100%" stopColor="#dc2626" />
          </linearGradient>

          {/* textura tecnológica: grade + pontos + linhas diagonais */}
          <pattern id={`${id}-grid`} width="18" height="18" patternUnits="userSpaceOnUse">
            <path d="M18 0H0V18" fill="none" stroke="rgba(255,255,255,.08)" strokeWidth=".6" />
            <circle cx="3" cy="3" r=".9" fill="rgba(255,255,255,.12)" />
            <path d="M0 18L18 0" stroke="rgba(255,255,255,.035)" strokeWidth=".7" />
          </pattern>

          <pattern id={`${id}-carbon`} width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M0 0H10V10H0Z" fill="rgba(255,255,255,.025)" />
            <path d="M0 10L10 0" stroke="rgba(255,255,255,.05)" strokeWidth=".7" />
            <path d="M-3 5L5 -3M5 13L13 5" stroke="rgba(0,0,0,.18)" strokeWidth=".8" />
          </pattern>

          <filter id={`${id}-shadow`} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="3" stdDeviation="2.4" floodColor="#000" floodOpacity=".38" />
          </filter>
        </defs>

        {/* camada de base SVG do Corel escondida, só para manter arquivo original no componente */}
        <g opacity="0" dangerouslySetInnerHTML={{ __html: SVG_COREL }} />

        {/* fundo da carta com textura, preso ao shape */}
        <g clipPath={`url(#${id}-clip)`} filter={`url(#${id}-shadow)`}>
          <rect x="0" y="0" width="180" height="250" fill={`url(#${id}-bg)`} />
          <rect x="0" y="0" width="180" height="250" fill={`url(#${id}-shine)`} />
          <rect x="0" y="0" width="180" height="250" fill={`url(#${id}-grid)`} opacity={isSlot ? .18 : .55} />

          {/* silhueta/foto fica ATRÁS da faixa */}
          {photoUrl && !isSlot ? (
            <image
              href={photoUrl}
              x="34"
              y="34"
              width="112"
              height="118"
              preserveAspectRatio="xMidYMin slice"
              opacity={isAvulso ? .72 : 1}
            />
          ) : (
            <>
              <circle cx="90" cy="68" r="31" fill={isSlot ? '#1f2937' : '#020617'} />
              <path
                d="M25 148 C30 94 55 75 90 75 C125 75 150 94 155 148 Z"
                fill={isSlot ? '#1f2937' : '#020617'}
              />
            </>
          )}

          {/* faixa preta em cima da foto/silhueta */}
          <path
            d="
              M12 130
              H168
              V160
              C168 178 162 191 148 202
              C127 212 110 216 99 227
              L90 237
              L81 227
              C70 216 53 212 32 202
              C18 191 12 178 12 160
              Z
            "
            fill={`url(#${id}-black)`}
          />
          <path
            d="
              M12 130
              H168
              V160
              C168 178 162 191 148 202
              C127 212 110 216 99 227
              L90 237
              L81 227
              C70 216 53 212 32 202
              C18 191 12 178 12 160
              Z
            "
            fill={`url(#${id}-carbon)`}
            opacity=".7"
          />

          <rect x="12" y="130" width="156" height="2" fill={p.stroke} opacity=".85" />
          <rect x="28" y="172" width="124" height="1" fill={p.stroke} opacity=".35" />
        </g>

        {/* borda principal */}
        <path
          d="
            M90 5
            C98 16 106 20 119 17
            L143 12
            C158 20 166 31 168 45
            L168 142
            C168 174 162 192 148 202
            C127 212 110 216 99 227
            L90 237
            L81 227
            C70 216 53 212 32 202
            C18 192 12 174 12 142
            L12 45
            C14 31 22 20 37 12
            L61 17
            C74 20 82 16 90 5
            Z
          "
          fill="none"
          stroke={p.stroke}
          strokeWidth="3"
          strokeLinejoin="round"
        />

        {!isSlot && (
          <text x="145" y="42" textAnchor="middle" fontSize="20" fontWeight="900" fill="rgba(0,0,0,.78)">
            {String(number).padStart(2, '0')}
          </text>
        )}

        {/* Nome / + */}
        <text
          x="90"
          y={isSlot ? 162 : 158}
          textAnchor="middle"
          fontSize={isSlot ? 38 : 20}
          fontWeight="900"
          fill="#ffffff"
          style={{ paintOrder: 'stroke', stroke: 'rgba(0,0,0,.45)', strokeWidth: 2 }}
        >
          {isSlot ? '+' : (name || 'JOGADOR').slice(0, 12).toUpperCase()}
        </text>

        {!isSlot && (
          <>
            {/* badge inferior do tier */}
            <path
              d="
                M75 170
                C82 165 98 165 105 170
                L105 190
                C102 198 96 203 90 207
                C84 203 78 198 75 190
                Z
              "
              fill={isAvulso ? '#3f3f46' : `url(#${id}-badge)`}
              stroke={isAvulso ? '#d4d4d8' : p.stroke}
              strokeWidth="1.8"
            />
            <text x="90" y="192" textAnchor="middle" fontSize="18" fontWeight="900" fill="#fff">
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
