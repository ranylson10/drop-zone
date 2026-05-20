'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import SumulaPartida from '@/app/campeonatos/[id]/components/SumulaPartida'

type PontuadorLink = {
  id: string
  campeonato_id: string
  label: string | null
  ativo: boolean
}

export default function PontuadorLinkPage() {
  const params = useParams<{ token: string }>()
  const token = decodeURIComponent(params?.token || '')
  const [link, setLink] = useState<PontuadorLink | null>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')

  useEffect(() => {
    async function carregar() {
      setLoading(true)
      const { data, error } = await supabase
        .from('stream_pontuador_links')
        .select('id, campeonato_id, label, ativo')
        .eq('token', token)
        .eq('ativo', true)
        .maybeSingle()

      if (error || !data) {
        setErro('Link de pontuador invalido ou desativado.')
        setLink(null)
      } else {
        setLink(data as PontuadorLink)
        setErro('')
      }
      setLoading(false)
    }

    if (token) carregar()
  }, [token])

  if (loading) {
    return <main className="min-h-screen bg-[#f4f6fb] p-6 text-sm font-semibold text-[#142340]">Carregando link do pontuador...</main>
  }

  if (erro || !link) {
    return (
      <main className="min-h-screen bg-[#f4f6fb] p-6">
        <div className="border border-amber-200 bg-amber-50 p-5 text-sm font-semibold text-amber-800">{erro}</div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#f4f6fb] p-3">
      <div className="mx-auto max-w-[1500px]">
        <div className="mb-3 border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-900">
          Link do pontuador: use Atualizar live para enviar os dados para a transmissao sem publicar no site. Use o botao azul de salvar tudo apenas quando for liberar a pontuacao oficial.
        </div>
        <SumulaPartida campeonatoIdOverride={link.campeonato_id} pontuadorLinkId={link.id} canEdit />
      </div>
    </main>
  )
}
