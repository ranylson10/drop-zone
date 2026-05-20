'use client'

import { useEffect, useState } from 'react'
import { Loader2, Radio, Search } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import SumulaPartida from '@/app/campeonatos/[id]/components/SumulaPartida'

type StreamProject = {
  id: string
  nome: string
  stream_key: string
  campeonato_id: string
  campeonatos?: { nome?: string | null } | null
}

export default function StreamPontuadorPage() {
  const [chave, setChave] = useState('')
  const [project, setProject] = useState<StreamProject | null>(null)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    const keyFromUrl = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('key') : ''
    if (keyFromUrl) {
      setChave(keyFromUrl)
      void buscarProjeto(keyFromUrl)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function buscarProjeto(chaveBusca = chave) {
    const key = String(chaveBusca || '').trim()
    if (!key) {
      setErro('Informe a chave do campeonato.')
      setProject(null)
      return
    }

    setLoading(true)
    setErro('')

    const { data, error } = await supabase
      .from('stream_projects')
      .select('id, nome, stream_key, campeonato_id, campeonatos ( nome )')
      .eq('stream_key', key)
      .eq('ativo', true)
      .maybeSingle()

    setLoading(false)

    if (error || !data?.campeonato_id) {
      setErro('Chave invalida ou projeto sem campeonato vinculado.')
      setProject(null)
      return
    }

    setProject(data as StreamProject)
  }

  return (
    <main className="min-h-screen bg-[#080d16] p-4 text-white">
      <section className="mx-auto max-w-[1500px]">
        <div className="mb-4 border border-white/10 bg-[#111827] p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.22em] text-red-500">
                <Radio size={14} />
                Stream
              </div>
              <h1 className="mt-2 text-2xl font-black uppercase">Area do pontuador</h1>
              <p className="mt-1 text-xs font-semibold text-zinc-400">
                Use a chave do campeonato para pontuar a live. Atualizar live muda a overlay; Publicar site libera a pontuacao oficial.
              </p>
            </div>

            <div className="grid w-full gap-2 sm:grid-cols-[1fr_auto] lg:max-w-xl">
              <input
                value={chave}
                onChange={(event) => setChave(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') void buscarProjeto()
                }}
                placeholder="Cole a chave do campeonato"
                className="h-11 border border-white/10 bg-[#080d16] px-3 text-xs font-bold outline-none"
              />
              <button
                type="button"
                onClick={() => buscarProjeto()}
                disabled={loading}
                className="inline-flex h-11 items-center justify-center gap-2 border border-red-600 bg-red-600 px-4 text-[10px] font-black uppercase tracking-[0.14em] disabled:opacity-60"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                Entrar
              </button>
            </div>
          </div>

          {erro ? (
            <div className="mt-3 border border-amber-400/30 bg-amber-400/10 p-3 text-xs font-semibold text-amber-100">
              {erro}
            </div>
          ) : null}

          {project ? (
            <div className="mt-3 grid gap-2 border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs font-semibold text-emerald-50 md:grid-cols-3">
              <div>
                <span className="block text-[9px] font-black uppercase tracking-[0.18em] text-emerald-200">Projeto</span>
                {project.nome}
              </div>
              <div>
                <span className="block text-[9px] font-black uppercase tracking-[0.18em] text-emerald-200">Campeonato</span>
                {project.campeonatos?.nome || project.campeonato_id}
              </div>
              <div>
                <span className="block text-[9px] font-black uppercase tracking-[0.18em] text-emerald-200">Fonte oficial</span>
                Sumula carrega os dados ja publicados no site.
              </div>
            </div>
          ) : null}
        </div>

        {project ? (
          <SumulaPartida campeonatoIdOverride={project.campeonato_id} projectIdOverride={project.id} streamKeyOverride={project.stream_key} canEdit />
        ) : (
          <div className="border border-dashed border-white/10 bg-[#111827] p-10 text-center text-sm font-semibold text-zinc-400">
            Informe a chave para abrir a sumula do pontuador.
          </div>
        )}
      </section>
    </main>
  )
}
