'use client'

/* eslint-disable @next/next/no-img-element, @typescript-eslint/no-explicit-any */

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

function blockStyle(block: any, fallback: { x: number; y: number; w: number; h: number; scale?: number; opacity?: number }): CSSProperties {
  const scale = num(block?.scale, fallback.scale || 100) / 100
  return {
    left: num(block?.x, fallback.x),
    top: num(block?.y, fallback.y),
    width: num(block?.w, fallback.w),
    height: num(block?.h, fallback.h),
    opacity: num(block?.opacity, fallback.opacity || 100) / 100,
    transform: `scale(${scale})`,
    transformOrigin: 'top left',
  }
}

export default function BooyahOverlay({ rows, config }: StreamOverlayRenderProps) {
  const winner = rows[0]
  const booyah = (config as any).booyah || {}
  const textoBlock = booyah.textoBlock || {}
  const logoBlock = booyah.logoBlock || {}
  const equipeBlock = booyah.equipeBlock || {}
  const title = String(booyah.texto || config.title || 'BOOYAH').toUpperCase()
  const equipeNome = winner?.nome || 'EQUIPE VENCEDORA'

  return (
    <div className="absolute left-0 top-0 h-[1080px] w-[1920px] overflow-hidden bg-transparent uppercase">
      <style jsx>{`
        @keyframes booyahTextIn {
          0% { opacity: 0; transform: translateX(-90px) skewX(-10deg) scale(0.96); filter: blur(6px); }
          100% { opacity: 1; transform: translateX(0) skewX(-10deg) scale(1); filter: blur(0); }
        }
        @keyframes booyahLiquid {
          0%, 100% { transform: translateY(0) skewX(-10deg) scaleX(1); letter-spacing: 0.08em; }
          25% { transform: translateY(-8px) skewX(-13deg) scaleX(1.035); letter-spacing: 0.105em; }
          50% { transform: translateY(5px) skewX(-7deg) scaleX(0.98); letter-spacing: 0.075em; }
          75% { transform: translateY(-4px) skewX(-12deg) scaleX(1.02); letter-spacing: 0.095em; }
        }
        @keyframes booyahLogoIn {
          0% { opacity: 0; transform: translateY(80px) scale(0.7) rotate(-10deg); filter: blur(8px); }
          100% { opacity: 1; transform: translateY(0) scale(1) rotate(0deg); filter: blur(0); }
        }
        @keyframes booyahTeamIn {
          0% { opacity: 0; transform: translateY(30px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div
        className="absolute flex items-center justify-center overflow-hidden"
        style={{
          ...blockStyle(logoBlock, { x: 300, y: 360, w: 230, h: 230, scale: 100, opacity: 100 }),
          animation: `booyahLogoIn 700ms cubic-bezier(.2,.9,.2,1) ${num(logoBlock.delay, 2000)}ms both`,
          background: cssValue(logoBlock.background, 'transparent'),
          border: cssValue(logoBlock.border, 'none'),
          borderRadius: num(logoBlock.radius, 0),
        }}
      >
        {winner?.logo ? (
          <>
            <img
              src={winner.logo}
              alt={winner.nome}
              className="h-full w-full"
              style={{
                objectFit: cssValue(logoBlock.fit, 'contain') as any,
                objectPosition: cssValue(logoBlock.position, 'center center'),
              }}
              onError={(event) => {
                event.currentTarget.style.display = 'none'
                const fallback = event.currentTarget.nextElementSibling as HTMLElement | null
                if (fallback) fallback.style.display = 'flex'
              }}
            />
            <span className="hidden h-full w-full items-center justify-center text-7xl font-black text-white">
              {equipeNome.slice(0, 1)}
            </span>
          </>
        ) : (
          <span className="text-7xl font-black text-white">{equipeNome.slice(0, 1)}</span>
        )}
      </div>

      <div
        className="absolute flex items-center overflow-visible"
        style={blockStyle(textoBlock, { x: 630, y: 330, w: 880, h: 190, scale: 100, opacity: 100 })}
      >
        <div
          className="font-black italic leading-none"
          style={{
            color: cssValue(textoBlock.color, '#f6c453'),
            fontSize: num(textoBlock.fontSize, 132),
            textShadow: `0 10px 0 ${cssValue(textoBlock.shadowColor, 'rgba(0,0,0,0.35)')}`,
            animation: 'booyahTextIn 650ms cubic-bezier(.2,.9,.2,1) both, booyahLiquid 2.4s ease-in-out 700ms infinite',
          }}
        >
          {title}
        </div>
      </div>

      <div
        className="absolute flex items-center font-black tracking-[0.12em]"
        style={{
          ...blockStyle(equipeBlock, { x: 620, y: 530, w: 760, h: 80, scale: 100, opacity: 100 }),
          color: cssValue(equipeBlock.color, '#ffffff'),
          fontSize: num(equipeBlock.fontSize, 42),
          textShadow: `0 4px 0 ${cssValue(equipeBlock.shadowColor, 'rgba(0,0,0,0.35)')}`,
          justifyContent: cssValue(equipeBlock.align, 'left'),
          animation: `booyahTeamIn 520ms ease-out ${num(equipeBlock.delay, 2200)}ms both`,
        }}
      >
        {equipeNome}
      </div>
    </div>
  )
}
