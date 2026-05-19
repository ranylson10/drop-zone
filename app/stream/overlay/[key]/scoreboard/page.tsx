'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Projeto = {
  id: string
  stream_key: string
}

type State = {
  id: string
  project_id: string
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

export default function ScoreboardOverlayPage() {
  const params = useParams<{ key: string }>()
  const streamKey = params?.key

  const [project, setProject] = useState<Projeto | null>(null)
  const [state, setState] = useState<State | null>(null)

  const carregar = useCallback(async () => {
    if (!streamKey) return

    const { data: proj } = await supabase
      .from('stream_projects')
      .select('id, stream_key')
      .eq('stream_key', streamKey)
      .maybeSingle()

    if (!proj) return

    setProject(proj as Projeto)

    const { data: score } = await supabase
      .from('stream_scoreboard_state')
      .select('*')
      .eq('project_id', proj.id)
      .maybeSingle()

    setState(score as State | null)
  }, [streamKey])

  useEffect(() => {
    carregar()
  }, [carregar])

  useEffect(() => {
    if (!project?.id) return

    const channel = supabase
      .channel(`scoreboard-${project.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stream_scoreboard_state', filter: `project_id=eq.${project.id}` }, (payload) => {
        if (payload.new) setState(payload.new as State)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [project?.id])

  if (!state || !state.visivel) {
    return <main className="h-screen w-screen overflow-hidden bg-transparent" />
  }

  return (
    <main className="h-screen w-screen overflow-hidden bg-transparent">
      <div className="absolute left-1/2 top-10 w-[980px] -translate-x-1/2 overflow-hidden rounded-2xl border border-white/15 bg-[#06101f]/95 text-white shadow-[0_20px_70px_rgba(0,0,0,0.45)] backdrop-blur">
        <div className="grid grid-cols-[1fr_190px_1fr] items-center">
          <div className="flex items-center gap-4 px-6 py-4">
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white">
              {state.logo_a ? <img src={state.logo_a} alt={state.nome_a || 'Equipe A'} className="h-full w-full object-contain" /> : <span className="text-3xl font-black text-[#06101f]">{state.nome_a?.charAt(0) || 'A'}</span>}
            </div>
            <div className="min-w-0">
              <div className="truncate text-3xl font-black uppercase tracking-tight">{state.nome_a || 'Equipe A'}</div>
              <div className="text-sm font-black uppercase tracking-[0.24em] text-zinc-400">{state.tag_a || 'A'}</div>
            </div>
          </div>

          <div className="flex h-full flex-col items-center justify-center bg-red-600 px-5 py-3">
            <div className="text-[10px] font-black uppercase tracking-[0.25em] text-red-100">{state.rodada || 'Rodada'}</div>
            <div className="mt-1 text-6xl font-black leading-none">{state.score_a} x {state.score_b}</div>
            <div className="mt-1 text-[11px] font-black uppercase tracking-[0.24em] text-red-100">MD{state.md || 1} • {state.status}</div>
          </div>

          <div className="flex flex-row-reverse items-center gap-4 px-6 py-4 text-right">
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white">
              {state.logo_b ? <img src={state.logo_b} alt={state.nome_b || 'Equipe B'} className="h-full w-full object-contain" /> : <span className="text-3xl font-black text-[#06101f]">{state.nome_b?.charAt(0) || 'B'}</span>}
            </div>
            <div className="min-w-0">
              <div className="truncate text-3xl font-black uppercase tracking-tight">{state.nome_b || 'Equipe B'}</div>
              <div className="text-sm font-black uppercase tracking-[0.24em] text-zinc-400">{state.tag_b || 'B'}</div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
