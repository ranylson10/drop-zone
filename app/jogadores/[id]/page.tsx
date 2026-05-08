'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'
import { usePerfil } from '@/app/contexts/PerfilContext'
import Image from 'next/image'
import SocialActions from '@/app/components/SocialActions'
import RankingTierBadge from '@/app/components/RankingTierBadge'
import {
 ArrowLeft,
 Shield,
 Zap,
 Crosshair,
 Users,
 UserCircle2,
 Gamepad2,
 Smartphone,
 Monitor,
 Check,
 X,
 Search,
 Send,
 Loader2,
} from 'lucide-react'

type EquipeResumo = {
 id: string
 nome: string | null
 tag: string | null
 logo_url: string | null
}

type PerfilJogo = {
 id: string
 user_id: string | null
 nick: string | null
 uid_jogo: string | null
 servidor: string | null
 funcao: string | null
 plataforma: 'mobile' | 'emulador' | null
 foto_capa: string | null
 ativo: boolean | null
 equipe_id: string | null
 equipes?: EquipeResumo | EquipeResumo[] | null
}

type ConviteEquipe = {
 id: string
 tipo: 'convite' | 'pedido'
 status: 'pendente' | 'aceito' | 'recusado' | 'cancelado'
 mensagem: string | null
 created_at: string
 equipe: EquipeResumo | null
}

function normalizarEquipe(equipe: EquipeResumo | EquipeResumo[] | null | undefined): EquipeResumo | null {
 if (!equipe) return null
 return Array.isArray(equipe) ? equipe[0] || null : equipe
}

function formatarData(data?: string | null) {
 if (!data) return 'N/I'
 const d = new Date(data)
 if (Number.isNaN(d.getTime())) return 'N/I'
 return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(d)
}

function getRoleIcon(role: string | null) {
 switch ((role || '').toLowerCase()) {
 case 'sniper':
 return <Crosshair size={18} className="text-red-400" />
 case 'suporte':
 return <Shield size={18} className="text-sky-400" />
 case 'granadeiro':
 return <Zap size={18} className="text-yellow-400" />
 default:
 return <Users size={18} className="text-zinc-500" />
 }
}

function getPlatformIcon(plataforma: string | null) {
 if (plataforma === 'mobile') return <Smartphone size={18} className="text-zinc-500" />
 if (plataforma === 'emulador') return <Monitor size={18} className="text-zinc-500" />
 return <Gamepad2 size={18} className="text-zinc-500" />
}

async function rpcFallback(nameList: string[], payload: Record<string, any>) {
 let lastError: any = null
 for (const fn of nameList) {
 const { error } = await supabase.rpc(fn, payload)
 if (!error) return
 lastError = error
 }
 throw lastError
}

function MetaCard({
 label,
 value,
}: {
 label: string
 value: string | number
}) {
 return (
 <div className=" border border-zinc-200 bg-zinc-50 p-5">
 <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-500">
 {label}
 </p>
 <p className="mt-3 text-2xl font-semibold text-[#142340]">{value}</p>
 </div>
 )
}

export default function PerfilPublicoAtleta() {
 const { id } = useParams()
 const router = useRouter()
 const { user } = usePerfil()

 const [atleta, setAtleta] = useState<PerfilJogo | null>(null)
 const [ranking, setRanking] = useState<any | null>(null)
 const [loading, setLoading] = useState(true)
 const [processandoId, setProcessandoId] = useState<string | null>(null)
 const [enviandoPedido, setEnviandoPedido] = useState<string | null>(null)

 const [convitesRecebidos, setConvitesRecebidos] = useState<ConviteEquipe[]>([])
 const [solicitacoesEnviadas, setSolicitacoesEnviadas] = useState<ConviteEquipe[]>([])
 const [buscaEquipe, setBuscaEquipe] = useState('')
 const [mensagemPedido, setMensagemPedido] = useState('')
 const [equipesBusca, setEquipesBusca] = useState<EquipeResumo[]>([])
 const [carregandoBusca, setCarregandoBusca] = useState(false)

 const perfilId = String(id || '')

 const equipeAtual = useMemo(() => normalizarEquipe(atleta?.equipes), [atleta?.equipes])

 const ehMeuPerfil = useMemo(() => {
 return !!user?.id && !!atleta?.user_id && user.id === atleta.user_id
 }, [user?.id, atleta?.user_id])

 const carregarAtleta = useCallback(async () => {
 if (!perfilId) return

 try {
 setLoading(true)
 const { data, error } = await supabase
 .from('perfis_jogo')
 .select(`
 id,
 user_id,
 nick,
 uid_jogo,
 servidor,
 funcao,
 plataforma,
 foto_capa,
 ativo,
 equipe_id,
 equipes:equipe_id (
 id,
 nome,
 tag,
 logo_url
 )
 `)
 .eq('id', perfilId)
 .maybeSingle()

 if (error) throw error
 setAtleta((data as PerfilJogo | null) || null)

 const { data: rankingData } = await supabase
 .from('vw_lealt_ranking_jogadores')
 .select('posicao, tier, score_total')
 .eq('perfil_jogo_id', perfilId)
 .maybeSingle()

 setRanking(rankingData || null)
 } catch (error) {
 console.error('Erro ao carregar atleta:', error)
 } finally {
 setLoading(false)
 }
 }, [perfilId])

 const carregarPendencias = useCallback(async () => {
 if (!perfilId) return

 try {
 const { data, error } = await supabase
 .from('convites_equipe')
 .select(`
 id,
 tipo,
 status,
 mensagem,
 created_at,
 equipe:equipe_id (
 id,
 nome,
 tag,
 logo_url
 )
 `)
 .eq('perfil_jogo_id', perfilId)
 .eq('status', 'pendente')
 .order('created_at', { ascending: false })

 if (error) throw error

 const lista = ((data || []) as any[]).map((item) => ({
 id: item.id,
 tipo: item.tipo || 'convite',
 status: item.status,
 mensagem: item.mensagem,
 created_at: item.created_at,
 equipe: Array.isArray(item.equipe) ? item.equipe[0] || null : item.equipe || null,
 })) as ConviteEquipe[]

 setConvitesRecebidos(lista.filter((i) => i.tipo !== 'pedido'))
 setSolicitacoesEnviadas(lista.filter((i) => i.tipo === 'pedido'))
 } catch (error) {
 console.error('Erro ao carregar pendências:', error)
 }
 }, [perfilId])

 useEffect(() => {
 carregarAtleta()
 carregarPendencias()
 }, [carregarAtleta, carregarPendencias])

 const idsEquipesBloqueadas = useMemo(() => {
 const set = new Set<string>()
 if (equipeAtual?.id) set.add(equipeAtual.id)
 convitesRecebidos.forEach((item) => item.equipe?.id && set.add(item.equipe.id))
 solicitacoesEnviadas.forEach((item) => item.equipe?.id && set.add(item.equipe.id))
 return set
 }, [equipeAtual, convitesRecebidos, solicitacoesEnviadas])

 const buscarEquipes = useCallback(async () => {
 const termo = buscaEquipe.trim()
 if (!ehMeuPerfil || !termo || termo.length < 2) {
 setEquipesBusca([])
 return
 }

 try {
 setCarregandoBusca(true)

 const { data, error } = await supabase
 .from('equipes')
 .select('id, nome, tag, logo_url')
 .ilike('nome', `%${termo}%`)
 .order('nome', { ascending: true })
 .limit(12)

 if (error) throw error

 const lista = ((data || []) as EquipeResumo[]).filter((e) => !idsEquipesBloqueadas.has(e.id))
 setEquipesBusca(lista)
 } catch (error) {
 console.error('Erro ao buscar equipes:', error)
 } finally {
 setCarregandoBusca(false)
 }
 }, [buscaEquipe, ehMeuPerfil, idsEquipesBloqueadas])

 useEffect(() => {
 const t = setTimeout(() => {
 buscarEquipes()
 }, 250)
 return () => clearTimeout(t)
 }, [buscarEquipes])

 async function aceitarConvite(conviteId: string) {
 try {
 setProcessandoId(conviteId)
 await rpcFallback(['aceitar_convite_equipe_v2', 'aceitar_convite_equipe'], {
 p_convite_id: conviteId,
 })
 await carregarAtleta()
 await carregarPendencias()
 alert('Convite aceito com sucesso.')
 } catch (error: any) {
 console.error('Erro ao aceitar convite:', error)
 alert(error?.message || 'Erro ao aceitar convite.')
 } finally {
 setProcessandoId(null)
 }
 }

 async function recusarConvite(conviteId: string) {
 try {
 setProcessandoId(conviteId)
 await rpcFallback(['recusar_convite_equipe_v2', 'recusar_convite_equipe'], {
 p_convite_id: conviteId,
 })
 await carregarPendencias()
 alert('Convite recusado.')
 } catch (error: any) {
 console.error('Erro ao recusar convite:', error)
 alert(error?.message || 'Erro ao recusar convite.')
 } finally {
 setProcessandoId(null)
 }
 }

 async function solicitarEntrada(equipeId: string) {
 try {
 setEnviandoPedido(equipeId)
 await rpcFallback(['solicitar_entrada_equipe', 'solicitar_entrada_equipe_v2'], {
 p_equipe_id: equipeId,
 p_perfil_jogo_id: perfilId,
 p_mensagem: mensagemPedido || null,
 })
 setMensagemPedido('')
 setBuscaEquipe('')
 setEquipesBusca([])
 await carregarPendencias()
 alert('Pedido enviado para a equipe.')
 } catch (error: any) {
 console.error('Erro ao solicitar entrada:', error)
 alert(error?.message || 'Erro ao solicitar entrada.')
 } finally {
 setEnviandoPedido(null)
 }
 }

 if (loading) {
 return (
 <div className="flex min-h-screen items-center justify-center bg-white text-[#2563eb]">
 <div className="text-[12px] font-semibold uppercase tracking-[0.28em]">
 acessando_registros...
 </div>
 </div>
 )
 }

 if (!atleta) {
 return (
 <div className="flex min-h-screen items-center justify-center bg-white text-[#142340]">
 <div className="text-[12px] font-semibold uppercase tracking-[0.28em]">
 atleta_nao_encontrado
 </div>
 </div>
 )
 }

 return (
 <div className="min-h-screen bg-white px-4 py-8 text-[#142340] md:px-8">
 <div className="mx-auto max-w-6xl space-y-6">
 <button
 onClick={() => router.back()}
 className="inline-flex items-center gap-2 border border-zinc-200 bg-zinc-50 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-600 transition hover:bg-zinc-50"
 >
 <ArrowLeft size={14} />
 Retornar para database
 </button>

 <section className="overflow-hidden rounded-3xl border border-zinc-200 bg-[linear-gradient(135deg,#171a20_0%,#111318_100%)] -[0_16px_50px_rgba(0,0,0,0.35)]">
 <div className="relative h-[160px] w-full bg-[linear-gradient(90deg,#071633_0%,#22365c_55%,#0b0d12_100%)] md:h-[220px]" />

 <div className="px-6 pb-8 pt-0 md:px-8">
 <div className="-mt-20 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
 <div className="flex flex-col gap-5 md:flex-row md:items-end">
 <div className="relative h-52 w-52 overflow-hidden border border-zinc-200 bg-white -[12px_10px_0_0_#7cfc00]">
 {atleta.foto_capa ? (
 <Image
 src={atleta.foto_capa}
 alt={atleta.nick || 'Atleta'}
 fill
 className="object-cover"
 />
 ) : (
 <div className="flex h-full w-full items-center justify-center text-zinc-600">
 <UserCircle2 size={88} />
 </div>
 )}
 </div>

 <div className="pb-2">
 <span className="text-[#2563eb] font-mono text-[11px] font-semibold uppercase tracking-[0.3em]">
 Operador_confirmado
 </span>
 <h1 className="mt-2 text-5xl font-semibold uppercase tracking-tight text-[#142340] md:text-7xl">
 {atleta.nick || 'SEM NICK'}
 </h1>

 <div className="mt-4 flex flex-wrap items-center gap-3">
 <MetaCard label="uid" value={atleta.uid_jogo || 'N/I'} />
 </div>

 <div className="mt-5 flex flex-wrap items-center gap-3">
 {ranking ? (
 <RankingTierBadge tier={ranking.tier} posicao={ranking.posicao} score={ranking.score_total} tipo="jogador" />
 ) : null}
 <div className="inline-flex items-center gap-2 border border-zinc-200 bg-zinc-50 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-600">
 {getRoleIcon(atleta.funcao || null)}
 {atleta.funcao || 'Sem função'}
 </div>
 <div className="inline-flex items-center gap-2 border border-zinc-200 bg-zinc-50 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-600">
 {getPlatformIcon(atleta.plataforma || null)}
 {atleta.plataforma || 'Sem plataforma'}
 </div>
 <div className="inline-flex items-center gap-2 border border-zinc-200 bg-zinc-50 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-600">
 <Users size={18} className="text-zinc-500" />
 {atleta.servidor || 'N/I'}
 </div>
 </div>
 </div>
 </div>

 <div className=" border border-zinc-200 bg-zinc-50 p-5">
 <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
 {equipeAtual ? 'Equipe atual' : 'Status'}
 </p>

 {equipeAtual ? (
 <div className="mt-3 flex items-center gap-3">
 <div className="relative h-12 w-12 overflow-hidden border border-zinc-200 bg-white">
 {equipeAtual.logo_url ? (
 <Image
 src={equipeAtual.logo_url}
 alt={equipeAtual.nome || 'Equipe'}
 fill
 className="object-cover"
 />
 ) : null}
 </div>
 <div>
 <p className="text-[18px] font-semibold uppercase text-[#142340]">
 {equipeAtual.tag || equipeAtual.nome || 'Equipe'}
 </p>
 <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-500">
 {equipeAtual.nome || 'Sem nome'}
 </p>
 </div>
 </div>
 ) : (
 <p className="mt-3 text-[18px] font-semibold uppercase text-[#142340]">
 Sem equipe
 </p>
 )}
 </div>
 </div>

 <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-4">
 <MetaCard label="Servidor" value={atleta.servidor || 'N/I'} />
 <MetaCard label="Convites pendentes" value={convitesRecebidos.length} />
 <MetaCard label="Solicitações enviadas" value={solicitacoesEnviadas.length} />
 <MetaCard label="Conta" value={ehMeuPerfil ? 'Seu perfil' : 'Visualização pública'} />
 </div>

 <div className="mt-6">
 <SocialActions
 entityId={atleta.id}
 entityType="jogador"
 variant="dark"
 title="Torcida do jogador"
 />
 </div>
 </div>
 </section>

 {ehMeuPerfil ? (
 <section className="space-y-6">
 <div className="rounded-3xl border border-zinc-200 bg-[linear-gradient(135deg,#171a20_0%,#111318_100%)] p-6 -[0_16px_50px_rgba(0,0,0,0.25)]">
 <h2 className="text-[12px] font-semibold uppercase tracking-[0.35em] text-[#2563eb]">
 // ENTRAR EM EQUIPE
 </h2>

 <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
 <div className="relative">
 <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
 <input
 value={buscaEquipe}
 onChange={(e) => setBuscaEquipe(e.target.value)}
 placeholder="Buscar equipe por nome..."
 className="h-12 w-full border border-zinc-200 bg-zinc-50 pl-11 pr-4 text-[12px] font-bold uppercase tracking-[0.08em] text-[#142340] outline-none placeholder:text-zinc-500 focus:border-[#2563eb]/40"
 />
 </div>

 <input
 value={mensagemPedido}
 onChange={(e) => setMensagemPedido(e.target.value)}
 placeholder="Mensagem opcional"
 className="h-12 w-full border border-zinc-200 bg-zinc-50 px-4 text-[12px] font-semibold text-[#142340] outline-none placeholder:text-zinc-500 focus:border-[#2563eb]/40"
 />
 </div>

 <div className="mt-4 grid grid-cols-1 gap-3">
 {carregandoBusca ? (
 <div className="flex items-center gap-2 border border-zinc-200 bg-zinc-50 px-4 py-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
 <Loader2 size={14} className="animate-spin" />
 Buscando equipes...
 </div>
 ) : equipesBusca.length > 0 ? (
 equipesBusca.map((equipe) => (
 <div
 key={equipe.id}
 className="flex flex-col gap-4 border border-zinc-200 bg-zinc-50 p-4 md:flex-row md:items-center md:justify-between"
 >
 <div className="flex items-center gap-4">
 <div className="relative h-14 w-14 overflow-hidden border border-zinc-200 bg-white">
 {equipe.logo_url ? (
 <Image
 src={equipe.logo_url}
 alt={equipe.nome || 'Equipe'}
 fill
 className="object-cover"
 />
 ) : null}
 </div>

 <div>
 <p className="text-[18px] font-semibold uppercase text-[#142340]">
 {equipe.tag || equipe.nome || 'Equipe'}
 </p>
 <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-500">
 {equipe.nome || 'Sem nome'}
 </p>
 </div>
 </div>

 <button
 onClick={() => solicitarEntrada(equipe.id)}
 disabled={enviandoPedido === equipe.id || !!equipeAtual}
 className="inline-flex h-11 items-center justify-center gap-2 border border-[#2563eb]/30 bg-[#2563eb] px-5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#142340] transition hover:brightness-110 disabled:opacity-60"
 >
 {enviandoPedido === equipe.id ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
 Solicitar entrada
 </button>
 </div>
 ))
 ) : buscaEquipe.trim().length >= 2 ? (
 <div className=" border border-dashed border-zinc-200 bg-zinc-50 py-6 text-center text-[11px] font-semibold uppercase text-zinc-500">
 Nenhuma equipe encontrada.
 </div>
 ) : null}
 </div>
 </div>

 <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
 <div className="rounded-3xl border border-zinc-200 bg-[linear-gradient(135deg,#171a20_0%,#111318_100%)] p-6 -[0_16px_50px_rgba(0,0,0,0.25)]">
 <h2 className="text-[12px] font-semibold uppercase tracking-[0.35em] text-[#2563eb]">
 // CONVITES RECEBIDOS
 </h2>

 <div className="mt-6 space-y-4">
 {convitesRecebidos.length > 0 ? (
 convitesRecebidos.map((convite) => (
 <div key={convite.id} className=" border border-zinc-200 bg-zinc-50 p-4">
 <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
 <div className="flex items-center gap-4">
 <div className="relative h-14 w-14 overflow-hidden border border-zinc-200 bg-white">
 {convite.equipe?.logo_url ? (
 <Image
 src={convite.equipe.logo_url}
 alt={convite.equipe.nome || 'Equipe'}
 fill
 className="object-cover"
 />
 ) : null}
 </div>

 <div>
 <p className="text-[18px] font-semibold uppercase text-[#142340]">
 {convite.equipe?.tag || convite.equipe?.nome || 'Equipe'}
 </p>
 <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-500">
 Recebido em {formatarData(convite.created_at)}
 </p>
 {convite.mensagem ? (
 <p className="mt-2 text-[12px] font-semibold text-zinc-600">
 {convite.mensagem}
 </p>
 ) : null}
 </div>
 </div>

 <div className="flex gap-3">
 <button
 onClick={() => recusarConvite(convite.id)}
 disabled={processandoId === convite.id}
 className="inline-flex h-11 items-center gap-2 border border-red-400/30 bg-red-400/10 px-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-red-300 transition hover:bg-red-400/15 disabled:opacity-50"
 >
 {processandoId === convite.id ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
 Recusar
 </button>

 <button
 onClick={() => aceitarConvite(convite.id)}
 disabled={processandoId === convite.id || !!equipeAtual}
 className="inline-flex h-11 items-center gap-2 border border-[#2563eb]/30 bg-[#2563eb] px-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#142340] transition hover:brightness-110 disabled:opacity-60"
 >
 {processandoId === convite.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
 Aceitar
 </button>
 </div>
 </div>
 </div>
 ))
 ) : (
 <div className=" border border-dashed border-zinc-200 bg-zinc-50 py-6 text-center text-[11px] font-semibold uppercase text-zinc-500">
 Nenhum convite pendente.
 </div>
 )}
 </div>
 </div>

 <div className="rounded-3xl border border-zinc-200 bg-[linear-gradient(135deg,#171a20_0%,#111318_100%)] p-6 -[0_16px_50px_rgba(0,0,0,0.25)]">
 <h2 className="text-[12px] font-semibold uppercase tracking-[0.35em] text-[#2563eb]">
 // SOLICITAÇÕES ENVIADAS
 </h2>

 <div className="mt-6 space-y-4">
 {solicitacoesEnviadas.length > 0 ? (
 solicitacoesEnviadas.map((pedido) => (
 <div key={pedido.id} className=" border border-zinc-200 bg-zinc-50 p-4">
 <div className="flex items-center gap-4">
 <div className="relative h-14 w-14 overflow-hidden border border-zinc-200 bg-white">
 {pedido.equipe?.logo_url ? (
 <Image
 src={pedido.equipe.logo_url}
 alt={pedido.equipe.nome || 'Equipe'}
 fill
 className="object-cover"
 />
 ) : null}
 </div>

 <div>
 <p className="text-[18px] font-semibold uppercase text-[#142340]">
 {pedido.equipe?.tag || pedido.equipe?.nome || 'Equipe'}
 </p>
 <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-500">
 Pedido enviado em {formatarData(pedido.created_at)}
 </p>
 {pedido.mensagem ? (
 <p className="mt-2 text-[12px] font-semibold text-zinc-600">
 {pedido.mensagem}
 </p>
 ) : null}
 </div>
 </div>
 </div>
 ))
 ) : (
 <div className=" border border-dashed border-zinc-200 bg-zinc-50 py-6 text-center text-[11px] font-semibold uppercase text-zinc-500">
 Nenhuma solicitação enviada.
 </div>
 )}
 </div>
 </div>
 </div>
 </section>
 ) : null}
 </div>
 </div>
 )
}
