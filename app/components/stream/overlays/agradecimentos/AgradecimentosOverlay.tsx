'use client'

import type { StreamOverlayRenderProps } from '../types'

export default function AgradecimentosOverlay({ config }: StreamOverlayRenderProps) {
  return (
    <div className="absolute left-0 top-0 flex h-[1080px] w-[1920px] items-center justify-center overflow-hidden bg-transparent uppercase">
      <div className="border border-white/20 bg-black/55 px-24 py-16 text-center text-white">
        <div className="text-[84px] font-black tracking-[0.12em]">{config.title || 'AGRADECIMENTOS'}</div>
        <div className="mt-8 text-4xl font-bold tracking-[0.18em] text-white/80">OBRIGADO POR ASSISTIR</div>
      </div>
    </div>
  )
}
