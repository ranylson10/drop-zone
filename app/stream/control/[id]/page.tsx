'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Eye, EyeOff, Loader2, MonitorUp, RefreshCw, Save } from 'lucide-react'

type EquipeOption = {
  campeonatoEquipeId: string
  nome: string
  tag: string | null
  logoUrl: string | null
  origem: string
}

type OverlayState = {
  id: string
  campeonato_equipe_id: string | null
  nome_equipe: string
  tag_equipe: string | null
  logo_url: string | null
  visivel: boolean
  updated_at?: string | null
}

function getEquipeNome(item: any) {
  return item?.equipes?.nome || item?.equipe_avulsa?.nome || item?.nome_exibicao || item?.nome || `Equipe ${String(item?.id || '').slice(0, 6)}`
}

function getEquipeTag(item: any) {
  return item?.equipes?.tag || item?.equipe_avulsa?.tag || null
}

function getEquipeLogo(item: any) {
  return item?.equipes?.logo_url || item?.equipe_avulsa?.logo_url || null
}

export default function StreamControlPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id

  const [equipes, setEquipes] = useState<EquipeOption[]>([])
  const [equipeSelecionadaId, setEquipeSelecionadaId] = useState('')
  const [visivel, setVisivel] = useState(true)
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)

  const origem = typeof window !== 'undefined' ? window.location.origin : ''
  const overlayUrl = `${origem}/stream/overlay/${id}`

  const equipeSelecionada = useMemo(() => {
    return equipes.find((item) => item.campeonatoEquipeId === equipeSelecionadaId) || null
  }, [equipes, equipeSelecionadaId])

  const carregarEquipes = useCallback(async () => {
    const { data, error } = await supabase
      .from('campeonato_equipes')
      .select(`
        id,
        nome_exibicao,
        tipo_origem,
        created_at,
        equipes ( nome, tag, logo_url ),
        equipe_avulsa:equipes_avulsas_campeonato ( nome, tag, logo_url )
      `)
      .order('created_at', { ascending: false })
      .limit(200)

    if (error) {
      console.error(error)
      alert(`Erro ao carregar equipes: ${error.message}`)
      return []
    }

    return (data || []).map((item: any) => ({
      campeonatoEquipeId: item.id,
      nome: getEquipeNome(item),
      tag: getEquipeTag(item),
      logoUrl: getEquipeLogo(item),
      origem: item.tipo_origem || 'campeonato',
    })) as EquipeOption[]
  }, [])

  const carregar = useCallback(async () => {
    if (!id) return

    setLoading(true)

    const opcoes = await carregarEquipes()
    setEquipes(opcoes)

    const { data, error } = await supabase
      .from('stream_overlay_test')
      .select('id, campeonato_equipe_id, nome_equipe, tag_equipe, logo_url, visivel, updated_at')
      .eq('id', id)
      .maybeSingle()

    if (error) {
      setLoading(false)
      console.error(error)
      alert(`Erro ao carregar overlay: ${error.message}`)
      return
    }

    if (!data) {
      const primeira = opcoes[0] || null

      const { data: criado, error: createError } = await supabase
        .from('stream_overlay_test')
        .insert({
          id,
          campeonato_equipe_id: primeira?.campeonatoEquipeId || null,
          nome_equipe: primeira?.nome || 'Equipe',
          tag_equipe: primeira?.tag || null,
          logo_url: primeira?.logoUrl || null,
          visivel: true,
          updated_at: new Date().toISOString(),
        })
        .select('id, campeonato_equipe_id, nome_equipe, tag_equipe, logo_url, visivel, updated_at')
        .single()

      setLoading(false)

      if (createError) {
        console.error(createError)
        alert(`Erro ao criar overlay: ${createError.message}`)
        return
      }

      setEquipeSelecionadaId(criado.campeonato_equipe_id || '')
      setVisivel(Boolean(criado.visivel))
      return
    }

    setEquipeSelecionadaId(data.campeonato_equipe_id || '')
    setVisivel(Boolean(data.visivel))
    setLoading(false)
  }, [id, carregarEquipes])

  useEffect(() => {
    carregar()
  }, [carregar])

  async function salvar(parcial?: Partial<OverlayState>) {
    if (!id) return

    const equipe = equipeSelecionada
    if (!equipe && !parcial?.visivel) return

    setSalvando(true)

    const payload = {
      campeonato_equipe_id: parcial?.campeonato_equipe_id ?? equipe?.campeonatoEquipeId ?? null,
      nome_equipe: parcial?.nome_equipe ?? equipe?.nome ?? 'Equipe',
      tag_equipe: parcial?.tag_equipe ?? equipe?.tag ?? null,
      logo_url: parcial?.logo_url ?? equipe?.logoUrl ?? null,
      visivel: parcial?.visivel ?? visivel,
      updated_at: new Date().toISOString(),
    }

    const { error } = await supabase
      .from('stream_overlay_test')
      .update(payload)
      .eq('id', id)

    setSalvando(false)

    if (error) {
      console.error(error)
      alert(`Erro ao salvar: ${error.message}`)
      return
    }

    await carregar()
  }

  async function selecionarEquipe(campeonatoEquipeId: string) {
    setEquipeSelecionadaId(campeonatoEquipeId)
    const equipe = equipes.find((item) => item.campeonatoEquipeId === campeonatoEquipeId)
    if (!equipe || !id) return

    setSalvando(true)

    const { error } = await supabase
      .from('stream_overlay_test')
      .update({
        campeonato_equipe_id: equipe.campeonatoEquipeId,
        nome_equipe: equipe.nome,
        tag_equipe: equipe.tag,
        logo_url: equipe.logoUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    setSalvando(false)

    if (error) {
      console.error(error)
      alert(`Erro ao selecionar equipe: ${error.message}`)
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
            <h1 className="mt-2 text-2xl font-black uppercase">Overlay de equipe</h1>
          </div>

          <div className="flex gap-2">
            <button onClick={carregar} className="inline-flex h-10 items-center justify-center gap-2 border border-white/10 bg-white/5 px-3 text-[10px] font-black uppercase tracking-[0.14em]"><RefreshCw size={14} /> Atualizar</button>
            <Link href={`/stream/overlay/${id}`} target="_blank" className="inline-flex h-10 items-center justify-center gap-2 border border-white/10 bg-white/5 px-3 text-[10px] font-black uppercase tracking-[0.14em]"><MonitorUp size={14} /> Overlay</Link>
          </div>
        </div>

        <label className="block">
          <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">Selecionar equipe do site</span>
          <select value={equipeSelecionadaId} onChange={(e) => selecionarEquipe(e.target.value)} className="h-12 w-full border border-white/10 bg-[#0b1220] px-4 text-sm font-bold outline-none focus:border-red-500">
            <option value="">Selecione uma equipe</option>
            {equipes.map((equipe) => (
              <option key={equipe.campeonatoEquipeId} value={equipe.campeonatoEquipeId}>
                {equipe.nome}{equipe.tag ? ` • ${equipe.tag}` : ''}
              </option>
            ))}
          </select>
        </label>

        <div className="mt-5 flex items-center gap-4 border border-white/10 bg-[#0b1220] p-4">
          <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white">
            {equipeSelecionada?.logoUrl ? (
              <img src={equipeSelecionada.logoUrl} alt={equipeSelecionada.nome} className="h-full w-full object-contain" />
            ) : (
              <span className="text-3xl font-black text-[#081120]">{equipeSelecionada?.nome?.charAt(0)?.toUpperCase() || 'E'}</span>
            )}
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">Preview</div>
            <div className="text-3xl font-black uppercase">{equipeSelecionada?.nome || 'Equipe'}</div>
            <div className="text-sm font-bold uppercase text-zinc-400">{equipeSelecionada?.tag || 'Sem tag'}</div>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 md:flex-row">
          <button onClick={() => salvar()} disabled={salvando} className="inline-flex h-12 flex-1 items-center justify-center gap-2 border border-red-600 bg-red-600 px-5 text-[11px] font-black uppercase tracking-[0.16em] text-white disabled:opacity-60">
            {salvando ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Salvar equipe
          </button>

          <button onClick={alternarVisibilidade} disabled={salvando} className="inline-flex h-12 flex-1 items-center justify-center gap-2 border border-white/10 bg-white/5 px-5 text-[11px] font-black uppercase tracking-[0.16em] text-white disabled:opacity-60">
            {visivel ? <EyeOff size={16} /> : <Eye size={16} />} {visivel ? 'Sumir overlay' : 'Aparecer overlay'}
          </button>
        </div>

        <div className="mt-5 border border-white/10 bg-[#0b1220] p-4">
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">Link da overlay para OBS</div>
          <div className="mt-2 break-all text-sm font-semibold text-zinc-200">{overlayUrl}</div>
        </div>
      </section>
    </main>
  )
}
