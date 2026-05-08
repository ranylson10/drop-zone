'use client'

import { Crown, Shield } from 'lucide-react'

type RankingTierBadgeProps = {
  tier?: string | null
  posicao?: number | null
  score?: number | string | null
  tipo?: 'jogador' | 'equipe' | 'campeonato'
  compacto?: boolean
}

const tierStyles: Record<string, string> = {
  SS: 'border-amber-400 bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-300 text-amber-950 shadow-[0_0_0_1px_rgba(245,158,11,0.25)]',
  S: 'border-violet-300 bg-violet-50 text-violet-700',
  A: 'border-blue-300 bg-blue-50 text-blue-700',
  B: 'border-emerald-300 bg-emerald-50 text-emerald-700',
  C: 'border-cyan-300 bg-cyan-50 text-cyan-700',
  D: 'border-orange-300 bg-orange-50 text-orange-700',
  E: 'border-zinc-300 bg-zinc-50 text-zinc-600',
}

function formatScore(score?: number | string | null) {
  const n = Number(score || 0)
  if (!Number.isFinite(n)) return '0'
  if (n >= 1000) return n.toLocaleString('pt-BR', { maximumFractionDigits: 0 })
  return n.toLocaleString('pt-BR', { maximumFractionDigits: 1 })
}

export default function RankingTierBadge({
  tier,
  posicao,
  score,
  tipo = 'jogador',
  compacto = false,
}: RankingTierBadgeProps) {
  const t = String(tier || 'E').toUpperCase()
  const style = tierStyles[t] || tierStyles.E
  const labelTipo = tipo === 'equipe' ? 'Equipe' : tipo === 'campeonato' ? 'Camp' : 'Player'

  if (compacto) {
    return (
      <span
        title={`${labelTipo} Tier ${t}${posicao ? ` • #${posicao}` : ''}${score != null ? ` • Score ${formatScore(score)}` : ''}`}
        className={`inline-flex items-center gap-1 border px-1.5 py-0.5 text-[9px] font-black uppercase tracking-[0.12em] ${style}`}
      >
        {t === 'SS' ? <Crown size={10} /> : <Shield size={10} />}
        {t}
      </span>
    )
  }

  return (
    <span
      title={`${labelTipo} Tier ${t}${posicao ? ` • #${posicao}` : ''}${score != null ? ` • Score ${formatScore(score)}` : ''}`}
      className={`inline-flex items-center gap-1.5 border px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${style}`}
    >
      {t === 'SS' ? <Crown size={11} /> : <Shield size={11} />}
      <span>Tier {t}</span>
      {posicao ? <span className="opacity-70">#{posicao}</span> : null}
    </span>
  )
}

export { formatScore }
