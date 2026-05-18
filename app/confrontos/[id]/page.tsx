'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ChevronLeft,
  Settings,
  Shield,
  Swords,
  Trophy,
  Users,
  Star,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import AvaliacaoCampeonato from '@/app/components/AvaliacaoCampeonato'
import GerenciarEquipes from '@/app/campeonatos/[id]/components/GerenciarEquipes'
import AbaJogadores from '@/app/campeonatos/[id]/components/AbaJogadores'
import GerenciarConfrontos from './components/GerenciarConfrontos'
import GerenciarResultadosConfronto from './components/GerenciarResultadosConfronto'

type Campeonato = {
  id: string
  nome: string
  logo_url: string | null
  banner_url: string | null
  valor_premiacao: number | null
  vagas: number | null
  valor_vaga?: number | null
  status: string | null
  data_inicio: string | null
  plataforma?: string | null
  formato?: string | null
  modelo_competicao?: string | null
  criado_por?: string | null
}

type Aba = 'avaliacoes' | 'equipes' | 'jogadores' | 'confrontos' | 'resultados'

const CONFRONTO_COLOR = {
  border: 'border-red-500',
  bg: 'bg-red-600',
  bgSoft: 'bg-red-50',
  text: 'text-red-700',
  textSoft: 'text-red-600',
  badge: 'border-red-200 bg-red-50 text-red-700',
  activeTab: 'bg-red-600 text-white border-red-600',
  activeLine: 'bg-red-600',
}

function formatarMoeda(valor: number | null | undefined) {
  return Number(valor || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

function formatarData(data?: string | null) {
  if (!data) return '—'
  return new Date(data).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function ConfrontoMiniInfo({ titulo, valor, destaque = false }: { titulo: string; valor: string; destaque?: boolean }) {
  return (
    <div className="min-w-0 border-l border-white/20 pl-4">
      <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/65">{titulo}</div>
      <div className={`mt-1 truncate text-[18px] font-bold leading-none ${destaque ? 'text-white' : 'text-white'}`}>{valor}</div>
    </div>
  )
}


export default function Page() {
  const params = useParams()
  const router = useRouter()
  const id = String(params?.id || '')

  const [campeonato, setCampeonato] = useState<Campeonato | null>(null)
  const [equipesCount, setEquipesCount] = useState(0)
  const [aba, setAba] = useState<Aba>('avaliacoes')
  const [loading, setLoading] = useState(true)
  const [canEdit, setCanEdit] = useState(false)

  useEffect(() => {
    carregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function carregar() {
    if (!id) return

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

    const { data: authData } = await supabase.auth.getUser()
    const user = authData?.user || null

    if (!user) {
      setCanEdit(false)
    } else {
      try {
        const { data: permissaoData, error: permissaoError } = await supabase.rpc('fn_usuario_admin_do_campeonato', {
          p_campeonato_id: id,
        })

        setCanEdit(!permissaoError ? Boolean(permissaoData) : Boolean(data?.criado_por && data.criado_por === user.id))
      } catch {
        setCanEdit(Boolean(data?.criado_por && data.criado_por === user.id))
      }
    }

    setLoading(false)
  }

  const tabs = useMemo(
    () => [
      { id: 'avaliacoes' as const, label: 'Avaliações', icon: Star },
      { id: 'equipes' as const, label: 'Equipes', icon: Users },
      { id: 'jogadores' as const, label: 'Jogadores', icon: Shield },
      { id: 'confrontos' as const, label: 'Confrontos', icon: Swords },
      { id: 'resultados' as const, label: 'Resultados', icon: Trophy },
    ],
    []
  )


  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] px-4 py-10 text-center text-[13px] font-medium text-zinc-500">
        Carregando confronto...
      </div>
    )
  }

  if (!campeonato) {
    return (
      <div className="min-h-screen bg-[#f8fafc] px-4 py-10 text-center text-[13px] font-medium text-zinc-500">
        Campeonato não encontrado.
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] bg-[size:22px_22px] px-3 py-4 text-[#142340] md:px-6">
      <div className="mx-auto w-full max-w-[1260px]">
        <div className="mb-3 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex h-8 items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-[#142340] transition hover:text-red-700"
          >
            <ChevronLeft size={15} /> Voltar
          </button>

          <button
            type="button"
            onClick={() => router.push(`/campeonatos/${id}/editar`)}
            className="inline-flex h-8 items-center gap-2 border border-zinc-200 bg-white px-3 text-[10px] font-semibold uppercase tracking-wide text-[#142340] transition hover:border-red-300 hover:text-red-700"
          >
            <Settings size={13} /> Configurações
          </button>
        </div>

        <header className={`border-l-4 ${CONFRONTO_COLOR.border} bg-gradient-to-r from-red-700 via-red-600 to-red-800 px-4 py-4 text-white shadow-sm md:px-6`}>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <div className="flex h-[76px] w-[76px] shrink-0 items-center justify-center border border-white/20 bg-white p-1.5">
                {campeonato.logo_url ? (
                  <img src={campeonato.logo_url} alt="" className="h-full w-full object-contain" />
                ) : (
                  <Swords size={30} className="text-red-700" />
                )}
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="border border-white/25 bg-white/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-white">
                    Confronto
                  </span>
                  <span className="border border-white/25 bg-white/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-white">
                    {campeonato.formato || campeonato.plataforma || 'Competitivo'}
                  </span>
                </div>
                <h1 className="mt-3 truncate text-[28px] font-black uppercase leading-none tracking-tight md:text-[40px]">
                  {campeonato.nome || 'Confronto'}
                </h1>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 md:min-w-[560px] md:grid-cols-4">
              <ConfrontoMiniInfo titulo="Premiação" valor={formatarMoeda(campeonato.valor_premiacao)} destaque />
              <ConfrontoMiniInfo titulo="Vagas" valor={`${equipesCount}/${campeonato.vagas || 0}`} />
              <ConfrontoMiniInfo titulo="Status" valor={campeonato.status || '—'} />
              <ConfrontoMiniInfo titulo="Início" valor={formatarData(campeonato.data_inicio)} />
            </div>
          </div>
        </header>

        <section className="mt-4 grid grid-cols-1 gap-4">
          <div className="min-w-0 border border-zinc-200 bg-white">
            <div className="grid grid-cols-2 border-b border-zinc-200 md:grid-cols-5">
              {tabs.map((tab) => {
                const Icon = tab.icon
                const active = aba === tab.id
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setAba(tab.id)}
                    className={`relative flex h-12 items-center justify-center gap-2 border-r border-zinc-200 px-3 text-[11px] font-semibold uppercase tracking-[0.12em] transition last:border-r-0 ${
                      active ? CONFRONTO_COLOR.activeTab : 'bg-white text-zinc-500 hover:bg-red-50 hover:text-red-700'
                    }`}
                  >
                    <Icon size={14} />
                    {tab.label}
                  </button>
                )
              })}
            </div>

            <main className={`min-h-[520px] ${aba === 'avaliacoes' ? 'p-2 md:p-4' : 'p-3 md:p-4'}`}>
              {aba === 'avaliacoes' && <AvaliacaoCampeonato campeonatoId={id} />}
              {aba === 'equipes' && <GerenciarEquipes campeonatoId={id} canEdit={canEdit} />}
              {aba === 'jogadores' && <AbaJogadores campeonatoId={id} canEdit={canEdit} />}
              {aba === 'confrontos' && <GerenciarConfrontos campeonatoId={id} canEdit={canEdit} />}
              {aba === 'resultados' && <GerenciarResultadosConfronto campeonatoId={id} />}
            </main>
          </div>
        </section>
      </div>
    </div>
  )
}
