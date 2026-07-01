'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { Loader2, Send, User, X, CornerDownRight } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { usePerfil } from '../../contexts/PerfilContext'

type ComentarioRow = {
 id: string
 post_id: string
 autor_user_id: string
 conteudo: string
 comentario_pai_id: string | null
 ativo: boolean
 created_at: string
}

type AutorComentario = {
 nome: string
 foto: string | null
}

type ComentarioFormatado = ComentarioRow & {
 autor: AutorComentario
 respostas: ComentarioFormatado[]
}

function formatarDataCurta(dataIso: string) {
 const data = new Date(dataIso)
 const agora = new Date()
 const diffMs = agora.getTime() - data.getTime()
 const diffMin = Math.max(Math.floor(diffMs / 60000), 0)

 if (diffMin < 1) return 'agora'
 if (diffMin < 60) return `${diffMin} min`

 const diffHoras = Math.floor(diffMin / 60)
 if (diffHoras < 24) return `${diffHoras} h`

 const diffDias = Math.floor(diffHoras / 24)
 return `${diffDias} d`
}

function montarArvoreComentarios(comentarios: ComentarioFormatado[]) {
 const mapa = new Map<string, ComentarioFormatado>()
 const raizes: ComentarioFormatado[] = []

 comentarios.forEach((comentario) => {
 mapa.set(comentario.id, { ...comentario, respostas: [] })
 })

 comentarios.forEach((comentario) => {
 const item = mapa.get(comentario.id)
 if (!item) return

 if (comentario.comentario_pai_id) {
 const pai = mapa.get(comentario.comentario_pai_id)
 if (pai) {
 pai.respostas.push(item)
 return
 }
 }

 raizes.push(item)
 })

 return raizes
}

export default function ComentariosModal({
 postId,
 onClose,
 onComentarioCriado,
}: {
 postId: string
 onClose: () => void
 onComentarioCriado?: () => Promise<void> | void
}) {
 const { user } = usePerfil()
 const [comentarios, setComentarios] = useState<ComentarioFormatado[]>([])
 const [novoComentario, setNovoComentario] = useState('')
 const [respostaPaiId, setRespostaPaiId] = useState<string | null>(null)
 const [loading, setLoading] = useState(true)
 const [salvando, setSalvando] = useState(false)

 const carregarComentarios = useCallback(async () => {
 try {
 setLoading(true)

 const { data, error } = await supabase
 .from('comentarios')
 .select('id, post_id, autor_user_id, conteudo, comentario_pai_id, ativo, created_at')
 .eq('post_id', postId)
 .eq('ativo', true)
 .order('created_at', { ascending: true })

 if (error) throw error

 const listaBase = (data || []) as ComentarioRow[]
 const userIds = [...new Set(listaBase.map((item) => item.autor_user_id).filter(Boolean))]

 const profilesRes = userIds.length
 ? await supabase.from('profiles').select('id, nome_exibicao, username, foto_url').in('id', userIds)
 : { data: [], error: null }

 if (profilesRes.error) throw profilesRes.error

 const profilesMap = new Map((profilesRes.data || []).map((item) => [item.id, item]))

 const formatados = listaBase.map((comentario) => {
 const perfil = profilesMap.get(comentario.autor_user_id)

 return {
 ...comentario,
 autor: {
 nome: perfil?.nome_exibicao || perfil?.username || 'USUÁRIO',
 foto: perfil?.foto_url || null,
 },
 respostas: [],
 }
 })

 setComentarios(formatados)
 } catch (err) {
 console.error('Erro ao carregar comentários:', err)
 setComentarios([])
 } finally {
 setLoading(false)
 }
 }, [postId])

 useEffect(() => {
 carregarComentarios()
 }, [carregarComentarios])

 const comentariosEmArvore = useMemo(() => montarArvoreComentarios(comentarios), [comentarios])

 async function handleEnviarComentario() {
 if (!user || !novoComentario.trim() || salvando) return

 setSalvando(true)

 try {
 const { error } = await supabase.from('comentarios').insert([
 {
 post_id: postId,
 autor_user_id: user.id,
 conteudo: novoComentario.trim(),
 comentario_pai_id: respostaPaiId,
 ativo: true,
 },
 ])

 if (error) throw error

 setNovoComentario('')
 setRespostaPaiId(null)
 await carregarComentarios()
 await onComentarioCriado?.()
 } catch (err) {
 console.error('Erro ao comentar:', err)
 alert('Não foi possível enviar o comentário.')
 } finally {
 setSalvando(false)
 }
 }

 return (
 <div className="fixed inset-0 z-[100] bg-white/70 flex items-center justify-center p-4">
 <div className="w-full max-w-2xl max-h-[90vh] bg-white border border-zinc-200 overflow-hidden ">
 <div className="px-4 py-3 border-b border-zinc-200 flex items-center justify-between">
 <div>
 <h3 className="text-[#142340] font-semibold uppercase tracking-tight">Comentários</h3>
 <p className="text-xs text-zinc-500 uppercase tracking-[0.18em] mt-1">Post #{postId.slice(0, 8)}</p>
 </div>
 <button onClick={onClose} className="p-2 rounded-md hover:bg-slate-800 text-zinc-500 hover:text-[#142340]">
 <X size={18} />
 </button>
 </div>

 <div className="p-4 border-b border-zinc-200 bg-white/40">
 {respostaPaiId ? (
 <div className="mb-3 flex items-center justify-between rounded-md border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-xs text-blue-300">
 <span>Respondendo um comentário</span>
 <button onClick={() => setRespostaPaiId(null)} className="font-bold uppercase tracking-[0.12em]">
 cancelar
 </button>
 </div>
 ) : null}

 <div className="flex gap-3">
 <textarea
 value={novoComentario}
 onChange={(e) => setNovoComentario(e.target.value)}
 placeholder="Escreva seu comentário"
 className="w-full min-h-[92px] resize-none border border-zinc-200 bg-white px-3 py-3 text-sm text-[#142340] outline-none focus:border-cyan-400"
 />
 <button
 onClick={handleEnviarComentario}
 disabled={salvando || !novoComentario.trim()}
 className="self-end inline-flex items-center justify-center bg-cyan-400 px-4 py-3 text-[#142340] disabled:opacity-40"
 >
 {salvando ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
 </button>
 </div>
 </div>

 <div className="max-h-[55vh] overflow-y-auto p-4 space-y-4">
 {loading ? (
 <div className="flex justify-center py-10">
 <Loader2 className="animate-spin text-zinc-500" size={32} />
 </div>
 ) : comentariosEmArvore.length > 0 ? (
 comentariosEmArvore.map((comentario) => (
 <ComentarioItem key={comentario.id} comentario={comentario} onResponder={setRespostaPaiId} nivel={0} />
 ))
 ) : (
 <div className="py-10 text-center text-zinc-500 font-bold uppercase tracking-[0.18em]">
 Nenhum comentário ainda
 </div>
 )}
 </div>
 </div>
 </div>
 )
}

function ComentarioItem({
 comentario,
 onResponder,
 nivel,
}: {
 comentario: ComentarioFormatado
 onResponder: (id: string) => void
 nivel: number
}) {
 return (
 <div className={nivel > 0 ? 'ml-8 border-l border-zinc-200 pl-4' : ''}>
 <div className="flex gap-3">
 <div className="relative w-10 h-10 shrink-0 rounded-full overflow-hidden border border-zinc-200">
 {comentario.autor.foto ? (
 <Image src={comentario.autor.foto} alt={comentario.autor.nome} fill className="object-cover" />
 ) : (
 <div className="w-full h-full bg-slate-800 flex items-center justify-center">
 <User size={18} className="text-zinc-500" />
 </div>
 )}
 </div>

 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-2 flex-wrap">
 <p className="text-sm font-semibold uppercase text-[#142340] truncate">{comentario.autor.nome}</p>
 <span className="text-[10px] uppercase tracking-[0.16em] text-zinc-500 font-bold">
 {formatarDataCurta(comentario.created_at)}
 </span>
 </div>

 <p className="mt-1 text-sm text-[#142340] whitespace-pre-wrap leading-relaxed">{comentario.conteudo}</p>

 <button
 onClick={() => onResponder(comentario.id)}
 className="mt-2 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-zinc-500 hover:text-cyan-300"
 >
 <CornerDownRight size={14} />
 responder
 </button>
 </div>
 </div>

 {comentario.respostas.length > 0 ? (
 <div className="mt-3 space-y-3">
 {comentario.respostas.map((resposta) => (
 <ComentarioItem key={resposta.id} comentario={resposta} onResponder={onResponder} nivel={nivel + 1} />
 ))}
 </div>
 ) : null}
 </div>
 )
}
