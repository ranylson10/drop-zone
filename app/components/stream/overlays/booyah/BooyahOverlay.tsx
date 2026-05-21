'use client'

import type { StreamOverlayRenderProps } from '../types'

export default function BooyahOverlay({ rows, config }: StreamOverlayRenderProps) {
  const winner = rows[0]
  const theme = config.theme || {}
  const title = config.title || 'BOOYAH'

  return (
    <div className="absolute left-0 top-0 flex h-[1080px] w-[1920px] items-center justify-center overflow-hidden bg-transparent uppercase">
      <div className="relative flex min-w-[980px] items-center gap-10 border border-white/20 bg-black/55 px-16 py-12" style={{ color: theme.headerText || '#ffffff' }}>
        <div className="flex h-44 w-44 items-center justify-center overflow-hidden bg-white/95">
          {winner?.logo ? <img src={winner.logo} alt={winner.nome} className="h-full w-full object-contain" /> : <span className="text-5xl font-black text-slate-900">{String(winner?.nome || 'B').slice(0, 1)}</span>}
        </div>
        <div className="min-w-0">
          <div className="text-[96px] font-black italic leading-none tracking-[0.08em]" style={{ color: theme.accent || '#f6c453' }}>{title}</div>
          <div className="mt-5 truncate text-[48px] font-black tracking-[0.12em]">{winner?.nome || 'EQUIPE VENCEDORA'}</div>
        </div>
      </div>
    </div>
  )
}
