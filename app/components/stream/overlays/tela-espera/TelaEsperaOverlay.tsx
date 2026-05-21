'use client'

import type { StreamOverlayRenderProps } from '../types'

export default function TelaEsperaOverlay({ rows, config }: StreamOverlayRenderProps) {
  const teams = rows.slice(0, Number(config.layout?.maxRows || 18))

  return (
    <div className="absolute left-0 top-0 flex h-[1080px] w-[1920px] items-center justify-center overflow-hidden bg-transparent uppercase">
      <div className="w-[1500px] border border-white/20 bg-black/55 px-14 py-12 text-white">
        <div className="text-center text-[58px] font-black tracking-[0.12em]">{config.title || 'TELA DE ESPERA'}</div>
        <div className="mt-10 grid grid-cols-6 gap-5">
          {teams.map((team) => (
            <div key={team.id} className="flex flex-col items-center justify-center gap-3 border border-white/15 bg-white/10 p-5">
              <div className="flex h-24 w-24 items-center justify-center overflow-hidden bg-white">
                {team.logo ? <img src={team.logo} alt={team.nome} className="h-full w-full object-contain" /> : <span className="text-3xl font-black text-slate-900">{team.nome.slice(0, 1)}</span>}
              </div>
              <div className="w-full truncate text-center text-lg font-black tracking-[0.08em]">{team.nome}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
