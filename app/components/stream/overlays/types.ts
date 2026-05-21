import type { ReactElement } from 'react'
import type { RankingRow, StreamOverlayConfig } from '@/lib/streamOverlay'

export type StreamOverlayContext = {
  jogo?: {
    id?: string | null
    nome?: string | null
    nome_bloco?: string | null
    quantidade_partidas?: number | null
    data_hora?: string | null
  } | null
  mapas?: string[]
  quantidadePartidas?: number
  campeonato?: {
    id?: string | null
    nome?: string | null
    logo_url?: string | null
  } | null
}

export type StreamOverlayRenderProps = {
  config: StreamOverlayConfig
  rows: RankingRow[]
  templateId: string
  overlayName: string
  context?: StreamOverlayContext
}

export type StreamOverlayDefinition = {
  id: string
  slug: string
  nome: string
  categoria: string
  Render: (props: StreamOverlayRenderProps) => ReactElement
}
