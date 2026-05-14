'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
 Check,
 Loader2,
 Search,
 Send,
 UserCheck,
 Shield,
 Trash2,
 UserCircle2,
 UserPlus2,
 Users,
 X,
 Zap,
 Crosshair,
 Inbox,
} from 'lucide-react'
import Image from 'next/image'
import PlayerCard from '@/app/components/PlayerCard'

type PerfilEquipe = {
 id: string
 nick: string | null
 foto_capa: string | null
 funcao: string | null
 user_id?: string | null
 equipe_id?: string | null
}

type Membro = {
 id: string
 tipo: 'dono' | 'admin' | 'membro'
 entrou_em: string | null
 perfil?: PerfilEquipe | null
}

type ConviteEquipe = {
 id: string
 tipo: 'convite' | 'pedido'
 status: 'pendente' | 'aceito' | 'recusado' | 'cancelado'
 mensagem: string | null
 created_at: string
 perfil: PerfilEquipe | null
}

type SubAbaAtletas = 'elenco' | 'convites' | 'pedidos' | 'avulsos'

type JogadorAvulsoEscalado = {
 row_id: string
 campeonato_id: string
 campeonato_nome: string
 campeonato_logo: string | null
 jogador_avulso_id: string
 nick: string
 uid_jogo: string | null
 funcao: string | null
 foto_url: string | null
 observacoes: string | null
 origem: string | null
}

function roleIcon(role: string | null) {
 switch ((role || '').toLowerCase()) {
 case 'sniper':
 return <Crosshair size={14} className="text-red-500" />
 case 'suporte':
 return <Shield size={14} className="text-blue-500" />
 case 'granadeiro':
 return <Zap size={14} className="text-yellow-500" />
 default:
 return <Users size={14} className="text-zinc-500" />
 }
}

function tierPorIndice(index: number): 'SS' | 'S' | 'A' | 'B' | 'C' | 'D' | 'E' {
 if (index === 0) return 'B'
 if (index === 1) return 'C'
 if (index === 2) return 'C'
 return 'D'
}

function formatarData(data?: string | null) {
 if (!data) return 'N/I'
 const d = new Date(data)
 if (Number.isNaN(d.getTime())) return 'N/I'
 return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(d)
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

export default function AbaJogadores({
 equipeId,
 membros,
 canManage,
 onAtualizado,
}: {
 equipeId: string
 membros: Membro[]
 canManage: boolean
 onAtualizado: () => Promise<void>
}) {
 const [loading, setLoading] = useState(true)
 const [processandoId, setProcessandoId] = useState<string | null>(null)
 const [busca, setBusca] = useState('')
 const [mensagemConvite, setMensagemConvite] = useState('')
 const [candidatos, setCandidatos] = useState<PerfilEquipe[]>([])
 const [pedidos, setPedidos] = useState<ConviteEquipe[]>([])
 const [convitesEnviados, setConvitesEnviados] = useState<ConviteEquipe[]>([])
 const [carregandoBusca, setCarregandoBusca] = useState(false)
 const [avulsosEscalados, setAvulsosEscalados] = useState<JogadorAvulsoEscalado[]>([])
 const [perfilTrocaPorLinha, setPerfilTrocaPorLinha] = useState<Record<string, string>>({})
 const [abaAtletasAtiva, setAbaAtletasAtiva] = useState<SubAbaAtletas>('elenco')

 const atletas = useMemo(() => membros.filter((m) => !!m.perfil?.id), [membros])

 const idsBloqueados = useMemo(() => {
 const set = new Set<string>()
 membros.forEach((m) => {
 if (m.perfil?.id) set.add(m.perfil.id)
 })
 pedidos.forEach((p) => {
 if (p.perfil?.id) set.add(p.perfil.id)
 })
 convitesEnviados.forEach((p) => {
 if (p.perfil?.id) set.add(p.perfil.id)
 })
 return set
 }, [membros, pedidos, convitesEnviados])

 const carregarAvulsosEscalados = useCallback(async () => {
 try {
 const { data: linhas, error: linhasError } = await supabase
 .from('jogadores_campeonato')
 .select('id, campeonato_id, jogador_avulso_id, observacoes, status, origem')
 .eq('equipe_id', equipeId)
 .not('jogador_avulso_id', 'is', null)
 .neq('status', 'inativo')

 if (linhasError) throw linhasError

 const rows = ((linhas || []) as any[]).filter((row) => !!row.jogador_avulso_id)

 if (rows.length === 0) {
 setAvulsosEscalados([])
 return
 }

 const idsAvulsos = Array.from(new Set(rows.map((row) => String(row.jogador_avulso_id))))
 const idsCampeonatos = Array.from(new Set(rows.map((row) => String(row.campeonato_id))))

 const { data: avulsosData, error: avulsosError } = await supabase
 .from('jogadores_avulsos_campeonato')
 .select('id, nick, uid_jogo, funcao, foto_url')
 .in('id', idsAvulsos)

 if (avulsosError) throw avulsosError

 const { data: campeonatosData, error: campeonatosError } = await supabase
 .from('campeonatos')
 .select('id, nome, logo_url')
 .in('id', idsCampeonatos)

 if (campeonatosError) throw campeonatosError

 const avulsosMap = new Map((avulsosData || []).map((item: any) => [String(item.id), item]))
 const campeonatosMap = new Map((campeonatosData || []).map((item: any) => [String(item.id), item]))

 const lista = rows
 .map((row) => {
 const avulso = avulsosMap.get(String(row.jogador_avulso_id))
 const campeonato = campeonatosMap.get(String(row.campeonato_id))

 if (!avulso) return null

 return {
 row_id: String(row.id),
 campeonato_id: String(row.campeonato_id),
 campeonato_nome: campeonato?.nome || 'Campeonato',
 campeonato_logo: campeonato?.logo_url || null,
 jogador_avulso_id: String(row.jogador_avulso_id),
 nick: avulso.nick || 'Jogador avulso',
 uid_jogo: avulso.uid_jogo || null,
 funcao: avulso.funcao || null,
 foto_url: avulso.foto_url || null,
 observacoes: row.observacoes || null,
 origem: row.origem || null,
 } satisfies JogadorAvulsoEscalado
 })
 .filter((item): item is JogadorAvulsoEscalado => item !== null)

 setAvulsosEscalados(lista)
 } catch (error) {
 console.error('Erro ao carregar jogadores avulsos escalados:', error)
 setAvulsosEscalados([])
 }
 }, [equipeId])

 const carregarPendencias = useCallback(async () => {
 try {
 setLoading(true)

 const { data, error } = await supabase
 .from('convites_equipe')
 .select(`
 id,
 tipo,
 status,
 mensagem,
 created_at,
 perfil:perfil_jogo_id (
 id,
 nick,
 foto_capa,
 funcao,
 user_id,
 equipe_id
 )
 `)
 .eq('equipe_id', equipeId)
 .eq('status', 'pendente')
 .order('created_at', { ascending: false })

 if (error) throw error

 const lista = ((data || []) as any[]).map((item) => ({
 id: item.id,
 tipo: item.tipo || 'convite',
 status: item.status,
 mensagem: item.mensagem,
 created_at: item.created_at,
 perfil: Array.isArray(item.perfil) ? item.perfil[0] || null : item.perfil || null,
 })) as ConviteEquipe[]

 setPedidos(lista.filter((i) => i.tipo === 'pedido'))
 setConvitesEnviados(lista.filter((i) => i.tipo !== 'pedido'))
 } catch (error) {
 console.error('Erro ao carregar pendências da equipe:', error)
 } finally {
 setLoading(false)
 }
 }, [equipeId])

 useEffect(() => {
 carregarPendencias()
 carregarAvulsosEscalados()
 }, [carregarPendencias, carregarAvulsosEscalados])

 const buscarPerfis = useCallback(async () => {
 const termo = busca.trim()
 if (!termo || termo.length < 2) {
 setCandidatos([])
 return
 }

 try {
 setCarregandoBusca(true)

 const { data, error } = await supabase
 .from('perfis_jogo')
 .select('id, nick, foto_capa, funcao, user_id, equipe_id')
 .eq('ativo', true)
 .or(`equipe_id.is.null,equipe_id.eq.${equipeId}`)
 .ilike('nick', `%${termo}%`)
 .order('nick', { ascending: true })
 .limit(12)

 if (error) throw error

 const lista = ((data || []) as PerfilEquipe[]).filter((perfil) => !idsBloqueados.has(perfil.id))
 setCandidatos(lista)
 } catch (error) {
 console.error('Erro ao buscar perfis:', error)
 } finally {
 setCarregandoBusca(false)
 }
 }, [busca, equipeId, idsBloqueados])

 useEffect(() => {
 const t = setTimeout(() => {
 buscarPerfis()
 }, 250)
 return () => clearTimeout(t)
 }, [buscarPerfis])

 async function enviarConvite(perfilId: string) {
 try {
 setProcessandoId(perfilId)

 await rpcFallback(['enviar_convite_equipe_v2', 'enviar_convite_equipe'], {
 p_equipe_id: equipeId,
 p_perfil_jogo_id: perfilId,
 p_mensagem: mensagemConvite || null,
 })

 setMensagemConvite('')
 setBusca('')
 setCandidatos([])
 await carregarPendencias()
 alert('Convite enviado.')
 } catch (error: any) {
 console.error('Erro ao enviar convite:', error)
 alert(error?.message || 'Erro ao enviar convite.')
 } finally {
 setProcessandoId(null)
 }
 }

 async function aceitarPedido(conviteId: string) {
 try {
 setProcessandoId(conviteId)
 await rpcFallback(['aceitar_convite_equipe_v2', 'aceitar_convite_equipe'], {
 p_convite_id: conviteId,
 })
 await carregarPendencias()
 await onAtualizado()
 alert('Pedido aceito com sucesso.')
 } catch (error: any) {
 console.error('Erro ao aceitar pedido:', error)
 alert(error?.message || 'Erro ao aceitar pedido.')
 } finally {
 setProcessandoId(null)
 }
 }

 async function recusarPedido(conviteId: string) {
 try {
 setProcessandoId(conviteId)
 await rpcFallback(['recusar_convite_equipe_v2', 'recusar_convite_equipe'], {
 p_convite_id: conviteId,
 })
 await carregarPendencias()
 alert('Solicitação recusada.')
 } catch (error: any) {
 console.error('Erro ao recusar pedido:', error)
 alert(error?.message || 'Erro ao recusar pedido.')
 } finally {
 setProcessandoId(null)
 }
 }

 async function removerMembro(perfilId: string) {
 const confirmou = confirm('Remover este jogador da equipe?')
 if (!confirmou) return

 try {
 setProcessandoId(perfilId)
 await rpcFallback(['remover_membro_equipe_v2', 'remover_membro_equipe'], {
 p_equipe_id: equipeId,
 p_perfil_jogo_id: perfilId,
 })
 await onAtualizado()
 await carregarPendencias()
 alert('Jogador removido da equipe.')
 } catch (error: any) {
 console.error('Erro ao remover jogador:', error)
 alert(error?.message || 'Erro ao remover jogador.')
 } finally {
 setProcessandoId(null)
 }
 }

 async function trocarAvulsoPorPerfil(rowId: string) {
 const perfilId = perfilTrocaPorLinha[rowId]

 if (!perfilId) {
 alert('Selecione um perfil de jogo para fazer a troca.')
 return
 }

 try {
 setProcessandoId(rowId)

 const { error } = await supabase
 .from('jogadores_campeonato')
 .update({
 perfil_jogo_id: perfilId,
 jogador_avulso_id: null,
 origem: 'app',
 status: 'ativo',
 updated_at: new Date().toISOString(),
 })
 .eq('id', rowId)

 if (error) {
 const { error: retryError } = await supabase
 .from('jogadores_campeonato')
 .update({
 perfil_jogo_id: perfilId,
 jogador_avulso_id: null,
 origem: 'app',
 status: 'ativo',
 })
 .eq('id', rowId)

 if (retryError) throw retryError
 }

 setPerfilTrocaPorLinha((atual) => {
 const novo = { ...atual }
 delete novo[rowId]
 return novo
 })

 await carregarAvulsosEscalados()
 await onAtualizado()
 alert('Jogador avulso trocado por perfil de jogo.')
 } catch (error: any) {
 console.error('Erro ao trocar jogador avulso por perfil:', error)
 alert(error?.message || 'Erro ao trocar jogador avulso por perfil.')
 } finally {
 setProcessandoId(null)
 }
 }

 return (
 <div className="space-y-10">

 <div className="flex flex-wrap gap-2 border-b border-zinc-200 pb-4">
 {[
 { key: 'elenco', label: 'Elenco principal', total: atletas.length },
 { key: 'convites', label: 'Convites enviados', total: convitesEnviados.length },
 { key: 'pedidos', label: 'Pedidos recebidos', total: pedidos.length },
 { key: 'avulsos', label: 'Jogadores avulsos', total: avulsosEscalados.length },
 ].map((aba) => (
 <button
 key={aba.key}
 type="button"
 onClick={() => setAbaAtletasAtiva(aba.key as SubAbaAtletas)}
 className={`inline-flex items-center gap-2 border px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] transition ${
 abaAtletasAtiva === aba.key
 ? 'border-[#2563eb] bg-[#2563eb] text-white'
 : 'border-zinc-200 bg-white text-[#142340] hover:border-[#2563eb]'
 }`}
 >
 <span>{aba.label}</span>
 <span className={`border px-2 py-0.5 text-[10px] ${
 abaAtletasAtiva === aba.key ? 'border-white/40 text-white' : 'border-zinc-200 text-zinc-500'
 }`}>
 {aba.total}
 </span>
 </button>
 ))}
 </div>

 <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
 <div className="border border-zinc-200 bg-white shadow-sm transition hover:border-[#2563eb] hover:shadow-lg p-5">
 <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
 Atletas ativos
 </p>
 <p className="mt-3 text-3xl font-semibold text-[#142340]">
 {atletas.length}
 </p>
 </div>

 <div className="border border-zinc-200 bg-white shadow-sm transition hover:border-[#2563eb] hover:shadow-lg p-5">
 <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
 Pedidos pendentes
 </p>
 <p className="mt-3 text-3xl font-semibold text-[#142340]">
 {pedidos.length}
 </p>
 </div>

 <div className="border border-zinc-200 bg-white shadow-sm transition hover:border-[#2563eb] hover:shadow-lg p-5">
 <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
 Convites enviados
 </p>
 <p className="mt-3 text-3xl font-semibold text-[#142340]">
 {convitesEnviados.length}
 </p>
 </div>
 </div>

 <div className={`${abaAtletasAtiva === 'elenco' ? 'block' : 'hidden'} animate-in fade-in slide-in-from-bottom-4 duration-500`}>
 <h2 className="mb-8 text-[12px] font-semibold uppercase tracking-[0.35em] text-[#2563eb]">
 // ELENCO ATIVO
 </h2>

 <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
 {atletas.length > 0 ? (
 atletas.map((jogador, index) => (
 <div key={jogador.id} className="flex flex-col items-start gap-3">
 <PlayerCard
 name={jogador.perfil?.nick || 'Jogador'}
 number={index + 1}
 tier={tierPorIndice(index)}
 photoUrl={jogador.perfil?.foto_capa || null}
 variant="oficial"
 className="max-w-[210px]"
 />

 <div className="w-full max-w-[210px]">
 <h3 className="truncate text-[14px] font-black uppercase leading-none text-[#142340]">
 {jogador.perfil?.nick || 'Sem nick'}
 </h3>

 <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-500">
 UID: {jogador.perfil?.id?.slice(0, 12) || 'N/I'}
 </p>

 <div className="mt-3 flex flex-wrap gap-2">
 <span className="inline-flex items-center gap-1 border border-zinc-200 bg-white px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-[#142340]">
 {roleIcon(jogador.perfil?.funcao || null)}
 {jogador.perfil?.funcao || 'Sem função'}
 </span>

 <span className="border border-[#2563eb]/20 bg-[#2563eb]/10 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-[#2563eb]">
 {jogador.tipo}
 </span>
 </div>

 <p className="mt-2 text-[9px] font-bold uppercase tracking-[0.12em] text-zinc-500">
 Entrou em {formatarData(jogador.entrou_em)}
 </p>

 {canManage ? (
 <button
 onClick={() => removerMembro(jogador.perfil?.id || '')}
 disabled={processandoId === jogador.perfil?.id || !jogador.perfil?.id}
 className="mt-3 inline-flex items-center gap-2 border border-red-300 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-red-500 transition hover:bg-red-50 disabled:opacity-50"
 >
 {processandoId === jogador.perfil?.id ? (
 <Loader2 size={13} className="animate-spin" />
 ) : (
 <Trash2 size={13} />
 )}
 Remover
 </button>
 ) : null}
 </div>
 </div>
 ))
 ) : (
 <div className="col-span-full border border-dashed border-zinc-200 bg-zinc-50 py-10 text-center text-[11px] font-semibold uppercase text-zinc-500">
 Nenhum jogador ativo encontrado.
 </div>
 )}
 </div>
 </div>

 {abaAtletasAtiva === 'avulsos' && avulsosEscalados.length > 0 ? (
 <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
 <h2 className="mb-8 text-[12px] font-semibold uppercase tracking-[0.35em] text-[#2563eb]">
 // ESCALADOS PELO ORGANIZADOR
 </h2>

 <div className="border border-zinc-200 bg-white shadow-sm transition hover:border-[#2563eb] hover:shadow-lg p-5">
 <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#142340]">
 Jogadores avulsos usados em campeonatos
 </p>
 <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.1em] text-zinc-500">
 Esses jogadores foram escalados pelo organizador do campeonato. Aqui eles aparecem na equipe e podem ser trocados por um perfil de jogo real.
 </p>

 <div className="mt-5 grid grid-cols-1 gap-4">
 {avulsosEscalados.map((jogador) => (
 <div
 key={jogador.row_id}
 className="grid grid-cols-1 gap-4 border border-zinc-200 bg-white p-4 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-center"
 >
 <div className="flex items-center gap-4">
 <div className="relative h-16 w-16 shrink-0 overflow-hidden border border-zinc-200 bg-white shadow-sm transition hover:border-[#2563eb] hover:shadow-lg">
 {jogador.foto_url ? (
 <Image src={jogador.foto_url} alt={jogador.nick} fill className="object-cover" />
 ) : jogador.campeonato_logo ? (
 <Image src={jogador.campeonato_logo} alt={jogador.campeonato_nome} fill className="object-contain p-1" />
 ) : (
 <div className="flex h-full w-full items-center justify-center text-zinc-500">
 <UserCircle2 size={24} />
 </div>
 )}
 </div>

 <div className="min-w-0">
 <div className="flex flex-wrap items-center gap-2">
 <h3 className="truncate text-[18px] font-semibold uppercase text-[#142340]">
 {jogador.nick}
 </h3>
 <span className="border border-orange-300 bg-orange-50 px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.12em] text-orange-600">
 Avulso / Súmula
 </span>
 </div>

 <div className="mt-2 flex flex-wrap items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
 <span>{jogador.campeonato_nome}</span>
 {jogador.uid_jogo ? <span>• ID {jogador.uid_jogo}</span> : null}
 {jogador.funcao ? <span>• {jogador.funcao}</span> : null}
 {jogador.observacoes ? <span>• {jogador.observacoes}</span> : null}
 </div>
 </div>
 </div>

 {canManage ? (
 <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
 <select
 value={perfilTrocaPorLinha[jogador.row_id] || ''}
 onChange={(e) =>
 setPerfilTrocaPorLinha((atual) => ({
 ...atual,
 [jogador.row_id]: e.target.value,
 }))
 }
 className="h-11 w-full border border-zinc-200 bg-white px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#142340] outline-none focus:border-[#2563eb]"
 >
 <option value="">Trocar por perfil de jogo...</option>
 {atletas.map((membro) =>
 membro.perfil?.id ? (
 <option key={membro.perfil.id} value={membro.perfil.id}>
 {membro.perfil.nick || 'Sem nick'}
 </option>
 ) : null
 )}
 </select>

 <button
 onClick={() => trocarAvulsoPorPerfil(jogador.row_id)}
 disabled={processandoId === jogador.row_id || !perfilTrocaPorLinha[jogador.row_id]}
 className="inline-flex h-11 items-center justify-center gap-2 border border-[#2563eb] bg-[#2563eb] px-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#142340] transition hover:opacity-90 disabled:opacity-50"
 >
 {processandoId === jogador.row_id ? (
 <Loader2 size={14} className="animate-spin" />
 ) : (
 <UserCheck size={14} />
 )}
 Vincular
 </button>
 </div>
 ) : (
 <div className="border border-zinc-200 bg-white shadow-sm transition hover:border-[#2563eb] hover:shadow-lg px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
 Aguardando vínculo com perfil de jogo
 </div>
 )}
 </div>
 ))}
 </div>
 </div>
 </div>
 ) : null}


 {canManage ? (
 <>
 <div className={`${abaAtletasAtiva === 'convites' ? 'block' : 'hidden'} border border-zinc-200 bg-white shadow-sm transition hover:border-[#2563eb] hover:shadow-lg p-6`}>
 <h2 className="text-[12px] font-semibold uppercase tracking-[0.35em] text-[#2563eb]">
 // ADICIONAR ATLETAS
 </h2>

 <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px_auto]">
 <div className="relative">
 <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
 <input
 value={busca}
 onChange={(e) => setBusca(e.target.value)}
 placeholder="Buscar perfil gamer por nick..."
 className="h-12 w-full border border-zinc-200 bg-white pl-11 pr-4 text-[12px] font-bold uppercase tracking-[0.08em] text-[#142340] outline-none focus:border-[#2563eb]"
 />
 </div>

 <input
 value={mensagemConvite}
 onChange={(e) => setMensagemConvite(e.target.value)}
 placeholder="Mensagem opcional"
 className="h-12 w-full border border-zinc-200 bg-white px-4 text-[12px] font-semibold text-[#142340] outline-none focus:border-[#2563eb]"
 />

 <div className="flex h-12 items-center border border-zinc-200 bg-white px-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
 <UserPlus2 size={14} className="mr-2 text-[#2563eb]" />
 Convite para equipe
 </div>
 </div>

 <div className="mt-4 grid grid-cols-1 gap-3">
 {carregandoBusca ? (
 <div className="flex items-center gap-2 border border-zinc-200 bg-white px-4 py-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
 <Loader2 size={14} className="animate-spin" />
 Buscando perfis...
 </div>
 ) : candidatos.length > 0 ? (
 candidatos.map((perfil) => (
 <div
 key={perfil.id}
 className="flex flex-col gap-4 border border-zinc-200 bg-white p-4 md:flex-row md:items-center md:justify-between"
 >
 <div className="flex items-center gap-4">
 <div className="relative h-14 w-14 overflow-hidden border border-zinc-200 bg-white shadow-sm transition hover:border-[#2563eb] hover:shadow-lg">
 {perfil.foto_capa ? (
 <Image
 src={perfil.foto_capa}
 alt={perfil.nick || 'Perfil'}
 fill
 className="object-cover"
 />
 ) : (
 <div className="flex h-full w-full items-center justify-center text-zinc-500">
 <UserCircle2 size={20} />
 </div>
 )}
 </div>

 <div>
 <p className="text-[18px] font-semibold uppercase text-[#142340]">
 {perfil.nick || 'Sem nick'}
 </p>
 <p className="mt-1 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-500">
 {roleIcon(perfil.funcao || null)}
 {perfil.funcao || 'Sem função'}
 </p>
 </div>
 </div>

 <button
 onClick={() => enviarConvite(perfil.id)}
 disabled={processandoId === perfil.id}
 className="inline-flex h-11 items-center justify-center gap-2 border border-[#2563eb] bg-[#2563eb] px-5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#142340] transition hover:opacity-90 disabled:opacity-60"
 >
 {processandoId === perfil.id ? (
 <Loader2 size={14} className="animate-spin" />
 ) : (
 <Send size={14} />
 )}
 Convidar
 </button>
 </div>
 ))
 ) : busca.trim().length >= 2 ? (
 <div className="border border-dashed border-zinc-200 bg-white py-6 text-center text-[11px] font-semibold uppercase text-zinc-500">
 Nenhum perfil gamer livre encontrado.
 </div>
 ) : null}
 </div>
 </div>

 <div className="block">
 <div className={`${abaAtletasAtiva === 'pedidos' ? 'block' : 'hidden'} border border-zinc-200 bg-white shadow-sm transition hover:border-[#2563eb] hover:shadow-lg p-6`}>
 <h2 className="text-[12px] font-semibold uppercase tracking-[0.35em] text-[#2563eb]">
 // PEDIDOS PARA ENTRAR
 </h2>

 <div className="mt-6 space-y-4">
 {loading ? (
 <div className="flex items-center gap-2 py-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
 <Loader2 size={14} className="animate-spin" />
 Carregando pedidos...
 </div>
 ) : pedidos.length > 0 ? (
 pedidos.map((pedido) => (
 <div key={pedido.id} className="border border-zinc-200 bg-white p-4">
 <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
 <div className="flex items-center gap-4">
 <div className="relative h-14 w-14 overflow-hidden border border-zinc-200 bg-white shadow-sm transition hover:border-[#2563eb] hover:shadow-lg">
 {pedido.perfil?.foto_capa ? (
 <Image
 src={pedido.perfil.foto_capa}
 alt={pedido.perfil.nick || 'Jogador'}
 fill
 className="object-cover"
 />
 ) : (
 <div className="flex h-full w-full items-center justify-center text-zinc-500">
 <UserCircle2 size={20} />
 </div>
 )}
 </div>

 <div>
 <p className="text-[18px] font-semibold uppercase text-[#142340]">
 {pedido.perfil?.nick || 'Sem nick'}
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

 <div className="flex gap-3">
 <button
 onClick={() => recusarPedido(pedido.id)}
 disabled={processandoId === pedido.id}
 className="inline-flex h-11 items-center gap-2 border border-red-300 px-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-red-500 transition hover:bg-red-50 disabled:opacity-50"
 >
 {processandoId === pedido.id ? (
 <Loader2 size={14} className="animate-spin" />
 ) : (
 <X size={14} />
 )}
 Recusar
 </button>

 <button
 onClick={() => aceitarPedido(pedido.id)}
 disabled={processandoId === pedido.id}
 className="inline-flex h-11 items-center gap-2 border border-[#2563eb] bg-[#2563eb] px-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#142340] transition hover:opacity-90 disabled:opacity-60"
 >
 {processandoId === pedido.id ? (
 <Loader2 size={14} className="animate-spin" />
 ) : (
 <Check size={14} />
 )}
 Aceitar
 </button>
 </div>
 </div>
 </div>
 ))
 ) : (
 <div className="border border-dashed border-zinc-200 bg-white py-6 text-center text-[11px] font-semibold uppercase text-zinc-500">
 Nenhum pedido pendente.
 </div>
 )}
 </div>
 </div>

 <div className={`${abaAtletasAtiva === 'convites' ? 'block' : 'hidden'} border border-zinc-200 bg-white shadow-sm transition hover:border-[#2563eb] hover:shadow-lg p-6`}>
 <h2 className="text-[12px] font-semibold uppercase tracking-[0.35em] text-[#2563eb]">
 // CONVITES ENVIADOS
 </h2>

 <div className="mt-6 space-y-4">
 {loading ? (
 <div className="flex items-center gap-2 py-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
 <Loader2 size={14} className="animate-spin" />
 Carregando convites...
 </div>
 ) : convitesEnviados.length > 0 ? (
 convitesEnviados.map((convite) => (
 <div key={convite.id} className="border border-zinc-200 bg-white p-4">
 <div className="flex items-center gap-4">
 <div className="relative h-14 w-14 overflow-hidden border border-zinc-200 bg-white shadow-sm transition hover:border-[#2563eb] hover:shadow-lg">
 {convite.perfil?.foto_capa ? (
 <Image
 src={convite.perfil.foto_capa}
 alt={convite.perfil.nick || 'Convidado'}
 fill
 className="object-cover"
 />
 ) : (
 <div className="flex h-full w-full items-center justify-center text-zinc-500">
 <UserCircle2 size={20} />
 </div>
 )}
 </div>

 <div>
 <p className="text-[18px] font-semibold uppercase text-[#142340]">
 {convite.perfil?.nick || 'Sem nick'}
 </p>
 <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-500">
 Convite pendente desde {formatarData(convite.created_at)}
 </p>
 {convite.mensagem ? (
 <p className="mt-2 text-[12px] font-semibold text-zinc-600">
 {convite.mensagem}
 </p>
 ) : null}
 </div>
 </div>
 </div>
 ))
 ) : (
 <div className="border border-dashed border-zinc-200 bg-white py-6 text-center text-[11px] font-semibold uppercase text-zinc-500">
 Nenhum convite pendente.
 </div>
 )}
 </div>
 </div>
 </div>
 </>
 ) : null}

 {!canManage ? (
 <div className="border border-dashed border-zinc-200 bg-zinc-50 py-8 text-center">
 <Inbox className="mx-auto mb-3 text-zinc-500" size={18} />
 <p className="text-[11px] font-semibold uppercase text-zinc-500">
 Somente líderes podem gerenciar atletas e convites.
 </p>
 </div>
 ) : null}
 </div>
 )
}
