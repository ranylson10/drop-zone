'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import {
 Gamepad2,
 Plus,
 Pencil,
 Trash2,
 LogOut,
 Smartphone,
 Monitor,
 Users,
 Shield,
 Zap,
 Crosshair,
 Loader2,
 Search,
 Bell,
 Send,
 UserCheck,
 AlertCircle,
} from 'lucide-react'

type PerfilJogo = {
 id: string
 nick: string | null
 uid_jogo: string | null
 servidor: string | null
 funcao: string | null
 plataforma: 'mobile' | 'emulador' | null
 foto_capa: string | null
 equipe_id: string | null
 user_id: string | null
 equipes?: {
 id: string
 nome: string | null
 tag: string | null
 logo_url: string | null
 } | null | Array<{
 id: string
 nome: string | null
 tag: string | null
 logo_url: string | null
 }>
}

function normalizarEquipe(equipe: PerfilJogo['equipes']) {
 if (!equipe) return null
 return Array.isArray(equipe) ? equipe[0] || null : equipe
}


type ConviteEquipe = Record<string, any>

type IndicadoresPerfil = {
 convitesRecebidos: number
 pedidosEnviados: number
 equipeVinculada: boolean
 pendencias: number
}

function valorNormalizado(valor: unknown) {
 return String(valor || '').trim().toLowerCase()
}

function conviteTemPerfil(convite: ConviteEquipe, perfilId: string) {
 const id = String(perfilId || '').trim()
 if (!id) return false

 return [
 convite.perfil_jogo_id,
 convite.perfil_id,
 convite.convidado_perfil_jogo_id,
 convite.perfil_jogo_destino_id,
 convite.para_perfil_jogo_id,
 convite.solicitante_perfil_jogo_id,
 convite.de_perfil_jogo_id,
 convite.jogador_perfil_jogo_id,
 ].some((valor) => String(valor || '').trim() === id)
}

function ehDestinoDoConvite(convite: ConviteEquipe, perfilId: string) {
 const id = String(perfilId || '').trim()

 return [
 convite.convidado_perfil_jogo_id,
 convite.perfil_jogo_destino_id,
 convite.para_perfil_jogo_id,
 convite.jogador_perfil_jogo_id,
 convite.perfil_jogo_id,
 ].some((valor) => String(valor || '').trim() === id)
}

function ehOrigemDoPedido(convite: ConviteEquipe, perfilId: string) {
 const id = String(perfilId || '').trim()

 return [
 convite.solicitante_perfil_jogo_id,
 convite.de_perfil_jogo_id,
 convite.perfil_solicitante_id,
 ].some((valor) => String(valor || '').trim() === id)
}

function statusPendente(convite: ConviteEquipe) {
 const status = valorNormalizado(convite.status || convite.situacao)
 return !status || ['pendente', 'enviado', 'aguardando', 'aberto', 'solicitado'].includes(status)
}

function obterIndicadoresPerfil(perfil: PerfilJogo, convites: ConviteEquipe[]): IndicadoresPerfil {
 const relacionados = convites.filter((convite) => conviteTemPerfil(convite, perfil.id))
 const pendentes = relacionados.filter(statusPendente)

 const convitesRecebidos = pendentes.filter((convite) => {
 const tipo = valorNormalizado(convite.tipo || convite.tipo_convite || convite.origem)
 if (tipo.includes('pedido') || tipo.includes('solicit')) return false
 return ehDestinoDoConvite(convite, perfil.id)
 }).length

 const pedidosEnviados = pendentes.filter((convite) => {
 const tipo = valorNormalizado(convite.tipo || convite.tipo_convite || convite.origem)
 if (tipo.includes('convite')) return false
 return ehOrigemDoPedido(convite, perfil.id) || tipo.includes('pedido') || tipo.includes('solicit')
 }).length

 return {
 convitesRecebidos,
 pedidosEnviados,
 equipeVinculada: Boolean(perfil.equipe_id || normalizarEquipe(perfil.equipes)?.id),
 pendencias: convitesRecebidos + pedidosEnviados,
 }
}

function getRoleIcon(role: string | null) {
 switch ((role || '').toLowerCase()) {
 case 'sniper':
 return <Crosshair size={13} className="text-red-500" />
 case 'suporte':
 return <Shield size={13} className="text-sky-500" />
 case 'granadeiro':
 return <Zap size={13} className="text-yellow-500" />
 default:
 return <Users size={13} className="text-[#2563eb]" />
 }
}

function getPlatformIcon(plataforma: string | null) {
 if (plataforma === 'mobile') return <Smartphone size={13} className="text-[#2563eb]" />
 if (plataforma === 'emulador') return <Monitor size={13} className="text-[#2563eb]" />
 return <Gamepad2 size={13} className="text-[#2563eb]" />
}

function getPlatformLabel(plataforma: string | null) {
 if (plataforma === 'mobile') return 'Mobile'
 if (plataforma === 'emulador') return 'Emulador'
 return 'N/I'
}

function PerfilRow({
 perfil,
 index,
 indicadores,
 onDelete,
 onSairEquipe,
 deletingId,
 leavingId,
}: {
 perfil: PerfilJogo
 index: number
 indicadores: IndicadoresPerfil
 onDelete: (perfilId: string) => void
 onSairEquipe: (perfilId: string) => void
 deletingId: string | null
 leavingId: string | null
}) {
 const equipe = useMemo(() => normalizarEquipe(perfil.equipes), [perfil.equipes])

 return (
 <div className="grid grid-cols-[44px_2fr_120px_120px_120px_170px_260px_210px] items-center border-t border-zinc-200 px-3 py-3 text-[12px] transition hover:bg-zinc-50">
 <div className="font-semibold text-zinc-600">#{index + 1}</div>

 <div className="flex min-w-0 items-center gap-3">
 <div className="relative h-8 w-8 shrink-0 overflow-hidden bg-zinc-100">
 {perfil.foto_capa ? (
 <Image src={perfil.foto_capa} alt={perfil.nick || 'Perfil'} fill className="object-cover" />
 ) : (
 <div className="flex h-full w-full items-center justify-center text-zinc-500">
 <Gamepad2 size={20} />
 </div>
 )}
 </div>

 <div className="min-w-0">
 <div className="truncate text-[13px] font-semibold uppercase text-[#142340]">
 {perfil.nick || 'Sem nick'}
 </div>
 <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
 UID: {perfil.uid_jogo || 'N/I'}
 </div>
 </div>
 </div>

 <div className="flex items-center gap-2 font-semibold uppercase text-zinc-600">
 <span className="text-sm">🌍</span>
 {perfil.servidor || 'N/I'}
 </div>

 <div className="flex items-center gap-2 font-semibold uppercase text-zinc-600">
 {getRoleIcon(perfil.funcao)}
 {perfil.funcao || 'Sem função'}
 </div>

 <div className="flex items-center gap-2 font-semibold text-zinc-600">
 {getPlatformIcon(perfil.plataforma)}
 {getPlatformLabel(perfil.plataforma)}
 </div>

 <div className="min-w-0">
 {equipe ? (
 <div className="inline-flex max-w-full items-center gap-2 border border-zinc-200 bg-zinc-50 px-2.5 py-1.5">
 <div className="relative h-5 w-5 shrink-0 overflow-hidden bg-zinc-100">
 {equipe.logo_url ? (
 <Image src={equipe.logo_url} alt={equipe.nome || 'Equipe'} fill className="object-cover" />
 ) : null}
 </div>
 <span className="truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-[#2563eb]">
 {equipe.tag || equipe.nome || 'Equipe'}
 </span>
 </div>
 ) : (
 <div className="inline-flex items-center gap-2 border border-zinc-300 bg-zinc-50 px-2.5 py-1.5">
 <Users size={12} className="text-zinc-500" />
 <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-600">
 Sem equipe
 </span>
 </div>
 )}
 </div>

 <div className="flex flex-wrap items-center gap-1.5">
 <span
 className={`inline-flex h-7 items-center gap-1 border px-2 text-[10px] font-medium uppercase ${
 indicadores.equipeVinculada
 ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
 : 'border-zinc-200 bg-zinc-50 text-zinc-500'
 }`}
 title="Equipe vinculada"
 >
 <UserCheck size={12} />
 {indicadores.equipeVinculada ? 'vinculado' : 'sem vínculo'}
 </span>

 <span
 className={`inline-flex h-7 items-center gap-1 border px-2 text-[10px] font-medium uppercase ${
 indicadores.convitesRecebidos > 0
 ? 'border-blue-200 bg-blue-50 text-blue-700'
 : 'border-zinc-200 bg-zinc-50 text-zinc-500'
 }`}
 title="Convites de equipes recebidos"
 >
 <Bell size={12} />
 {indicadores.convitesRecebidos}
 </span>

 <span
 className={`inline-flex h-7 items-center gap-1 border px-2 text-[10px] font-medium uppercase ${
 indicadores.pedidosEnviados > 0
 ? 'border-yellow-200 bg-yellow-50 text-yellow-700'
 : 'border-zinc-200 bg-zinc-50 text-zinc-500'
 }`}
 title="Pedidos enviados para equipes"
 >
 <Send size={12} />
 {indicadores.pedidosEnviados}
 </span>
 </div>

 <div className="flex flex-wrap justify-end gap-2">
 <Link
 href={`/jogadores/${perfil.id}`}
 className="inline-flex h-9 items-center gap-2 border border-zinc-300 bg-zinc-50 px-3 text-[11px] font-semibold uppercase text-[#142340] transition hover:border-[#2563eb]"
 >
 <Pencil size={14} />
 Editar
 </Link>

 {equipe ? (
 <button
 onClick={() => onSairEquipe(perfil.id)}
 disabled={leavingId === perfil.id}
 className="inline-flex h-9 items-center gap-2 border border-yellow-300 bg-yellow-50 px-3 text-[11px] font-semibold uppercase text-yellow-700 transition hover:bg-yellow-100 disabled:opacity-60"
 >
 {leavingId === perfil.id ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />}
 Sair
 </button>
 ) : null}

 <button
 onClick={() => onDelete(perfil.id)}
 disabled={deletingId === perfil.id}
 className="inline-flex h-9 items-center gap-2 border border-red-300 bg-red-50 px-3 text-[11px] font-semibold uppercase text-red-600 transition hover:bg-red-100 disabled:opacity-60"
 >
 {deletingId === perfil.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
 Excluir
 </button>
 </div>
 </div>
 )
}

export default function TabGamer() {
 const [loading, setLoading] = useState(true)
 const [deletingId, setDeletingId] = useState<string | null>(null)
 const [leavingId, setLeavingId] = useState<string | null>(null)
 const [busca, setBusca] = useState('')
 const [filtroPlataforma, setFiltroPlataforma] = useState<'todos' | 'mobile' | 'emulador'>('todos')
 const [filtroSituacao, setFiltroSituacao] = useState<'todos' | 'com_equipe' | 'sem_equipe' | 'pendencias'>('todos')
 const [ordenarPor, setOrdenarPor] = useState<'nick' | 'servidor' | 'plataforma' | 'equipe' | 'pendencias'>('nick')
 const [perfis, setPerfis] = useState<PerfilJogo[]>([])
 const [convitesEquipe, setConvitesEquipe] = useState<ConviteEquipe[]>([])

 const carregarConvitesEquipe = useCallback(async (perfisCarregados: PerfilJogo[]) => {
 try {
 if (!perfisCarregados.length) {
 setConvitesEquipe([])
 return
 }

 const { data, error } = await supabase
 .from('convites_equipe')
 .select('*')
 .limit(500)

 if (error) {
 console.warn('Não foi possível carregar convites de equipe:', error)
 setConvitesEquipe([])
 return
 }

 const perfilIds = new Set(perfisCarregados.map((perfil) => perfil.id))
 const filtrados = (data || []).filter((convite: ConviteEquipe) =>
 Array.from(perfilIds).some((perfilId) => conviteTemPerfil(convite, perfilId))
 )

 setConvitesEquipe(filtrados)
 } catch (error) {
 console.warn('Erro ao carregar convites de equipe:', error)
 setConvitesEquipe([])
 }
 }, [])

 const carregarPerfis = useCallback(async () => {
 try {
 setLoading(true)

 const {
 data: { session },
 error: sessionError,
 } = await supabase.auth.getSession()

 if (sessionError) throw sessionError

 const userId = session?.user?.id
 if (!userId) {
 setPerfis([])
 setConvitesEquipe([])
 return
 }

 const { data, error } = await supabase
 .from('perfis_jogo')
 .select(`
 id,
 nick,
 uid_jogo,
 servidor,
 funcao,
 plataforma,
 foto_capa,
 equipe_id,
 user_id,
 equipes:equipe_id (
 id,
 nome,
 tag,
 logo_url
 )
 `)
 .eq('user_id', userId)
 .order('created_at', { ascending: true })

 if (error) throw error

 const perfisCarregados = (data || []) as PerfilJogo[]
 setPerfis(perfisCarregados)
 await carregarConvitesEquipe(perfisCarregados)
 } catch (error) {
 console.error('Erro ao carregar perfis gamer:', error)
 setPerfis([])
 setConvitesEquipe([])
 } finally {
 setLoading(false)
 }
 }, [carregarConvitesEquipe])

 useEffect(() => {
 carregarPerfis()
 }, [carregarPerfis])

 async function excluirPerfil(perfilId: string) {
 const confirmou = confirm('Excluir este perfil gamer?')
 if (!confirmou) return

 try {
 setDeletingId(perfilId)
 const { error } = await supabase.from('perfis_jogo').delete().eq('id', perfilId)
 if (error) throw error
 await carregarPerfis()
 } catch (error: any) {
 console.error('Erro ao excluir perfil:', error)
 alert(error?.message || 'Erro ao excluir perfil')
 } finally {
 setDeletingId(null)
 }
 }

 async function sairDaEquipe(perfilId: string) {
 const confirmou = confirm('Deseja sair da equipe com este perfil gamer?')
 if (!confirmou) return

 try {
 setLeavingId(perfilId)

 const { error } = await supabase.rpc('sair_da_equipe', {
 p_perfil_jogo_id: perfilId,
 })

 if (error) throw error
 await carregarPerfis()
 } catch (error: any) {
 console.error('Erro ao sair da equipe:', error)
 alert(error?.message || 'Erro ao sair da equipe')
 } finally {
 setLeavingId(null)
 }
 }

 const indicadoresPorPerfil = useMemo(() => {
 const mapa = new Map<string, IndicadoresPerfil>()

 perfis.forEach((perfil) => {
 mapa.set(perfil.id, obterIndicadoresPerfil(perfil, convitesEquipe))
 })

 return mapa
 }, [perfis, convitesEquipe])

 const perfisFiltrados = useMemo(() => {
 const termo = busca.trim().toLowerCase()

 return perfis
 .filter((perfil) => {
 const equipe = normalizarEquipe(perfil.equipes)
 const indicadores = indicadoresPorPerfil.get(perfil.id) || obterIndicadoresPerfil(perfil, [])

 if (filtroPlataforma !== 'todos' && perfil.plataforma !== filtroPlataforma) return false
 if (filtroSituacao === 'com_equipe' && !indicadores.equipeVinculada) return false
 if (filtroSituacao === 'sem_equipe' && indicadores.equipeVinculada) return false
 if (filtroSituacao === 'pendencias' && indicadores.pendencias <= 0) return false

 if (!termo) return true

 return [perfil.nick, perfil.uid_jogo, perfil.servidor, perfil.funcao, perfil.plataforma, equipe?.nome, equipe?.tag]
 .some((valor) => String(valor || '').toLowerCase().includes(termo))
 })
 .sort((a, b) => {
 const equipeA = normalizarEquipe(a.equipes)
 const equipeB = normalizarEquipe(b.equipes)
 const indicadoresA = indicadoresPorPerfil.get(a.id) || obterIndicadoresPerfil(a, [])
 const indicadoresB = indicadoresPorPerfil.get(b.id) || obterIndicadoresPerfil(b, [])

 if (ordenarPor === 'pendencias') return indicadoresB.pendencias - indicadoresA.pendencias

 const valueA = ordenarPor === 'equipe' ? equipeA?.tag || equipeA?.nome || '' : String((a as any)[ordenarPor] || '')
 const valueB = ordenarPor === 'equipe' ? equipeB?.tag || equipeB?.nome || '' : String((b as any)[ordenarPor] || '')

 return valueA.localeCompare(valueB, 'pt-BR')
 })
 }, [busca, filtroPlataforma, filtroSituacao, ordenarPor, perfis, indicadoresPorPerfil])

 const totalPerfis = perfis.length
 const totalComEquipe = perfis.filter((perfil) => normalizarEquipe(perfil.equipes)?.id).length
 const totalMobile = perfis.filter((perfil) => perfil.plataforma === 'mobile').length
 const totalEmulador = perfis.filter((perfil) => perfil.plataforma === 'emulador').length
 const totalConvites = perfis.reduce((acc, perfil) => acc + (indicadoresPorPerfil.get(perfil.id)?.convitesRecebidos || 0), 0)
 const totalPedidos = perfis.reduce((acc, perfil) => acc + (indicadoresPorPerfil.get(perfil.id)?.pedidosEnviados || 0), 0)

 return (
 <div className="space-y-4">
 <section className="border border-zinc-200 bg-white p-4">
 <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
 <div>
 <div className="mb-2 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.22em] text-[#2563eb]">
 <Gamepad2 size={17} />
 Perfis gamer
 </div>
 <h1 className="text-[18px] font-semibold uppercase tracking-tight text-[#142340] md:text-[20px]">
 Contas de jogo
 </h1>
 <p className="mt-1 text-xs font-medium text-zinc-500">
 Gerencie perfis de jogo, vínculos com equipes, convites recebidos e pedidos enviados.
 </p>
 </div>

 <Link
 href="/cadastro"
 className="inline-flex h-10 items-center justify-center gap-2 bg-[#2563eb] px-5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#142340] transition hover:brightness-110"
 >
 <Plus size={16} />
 Novo perfil gamer
 </Link>
 </div>
 </section>

 <section className="grid grid-cols-2 gap-3 md:grid-cols-6">
 <div className="border border-zinc-200 bg-white p-3">
 <div className="flex items-center gap-2 text-[10px] font-semibold uppercase text-zinc-500">
 <Gamepad2 size={14} className="text-[#2563eb]" />
 Perfis
 </div>
 <div className="mt-1 text-[18px] font-semibold text-[#142340]">{totalPerfis}</div>
 <div className="text-[9px] font-semibold uppercase text-zinc-500">cadastrados</div>
 </div>

 <div className="border border-zinc-200 bg-white p-3">
 <div className="flex items-center gap-2 text-[10px] font-semibold uppercase text-zinc-500">
 <Users size={14} className="text-[#2563eb]" />
 Com equipe
 </div>
 <div className="mt-1 text-[18px] font-semibold text-[#142340]">{totalComEquipe}</div>
 <div className="text-[9px] font-semibold uppercase text-zinc-500">vinculados</div>
 </div>

 <div className="border border-zinc-200 bg-white p-3">
 <div className="flex items-center gap-2 text-[10px] font-semibold uppercase text-zinc-500">
 <Smartphone size={14} className="text-[#2563eb]" />
 Mobile
 </div>
 <div className="mt-1 text-[18px] font-semibold text-[#142340]">{totalMobile}</div>
 <div className="text-[9px] font-semibold uppercase text-zinc-500">ativos</div>
 </div>

 <div className="border border-zinc-200 bg-white p-3">
 <div className="flex items-center gap-2 text-[10px] font-semibold uppercase text-zinc-500">
 <Monitor size={14} className="text-[#2563eb]" />
 Emulador
 </div>
 <div className="mt-1 text-[18px] font-semibold text-[#142340]">{totalEmulador}</div>
 <div className="text-[9px] font-semibold uppercase text-zinc-500">ativos</div>
 </div>

 <div className="border border-zinc-200 bg-white p-3">
 <div className="flex items-center gap-2 text-[10px] font-semibold uppercase text-zinc-500">
 <Bell size={14} className="text-[#2563eb]" />
 Convites
 </div>
 <div className="mt-1 text-[18px] font-semibold text-[#142340]">{totalConvites}</div>
 <div className="text-[9px] font-semibold uppercase text-zinc-500">recebidos</div>
 </div>

 <div className="border border-zinc-200 bg-white p-3">
 <div className="flex items-center gap-2 text-[10px] font-semibold uppercase text-zinc-500">
 <Send size={14} className="text-[#2563eb]" />
 Pedidos
 </div>
 <div className="mt-1 text-[18px] font-semibold text-[#142340]">{totalPedidos}</div>
 <div className="text-[9px] font-semibold uppercase text-zinc-500">enviados</div>
 </div>
 </section>

 <section className="border border-zinc-200 bg-white">
 <div className="flex flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
 <div className="flex items-center gap-2 text-[12px] font-semibold uppercase text-[#142340]">
 <Gamepad2 size={16} className="text-[#2563eb]" />
 Lista de perfis gamer
 </div>

 <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
 <div className="relative sm:w-[300px]">
 <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
 <input
 value={busca}
 onChange={(e) => setBusca(e.target.value)}
 placeholder="Buscar nick, UID, equipe..."
 className="h-9 w-full border border-zinc-300 bg-white pl-9 pr-3 text-[12px] font-medium text-[#142340] outline-none focus:border-[#2563eb]"
 />
 </div>

 <select
 value={filtroPlataforma}
 onChange={(e) => setFiltroPlataforma(e.target.value as 'todos' | 'mobile' | 'emulador')}
 className="h-9 border border-zinc-300 bg-white px-3 text-[12px] font-medium text-[#142340] outline-none focus:border-[#2563eb]"
 >
 <option value="todos">Todas plataformas</option>
 <option value="mobile">Mobile</option>
 <option value="emulador">Emulador</option>
 </select>

 <select
 value={filtroSituacao}
 onChange={(e) => setFiltroSituacao(e.target.value as 'todos' | 'com_equipe' | 'sem_equipe' | 'pendencias')}
 className="h-9 border border-zinc-300 bg-white px-3 text-[12px] font-medium text-[#142340] outline-none focus:border-[#2563eb]"
 >
 <option value="todos">Todas situações</option>
 <option value="com_equipe">Com equipe</option>
 <option value="sem_equipe">Sem equipe</option>
 <option value="pendencias">Com pendências</option>
 </select>

 <select
 value={ordenarPor}
 onChange={(e) => setOrdenarPor(e.target.value as 'nick' | 'servidor' | 'plataforma' | 'equipe' | 'pendencias')}
 className="h-9 border border-zinc-300 bg-white px-3 text-[12px] font-medium text-[#142340] outline-none focus:border-[#2563eb]"
 >
 <option value="nick">Ordenar nick</option>
 <option value="servidor">Servidor</option>
 <option value="plataforma">Plataforma</option>
 <option value="equipe">Equipe</option>
 <option value="pendencias">Pendências</option>
 </select>
 </div>
 </div>

 {loading ? (
 <div className="flex items-center justify-center py-12 text-zinc-500">
 <Loader2 size={22} className="animate-spin text-[#2563eb]" />
 </div>
 ) : perfisFiltrados.length > 0 ? (
 <div className="overflow-x-auto px-3 pb-3">
 <div className="min-w-[1360px]">
 <div className="grid grid-cols-[44px_2fr_120px_120px_120px_170px_260px_210px] bg-zinc-50 px-3 py-2.5 text-[10px] font-semibold uppercase text-zinc-500">
 <div>#</div>
 <div>Perfil</div>
 <div>Servidor</div>
 <div>Função</div>
 <div>Plataforma</div>
 <div>Equipe</div>
 <div>Status / convites</div>
 <div className="text-right">Ações</div>
 </div>

 {perfisFiltrados.map((perfil, index) => (
 <PerfilRow
 key={perfil.id}
 perfil={perfil}
 index={index}
 indicadores={indicadoresPorPerfil.get(perfil.id) || obterIndicadoresPerfil(perfil, [])}
 onDelete={excluirPerfil}
 onSairEquipe={sairDaEquipe}
 deletingId={deletingId}
 leavingId={leavingId}
 />
 ))}
 </div>
 </div>
 ) : (
 <div className="border-t border-zinc-200 px-4 py-8 text-center">
 <AlertCircle size={24} className="mx-auto text-zinc-500" />
 <p className="mt-2 text-[12px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
 Nenhum perfil gamer encontrado
 </p>
 <Link
 href="/cadastro"
 className="mt-5 inline-flex items-center gap-2 bg-[#2563eb] px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#142340]"
 >
 <Plus size={15} />
 Criar primeiro perfil
 </Link>
 </div>
 )}
 </section>
 </div>
 )
}
