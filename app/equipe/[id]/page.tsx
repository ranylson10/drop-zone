'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'
import { usePerfil } from '@/app/contexts/PerfilContext'
import Image from 'next/image'
import {
 ArrowLeft,
 CalendarDays,
 Flag,
 MapPin,
 Pencil,
 Shield,
 Trophy,
 Users,
 Layers3,
} from 'lucide-react'

import AbaAgenda from './components/AbaAgenda'
import AbaCampeonatos from './components/AbaCampeonatos'
import AbaJogadores from './components/AbaJogadores'
import AbaLideres from './components/AbaLideres'
import AbaLines from './components/AbaLines'
import SocialActions from '@/app/components/SocialActions'

type Equipe = {
 id: string
 nome: string
 tag: string | null
 logo_url: string | null
 cover_url: string | null
 descricao: string | null
 cidade: string | null
 estado: string | null
 pais: string | null
 data_fundacao: string | null
 criado_por: string | null
 created_at: string | null
 updated_at: string | null
}

type ProfileResumo = {
 id: string
 username: string | null
 nome_exibicao: string | null
 foto_url: string | null
}

type PerfilJogo = {
 id: string
 nick: string | null
 foto_capa: string | null
 funcao: string | null
 user_id: string | null
 profiles?: ProfileResumo | ProfileResumo[] | null
}

type MembroEquipe = {
 id: string
 equipe_id: string
 perfil_jogo_id: string | null
 user_id: string | null
 tipo: 'dono' | 'admin' | 'manager' | 'membro'
 ativo: boolean
 entrou_em: string | null
 saiu_em: string | null
 perfis_jogo: PerfilJogo | PerfilJogo[] | null
 profiles?: ProfileResumo | ProfileResumo[] | null
}

type MembroEquipeNormalizado = Omit<MembroEquipe, 'perfis_jogo' | 'profiles'> & {
 perfil: (PerfilJogo & { profile: ProfileResumo | null }) | null
 profileConta: ProfileResumo | null
}

type LiderComando = {
 id: string
 tipo: 'dono' | 'admin' | 'manager' | 'membro'
 entrou_em: string | null
 perfilUsuario: ProfileResumo | null
 perfilJogo: {
 id: string
 nick: string | null
 foto_capa: string | null
 funcao: string | null
 } | null
}


type HistoricoEquipeItem = {
 campeonato_id: string
 nome: string
 posicao: number | null
 pontos: number
 abates: number
 booyahs: number
 partidas: number
}

type EstatisticasEquipe = {
 campeonatos: number
 finais: number
 titulos: number
 podios: number
 booyahs: number
 partidas: number
 abates: number
 mediaAbates: number
 mediaPosicao: number
 taxaTitulos: number
 historico: HistoricoEquipeItem[]
 titulosLista: HistoricoEquipeItem[]
}

const estatisticasVazias: EstatisticasEquipe = {
 campeonatos: 0,
 finais: 0,
 titulos: 0,
 podios: 0,
 booyahs: 0,
 partidas: 0,
 abates: 0,
 mediaAbates: 0,
 mediaPosicao: 0,
 taxaTitulos: 0,
 historico: [],
 titulosLista: [],
}

type TabKey = 'lideres' | 'jogadores' | 'lines' | 'campeonatos' | 'agenda'

function getCountryFlagEmoji(country?: string | null) {
 if (!country) return '🏳️'
 const normalized = country
 .trim()
 .toLowerCase()
 .normalize('NFD')
 .replace(/[\u0300-\u036f]/g, '')

 const countryMap: Record<string, string> = {
 brasil: '🇧🇷',
 brazil: '🇧🇷',
 portugal: '🇵🇹',
 angola: '🇦🇴',
 'estados unidos': '🇺🇸',
 'united states': '🇺🇸',
 eua: '🇺🇸',
 argentina: '🇦🇷',
 chile: '🇨🇱',
 paraguai: '🇵🇾',
 paraguay: '🇵🇾',
 uruguai: '🇺🇾',
 uruguay: '🇺🇾',
 bolivia: '🇧🇴',
 colombia: '🇨🇴',
 peru: '🇵🇪',
 mexico: '🇲🇽',
 espanha: '🇪🇸',
 espana: '🇪🇸',
 spain: '🇪🇸',
 franca: '🇫🇷',
 france: '🇫🇷',
 alemanha: '🇩🇪',
 germany: '🇩🇪',
 italia: '🇮🇹',
 italy: '🇮🇹',
 japao: '🇯🇵',
 japan: '🇯🇵',
 }

 return countryMap[normalized] || '🏳️'
}

function formatarData(data?: string | null) {
 if (!data) return 'N/I'
 const d = new Date(data)
 if (Number.isNaN(d.getTime())) return 'N/I'
 return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(d)
}

function montarLocalidade(cidade?: string | null, estado?: string | null, pais?: string | null) {
 return [cidade, estado, pais].filter(Boolean).join(', ')
}

function normalizarProfile(profile: ProfileResumo | ProfileResumo[] | null | undefined): ProfileResumo | null {
 if (!profile) return null
 return Array.isArray(profile) ? profile[0] || null : profile
}

function normalizarPerfilJogo(perfil: PerfilJogo | PerfilJogo[] | null): (PerfilJogo & { profile: ProfileResumo | null }) | null {
 if (!perfil) return null
 const resolved = Array.isArray(perfil) ? perfil[0] || null : perfil
 if (!resolved) return null

 return {
 ...resolved,
 profile: normalizarProfile(resolved.profiles),
 }
}


async function carregarEstatisticasEquipe(equipeId: string): Promise<EstatisticasEquipe> {
 const inscricoesRes = await supabase
 .from('campeonato_equipes')
 .select('id, campeonato_id, status, campeonatos(id, nome)')
 .eq('equipe_id', equipeId)

 if (inscricoesRes.error) {
 console.warn('Erro ao carregar inscrições da equipe:', inscricoesRes.error)
 return estatisticasVazias
 }

 const inscricoes = (inscricoesRes.data || []).filter((item: any) => {
 const status = String(item.status || '').toLowerCase()
 return status !== 'cancelada' && status !== 'cancelado'
 })

 const campeonatoIds = Array.from(
 new Set(inscricoes.map((item: any) => String(item.campeonato_id || '')).filter(Boolean))
 )

 const inscricaoIdsEquipe = new Set(inscricoes.map((item: any) => String(item.id || '')).filter(Boolean))

 if (campeonatoIds.length === 0) return estatisticasVazias

 const [participantesRes, resultadosRes] = await Promise.all([
 supabase
 .from('campeonato_equipes')
 .select('id, campeonato_id, equipe_id, equipe_avulsa_id, line_id, nome_exibicao')
 .in('campeonato_id', campeonatoIds),

 supabase
 .from('resultados_jogos')
 .select('campeonato_id, equipe_id, posicao, abates, total_pontos')
 .in('campeonato_id', campeonatoIds),
 ])

 if (participantesRes.error) {
 console.warn('Erro ao carregar participantes dos campeonatos:', participantesRes.error)
 return {
 ...estatisticasVazias,
 campeonatos: campeonatoIds.length,
 }
 }

 if (resultadosRes.error) {
 console.warn('Erro ao carregar resultados da equipe:', resultadosRes.error)
 return {
 ...estatisticasVazias,
 campeonatos: campeonatoIds.length,
 }
 }

 const participantes = (participantesRes.data || []) as any[]
 const resultados = (resultadosRes.data || []) as any[]

 const campeonatoNomeMap = new Map<string, string>()
 inscricoes.forEach((item: any) => {
 const camp = Array.isArray(item.campeonatos) ? item.campeonatos[0] : item.campeonatos
 campeonatoNomeMap.set(String(item.campeonato_id), camp?.nome || 'Campeonato sem nome')
 })

 const participanteIds = new Set(participantes.map((item) => String(item.id || '')).filter(Boolean))
 const publicToCampeonatoEquipeId = new Map<string, string>()

 participantes.forEach((item) => {
 const ceId = String(item.id || '').trim()
 ;[item.equipe_id, item.equipe_avulsa_id, item.line_id].forEach((publicId) => {
 const key = String(publicId || '').trim()
 if (ceId && key && !publicToCampeonatoEquipeId.has(key)) {
 publicToCampeonatoEquipeId.set(key, ceId)
 }
 })
 })

 const acumulado = new Map<
 string,
 {
 campeonato_id: string
 campeonato_equipe_id: string
 partidas: number
 booyahs: number
 abates: number
 pontos: number
 somaPosicoes: number
 }
 >()

 resultados.forEach((row) => {
 const campeonatoId = String(row.campeonato_id || '').trim()
 const rawEquipeId = String(row.equipe_id || '').trim()
 if (!campeonatoId || !rawEquipeId) return

 const campeonatoEquipeId = participanteIds.has(rawEquipeId)
 ? rawEquipeId
 : publicToCampeonatoEquipeId.get(rawEquipeId) || ''

 if (!campeonatoEquipeId) return

 const key = `${campeonatoId}:${campeonatoEquipeId}`
 const atual =
 acumulado.get(key) ||
 {
 campeonato_id: campeonatoId,
 campeonato_equipe_id: campeonatoEquipeId,
 partidas: 0,
 booyahs: 0,
 abates: 0,
 pontos: 0,
 somaPosicoes: 0,
 }

 const posicao = Number(row.posicao || 0)
 atual.partidas += 1
 atual.booyahs += posicao === 1 ? 1 : 0
 atual.abates += Number(row.abates || 0)
 atual.pontos += Number(row.total_pontos || 0)
 atual.somaPosicoes += posicao > 0 ? posicao : 0

 acumulado.set(key, atual)
 })

 let partidas = 0
 let abates = 0
 let booyahs = 0
 let somaPosicoesEquipe = 0
 let posicoesValidasEquipe = 0

 const historico: HistoricoEquipeItem[] = []

 campeonatoIds.forEach((campeonatoId) => {
 const ranking = Array.from(acumulado.values())
 .filter((item) => item.campeonato_id === campeonatoId)
 .sort((a, b) => {
 if (b.pontos !== a.pontos) return b.pontos - a.pontos
 if (b.abates !== a.abates) return b.abates - a.abates
 return b.booyahs - a.booyahs
 })

 const melhorDaEquipe = ranking.find((item) => inscricaoIdsEquipe.has(item.campeonato_equipe_id))
 if (!melhorDaEquipe) return

 const posicao = ranking.findIndex((item) => item.campeonato_equipe_id === melhorDaEquipe.campeonato_equipe_id) + 1

 partidas += melhorDaEquipe.partidas
 abates += melhorDaEquipe.abates
 booyahs += melhorDaEquipe.booyahs
 somaPosicoesEquipe += melhorDaEquipe.somaPosicoes
 posicoesValidasEquipe += melhorDaEquipe.partidas

 historico.push({
 campeonato_id: campeonatoId,
 nome: campeonatoNomeMap.get(campeonatoId) || 'Campeonato sem nome',
 posicao: posicao || null,
 pontos: melhorDaEquipe.pontos,
 abates: melhorDaEquipe.abates,
 booyahs: melhorDaEquipe.booyahs,
 partidas: melhorDaEquipe.partidas,
 })
 })

 const finais = historico.length
 const titulosLista = historico.filter((item) => item.posicao === 1)
 const podios = historico.filter((item) => Number(item.posicao || 0) > 0 && Number(item.posicao || 0) <= 3).length

 return {
 campeonatos: campeonatoIds.length,
 finais,
 titulos: titulosLista.length,
 podios,
 booyahs,
 partidas,
 abates,
 mediaAbates: partidas > 0 ? abates / partidas : 0,
 mediaPosicao: posicoesValidasEquipe > 0 ? somaPosicoesEquipe / posicoesValidasEquipe : 0,
 taxaTitulos: finais > 0 ? (titulosLista.length / finais) * 100 : 0,
 historico: historico.sort((a, b) => Number(a.posicao || 999) - Number(b.posicao || 999)),
 titulosLista,
 }
}

export default function PerfilEquipePage() {
 const params = useParams()
 const router = useRouter()
 const { user } = usePerfil()
 const equipeId = String(params?.id || '')

 const [loading, setLoading] = useState(true)
 const [tabAtiva, setTabAtiva] = useState<TabKey>('lideres')
 const [equipe, setEquipe] = useState<Equipe | null>(null)
 const [membros, setMembros] = useState<MembroEquipe[]>([])
 const [eventosCount, setEventosCount] = useState(0)
 const [estatisticas, setEstatisticas] = useState<EstatisticasEquipe>(estatisticasVazias)
 const [historicoAberto, setHistoricoAberto] = useState<'titulos' | 'historico' | null>(null)

 const carregarDados = useCallback(async () => {
 if (!equipeId) return

 try {
 setLoading(true)

 const [equipeRes, membrosRes, eventosRes] = await Promise.all([
 supabase
 .from('equipes')
 .select(
 'id, nome, tag, logo_url, cover_url, descricao, cidade, estado, pais, data_fundacao, criado_por, created_at, updated_at'
 )
 .eq('id', equipeId)
 .maybeSingle(),

 supabase
 .from('membros_equipe')
 .select(`
 id,
 equipe_id,
 perfil_jogo_id,
 user_id,
 tipo,
 ativo,
 entrou_em,
 saiu_em,
 profiles:user_id (
 id,
 username,
 nome_exibicao,
 foto_url
 ),
 perfis_jogo:perfil_jogo_id (
 id,
 nick,
 foto_capa,
 funcao,
 user_id,
 profiles:user_id (
 id,
 username,
 nome_exibicao,
 foto_url
 )
 )
 `)
 .eq('equipe_id', equipeId)
 .eq('ativo', true)
 .order('entrou_em', { ascending: true }),

 supabase
 .from('campeonato_equipes')
 .select('id', { count: 'exact', head: true })
 .eq('equipe_id', equipeId),
 ])

 if (equipeRes.error) throw equipeRes.error
 if (membrosRes.error) throw membrosRes.error
 if (eventosRes.error) throw eventosRes.error

 setEquipe((equipeRes.data as Equipe | null) || null)
 setMembros((membrosRes.data as MembroEquipe[]) || [])
 setEventosCount(eventosRes.count || 0)
 setEstatisticas(await carregarEstatisticasEquipe(equipeId))
 } catch (error: any) {
 console.error('Erro ao carregar perfil da equipe:', error?.message || error)
 } finally {
 setLoading(false)
 }
 }, [equipeId])

 useEffect(() => {
 carregarDados()
 }, [carregarDados])

 const membrosNormalizados = useMemo<MembroEquipeNormalizado[]>(() => {
 return membros.map((membro) => ({
 ...membro,
 perfil: normalizarPerfilJogo(membro.perfis_jogo),
 profileConta: normalizarProfile(membro.profiles),
 }))
 }, [membros])

 const meuVinculo = useMemo(() => {
 if (!user?.id) return null
 return membrosNormalizados.find((m) => m.user_id === user.id || m.perfil?.user_id === user.id) || null
 }, [membrosNormalizados, user?.id])

 const isDonoEquipe = useMemo(() => {
 if (!user?.id || !equipe) return false
 if (equipe.criado_por === user.id) return true
 return meuVinculo?.tipo === 'dono'
 }, [equipe, meuVinculo, user?.id])

 const podeGerenciar = useMemo(() => {
 if (!user?.id || !equipe) return false
 if (equipe.criado_por === user.id) return true
 return meuVinculo?.tipo === 'dono' || meuVinculo?.tipo === 'admin' || meuVinculo?.tipo === 'manager'
 }, [equipe, meuVinculo, user?.id])

 const lideres = useMemo<LiderComando[]>(
 () =>
 membrosNormalizados
 .filter((m) => m.tipo === 'dono' || m.tipo === 'admin' || m.tipo === 'manager')
 .map((m) => ({
 id: m.id,
 tipo: m.tipo,
 entrou_em: m.entrou_em,
 perfilUsuario: m.profileConta || m.perfil?.profile || null,
 perfilJogo: m.perfil
 ? {
 id: m.perfil.id,
 nick: m.perfil.nick,
 foto_capa: m.perfil.foto_capa,
 funcao: m.perfil.funcao,
 }
 : null,
 })),
 [membrosNormalizados]
 )

 const bandeira = useMemo(() => getCountryFlagEmoji(equipe?.pais), [equipe?.pais])
 const localidade = useMemo(
 () => montarLocalidade(equipe?.cidade, equipe?.estado, equipe?.pais),
 [equipe?.cidade, equipe?.estado, equipe?.pais]
 )

 const listaHistoricoAberta = historicoAberto === 'titulos' ? estatisticas.titulosLista : estatisticas.historico

 if (loading) {
 return (
 <div className="flex min-h-[70vh] items-center justify-center">
 <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-500">
 Carregando equipe...
 </div>
 </div>
 )
 }

 if (!equipe) {
 return (
 <div className="border border-zinc-200 bg-white p-8 text-center">
 <p className="text-[12px] font-semibold uppercase tracking-[0.25em] text-zinc-500">
 Equipe não encontrada
 </p>
 </div>
 )
 }

 return (
 <div className="min-h-screen bg-[#f7f7f7] text-[#142340] max-md:bg-white">
 <div className="mx-auto max-w-[1500px] border-x border-zinc-200 bg-white max-md:border-0">
 <section className="border-b border-zinc-200 px-6 py-8 md:px-10 max-md:border-0 max-md:px-0 max-md:py-0">
 <button
 onClick={() => router.back()}
 className="mb-4 inline-flex items-center gap-2 border border-zinc-300 bg-white px-3 py-2 text-[12px] font-medium uppercase tracking-wide text-[#142340] transition hover:bg-zinc-50 max-md:hidden"
 >
 <ArrowLeft size={14} />
 Voltar
 </button>

 <div className="overflow-hidden border border-zinc-200 max-md:border-0">
 <div className="relative h-[170px] w-full overflow-hidden bg-zinc-100 md:h-[210px] max-md:h-[118px]">
 {equipe.cover_url ? (
 <Image
 src={equipe.cover_url}
 alt={equipe.nome}
 fill
 className="object-cover opacity-90"
 />
 ) : null}
 </div>

 <div className="border-t border-zinc-200 bg-[#f8f8f8] px-6 pb-8 pt-0 md:px-10 max-md:border-0 max-md:bg-white max-md:px-4 max-md:pb-4">
 <div className="-mt-14 flex flex-col gap-4 md:flex-row md:items-end md:justify-between max-md:-mt-10 max-md:gap-2">
 <div className="flex flex-col gap-6 md:flex-row md:items-end max-md:gap-3">
 <div className="relative h-[118px] w-[118px] overflow-hidden border border-zinc-300 bg-white max-md:h-[86px] max-md:w-[86px]">
 {equipe.logo_url ? (
 <Image
 src={equipe.logo_url}
 alt={equipe.nome}
 fill
 className="object-cover"
 />
 ) : (
 <div className="flex h-full items-center justify-center text-4xl font-semibold text-zinc-500">
 {equipe.nome.slice(0, 2).toUpperCase()}
 </div>
 )}
 </div>

 <div className="pb-2 max-md:pb-0">
 <div className="flex items-center gap-4 max-md:gap-2">
 <h1 className="text-[24px] font-semibold uppercase tracking-tight text-[#142340] md:text-[30px] max-md:text-[22px]">
 {equipe.tag || equipe.nome}
 </h1>
 <div className="flex h-10 w-10 items-center justify-center border border-zinc-300 bg-white max-md:h-8 max-md:w-8">
 <Flag size={18} />
 </div>
 </div>

 <p className="mt-2 text-[13px] font-medium uppercase tracking-wide text-zinc-500 max-md:mt-1 max-md:text-[12px]">
 // {equipe.nome}
 </p>

 {localidade ? (
 <p className="mt-4 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500 max-md:mt-2 max-md:text-[10px] max-md:tracking-wide">
 <MapPin size={13} />
 {localidade}
 </p>
 ) : null}
 </div>
 </div>

 {podeGerenciar ? (
 <button
 onClick={() => router.push(`/equipe/${equipeId}/editar`)}
 className="inline-flex h-10 items-center gap-2 border border-zinc-300 bg-white px-4 text-[12px] font-medium uppercase tracking-wide text-[#142340] transition hover:bg-zinc-50"
 >
 <Pencil size={15} />
 Editar perfil
 </button>
 ) : null}
 </div>

 <div className="mt-4 border border-zinc-200 bg-white px-3 py-2 max-md:mt-3 max-md:border-0 max-md:border-y max-md:px-0">
 <div className="flex flex-wrap items-center justify-between gap-3 max-md:block">
 <div className="flex flex-wrap items-center gap-4 text-[12px] text-[#142340] max-md:grid max-md:grid-cols-4 max-md:gap-0 max-md:text-[11px]">
 <span className="inline-flex items-center gap-1">
 <Users size={13} className="text-[#2563eb]" />
 <strong className="font-semibold">{membrosNormalizados.length}</strong>
 <span className="text-zinc-500">membros</span>
 </span>

 <span className="h-4 w-px bg-zinc-200 max-md:hidden" />

 <span className="inline-flex items-center gap-1">
 <Trophy size={13} className="text-[#2563eb]" />
 <strong className="font-semibold">{eventosCount}</strong>
 <span className="text-zinc-500">eventos</span>
 </span>

 <span className="h-4 w-px bg-zinc-200 max-md:hidden" />

 <span className="inline-flex items-center gap-1">
 <CalendarDays size={13} className="text-[#2563eb]" />
 <strong className="font-semibold">{formatarData(equipe.data_fundacao)}</strong>
 </span>

 <span className="h-4 w-px bg-zinc-200 max-md:hidden" />

 <span className="inline-flex items-center gap-1 text-[14px]" title={equipe.pais || 'País não informado'}>
 {bandeira}
 </span>
 </div>

 <div className="max-md:hidden">
 <SocialActions
 entityId={equipe.id}
 entityType="equipe"
 variant="light"
 title="Torcida da equipe"
 compact
 />
 </div>
 </div>
 </div>
 </div>
 </div>
 </section>

 <section className="border-b border-zinc-200 px-6 py-6 md:px-10 max-md:px-4 max-md:py-4">
 <div className="border border-zinc-200 bg-white p-4 max-md:border-0 max-md:p-0">
 <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between max-md:mb-3">
 <div>
 <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#2563eb]">
 Estatísticas médias
 </p>
 <h2 className="mt-1 text-[18px] font-semibold text-[#142340] max-md:text-[15px]">
 Desempenho competitivo da equipe
 </h2>
 </div>

 <div className="flex gap-2">
 <button
 type="button"
 onClick={() => setHistoricoAberto(historicoAberto === 'titulos' ? null : 'titulos')}
 className="border border-zinc-300 bg-white px-3 py-2 text-[12px] font-medium text-[#142340] hover:bg-zinc-50"
 >
 Ver títulos
 </button>
 <button
 type="button"
 onClick={() => setHistoricoAberto(historicoAberto === 'historico' ? null : 'historico')}
 className="border border-zinc-300 bg-white px-3 py-2 text-[12px] font-medium text-[#142340] hover:bg-zinc-50"
 >
 Ver histórico
 </button>
 </div>
 </div>

 <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8 max-md:grid-cols-4 max-md:gap-1">
 {[
 { label: 'Títulos', value: estatisticas.titulos },
 { label: 'Finais', value: estatisticas.finais },
 { label: 'Campeonatos', value: estatisticas.campeonatos },
 { label: 'Top 3', value: estatisticas.podios },
 { label: 'Booyahs', value: estatisticas.booyahs },
 { label: 'Partidas', value: estatisticas.partidas },
 { label: 'Média Kills', value: estatisticas.mediaAbates.toFixed(1) },
 { label: 'Taxa título', value: `${estatisticas.taxaTitulos.toFixed(0)}%` },
 ].map((item) => (
 <div key={item.label} className="border border-zinc-200 bg-[#f8fafc] p-3 max-md:border-0 max-md:bg-zinc-50 max-md:p-2">
 <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-500">
 {item.label}
 </p>
 <p className="mt-2 text-[20px] font-semibold text-[#142340] max-md:mt-1 max-md:text-[16px]">
 {item.value}
 </p>
 </div>
 ))}
 </div>

 {historicoAberto ? (
 <div className="mt-4 border border-zinc-200">
 <div className="flex items-center justify-between border-b border-zinc-200 bg-[#f8fafc] px-3 py-2">
 <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
 {historicoAberto === 'titulos' ? 'Campeonatos vencidos' : 'Histórico competitivo'}
 </p>
 <button
 type="button"
 onClick={() => setHistoricoAberto(null)}
 className="text-[11px] font-medium uppercase tracking-wide text-zinc-500 hover:text-zinc-900"
 >
 Fechar
 </button>
 </div>

 {listaHistoricoAberta.length === 0 ? (
 <div className="px-3 py-4 text-[13px] text-zinc-500">
 Nenhum registro encontrado ainda.
 </div>
 ) : (
 <div className="overflow-x-auto">
 <table className="w-full border-collapse text-[13px]">
 <thead className="bg-[#f3f4f6] text-[10px] uppercase tracking-[0.16em] text-zinc-500">
 <tr>
 <th className="px-3 py-2 text-left">Campeonato</th>
 <th className="px-3 py-2 text-center">Pos.</th>
 <th className="px-3 py-2 text-center">Pontos</th>
 <th className="px-3 py-2 text-center">Abates</th>
 <th className="px-3 py-2 text-center">B!</th>
 <th className="px-3 py-2 text-center">Partidas</th>
 </tr>
 </thead>
 <tbody>
 {listaHistoricoAberta.map((item) => (
 <tr key={`${historicoAberto}-${item.campeonato_id}`} className="border-t border-zinc-200">
 <td className="px-3 py-2 font-medium text-[#142340]">
 {item.nome}
 </td>
 <td className="px-3 py-2 text-center">
 {item.posicao ? `${item.posicao}º` : 'N/I'}
 </td>
 <td className="px-3 py-2 text-center">{item.pontos}</td>
 <td className="px-3 py-2 text-center">{item.abates}</td>
 <td className="px-3 py-2 text-center">{item.booyahs}</td>
 <td className="px-3 py-2 text-center">{item.partidas}</td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 )}
 </div>
 ) : null}
 </div>
 </section>

 <section className="border-b border-zinc-200 px-6 md:px-10">
 <div className="flex flex-wrap gap-8 py-5">
 {[
 { key: 'lideres', label: 'Comando', icon: Shield },
 { key: 'jogadores', label: 'Atletas', icon: Users },
 { key: 'lines', label: 'Lines', icon: Layers3 },
 { key: 'campeonatos', label: 'Pro-Leagues', icon: Trophy },
 { key: 'agenda', label: 'Calendário', icon: CalendarDays },
 ].map((tab) => {
 const Icon = tab.icon
 const ativa = tabAtiva === tab.key

 return (
 <button
 key={tab.key}
 onClick={() => setTabAtiva(tab.key as TabKey)}
 className={`relative inline-flex items-center gap-2 pb-4 text-[16px] font-semibold uppercase tracking-[0.2em] transition ${
 ativa ? 'text-[#2563eb]' : 'text-[#8ea0be] hover:text-[#142340]'
 }`}
 >
 <Icon size={16} />
 {tab.label}
 {ativa ? <span className="absolute inset-x-0 bottom-0 h-[3px] bg-[#2563eb]" /> : null}
 </button>
 )
 })}
 </div>
 </section>

 <section className="px-6 py-10 md:px-10">
 {tabAtiva === 'lideres' && (
 <AbaLideres
 equipeId={equipe.id}
 membros={lideres}
 todosMembros={membrosNormalizados}
 canManageAdmins={isDonoEquipe}
 onAtualizado={carregarDados}
 />
 )}

 {tabAtiva === 'jogadores' && (
 <AbaJogadores
 equipeId={equipe.id}
 membros={membrosNormalizados}
 canManage={podeGerenciar}
 onAtualizado={carregarDados}
 />
 )}

 {tabAtiva === 'lines' && (
 <AbaLines
 equipeId={equipe.id}
 canManage={podeGerenciar}
 onAtualizado={carregarDados}
 />
 )}

 {tabAtiva === 'campeonatos' && (
 <AbaCampeonatos
 equipeId={equipe.id}
 canManage={podeGerenciar}
 onAtualizado={carregarDados}
 />
 )}

 {tabAtiva === 'agenda' && <AbaAgenda equipeId={equipe.id} />}
 </section>

 <section className="border-t border-zinc-200 px-6 py-8 md:px-10">
 <h3 className="text-[12px] font-semibold uppercase tracking-[0.35em] text-[#8ea0be]">
 Sobre a equipe
 </h3>

 <p className="mt-6 max-w-4xl text-[16px] font-semibold leading-8 text-[#142340]">
 {equipe.descricao?.trim() || 'Sem descrição cadastrada para esta equipe.'}
 </p>
 </section>
 </div>
 </div>
 )
}
