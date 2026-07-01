'use client'

import type { StreamOverlayRenderProps } from '../types'

function num(value: unknown, fallback: number) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function str(value: unknown, fallback: string) {
  const text = String(value || '').trim()
  return text || fallback
}

export default function TelaEsperaOverlay({ rows, config }: StreamOverlayRenderProps) {
  const layout = config.layout || {}
  const theme = config.theme || {}
  const teams = rows.slice(0, num(layout.maxRows, 18))
  const columns = Math.max(1, Math.min(12, num(layout.columns, 6)))
  const logoSize = num(layout.logoSize, 96)
  const blockWidth = num(layout.w, 1500)

  return (
    <div className="absolute left-0 top-0 flex h-[1080px] w-[1920px] items-center justify-center overflow-hidden bg-transparent uppercase">
      <div
        className="border px-14 py-12"
        style={{
          width: blockWidth,
          background: str(theme.background, 'rgba(0,0,0,0.55)'),
          borderColor: str(theme.border, 'rgba(255,255,255,0.2)'),
          color: str(theme.text, '#ffffff'),
          borderRadius: num(layout.radius, 0),
          opacity: num(layout.opacity, 100) / 100,
          transform: `scale(${num(layout.scale, 100) / 100})`,
          transformOrigin: 'center center',
        }}
      >
        <div className="text-center font-black tracking-[0.12em]" style={{ fontSize: num(layout.titleSize, 58), color: str(theme.headerText || theme.accent, str(theme.text, '#ffffff')) }}>
          {config.title || 'TELA DE ESPERA'}
        </div>
        <div className="mt-10 grid gap-5" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
          {teams.map((team) => (
            <div key={team.id} className="flex flex-col items-center justify-center gap-3 border border-white/15 bg-white/10 p-5">
              <div className="flex items-center justify-center overflow-hidden bg-white" style={{ width: logoSize, height: logoSize }}>
                {team.logo ? <img src={team.logo} alt={team.nome} className="h-full w-full object-contain" /> : <span className="text-3xl font-black text-slate-900">{team.nome.slice(0, 1)}</span>}
              </div>
              <div className="w-full truncate text-center font-black tracking-[0.08em]" style={{ fontSize: num(layout.fontSize, 18) }}>{team.nome}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
