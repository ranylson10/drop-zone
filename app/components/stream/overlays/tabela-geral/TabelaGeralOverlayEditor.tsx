'use client'

import { Columns3, PanelRight } from 'lucide-react'
import type { StreamOverlayEditorProps } from '../types'
import type { StreamOverlayConfig } from '@/lib/streamOverlay'

const titleImageUrl = '/stream-overlays/tabela-geral/lgd-tb-geral.png'

function applyPreset(base: StreamOverlayConfig, mode: 'lateral' | 'duplo-inferior'): StreamOverlayConfig {
  const next: StreamOverlayConfig = JSON.parse(JSON.stringify(base || {}))

  next.title = 'TABELA GERAL'
  next.brand = {
    ...(next.brand || {}),
    enabled: false,
  }
  next.tabelaGeral = {
    ...(next.tabelaGeral || {}),
    mode,
    backgroundImage: next.tabelaGeral?.backgroundImage || '',
    backgroundOpacity: next.tabelaGeral?.backgroundOpacity ?? 100,
    infoImage: {
      enabled: true,
      url: titleImageUrl,
      opacity: 100,
      fit: 'contain',
      ...(mode === 'lateral'
        ? { x: 0, y: 420, w: 920, h: 360 }
        : { x: 0, y: 8, w: 1920, h: 330 }),
    },
  }
  next.columns = {
    rank: true,
    logo: true,
    nome: true,
    tag: false,
    grupo: false,
    quedas: true,
    booyahs: true,
    kills: true,
    pontos: true,
  }
  next.columnsOrder = ['rank', 'logo', 'nome', 'tag', 'grupo', 'quedas', 'booyahs', 'kills', 'pontos']
  next.columnWidths = {
    ...(next.columnWidths || {}),
    rank: 0.52,
    logo: 0.7,
    nome: 2.6,
    quedas: 0.72,
    booyahs: 0.72,
    kills: 0.85,
    pontos: 0.92,
  }

  if (mode === 'lateral') {
    next.layout = {
      ...(next.layout || {}),
      x: 970,
      y: 150,
      w: 820,
      maxRows: 12,
      blockCount: 1,
      rowsPerBlock: 12,
      blockDirection: 'horizontal',
      blockGap: 0,
      headerHeight: 42,
      rowHeight: 58,
      rowGap: 8,
      fontSize: 23,
      logoSize: 42,
      paddingX: 12,
      radius: 0,
      scale: 100,
      opacity: 100,
    }
  } else {
    next.layout = {
      ...(next.layout || {}),
      x: 185,
      y: 455,
      w: 1550,
      maxRows: 12,
      blockCount: 2,
      rowsPerBlock: 6,
      blockDirection: 'horizontal',
      blockGap: 72,
      headerHeight: 45,
      rowHeight: 63,
      rowGap: 14,
      fontSize: 24,
      logoSize: 44,
      paddingX: 14,
      radius: 0,
      scale: 100,
      opacity: 100,
    }
  }

  return next
}

export default function TabelaGeralOverlayEditor({ config, onChange, onChangeConfig }: StreamOverlayEditorProps) {
  const mode = config.tabelaGeral?.mode || 'duplo-inferior'

  function setPreset(nextMode: 'lateral' | 'duplo-inferior') {
    onChangeConfig?.((current) => applyPreset(current, nextMode))
  }

  return (
    <div className="space-y-4 border border-white/10 bg-[#0b1220] p-3 text-xs font-semibold leading-5 text-zinc-400">
      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-300">
        Tabela Geral / modo rapido
      </div>

      <div className="grid gap-2">
        <button
          type="button"
          onClick={() => setPreset('lateral')}
          className={`flex min-h-14 items-center gap-3 border px-3 text-left text-[10px] font-black uppercase tracking-[0.12em] ${mode === 'lateral' ? 'border-red-600 bg-red-600 text-white' : 'border-white/10 bg-white/5 text-zinc-300'}`}
        >
          <PanelRight size={17} />
          <span>
            Tabela lateral
            <small className="mt-1 block text-[9px] tracking-[0.08em] opacity-70">Imagem grande + tabela na direita</small>
          </span>
        </button>

        <button
          type="button"
          onClick={() => setPreset('duplo-inferior')}
          className={`flex min-h-14 items-center gap-3 border px-3 text-left text-[10px] font-black uppercase tracking-[0.12em] ${mode === 'duplo-inferior' ? 'border-red-600 bg-red-600 text-white' : 'border-white/10 bg-white/5 text-zinc-300'}`}
        >
          <Columns3 size={17} />
          <span>
            2 blocos embaixo
            <small className="mt-1 block text-[9px] tracking-[0.08em] opacity-70">Imagem superior + tabela dividida</small>
          </span>
        </button>
      </div>

    </div>
  )
}
