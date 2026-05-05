'use client'

import { useEffect, useMemo, useState } from 'react'
import { User, MessageSquare, Zap, Repeat2, Loader2 } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { usePerfil } from '../../contexts/PerfilContext'
import ComentariosModal from './ComentariosModal'
import RepostModal from './RepostModal'

type Autor = {
 nome: string
 foto: string | null
 tag: string
 cor: string
}

type PostCompartilhado = {
 id: string
 conteudo: string | null
 imagem_url: string | null
 created_at: string
 autor: Autor
}

type Post = {
 id: string
 conteudo: string | null
 imagem_url: string | null
 created_at: string
 autor: Autor
 contagem_curtidas: number
 contagem_comentarios: number
 contagem_reposts: number
 compartilhado?: PostCompartilhado | null
}

interface PostCardProps {
 post: Post
 perfilAtivo: any
 tipoPerfil: 'usuario' | 'jogo' | 'equipe' | 'produtora'
 onAtualizar: () => Promise<void>
}

function formatarTempo(dataIso: string) {
 const data = new Date(dataIso)
 const agora = new Date()
 const diffMs = agora.getTime() - data.getTime()
 const diffMin = Math.max(Math.floor(diffMs / 60000), 0)

 if (diffMin < 1) return 'AGORA'
 if (diffMin < 60) return `${diffMin}M`

 const diffHoras = Math.floor(diffMin / 60)
 if (diffHoras < 24) return `${diffHoras}H`

 const diffDias = Math.floor(diffHoras / 24)
 return `${diffDias}D`
}

function extrairCaminhoDoBucket(valor: string | null | undefined, bucket = 'post-images') {
 if (!valor) return null

 const normalizado = valor.trim()
 const marcadorCompleto = `/storage/v1/object/public/${bucket}/`
 const marcadorRelativo = `/object/public/${bucket}/`

 if (normalizado.includes(marcadorCompleto)) {
 const caminho = normalizado.split(marcadorCompleto)[1]
 return caminho ? decodeURIComponent(caminho) : null
 }

 if (normalizado.includes(marcadorRelativo)) {
 const caminho = normalizado.split(marcadorRelativo)[1]
 return caminho ? decodeURIComponent(caminho) : null
 }

 if (normalizado.startsWith(`${bucket}/`)) {
 return normalizado.slice(bucket.length + 1)
 }

 if (!normalizado.startsWith('http://') && !normalizado.startsWith('https://') && !normalizado.startsWith('/')) {
 return normalizado
 }

 return null
}

function resolverUrlImagem(valor: string | null | undefined, bucket = 'post-images') {
 if (!valor) return null

 const original = valor.trim()
 const baseSupabase = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '') || ''

 if (original.startsWith('http://') || original.startsWith('https://')) {
 return original
 }

 if (original.startsWith('/storage/')) {
 return `${baseSupabase}${original}`
 }

 const caminho = extrairCaminhoDoBucket(original, bucket)
 if (!caminho) return original

 const { data } = supabase.storage.from(bucket).getPublicUrl(caminho)
 return data.publicUrl
}

function ImagemComFallback({
 src,
 alt,
 className,
 bucket = 'post-images',
}: {
 src: string | null | undefined
 alt: string
 className?: string
 bucket?: string
}) {
 const [urlAtual, setUrlAtual] = useState<string | null>(resolverUrlImagem(src, bucket))
 const [tentouFallback, setTentouFallback] = useState(false)

 useEffect(() => {
 setUrlAtual(resolverUrlImagem(src, bucket))
 setTentouFallback(false)
 }, [src, bucket])

 if (!urlAtual) return null

 return (
 <img
 src={urlAtual}
 alt={alt}
 className={className}
 onError={() => {
 if (tentouFallback) return
 setTentouFallback(true)

 const caminho = extrairCaminhoDoBucket(src, bucket)
 if (!caminho) {
 setUrlAtual(null)
 return
 }

 const { data } = supabase.storage.from(bucket).getPublicUrl(caminho)
 setUrlAtual(`${data.publicUrl}?t=${Date.now()}`)
 }}
 />
 )
}

export default function PostCard({
 post,
 perfilAtivo,
 tipoPerfil,
 onAtualizar,
}: PostCardProps) {
 const { autor, compartilhado } = post
 const { user } = usePerfil()

 const [curtido, setCurtido] = useState(false)
 const [repostado, setRepostado] = useState(false)
 const [modalComentariosAberto, setModalComentariosAberto] = useState(false)
 const [modalRepostAberto, setModalRepostAberto] = useState(false)

 const [totalCurtidas, setTotalCurtidas] = useState(post.contagem_curtidas || 0)
 const [totalComentarios, setTotalComentarios] = useState(post.contagem_comentarios || 0)
 const [totalReposts, setTotalReposts] = useState(post.contagem_reposts || 0)

 const [loadingCurtida, setLoadingCurtida] = useState(false)
 const [loadingRepost, setLoadingRepost] = useState(false)

 const postBase = useMemo(() => compartilhado || post, [compartilhado, post])
 const postAlvoInteracaoId = compartilhado?.id || post.id

 useEffect(() => {
 async function verificarInteracoes() {
 if (!user) return

 const [curtidaRes, repostRes] = await Promise.all([
 supabase
 .from('curtidas_post')
 .select('id')
 .eq('post_id', postAlvoInteracaoId)
 .eq('user_id', user.id)
 .maybeSingle(),
 supabase
 .from('reposts')
 .select('id')
 .eq('post_id', postAlvoInteracaoId)
 .eq('user_id', user.id)
 .maybeSingle(),
 ])

 setCurtido(!!curtidaRes.data)
 setRepostado(!!repostRes.data)
 }

 verificarInteracoes()
 }, [postAlvoInteracaoId, user])

 useEffect(() => {
 setTotalCurtidas(post.contagem_curtidas || 0)
 setTotalComentarios(post.contagem_comentarios || 0)
 setTotalReposts(post.contagem_reposts || 0)
 }, [post.contagem_curtidas, post.contagem_comentarios, post.contagem_reposts])

 async function handleCurtida() {
 if (!user || loadingCurtida) return
 setLoadingCurtida(true)

 try {
 if (curtido) {
 const { error } = await supabase
 .from('curtidas_post')
 .delete()
 .eq('post_id', postAlvoInteracaoId)
 .eq('user_id', user.id)

 if (error) throw error

 setTotalCurtidas((prev) => Math.max(prev - 1, 0))
 setCurtido(false)
 } else {
 const { error } = await supabase
 .from('curtidas_post')
 .insert([{ post_id: postAlvoInteracaoId, user_id: user.id }])

 if (error) throw error

 setTotalCurtidas((prev) => prev + 1)
 setCurtido(true)
 }
 } catch (err: any) {
 console.error('Erro ao curtir:', err, JSON.stringify(err))
 alert(err?.message || 'Não foi possível atualizar a curtida.')
 } finally {
 setLoadingCurtida(false)
 }
 }

 async function handleRemoverRepost() {
 if (!user || loadingRepost) return
 setLoadingRepost(true)

 try {
 const [repostDeleteRes, postDeleteRes] = await Promise.all([
 supabase
 .from('reposts')
 .delete()
 .eq('post_id', postAlvoInteracaoId)
 .eq('user_id', user.id),
 supabase
 .from('posts')
 .delete()
 .eq('post_compartilhado_id', postAlvoInteracaoId)
 .eq('autor_user_id', user.id),
 ])

 if (repostDeleteRes.error) throw repostDeleteRes.error
 if (postDeleteRes.error) throw postDeleteRes.error

 setTotalReposts((prev) => Math.max(prev - 1, 0))
 setRepostado(false)
 await onAtualizar()
 } catch (err: any) {
 console.error('Erro ao remover repost:', err, JSON.stringify(err))
 alert(err?.message || 'Não foi possível remover o repost.')
 } finally {
 setLoadingRepost(false)
 }
 }

 async function handleRepostCriado() {
 setTotalReposts((prev) => prev + 1)
 setRepostado(true)
 await onAtualizar()
 }

 return (
 <>
 <article className="bg-white p-3 transition hover:bg-slate-50/70">
 <div className="flex gap-3">
 <div
 className="relative h-10 w-10 shrink-0 overflow-hidden border bg-slate-50 p-0.5"
 style={{ borderColor: autor.cor || '#E2E8F0' }}
 >
 {autor.foto ? (
 <img src={autor.foto} alt={autor.nome} className="h-full w-full object-cover" />
 ) : (
 <div className="flex h-full w-full items-center justify-center bg-slate-100 text-zinc-500">
 <User size={18} />
 </div>
 )}
 </div>

 <div className="min-w-0 flex-1">
 <div className="flex items-center gap-2">
 <span className="truncate text-[13px] font-semibold uppercase tracking-[-0.02em] text-slate-950">
 {autor.nome}
 </span>

 <span
 className="shrink-0 border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.12em]"
 style={{ color: autor.cor || '#64748b' }}
 >
 {autor.tag}
 </span>

 <span className="ml-auto shrink-0 text-[10px] font-semibold uppercase text-zinc-500">
 {formatarTempo(post.created_at)}
 </span>
 </div>

 {post.conteudo ? (
 <p className="mt-2 whitespace-pre-wrap text-[13px] font-medium leading-5 text-slate-700">
 {post.conteudo}
 </p>
 ) : null}

 {post.imagem_url && !compartilhado ? (
 <div className="mt-3 overflow-hidden border border-slate-200 bg-slate-50">
 <ImagemComFallback src={post.imagem_url} alt="Post" className="block h-auto w-full" />
 </div>
 ) : null}

 {compartilhado ? (
 <div className="mt-3 overflow-hidden border border-slate-200 bg-slate-50">
 <div className="flex items-center gap-2 border-b border-slate-200 bg-white px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
 <Repeat2 size={13} />
 Repost
 </div>

 <div className="p-3">
 <div className="mb-2 flex items-center gap-2">
 <div className="relative h-8 w-8 shrink-0 overflow-hidden border border-slate-200 bg-white">
 {postBase.autor.foto ? (
 <img src={postBase.autor.foto} alt={postBase.autor.nome} className="h-full w-full object-cover" />
 ) : (
 <div className="flex h-full w-full items-center justify-center text-zinc-500">
 <User size={15} />
 </div>
 )}
 </div>

 <div className="min-w-0">
 <p className="truncate text-[12px] font-semibold uppercase text-slate-950">{postBase.autor.nome}</p>
 <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-zinc-500">{postBase.autor.tag}</p>
 </div>
 </div>

 {postBase.conteudo ? (
 <p className="whitespace-pre-wrap text-[12px] font-medium leading-5 text-slate-600">{postBase.conteudo}</p>
 ) : null}

 {postBase.imagem_url ? (
 <div className="mt-3 overflow-hidden border border-slate-200 bg-white">
 <ImagemComFallback src={postBase.imagem_url} alt="Post compartilhado" className="block h-auto w-full" />
 </div>
 ) : null}
 </div>
 </div>
 ) : null}

 <div className="mt-3 flex items-center gap-2 text-zinc-500">
 <button
 onClick={() => setModalComentariosAberto(true)}
 className="inline-flex h-8 items-center gap-1.5 border border-slate-200 bg-white px-2.5 text-[10px] font-semibold uppercase transition hover:border-[#00E0FF] hover:text-[#0284C7]"
 title="Comentários"
 >
 <MessageSquare size={15} />
 <span>{totalComentarios > 0 ? totalComentarios : 'Comentar'}</span>
 </button>

 <button
 onClick={handleCurtida}
 disabled={loadingCurtida}
 className={`inline-flex h-8 items-center gap-1.5 border px-2.5 text-[10px] font-semibold uppercase transition ${
 curtido
 ? 'border-[#FDE68A] bg-[#FEF3C7] text-[#B45309]'
 : 'border-slate-200 bg-white hover:border-[#F59E0B] hover:text-[#B45309]'
 }`}
 title="Impulsionar"
 >
 {loadingCurtida ? <Loader2 size={15} className="animate-spin" /> : <Zap size={15} className={curtido ? 'fill-[#F59E0B]' : ''} />}
 <span>{totalCurtidas > 0 ? totalCurtidas : 'Impulso'}</span>
 </button>

 <button
 onClick={() => {
 if (repostado) {
 handleRemoverRepost()
 } else {
 setModalRepostAberto(true)
 }
 }}
 disabled={loadingRepost}
 className={`inline-flex h-8 items-center gap-1.5 border px-2.5 text-[10px] font-semibold uppercase transition ${
 repostado
 ? 'border-[#BBF7D0] bg-[#DCFCE7] text-[#166534]'
 : 'border-slate-200 bg-white hover:border-[#22C55E] hover:text-[#166534]'
 }`}
 title="Repostar"
 >
 {loadingRepost ? <Loader2 size={15} className="animate-spin" /> : <Repeat2 size={15} />}
 <span>{totalReposts > 0 ? totalReposts : 'Repost'}</span>
 </button>
 </div>
 </div>
 </div>
 </article>

 {modalComentariosAberto && (
 <ComentariosModal
 postId={post.id}
 onClose={() => setModalComentariosAberto(false)}
 onComentarioCriado={async () => {
 setTotalComentarios((prev) => prev + 1)
 await onAtualizar()
 }}
 />
 )}

 {modalRepostAberto && (
 <RepostModal
 postOriginal={postBase}
 postOriginalId={postAlvoInteracaoId}
 perfilAtivo={perfilAtivo}
 tipoPerfil={tipoPerfil}
 onClose={() => setModalRepostAberto(false)}
 onSuccess={async () => {
 setModalRepostAberto(false)
 await handleRepostCriado()
 }}
 />
 )}
 </>
 )
}
