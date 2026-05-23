'use client'

/* eslint-disable @typescript-eslint/no-explicit-any, @next/next/no-img-element, react-hooks/set-state-in-effect */

import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import type { StreamOverlayRenderProps } from '../types'

function num(value: unknown, fallback: number) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function cssValue(value: unknown, fallback: string) {
  const text = String(value || '').trim()
  return text || fallback
}

function blockStyle(block: any, fallback: { x: number; y: number; w: number; h?: number; scale?: number; opacity?: number }): CSSProperties {
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

function panelStyle(block: any, fallback: { background: string; border: string; radius: number }): CSSProperties {
  return {
    background: cssValue(block?.background, fallback.background),
    border: cssValue(block?.border, fallback.border),
    borderRadius: num(block?.radius, fallback.radius),
    color: cssValue(block?.textColor, '#ffffff'),
    boxShadow: cssValue(block?.shadow, 'none'),
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
  const timerBlock = countdown.timerBlock || {}
  const equipesBlock = countdown.equipesBlock || {}
  const mapasBlock = countdown.mapasBlock || {}
  const durationSeconds = num(countdown.seconds || countdown.durationSeconds || countdown.tempoSegundos, 15 * 60)
  const [left, setLeft] = useState(durationSeconds)

  useEffect(() => {
    setLeft(durationSeconds)
    const timer = window.setInterval(() => setLeft((value) => Math.max(0, value - 1)), 1000)
    return () => window.clearInterval(timer)
  }, [durationSeconds])

  const fromContext = context?.mapas || []
  const fromConfig = Array.isArray(countdown.mapas) ? countdown.mapas : []
  const mapas = (fromConfig.length ? fromConfig : fromContext).map((mapa: unknown) => String(mapa || '').trim()).filter(Boolean)

  const maxEquipes = Math.max(0, num(countdown.maxEquipes, 18))
  const equipes = [
    ...rows.slice(0, maxEquipes),
    ...Array.from({ length: Math.max(0, maxEquipes - rows.length) }, (_, index) => ({
      id: `empty-${index}`,
      nome: '',
      tag: null,
      logo: null,
      grupo: null,
      quedas: 0,
      booyahs: 0,
      kills: 0,
      pontos: 0,
      empty: true,
    })),
  ]
  const titulo = String(countdown.titulo || config.title || 'A LIVE COMECA EM').toUpperCase()
  const subtitulo = String(countdown.subtitulo || context?.jogo?.nome_bloco || context?.jogo?.nome || '').toUpperCase()
  const imagemUrl = String(countdown.imagemUrl || countdown.imageUrl || '').trim()
  const textoExtra = String(countdown.texto || countdown.extraText || '').trim()
  const quantidadePartidas = context?.quantidadePartidas || mapas.length || 0
  const teamColumns = Math.max(1, Math.min(24, num(equipesBlock.columns, 3)))
  const teamColumnGap = num(equipesBlock.columnGap ?? equipesBlock.gap, 20)
  const teamRowGap = num(equipesBlock.rowGap ?? equipesBlock.gap, 20)
  const teamCardWidth = num(equipesBlock.cardWidth, 190)
  const gridAlign = cssValue(equipesBlock.gridAlign, 'start')
  const contentAlign = cssValue(equipesBlock.contentAlign, 'center')
  const verticalAlign = cssValue(equipesBlock.verticalAlign, 'center')
  const mapGap = num(mapasBlock.rowGap ?? mapasBlock.gap, 12)

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
        className="absolute px-16 py-12 text-center backdrop-blur-sm"
        style={{
          ...blockStyle(timerBlock, { x: 585, y: 110, w: 750, scale: 100, opacity: 100 }),
          ...panelStyle(timerBlock, { background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.15)', radius: 28 }),
          padding: num(timerBlock.padding, 48),
          textAlign: cssValue(timerBlock.align, 'center') as any,
        }}
      >
        <div className="font-black" style={{ color: cssValue(timerBlock.titleColor, 'rgba(255,255,255,0.9)'), fontSize: num(timerBlock.titleSize, 36), letterSpacing: num(timerBlock.titleSpacing, 9) }}>
          {titulo}
        </div>
        {subtitulo ? (
          <div className="mt-3 font-black" style={{ color: cssValue(timerBlock.accentColor, '#f6c453'), fontSize: num(timerBlock.subtitleSize, 24), letterSpacing: num(timerBlock.subtitleSpacing, 4) }}>
            {subtitulo}
          </div>
        ) : null}
        <div className="mt-8 font-black leading-none drop-shadow-[0_8px_0_rgba(0,0,0,0.35)]" style={{ color: cssValue(timerBlock.clockColor, '#ffffff'), fontSize: num(timerBlock.clockSize, 160), letterSpacing: num(timerBlock.clockSpacing, 6) }}>
          {formatClock(left)}
        </div>
        {quantidadePartidas ? (
          <div className="mt-6 font-black" style={{ color: cssValue(timerBlock.infoColor, 'rgba(255,255,255,0.8)'), fontSize: num(timerBlock.infoSize, 24), letterSpacing: num(timerBlock.infoSpacing, 5) }}>
            {quantidadePartidas} QUEDAS
          </div>
        ) : null}
      </section>

      <section
        className="absolute"
        style={{
          ...blockStyle(equipesBlock, { x: 95, y: 380, w: 760, scale: 100, opacity: 100 }),
          color: cssValue(equipesBlock.textColor, '#ffffff'),
        }}
      >
        <div className="font-black drop-shadow" style={{ color: cssValue(equipesBlock.titleColor, '#ffffff'), fontSize: num(equipesBlock.titleSize, 30), letterSpacing: num(equipesBlock.titleSpacing, 5) }}>
          {cssValue(equipesBlock.title, 'EQUIPES DO JOGO')}
        </div>
        <div
          className="mt-5 grid justify-start"
          style={{
            gridTemplateColumns: `repeat(${teamColumns}, ${teamCardWidth}px)`,
            columnGap: teamColumnGap,
            rowGap: teamRowGap,
            justifyContent: gridAlign,
          }}
        >
          {equipes.map((equipe) => (
            <div
              key={equipe.id}
              className="flex flex-col items-center justify-center overflow-hidden px-4"
              style={{
                width: teamCardWidth,
                height: num(equipesBlock.cardHeight, 150),
                ...panelStyle(equipesBlock.cardStyle, { background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.2)', radius: 18 }),
                boxShadow: cssValue(equipesBlock.cardStyle?.shadow, 'none'),
                color: cssValue(equipesBlock.textColor, '#ffffff'),
                alignItems: contentAlign === 'left' ? 'flex-start' : contentAlign === 'right' ? 'flex-end' : 'center',
                justifyContent: verticalAlign === 'top' ? 'flex-start' : verticalAlign === 'bottom' ? 'flex-end' : 'center',
              }}
            >
              <div
                className="flex items-center justify-center overflow-hidden p-2"
                style={{
                  width: num(equipesBlock.logoSize, 80),
                  height: num(equipesBlock.logoSize, 80),
                  borderRadius: num(equipesBlock.logoRadius, 16),
                  background: cssValue(equipesBlock.logoBackground, 'transparent'),
                }}
              >
                {!equipe.empty && equipe.logo ? (
                  <img
                    src={equipe.logo}
                    alt={equipe.nome}
                    className="h-full w-full"
                    style={{
                      objectFit: cssValue(equipesBlock.logoFit, 'contain') as any,
                      objectPosition: cssValue(equipesBlock.logoPosition, 'center center'),
                    }}
                  />
                ) : !equipe.empty ? <span className="text-3xl font-black text-slate-900">{equipe.nome.slice(0, 2)}</span> : null}
              </div>
              {!equipe.empty ? (
                <div
                  className="mt-3 max-w-full truncate font-black"
                  style={{
                    fontSize: num(equipesBlock.fontSize, 18),
                    letterSpacing: num(equipesBlock.textSpacing, 1.4),
                    textAlign: contentAlign === 'left' ? 'left' : contentAlign === 'right' ? 'right' : 'center',
                  }}
                >
                  {equipe.nome}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      <section
        className="absolute"
        style={{
          ...blockStyle(mapasBlock, { x: 1120, y: 405, w: 620, scale: 100, opacity: 100 }),
          ...panelStyle(mapasBlock, { background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.15)', radius: 24 }),
          padding: num(mapasBlock.padding, 32),
        }}
      >
        <div className="mb-5 font-black" style={{ color: cssValue(mapasBlock.titleColor, '#ffffff'), fontSize: num(mapasBlock.titleSize, 30), letterSpacing: num(mapasBlock.titleSpacing, 5) }}>
          {cssValue(mapasBlock.title, 'MAPAS / QUEDAS')}
        </div>
        <div className="grid" style={{ gap: mapGap }}>
          {(mapas.length ? mapas : ['BERMUDA', 'PURGATORIO', 'ALPINE', 'KALAHARI']).map((mapa, index) => (
            <div
              key={`${mapa}-${index}`}
              className="flex items-center justify-between"
              style={{
                height: num(mapasBlock.rowHeight, 62),
                paddingInline: num(mapasBlock.rowPaddingX, 20),
                background: cssValue(mapasBlock.rowBackground, 'rgba(255,255,255,0.95)'),
                border: cssValue(mapasBlock.rowBorder, '1px solid rgba(255,255,255,0.15)'),
                borderRadius: num(mapasBlock.rowRadius, 12),
                color: cssValue(mapasBlock.rowTextColor, '#020617'),
              }}
            >
              <span className="font-black" style={{ fontSize: num(mapasBlock.labelSize, 16), letterSpacing: num(mapasBlock.labelSpacing, 3) }}>QUEDA {index + 1}</span>
              <span className="font-black" style={{ fontSize: num(mapasBlock.fontSize, 24), letterSpacing: num(mapasBlock.textSpacing, 2) }}>{mapa}</span>
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
