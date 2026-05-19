'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Eye, EyeOff, Loader2, Minus, MonitorUp, Plus, RefreshCw, RotateCcw, Save } from 'lucide-react'

type EquipeOption = {
  campeonatoEquipeId: string
  nome: string
  tag: string | null
  logoUrl: string | null
}

type Projeto = {
  id: string
  campeonato_id: string | null
  nome: string
  stream_key: string
}

type State = {
  id: string
  project_id: string
  campeonato_equipe_a_id: string | null
  campeonato_equipe_b_id: string | null
  nome_a: string | null
  nome_b: string | null
  tag_a: string | null
  tag_b: string | null
  logo_a: string | null
  logo_b: string | null
  score_a: number
  score_b: number
  md: number
  rodada: string | null
  status: string
  visivel: boolean
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

export default function StreamStudioPage() {
  const params = useParams<{ key: string }>()
  const streamKey = params?.key

  const [projeto, setProjeto] = useState<Projeto | null>(null)
  const [state, setState] = useState<State | null>(null)
  const [equipes, setEquipes] = useState<EquipeOption[]>([])
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)

  const origem = typeof window !== 'undefined' ? window.location.origin : ''
  const overlayUrl = `${origem}/stream/overlay/${streamKey}/scoreboard`

  const equipeA = useMemo(() => equipes.find((eq) => eq.campeonatoEquipeId === state?.campeonato_equipe_a_id) || null, [equipes, state])
  const equipeB = useMemo(() => equipes.find((eq) => eq.campeonatoEquipeId === state?.campeonato_equipe_b_id) || null, [equipes, state])

  const carregar = useCallback(async () => {
    if (!streamKey) return
    setLoading(true)

    const { data: proj, error: projError } = await supabase
      .from('stream_projects')
      .select('id, campeonato_id, nome, stream_key')
      .eq('stream_key', streamKey)
      .maybeSingle()

    if (projError || !proj) {
      setLoading(false)
      alert('Projeto não encontrado')
      return
    }

    setProjeto(proj as Projeto)

    const { data: equipesData } = await supabase
      .from('campeonato_equipes')
      .select(`
        id,
        nome_exibicao,
        tipo_origem,
        created_at,
        equipes ( nome, tag, logo_url ),
        equipe_avulsa:equipes_avulsas_campeonato ( nome, tag, logo_url )
      `)
      .eq('campeonato_id', proj.campeonato_id)
      .order('created_at', { ascending: true })

    const opts = (equipesData || []).map((item: any) => ({
      campeonatoEquipeId: item.id,
      nome: getEquipeNome(item),
      tag: getEquipeTag(item),
      logoUrl: getEquipeLogo(item),
    }))

    setEquipes(opts)

    const { data: scoreState, error: scoreError } = await supabase
      .from('stream_scoreboard_state')
      .select('*')
      .eq('project_id', proj.id)
      .maybeSingle()

    if (scoreError) {
      setLoading(false)
      alert(`Erro ao carregar scoreboard: ${scoreError.message}`)
      return
    }

    if (!scoreState) {
      const { data: criado } = await supabase
        .from('stream_scoreboard_state')
        .insert({
          project_id: proj.id,
          nome_a: opts[0]?.nome || 'Equipe A',
          tag_a: opts[0]?.tag || 'A',
          logo_a: opts[0]?.logoUrl || null,
          campeonato_equipe_a_id: opts[0]?.campeonatoEquipeId || null,
          nome_b: opts[1]?.nome || 'Equipe B',
          tag_b: opts[1]?.tag || 'B',
          logo_b: opts[1]?.logoUrl || null,
          campeonato_equipe_b_id: opts[1]?.campeonatoEquipeId || null,
          md: 1,
          rodada: 'Rodada 1',
          status: 'pre_jogo',
          visivel: true,
        })
        .select('*')
        .single()

      setState(criado as State)
    } else {
      setState(scoreState as State)
    }

    setLoading(false)
  }, [streamKey])

  useEffect(() => {
    carregar()
  }, [carregar])

  async function atualizar(payload: Partial<State>) {
    if (!state) return

    setSalvando(true)
    const { error } = await supabase
      .from('stream_scoreboard_state')
      .update({
        ...payload,
        updated_at: new Date().toISOString(),
      })
      .eq('id', state.id)

    setSalvando(false)

    if (error) {
      alert(`Erro ao atualizar: ${error.message}`)
      return
    }

    setState({ ...state, ...payload })
  }

  function selecionarEquipe(lado: 'a' | 'b', id: string) {
    const equipe = equipes.find((eq) => eq.campeonatoEquipeId === id)
    if (!equipe) return

    if (lado === 'a') {
      atualizar({
        campeonato_equipe_a_id: equipe.campeonatoEquipeId,
        nome_a: equipe.nome,
        tag_a: equipe.tag,
        logo_a: equipe.logoUrl,
      })
    } else {
      atualizar({
        campeonato_equipe_b_id: equipe.campeonatoEquipeId,
        nome_b: equipe.nome,
        tag_b: equipe.tag,
        logo_b: equipe.logoUrl,
      })
    }
  }

  if (loading || !state) {
    return <main className="flex min-h-screen items-center justify-center bg-[#080d16] text-white"><Loader2 className="animate-spin" /></main>
  }

  return (
    <main className="min-h-screen bg-[#080d16] p-5 text-white">
      <section className="mx-auto max-w-6xl">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-[11px] font-black uppercase tracking-[0.22em] text-red-500">Stream Studio</div>
            <h1 className="mt-2 text-2xl font-black uppercase">{projeto?.nome || 'Scoreboard'}</h1>
            <div className="mt-1 text-xs font-semibold text-zinc-400">Chave: {streamKey}</div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button onClick={carregar} className="inline-flex h-10 items-center gap-2 border border-white/10 bg-white/5 px-3 text-[10px] font-black uppercase tracking-[0.14em]"><RefreshCw size={14} /> Atualizar</button>
            <Link href={`/stream/overlay/${streamKey}/scoreboard`} target="_blank" className="inline-flex h-10 items-center gap-2 border border-red-600 bg-red-600 px-3 text-[10px] font-black uppercase tracking-[0.14em]"><MonitorUp size={14} /> Overlay OBS</Link>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
          <div className="border border-white/10 bg-[#111827] p-5">
            <div className="mb-4 text-[11px] font-black uppercase tracking-[0.18em] text-zinc-400">Scoreboard</div>

            <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-end">
              <label className="block">
                <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">Equipe A</span>
                <select value={state.campeonato_equipe_a_id || ''} onChange={(e) => selecionarEquipe('a', e.target.value)} className="h-12 w-full border border-white/10 bg-[#0b1220] px-4 text-sm font-bold outline-none">
                  <option value="">Selecione</option>
                  {equipes.map((equipe) => <option key={equipe.campeonatoEquipeId} value={equipe.campeonatoEquipeId}>{equipe.nome}{equipe.tag ? ` • ${equipe.tag}` : ''}</option>)}
                </select>
              </label>

              <div className="pb-3 text-center text-3xl font-black">VS</div>

              <label className="block">
                <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">Equipe B</span>
                <select value={state.campeonato_equipe_b_id || ''} onChange={(e) => selecionarEquipe('b', e.target.value)} className="h-12 w-full border border-white/10 bg-[#0b1220] px-4 text-sm font-bold outline-none">
                  <option value="">Selecione</option>
                  {equipes.map((equipe) => <option key={equipe.campeonatoEquipeId} value={equipe.campeonatoEquipeId}>{equipe.nome}{equipe.tag ? ` • ${equipe.tag}` : ''}</option>)}
                </select>
              </label>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="border border-white/10 bg-[#0b1220] p-4">
                <div className="mb-3 text-sm font-black uppercase">{state.nome_a || equipeA?.nome || 'Equipe A'}</div>
                <div className="flex items-center justify-between">
                  <button onClick={() => atualizar({ score_a: Math.max(0, Number(state.score_a || 0) - 1) })} className="h-12 w-12 border border-white/10 bg-white/5"><Minus className="mx-auto" /></button>
                  <div className="text-6xl font-black">{state.score_a}</div>
                  <button onClick={() => atualizar({ score_a: Number(state.score_a || 0) + 1 })} className="h-12 w-12 border border-white/10 bg-white/5"><Plus className="mx-auto" /></button>
                </div>
              </div>

              <div className="border border-white/10 bg-[#0b1220] p-4">
                <div className="mb-3 text-sm font-black uppercase">{state.nome_b || equipeB?.nome || 'Equipe B'}</div>
                <div className="flex items-center justify-between">
                  <button onClick={() => atualizar({ score_b: Math.max(0, Number(state.score_b || 0) - 1) })} className="h-12 w-12 border border-white/10 bg-white/5"><Minus className="mx-auto" /></button>
                  <div className="text-6xl font-black">{state.score_b}</div>
                  <button onClick={() => atualizar({ score_b: Number(state.score_b || 0) + 1 })} className="h-12 w-12 border border-white/10 bg-white/5"><Plus className="mx-auto" /></button>
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <label className="block">
                <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">Rodada</span>
                <input value={state.rodada || ''} onChange={(e) => atualizar({ rodada: e.target.value })} className="h-11 w-full border border-white/10 bg-[#0b1220] px-4 text-sm font-bold outline-none" />
              </label>

              <label className="block">
                <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">MD</span>
                <select value={state.md || 1} onChange={(e) => atualizar({ md: Number(e.target.value) })} className="h-11 w-full border border-white/10 bg-[#0b1220] px-4 text-sm font-bold outline-none">
                  <option value={1}>MD1</option>
                  <option value={3}>MD3</option>
                  <option value={5}>MD5</option>
                  <option value={7}>MD7</option>
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">Status</span>
                <select value={state.status} onChange={(e) => atualizar({ status: e.target.value })} className="h-11 w-full border border-white/10 bg-[#0b1220] px-4 text-sm font-bold outline-none">
                  <option value="pre_jogo">Pré-jogo</option>
                  <option value="ao_vivo">Ao vivo</option>
                  <option value="intervalo">Intervalo</option>
                  <option value="finalizado">Finalizado</option>
                </select>
              </label>
            </div>

            <div className="mt-5 flex flex-col gap-3 md:flex-row">
              <button onClick={() => atualizar({ score_a: 0, score_b: 0 })} className="inline-flex h-12 flex-1 items-center justify-center gap-2 border border-white/10 bg-white/5 px-5 text-[11px] font-black uppercase tracking-[0.16em]">
                <RotateCcw size={15} />
                Resetar placar
              </button>

              <button onClick={() => atualizar({ visivel: !state.visivel })} className="inline-flex h-12 flex-1 items-center justify-center gap-2 border border-red-600 bg-red-600 px-5 text-[11px] font-black uppercase tracking-[0.16em]">
                {state.visivel ? <EyeOff size={16} /> : <Eye size={16} />}
                {state.visivel ? 'Sumir overlay' : 'Aparecer overlay'}
              </button>
            </div>
          </div>

          <div className="border border-white/10 bg-[#111827] p-5">
            <div className="mb-4 text-[11px] font-black uppercase tracking-[0.18em] text-zinc-400">Preview</div>

            <div className="rounded-xl border border-white/10 bg-[#0b1220] p-4">
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-red-400">{state.rodada || 'Rodada'}</div>
              <div className="mt-4 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-lg font-black uppercase">{state.nome_a}</div>
                  <div className="text-xs font-bold uppercase text-zinc-400">{state.tag_a}</div>
                </div>
                <div className="text-4xl font-black">{state.score_a} x {state.score_b}</div>
                <div className="min-w-0 flex-1 text-right">
                  <div className="text-lg font-black uppercase">{state.nome_b}</div>
                  <div className="text-xs font-bold uppercase text-zinc-400">{state.tag_b}</div>
                </div>
              </div>
            </div>

            <div className="mt-5 border border-white/10 bg-[#0b1220] p-4">
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">Link da overlay</div>
              <div className="mt-2 break-all text-xs font-semibold text-zinc-300">{overlayUrl}</div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
