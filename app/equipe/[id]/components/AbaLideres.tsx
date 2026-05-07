'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { Crown, Shield, UserPlus, UserMinus, Loader2, Search } from 'lucide-react'
import { supabase } from '@/lib/supabase'

type ProfileResumo = {
 id: string
 username: string | null
 nome_exibicao: string | null
 foto_url: string | null
}

type LiderComando = {
 id: string
 tipo: 'dono' | 'admin' | 'manager' | 'membro'
 entrou_em: string | null
 perfilUsuario: ProfileResumo | null
 perfilJogo: { id: string; nick: string | null; foto_capa: string | null; funcao: string | null } | null
}

type MembroEquipeNormalizado = {
 id: string
 equipe_id: string
 perfil_jogo_id: string
 tipo: 'dono' | 'admin' | 'manager' | 'membro'
 ativo: boolean
 entrou_em: string | null
 saiu_em: string | null
 perfil: {
 id: string
 nick: string | null
 foto_capa: string | null
 funcao: string | null
 user_id: string | null
 profile: ProfileResumo | null
 } | null
}

type PerfilBusca = ProfileResumo & {
 perfil_jogo_id: string | null
 nick: string | null
}

type Props = {
 equipeId: string
 membros: LiderComando[]
 todosMembros: MembroEquipeNormalizado[]
 canManageAdmins: boolean
 onAtualizado?: () => void | Promise<void>
}

function nomeUsuario(profile?: ProfileResumo | null) {
 return profile?.nome_exibicao || profile?.username || 'Usuário sem nome'
}

function nomeLider(m: LiderComando) {
 return m.perfilUsuario?.nome_exibicao || m.perfilUsuario?.username || m.perfilJogo?.nick || 'Usuário sem nome'
}

function dataBR(data?: string | null) {
 if (!data) return 'N/I'
 const d = new Date(data)
 return Number.isNaN(d.getTime()) ? 'N/I' : new Intl.DateTimeFormat('pt-BR').format(d)
}

function isUuid(value: string) {
 return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.trim())
}

export default function AbaLideres({ equipeId, membros, todosMembros, canManageAdmins, onAtualizado }: Props) {
 const [busca, setBusca] = useState('')
 const [resultados, setResultados] = useState<PerfilBusca[]>([])
 const [selecionado, setSelecionado] = useState<PerfilBusca | null>(null)
 const [buscando, setBuscando] = useState(false)
 const [salvando, setSalvando] = useState(false)
 const [msg, setMsg] = useState<string | null>(null)
 const [erro, setErro] = useState<string | null>(null)

 const managers = useMemo(() => membros.filter((m) => m.tipo === 'manager'), [membros])
 const dono = useMemo(() => membros.find((m) => m.tipo === 'dono') || null, [membros])

 const idsUsuariosJaVinculados = useMemo(() => {
 const ids = new Set<string>()
 todosMembros.forEach((m) => {
 if (m.ativo && m.perfil?.user_id) ids.add(m.perfil.user_id)
 })
 return ids
 }, [todosMembros])

 useEffect(() => {
 const termo = busca.trim()
 setSelecionado(null)
 setMsg(null)
 setErro(null)

 if (termo.length < 2) {
 setResultados([])
 setBuscando(false)
 return
 }

 const timer = window.setTimeout(async () => {
 try {
 setBuscando(true)

 let query = supabase
 .from('profiles')
 .select('id, username, nome_exibicao, foto_url')
 .limit(10)

 if (isUuid(termo)) {
 query = query.eq('id', termo)
 } else {
 const limpo = termo.replace(/[%_,]/g, '').trim()
 query = query.or(`username.ilike.%${limpo}%,nome_exibicao.ilike.%${limpo}%`)
 }

 const { data: profiles, error } = await query
 if (error) throw error

 const perfis = (profiles || []) as ProfileResumo[]
 const userIds = perfis.map((p) => p.id).filter(Boolean)

 const perfilJogoPorUser = new Map<string, { id: string; nick: string | null }>()

 if (userIds.length > 0) {
 const { data: perfisJogo, error: perfisError } = await supabase
 .from('perfis_jogo')
 .select('id, user_id, nick, ativo')
 .in('user_id', userIds)
 .eq('ativo', true)
 .order('created_at', { ascending: true })

 if (perfisError) throw perfisError

 ;(perfisJogo || []).forEach((p: any) => {
 if (p.user_id && !perfilJogoPorUser.has(p.user_id)) {
 perfilJogoPorUser.set(p.user_id, { id: p.id, nick: p.nick || null })
 }
 })
 }

 const normalizados = perfis
 .filter((p) => !idsUsuariosJaVinculados.has(p.id))
 .map((p) => {
 const gamer = perfilJogoPorUser.get(p.id) || null
 return {
 ...p,
 perfil_jogo_id: gamer?.id || null,
 nick: gamer?.nick || null,
 }
 })

 setResultados(normalizados)
 } catch (e: any) {
 setResultados([])
 setErro(e?.message || 'Não foi possível pesquisar usuários.')
 } finally {
 setBuscando(false)
 }
 }, 450)

 return () => window.clearTimeout(timer)
 }, [busca, idsUsuariosJaVinculados])

 async function adicionarManager() {
 if (!canManageAdmins || !selecionado || salvando) return

 if (!selecionado.perfil_jogo_id) {
 setErro('Esse usuário não possui perfil gamer ativo. Crie um perfil gamer para ele antes de adicionar como manager.')
 return
 }

 try {
 setSalvando(true)
 setErro(null)
 setMsg(null)

 const jaExiste = todosMembros.find((m) => m.ativo && m.perfil?.user_id === selecionado.id)
 if (jaExiste) {
 if (jaExiste.tipo === 'manager') {
 setErro('Esse usuário já é manager desta equipe.')
 return
 }

 const { error: updateError } = await supabase
 .from('membros_equipe')
 .update({ tipo: 'manager', ativo: true, saiu_em: null })
 .eq('id', jaExiste.id)
 .eq('equipe_id', equipeId)
 .neq('tipo', 'dono')

 if (updateError) throw updateError
 } else {
 const { error: insertError } = await supabase.from('membros_equipe').insert({
 equipe_id: equipeId,
 perfil_jogo_id: selecionado.perfil_jogo_id,
 tipo: 'manager',
 ativo: true,
 })

 if (insertError) throw insertError
 }

 setBusca('')
 setResultados([])
 setSelecionado(null)
 setMsg('Manager adicionado à equipe.')
 await onAtualizado?.()
 } catch (e: any) {
 setErro(e?.message || 'Não foi possível adicionar o manager.')
 } finally {
 setSalvando(false)
 }
 }

 async function removerManager(membroId: string) {
 if (!canManageAdmins || !membroId || salvando) return

 try {
 setSalvando(true)
 setErro(null)
 setMsg(null)

 const { error } = await supabase
 .from('membros_equipe')
 .update({ tipo: 'membro' })
 .eq('id', membroId)
 .eq('equipe_id', equipeId)
 .eq('ativo', true)
 .eq('tipo', 'manager')

 if (error) throw error

 setMsg('Manager removido da equipe.')
 await onAtualizado?.()
 } catch (e: any) {
 setErro(e?.message || 'Não foi possível remover o manager.')
 } finally {
 setSalvando(false)
 }
 }

 return (
 <div className="space-y-5">
 <div>
 <h2 className="text-[12px] font-semibold uppercase tracking-[0.35em] text-[#2563eb]">
 // Comando da organização
 </h2>
 <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
 Dono e managers da equipe
 </p>
 </div>

 {canManageAdmins ? (
 <div className="border border-zinc-200 bg-[#f8f8f8] p-4">
 <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
 <div className="flex-1">
 <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.25em] text-[#8ea0be]">
 Adicionar manager
 </label>
 <div className="relative">
 <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={15} />
 <input
 value={busca}
 onChange={(e) => setBusca(e.target.value)}
 placeholder="Pesquise por nome, usuário, nick ou UID"
 className="h-12 w-full border border-zinc-300 bg-white pl-10 pr-3 text-[12px] font-semibold uppercase tracking-[0.14em] text-[#142340] outline-none focus:border-[#2563eb]"
 />
 </div>

 {buscando ? (
 <p className="mt-3 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-500">
 <Loader2 size={13} className="animate-spin" /> Pesquisando perfis...
 </p>
 ) : null}

 {!buscando && busca.trim().length >= 2 && resultados.length === 0 ? (
 <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-500">
 Nenhum perfil encontrado. Pesquise por nome, usuário ou UID da tabela profiles.
 </p>
 ) : null}

 {resultados.length > 0 ? (
 <div className="mt-3 max-h-64 overflow-y-auto border border-zinc-200 bg-white">
 {resultados.map((perfil) => {
 const ativo = selecionado?.id === perfil.id
 return (
 <button
 key={perfil.id}
 type="button"
 onClick={() => setSelecionado(perfil)}
 className={`flex w-full items-center gap-3 border-b border-zinc-100 px-3 py-3 text-left transition last:border-b-0 ${
 ativo ? 'bg-blue-50' : 'hover:bg-zinc-50'
 }`}
 >
 <div className="relative h-10 w-10 shrink-0 overflow-hidden border border-zinc-200 bg-zinc-100">
 {perfil.foto_url ? (
 <Image src={perfil.foto_url} alt={nomeUsuario(perfil)} fill className="object-cover" />
 ) : (
 <div className="flex h-full items-center justify-center text-[11px] font-bold text-zinc-500">
 {nomeUsuario(perfil).slice(0, 2).toUpperCase()}
 </div>
 )}
 </div>
 <div className="min-w-0 flex-1">
 <p className="truncate text-[12px] font-bold uppercase tracking-[0.12em] text-[#142340]">
 {nomeUsuario(perfil)}
 </p>
 <p className="truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
 @{perfil.username || 'sem_usuario'} {perfil.nick ? `// gamer: ${perfil.nick}` : '// sem perfil gamer ativo'}
 </p>
 <p className="truncate text-[9px] font-semibold uppercase tracking-[0.14em] text-[#8ea0be]">
 UID: {perfil.id}
 </p>
 </div>
 </button>
 )
 })}
 </div>
 ) : null}
 </div>

 <button
 type="button"
 disabled={!selecionado || salvando}
 onClick={adicionarManager}
 className="inline-flex h-12 min-w-[210px] items-center justify-center gap-2 border border-[#2563eb] bg-[#2563eb] px-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-white disabled:cursor-not-allowed disabled:border-zinc-300 disabled:bg-zinc-200 disabled:text-zinc-500"
 >
 {salvando ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
 Adicionar manager
 </button>
 </div>

 {erro ? (
 <p className="mt-3 border border-red-200 bg-red-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-red-700">
 {erro}
 </p>
 ) : null}

 {msg ? (
 <p className="mt-3 border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-700">
 {msg}
 </p>
 ) : null}
 </div>
 ) : null}

 <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
 {dono ? (
 <CardLider membro={dono} destaque="dono" />
 ) : null}

 {managers.map((m) => (
 <CardLider key={m.id} membro={m} destaque="manager" canRemove={canManageAdmins} salvando={salvando} onRemove={() => removerManager(m.id)} />
 ))}
 </div>

 {managers.length === 0 ? (
 <div className="border border-zinc-200 bg-white px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
 Esta equipe ainda não possui managers cadastrados.
 </div>
 ) : null}
 </div>
 )
}

function CardLider({
 membro,
 destaque,
 canRemove = false,
 salvando = false,
 onRemove,
}: {
 membro: LiderComando
 destaque: 'dono' | 'manager'
 canRemove?: boolean
 salvando?: boolean
 onRemove?: () => void
}) {
 const nome = nomeLider(membro)
 const foto = membro.perfilUsuario?.foto_url || null
 const gamer = membro.perfilJogo?.nick || null
 const dono = destaque === 'dono'

 return (
 <div className="border border-zinc-200 bg-white">
 <div className={`h-2 ${dono ? 'bg-[#2563eb]' : 'bg-violet-600'}`} />

 <div className="flex gap-4 p-5">
 <div className="relative h-[90px] w-[90px] shrink-0 overflow-hidden border border-zinc-200 bg-zinc-100">
 {foto ? (
 <Image src={foto} alt={nome} fill className="object-cover" />
 ) : (
 <div className="flex h-full items-center justify-center text-2xl font-semibold text-zinc-500">
 {nome.slice(0, 2).toUpperCase()}
 </div>
 )}
 </div>

 <div className="min-w-0 flex-1">
 <h3 className="truncate text-2xl font-semibold uppercase tracking-tight text-[#142340]">
 {nome}
 </h3>

 <div className={`mt-2 inline-flex items-center gap-1 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${
 dono ? 'bg-yellow-300 text-[#142340]' : 'bg-violet-100 text-violet-800'
 }`}>
 {dono ? <Crown size={12} /> : <Shield size={12} />}
 {dono ? 'Dono' : 'Manager'}
 </div>

 {membro.perfilUsuario?.username ? (
 <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8ea0be]">
 Perfil de usuário: @{membro.perfilUsuario.username}
 </p>
 ) : null}

 {gamer ? (
 <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
 Perfil gamer vinculado: {gamer}
 </p>
 ) : null}

 <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
 Entrou em {dataBR(membro.entrou_em)}
 </p>
 </div>
 </div>

 {canRemove && !dono ? (
 <div className="border-t border-zinc-200 p-4">
 <button
 type="button"
 disabled={salvando}
 onClick={onRemove}
 className="inline-flex h-10 w-full items-center justify-center gap-2 border border-red-300 bg-red-50 px-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
 >
 {salvando ? <Loader2 size={13} className="animate-spin" /> : <UserMinus size={13} />}
 Remover manager
 </button>
 </div>
 ) : null}
 </div>
 )
}
