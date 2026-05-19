'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Loader2, Plus, Radio, Copy } from 'lucide-react'

type Campeonato = {
  id: string
  nome: string | null
}

type Projeto = {
  id: string
  campeonato_id: string | null
  nome: string
  stream_key: string
  ativo: boolean
}

export default function StreamProjectsPage() {
  const [campeonatos, setCampeonatos] = useState<Campeonato[]>([])
  const [projetos, setProjetos] = useState<Projeto[]>([])
  const [campeonatoId, setCampeonatoId] = useState('')
  const [nomeProjeto, setNomeProjeto] = useState('')
  const [loading, setLoading] = useState(true)
  const [criando, setCriando] = useState(false)

  async function carregar() {
    setLoading(true)

    const [campRes, projRes] = await Promise.all([
      supabase.from('campeonatos').select('id, nome').order('created_at', { ascending: false }).limit(80),
      supabase.from('stream_projects').select('id, campeonato_id, nome, stream_key, ativo').order('created_at', { ascending: false }),
    ])

    if (!campRes.error) setCampeonatos((campRes.data || []) as Campeonato[])
    if (!projRes.error) setProjetos((projRes.data || []) as Projeto[])

    setLoading(false)
  }

  useEffect(() => {
    carregar()
  }, [])

  async function criarProjeto() {
    if (!campeonatoId) {
      alert('Selecione um campeonato')
      return
    }

    const camp = campeonatos.find((item) => item.id === campeonatoId)

    setCriando(true)

    const { data, error } = await supabase
      .from('stream_projects')
      .insert({
        campeonato_id: campeonatoId,
        nome: nomeProjeto.trim() || `Transmissão - ${camp?.nome || 'Campeonato'}`,
        ativo: true,
      })
      .select('id, stream_key')
      .single()

    setCriando(false)

    if (error) {
      console.error(error)
      alert(`Erro ao criar projeto: ${error.message}`)
      return
    }

    await supabase
      .from('stream_scoreboard_state')
      .insert({
        project_id: data.id,
        nome_a: 'Equipe A',
        nome_b: 'Equipe B',
        tag_a: 'A',
        tag_b: 'B',
        score_a: 0,
        score_b: 0,
        md: 1,
        rodada: 'Rodada 1',
        status: 'pre_jogo',
        visivel: true,
      })

    setNomeProjeto('')
    setCampeonatoId('')
    await carregar()
  }

  async function copiar(texto: string) {
    await navigator.clipboard.writeText(texto)
    alert('Copiado')
  }

  return (
    <main className="min-h-screen bg-[#080d16] p-5 text-white">
      <section className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-[11px] font-black uppercase tracking-[0.24em] text-red-500">Stream Studio</div>
            <h1 className="mt-2 text-3xl font-black uppercase">Projetos de transmissão</h1>
            <p className="mt-2 text-sm font-semibold text-zinc-400">
              Gere uma chave por campeonato para o produtor usar no painel do OBS.
            </p>
          </div>
          <button onClick={carregar} className="h-11 border border-white/10 bg-white/5 px-4 text-[11px] font-black uppercase tracking-[0.16em]">
            Atualizar
          </button>
        </div>

        <div className="mb-6 border border-white/10 bg-[#111827] p-5">
          <div className="mb-4 text-[11px] font-black uppercase tracking-[0.18em] text-zinc-400">Novo projeto</div>
          <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
            <select value={campeonatoId} onChange={(e) => setCampeonatoId(e.target.value)} className="h-12 border border-white/10 bg-[#0b1220] px-4 text-sm font-bold outline-none">
              <option value="">Selecione o campeonato</option>
              {campeonatos.map((camp) => (
                <option key={camp.id} value={camp.id}>{camp.nome || camp.id}</option>
              ))}
            </select>
            <input value={nomeProjeto} onChange={(e) => setNomeProjeto(e.target.value)} placeholder="Nome do projeto, opcional" className="h-12 border border-white/10 bg-[#0b1220] px-4 text-sm font-bold outline-none" />
            <button onClick={criarProjeto} disabled={criando} className="inline-flex h-12 items-center justify-center gap-2 border border-red-600 bg-red-600 px-5 text-[11px] font-black uppercase tracking-[0.16em] disabled:opacity-60">
              {criando ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
              Criar
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex h-40 items-center justify-center"><Loader2 className="animate-spin" /></div>
        ) : (
          <div className="grid gap-4">
            {projetos.map((projeto) => (
              <div key={projeto.id} className="border border-white/10 bg-[#111827] p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-xl font-black uppercase">
                      <Radio size={19} className="text-red-500" />
                      {projeto.nome}
                    </div>
                    <div className="mt-2 break-all text-xs font-semibold text-zinc-400">
                      Chave: {projeto.stream_key}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => copiar(projeto.stream_key)} className="inline-flex h-10 items-center gap-2 border border-white/10 bg-white/5 px-3 text-[10px] font-black uppercase tracking-[0.14em]">
                      <Copy size={14} />
                      Copiar chave
                    </button>
                    <Link href={`/stream/studio/${projeto.stream_key}`} target="_blank" className="inline-flex h-10 items-center border border-white/10 bg-white/5 px-3 text-[10px] font-black uppercase tracking-[0.14em]">
                      Abrir Studio
                    </Link>
                    <Link href={`/stream/overlay/${projeto.stream_key}/scoreboard`} target="_blank" className="inline-flex h-10 items-center border border-red-600 bg-red-600 px-3 text-[10px] font-black uppercase tracking-[0.14em]">
                      Overlay OBS
                    </Link>
                  </div>
                </div>
              </div>
            ))}

            {projetos.length === 0 ? (
              <div className="border border-dashed border-white/10 p-10 text-center text-sm font-semibold text-zinc-400">
                Nenhum projeto criado ainda.
              </div>
            ) : null}
          </div>
        )}
      </section>
    </main>
  )
}
