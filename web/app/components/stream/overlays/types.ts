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
  booyahsDia?: Array<{
    mapa?: string | null
    mapaImagem?: string | null
    quedaNumero?: number | null
    concluida?: boolean
  }>
}

export type StreamOverlayRenderProps = {
  config: StreamOverlayConfig
  rows: RankingRow[]
  templateId: string
  overlayName: string
  context?: StreamOverlayContext
}

export type StreamOverlayEditorProps = {
  config: StreamOverlayConfig
  onChange: (path: string, value: unknown) => void
  onChangeConfig?: (mutator: (config: StreamOverlayConfig) => StreamOverlayConfig) => void
  onUploadImage?: (path: string, file: File) => Promise<void>
}

export type StreamOverlayDefinition = {
  id: string
  slug: string
  nome: string
  categoria: string
  descricao?: string
  config_padrao?: StreamOverlayConfig
  Render: (props: StreamOverlayRenderProps) => ReactElement
  Editor?: (props: StreamOverlayEditorProps) => ReactElement
}
