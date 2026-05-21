import type { ReactElement } from 'react'
import type { RankingRow, StreamOverlayConfig } from '@/lib/streamOverlay'

export type StreamOverlayRenderProps = {
  config: StreamOverlayConfig
  rows: RankingRow[]
  templateId: string
  overlayName: string
}

export type StreamOverlayDefinition = {
  id: string
  slug: string
  nome: string
  categoria: string
  Render: (props: StreamOverlayRenderProps) => ReactElement
}
