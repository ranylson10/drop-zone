'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'

type ChatMensagem = {
 id: string
 lobby_id: string
 user_id: string
 mensagem: string
 created_at: string
 username: string | null
 avatar_url: string | null
}

export default function LobbyChat({ lobbyId }: { lobbyId: string }) {
 const [mensagens, setMensagens] = useState<ChatMensagem[]>([])
 const [texto, setTexto] = useState('')
 const [enviando, setEnviando] = useState(false)
 const [meuUserId, setMeuUserId] = useState<string | null>(null)

 const bottomRef = useRef<HTMLDivElement | null>(null)

 useEffect(() => {
 carregar()
 carregarUsuario()

 const channel = supabase
 .channel(`chat-lobby-${lobbyId}`)
 .on(
 'postgres_changes',
 {
 event: '*',
 schema: 'public',
 table: 'lobby_chat_mensagens',
 filter: `lobby_id=eq.${lobbyId}`,
 },
 () => {
 carregar()
 }
 )
 .subscribe()

 return () => {
 supabase.removeChannel(channel)
 }
 }, [lobbyId])

 useEffect(() => {
 bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
 }, [mensagens])

 async function carregarUsuario() {
 const {
 data: { user },
 } = await supabase.auth.getUser()

 setMeuUserId(user?.id || null)
 }

 async function carregar() {
 const { data, error } = await supabase
 .from('lobby_chat_mensagens')
 .select('*')
 .eq('lobby_id', lobbyId)
 .order('created_at', { ascending: true })

 if (error) {
 console.error('Erro ao carregar chat do lobby:', error)
 return
 }

 const base = (data || []) as any[]
 const userIds = Array.from(new Set(base.map((item) => item.user_id).filter(Boolean)))

 if (userIds.length === 0) {
 setMensagens([])
 return
 }

 const { data: perfis } = await supabase
 .from('profiles')
 .select('id, nome_exibicao, avatar_url')
 .in('id', userIds)

 const profileMap = new Map<string, { nome_exibicao: string | null; avatar_url: string | null }>()
 ;(perfis || []).forEach((item: any) => {
 profileMap.set(item.id, {
 nome_exibicao: item.nome_exibicao || null,
 avatar_url: item.avatar_url || null,
 })
 })

 const listaFinal = base.map((item) => ({
 ...item,
 username: profileMap.get(item.user_id)?.nome_exibicao || 'Usuário',
 avatar_url: profileMap.get(item.user_id)?.avatar_url || null,
 }))

 setMensagens(listaFinal)
 }

 async function enviar() {
 const mensagem = texto.trim()
 if (!mensagem) return

 const {
 data: { user },
 } = await supabase.auth.getUser()

 if (!user) {
 alert('Você precisa estar logado para enviar mensagens.')
 return
 }

 try {
 setEnviando(true)

 const { error } = await supabase.from('lobby_chat_mensagens').insert({
 lobby_id: lobbyId,
 user_id: user.id,
 mensagem,
 })

 if (error) {
 alert(error.message)
 return
 }

 setTexto('')
 } finally {
 setEnviando(false)
 }
 }

 const mensagensOrdenadas = useMemo(() => mensagens, [mensagens])

 return (
 <div className="flex min-h-[540px] flex-col">
 <div className="border-b border-zinc-200 px-6 py-4">
 <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-zinc-500">
 Chat do lobby
 </p>
 <h3 className="mt-2 text-lg font-semibold uppercase text-[#142340]">
 Conversa ao vivo
 </h3>
 </div>

 <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
 {mensagensOrdenadas.length === 0 ? (
 <div className="flex h-full min-h-[260px] items-center justify-center text-sm text-zinc-500">
 Nenhuma mensagem ainda. Seja o primeiro a falar.
 </div>
 ) : (
 mensagensOrdenadas.map((msg) => {
 const minha = meuUserId === msg.user_id

 return (
 <div
 key={msg.id}
 className={[
 'flex gap-3',
 minha ? 'justify-end' : 'justify-start',
 ].join(' ')}
 >
 {!minha ? (
 <div className="h-10 w-10 overflow-hidden rounded-full bg-zinc-800">
 {msg.avatar_url ? (
 <img
 src={msg.avatar_url}
 alt={msg.username || 'Usuário'}
 className="h-full w-full object-cover"
 />
 ) : null}
 </div>
 ) : null}

 <div
 className={[
 'max-w-[75%] border px-4 py-3',
 minha
 ? 'border-[#2563eb]/30 bg-[#2563eb]/10'
 : 'border-zinc-200 bg-[#f7f7f7]',
 ].join(' ')}
 >
 <div className="mb-1 flex items-center gap-2">
 <p
 className={[
 'text-xs font-semibold',
 minha ? 'text-[#ffb48a]' : 'text-[#7dffbe]',
 ].join(' ')}
 >
 {msg.username || 'Usuário'}
 </p>
 <span className="text-[10px] text-zinc-500">
 {new Date(msg.created_at).toLocaleTimeString('pt-BR', {
 hour: '2-digit',
 minute: '2-digit',
 })}
 </span>
 </div>

 <p className="text-sm leading-6 text-[#142340]">{msg.mensagem}</p>
 </div>

 {minha ? (
 <div className="h-10 w-10 overflow-hidden rounded-full bg-zinc-800">
 {msg.avatar_url ? (
 <img
 src={msg.avatar_url}
 alt={msg.username || 'Usuário'}
 className="h-full w-full object-cover"
 />
 ) : null}
 </div>
 ) : null}
 </div>
 )
 })
 )}

 <div ref={bottomRef} />
 </div>

 <div className="border-t border-zinc-200 p-4">
 <div className="flex gap-3">
 <input
 value={texto}
 onChange={(e) => setTexto(e.target.value)}
 onKeyDown={(e) => {
 if (e.key === 'Enter' && !e.shiftKey) {
 e.preventDefault()
 if (!enviando) void enviar()
 }
 }}
 placeholder="Digite sua mensagem..."
 className="flex-1 border border-zinc-200 bg-[#f7f7f7] px-4 py-3 text-sm text-[#142340] outline-none transition focus:border-[#2563eb]"
 />

 <button
 type="button"
 onClick={() => void enviar()}
 disabled={enviando || !texto.trim()}
 className="inline-flex items-center justify-center bg-[#2563eb] px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#142340] transition hover:bg-[#1d4ed8] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
 >
 {enviando ? 'Enviando...' : 'Enviar'}
 </button>
 </div>
 </div>
 </div>
 )
}