'use client'

import { Columns3, PanelRight } from 'lucide-react'
import type { StreamOverlayEditorProps } from '../types'

export default function BooyahsDiaOverlayEditor({ config, onChange }: StreamOverlayEditorProps) {
  const cfg = (config.booyahsDia || {}) as Record<string, unknown>
  const mode = String(cfg.mode || 'cards')

  return (
    <div className="space-y-4 border border-white/10 bg-[#0b1220] p-3">
      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-300">Booyahs do Dia / modo rapido</div>

      <div className="grid gap-2">
        <button
          type="button"
          onClick={() => onChange('booyahsDia.mode', 'cards')}
          className={`flex min-h-14 w-full items-center gap-3 border px-3 text-left text-[10px] font-black uppercase tracking-[0.12em] ${mode === 'cards' ? 'border-red-600 bg-red-600 text-white' : 'border-white/10 bg-white/5 text-zinc-300'}`}
        >
          <Columns3 size={17} />
          <span>
            Cards horizontais
            <small className="mt-1 block text-[9px] tracking-[0.08em] opacity-70">Imagem superior + cards centralizados</small>
          </span>
        </button>

        <button
          type="button"
          onClick={() => onChange('booyahsDia.mode', 'vertical-list')}
          className={`flex min-h-14 w-full items-center gap-3 border px-3 text-left text-[10px] font-black uppercase tracking-[0.12em] ${mode === 'vertical-list' ? 'border-red-600 bg-red-600 text-white' : 'border-white/10 bg-white/5 text-zinc-300'}`}
        >
          <PanelRight size={17} />
          <span>
            Mapa vertical
            <small className="mt-1 block text-[9px] tracking-[0.08em] opacity-70">Imagem lateral + mapas em coluna</small>
          </span>
        </button>
      </div>
    </div>
  )
}
