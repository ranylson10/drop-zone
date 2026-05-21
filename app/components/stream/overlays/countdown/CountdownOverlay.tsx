'use client'

import { useEffect, useMemo, useState } from 'react'
import type { StreamOverlayRenderProps } from '../types'

export default function CountdownOverlay({ config }: StreamOverlayRenderProps) {
  const minutes = Number(config.layout?.countMinutes || (config as any)?.countMinutes || 15)
  const initial = useMemo(() => Math.max(0, Math.floor(minutes * 60)), [minutes])
  const [left, setLeft] = useState(initial)

  useEffect(() => {
    setLeft(initial)
    const timer = window.setInterval(() => setLeft((value) => Math.max(0, value - 1)), 1000)
    return () => window.clearInterval(timer)
  }, [initial])

  const mm = String(Math.floor(left / 60)).padStart(2, '0')
  const ss = String(left % 60).padStart(2, '0')

  return (
    <div className="absolute left-0 top-0 flex h-[1080px] w-[1920px] items-center justify-center overflow-hidden bg-transparent uppercase">
      <div className="border border-white/20 bg-black/55 px-20 py-14 text-center text-white">
        <div className="text-5xl font-black tracking-[0.3em]">{config.title || 'JÁ VAI COMEÇAR'}</div>
        <div className="mt-8 text-[180px] font-black leading-none tracking-[0.08em]">{mm}:{ss}</div>
      </div>
    </div>
  )
}
