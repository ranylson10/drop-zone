'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
 Search,
 Swords,
 Trophy,
 CircleDollarSign,
 LayoutGrid,
 ShieldCheck,
 Flame,
 Plus,
 CalendarDays,
 Crosshair,
 Users,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { TIPOS_COMPETICAO, resolverTipoCompeticao } from './components/tiposCompeticao'
import { getCampeonatoHref } from './utils/getCampeonatoHref'

function formatarMoeda(valor: number | string | null | undefined) {
 const numero = Number(valor || 0)
 return numero.toLocaleString('pt-BR', {
 style: 'currency',
 currency: 'BRL',
 })
}

function getLogoFallback(nome?: string | null) {
 const letra = (nome || 'C').trim().charAt(0).toUpperCase()
 return letra || 'C'
}

function formatarData(data?: string | null) {
 if (!data) return 'N/I'
 return new Date(data).toLocaleDateString('pt-BR')
}

function formatarDataCurta(data?: string | null) {
 if (!data) return 'DATA N/I'
 try {
 const valor = new Date(data)
 return valor.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '').toUpperCase()
 } catch {
 return 'DATA N/I'
 }
}

function normalizarTexto(valor?: string | null) {
 return String(valor || '').toLowerCase().trim()
}


function getTipoIcone(slug?: string | null) {
 const key = normalizarTexto(slug)

 const mapa: Record<string, any> = {
 confronto: Swords,
 confrontos: Swords,
 diario: Flame,
 xtreino: Crosshair,
 copa: Trophy,
 liga: LayoutGrid,
 apostado: CircleDollarSign,
 apostados: CircleDollarSign,
 }

 return mapa[key] || Trophy
}

function getPaisFlag(valor?: string | null) {
 const key = normalizarTexto(valor)
 if (!key) return '🏳️'
 if (key.includes('brasil') || key === 'br' || key.includes('brazil')) return '🇧🇷'
 if (key.includes('latam')) return '🌎'
 if (key.includes('global') || key.includes('mundial')) return '🌐'
 return '🏳️'
}

function getTipoVisual(slug?: string | null) {
 const key = normalizarTexto(slug)

 const mapa: Record<string, { badge: string; chip: string; bar: string; border: string; text: string }> = {
 confrontos: {
 badge: 'border-red-200 bg-red-50 text-red-700',
 chip: 'border-red-200 bg-red-50 text-red-700',
 bar: 'bg-red-500',
 border: 'border-l-red-500',
 text: 'text-red-700',
 },
 diario: {
 badge: 'border-sky-200 bg-sky-50 text-sky-700',
 chip: 'border-sky-200 bg-sky-50 text-sky-700',
 bar: 'bg-sky-500',
 border: 'border-l-sky-500',
 text: 'text-sky-700',
 },
 xtreino: {
 badge: 'border-emerald-200 bg-emerald-50 text-emerald-700',
 chip: 'border-emerald-200 bg-emerald-50 text-emerald-700',
 bar: 'bg-emerald-500',
 border: 'border-l-emerald-500',
 text: 'text-emerald-700',
 },
 copa: {
 badge: 'border-violet-200 bg-violet-50 text-violet-700',
 chip: 'border-violet-200 bg-violet-50 text-violet-700',
 bar: 'bg-violet-500',
 border: 'border-l-violet-500',
 text: 'text-violet-700',
 },
 liga: {
 badge: 'border-amber-200 bg-amber-50 text-amber-700',
 chip: 'border-amber-200 bg-amber-50 text-amber-700',
 bar: 'bg-amber-500',
 border: 'border-l-amber-500',
 text: 'text-amber-700',
 },
 apostados: {
 badge: 'border-orange-200 bg-orange-50 text-orange-700',
 chip: 'border-orange-200 bg-orange-50 text-orange-700',
 bar: 'bg-orange-500',
 border: 'border-l-orange-500',
 text: 'text-orange-700',
 },
 }

 return mapa[key] || {
 badge: 'border-zinc-200 bg-zinc-50 text-zinc-700',
 chip: 'border-zinc-200 bg-zinc-50 text-zinc-700',
 bar: 'bg-[#2563eb]',
 border: 'border-l-[#2563eb]',
 text: 'text-[#2563eb]',
 }
}

function normalizarStatusLista(status?: string | null) {
 const value = normalizarTexto(status || 'rascunho')
 if (value.includes('abert') || value.includes('inscri')) {
 return { label: 'Aberto', className: 'border-emerald-200 bg-emerald-50 text-emerald-700' }
 }
 if (value.includes('andamento') || value.includes('ao vivo') || value.includes('live')) {
 return { label: 'Ao vivo', className: 'border-sky-200 bg-sky-50 text-sky-700' }
 }
 if (value.includes('final')) {
 return { label: 'Finalizado', className: 'border-zinc-200 bg-zinc-100 text-zinc-600' }
 }
 if (value.includes('cancel')) {
 return { label: 'Cancelado', className: 'border-red-200 bg-red-50 text-red-700' }
 }
 return { label: 'Rascunho', className: 'border-amber-200 bg-amber-50 text-amber-700' }
}

function contatosInscricaoCampeonato(camp: any) {
 const contatos = Array.isArray(camp?.whatsapp_contatos) ? camp.whatsapp_contatos : []
 const normalizados = contatos
 .map((contato: any) => ({
 nome: String(contato?.nome || '').trim(),
 numero: String(contato?.numero || '').replace(/\D/g, ''),
 }))
 .filter((contato: any) => contato.nome && contato.numero)

 if (normalizados.length) return normalizados

 const numero = String(camp?.whatsapp_suporte || camp?.whatsapp_contato || '').replace(/\D/g, '')
 return numero ? [{ nome: 'Vendas', numero }] : []
}

function linkInscricaoWhatsApp(camp: any, contato: { nome: string; numero: string }) {
 const numero = String(contato.numero || '').replace(/\D/g, '')
 const mensagem = `Ola, vim pelo Drop Zone e quero comprar vaga no campeonato ${camp?.nome || ''}.`
 return `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`
}

function getArenaPalette(slug?: string | null, index = 0) {
 const key = normalizarTexto(slug)
 const palettes: Record<string, { field: string; sky: string; stripe: string; button: string; glow: string }> = {
 diario: {
 field: 'from-[#0f9f59] via-[#45c35f] to-[#0b7a34]',
 sky: 'from-[#0c4a6e] via-[#0284c7] to-[#22c55e]',
 stripe: 'bg-[#fb7185]',
 button: 'from-[#ff2f8a] to-[#ff7a2f]',
 glow: 'rgba(251,113,133,0.36)',
 },
 copa: {
 field: 'from-[#166534] via-[#84cc16] to-[#15803d]',
 sky: 'from-[#1d4ed8] via-[#4f46e5] to-[#14b8a6]',
 stripe: 'bg-[#f97316]',
 button: 'from-[#f97316] to-[#facc15]',
 glow: 'rgba(249,115,22,0.36)',
 },
 liga: {
 field: 'from-[#047857] via-[#22c55e] to-[#65a30d]',
 sky: 'from-[#064e3b] via-[#0f766e] to-[#0ea5e9]',
 stripe: 'bg-[#22d3ee]',
 button: 'from-[#06b6d4] to-[#2563eb]',
 glow: 'rgba(34,211,238,0.34)',
 },
 xtreino: {
 field: 'from-[#14532d] via-[#16a34a] to-[#4d7c0f]',
 sky: 'from-[#111827] via-[#166534] to-[#65a30d]',
 stripe: 'bg-[#a3e635]',
 button: 'from-[#22c55e] to-[#84cc16]',
 glow: 'rgba(132,204,22,0.32)',
 },
 confrontos: {
 field: 'from-[#7f1d1d] via-[#ef4444] to-[#f97316]',
 sky: 'from-[#111827] via-[#7f1d1d] to-[#dc2626]',
 stripe: 'bg-[#38bdf8]',
 button: 'from-[#ef4444] to-[#f97316]',
 glow: 'rgba(239,68,68,0.35)',
 },
 apostados: {
 field: 'from-[#78350f] via-[#f59e0b] to-[#16a34a]',
 sky: 'from-[#111827] via-[#92400e] to-[#ea580c]',
 stripe: 'bg-[#facc15]',
 button: 'from-[#facc15] to-[#f97316]',
 glow: 'rgba(250,204,21,0.34)',
 },
 }

 const fallback = [
 palettes.diario,
 palettes.copa,
 palettes.liga,
 palettes.xtreino,
 palettes.confrontos,
 palettes.apostados,
 ][Math.abs(index) % 6]

 return palettes[key] || fallback
}

function CampeonatoShowCard({
 camp,
 index = 0,
 compacto = false,
 onInscrever,
}: {
 camp: any
 index?: number
 compacto?: boolean
 onInscrever?: (camp: any) => void
}) {
 const tipoCompeticao = resolverTipoCompeticao(camp)
 const meta = TIPOS_COMPETICAO.find((item) => item.slug === tipoCompeticao)
 const palette = getArenaPalette(tipoCompeticao, index)
 const gratuito = Number(camp.valor_vaga || 0) === 0
 const premio = Number(camp.valor_premiacao || 0)
 const inicio = camp.data_inicio || camp.created_at
 const bannerUrl = camp.banner_url || camp.imagem_url || camp.capa_url || null
 const produtora = camp.produtoras?.nome || camp.organizador_nome || 'Organizacao'
 const plataforma = camp.plataforma || camp.modo_jogo || 'Mobile'

 return (
 <Link
 href={getCampeonatoHref(camp.id, tipoCompeticao)}
 className={[
 'group relative block shrink-0 overflow-hidden rounded-[18px] border border-white/70 bg-white p-0 text-white transition active:scale-[0.99]',
 compacto ? 'w-[300px] max-md:w-[86vw] md:w-full' : 'w-full',
 ].join(' ')}
 >
 <div className={`relative h-[132px] overflow-hidden rounded-[18px] bg-gradient-to-br ${palette.field}`}>
 {bannerUrl ? (
 <img src={bannerUrl} alt={camp.nome || 'Campeonato'} className="absolute inset-0 h-full w-full object-cover opacity-30 mix-blend-overlay" />
 ) : null}
 <div className={`absolute inset-0 bg-gradient-to-br ${palette.sky} opacity-55`} />
 <div className="absolute inset-0 opacity-35 [background-image:radial-gradient(circle_at_15%_20%,rgba(255,255,255,0.85)_0_2px,transparent_3px),radial-gradient(circle_at_82%_28%,rgba(255,255,255,0.75)_0_1px,transparent_3px),linear-gradient(90deg,rgba(255,255,255,0.11)_1px,transparent_1px),linear-gradient(0deg,rgba(255,255,255,0.10)_1px,transparent_1px)] [background-size:80px_70px,64px_64px,28px_28px,28px_28px]" />
 <div className="absolute -bottom-12 left-1/2 h-24 w-[120%] -translate-x-1/2 rounded-[50%] border-t-3 border-white/35 bg-black/10" />
 <div className="absolute bottom-[52px] left-4 right-4 h-[2px] bg-white/45" />
 <div className="absolute bottom-0 left-1/2 h-[72px] w-[2px] -translate-x-1/2 bg-white/30" />
 <div className="absolute -left-9 bottom-4 h-20 w-20 rounded-full border-[12px] border-white/95 bg-black">
 <div className="absolute inset-3 rounded-full border border-black/20 bg-white" />
 </div>

 <div className="relative z-10 flex h-full flex-col p-3">
 <div className="flex items-start justify-between gap-2">
 <div className="min-w-0">
 <div className="inline-flex rounded-full bg-black/25 px-2 py-1 text-[8px] font-black uppercase tracking-[0.14em] text-white/90">
 {meta?.titulo || 'Campeonato'} - {formatarDataCurta(inicio)}
 </div>
 <h3 className="mt-2 line-clamp-1 text-[16px] font-black uppercase leading-none tracking-tight text-white">
 {camp.nome || 'Campeonato sem nome'}
 </h3>
 <p className="mt-1 line-clamp-1 text-[10px] font-bold uppercase text-white/80">{produtora}</p>
 </div>
 <div className="shrink-0 rounded-full bg-white px-2 py-1 text-[10px] font-black text-slate-950">
 {getPaisFlag(camp.regiao)}
 </div>
 </div>

 <div className="absolute inset-x-3 bottom-3 rounded-[16px] bg-white px-3 py-2 text-slate-950">
 <div className="grid grid-cols-[42px_minmax(0,1fr)_auto] items-center gap-2">
 <div className="min-w-0 text-center">
 <div className="mx-auto flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-slate-100 bg-slate-100">
 {camp.logo_url ? (
 <img src={camp.logo_url} alt={camp.nome || 'Campeonato'} className="h-full w-full object-cover" />
 ) : (
 <span className="text-base font-black text-[#008069]">{getLogoFallback(camp.nome)}</span>
 )}
 </div>
 </div>

 <div className="min-w-0">
 <div className="flex items-center gap-2">
 <div className="text-[8px] font-black uppercase text-slate-400">VS</div>
 <div className={`h-1.5 w-11 rounded-full ${palette.stripe}`} />
 <div className="truncate text-[8px] font-bold uppercase text-slate-500">{plataforma}</div>
 </div>
 <div className="mt-1 grid grid-cols-2 gap-2">
 <div className="min-w-0">
 <div className="text-[7px] font-black uppercase tracking-[0.12em] text-slate-400">Prize pool</div>
 <div className="truncate text-[13px] font-black text-[#f97316]">{premio > 0 ? formatarMoeda(premio) : 'A definir'}</div>
 </div>
 <div className="min-w-0">
 <div className="text-[7px] font-black uppercase tracking-[0.12em] text-slate-400">Inscricao</div>
 <div className={`truncate text-[12px] font-black ${gratuito ? 'text-emerald-600' : 'text-slate-950'}`}>{gratuito ? 'Gratis' : formatarMoeda(camp.valor_vaga || 0)}</div>
 </div>
 </div>
 </div>

 <button
 type="button"
 onClick={(event) => {
 event.preventDefault()
 event.stopPropagation()
 onInscrever?.(camp)
 }}
 className={`inline-flex h-9 items-center justify-center rounded-full bg-gradient-to-r ${palette.button} px-4 text-[10px] font-black uppercase tracking-[0.12em] text-white`}
 >
 Inscrever-se
 </button>
 </div>
 </div>
 </div>
 </div>
 </Link>
 )
}

export default function ListaCampeonatos() {
 const [campeonatos, setCampeonatos] = useState<any[]>([])
 const [loading, setLoading] = useState(true)
 const [busca, setBusca] = useState('')
 const [regiao, setRegiao] = useState('')
 const [plataforma, setPlataforma] = useState('')
 const [tipoCampeonato, setTipoCampeonato] = useState('')
 const [categoria, setCategoria] = useState('')
 const [premioMin, setPremioMin] = useState('')
 const [gratis, setGratis] = useState(false)
 const [tipoCompeticaoAtivo, setTipoCompeticaoAtivo] = useState('todos')
 const [selecionarContato, setSelecionarContato] = useState<{ camp: any; contatos: { nome: string; numero: string }[] } | null>(null)

 function abrirInscricao(camp: any) {
 const contatos = contatosInscricaoCampeonato(camp)
 if (contatos.length === 1) {
 window.open(linkInscricaoWhatsApp(camp, contatos[0]), '_blank', 'noopener,noreferrer')
 return
 }
 if (contatos.length > 1) {
 setSelecionarContato({ camp, contatos })
 return
 }
 window.location.href = getCampeonatoHref(camp.id, resolverTipoCompeticao(camp))
 }

 useEffect(() => {
 const fetchCamps = async () => {
 setLoading(true)
 try {
 const { data: camps, error } = await supabase
 .from('campeonatos')
 .select('*, produtoras(nome)')
 .order('created_at', { ascending: false })

 if (error) throw error

 const { data: rankingData, error: rankingError } = await supabase
 .from('vw_lealt_ranking_campeonatos')
 .select('campeonato_id, posicao, tier, score_total')
 .order('posicao', { ascending: true })

 if (rankingError) console.error('Erro ao carregar ranking oficial dos campeonatos:', rankingError)

 const rankingMap = new Map<string, any>()
 ;(rankingData || []).forEach((row: any) => {
 if (row?.campeonato_id) rankingMap.set(String(row.campeonato_id), row)
 })

 const campsComRanking = (camps || []).map((camp: any) => {
 const ranking = rankingMap.get(String(camp.id))
 return {
 ...camp,
 rank_posicao: ranking?.posicao || null,
 tier: ranking?.tier || 'E',
 score_total: Number(ranking?.score_total || 0),
 }
 })

 setCampeonatos(campsComRanking)
 } catch (err) {
 console.error('Erro ao carregar campeonatos:', err)
 } finally {
 setLoading(false)
 }
 }

 fetchCamps()
 }, [])

 const campeonatosFiltrados = useMemo(() => {
 return campeonatos.filter((camp) => {
 const tipoCompeticao = resolverTipoCompeticao(camp)

 const termo = normalizarTexto(busca)
 const matchBusca =
 !termo ||
 normalizarTexto(camp.nome).includes(termo) ||
 String(camp.edicao || '').includes(termo) ||
 String(camp.id || '').includes(termo) ||
 normalizarTexto(camp.produtoras?.nome).includes(termo)

 const matchRegiao = !regiao || camp.regiao === regiao
 const matchPlataforma = !plataforma || camp.plataforma === plataforma
 const matchTipoCampeonato = !tipoCampeonato || camp.tipo_campeonato === tipoCampeonato
 const matchCategoria = !categoria || camp.categoria === categoria
 const matchPremio = !premioMin || Number(camp.valor_premiacao || 0) >= Number(premioMin)
 const matchGratis = !gratis || Number(camp.valor_vaga || 0) === 0
 const matchTipoCompeticao =
 tipoCompeticaoAtivo === 'todos' || tipoCompeticao === tipoCompeticaoAtivo

 return (
 matchBusca &&
 matchRegiao &&
 matchPlataforma &&
 matchTipoCampeonato &&
 matchCategoria &&
 matchPremio &&
 matchGratis &&
 matchTipoCompeticao
 )
 })
 }, [
 campeonatos,
 busca,
 regiao,
 plataforma,
 tipoCampeonato,
 categoria,
 premioMin,
 gratis,
 tipoCompeticaoAtivo,
 ])

 const resumo = useMemo(() => {
 const total = campeonatosFiltrados.length
 const gratisQtd = campeonatosFiltrados.filter(
 (camp) => Number(camp.valor_vaga || 0) === 0,
 ).length
 const pagosQtd = total - gratisQtd
 const premiacaoTotal = campeonatosFiltrados.reduce(
 (acc, camp) => acc + Number(camp.valor_premiacao || 0),
 0,
 )

 return {
 total,
 gratisQtd,
 pagosQtd,
 premiacaoTotal,
 }
 }, [campeonatosFiltrados])

 const ultimosCampeonatos = useMemo(() => {
 return [...campeonatos]
 .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
 .slice(0, 6)
 }, [campeonatos])

 const tiposVisiveis = useMemo(() => {
 return TIPOS_COMPETICAO.filter((item) => item.usaCampeonatos !== false)
 }, [])

 return (
 <div className="min-h-screen bg-[#f7f7f7] text-[#142340]">
 <style jsx>{`
 @keyframes campeonatos-marquee {
 from {
 transform: translateX(0);
 }
 to {
 transform: translateX(-50%);
 }
 }
 `}</style>

 <div className="mx-auto max-w-[1520px] px-4 pb-6 pt-5">
 <section className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
 <div>
 <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#2563eb]">
 <Trophy size={18} />
 Campeonatos
 </div>
 <h1 className="text-[20px] font-semibold tracking-tight text-[#142340] md:text-[22px]">
 Mercado de torneios
 </h1>
 <p className="mt-1 text-xs font-medium text-zinc-500">
 Confrontos, diários, xtreinos, copas, ligas e apostados em um painel compacto.
 </p>
 </div>

 <Link
 href="/campeonatos/nova"
 className="inline-flex h-9 items-center justify-center gap-2 bg-[#2563eb] px-4 text-[12px] font-medium uppercase tracking-wide text-[#142340] transition hover:bg-[#1d4ed8]"
 >
 <Plus size={16} />
 Criar campeonato
 </Link>
 </section>

 <section className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4">
 <div className="border border-zinc-200 bg-white p-3">
 <div className="flex items-center gap-2 text-[10px] font-medium uppercase text-zinc-500">
 <LayoutGrid size={15} className="text-[#2563eb]" />
 Visíveis
 </div>
 <div className="mt-1 text-[18px] font-semibold text-[#142340]">{resumo.total}</div>
 <div className="text-[10px] font-medium uppercase text-zinc-500">campeonatos</div>
 </div>

 <div className="border border-zinc-200 bg-white p-3">
 <div className="flex items-center gap-2 text-[10px] font-medium uppercase text-zinc-500">
 <ShieldCheck size={15} className="text-[#2563eb]" />
 Gratuitos
 </div>
 <div className="mt-1 text-[18px] font-semibold text-[#142340]">{resumo.gratisQtd}</div>
 <div className="text-[10px] font-medium uppercase text-zinc-500">inscrição grátis</div>
 </div>

 <div className="border border-zinc-200 bg-white p-3">
 <div className="flex items-center gap-2 text-[10px] font-medium uppercase text-zinc-500">
 <Swords size={15} className="text-[#2563eb]" />
 Pagos
 </div>
 <div className="mt-1 text-[18px] font-semibold text-[#142340]">{resumo.pagosQtd}</div>
 <div className="text-[10px] font-medium uppercase text-zinc-500">valor de vaga</div>
 </div>

 <div className="border border-zinc-200 bg-white p-3">
 <div className="flex items-center gap-2 text-[10px] font-medium uppercase text-zinc-500">
 <CircleDollarSign size={15} className="text-[#2563eb]" />
 Premiação
 </div>
 <div className="mt-1 text-[18px] font-semibold text-[#142340]">
 {formatarMoeda(resumo.premiacaoTotal)}
 </div>
 <div className="text-[10px] font-medium uppercase text-zinc-500">somada</div>
 </div>
 </section>

 <section className="mb-4 border border-zinc-200 bg-white max-md:border-0">
 <div className="flex items-center justify-between px-4 py-2 max-md:px-3">
 <div className="flex items-center gap-2 text-[12px] font-semibold uppercase ">
 <Swords size={16} className="text-[#2563eb]" />
 Modos competitivos
 </div>
 <span className="text-[10px] font-medium uppercase text-zinc-500">selecione um tipo</span>
 </div>

 <div className="overflow-x-auto px-3 pb-3 max-md:px-3">
 <div className="flex min-w-max gap-3 max-md:gap-2">
 {tiposVisiveis.map((item) => {
 const ativo = tipoCompeticaoAtivo === item.slug
 return (
 <button
 key={item.slug}
 onClick={() => setTipoCompeticaoAtivo(item.slug)}
 className={`relative w-[185px] shrink-0 overflow-hidden border border-l-4 p-3 text-left transition ${
 ativo
 ? `${getTipoVisual(item.slug).badge} ${getTipoVisual(item.slug).border}`
 : `border-zinc-200 bg-white text-[#142340] hover:bg-zinc-50 ${getTipoVisual(item.slug).border}`
 }`}
 >
 <div className="relative z-10">
 <div className={`mb-2 inline-flex items-center gap-1.5 px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.18em] ${
 ativo ? 'bg-zinc-100/15 text-[#142340]' : 'bg-zinc-100/30 text-zinc-500'
 }`}>
 <Swords size={10} />
 {item.badge}
 </div>

 <div className="truncate text-[15px] font-semibold uppercase text-[#142340] ">
 {item.titulo}
 </div>

 <div className={`mt-1 line-clamp-2 text-[11px] font-semibold leading-5 ${
 ativo ? 'text-zinc-600' : 'text-zinc-500'
 }`}>
 {item.subtitulo}
 </div>
 </div>
 </button>
 )
 })}
 </div>
 </div>
 </section>

 <section className="mb-4 border border-zinc-200 bg-white max-md:border-0">
 <div className="flex flex-col gap-3 px-4 py-2">
 <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
 <div className="flex flex-wrap gap-2">
 <button
 onClick={() => setTipoCompeticaoAtivo('todos')}
 className={`px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] transition ${
 tipoCompeticaoAtivo === 'todos'
 ? 'bg-[#2563eb] text-[#142340]'
 : 'border border-zinc-200 bg-zinc-50 text-zinc-600 hover:border-[#2563eb]'
 }`}
 >
 Todos
 </button>

 {tiposVisiveis.map((item) => (
 <button
 key={`tab-${item.slug}`}
 onClick={() => setTipoCompeticaoAtivo(item.slug)}
 className={`px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] transition ${
 tipoCompeticaoAtivo === item.slug
 ? 'bg-[#2563eb] text-[#142340]'
 : 'border border-zinc-200 bg-zinc-50 text-zinc-600 hover:border-[#2563eb]'
 }`}
 >
 {item.titulo}
 </button>
 ))}
 </div>

 <div className="relative lg:w-[420px]">
 <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
 <input
 value={busca}
 onChange={(e) => setBusca(e.target.value)}
 placeholder="Buscar campeonato..."
 className="h-9 w-full border border-zinc-200 bg-white pl-9 pr-3 text-[12px] font-medium text-[#142340] outline-none placeholder:text-zinc-500 focus:border-[#2563eb]"
 />
 </div>
 </div>

 <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-6">
 <select
 value={regiao}
 onChange={(e) => setRegiao(e.target.value)}
 className="h-9 border border-zinc-200 bg-white px-3 text-[12px] font-medium text-[#142340] outline-none focus:border-[#2563eb]"
 >
 <option value="">Região</option>
 <option>Brasil</option>
 <option>LATAM</option>
 <option>Internacional</option>
 </select>

 <select
 value={plataforma}
 onChange={(e) => setPlataforma(e.target.value)}
 className="h-9 border border-zinc-200 bg-white px-3 text-[12px] font-medium text-[#142340] outline-none focus:border-[#2563eb]"
 >
 <option value="">Plataforma</option>
 <option>Mobile</option>
 <option>Emulador</option>
 <option>Misto</option>
 </select>

 <select
 value={tipoCampeonato}
 onChange={(e) => setTipoCampeonato(e.target.value)}
 className="h-9 border border-zinc-200 bg-white px-3 text-[12px] font-medium text-[#142340] outline-none focus:border-[#2563eb]"
 >
 <option value="">Nível</option>
 <option>Amador</option>
 <option>Semi-profissional</option>
 <option>Profissional</option>
 <option>Comunitário</option>
 </select>

 <select
 value={categoria}
 onChange={(e) => setCategoria(e.target.value)}
 className="h-9 border border-zinc-200 bg-white px-3 text-[12px] font-medium text-[#142340] outline-none focus:border-[#2563eb]"
 >
 <option value="">Categoria</option>
 <option>Solo</option>
 <option>Duo</option>
 <option>Squad</option>
 </select>

 <input
 type="number"
 value={premioMin}
 onChange={(e) => setPremioMin(e.target.value)}
 placeholder="Premiação mínima"
 className="h-9 border border-zinc-200 bg-white px-3 text-[12px] font-medium text-[#142340] outline-none placeholder:text-zinc-500 focus:border-[#2563eb]"
 />

 <label className="flex h-9 items-center gap-2 border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-600">
 <input
 type="checkbox"
 checked={gratis}
 onChange={(e) => setGratis(e.target.checked)}
 className="h-3.5 w-3.5 accent-[#2563eb]"
 />
 Só grátis
 </label>
 </div>
 </div>
 </section>

 {ultimosCampeonatos.length > 0 && (
 <section className="mb-4 overflow-hidden border border-zinc-200 bg-white max-md:border-0 max-md:bg-transparent">
 <div className="flex items-center justify-between px-4 py-2 max-md:px-3">
 <div className="flex items-center gap-2 text-[12px] font-semibold uppercase ">
 <Flame size={16} className="text-[#2563eb]" />
 Últimos campeonatos
 </div>
 <span className="text-[10px] font-medium uppercase text-zinc-500">recentes</span>
 </div>

 <div className="overflow-hidden px-3 pb-4 max-md:overflow-x-auto max-md:px-2">
 <div className="flex min-w-max gap-4 md:animate-[campeonatos-marquee_34s_linear_infinite] md:hover:[animation-play-state:paused] max-md:gap-3">
 {[...ultimosCampeonatos, ...ultimosCampeonatos].map((camp, index) => (
 <CampeonatoShowCard key={`recente-${camp.id}-${index}`} camp={camp} index={index} compacto onInscrever={abrirInscricao} />
 ))}
 </div>
 </div>
 </section>
 )}

 <section className="border border-zinc-200 bg-white">
 <div className="flex items-center justify-between px-4 py-2">
 <div className="flex items-center gap-2 text-[12px] font-semibold uppercase ">
 <Trophy size={16} className="text-[#2563eb]" />
 Ranking oficial dos campeonatos
 </div>
 <span className="text-[10px] font-medium uppercase text-zinc-500">
 clique para abrir perfil
 </span>
 </div>

 {loading ? (
 <div className="py-16 text-center text-[12px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
 Carregando campeonatos...
 </div>
 ) : campeonatosFiltrados.length === 0 ? (
 <div className="py-16 text-center text-[12px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
 Nenhum campeonato encontrado.
 </div>
 ) : (
 <>
 <div className="space-y-4 bg-[#eef7f0] px-2 py-3 md:hidden">
 {campeonatosFiltrados.map((camp, index) => (
 <CampeonatoShowCard key={`mobile-${camp.id}`} camp={camp} index={index} />
 ))}
 </div>

 <div className="hidden px-3 pb-3 md:block">
 <div className="overflow-hidden border border-zinc-200">
 <div className="grid grid-cols-[minmax(280px,1.8fr)_78px_120px_130px_140px_120px_140px] items-center bg-zinc-50 px-3 py-2 text-[10px] font-medium uppercase text-zinc-500">
 <div>Campeonato</div>
 <div className="text-center">Pais</div>
 <div>Tipo</div>
 <div>Inscricao</div>
 <div>Premiacao</div>
 <div>Status</div>
 <div className="text-right">Acao</div>
 </div>

 {campeonatosFiltrados.map((camp) => {
 const tipoCompeticao = resolverTipoCompeticao(camp)
 const meta = TIPOS_COMPETICAO.find((item) => item.slug === tipoCompeticao)
 const gratuito = Number(camp.valor_vaga || 0) === 0
 const status = normalizarStatusLista(camp.status)

 return (
 <Link
 key={camp.id}
 href={getCampeonatoHref(camp.id, tipoCompeticao)}
 className="grid grid-cols-[minmax(280px,1.8fr)_78px_120px_130px_140px_120px_140px] items-center border-t border-zinc-200 px-3 py-3 text-[12px] transition hover:bg-zinc-50"
 >
 <div className="flex min-w-0 items-center gap-3">
 <div className="h-12 w-12 shrink-0 overflow-hidden border border-zinc-200 bg-zinc-100">
 {camp.logo_url ? (
 <img src={camp.logo_url} alt={camp.nome || 'Campeonato'} className="h-full w-full object-cover" />
 ) : (
 <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-emerald-600">
 {getLogoFallback(camp.nome)}
 </div>
 )}
 </div>

 <div className="min-w-0">
 <div className="truncate text-[14px] font-black uppercase text-[#142340]">
 {camp.nome || 'Campeonato sem nome'}
 </div>
 <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] font-medium uppercase text-zinc-500">
 <span className="inline-flex items-center gap-1">
 <CalendarDays size={11} />
 {formatarData(camp.created_at)}
 </span>
 <span>{camp.categoria || 'Sem categoria'}</span>
 </div>
 </div>
 </div>

 <div className="text-center text-xl leading-none">
 {getPaisFlag(camp.regiao)}
 </div>

 <div>
 <span className="inline-flex border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[10px] font-black uppercase text-[#142340]">
 {meta?.titulo || 'Tipo'}
 </span>
 </div>

 <div className={`font-semibold uppercase ${gratuito ? 'text-emerald-600' : 'text-[#142340]'}`}>
 {gratuito ? 'Gratis' : formatarMoeda(camp.valor_vaga || 0)}
 </div>

 <div className="font-black text-emerald-600">
 {formatarMoeda(camp.valor_premiacao || 0)}
 </div>

 <div>
 <span className={`inline-flex border px-2.5 py-1 text-[10px] font-black uppercase ${status.className}`}>
 {status.label}
 </span>
 </div>

 <div className="flex justify-end">
 <button
 type="button"
 onClick={(event) => {
 event.preventDefault()
 event.stopPropagation()
 abrirInscricao(camp)
 }}
 className="inline-flex h-9 items-center justify-center bg-[#00a884] px-4 text-[10px] font-black uppercase tracking-[0.12em] text-white transition hover:bg-[#008f72]"
 >
 Inscrever-se
 </button>
 </div>
 </Link>
 )
 })}
 </div>
 </div>
 </>
 )}
 </section>
 </div>
 {selecionarContato ? (
 <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-4 md:items-center">
 <div className="w-full max-w-[420px] border border-zinc-200 bg-white p-4 shadow-xl">
 <div className="flex items-start justify-between gap-3">
 <div>
 <div className="text-[10px] font-black uppercase tracking-[0.18em] text-[#00a884]">Escolha o vendedor</div>
 <h2 className="mt-1 text-[18px] font-black uppercase text-[#142340]">{selecionarContato.camp?.nome || 'Campeonato'}</h2>
 <p className="mt-1 text-[12px] font-semibold text-zinc-500">Selecione um contato para continuar a inscricao pelo WhatsApp.</p>
 </div>
 <button
 type="button"
 onClick={() => setSelecionarContato(null)}
 className="grid h-8 w-8 place-items-center border border-zinc-200 text-[16px] font-black text-zinc-500 hover:bg-zinc-50"
 >
 x
 </button>
 </div>

 <div className="mt-4 space-y-2">
 {selecionarContato.contatos.map((contato) => (
 <a
 key={`${contato.nome}-${contato.numero}`}
 href={linkInscricaoWhatsApp(selecionarContato.camp, contato)}
 target="_blank"
 rel="noreferrer"
 onClick={() => setSelecionarContato(null)}
 className="flex items-center justify-between gap-3 border border-zinc-200 bg-zinc-50 px-3 py-3 text-left transition hover:border-[#00a884] hover:bg-emerald-50"
 >
 <div className="min-w-0">
 <div className="truncate text-[13px] font-black uppercase text-[#142340]">{contato.nome}</div>
 <div className="mt-0.5 text-[11px] font-semibold text-zinc-500">{contato.numero}</div>
 </div>
 <span className="shrink-0 bg-[#00a884] px-3 py-2 text-[10px] font-black uppercase text-white">WhatsApp</span>
 </a>
 ))}
 </div>
 </div>
 </div>
 ) : null}
 </div>
 )
}
