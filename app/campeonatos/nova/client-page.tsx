'use client'

import { Suspense, useEffect, useState } from 'react'
export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ChevronLeft, LayoutGrid, Swords, Trophy, ShieldCheck, Target, CircleDollarSign, Plus } from 'lucide-react'
import { supabase } from '@/lib/supabase'

function moeda(valor: number) {
 return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function numeroSeguro(value: unknown) {
 const n = Number(value || 0)
 return Number.isFinite(n) ? n : 0
}

const OPCOES = [
 {
 slug: 'confronto',
 badge: 'Confronto',
 titulo: 'CONFRONTOS',
 descricao: 'Sistema de confrontos com múltiplos modos: 1x1, 2x2, 2x3 e 4x4.',
 href: '/confrontos/nova',
 icon: Swords,
 },
 {
 slug: 'diario',
 badge: 'Multi-horários',
 titulo: 'DIÁRIO',
 descricao: 'Múltiplos horários independentes, cada um com inscrições, tabela e campeão próprios.',
 href: '/campeonatos/nova/diario',
 icon: LayoutGrid,
 },
 {
 slug: 'xtreino',
 badge: 'Flexível',
 titulo: 'XTREINO',
 descricao: 'Formato mais flexível para treino, amistoso ou teste de lobby.',
 href: '/campeonatos/nova/xtreino',
 icon: Target,
 },
 {
 slug: 'copa',
 badge: 'Mata-mata',
 titulo: 'COPA',
 descricao: 'Mata-mata com chave, avanço de fase e decisão por confronto.',
 href: '/campeonatos/nova/copa',
 icon: Swords,
 },
 {
 slug: 'liga',
 badge: 'Pontos corridos',
 titulo: 'LIGA',
 descricao: 'Pontos corridos com rodadas, tabela e classificação acumulada.',
 href: '/campeonatos/nova/liga',
 icon: Trophy,
 },
 {
 slug: 'apostado',
 badge: 'Valor casado',
 titulo: 'APOSTADO',
 descricao: 'Disputa direta entre duas equipes com valor casado. Quem vencer leva tudo.',
 href: '/campeonatos/nova/apostado',
 icon: CircleDollarSign,
 },
]

function PageInner() {
 const searchParams = useSearchParams()
 const produtoraId = searchParams.get('produtoraId')
 const [taxas, setTaxas] = useState<Record<string, number>>({})

 useEffect(() => {
  let ativo = true

  async function carregarTaxas() {
   const { data } = await supabase
    .from('campeonato_taxas_criacao')
    .select('tipo, valor, ativo')
    .eq('ativo', true)

   if (!ativo) return

   setTaxas(
    Object.fromEntries(
     (data || []).map((item: { tipo?: string; valor?: number | null }) => [String(item.tipo), numeroSeguro(item.valor)]),
    ),
   )
  }

  carregarTaxas()

  return () => {
   ativo = false
  }
 }, [])

 function hrefComProdutora(href: string) {
 if (!produtoraId) return href
 return `${href}${href.includes('?') ? '&' : '?'}produtoraId=${produtoraId}`
 }

 return (
 <div className="min-h-screen bg-[#f7f7f7] text-[#142340]">
 <div className="mx-auto max-w-[1520px] px-4 pb-6 pt-5">
 <section className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
 <div>
 <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#2563eb]">
 <Trophy size={18} />
 Mercado de torneios
 </div>
 <h1 className="text-[20px] font-semibold tracking-tight text-[#142340] md:text-[22px]">
 Criar campeonato
 </h1>
 <p className="mt-1 text-xs font-medium text-zinc-500">
 Escolha o modo competitivo que você quer criar: confrontos, diários, xtreinos, copas, ligas e apostados.
 </p>
 </div>

 <Link
 href="/campeonatos"
 className="inline-flex h-9 items-center justify-center gap-2 border border-zinc-200 bg-white px-4 text-[12px] font-medium uppercase tracking-wide text-[#142340] transition hover:border-[#2563eb] hover:text-[#2563eb]"
 >
 <ChevronLeft size={16} />
 Voltar
 </Link>
 </section>

 <section className="mb-4 border border-zinc-200 bg-white">
 <div className="flex items-center justify-between px-4 py-3 max-md:px-3">
 <div className="flex items-center gap-2 text-[12px] font-semibold uppercase text-[#142340]">
 <Plus size={16} className="text-[#2563eb]" />
 Selecione o tipo de criação
 </div>
 <span className="text-[10px] font-medium uppercase text-zinc-500">taxa por modo</span>
 </div>

 <div className="grid gap-3 px-3 pb-3 md:grid-cols-2 xl:grid-cols-6">
 {OPCOES.map((item) => {
 const Icon = item.icon

 return (
 <Link
 key={item.slug}
 href={hrefComProdutora(item.href)}
 className="group relative flex min-h-[235px] flex-col border border-zinc-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-[#2563eb] hover:shadow-[0_10px_30px_rgba(15,23,42,0.08)]"
 >
 <div className="mb-4 inline-flex w-fit items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-[#2563eb]">
 <Icon size={11} />
 {item.badge}
 </div>

 <div className="text-[20px] font-semibold uppercase leading-tight text-[#142340]">
 {item.titulo}
 </div>

 <div className="mt-3 flex-1 text-[13px] font-medium leading-6 text-zinc-600">
 {item.descricao}
 </div>

 <div className="mt-4 inline-flex w-fit items-center gap-2 rounded-full border border-[#2563eb]/20 bg-[#2563eb]/5 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#2563eb]">
 <CircleDollarSign size={13} />
 Taxa: {moeda(taxas[item.slug] || 0)}
 </div>
 </Link>
 )
 })}
 </div>
 </section>

 <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
 <div className="border border-zinc-200 bg-white p-4">
 <div className="mb-3 flex h-11 w-11 items-center justify-center border border-zinc-200 bg-zinc-50 text-[#2563eb]">
 <LayoutGrid size={20} />
 </div>
 <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-500">Modos disponíveis</div>
 <div className="mt-1 text-[24px] font-semibold text-[#142340]">6</div>
 </div>

 <div className="border border-zinc-200 bg-white p-4">
 <div className="mb-3 flex h-11 w-11 items-center justify-center border border-zinc-200 bg-zinc-50 text-[#2563eb]">
 <Swords size={20} />
 </div>
 <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-500">Confrontos</div>
 <div className="mt-1 text-[24px] font-semibold text-[#142340]">1x1 até 4x4</div>
 </div>

 <div className="border border-zinc-200 bg-white p-4">
 <div className="mb-3 flex h-11 w-11 items-center justify-center border border-zinc-200 bg-zinc-50 text-[#2563eb]">
 <ShieldCheck size={20} />
 </div>
 <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-500">Fluxo integrado</div>
 <div className="mt-1 text-[22px] font-semibold text-[#142340]">Sem duplicação</div>
 </div>

 <div className="border border-zinc-200 bg-white p-4">
 <div className="mb-3 flex h-11 w-11 items-center justify-center border border-zinc-200 bg-zinc-50 text-[#2563eb]">
 <Target size={20} />
 </div>
 <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-500">Próximo foco</div>
 <div className="mt-1 text-[22px] font-semibold text-[#142340]">Configurações</div>
 </div>
 </section>
 </div>
 </div>
 )
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <PageInner />
    </Suspense>
  )
}
