'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, ChevronRight, GitBranch, Plus, Trophy, Users } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getTipoVisual } from '@/lib/getTipoVisual'
import { resolverTipoCompeticao } from '@/app/campeonatos/components/tiposCompeticao'
import { getCampeonatoHref } from '@/app/campeonatos/utils/getCampeonatoHref'

type CopaItem = {
  id: string
  nome: string
  logo_url: string | null
  banner_url: string | null
  valor_vaga: number | null
  valor_premiacao: number | null
  vagas: number | null
  status: string | null
  regiao: string | null
  plataforma: string | null
  categoria: string | null
  created_at: string | null
  produtoras?: { nome?: string | null } | { nome?: string | null }[] | null
}

function moeda(valor?: number | null) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(valor || 0))
}

function normalizarProdutora(produtora: CopaItem['produtoras']) {
  if (!produtora) return 'Organização'
  if (Array.isArray(produtora)) return produtora[0]?.nome || 'Organização'
  return produtora.nome || 'Organização'
}

export default function CopasPage() {
  const [copas, setCopas] = useState<CopaItem[]>([])
  const [loading, setLoading] = useState(true)
  const visual = getTipoVisual('copa')

  useEffect(() => {
    async function carregar() {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('campeonatos')
          .select('id, nome, logo_url, banner_url, valor_vaga, valor_premiacao, vagas, status, regiao, plataforma, categoria, created_at, tipo_competicao, modelo_competicao, produtoras(nome)')
          .order('created_at', { ascending: false })

        if (error) throw error
        setCopas(((data || []) as any[]).filter((camp) => resolverTipoCompeticao(camp) === 'copa') as CopaItem[])
      } catch (error) {
        console.error(error)
        setCopas([])
      } finally {
        setLoading(false)
      }
    }

    carregar()
  }, [])

  const totalPremiacao = useMemo(() => copas.reduce((acc, item) => acc + Number(item.valor_premiacao || 0), 0), [copas])
  const totalVagas = useMemo(() => copas.reduce((acc, item) => acc + Number(item.vagas || 0), 0), [copas])

  return (
    <div className="min-h-screen bg-[#f7f7f7] px-3 py-3 text-[#142340] md:px-8 md:py-8">
      <div className="mx-auto max-w-7xl">
        <div className={`border border-zinc-200 border-l-4 bg-white ${visual.borderStrong}`}>
          <div className={`${visual.bgSoft} border-b border-zinc-200 p-4 md:p-6`}>
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <div className={`mb-2 inline-flex items-center gap-2 px-2 py-1 text-[10px] font-medium uppercase tracking-wide ${visual.badge}`}>
                  <GitBranch size={12} /> Mata-mata
                </div>
                <h1 className={`text-[24px] font-semibold uppercase tracking-tight md:text-[30px] ${visual.text}`}>Copas</h1>
                <p className="mt-1 max-w-3xl text-[13px] text-zinc-500">Eventos eliminatórios com avanço por fase, grupos independentes e jogos configurados dentro de cada etapa.</p>
              </div>
              <Link href="/campeonatos/nova/copa" className={`inline-flex h-9 items-center justify-center gap-2 px-4 text-[12px] font-medium uppercase tracking-wide transition ${visual.button}`}>
                <Plus size={15} /> Criar copa
              </Link>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 md:gap-3">
              <div className="border border-zinc-200 bg-white p-2 md:p-3"><div className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">Quantidade</div><div className={`mt-1 text-[22px] font-semibold leading-none md:text-[28px] ${visual.text}`}>{copas.length}</div></div>
              <div className="border border-zinc-200 bg-white p-2 md:p-3"><div className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">Premiação</div><div className={`mt-1 truncate text-[16px] font-semibold leading-none md:text-[24px] ${visual.text}`}>{moeda(totalPremiacao)}</div></div>
              <div className="border border-zinc-200 bg-white p-2 md:p-3"><div className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">Vagas</div><div className={`mt-1 text-[22px] font-semibold leading-none md:text-[28px] ${visual.text}`}>{totalVagas}</div></div>
            </div>
          </div>

          <div className="divide-y divide-zinc-200 bg-white">
            {loading ? (
              <div className="p-10 text-center text-[13px] text-zinc-500">Carregando copas...</div>
            ) : copas.length === 0 ? (
              <div className="p-10 text-center text-[13px] text-zinc-500">Nenhuma copa criada ainda.</div>
            ) : (
              copas.map((copa) => (
                <Link key={copa.id} href={getCampeonatoHref(copa.id, 'copa')} className="flex items-center gap-3 px-3 py-2 transition hover:bg-zinc-50 md:px-4 md:py-3">
                  <div className="h-10 w-10 shrink-0 overflow-hidden border border-zinc-200 bg-white md:h-12 md:w-12">
                    {copa.logo_url ? <img src={copa.logo_url} alt={copa.nome} className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-zinc-500"><Trophy size={17} /></div>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14px] font-semibold uppercase text-[#142340] md:text-[15px]">{copa.nome}</div>
                    <div className="hidden text-[11px] text-zinc-500 md:block">{normalizarProdutora(copa.produtoras)} • {copa.regiao || 'Brasil'} • {copa.plataforma || 'Mobile'} • {copa.categoria || 'Squad'}</div>
                  </div>
                  <span className={`hidden px-2 py-1 text-[10px] font-medium uppercase md:inline-flex ${visual.badge}`}>Copa</span>
                  <div className="hidden flex-wrap items-center gap-4 text-[11px] text-zinc-500 md:flex">
                    <div className="flex items-center gap-1"><Users size={13} className={visual.text} />{Number(copa.vagas || 0)} vagas</div>
                    <div className="flex items-center gap-1"><CalendarDays size={13} className={visual.text} />{copa.status || 'rascunho'}</div>
                  </div>
                  <div className="hidden text-right md:block"><div className={`text-[13px] font-semibold ${visual.text}`}>{moeda(copa.valor_premiacao)}</div><div className="text-[11px] text-zinc-500">{Number(copa.valor_vaga || 0) > 0 ? `Inscrição ${moeda(copa.valor_vaga)}` : 'Grátis'}</div></div>
                  <ChevronRight size={17} className={visual.text} />
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
