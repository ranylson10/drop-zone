'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Check, Loader2, Trash2, UserPlus, X } from 'lucide-react'

export default function GestaoProdutoraPage() {
 const params = useParams<{ id: string }>()
 const produtoraId = params?.id

 const [membros, setMembros] = useState<any[]>([])
 const [loading, setLoading] = useState(true)

 const permissoesDisponiveis = [
 { key: 'criar_campeonato', label: 'Criar Torneios' },
 { key: 'editar_tabelas', label: 'Editar Chaves/Tabelas' },
 { key: 'postar_feed', label: 'Postar no Feed' },
 { key: 'gerenciar_mensagens', label: 'Chat/Suporte' },
 ]

 useEffect(() => {
 if (!produtoraId) return
 carregarEquipe()
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [produtoraId])

 async function carregarEquipe() {
 if (!produtoraId) return

 setLoading(true)

 const { data } = await supabase
 .from('membros_produtora')
 .select('*, perfis:usuario_id(nome_exibicao, avatar_url, email)')
 .eq('produtora_id', produtoraId)

 setMembros(data || [])
 setLoading(false)
 }

 async function alternarPermissao(
 membroId: string,
 permissaoKey: string,
 valorAtual: boolean
 ) {
 const membro = membros.find((m) => m.id === membroId)
 if (!membro) return

 const novasPermissoes = {
 ...(membro.permissoes || {}),
 [permissaoKey]: !valorAtual,
 }

 const { error } = await supabase
 .from('membros_produtora')
 .update({ permissoes: novasPermissoes })
 .eq('id', membroId)

 if (!error) carregarEquipe()
 }

 if (loading) {
 return (
 <div className="flex h-screen items-center justify-center bg-[#f7f7f7]">
 <Loader2 className="animate-spin text-[#2563eb]" size={40} />
 </div>
 )
 }

 return (
 <div className="mx-auto max-w-6xl space-y-6 p-6">
 <div className="flex items-center justify-between rounded-3xl border border-zinc-200 bg-white p-8 ">
 <div>
 <h1 className="text-2xl font-semibold uppercase text-[#2563eb]">
 Gestão de Ajudantes
 </h1>
 <p className="text-xs font-bold uppercase text-zinc-500">
 Controle quem ajuda na sua organização
 </p>
 </div>

 <button className="flex items-center gap-2 bg-[#2563eb] px-6 py-2 text-xs font-semibold uppercase text-[#142340] transition-all hover:bg-[#ff7a29]">
 <UserPlus size={16} />
 Convidar
 </button>
 </div>

 <div className="grid grid-cols-1 gap-4">
 {membros.map((membro) => (
 <div
 key={membro.id}
 className="flex flex-col items-center gap-6 border border-zinc-200 bg-white p-6 md:flex-row"
 >
 <div className="flex w-full items-center gap-4 md:w-64">
 <img
 src={
 membro.perfis?.avatar_url ||
 `https://api.dicebear.com/7.x/avataaars/svg?seed=${membro.id}`
 }
 className="h-12 w-12 rounded-full border-2 border-[#2563eb]"
 alt={membro.perfis?.nome_exibicao || 'Usuário'}
 />
 <div>
 <p className="text-sm font-semibold uppercase">
 {membro.perfis?.nome_exibicao || 'Usuário'}
 </p>
 <p className="text-[10px] font-bold text-zinc-500">
 {(membro.cargo || membro.tipo || 'membro').toUpperCase()}
 </p>
 </div>
 </div>

 <div className="grid w-full flex-1 grid-cols-2 gap-3 lg:grid-cols-4">
 {permissoesDisponiveis.map((p) => {
 const ativo = !!membro.permissoes?.[p.key]

 return (
 <button
 key={p.key}
 onClick={() =>
 alternarPermissao(membro.id, p.key, ativo)
 }
 className={`flex items-center justify-between border px-4 py-3 transition-all ${
 ativo
 ? 'border-[#2563eb]/30 bg-[#2563eb]/10 text-[#142340]'
 : 'border-zinc-200 bg-white/20 text-zinc-500'
 }`}
 >
 <span className="text-[10px] font-semibold uppercase tracking-tighter">
 {p.label}
 </span>
 {ativo ? (
 <Check size={14} className="text-[#2563eb]" />
 ) : (
 <X size={14} />
 )}
 </button>
 )
 })}
 </div>

 <button className="p-3 text-zinc-600 transition-colors hover:text-red-500">
 <Trash2 size={20} />
 </button>
 </div>
 ))}
 </div>
 </div>
 )
}