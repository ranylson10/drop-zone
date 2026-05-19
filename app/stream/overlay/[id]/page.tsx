'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type OverlayState = {
  id: string
  campeonato_equipe_id: string | null
  nome_equipe: string
  tag_equipe: string | null
  logo_url: string | null
  visivel: boolean
  updated_at?: string | null
}

export default function StreamOverlayPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id
  const [dados, setDados] = useState<OverlayState | null>(null)

  const carregar = useCallback(async () => {
    if (!id) return

    const { data, error } = await supabase
      .from('stream_overlay_test')
      .select('id, campeonato_equipe_id, nome_equipe, tag_equipe, logo_url, visivel, updated_at')
      .eq('id', id)
      .maybeSingle()

    if (error) {
      console.error(error)
      return
    }

    setDados(data)
  }, [id])

  useEffect(() => {
    carregar()
  }, [carregar])

  useEffect(() => {
    if (!id) return

    const channel = supabase
      .channel(`stream-overlay-test-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stream_overlay_test', filter: `id=eq.${id}` }, (payload) => {
        if (payload.new) setDados(payload.new as OverlayState)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [id])

  if (!dados || !dados.visivel) return <main className="h-screen w-screen overflow-hidden bg-transparent" />

  return (
    <main className="h-screen w-screen overflow-hidden bg-transparent">
      <div className="absolute left-16 top-16 flex items-center gap-5 rounded-2xl border border-white/20 bg-[#081120]/90 px-7 py-5 text-white shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur">
        <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl border border-white/15 bg-white">
          {dados.logo_url ? (
            <img src={dados.logo_url} alt={dados.nome_equipe} className="h-full w-full object-contain" />
          ) : (
            <span className="text-4xl font-black text-[#081120]">{dados.nome_equipe?.charAt(0)?.toUpperCase() || 'E'}</span>
          )}
        </div>

        <div>
          <div className="text-[13px] font-black uppercase tracking-[0.32em] text-red-400">Equipe em destaque</div>
          <div className="mt-1 text-5xl font-black uppercase tracking-tight drop-shadow">{dados.nome_equipe || 'Equipe'}</div>
          {dados.tag_equipe ? (
            <div className="mt-1 text-lg font-black uppercase tracking-[0.2em] text-zinc-300">{dados.tag_equipe}</div>
          ) : null}
        </div>
      </div>
    </main>
  )
}
