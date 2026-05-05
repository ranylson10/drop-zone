'use client'

import { Suspense } from 'react'
export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ChevronLeft, LayoutGrid, Swords, Trophy, ShieldCheck, Target, CircleDollarSign } from 'lucide-react'

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

export default function Page() {
 const searchParams = useSearchParams()
 const produtoraId = searchParams.get('produtoraId')

 function hrefComProdutora(href: string) {
 if (!produtoraId) return href
 return `${href}${href.includes('?') ? '&' : '?'}produtoraId=${produtoraId}`
 }

 return (
 <div className="relative min-h-screen overflow-hidden bg-white text-[#142340]">
 <div className="pointer-events-none absolute inset-0">
 <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(90,255,0,0.16),transparent_32%),linear-gradient(180deg,#071019_0%,#060b12_60%,#05080d_100%)]" />
 <div
 className="absolute inset-0 opacity-[0.08]"
 style={{
 backgroundImage: `
 linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px),
 linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)
 `,
 backgroundSize: '36px 36px',
 }}
 />
 </div>

 <div className="relative mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-12">
 <section className="overflow-hidden rounded-[32px] border border-zinc-200 bg-white/[0.04] -[0_0_0_1px_rgba(255,255,255,0.03),0_20px_80px_rgba(0,0,0,0.45)] -xl">
 <div className="border-b border-zinc-200 bg-[linear-gradient(180deg,rgba(114,255,0,0.08),rgba(255,255,255,0.02))] p-5 md:p-7">
 <div className="flex flex-col gap-6">
 <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
 <div className="flex items-start gap-4">
 <div className="flex h-16 w-16 shrink-0 items-center justify-center border border-[#2563eb]/30 bg-zinc-500 text-[#2563eb] -[0_0_25px_rgba(124,252,0,0.12)]">
 <Trophy size={28} />
 </div>

 <div className="pt-1">
 <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#2563eb]/25 bg-[#2563eb]/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-[#2563eb]">
 <LayoutGrid size={12} />
 Mercado de torneios
 </div>

 <h1 className="text-3xl font-semibold uppercase tracking-tight text-[#142340] md:text-5xl">
 Criar campeonato
 </h1>

 <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-zinc-600 md:text-[15px]">
 Escolha o modo competitivo que você quer criar: confrontos, diários, xtreinos,
 copas, ligas e apostados.
 </p>
 </div>
 </div>

 <Link
 href="/campeonatos"
 className="inline-flex h-12 items-center justify-center gap-2 border border-zinc-200 bg-white px-6 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#142340] transition-all hover:-translate-y-0.5 hover:border-[#2563eb]/40 hover:bg-white hover:text-[#2563eb]"
 >
 <ChevronLeft size={14} />
 Voltar
 </Link>
 </div>

 <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
 {OPCOES.map((item) => {
 const Icon = item.icon

 return (
 <Link
 key={item.slug}
 href={hrefComProdutora(item.href)}
 className="group relative overflow-hidden rounded-[26px] border border-zinc-200 bg-white/[0.03] p-5 transition-all duration-200 hover:border-[#2563eb]/30 hover:bg-white/[0.05]"
 >
 <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(124,252,0,0.10),transparent_40%)] opacity-70" />

 <div className="relative">
 <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-600">
 <Icon size={11} />
 {item.badge}
 </div>

 <div className="text-[28px] font-semibold uppercase leading-none text-[#142340]">
 {item.titulo}
 </div>

 <div className="mt-3 min-h-[72px] text-sm font-medium leading-6 text-zinc-600">
 {item.descricao}
 </div>

 <div className="mt-5 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#2563eb] opacity-0 transition-all group-hover:opacity-100">
 Abrir criação
 </div>
 </div>
 </Link>
 )
 })}
 </div>

 <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
 <div className="rounded-[24px] border border-zinc-200 bg-white/[0.03] p-5">
 <div className="mb-3 flex h-11 w-11 items-center justify-center border border-zinc-200 bg-white/20 text-[#2563eb]">
 <LayoutGrid size={20} />
 </div>
 <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-500">
 Modos disponíveis
 </div>
 <div className="mt-2 text-4xl font-semibold text-[#142340]">6</div>
 </div>

 <div className="rounded-[24px] border border-zinc-200 bg-white/[0.03] p-5">
 <div className="mb-3 flex h-11 w-11 items-center justify-center border border-zinc-200 bg-white/20 text-[#2563eb]">
 <Swords size={20} />
 </div>
 <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-500">
 Confrontos
 </div>
 <div className="mt-2 text-4xl font-semibold text-[#142340]">1x1 até 4x4</div>
 </div>

 <div className="rounded-[24px] border border-zinc-200 bg-white/[0.03] p-5">
 <div className="mb-3 flex h-11 w-11 items-center justify-center border border-zinc-200 bg-white/20 text-[#2563eb]">
 <ShieldCheck size={20} />
 </div>
 <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-500">
 Fluxo integrado
 </div>
 <div className="mt-2 text-2xl font-semibold text-[#142340]">Sem duplicação</div>
 </div>

 <div className="rounded-[24px] border border-zinc-200 bg-white/[0.03] p-5">
 <div className="mb-3 flex h-11 w-11 items-center justify-center border border-zinc-200 bg-white/20 text-[#2563eb]">
 <Target size={20} />
 </div>
 <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-500">
 Próximo foco
 </div>
 <div className="mt-2 text-2xl font-semibold text-[#142340]">Página do confronto</div>
 </div>
 </div>
 </div>
 </div>
 </section>
 </div>
 </div>
 )
}
