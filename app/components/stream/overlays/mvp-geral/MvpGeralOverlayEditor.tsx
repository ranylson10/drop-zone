'use client'

import { Trophy } from 'lucide-react'
import type { StreamOverlayEditorProps } from '../types'
import type { StreamOverlayConfig } from '@/lib/streamOverlay'

function applyMvpPreset(base: StreamOverlayConfig): StreamOverlayConfig {
  const next: StreamOverlayConfig = JSON.parse(JSON.stringify(base || {}))

  next.title = 'LÍDERES DE ABATES'
  next.mvpGeral = {
    ...(next.mvpGeral || {}),
    enabled: true,
    backgroundImage: next.mvpGeral?.backgroundImage || next.tabelaGeral?.backgroundImage || '',
    backgroundOpacity: next.mvpGeral?.backgroundOpacity ?? next.tabelaGeral?.backgroundOpacity ?? 100,
    photoFit: next.mvpGeral?.photoFit || 'cover',
    tableTitle: next.mvpGeral?.tableTitle || 'LÍDERES DE ABATES',
    tableMaxRows: 8,
  }
  next.tabelaGeral = {
    ...(next.tabelaGeral || {}),
    mode: 'lateral',
    backgroundImage: next.tabelaGeral?.backgroundImage || '',
    backgroundOpacity: next.tabelaGeral?.backgroundOpacity ?? 100,
    infoImage: {
      enabled: true,
      url: next.tabelaGeral?.infoImage?.url || '',
      x: next.tabelaGeral?.infoImage?.x ?? 210,
      y: next.tabelaGeral?.infoImage?.y ?? 86,
      w: next.tabelaGeral?.infoImage?.w ?? 590,
      h: next.tabelaGeral?.infoImage?.h ?? 650,
      opacity: next.tabelaGeral?.infoImage?.opacity ?? 100,
      fit: next.tabelaGeral?.infoImage?.fit || 'cover',
    },
  }
  next.brand = {
    ...(next.brand || {}),
    enabled: true,
    imageEnabled: false,
    textEnabled: true,
    name: 'MVP GERAL',
    title: 'LÍDERES DE ABATES',
    textX: next.brand?.textX ?? 210,
    textY: next.brand?.textY ?? 734,
    textW: next.brand?.textW ?? 590,
    textH: next.brand?.textH ?? 190,
    textScale: next.brand?.textScale ?? 100,
    textOpacity: next.brand?.textOpacity ?? 100,
    textColor: next.brand?.textColor || '#ffffff',
  }
  next.theme = {
    ...(next.theme || {}),
    primary: next.theme?.primary || '#ff5b00',
    rowBackground: next.theme?.rowBackground || '#82a51d',
    rowAltBackground: next.theme?.rowAltBackground || '#82a51d',
    text: next.theme?.text || '#ffffff',
    headerText: next.theme?.headerText || '#2a2a2a',
  }
  next.layout = {
    ...(next.layout || {}),
    x: next.layout?.x ?? 900,
    y: next.layout?.y ?? 130,
    w: next.layout?.w ?? 800,
    maxRows: 8,
    blockCount: 1,
    rowsPerBlock: 7,
    blockDirection: 'horizontal',
    blockGap: 0,
    headerHeight: 44,
    rowHeight: 74,
    rowGap: 12,
    fontSize: 27,
    logoSize: 58,
    paddingX: 12,
    radius: 0,
    scale: next.layout?.scale ?? 100,
    opacity: next.layout?.opacity ?? 100,
  }

  return next
}

export default function MvpGeralOverlayEditor({ config, onChange, onChangeConfig }: StreamOverlayEditorProps) {
  return (
    <div className="space-y-4 border border-white/10 bg-[#0b1220] p-3 text-xs font-semibold leading-5 text-zinc-400">
      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-300">
        MVP Geral / modo unico
      </div>

      <button
        type="button"
        onClick={() => onChangeConfig?.((current) => applyMvpPreset(current))}
        className="flex min-h-14 w-full items-center gap-3 border border-red-600 bg-red-600 px-3 text-left text-[10px] font-black uppercase tracking-[0.12em] text-white"
      >
        <Trophy size={17} />
        <span>
          3 blocos editaveis
          <small className="mt-1 block text-[9px] tracking-[0.08em] opacity-80">
            Foto MVP + info/estatisticas + tabela top 2 ao 8
          </small>
        </span>
      </button>

      <label className="block text-[10px] font-black uppercase tracking-[0.16em] text-zinc-400">
        Titulo da tabela
        <input
          value={config.mvpGeral?.tableTitle || config.title || 'LÍDERES DE ABATES'}
          onChange={(event) => onChange('mvpGeral.tableTitle', event.target.value)}
          className="mt-2 h-10 w-full border border-white/10 bg-white px-3 text-sm font-black text-[#101827] outline-none"
        />
      </label>
    </div>
  )
}
