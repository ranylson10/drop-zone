'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import {
 Trophy,
 Medal,
 Swords,
 TrendingUp,
 Loader2,
 AlertTriangle,
 ChevronLeft,
} from 'lucide-react'

type RankingRow = {
 user_id: string
 nick: string
 partidas: number | null
 vitorias: number | null
 derrotas: number | null
 winrate: number | null
}

export default function ConfrontosRankingPage() {
 const [loading, setLoading] = useState(true)
 const [erro, setErro] = useState('')
 const [lista, setLista] = useState<RankingRow[]>([])

 useEffect(() => {
 carregar()
 }, [])

 async function carregar() {
 setLoading(true)
 setErro('')

 try {
 const { data, error } = await supabase
 .from('v_ranking_apostadores')
 .select('*')
 .order('winrate', { ascending: false })
 .order('vitorias', { ascending: false })
 .order('partidas', { ascending: false })

 if (error) throw error

 const linhas = ((data || []) as RankingRow[]).filter((item) => item?.user_id)

 const porUser = new Map<string, RankingRow>()

 for (const item of linhas) {
 const atual = porUser.get(item.user_id)

 if (!atual) {
 porUser.set(item.user_id, item)
 continue
 }

 const atualWinrate = Number(atual.winrate || 0)
 const novoWinrate = Number(item.winrate || 0)
 const atualVitorias = Number(atual.vitorias || 0)
 const novoVitorias = Number(item.vitorias || 0)
 const atualPartidas = Number(atual.partidas || 0)
 const novoPartidas = Number(item.partidas || 0)

 const novoEhMelhor =
 novoWinrate > atualWinrate ||
 (novoWinrate === atualWinrate && novoVitorias > atualVitorias) ||
 (novoWinrate === atualWinrate &&
 novoVitorias === atualVitorias &&
 novoPartidas > atualPartidas)

 if (novoEhMelhor) {
 porUser.set(item.user_id, item)
 }
 }

 const listaUnica = Array.from(porUser.values()).sort((a, b) => {
 const aWinrate = Number(a.winrate || 0)
 const bWinrate = Number(b.winrate || 0)
 if (bWinrate !== aWinrate) return bWinrate - aWinrate

 const aVitorias = Number(a.vitorias || 0)
 const bVitorias = Number(b.vitorias || 0)
 if (bVitorias !== aVitorias) return bVitorias - aVitorias

 const aPartidas = Number(a.partidas || 0)
 const bPartidas = Number(b.partidas || 0)
 return bPartidas - aPartidas
 })

 setLista(listaUnica)
 } catch (err) {
 console.error(err)
 setErro('Não foi possível carregar o ranking agora.')
 setLista([])
 } finally {
 setLoading(false)
 }
 }

 const top3 = useMemo(() => lista.slice(0, 3), [lista])
 const restante = useMemo(() => lista.slice(3), [lista])

 return (
 <div className="min-h-screen bg-[#f6f7f8]">
 <div className="border-b border-zinc-200 bg-white">
 <div className="max-w-6xl mx-auto px-4 md:px-8 xl:px-10 py-6 md:py-8">
 <div className="flex flex-col gap-4">
 <div className="flex flex-wrap items-center gap-3">
 <Link
 href="/confrontos"
 className="h-10 px-4 border border-zinc-300 bg-white text-zinc-800 font-semibold text-[11px] uppercase tracking-[0.18em] inline-flex items-center gap-2 hover:bg-zinc-50 transition-colors"
 >
 <ChevronLeft size={15} />
 Voltar
 </Link>

 <div className="h-10 px-4 bg-[#2563eb] text-[#142340] font-semibold text-[11px] uppercase tracking-[0.18em] inline-flex items-center gap-2">
 <Trophy size={15} />
 Ranking
 </div>
 </div>

 <div className="grid grid-cols-1 xl:grid-cols-[1.45fr_0.95fr] gap-5">
 <div className=" border border-zinc-200 bg-[#f8fbf9] p-5 md:p-7">
 <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#2563eb] mb-3">
 // RANKING DE CONFRONTOS
 </p>

 <h1 className="text-3xl md:text-5xl font-semibold leading-none text-zinc-900">
 Os melhores apostadores da plataforma.
 </h1>

 <p className="text-zinc-600 font-semibold mt-4 leading-7 max-w-3xl">
 Ranking baseado em vitórias, derrotas, partidas concluídas e taxa de vitória.
 </p>
 </div>

 <div className=" border border-zinc-200 bg-white p-5 md:p-6">
 <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-zinc-500 mb-4">
 RESUMO
 </p>

 <div className="grid grid-cols-2 gap-3">
 <MiniResumo titulo="Jogadores" valor={String(lista.length)} />
 <MiniResumo titulo="Top 1" valor={top3[0]?.nick || '—'} menor />
 <MiniResumo titulo="Top 2" valor={top3[1]?.nick || '—'} menor />
 <MiniResumo titulo="Top 3" valor={top3[2]?.nick || '—'} menor />
 </div>
 </div>
 </div>
 </div>
 </div>
 </div>

 <div className="max-w-6xl mx-auto px-4 md:px-8 xl:px-10 py-6 md:py-8 xl:py-10">
 {loading && (
 <div className="bg-white border border-zinc-200 p-10 flex items-center justify-center gap-3">
 <Loader2 size={20} className="animate-spin" />
 <span className="font-semibold uppercase text-sm tracking-[0.2em]">
 Carregando ranking...
 </span>
 </div>
 )}

 {!loading && erro && (
 <div className="bg-red-50 border border-red-200 p-6 flex items-start gap-3">
 <AlertTriangle className="text-red-600 shrink-0 mt-0.5" size={18} />
 <div>
 <p className="font-semibold uppercase text-red-700 text-sm">Erro</p>
 <p className="text-red-600 font-semibold text-sm mt-1">{erro}</p>
 </div>
 </div>
 )}

 {!loading && !erro && lista.length === 0 && (
 <div className="bg-white border border-zinc-200 p-10 text-center">
 <p className="text-2xl font-semibold text-zinc-900">Nenhum dado no ranking ainda.</p>
 </div>
 )}

 {!loading && !erro && lista.length > 0 && (
 <div className="space-y-6">
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
 {top3.map((item, index) => (
 <CardTop key={`${item.user_id}-${index}`} item={item} posicao={index + 1} />
 ))}
 </div>

 <div className="bg-white border border-zinc-200 overflow-hidden">
 <div className="px-5 md:px-6 py-5 border-b border-zinc-200 bg-zinc-50">
 <div className="flex items-center gap-3">
 <div className="w-11 h-11 border border-zinc-200 bg-white flex items-center justify-center">
 <TrendingUp size={20} className="text-zinc-700" />
 </div>
 <div>
 <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
 CLASSIFICAÇÃO GERAL
 </p>
 <h2 className="text-xl font-semibold text-zinc-900 mt-1">
 Ranking completo
 </h2>
 </div>
 </div>
 </div>

 <div className="divide-y divide-zinc-200">
 {lista.map((item, index) => (
 <LinhaRanking key={`${item.user_id}-${index}`} item={item} posicao={index + 1} />
 ))}
 </div>
 </div>

 {restante.length > 0 && (
 <div className="text-sm text-zinc-500 font-semibold">
 Exibindo {lista.length} jogadores ranqueados.
 </div>
 )}
 </div>
 )}
 </div>
 </div>
 )
}

function CardTop({
 item,
 posicao,
}: {
 item: RankingRow
 posicao: number
}) {
 const medalha = posicao === 1 ? '🥇' : posicao === 2 ? '🥈' : '🥉'

 return (
 <div className="bg-white border border-zinc-200 p-5 md:p-6">
 <div className="flex items-center justify-between gap-3">
 <div className="text-4xl">{medalha}</div>
 <div className="px-3 py-2 bg-zinc-100 border border-zinc-200 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-700">
 Top {posicao}
 </div>
 </div>

 <div className="mt-5">
 <div className="text-2xl font-semibold text-zinc-900 break-words">
 {item.nick}
 </div>

 <div className="grid grid-cols-2 gap-3 mt-4">
 <MiniResumo titulo="Vitórias" valor={String(numeroSeguro(item.vitorias))} />
 <MiniResumo titulo="Derrotas" valor={String(numeroSeguro(item.derrotas))} />
 <MiniResumo titulo="Partidas" valor={String(numeroSeguro(item.partidas))} />
 <MiniResumo titulo="Winrate" valor={`${Number(item.winrate || 0).toFixed(0)}%`} />
 </div>
 </div>
 </div>
 )
}

function LinhaRanking({
 item,
 posicao,
}: {
 item: RankingRow
 posicao: number
}) {
 return (
 <div className="px-5 md:px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
 <div className="flex items-center gap-4 min-w-0">
 <div className="w-10 h-10 border border-zinc-200 bg-zinc-50 flex items-center justify-center font-semibold text-zinc-900 shrink-0">
 {posicao}
 </div>

 <div className="min-w-0">
 <div className="text-base font-semibold text-zinc-900 break-words">
 {item.nick}
 </div>
 <div className="text-sm text-zinc-500 font-semibold mt-1">
 {numeroSeguro(item.vitorias)}W / {numeroSeguro(item.derrotas)}L
 </div>
 </div>
 </div>

 <div className="grid grid-cols-3 md:grid-cols-4 gap-3 md:min-w-[420px]">
 <IndicadorLinha
 icon={<Medal size={15} />}
 label="Vitórias"
 valor={String(numeroSeguro(item.vitorias))}
 />
 <IndicadorLinha
 icon={<Swords size={15} />}
 label="Partidas"
 valor={String(numeroSeguro(item.partidas))}
 />
 <IndicadorLinha
 icon={<TrendingUp size={15} />}
 label="Winrate"
 valor={`${Number(item.winrate || 0).toFixed(0)}%`}
 />
 <IndicadorLinha
 icon={<Trophy size={15} />}
 label="Derrotas"
 valor={String(numeroSeguro(item.derrotas))}
 />
 </div>
 </div>
 )
}

function IndicadorLinha({
 icon,
 label,
 valor,
}: {
 icon: React.ReactNode
 label: string
 valor: string
}) {
 return (
 <div className=" border border-zinc-200 bg-zinc-50 px-3 py-3">
 <div className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
 {icon}
 {label}
 </div>
 <div className="text-sm font-semibold text-zinc-900 mt-2">{valor}</div>
 </div>
 )
}

function MiniResumo({
 titulo,
 valor,
 menor = false,
}: {
 titulo: string
 valor: string
 menor?: boolean
}) {
 return (
 <div className=" border border-zinc-200 bg-zinc-50 p-3 min-w-0">
 <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
 {titulo}
 </div>
 <div
 className={`${menor ? 'text-base' : 'text-2xl md:text-3xl'} font-semibold mt-2 leading-none text-zinc-900 break-words`}
 >
 {valor}
 </div>
 </div>
 )
}

function numeroSeguro(valor: number | null | undefined) {
 const numero = Number(valor)
 return Number.isFinite(numero) ? numero : 0
}