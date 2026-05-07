'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { Crown, Shield, Search, UserPlus, UserMinus, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

type TipoMembro = 'dono' | 'admin' | 'manager' | 'membro'

type ProfileResumo = {
 id: string
 username: string | null
 nome_exibicao: string | null
 foto_url: string | null
}

type PerfilJogoResumo = {
 id: string
 nick: string | null
 foto_capa: string | null
 funcao: string | null
 user_id: string | null
 profile: ProfileResumo | null
}

type LiderComando = {
 id: string
 tipo: TipoMembro
 entrou_em: string | null
 perfilUsuario: ProfileResumo | null
 perfilJogo: { id: string; nick: string | null; foto_capa: string | null; funcao: string | null } | null
}

type MembroEquipeNormalizado = {
 id: string
 equipe_id: string
 perfil_jogo_id: string
 tipo: TipoMembro
 ativo: boolean
 entrou_em: string | null
 saiu_em: string | null
 perfil: PerfilJogoResumo | null
}

type ResultadoBusca = {
 perfil_jogo_id: string
 user_id: string | null
 nick: string | null
 foto_capa: string | null
 funcao: string | null
 username: string | null
 nome_exibicao: string | null
 foto_url: string | null
 jaEstaNaEquipe: boolean
 jaEhManager: boolean
}

type Props = {
 equipeId: string
 membros: LiderComando[]
 todosMembros: MembroEquipeNormalizado[]
 canManageAdmins: boolean
 onAtualizado?: () => void | Promise<void>
}

function nomeBusca(r: ResultadoBusca) {
 return r.nome_exibicao || r.username || r.nick || 'Usuário sem nome'
}

function nomeLider(m: LiderComando) {
 return m.perfilUsuario?.nome_exibicao || m.perfilUsuario?.username || m.perfilJogo?.nick || 'Usuário sem nome'
}

function dataBR(data?: string | null) {
 if (!data) return 'N/I'
 const d = new Date(data)
 return Number.isNaN(d.getTime()) ? 'N/I' : new Intl.DateTimeFormat('pt-BR').format(d)
}

function normalizarProfile(profile: any): ProfileResumo | null {
 if (!profile) return null
 const resolved = Array.isArray(profile) ? profile[0] : profile
 if (!resolved) return null
 return {
 id: String(resolved.id || ''),
 username: resolved.username || null,
 nome_exibicao: resolved.nome_exibicao || null,
 foto_url: resolved.foto_url || null,
 }
}

export default function AbaLideres({ equipeId, membros, todosMembros, canManageAdmins, onAtualizado }: Props) {
 const [busca, setBusca] = useState('')
 const [resultados, setResultados] = useState<ResultadoBusca[]>([])
 const [selecionado, setSelecionado] = useState<ResultadoBusca | null>(null)
 const [buscando, setBuscando] = useState(false)
 const [salvando, setSalvando] = useState(false)
 const [msg, setMsg] = useState<string | null>(null)
 const [erro, setErro] = useState<string | null>(null)

 const managers = useMemo(() => membros.filter((m) => m.tipo === 'manager' || m.tipo === 'admin'), [membros])
 const dono = useMemo(() => membros.find((m) => m.tipo === 'dono') || null, [membros])

 const membrosAtivosPorPerfilJogo = useMemo(() => {
 const map = new Map<string, MembroEquipeNormalizado>()
 todosMembros.forEach((m) => {
 if (m.ativo && m.perfil_jogo_id) map.set(String(m.perfil_jogo_id), m)
 })
 return map
 }, [todosMembros])

 useEffect(() => {
 const termo = busca.trim()
 setSelecionado(null)
 setMsg(null)
 setErro(null)

 if (!canManageAdmins || termo.length < 2) {
 setResultados([])
 setBuscando(false)
 return
 }

 const timer = window.setTimeout(async () => {
 try {
 setBuscando(true)
 setErro(null)

 const termos = termo.split(/\s+/).filter(Boolean).slice(0, 3)
 const perfilFilters = termos.flatMap((t) => [`nick.ilike.%${t}%`, `uid_jogo.ilike.%${t}%`]).join(',')
 const profileFilters = termos
 .flatMap((t) => [`username.ilike.%${t}%`, `nome_exibicao.ilike.%${t}%`])
 .join(',')

 const [perfisPorNickRes, profilesRes] = await Promise.all([
 supabase
 .from('perfis_jogo')
 .select(`
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
 `)
 .eq('ativo', true)
 .or(perfilFilters)
 .limit(12),

 supabase
 .from('profiles')
 .select('id, username, nome_exibicao, foto_url')
 .or(profileFilters)
 .limit(12),
 ])

 if (perfisPorNickRes.error) throw perfisPorNickRes.error
 if (profilesRes.error) throw profilesRes.error

 const userIds = Array.from(new Set((profilesRes.data || []).map((p: any) => String(p.id || '')).filter(Boolean)))
 const perfisPorUsuarioRes = userIds.length
 ? await supabase
 .from('perfis_jogo')
 .select(`
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
 `)
 .eq('ativo', true)
 .in('user_id', userIds)
 .limit(20)
 : { data: [], error: null }

 if (perfisPorUsuarioRes.error) throw perfisPorUsuarioRes.error

 const mapa = new Map<string, ResultadoBusca>()
 ;[...(perfisPorNickRes.data || []), ...(perfisPorUsuarioRes.data || [])].forEach((p: any) => {
 const id = String(p.id || '')
 if (!id || mapa.has(id)) return

 const profile = normalizarProfile(p.profiles)
 const vinculo = membrosAtivosPorPerfilJogo.get(id)
 const tipoAtual = String(vinculo?.tipo || '').toLowerCase()

 mapa.set(id, {
 perfil_jogo_id: id,
 user_id: p.user_id || profile?.id || null,
 nick: p.nick || null,
 foto_capa: p.foto_capa || null,
 funcao: p.funcao || null,
 username: profile?.username || null,
 nome_exibicao: profile?.nome_exibicao || null,
 foto_url: profile?.foto_url || null,
 jaEstaNaEquipe: !!vinculo,
 jaEhManager: tipoAtual === 'manager' || tipoAtual === 'admin' || tipoAtual === 'dono',
 })
 })

 setResultados(Array.from(mapa.values()).sort((a, b) => nomeBusca(a).localeCompare(nomeBusca(b), 'pt-BR')).slice(0, 12))
 } catch (e: any) {
 setResultados([])
 setErro(e?.message || 'Não foi possível pesquisar usuários do site.')
 } finally {
 setBuscando(false)
 }
 }, 350)

 return () => window.clearTimeout(timer)
 }, [busca, canManageAdmins, membrosAtivosPorPerfilJogo])

 async function adicionarManager() {
 if (!canManageAdmins || !selecionado?.perfil_jogo_id) return

 try {
 setSalvando(true)
 setErro(null)
 setMsg(null)

 const vinculoAtual = membrosAtivosPorPerfilJogo.get(selecionado.perfil_jogo_id)

 if (vinculoAtual) {
 if (vinculoAtual.tipo === 'dono' || vinculoAtual.tipo === 'manager' || vinculoAtual.tipo === 'admin') {
 setMsg('Esse usuário já está no comando da equipe.')
 return
 }

 const { error } = await supabase
 .from('membros_equipe')
 .update({ tipo: 'manager', ativo: true, saiu_em: null })
 .eq('id', vinculoAtual.id)
 .eq('equipe_id', equipeId)
 .neq('tipo', 'dono')

 if (error) throw error
 } else {
 const { error } = await supabase.from('membros_equipe').insert({
 equipe_id: equipeId,
 perfil_jogo_id: selecionado.perfil_jogo_id,
 tipo: 'manager',
 ativo: true,
 entrou_em: new Date().toISOString(),
 saiu_em: null,
 })

 if (error) throw error
 }

 setBusca('')
 setSelecionado(null)
 setResultados([])
 setMsg('Manager adicionado à equipe.')
 await onAtualizado?.()
 } catch (e: any) {
 setErro(e?.message || 'Não foi possível adicionar o manager.')
 } finally {
 setSalvando(false)
 }
 }

 async function removerManager(membroId: string) {
 if (!canManageAdmins || !membroId) return

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
 .in('tipo', ['manager', 'admin'])

 if (error) throw error

 setMsg('Manager removido do comando.')
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
 <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.25em] text-[#8ea0be]">
 Adicionar manager
 </label>

 <div className="grid gap-3 lg:grid-cols-[1fr_220px]">
 <div className="relative">
 <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8ea0be]" />
 <input
 value={busca}
 onChange={(e) => setBusca(e.target.value)}
 placeholder="Digite nome, @usuário, nick ou UID"
 className="h-12 w-full border border-zinc-300 bg-white pl-9 pr-3 text-[12px] font-semibold uppercase tracking-[0.12em] text-[#142340] outline-none focus:border-[#2563eb]"
 />
 </div>

 <button
 type="button"
 disabled={!selecionado || salvando}
 onClick={adicionarManager}
 className="inline-flex h-12 items-center justify-center gap-2 border border-[#2563eb] bg-[#2563eb] px-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-white disabled:cursor-not-allowed disabled:border-zinc-300 disabled:bg-zinc-200 disabled:text-zinc-500"
 >
 {salvando ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
 Adicionar manager
 </button>
 </div>

 {buscando ? (
 <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-500">
 Pesquisando usuários...
 </p>
 ) : null}

 {resultados.length > 0 ? (
 <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
 {resultados.map((r) => {
 const ativo = selecionado?.perfil_jogo_id === r.perfil_jogo_id
 const bloqueado = r.jaEhManager
 const foto = r.foto_url || r.foto_capa || null

 return (
 <button
 key={r.perfil_jogo_id}
 type="button"
 disabled={bloqueado}
 onClick={() => setSelecionado(r)}
 className={`flex min-h-[68px] items-center gap-3 border px-3 py-2 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
 ativo ? 'border-[#2563eb] bg-blue-50' : 'border-zinc-200 bg-white hover:border-[#2563eb]'
 }`}
 >
 <div className="relative h-11 w-11 shrink-0 overflow-hidden border border-zinc-200 bg-zinc-100">
 {foto ? (
 <Image src={foto} alt={nomeBusca(r)} fill className="object-cover" />
 ) : (
 <div className="flex h-full items-center justify-center text-[13px] font-bold text-zinc-500">
 {nomeBusca(r).slice(0, 2).toUpperCase()}
 </div>
 )}
 </div>

 <div className="min-w-0 flex-1">
 <p className="truncate text-[12px] font-bold uppercase tracking-[0.08em] text-[#142340]">
 {nomeBusca(r)}
 </p>
 <p className="mt-1 truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8ea0be]">
 {r.username ? `@${r.username}` : 'sem usuário'} {r.nick ? `// gamer: ${r.nick}` : ''}
 </p>
 <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-500">
 {bloqueado ? 'Já está no comando' : r.jaEstaNaEquipe ? 'Membro da equipe' : 'Perfil do site'}
 </p>
 </div>
 </button>
 )
 })}
 </div>
 ) : busca.trim().length >= 2 && !buscando ? (
 <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-500">
 Nenhum perfil encontrado. Pesquise por nome, usuário, nick ou UID.
 </p>
 ) : (
 <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-500">
 Pesquise qualquer perfil de usuário do site para adicionar como manager.
 </p>
 )}

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
 {[...(dono ? [dono] : []), ...managers].map((m) => {
 const nome = nomeLider(m)
 const foto = m.perfilUsuario?.foto_url || m.perfilJogo?.foto_capa || null
 const isDono = m.tipo === 'dono'
 const gamer = m.perfilJogo?.nick || null

 return (
 <div key={m.id} className="border border-zinc-200 bg-white">
 <div className={`h-2 ${isDono ? 'bg-[#2563eb]' : 'bg-violet-600'}`} />

 <div className="flex gap-4 p-4">
 <div className="relative h-[82px] w-[82px] shrink-0 overflow-hidden border border-zinc-200 bg-zinc-100">
 {foto ? (
 <Image src={foto} alt={nome} fill className="object-cover" />
 ) : (
 <div className="flex h-full items-center justify-center text-xl font-semibold text-zinc-500">
 {nome.slice(0, 2).toUpperCase()}
 </div>
 )}
 </div>

 <div className="min-w-0 flex-1">
 <h3 className="truncate text-xl font-semibold uppercase tracking-tight text-[#142340]">
 {nome}
 </h3>

 <div className={`mt-2 inline-flex items-center gap-1 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${isDono ? 'bg-yellow-300 text-[#142340]' : 'bg-violet-100 text-violet-800'}`}>
 {isDono ? <Crown size={12} /> : <Shield size={12} />}
 {isDono ? 'Dono' : 'Manager'}
 </div>

 {m.perfilUsuario?.username ? (
 <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8ea0be]">
 Perfil: @{m.perfilUsuario.username}
 </p>
 ) : null}

 {gamer ? (
 <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
 Gamer: {gamer}
 </p>
 ) : null}

 <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
 Entrou em {dataBR(m.entrou_em)}
 </p>
 </div>
 </div>

 {canManageAdmins && !isDono ? (
 <div className="border-t border-zinc-200 p-3">
 <button
 type="button"
 disabled={salvando}
 onClick={() => removerManager(m.id)}
 className="inline-flex h-9 w-full items-center justify-center gap-2 border border-red-300 bg-red-50 px-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
 >
 {salvando ? <Loader2 size={13} className="animate-spin" /> : <UserMinus size={13} />}
 Remover manager
 </button>
 </div>
 ) : null}
 </div>
 )
 })}
 </div>

 {managers.length === 0 ? (
 <div className="border border-zinc-200 bg-white px-4 py-5 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
 Esta equipe ainda não possui managers cadastrados.
 </div>
 ) : null}
 </div>
 )
}
