'use client'

import { MvpGeralOverlay, sampleRankingRows } from '@/lib/streamOverlay'
import type { StreamOverlayRenderProps } from '../types'

export default function MvpGeralOverlayView({ config, rows }: StreamOverlayRenderProps) {
  return <MvpGeralOverlay config={config} rows={rows.length > 0 ? rows : sampleRankingRows(8)} />
}
