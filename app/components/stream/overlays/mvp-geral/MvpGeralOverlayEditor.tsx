'use client'

import { Columns3, Trophy } from 'lucide-react'
import type { StreamOverlayEditorProps } from '../types'
import type { StreamOverlayConfig } from '@/lib/streamOverlay'

function applyMvpPreset(base: StreamOverlayConfig): StreamOverlayConfig {
  const next: StreamOverlayConfig = JSON.parse(JSON.stringify(base || {}))

  next.title = 'MVP GERAL'
  next.mvpGeral = {
    ...(next.mvpGeral || {}),
    enabled: true,
    backgroundImage: next.mvpGeral?.backgroundImage || next.tabelaGeral?.backgroundImage || '',
    backgroundOpacity: next.mvpGeral?.backgroundOpacity ?? next.tabelaGeral?.backgroundOpacity ?? 0,
    photoX: 210,
    photoY: 56,
    photoW: 590,
    photoH: 642,
    photoFit: next.mvpGeral?.photoFit || 'cover',
    infoX: 210,
    infoY: 698,
    infoW: 590,
    infoH: 205,
    tableX: 900,
    tableY: 205,
    tableW: 862,
    tableRowHeight: 76,
    tableGap: 12,
    tableTitle: next.mvpGeral?.tableTitle || '',
    tableMaxRows: 10,
    cardBackground: next.mvpGeral?.cardBackground || '#8010c8',
    tableBackground: next.mvpGeral?.tableBackground || 'linear-gradient(90deg, #d8ab4f 0%, #d8ab4f 18%, #8010c8 18%, #8010c8 100%)',
    lineColor: next.mvpGeral?.lineColor || '#d8ab4f',
  }
  next.tabelaGeral = {
    ...(next.tabelaGeral || {}),
    mode: 'lateral',
    backgroundImage: next.tabelaGeral?.backgroundImage || '',
    backgroundOpacity: next.tabelaGeral?.backgroundOpacity ?? 0,
    infoImage: {
      enabled: false,
      url: next.tabelaGeral?.infoImage?.url || '',
      x: next.tabelaGeral?.infoImage?.x ?? 0,
      y: next.tabelaGeral?.infoImage?.y ?? 0,
      w: next.tabelaGeral?.infoImage?.w ?? 0,
      h: next.tabelaGeral?.infoImage?.h ?? 0,
      opacity: next.tabelaGeral?.infoImage?.opacity ?? 100,
      fit: next.tabelaGeral?.infoImage?.fit || 'contain',
    },
  }
  next.brand = {
    ...(next.brand || {}),
    enabled: true,
    imageEnabled: true,
    textEnabled: true,
    name: next.brand?.name || 'MVP',
    title: 'MVP GERAL',
    x: 210,
    y: 56,
    w: 590,
    h: 642,
    scale: 100,
    opacity: 100,
    objectFit: next.brand?.objectFit || 'cover',
    objectPosition: next.brand?.objectPosition || 'center center',
    textX: 210,
    textY: 698,
    textW: 590,
    textH: 205,
    textScale: 100,
    textOpacity: 100,
    textColor: next.brand?.textColor || '#ffffff',
  }
  next.theme = {
    ...(next.theme || {}),
    primary: next.theme?.primary || '#d8ab4f',
    rowBackground: next.theme?.rowBackground || 'linear-gradient(90deg, #d8ab4f 0%, #d8ab4f 18%, #8010c8 18%, #8010c8 100%)',
    rowAltBackground: next.theme?.rowAltBackground || 'linear-gradient(90deg, #d8ab4f 0%, #d8ab4f 18%, #8010c8 18%, #8010c8 100%)',
    text: next.theme?.text || '#ffffff',
    headerText: next.theme?.headerText || '#050505',
    accent: next.theme?.accent || '#8010c8',
  }
  next.columns = {
    rank: true,
    logo: true,
    nome: true,
    tag: false,
    grupo: false,
    variacao: true,
    quedas: true,
    booyahs: false,
    kills: true,
    pontos: false,
  }
  next.columnsOrder = ['rank', 'logo', 'nome', 'variacao', 'quedas', 'kills']
  next.layout = {
    ...(next.layout || {}),
    x: 900,
    y: 205,
    w: 862,
    maxRows: 10,
    blockCount: 1,
    rowsPerBlock: 9,
    blockDirection: 'horizontal',
    blockGap: 0,
    headerHeight: 0,
    rowHeight: 76,
    rowGap: 12,
    fontSize: 30,
    logoSize: 58,
    paddingX: 12,
    radius: 0,
    scale: 100,
    opacity: 100,
  }

  return next
}

export default function MvpGeralOverlayEditor({ config, onChange, onChangeConfig }: StreamOverlayEditorProps) {
  return (
    <div className="space-y-4 border border-white/10 bg-[#0b1220] p-3 text-xs font-semibold leading-5 text-zinc-400">
      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-300">
        MVP Geral / modo rapido
      </div>

      <button
        type="button"
        onClick={() => onChangeConfig?.((current) => applyMvpPreset(current))}
        className="flex min-h-14 w-full items-center gap-3 border border-red-600 bg-red-600 px-3 text-left text-[10px] font-black uppercase tracking-[0.12em] text-white"
      >
        <Trophy size={17} />
        <span>
          TOP 1 em destaque
          <small className="mt-1 block text-[9px] tracking-[0.08em] opacity-80">
            Foto + estatisticas do lider e tabela 02-10
          </small>
        </span>
      </button>

      <div className="flex min-h-14 w-full items-center gap-3 border border-white/10 bg-white/5 px-3 text-left text-[10px] font-black uppercase tracking-[0.12em] text-zinc-300">
        <Columns3 size={17} />
        <span>
          Mesmo editor da tabela
          <small className="mt-1 block text-[9px] tracking-[0.08em] opacity-70">
            Use as abas abaixo para mover foto, info e tabela
          </small>
        </span>
      </div>

      <label className="block text-[10px] font-black uppercase tracking-[0.16em] text-zinc-400">
        Titulo opcional da tabela
        <input
          value={config.mvpGeral?.tableTitle || ''}
          onChange={(event) => onChange('mvpGeral.tableTitle', event.target.value)}
          placeholder="Deixe vazio para ficar igual a referencia"
          className="mt-2 h-10 w-full border border-white/10 bg-white px-3 text-sm font-black text-[#101827] outline-none"
        />
      </label>
    </div>
  )
}
