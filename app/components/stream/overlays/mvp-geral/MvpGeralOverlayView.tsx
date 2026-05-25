'use client'

import { TabelaGeralOverlay, sampleRankingRows } from '@/lib/streamOverlay'
import type { StreamOverlayRenderProps } from '../types'

export default function MvpGeralOverlayView({ config, rows }: StreamOverlayRenderProps) {
  const maxRows = Number(config.layout?.maxRows || 8)
  return <TabelaGeralOverlay config={config} rows={rows.length > 0 ? rows : sampleRankingRows(maxRows)} />
}
