'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
 ChevronRight,
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

 useEffect(() => {
 const fetchCamps = async () => {
 setLoading(true)
 try {
 const { data: camps, error } = await supabase
 .from('campeonatos')
 .select('*, produtoras(nome)')
 .order('created_at', { ascending: false })

 if (error) throw error
 setCampeonatos(camps || [])
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
 <section className="mb-4 border border-zinc-200 bg-white">
 <div className="flex items-center justify-between px-4 py-2 max-md:px-3">
 <div className="flex items-center gap-2 text-[12px] font-semibold uppercase ">
 <Flame size={16} className="text-[#2563eb]" />
 Últimos campeonatos
 </div>
 <span className="text-[10px] font-medium uppercase text-zinc-500">recentes</span>
 </div>

 <div className="overflow-x-auto px-3 pb-3 max-md:px-3">
 <div className="flex min-w-max gap-3 max-md:gap-2">
 {ultimosCampeonatos.map((camp) => {
 const tipoCompeticao = resolverTipoCompeticao(camp)
 const meta = TIPOS_COMPETICAO.find((item) => item.slug === tipoCompeticao)
 const visual = getTipoVisual(tipoCompeticao)

 return (
 <Link
 key={`recente-${camp.id}`}
 href={getCampeonatoHref(camp.id, tipoCompeticao)}
 className="flex w-[250px] shrink-0 items-center gap-2 border border-zinc-200 bg-white p-2 transition hover:bg-zinc-50 max-md:w-[76px] max-md:flex-col max-md:border-0 max-md:bg-transparent max-md:p-0"
 >
 <div className="h-10 w-10 shrink-0 overflow-hidden bg-zinc-100 max-md:h-12 max-md:w-12">
 {camp.logo_url ? (
 <img src={camp.logo_url} alt={camp.nome || 'Campeonato'} className="h-full w-full object-cover" />
 ) : (
 <div className="flex h-full w-full items-center justify-center text-lg font-semibold text-emerald-600">
 {getLogoFallback(camp.nome)}
 </div>
 )}
 </div>

 <div className="min-w-0 max-md:w-full max-md:text-center">
 <div className="truncate text-sm font-semibold uppercase max-md:text-[10px] max-md:leading-tight">{camp.nome || 'Sem nome'}</div>
 <div className={`mt-1 inline-flex border px-2 py-0.5 text-[10px] font-medium uppercase max-md:hidden ${visual.chip}`}>
 {meta?.titulo || 'Campeonato'}
 </div>
 <div className="text-[10px] font-medium uppercase text-zinc-500 max-md:hidden">
 {formatarData(camp.created_at)}
 </div>
 </div>
 </Link>
 )
 })}
 </div>
 </div>
 </section>
 )}

 <section className="border border-zinc-200 bg-white">
 <div className="flex items-center justify-between px-4 py-2">
 <div className="flex items-center gap-2 text-[12px] font-semibold uppercase ">
 <Trophy size={16} className="text-[#2563eb]" />
 Todos os campeonatos
 </div>
 <span className="text-[10px] font-medium uppercase text-zinc-500">
 {campeonatosFiltrados.length} encontrados
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
 <div className="md:hidden">
 {campeonatosFiltrados.map((camp) => {
 const tipoCompeticao = resolverTipoCompeticao(camp)
 const TipoIcone = getTipoIcone(tipoCompeticao)
 const visual = getTipoVisual(tipoCompeticao)

 return (
 <Link
 key={`mobile-${camp.id}`}
 href={getCampeonatoHref(camp.id, tipoCompeticao)}
 className="flex min-h-[58px] items-center gap-3 border-t border-zinc-100 px-3 py-2 active:bg-zinc-50"
 >
 <div className="h-10 w-10 shrink-0 overflow-hidden bg-zinc-100">
 {camp.logo_url ? (
 <img src={camp.logo_url} alt={camp.nome || 'Campeonato'} className="h-full w-full object-cover" />
 ) : (
 <div className="flex h-full w-full items-center justify-center text-[13px] font-semibold text-[#2563eb]">
 {getLogoFallback(camp.nome)}
 </div>
 )}
 </div>

 <span className="min-w-0 flex-1 truncate text-[14px] font-semibold uppercase leading-tight text-[#142340]">
 {camp.nome || 'Campeonato sem nome'}
 </span>

 <span className={`inline-flex h-6 w-6 shrink-0 items-center justify-center border ${visual.badge}`} title={tipoCompeticao}>
 <TipoIcone size={13} strokeWidth={2.2} />
 </span>

 <span className="shrink-0 text-[13px] leading-none opacity-80" title={camp.regiao || 'País'}>
 {getPaisFlag(camp.regiao)}
 </span>

 <span className="shrink-0 border border-[#2563eb] bg-[#2563eb] px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-white">
 Inscrever
 </span>

 <ChevronRight size={16} className="shrink-0 text-zinc-300" />
 </Link>
 )
 })}
 </div>

 <div className="hidden overflow-x-auto px-3 pb-3 md:block">
 <div className="min-w-[1120px]">
 <div className="grid grid-cols-[2.2fr_140px_150px_130px_130px_150px_140px] bg-zinc-50 px-3 py-2 text-[10px] font-medium uppercase text-zinc-500">
 <div>Campeonato</div>
 <div>Tipo</div>
 <div>Produtora</div>
 <div>Plataforma</div>
 <div>Inscrição</div>
 <div>Premiação</div>
 <div>Ações</div>
 </div>

 {campeonatosFiltrados.map((camp) => {
 const tipoCompeticao = resolverTipoCompeticao(camp)
 const meta = TIPOS_COMPETICAO.find((item) => item.slug === tipoCompeticao)
 const visual = getTipoVisual(tipoCompeticao)
 const gratuito = Number(camp.valor_vaga || 0) === 0

 return (
 <Link
 key={camp.id}
 href={getCampeonatoHref(camp.id, tipoCompeticao)}
 className="grid grid-cols-[2.2fr_140px_150px_130px_130px_150px_140px] items-center border-t border-zinc-200 px-3 py-2 text-[12px] transition hover:bg-zinc-50"
 >
 <div className="flex min-w-0 items-center gap-3">
 <div className="h-10 w-10 shrink-0 overflow-hidden bg-zinc-100">
 {camp.logo_url ? (
 <img src={camp.logo_url} alt={camp.nome || 'Campeonato'} className="h-full w-full object-cover" />
 ) : (
 <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-emerald-600">
 {getLogoFallback(camp.nome)}
 </div>
 )}
 </div>

 <div className="min-w-0">
 <div className="truncate text-[13px] font-semibold uppercase text-[#142340]">
 {camp.nome || 'Campeonato sem nome'}
 </div>
 <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[10px] font-medium uppercase text-zinc-500">
 <span className="inline-flex items-center gap-1">
 <CalendarDays size={11} />
 {formatarData(camp.created_at)}
 </span>
 <span>{camp.regiao || 'Sem região'}</span>
 <span>{camp.categoria || 'Sem categoria'}</span>
 </div>
 </div>
 </div>

 <div>
 <span className="inline-flex border border-zinc-200 bg-[#2563eb]/10 px-2.5 py-1 text-[10px] font-semibold uppercase text-[#2563eb]">
 {meta?.titulo || 'Tipo'}
 </span>
 </div>

 <div className="truncate font-semibold uppercase text-zinc-600">
 {camp.produtoras?.nome || 'Organização'}
 </div>

 <div className="font-semibold uppercase text-zinc-600">
 {camp.plataforma || 'N/I'}
 </div>

 <div className={`font-semibold uppercase ${gratuito ? 'text-emerald-600' : 'text-[#142340]'}`}>
 {gratuito ? 'Grátis' : formatarMoeda(camp.valor_vaga || 0)}
 </div>

 <div className="font-semibold text-emerald-600">
 {formatarMoeda(camp.valor_premiacao || 0)}
 </div>

 <div className="flex justify-end">
 <span className="inline-flex h-9 items-center justify-center gap-2 border border-[#2563eb] bg-[#2563eb] px-3 text-[10px] font-black uppercase tracking-[0.14em] text-white transition hover:bg-[#1d4ed8]">
 Inscrever-se
 <ChevronRight size={14} />
 </span>
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
 </div>
 )
}
