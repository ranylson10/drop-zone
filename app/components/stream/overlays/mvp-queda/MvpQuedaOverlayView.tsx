'use client'

import { TabelaGeralOverlay, sampleRankingRows } from '@/lib/streamOverlay'
import type { StreamOverlayRenderProps } from '../types'

export default function TabelaGeralOverlayView({ config, rows }: StreamOverlayRenderProps) {
  return <TabelaGeralOverlay config={config} rows={rows.length > 0 ? rows : sampleRankingRows(Number(config.layout?.maxRows || 12))} />
}
