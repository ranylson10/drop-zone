'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import { Crown, Shield, UserPlus, UserMinus, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

type ProfileResumo = {
 id: string
 username: string | null
 nome_exibicao: string | null
 foto_url: string | null
}

type LiderComando = {
 id: string
 tipo: 'dono' | 'admin' | 'membro'
 entrou_em: string | null
 perfilUsuario: ProfileResumo | null
 perfilJogo: { id: string; nick: string | null; foto_capa: string | null; funcao: string | null } | null
}

type MembroEquipeNormalizado = {
 id: string
 equipe_id: string
 perfil_jogo_id: string
 tipo: 'dono' | 'admin' | 'membro'
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

function nomeMembro(m?: MembroEquipeNormalizado | null) {
 return m?.perfil?.profile?.nome_exibicao || m?.perfil?.profile?.username || m?.perfil?.nick || 'Usuário sem nome'
}

function nomeLider(m: LiderComando) {
 return m.perfilUsuario?.nome_exibicao || m.perfilUsuario?.username || m.perfilJogo?.nick || 'Usuário sem nome'
}

function dataBR(data?: string | null) {
 if (!data) return 'N/I'
 const d = new Date(data)
 return Number.isNaN(d.getTime()) ? 'N/I' : new Intl.DateTimeFormat('pt-BR').format(d)
}

export default function AbaLideres({ equipeId, membros, todosMembros, canManageAdmins, onAtualizado }: Props) {
 const [selecionado, setSelecionado] = useState('')
 const [salvando, setSalvando] = useState(false)
 const [msg, setMsg] = useState<string | null>(null)
 const [erro, setErro] = useState<string | null>(null)

 const disponiveis = useMemo(
 () =>
 todosMembros
 .filter((m) => m.ativo && m.tipo !== 'dono' && m.tipo !== 'admin')
 .sort((a, b) => nomeMembro(a).localeCompare(nomeMembro(b), 'pt-BR')),
 [todosMembros]
 )

 const admins = useMemo(() => membros.filter((m) => m.tipo === 'admin'), [membros])

 async function mudarTipo(membroId: string, tipo: 'admin' | 'membro') {
 if (!canManageAdmins || !membroId) return

 try {
 setSalvando(true)
 setErro(null)
 setMsg(null)

 const { error } = await supabase
 .from('membros_equipe')
 .update({ tipo })
 .eq('id', membroId)
 .eq('equipe_id', equipeId)
 .eq('ativo', true)
 .neq('tipo', 'dono')

 if (error) throw error

 setSelecionado('')
 setMsg(tipo === 'admin' ? 'Manager adicionado.' : 'Manager removido.')
 await onAtualizado?.()
 } catch (e: any) {
 setErro(e?.message || 'Não foi possível atualizar o comando.')
 } finally {
 setSalvando(false)
 }
 }

 return (
 <div className="space-y-8">
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
 <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
 <div className="flex-1">
 <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.25em] text-[#8ea0be]">
 Adicionar Manager
 </label>
 <select
 value={selecionado}
 onChange={(e) => setSelecionado(e.target.value)}
 className="h-12 w-full border border-zinc-300 bg-white px-3 text-[12px] font-semibold uppercase tracking-[0.14em] text-[#142340] outline-none"
 >
 <option value="">Pesquisar usuário do site</option>
 {disponiveis.map((m) => (
 <option key={m.id} value={m.id}>
 {nomeMembro(m)}{m.perfil?.nick ? ` — gamer: ${m.perfil.nick}` : ''}
 </option>
 ))}
 </select>
 </div>

 <button
 type="button"
 disabled={!selecionado || salvando}
 onClick={() => mudarTipo(selecionado, 'admin')}
 className="inline-flex h-12 items-center justify-center gap-2 border border-[#2563eb] bg-[#2563eb] px-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#142340] disabled:cursor-not-allowed disabled:border-zinc-300 disabled:bg-zinc-200 disabled:text-zinc-500"
 >
 {salvando ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
 Adicionar Manager
 </button>
 </div>

 {disponiveis.length === 0 ? (
 <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-500">
 Nenhum membro comum disponível para virar manager.
 </p>
 ) : null}

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
 {membros.map((m) => {
 const nome = nomeLider(m)
 const foto = m.perfilUsuario?.foto_url || null
 const dono = m.tipo === 'dono'
 const gamer = m.perfilJogo?.nick || null

 return (
 <div key={m.id} className="border border-zinc-200 bg-white">
 <div className={`h-2 ${dono ? 'bg-[#2563eb]' : 'bg-white'}`} />

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

 <div className="mt-2 inline-flex items-center gap-1 bg-yellow-300 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#142340]">
 {dono ? <Crown size={12} /> : <Shield size={12} />}
 {dono ? 'Dono' : 'Manager'}
 </div>

 {m.perfilUsuario?.username ? (
 <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8ea0be]">
 Perfil de usuário: @{m.perfilUsuario.username}
 </p>
 ) : null}

 {gamer ? (
 <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
 Perfil gamer vinculado: {gamer}
 </p>
 ) : null}

 <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
 Entrou em {dataBR(m.entrou_em)}
 </p>
 </div>
 </div>

 {canManageAdmins && !dono ? (
 <div className="border-t border-zinc-200 p-4">
 <button
 type="button"
 disabled={salvando}
 onClick={() => mudarTipo(m.id, 'membro')}
 className="inline-flex h-10 w-full items-center justify-center gap-2 border border-red-300 bg-red-50 px-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
 >
 {salvando ? <Loader2 size={13} className="animate-spin" /> : <UserMinus size={13} />}
 Remover ADM
 </button>
 </div>
 ) : null}
 </div>
 )
 })}
 </div>

 {membros.length === 0 ? (
 <div className="border border-dashed border-zinc-300 bg-zinc-50 p-8 text-center">
 <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
 Nenhum comando cadastrado para esta equipe.
 </p>
 </div>
 ) : null}

 {canManageAdmins && admins.length === 0 ? (
 <div className="border border-zinc-200 bg-[#f8f8f8] p-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
 Esta equipe ainda não possui managers além do dono.
 </div>
 ) : null}
 </div>
 )
}
