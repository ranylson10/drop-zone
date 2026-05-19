'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Loader2, MonitorUp, Plus, Save, Gamepad2 } from 'lucide-react'

function criarId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export default function StreamTestePage() {
  const [streamId, setStreamId] = useState(criarId())
  const [nomeEquipe, setNomeEquipe] = useState('ALOE')
  const [logoUrl, setLogoUrl] = useState('')
  const [salvando, setSalvando] = useState(false)

  const origem = typeof window !== 'undefined' ? window.location.origin : ''
  const links = useMemo(() => ({
    control: `${origem}/stream/control/${streamId}`,
    overlay: `${origem}/stream/overlay/${streamId}`,
  }), [origem, streamId])

  async function salvar() {
    if (!nomeEquipe.trim()) {
      alert('Digite o nome da equipe')
      return
    }

    setSalvando(true)

    const { error } = await supabase.from('stream_overlay_test').upsert({
      id: streamId,
      nome_equipe: nomeEquipe.trim(),
      logo_url: logoUrl.trim() || null,
      visivel: true,
      updated_at: new Date().toISOString(),
    })

    setSalvando(false)

    if (error) {
      console.error(error)
      alert(`Erro ao salvar: ${error.message}`)
      return
    }

    alert('Overlay criada. Cole o link da overlay no OBS como Browser Source.')
  }

  async function copiar(texto: string) {
    await navigator.clipboard.writeText(texto)
    alert('Link copiado')
  }

  return (
    <main className="min-h-screen bg-[#f5f7fb] px-5 py-8 text-[#071733]">
      <section className="mx-auto max-w-5xl border border-zinc-200 bg-white p-6">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-[11px] font-black uppercase tracking-[0.22em] text-red-600">Drop Zone Stream</div>
            <h1 className="mt-2 text-2xl font-black uppercase tracking-tight">Teste de overlay OBS</h1>
            <p className="mt-2 text-sm font-semibold text-zinc-500">Crie uma overlay simples com nome e logo de uma equipe.</p>
          </div>

          <button type="button" onClick={() => setStreamId(criarId())} className="inline-flex h-11 items-center justify-center gap-2 border border-zinc-200 bg-white px-4 text-[11px] font-black uppercase tracking-[0.16em] hover:bg-zinc-50">
            <Plus size={15} /> Novo teste
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <label className="block">
            <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">Nome da equipe</span>
            <input value={nomeEquipe} onChange={(e) => setNomeEquipe(e.target.value)} placeholder="Ex: ALOE" className="h-12 w-full border border-zinc-200 bg-white px-4 text-sm font-bold outline-none focus:border-red-600" />
          </label>

          <label className="block">
            <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">URL da logo</span>
            <input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="Cole a URL da imagem" className="h-12 w-full border border-zinc-200 bg-white px-4 text-sm font-bold outline-none focus:border-red-600" />
          </label>

          <button type="button" onClick={salvar} disabled={salvando} className="inline-flex h-12 items-center justify-center gap-2 border border-red-600 bg-red-600 px-6 text-[11px] font-black uppercase tracking-[0.16em] text-white disabled:opacity-60">
            {salvando ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Salvar
          </button>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="border border-zinc-200 bg-[#f8fafc] p-4">
            <div className="mb-3 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.16em]"><Gamepad2 size={16} /> Link do controlador</div>
            <div className="break-all border border-zinc-200 bg-white p-3 text-xs font-semibold text-zinc-600">{links.control}</div>
            <div className="mt-3 flex gap-2">
              <Link href={`/stream/control/${streamId}`} target="_blank" className="inline-flex h-10 items-center justify-center border border-zinc-200 bg-white px-4 text-[10px] font-black uppercase tracking-[0.14em]">Abrir</Link>
              <button onClick={() => copiar(links.control)} className="inline-flex h-10 items-center justify-center border border-zinc-200 bg-white px-4 text-[10px] font-black uppercase tracking-[0.14em]">Copiar</button>
            </div>
          </div>

          <div className="border border-zinc-200 bg-[#f8fafc] p-4">
            <div className="mb-3 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.16em]"><MonitorUp size={16} /> Link da overlay OBS</div>
            <div className="break-all border border-zinc-200 bg-white p-3 text-xs font-semibold text-zinc-600">{links.overlay}</div>
            <div className="mt-3 flex gap-2">
              <Link href={`/stream/overlay/${streamId}`} target="_blank" className="inline-flex h-10 items-center justify-center border border-zinc-200 bg-white px-4 text-[10px] font-black uppercase tracking-[0.14em]">Abrir</Link>
              <button onClick={() => copiar(links.overlay)} className="inline-flex h-10 items-center justify-center border border-zinc-200 bg-white px-4 text-[10px] font-black uppercase tracking-[0.14em]">Copiar</button>
            </div>
          </div>
        </div>

        <div className="mt-6 border border-blue-200 bg-blue-50 p-4 text-sm font-semibold text-blue-950">
          No OBS: Browser Source → cole o link da overlay → largura 1920, altura 1080.
        </div>
      </section>
    </main>
  )
}
