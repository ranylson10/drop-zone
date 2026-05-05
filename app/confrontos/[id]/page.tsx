'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  Shield,
  Swords,
  Trophy,
  Users,
  Star,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import CampeonatoDetalheLayout from '@/app/campeonatos/[id]/components/CampeonatoDetalheLayout'
import AvaliacaoCampeonato from '@/app/components/AvaliacaoCampeonato'

// ✅ IMPORTS CORRETOS (CAMPEONATOS)
import GerenciarEquipes from '@/app/campeonatos/[id]/components/GerenciarEquipes'
import AbaJogadores from '@/app/campeonatos/[id]/components/AbaJogadores'

// ✅ IMPORTS LOCAIS (CONFRONTO)
import GerenciarConfrontos from './components/GerenciarConfrontos'
import GerenciarResultadosConfronto from './components/GerenciarResultadosConfronto'

type Campeonato = {
  id: string
  nome: string
  logo_url: string | null
  banner_url: string | null
  valor_premiacao: number | null
  vagas: number | null
  status: string | null
  data_inicio: string | null
}

type Aba =
  | 'avaliacoes'
  | 'equipes'
  | 'jogadores'
  | 'confrontos'
  | 'resultados'

function formatarMoeda(valor: number | null) {
  return (valor || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

function formatarData(data?: string | null) {
  if (!data) return '—'
  return new Date(data).toLocaleString('pt-BR')
}

export default function Page() {
  const params = useParams()
  const router = useRouter()
  const id = String(params?.id || '')

  const [campeonato, setCampeonato] = useState<Campeonato | null>(null)
  const [equipesCount, setEquipesCount] = useState(0)
  const [aba, setAba] = useState<Aba>('avaliacoes')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    carregar()
  }, [id])

  async function carregar() {
    setLoading(true)

    const { data } = await supabase
      .from('campeonatos')
      .select('*')
      .eq('id', id)
      .single()

    const { count } = await supabase
      .from('campeonato_equipes')
      .select('*', { count: 'exact', head: true })
      .eq('campeonato_id', id)

    setCampeonato(data)
    setEquipesCount(count || 0)
    setLoading(false)
  }

  const tabs = useMemo(
    () => [
      { id: 'avaliacoes', label: 'Avaliações', icon: Star },
      { id: 'equipes', label: 'Equipes', icon: Users },
      { id: 'jogadores', label: 'Jogadores', icon: Shield },
      { id: 'confrontos', label: 'Confrontos', icon: Swords },
      { id: 'resultados', label: 'Resultados', icon: Trophy },
    ],
    []
  )

  if (loading) {
    return (
      <div className="min-h-[55vh] bg-[#f7f7f7] p-10 text-center text-[13px] font-medium text-zinc-500">
        Carregando confronto...
      </div>
    )
  }

  if (!campeonato) {
    return (
      <div className="min-h-[55vh] bg-[#f7f7f7] p-10 text-center text-[13px] font-medium text-zinc-500">
        Campeonato não encontrado.
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f7f7f7] px-2 py-3 text-[#142340] md:px-4">
      <CampeonatoDetalheLayout
        tipo="confronto"
        nome={campeonato.nome}
        logoUrl={campeonato.logo_url}
        bannerUrl={campeonato.banner_url}
        abaAtiva={aba}
        abas={tabs.map((t) => {
          const Icon = t.icon
          return { id: t.id, label: t.label, icon: <Icon size={14} /> }
        })}
        onAbaChange={(id) => setAba(id as Aba)}
        onVoltar={() => router.back()}
        onConfigurar={() => router.push(`/campeonatos/${id}/editar`)}
        stats={[
          { label: 'Premiação', value: formatarMoeda(campeonato.valor_premiacao), highlight: true },
          { label: 'Vagas', value: `${equipesCount}/${campeonato.vagas || 0}` },
          { label: 'Status', value: campeonato.status || '—' },
          { label: 'Início', value: formatarData(campeonato.data_inicio) },
        ]}
      >
        {aba === 'avaliacoes' && <AvaliacaoCampeonato campeonatoId={id} />}
        {aba === 'equipes' && <GerenciarEquipes campeonatoId={id} />}
        {aba === 'jogadores' && <AbaJogadores campeonatoId={id} />}
        {aba === 'confrontos' && <GerenciarConfrontos campeonatoId={id} />}
        {aba === 'resultados' && <GerenciarResultadosConfronto campeonatoId={id} />}
      </CampeonatoDetalheLayout>
    </div>
  )
}
