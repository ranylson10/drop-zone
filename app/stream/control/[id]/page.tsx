'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Eye, EyeOff, Loader2, MonitorUp, RefreshCw, Save } from 'lucide-react'

type OverlayState = {
  id: string
  nome_equipe: string
  logo_url: string | null
  visivel: boolean
  updated_at?: string | null
}

export default function StreamControlPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id
  const [nomeEquipe, setNomeEquipe] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [visivel, setVisivel] = useState(true)
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)

  const origem = typeof window !== 'undefined' ? window.location.origin : ''
  const overlayUrl = `${origem}/stream/overlay/${id}`

  const carregar = useCallback(async () => {
    if (!id) return
    setLoading(true)

    const { data, error } = await supabase
      .from('stream_overlay_test')
      .select('id, nome_equipe, logo_url, visivel, updated_at')
      .eq('id', id)
      .maybeSingle()

    if (error) {
      setLoading(false)
      console.error(error)
      alert(`Erro ao carregar: ${error.message}`)
      return
    }

    if (!data) {
      const { data: criado, error: createError } = await supabase
        .from('stream_overlay_test')
        .insert({ id, nome_equipe: 'ALOE', logo_url: null, visivel: true, updated_at: new Date().toISOString() })
        .select('id, nome_equipe, logo_url, visivel, updated_at')
        .single()

      setLoading(false)

      if (createError) {
        console.error(createError)
        alert(`Erro ao criar: ${createError.message}`)
        return
      }

      setNomeEquipe(criado.nome_equipe)
      setLogoUrl(criado.logo_url || '')
      setVisivel(Boolean(criado.visivel))
      return
    }

    setNomeEquipe(data.nome_equipe || '')
    setLogoUrl(data.logo_url || '')
    setVisivel(Boolean(data.visivel))
    setLoading(false)
  }, [id])

  useEffect(() => {
    carregar()
  }, [carregar])

  async function salvar(parcial?: Partial<OverlayState>) {
    if (!id) return
    setSalvando(true)

    const payload = {
      nome_equipe: parcial?.nome_equipe ?? nomeEquipe.trim(),
      logo_url: parcial?.logo_url ?? (logoUrl.trim() || null),
      visivel: parcial?.visivel ?? visivel,
      updated_at: new Date().toISOString(),
    }

    const { error } = await supabase.from('stream_overlay_test').update(payload).eq('id', id)
    setSalvando(false)

    if (error) {
      console.error(error)
      alert(`Erro ao salvar: ${error.message}`)
      return
    }

    await carregar()
  }

  async function alternarVisibilidade() {
    const novoValor = !visivel
    setVisivel(novoValor)
    await salvar({ visivel: novoValor })
  }

  if (loading) {
    return <main className="flex min-h-screen items-center justify-center bg-[#080d16] text-white"><Loader2 className="animate-spin" /></main>
  }

  return (
    <main className="min-h-screen bg-[#080d16] p-5 text-white">
      <section className="mx-auto max-w-3xl border border-white/10 bg-[#111827] p-5">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-[11px] font-black uppercase tracking-[0.22em] text-red-500">Controlador</div>
            <h1 className="mt-2 text-2xl font-black uppercase">Overlay da equipe</h1>
          </div>

          <div className="flex gap-2">
            <button onClick={carregar} className="inline-flex h-10 items-center justify-center gap-2 border border-white/10 bg-white/5 px-3 text-[10px] font-black uppercase tracking-[0.14em]"><RefreshCw size={14} /> Atualizar</button>
            <Link href={`/stream/overlay/${id}`} target="_blank" className="inline-flex h-10 items-center justify-center gap-2 border border-white/10 bg-white/5 px-3 text-[10px] font-black uppercase tracking-[0.14em]"><MonitorUp size={14} /> Overlay</Link>
          </div>
        </div>

        <div className="grid gap-4">
          <label className="block">
            <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">Nome da equipe</span>
            <input value={nomeEquipe} onChange={(e) => setNomeEquipe(e.target.value)} className="h-12 w-full border border-white/10 bg-[#0b1220] px-4 text-sm font-bold outline-none focus:border-red-500" />
          </label>

          <label className="block">
            <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">URL da logo</span>
            <input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://..." className="h-12 w-full border border-white/10 bg-[#0b1220] px-4 text-sm font-bold outline-none focus:border-red-500" />
          </label>

          <div className="flex flex-col gap-3 md:flex-row">
            <button onClick={() => salvar()} disabled={salvando} className="inline-flex h-12 flex-1 items-center justify-center gap-2 border border-red-600 bg-red-600 px-5 text-[11px] font-black uppercase tracking-[0.16em] text-white disabled:opacity-60">
              {salvando ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Salvar dados
            </button>

            <button onClick={alternarVisibilidade} disabled={salvando} className="inline-flex h-12 flex-1 items-center justify-center gap-2 border border-white/10 bg-white/5 px-5 text-[11px] font-black uppercase tracking-[0.16em] text-white disabled:opacity-60">
              {visivel ? <EyeOff size={16} /> : <Eye size={16} />} {visivel ? 'Sumir overlay' : 'Aparecer overlay'}
            </button>
          </div>
        </div>

        <div className="mt-5 border border-white/10 bg-[#0b1220] p-4">
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">Link da overlay para OBS</div>
          <div className="mt-2 break-all text-sm font-semibold text-zinc-200">{overlayUrl}</div>
        </div>
      </section>
    </main>
  )
}
