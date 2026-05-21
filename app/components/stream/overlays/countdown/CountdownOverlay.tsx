'use client'

import { useEffect, useMemo, useState } from 'react'
import type { StreamOverlayRenderProps } from '../types'

function num(value: unknown, fallback: number) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function blockStyle(block: any, fallback: { x: number; y: number; w: number; h?: number; scale?: number; opacity?: number }) {
  const scale = num(block?.scale, fallback.scale || 100) / 100
  return {
    left: num(block?.x, fallback.x),
    top: num(block?.y, fallback.y),
    width: num(block?.w, fallback.w),
    height: block?.h || fallback.h ? num(block?.h, fallback.h || 0) : undefined,
    opacity: num(block?.opacity, fallback.opacity || 100) / 100,
    transform: `scale(${scale})`,
    transformOrigin: 'top left',
  }
}

function formatClock(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds))
  const hh = Math.floor(safe / 3600)
  const mm = Math.floor((safe % 3600) / 60)
  const ss = safe % 60

  if (hh > 0) {
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
  }

  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
}

export default function CountdownOverlay({ config, rows, context }: StreamOverlayRenderProps) {
  const countdown = (config as any).countdown || {}
  const durationSeconds = num(countdown.seconds || countdown.durationSeconds || countdown.tempoSegundos, 15 * 60)
  const [left, setLeft] = useState(durationSeconds)

  useEffect(() => {
    setLeft(durationSeconds)
    const timer = window.setInterval(() => setLeft((value) => Math.max(0, value - 1)), 1000)
    return () => window.clearInterval(timer)
  }, [durationSeconds])

  const mapas = useMemo(() => {
    const fromContext = context?.mapas || []
    const fromConfig = Array.isArray(countdown.mapas) ? countdown.mapas : []
    return (fromConfig.length ? fromConfig : fromContext).map((mapa: unknown) => String(mapa || '').trim()).filter(Boolean)
  }, [context?.mapas, countdown.mapas])

  const equipes = rows.slice(0, num(countdown.maxEquipes, 18))
  const titulo = String(countdown.titulo || config.title || 'A LIVE COMEÇA EM').toUpperCase()
  const subtitulo = String(countdown.subtitulo || context?.jogo?.nome_bloco || context?.jogo?.nome || '').toUpperCase()
  const imagemUrl = String(countdown.imagemUrl || countdown.imageUrl || '').trim()
  const textoExtra = String(countdown.texto || countdown.extraText || '').trim()
  const quantidadePartidas = context?.quantidadePartidas || mapas.length || 0

  return (
    <div className="absolute left-0 top-0 h-[1080px] w-[1920px] overflow-hidden bg-transparent font-sans uppercase text-white">
      {imagemUrl ? (
        <img
          src={imagemUrl}
          alt="Imagem do countdown"
          className="absolute object-contain"
          style={blockStyle(countdown.imagemBlock, { x: 80, y: 60, w: 260, h: 180, scale: 100, opacity: 100 })}
        />
      ) : null}

      <section
        className="absolute rounded-[28px] border border-white/15 bg-black/55 px-16 py-12 text-center shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-sm"
        style={blockStyle(countdown.timerBlock, { x: 585, y: 110, w: 750, scale: 100, opacity: 100 })}
      >
        <div className="text-4xl font-black tracking-[0.24em] text-white/90">{titulo}</div>
        {subtitulo ? <div className="mt-3 text-2xl font-black tracking-[0.18em] text-[#f6c453]">{subtitulo}</div> : null}
        <div className="mt-8 text-[160px] font-black leading-none tracking-[0.04em] text-white drop-shadow-[0_8px_0_rgba(0,0,0,0.35)]">
          {formatClock(left)}
        </div>
        {quantidadePartidas ? (
          <div className="mt-6 text-2xl font-black tracking-[0.2em] text-white/80">
            {quantidadePartidas} QUEDAS
          </div>
        ) : null}
      </section>

      <section
        className="absolute grid gap-5"
        style={blockStyle(countdown.equipesBlock, { x: 95, y: 380, w: 760, scale: 100, opacity: 100 })}
      >
        <div className="text-3xl font-black tracking-[0.18em] text-white drop-shadow">EQUIPES DO JOGO</div>
        <div className="grid grid-cols-3 gap-5">
          {equipes.map((equipe) => (
            <div key={equipe.id} className="flex h-[150px] flex-col items-center justify-center rounded-[18px] border border-white/20 bg-black/55 px-4 shadow-[0_16px_40px_rgba(0,0,0,0.35)]">
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-white/95 p-2">
                {equipe.logo ? <img src={equipe.logo} alt={equipe.nome} className="h-full w-full object-contain" /> : <span className="text-3xl font-black text-slate-900">{equipe.nome.slice(0, 2)}</span>}
              </div>
              <div className="mt-3 max-w-full truncate text-center text-lg font-black tracking-[0.08em]">{equipe.nome}</div>
            </div>
          ))}
        </div>
      </section>

      <section
        className="absolute rounded-[24px] border border-white/15 bg-black/55 p-8 shadow-[0_20px_60px_rgba(0,0,0,0.38)]"
        style={blockStyle(countdown.mapasBlock, { x: 1120, y: 405, w: 620, scale: 100, opacity: 100 })}
      >
        <div className="mb-5 text-3xl font-black tracking-[0.18em] text-white">MAPAS / QUEDAS</div>
        <div className="grid gap-3">
          {(mapas.length ? mapas : ['BERMUDA', 'PURGATÓRIO', 'ALPINE', 'KALAHARI']).map((mapa, index) => (
            <div key={`${mapa}-${index}`} className="flex h-[62px] items-center justify-between rounded-xl border border-white/15 bg-white/95 px-5 text-slate-950">
              <span className="text-base font-black tracking-[0.18em]">QUEDA {index + 1}</span>
              <span className="text-2xl font-black tracking-[0.08em]">{mapa}</span>
            </div>
          ))}
        </div>
      </section>

      {textoExtra ? (
        <section
          className="absolute rounded-[20px] border border-white/15 bg-black/55 px-8 py-6 text-3xl font-black tracking-[0.14em] shadow-[0_16px_50px_rgba(0,0,0,0.35)]"
          style={blockStyle(countdown.textoBlock, { x: 500, y: 925, w: 920, scale: 100, opacity: 100 })}
        >
          {textoExtra}
        </section>
      ) : null}
    </div>
  )
}
