'use client'

import type { StreamOverlayRenderProps } from '../types'

export default function AgradecimentosOverlay({ config }: StreamOverlayRenderProps) {
  const theme = config.theme || {}
  const layout = config.layout || {}
  const customPosition = layout.x != null || layout.y != null

  return (
    <div className="absolute left-0 top-0 flex h-[1080px] w-[1920px] items-center justify-center overflow-hidden bg-transparent uppercase">
      <div
        className="px-24 py-16 text-center"
        style={{
          position: customPosition ? 'absolute' : 'relative',
          left: customPosition ? Number(layout.x || 0) : undefined,
          top: customPosition ? Number(layout.y || 0) : undefined,
          transform: `scale(${Number(layout.scale || 100) / 100})`,
          transformOrigin: 'top left',
          width: Number(layout.w || 980),
          background: theme.background || 'rgba(0,0,0,0.55)',
          border: theme.border || '1px solid rgba(255,255,255,0.2)',
          borderRadius: Number(layout.radius || 0),
          color: theme.headerText || '#ffffff',
          opacity: Number(layout.opacity || 100) / 100,
        }}
      >
        <div className="font-black tracking-[0.12em]" style={{ color: theme.accent || theme.headerText || '#ffffff', fontSize: Number(layout.headerHeight || 84) }}>{config.title || 'AGRADECIMENTOS'}</div>
        <div className="mt-8 font-bold tracking-[0.18em]" style={{ color: theme.text || 'rgba(255,255,255,0.8)', fontSize: Number(layout.fontSize || 36) }}>OBRIGADO POR ASSISTIR</div>
      </div>
    </div>
  )
}
