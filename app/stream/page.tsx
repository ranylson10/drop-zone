'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { MonitorUp, Gamepad2, Plus } from 'lucide-react'

function criarId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export default function StreamTestePage() {
  const [streamId, setStreamId] = useState(criarId())
  const origem = typeof window !== 'undefined' ? window.location.origin : ''

  const links = useMemo(() => ({
    control: `${origem}/stream/control/${streamId}`,
    overlay: `${origem}/stream/overlay/${streamId}`,
  }), [origem, streamId])

  async function copiar(texto: string) {
    await navigator.clipboard.writeText(texto)
    alert('Link copiado')
  }

  return (
    <main className="min-h-screen bg-[#080d16] px-5 py-8 text-white">
      <section className="mx-auto max-w-5xl border border-white/10 bg-[#111827] p-6">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-[11px] font-black uppercase tracking-[0.22em] text-red-500">Drop Zone Stream</div>
            <h1 className="mt-2 text-2xl font-black uppercase tracking-tight">Teste de overlay OBS</h1>
            <p className="mt-2 text-sm font-semibold text-zinc-400">
              Crie um teste e escolha a equipe real no controlador.
            </p>
          </div>

          <button type="button" onClick={() => setStreamId(criarId())} className="inline-flex h-11 items-center justify-center gap-2 border border-white/10 bg-white/5 px-4 text-[11px] font-black uppercase tracking-[0.16em] hover:bg-white/10">
            <Plus size={15} /> Novo teste
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="border border-white/10 bg-[#0b1220] p-4">
            <div className="mb-3 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.16em]">
              <Gamepad2 size={16} /> Link do controlador
            </div>
            <div className="break-all border border-white/10 bg-[#080d16] p-3 text-xs font-semibold text-zinc-300">{links.control}</div>
            <div className="mt-3 flex gap-2">
              <Link href={`/stream/control/${streamId}`} target="_blank" className="inline-flex h-10 items-center justify-center border border-white/10 bg-white/5 px-4 text-[10px] font-black uppercase tracking-[0.14em]">Abrir</Link>
              <button onClick={() => copiar(links.control)} className="inline-flex h-10 items-center justify-center border border-white/10 bg-white/5 px-4 text-[10px] font-black uppercase tracking-[0.14em]">Copiar</button>
            </div>
          </div>

          <div className="border border-white/10 bg-[#0b1220] p-4">
            <div className="mb-3 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.16em]">
              <MonitorUp size={16} /> Link da overlay OBS
            </div>
            <div className="break-all border border-white/10 bg-[#080d16] p-3 text-xs font-semibold text-zinc-300">{links.overlay}</div>
            <div className="mt-3 flex gap-2">
              <Link href={`/stream/overlay/${streamId}`} target="_blank" className="inline-flex h-10 items-center justify-center border border-white/10 bg-white/5 px-4 text-[10px] font-black uppercase tracking-[0.14em]">Abrir</Link>
              <button onClick={() => copiar(links.overlay)} className="inline-flex h-10 items-center justify-center border border-white/10 bg-white/5 px-4 text-[10px] font-black uppercase tracking-[0.14em]">Copiar</button>
            </div>
          </div>
        </div>

        <div className="mt-6 border border-blue-500/30 bg-blue-500/10 p-4 text-sm font-semibold text-blue-100">
          No OBS: Browser Source → cole o link da overlay → largura 1920, altura 1080.
        </div>
      </section>
    </main>
  )
}
