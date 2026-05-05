'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { CalendarClock, ChevronLeft, ChevronRight, CircleDollarSign, LayoutGrid, Plus, Trophy } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getTipoVisual } from '@/lib/getTipoVisual'
import { resolverTipoCompeticao } from '@/app/campeonatos/components/tiposCompeticao'
import { getCampeonatoHref } from '@/app/campeonatos/utils/getCampeonatoHref'

function formatarMoeda(valor: number | string | null | undefined) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(valor || 0))
}

function fallbackNome(nome?: string | null) {
  return (nome || 'D').trim().charAt(0).toUpperCase() || 'D'
}

export default function DiariosPage() {
  const [itens, setItens] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const visual = getTipoVisual('diario')

  useEffect(() => {
    async function carregar() {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('campeonatos')
          .select(`
            id,
            nome,
            logo_url,
            banner_url,
            valor_vaga,
            valor_premiacao,
            vagas,
            status,
            formato,
            tipo_competicao,
            modelo_competicao,
            regiao,
            plataforma,
            categoria,
            created_at,
            produtoras(nome)
          `)
          .order('created_at', { ascending: false })

        if (error) throw error
        setItens((data || []).filter((camp) => resolverTipoCompeticao(camp) === 'diario'))
      } catch (error) {
        console.error('Erro ao carregar diários:', error)
        setItens([])
      } finally {
        setLoading(false)
      }
    }

    carregar()
  }, [])

  const resumo = useMemo(() => {
    const total = itens.length
    const gratis = itens.filter((item) => Number(item.valor_vaga || 0) === 0).length
    const premiacaoTotal = itens.reduce((acc, item) => acc + Number(item.valor_premiacao || 0), 0)
    return { total, gratis, pagos: total - gratis, premiacaoTotal }
  }, [itens])

  return (
    <div className="min-h-screen bg-[#f7f7f7] px-3 py-3 text-[#142340] md:px-8 md:py-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-3 flex items-center justify-between gap-3">
          <Link href="/campeonatos" className="inline-flex h-9 items-center gap-2 border border-zinc-300 bg-white px-3 text-[12px] font-medium uppercase text-[#142340] hover:bg-zinc-50">
            <ChevronLeft size={15} /> Voltar
          </Link>
        </div>

        <section className={`border border-zinc-200 border-l-4 bg-white ${visual.borderStrong}`}>
          <div className={`${visual.bgSoft} border-b border-zinc-200 p-4 md:p-6`}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className={`mb-2 inline-flex items-center gap-2 px-2 py-1 text-[10px] font-medium uppercase tracking-wide ${visual.badge}`}>
                  <CalendarClock size={12} /> Diário por horários
                </div>
                <h1 className={`text-[24px] font-semibold uppercase tracking-tight md:text-[30px] ${visual.text}`}>Diários</h1>
                <p className="mt-1 max-w-3xl text-[13px] text-zinc-500">
                  Cada diário pode ter múltiplos horários independentes, com inscrições, quedas, arrecadação e campeão próprios.
                </p>
              </div>
              <Link href="/campeonatos/diarios/criar" className={`inline-flex h-9 items-center justify-center gap-2 px-4 text-[12px] font-medium uppercase tracking-wide transition ${visual.button}`}>
                <Plus size={15} /> Criar diário
              </Link>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
              {[
                { label: 'Diários', value: resumo.total, icon: LayoutGrid },
                { label: 'Gratuitos', value: resumo.gratis, icon: Trophy },
                { label: 'Pagos', value: resumo.pagos, icon: CalendarClock },
                { label: 'Premiação', value: formatarMoeda(resumo.premiacaoTotal), icon: CircleDollarSign },
              ].map((item) => {
                const Icon = item.icon
                return (
                  <div key={item.label} className="border border-zinc-200 bg-white p-2 md:p-3">
                    <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-wide text-zinc-500"><Icon size={13} className={visual.text} />{item.label}</div>
                    <div className={`mt-1 truncate text-[20px] font-semibold leading-none md:text-[24px] ${visual.text}`}>{item.value}</div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="p-3 md:p-4">
            {loading ? (
              <div className="border border-zinc-200 bg-zinc-50 p-10 text-center text-[13px] text-zinc-500">Carregando diários...</div>
            ) : itens.length === 0 ? (
              <div className="border border-zinc-200 bg-zinc-50 p-10 text-center">
                <div className="text-[15px] font-semibold uppercase text-[#142340]">Nenhum diário encontrado</div>
                <p className="mt-1 text-[13px] text-zinc-500">Cria o primeiro diário para começar.</p>
                <Link href="/campeonatos/diarios/criar" className={`mt-4 inline-flex h-9 items-center justify-center gap-2 px-4 text-[12px] font-medium uppercase ${visual.button}`}><Plus size={15} /> Criar diário</Link>
              </div>
            ) : (
              <div className="divide-y divide-zinc-200 border border-zinc-200 bg-white">
                {itens.map((camp) => {
                  const gratuito = Number(camp.valor_vaga || 0) === 0
                  return (
                    <Link key={camp.id} href={getCampeonatoHref(camp.id, 'diario')} className="flex items-center gap-3 px-3 py-2 transition hover:bg-zinc-50 md:px-4 md:py-3">
                      {camp.logo_url ? (
                        <img src={camp.logo_url} alt={camp.nome || 'Diário'} className="h-10 w-10 shrink-0 border border-zinc-200 bg-white object-cover md:h-12 md:w-12" />
                      ) : (
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center border border-zinc-200 bg-white text-[15px] font-semibold md:h-12 md:w-12 ${visual.text}`}>{fallbackNome(camp.nome)}</div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[14px] font-semibold uppercase text-[#142340] md:text-[15px]">{camp.nome || 'Diário sem nome'}</div>
                        <div className="hidden text-[11px] text-zinc-500 md:block">{camp.produtoras?.nome || 'Organização'} • {camp.regiao || 'Sem região'} • {camp.plataforma || 'Sem plataforma'}</div>
                      </div>
                      <span className={`hidden px-2 py-1 text-[10px] font-medium uppercase md:inline-flex ${visual.badge}`}>Diário</span>
                      <div className="hidden text-right md:block">
                        <div className={`text-[13px] font-semibold ${visual.text}`}>{formatarMoeda(camp.valor_premiacao || 0)}</div>
                        <div className="text-[11px] text-zinc-500">{gratuito ? 'Grátis' : `Vaga ${formatarMoeda(camp.valor_vaga || 0)}`}</div>
                      </div>
                      <ChevronRight size={17} className={visual.text} />
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
