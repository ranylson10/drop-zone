'use client'

import { useState } from 'react'
import { Image as ImageIcon, Loader2, Repeat2, User, X } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { usePerfil } from '../../contexts/PerfilContext'

type Autor = {
 nome: string
 foto: string | null
 tag: string
 cor: string
}

type PostOriginal = {
 id: string
 conteudo: string | null
 imagem_url: string | null
 created_at: string
 autor: Autor
}

interface RepostModalProps {
 postOriginal: PostOriginal
 postOriginalId: string
 perfilAtivo: any
 tipoPerfil: 'usuario' | 'jogo' | 'equipe' | 'produtora'
 onClose: () => void
 onSuccess: () => Promise<void> | void
}

function montarPayloadAutor(userId: string, tipoPerfil: string, perfilAtivo: any) {
 return {
 autor_user_id: userId,
 autor_tipo:
 tipoPerfil === 'jogo'
 ? 'perfil_jogo'
 : tipoPerfil === 'equipe'
 ? 'equipe'
 : tipoPerfil === 'produtora'
 ? 'produtora'
 : 'usuario',
 autor_perfil_jogo_id: tipoPerfil === 'jogo' ? (perfilAtivo?.id ?? null) : null,
 autor_equipe_id: tipoPerfil === 'equipe' ? (perfilAtivo?.id ?? null) : null,
 autor_produtora_id: tipoPerfil === 'produtora' ? (perfilAtivo?.id ?? null) : null,
 }
}

function PreviewPostOriginal({ postOriginal }: { postOriginal: PostOriginal }) {
 return (
 <div className="mt-4 border border-zinc-200 overflow-hidden bg-white/40 rounded-sm ">
 {postOriginal.imagem_url ? (
 <img src={postOriginal.imagem_url} alt="Post original" className="w-full h-auto block" />
 ) : (
 <div className="p-4 border-b border-zinc-200">
 <div className="flex items-center gap-2 mb-2">
 <div className="w-9 h-9 border border-zinc-200 overflow-hidden rounded-sm shrink-0">
 {postOriginal.autor.foto ? (
 <img src={postOriginal.autor.foto} alt={postOriginal.autor.nome} className="w-full h-full object-cover" />
 ) : (
 <div className="w-full h-full bg-slate-800 flex items-center justify-center">
 <User size={16} className="text-zinc-500" />
 </div>
 )}
 </div>

 <div className="min-w-0">
 <p className="text-sm font-semibold uppercase text-[#142340] truncate">{postOriginal.autor.nome}</p>
 <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-500">
 {postOriginal.autor.tag}
 </p>
 </div>
 </div>

 {postOriginal.conteudo ? (
 <p className="text-[#142340] whitespace-pre-wrap leading-relaxed">{postOriginal.conteudo}</p>
 ) : null}
 </div>
 )}

 {postOriginal.imagem_url && postOriginal.conteudo ? (
 <div className="p-4 border-t border-zinc-200">
 <div className="flex items-center gap-2 mb-2">
 <div className="w-9 h-9 border border-zinc-200 overflow-hidden rounded-sm shrink-0">
 {postOriginal.autor.foto ? (
 <img src={postOriginal.autor.foto} alt={postOriginal.autor.nome} className="w-full h-full object-cover" />
 ) : (
 <div className="w-full h-full bg-slate-800 flex items-center justify-center">
 <User size={16} className="text-zinc-500" />
 </div>
 )}
 </div>

 <div className="min-w-0">
 <p className="text-sm font-semibold uppercase text-[#142340] truncate">{postOriginal.autor.nome}</p>
 <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-500">
 {postOriginal.autor.tag}
 </p>
 </div>
 </div>

 <p className="text-[#142340] whitespace-pre-wrap leading-relaxed">{postOriginal.conteudo}</p>
 </div>
 ) : null}
 </div>
 )
}

export default function RepostModal({
 postOriginal,
 postOriginalId,
 perfilAtivo,
 tipoPerfil,
 onClose,
 onSuccess,
}: RepostModalProps) {
 const { user } = usePerfil()
 const [legenda, setLegenda] = useState('')
 const [loading, setLoading] = useState(false)

 async function handleRepostar() {
 if (!user || !perfilAtivo || loading) return
 setLoading(true)

 try {
 const payloadAutor = montarPayloadAutor(user.id, tipoPerfil, perfilAtivo)

 const { error: repostError } = await supabase.from('reposts').insert([
 {
 post_id: postOriginalId,
 user_id: user.id,
 comentario: legenda.trim() || null,
 },
 ])

 if (repostError) throw repostError

 const { error: postError } = await supabase.from('posts').insert([
 {
 conteudo: legenda.trim() || '',
 imagem_url: null,
 ativo: true,
 post_compartilhado_id: postOriginalId,
 ...payloadAutor,
 },
 ])

 if (postError) throw postError

 await onSuccess()
 } catch (err: any) {
 console.error('Erro ao repostar com legenda:', err, JSON.stringify(err))
 alert(err?.message || 'Não foi possível repostar esse conteúdo.')
 } finally {
 setLoading(false)
 }
 }

 return (
 <div className="fixed inset-0 z-[100] bg-white/70 flex items-start justify-center overflow-y-auto">
 <div className="w-full max-w-[600px] min-h-screen bg-white border-x border-zinc-200/60">
 <div className="sticky top-0 z-10 bg-white/95 -md border-b border-zinc-200/60 px-4 py-3 flex items-center justify-between">
 <button
 onClick={onClose}
 className="p-2 rounded-md text-zinc-500 hover:text-[#142340] hover:bg-slate-800 transition-colors"
 >
 <X size={18} />
 </button>

 <button
 onClick={handleRepostar}
 disabled={loading}
 className="px-6 py-1.5 font-semibold text-xs uppercase tracking-tighter transition-all hover:brightness-110 disabled:opacity-30 bg-emerald-500 text-[#142340] flex items-center gap-2"
 >
 {loading ? <Loader2 size={16} className="animate-spin" /> : <Repeat2 size={16} />}
 Repostar
 </button>
 </div>

 <div className="p-4 border-b border-zinc-200/50">
 <div className="flex gap-4">
 <div className="relative w-12 h-12 shrink-0 border border-zinc-200 overflow-hidden">
 {perfilAtivo?.avatar_url || perfilAtivo?.foto_url || perfilAtivo?.logo_url || perfilAtivo?.foto_capa ? (
 <img
 src={
 perfilAtivo?.avatar_url ||
 perfilAtivo?.foto_url ||
 perfilAtivo?.logo_url ||
 perfilAtivo?.foto_capa
 }
 alt=""
 className="w-full h-full object-cover"
 />
 ) : (
 <div className="w-full h-full bg-slate-700 flex items-center justify-center">
 <User size={20} className="text-zinc-500" />
 </div>
 )}
 </div>

 <div className="flex-1">
 <textarea
 value={legenda}
 onChange={(e) => setLegenda(e.target.value)}
 placeholder="O QUE ESTÁ ROLANDO NA ARENA?"
 className="w-full bg-transparent border-none focus:ring-0 text-xl resize-none placeholder:text-slate-600 font-medium uppercase tracking-tighter min-h-[90px] text-[#142340] outline-none"
 maxLength={280}
 />

 <div className="flex items-center justify-between pt-3 border-t border-zinc-200/30">
 <div className="p-2 text-zinc-500">
 <ImageIcon size={20} />
 </div>

 <div className="text-[12px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
 {legenda.length}/280
 </div>
 </div>

 <PreviewPostOriginal postOriginal={postOriginal} />
 </div>
 </div>
 </div>
 </div>
 </div>
 )
}
