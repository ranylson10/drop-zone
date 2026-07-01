'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import CampeonatoDetalhePage from '@/app/campeonatos/[id]/page'
import DiarioDetalhePage from '@/app/campeonatos/diarios/[id]/page'

export default function Page() {
  const params = useParams<{ id: string }>()
  const id = String(params?.id || '')
  const [modo, setModo] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return

    async function carregarModo() {
      try {
        const { data } = await supabase
          .from('campeonatos_xtreinos_config')
          .select('modo_xtreino')
          .eq('campeonato_id', id)
          .maybeSingle()

        setModo(String(data?.modo_xtreino || ''))
      } finally {
        setLoading(false)
      }
    }

    carregarModo()
  }, [id])

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white">
        <div className="font-black uppercase tracking-widest text-emerald-700">
          Carregando xtreino...
        </div>
      </div>
    )
  }

  if (modo === 'jogo_unico') {
    return <DiarioDetalhePage tipoForcado="xtreino" />
  }

  return <CampeonatoDetalhePage tipoForcado="xtreino" />
}
