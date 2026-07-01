'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
 ChevronLeft,
 Loader2,
 AlertTriangle,
 Trophy,
 Swords,
 TrendingUp,
 Shield,
 Clock3,
} from 'lucide-react'

type PerfilJogoRow = {
 id: string
 user_id: string
 nick: string
 foto_capa: string | null
 plataforma: string | null
 servidor: string | null
 funcao: string | null
 ativo: boolean | null
 created_at?: string | null
 updated_at?: string | null
}

type ConfrontoTimeRow = {
 id: string
 confronto_id: string
 lado: 'a' | 'b'
 nome_time: string | null
 capitao_user_id: string | null
 status_pagamento: string
 valor_pago: number | string
 pago_em: string | null
 created_at: string
 updated_at: string
 confrontos_apostados?: {
 id: string
 titulo: string
 valor_por_lado: number | string
 valor_total: number | string | null
 status: string
 vencedor_lado: 'a' | 'b' | null
 created_at: string
 data_partida: string | null
 } | null
}

export default function HistoricoPerfilPage() {
 const params = useParams()
 const userId = String(params?.id || '')

 const [loading, setLoading] = useState(true)
 const [erro, setErro] = useState('')
 const [perfil, setPerfil] = useState<PerfilJogoRow | null>(null)
 const [lista, setLista] = useState<ConfrontoTimeRow[]>([])

 useEffect(() => {
 if (userId) carregar()
 }, [userId])

 async function carregar() {
 setLoading(true)
 setErro('')

 try {
 const [{ data: perfisData, error: perfisError }, { data: historicoData, error: historicoError }] =
 await Promise.all([
 supabase
 .from('perfis_jogo')
 .select('*')
 .eq('user_id', userId),
 supabase
 .from('confrontos_times')
 .select(`
 *,
 confrontos_apostados (
 id,
 titulo,
 valor_por_lado,
 valor_total,
 status,
 vencedor_lado,
 created_at,
 data_partida
 )
 `)
 .eq('capitao_user_id', userId)
 .order('created_at', { ascending: false }),
 ])

 if (perfisError) throw perfisError
 if (historicoError) throw historicoError

 const perfis = ((perfisData || []) as PerfilJogoRow[]).filter(Boolean)
 const ativos = perfis.filter((item) => item.ativo === true)
 const basePerfil = ativos.length > 0 ? ativos : perfis

 const perfilEscolhido =
 [...basePerfil].sort((a, b) => {
 const aUpdated = a.updated_at ? new Date(a.updated_at).getTime() : 0
 const bUpdated = b.updated_at ? new Date(b.updated_at).getTime() : 0
 if (bUpdated !== aUpdated) return bUpdated - aUpdated

 const aCreated = a.created_at ? new Date(a.created_at).getTime() : 0
 const bCreated = b.created_at ? new Date(b.created_at).getTime() : 0
 return bCreated - aCreated
 })[0] || null

 setPerfil(perfilEscolhido)
 setLista((historicoData || []) as ConfrontoTimeRow[])
 } catch (err) {
 console.error(err)
 setErro('Não foi possível carregar o histórico agora.')
 setPerfil(null)
 setLista([])
 } finally {
 setLoading(false)
 }
 }

 const resumo = useMemo(() => {
 const partidasFinalizadas = lista.filter(
 (item) => item.confrontos_apostados?.vencedor_lado !== null
 )

 const vitorias = partidasFinalizadas.filter(
 (item) => item.confrontos_apostados?.vencedor_lado === item.lado
 ).length

 const derrotas = partidasFinalizadas.filter(
 (item) =>
 item.confrontos_apostados?.vencedor_lado !== null &&
 item.confrontos_apostados?.vencedor_lado !== item.lado
 ).length

 const total = partidasFinalizadas.length
 const winrate = total > 0 ? (vitorias / total) * 100 : 0

 return {
 total,
 vitorias,
 derrotas,
 winrate,
 }
 }, [lista])

 if (loading) {
 return (
 <div className="min-h-screen bg-[#f6f7f8] flex items-center justify-center p-6">
 <div className="bg-white border border-zinc-200 px-6 py-5 inline-flex items-center gap-3">
 <Loader2 size={20} className="animate-spin" />
 <span className="font-semibold uppercase text-sm tracking-[0.18em]">Carregando histórico...</span>
 </div>
 </div>
 )
 }

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
 <Shield size={15} />
 Histórico
 </div>
 </div>

 <div className="grid grid-cols-1 xl:grid-cols-[1.45fr_0.95fr] gap-5">
 <div className=" border border-zinc-200 bg-[#f8fbf9] p-5 md:p-7">
 <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#2563eb] mb-3">
 // HISTÓRICO DE CONFRONTOS
 </p>

 <h1 className="text-3xl md:text-5xl font-semibold leading-none text-zinc-900">
 {perfil?.nick || 'Jogador'}
 </h1>

 <p className="text-zinc-600 font-semibold mt-4 leading-7 max-w-3xl">
 Histórico de partidas, vitórias, derrotas e desempenho nos confrontos apostados.
 </p>
 </div>

 <div className=" border border-zinc-200 bg-white p-5 md:p-6">
 <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-zinc-500 mb-4">
 RESUMO
 </p>

 <div className="grid grid-cols-2 gap-3">
 <MiniResumo titulo="Partidas" valor={String(resumo.total)} />
 <MiniResumo titulo="Vitórias" valor={String(resumo.vitorias)} />
 <MiniResumo titulo="Derrotas" valor={String(resumo.derrotas)} />
 <MiniResumo titulo="Winrate" valor={`${resumo.winrate.toFixed(0)}%`} />
 </div>
 </div>
 </div>
 </div>
 </div>
 </div>

 <div className="max-w-6xl mx-auto px-4 md:px-8 xl:px-10 py-6 md:py-8 xl:py-10">
 {erro && (
 <div className="bg-red-50 border border-red-200 p-6 flex items-start gap-3 mb-6">
 <AlertTriangle className="text-red-600 shrink-0 mt-0.5" size={18} />
 <div>
 <p className="font-semibold uppercase text-red-700 text-sm">Erro</p>
 <p className="text-red-600 font-semibold text-sm mt-1">{erro}</p>
 </div>
 </div>
 )}

 {!erro && lista.length === 0 && (
 <div className="bg-white border border-zinc-200 p-10 text-center">
 <p className="text-2xl font-semibold text-zinc-900">Nenhum confronto encontrado.</p>
 </div>
 )}

 {!erro && lista.length > 0 && (
 <div className="space-y-4">
 {lista.map((item) => {
 const confronto = item.confrontos_apostados
 const resultado = getResultado(item)

 return (
 <div
 key={item.id}
 className="bg-white border border-zinc-200 p-5 md:p-6"
 >
 <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
 <div className="min-w-0">
 <div className="flex flex-wrap items-center gap-2 mb-3">
 <TagTexto
 className={resultado.className}
 label={resultado.label}
 />
 <TagTexto
 className="bg-zinc-100 text-zinc-700 border-zinc-200"
 label={`Lado ${String(item.lado).toUpperCase()}`}
 />
 <TagTexto
 className="bg-blue-50 text-blue-700 border-blue-200"
 label={textoSeguro(confronto?.status, 'Sem status')}
 />
 </div>

 <h2 className="text-2xl font-semibold text-zinc-900 leading-tight break-words">
 {textoSeguro(confronto?.titulo, 'Confronto')}
 </h2>

 <div className="flex flex-wrap items-center gap-3 mt-4">
 <div className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-500">
 <Swords size={15} />
 {textoSeguro(item.nome_time, 'Sem nome do time')}
 </div>

 <div className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-500">
 <Clock3 size={15} />
 {formatarDataHora(confronto?.data_partida || confronto?.created_at)}
 </div>
 </div>
 </div>

 <div className="grid grid-cols-2 md:grid-cols-4 gap-3 lg:min-w-[420px]">
 <IndicadorLinha
 icon={<Trophy size={15} />}
 label="Valor"
 valor={formatarMoeda(Number(confronto?.valor_por_lado || 0))}
 />
 <IndicadorLinha
 icon={<TrendingUp size={15} />}
 label="Status"
 valor={textoSeguro(confronto?.status, '—')}
 />
 <IndicadorLinha
 icon={<Shield size={15} />}
 label="Vencedor"
 valor={
 confronto?.vencedor_lado
 ? `Lado ${String(confronto.vencedor_lado).toUpperCase()}`
 : 'Pendente'
 }
 />
 <IndicadorLinha
 icon={<Swords size={15} />}
 label="Seu lado"
 valor={`Lado ${String(item.lado).toUpperCase()}`}
 />
 </div>
 </div>

 <div className="flex flex-wrap justify-end gap-3 pt-4 mt-4 border-t border-zinc-200">
 <Link
 href={`/confrontos/${item.confronto_id}`}
 className="h-11 px-5 bg-white text-[#142340] font-semibold text-[11px] uppercase tracking-[0.18em] inline-flex items-center gap-2 hover:bg-[#2563eb] transition-colors"
 >
 Ver confronto
 </Link>
 </div>
 </div>
 )
 })}
 </div>
 )}
 </div>
 </div>
 )
}

function getResultado(item: ConfrontoTimeRow) {
 const vencedor = item.confrontos_apostados?.vencedor_lado

 if (!vencedor) {
 return {
 label: 'Pendente',
 className: 'bg-yellow-50 text-yellow-800 border-yellow-200',
 }
 }

 if (vencedor === item.lado) {
 return {
 label: 'Vitória',
 className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
 }
 }

 return {
 label: 'Derrota',
 className: 'bg-red-50 text-red-700 border-red-200',
 }
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
 <div className="text-sm font-semibold text-zinc-900 mt-2 break-words">{valor}</div>
 </div>
 )
}

function MiniResumo({
 titulo,
 valor,
}: {
 titulo: string
 valor: string
}) {
 return (
 <div className=" border border-zinc-200 bg-zinc-50 p-3 min-w-0">
 <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
 {titulo}
 </div>
 <div className="text-2xl md:text-3xl font-semibold mt-2 leading-none text-zinc-900 break-words">
 {valor}
 </div>
 </div>
 )
}

function TagTexto({ label, className }: { label: string; className: string }) {
 return (
 <span className={`px-2.5 py-1 border text-[10px] font-semibold uppercase tracking-[0.14em] ${className}`}>
 {label}
 </span>
 )
}

function textoSeguro(valor: any, fallback = '') {
 const texto = String(valor || '').trim()
 return texto || fallback
}

function formatarMoeda(valor: number | null | undefined) {
 const numero = Number(valor)
 if (!Number.isFinite(numero)) return 'R$ 0,00'
 return numero.toLocaleString('pt-BR', {
 style: 'currency',
 currency: 'BRL',
 })
}

function formatarDataHora(valor?: string | null) {
 if (!valor) return '—'
 const data = new Date(valor)
 if (Number.isNaN(data.getTime())) return '—'
 return data.toLocaleString('pt-BR', {
 day: '2-digit',
 month: '2-digit',
 year: 'numeric',
 hour: '2-digit',
 minute: '2-digit',
 })
}