'use client'

import { useCallback, useEffect, useMemo, useRef, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { usePerfil } from '@/app/contexts/PerfilContext'
import {
  ArrowLeft,
  CheckCheck,
  MessageCircle,
  MoreVertical,
  Plus,
  Search,
  Send,
  Users,
} from 'lucide-react'

type Conversa = {
  id: string
  tipo: string
  titulo: string
  avatar_url: string | null
  ultimo_texto: string | null
  ultima_mensagem_em: string | null
  created_at: string
  referencia_tipo?: string | null
  referencia_id?: string | null
}

type Mensagem = {
  id: string
  conversa_id: string
  remetente_user_id: string
  texto: string
  tipo: string
  created_at: string
}

function horaCurta(data?: string | null) {
  if (!data) return ''
  return new Date(data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function dataLista(data?: string | null) {
  if (!data) return ''
  const d = new Date(data)
  const hoje = new Date()
  const mesmoDia = d.toDateString() === hoje.toDateString()
  if (mesmoDia) return horaCurta(data)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

function iniciais(nome: string) {
  return nome
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase() || 'DZ'
}

function ChatShellInner() {
  const { user, perfilAtivo } = usePerfil()
  const searchParams = useSearchParams()

  const [loading, setLoading] = useState(true)
  const [conversas, setConversas] = useState<Conversa[]>([])
  const [conversaAtiva, setConversaAtiva] = useState<Conversa | null>(null)
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [texto, setTexto] = useState('')
  const [busca, setBusca] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const fimRef = useRef<HTMLDivElement>(null)
  const contextoProcessadoRef = useRef<string | null>(null)

  const nomeUsuario = useMemo(() => {
    return perfilAtivo?.nome || perfilAtivo?.nome_exibicao || perfilAtivo?.username || 'Usuário'
  }, [perfilAtivo])

  const conversasFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    if (!termo) return conversas
    return conversas.filter((c) => c.titulo.toLowerCase().includes(termo))
  }, [busca, conversas])

  const carregarConversas = useCallback(async () => {
    if (!user?.id) return

    setLoading(true)
    setErro(null)

    const { data: participantes, error: participantesError } = await supabase
      .from('chat_participantes')
      .select('conversa_id')
      .eq('user_id', user.id)
      .eq('arquivado', false)

    if (participantesError) {
      setErro(participantesError.message)
      setLoading(false)
      return
    }

    const ids = (participantes || []).map((p: any) => p.conversa_id)

    if (!ids.length) {
      setConversas([])
      setConversaAtiva(null)
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('chat_conversas')
      .select('id, tipo, titulo, avatar_url, ultimo_texto, ultima_mensagem_em, created_at, referencia_tipo, referencia_id')
      .in('id', ids)
      .order('ultima_mensagem_em', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })

    if (error) {
      setErro(error.message)
      setLoading(false)
      return
    }

    const lista = (data || []) as Conversa[]
    setConversas(lista)
    setConversaAtiva((atual) => atual || lista[0] || null)
    setLoading(false)
  }, [user?.id])

  const carregarMensagens = useCallback(async (conversaId: string) => {
    const { data, error } = await supabase
      .from('chat_mensagens')
      .select('id, conversa_id, remetente_user_id, texto, tipo, created_at')
      .eq('conversa_id', conversaId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      setErro(error.message)
      return
    }

    setMensagens(((data || []) as Mensagem[]).reverse())
  }, [])

  useEffect(() => {
    carregarConversas()
  }, [carregarConversas])

  const abrirConversaPorContexto = useCallback(async () => {
    if (!user?.id) return

    const refTipo = searchParams.get('refTipo')
    const refId = searchParams.get('refId')
    const titulo = searchParams.get('titulo')
    const avatar = searchParams.get('avatar')
    const tipo = searchParams.get('tipo') || refTipo || 'geral'

    if (!refTipo || !refId || !titulo) return

    const chave = `${refTipo}:${refId}`
    if (contextoProcessadoRef.current === chave) return
    contextoProcessadoRef.current = chave
    setLoading(true)
    setErro(null)

    const conversaExistente = conversas.find(
      (c) => String(c.referencia_tipo || '') === refTipo && String(c.referencia_id || '') === refId
    )

    if (conversaExistente) {
      setConversaAtiva(conversaExistente)
      setLoading(false)
      return
    }

    const { data, error } = await supabase.rpc('chat_abrir_conversa', {
      p_tipo: tipo,
      p_titulo: titulo,
      p_avatar_url: avatar || null,
      p_referencia_tipo: refTipo,
      p_referencia_id: refId,
    })

    if (error) {
      setErro(error.message)
      setLoading(false)
      return
    }

    const conversa = Array.isArray(data) ? data[0] : data
    if (conversa?.id) {
      setConversas((prev) => {
        const semDuplicar = prev.filter((c) => c.id !== conversa.id)
        return [conversa as Conversa, ...semDuplicar]
      })
      setConversaAtiva(conversa as Conversa)
    }

    setLoading(false)
  }, [conversas, searchParams, user?.id])

  useEffect(() => {
    abrirConversaPorContexto()
  }, [abrirConversaPorContexto])


  useEffect(() => {
    if (!conversaAtiva?.id) {
      setMensagens([])
      return
    }

    carregarMensagens(conversaAtiva.id)

    const canal = supabase
      .channel(`chat_conversa_${conversaAtiva.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_mensagens',
          filter: `conversa_id=eq.${conversaAtiva.id}`,
        },
        (payload) => {
          const nova = payload.new as Mensagem
          setMensagens((prev) => {
            if (prev.some((m) => m.id === nova.id)) return prev
            return [...prev, nova]
          })
          setConversas((prev) =>
            prev.map((c) =>
              c.id === nova.conversa_id
                ? { ...c, ultimo_texto: nova.texto, ultima_mensagem_em: nova.created_at }
                : c
            )
          )
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(canal)
    }
  }, [carregarMensagens, conversaAtiva?.id])

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensagens.length, conversaAtiva?.id])

  async function criarChatGeral() {
    if (!user?.id) return
    setErro(null)

    const { data: conversa, error: conversaError } = await supabase
      .from('chat_conversas')
      .insert({
        tipo: 'geral',
        titulo: 'Chat Geral',
        criado_por_user_id: user.id,
      })
      .select('id, tipo, titulo, avatar_url, ultimo_texto, ultima_mensagem_em, created_at, referencia_tipo, referencia_id')
      .single()

    if (conversaError) {
      setErro(conversaError.message)
      return
    }

    const { error: participanteError } = await supabase
      .from('chat_participantes')
      .insert({ conversa_id: conversa.id, user_id: user.id, papel: 'dono' })

    if (participanteError) {
      setErro(participanteError.message)
      return
    }

    setConversas([conversa as Conversa])
    setConversaAtiva(conversa as Conversa)
  }

  async function enviarMensagem(e: React.FormEvent) {
    e.preventDefault()
    if (!user?.id || !conversaAtiva?.id || enviando) return

    const textoLimpo = texto.trim().slice(0, 600)
    if (!textoLimpo) return

    setEnviando(true)
    const { error } = await supabase.from('chat_mensagens').insert({
      conversa_id: conversaAtiva.id,
      remetente_user_id: user.id,
      texto: textoLimpo,
      tipo: 'texto',
    })

    if (error) {
      setErro(error.message)
    } else {
      setTexto('')
    }
    setEnviando(false)
  }

  if (!user?.id) {
    return (
      <main className="flex min-h-[calc(100vh-80px)] items-center justify-center bg-[#f7f7f7] px-4 text-[#142340]">
        <div className="w-full max-w-sm bg-white p-4 text-center text-[13px]">
          Faça login para acessar o chat.
        </div>
      </main>
    )
  }

  return (
    <main className="h-[calc(100vh-68px)] bg-[#f7f7f7] text-[#142340] max-md:h-[calc(100dvh-64px)] max-md:pb-[76px]">
      <div className="mx-auto flex h-full max-w-[1380px] border-x border-zinc-200 bg-white max-md:border-0">
        <aside
          className={[
            'flex h-full w-[360px] shrink-0 flex-col border-r border-zinc-200 bg-white max-md:w-full',
            conversaAtiva ? 'max-md:hidden' : 'max-md:flex',
          ].join(' ')}
        >
          <div className="flex h-14 items-center justify-between border-b border-zinc-100 px-3">
            <div>
              <h1 className="text-[16px] font-semibold uppercase tracking-tight text-[#111827]">Chat</h1>
              <p className="text-[11px] text-zinc-500">Conversas em tempo real</p>
            </div>
            <button
              onClick={criarChatGeral}
              className="inline-flex h-9 w-9 items-center justify-center bg-[#eaf6ff] text-[#2563eb] active:scale-95"
              title="Criar chat geral"
            >
              <Plus size={18} />
            </button>
          </div>

          <div className="border-b border-zinc-100 p-3">
            <div className="flex h-9 items-center gap-2 bg-zinc-50 px-3">
              <Search size={15} className="text-zinc-400" />
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar conversa"
                className="h-full flex-1 bg-transparent text-[12px] outline-none placeholder:text-zinc-400"
              />
            </div>
          </div>

          {erro && <div className="mx-3 mt-3 border border-red-200 bg-red-50 p-2 text-[11px] text-red-700">{erro}</div>}

          <div className="min-h-0 flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-[12px] text-zinc-500">Carregando conversas...</div>
            ) : conversasFiltradas.length ? (
              conversasFiltradas.map((conversa) => {
                const ativa = conversaAtiva?.id === conversa.id
                return (
                  <button
                    key={conversa.id}
                    onClick={() => setConversaAtiva(conversa)}
                    className={[
                      'flex w-full items-center gap-3 border-b border-zinc-100 px-3 py-3 text-left active:bg-zinc-50',
                      ativa ? 'bg-[#eaf6ff]' : 'bg-white hover:bg-zinc-50',
                    ].join(' ')}
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center bg-[#f1f5f9] text-[12px] font-semibold uppercase text-[#2563eb]">
                      {conversa.avatar_url ? (
                        <img src={conversa.avatar_url} alt={conversa.titulo} className="h-full w-full object-cover" />
                      ) : (
                        iniciais(conversa.titulo)
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="min-w-0 flex-1 truncate text-[13px] font-semibold text-[#111827]">{conversa.titulo}</p>
                        <span className="shrink-0 text-[10px] text-zinc-400">{dataLista(conversa.ultima_mensagem_em || conversa.created_at)}</span>
                      </div>
                      <p className="mt-0.5 truncate text-[11px] text-zinc-500">{conversa.ultimo_texto || 'Sem mensagens ainda'}</p>
                    </div>
                  </button>
                )
              })
            ) : (
              <div className="p-4 text-[12px] text-zinc-500">
                Nenhuma conversa. Clique no botão + para criar o Chat Geral.
              </div>
            )}
          </div>
        </aside>

        <section
          className={[
            'flex min-w-0 flex-1 flex-col bg-[#f7f7f7] max-md:w-full',
            conversaAtiva ? 'max-md:flex' : 'max-md:hidden',
          ].join(' ')}
        >
          {conversaAtiva ? (
            <>
              <header className="flex h-14 shrink-0 items-center justify-between border-b border-zinc-200 bg-white px-3">
                <div className="flex min-w-0 items-center gap-3">
                  <button onClick={() => setConversaAtiva(null)} className="hidden h-9 w-9 items-center justify-center max-md:flex">
                    <ArrowLeft size={20} />
                  </button>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center bg-[#eaf6ff] text-[12px] font-semibold text-[#2563eb]">
                    {conversaAtiva.avatar_url ? (
                      <img src={conversaAtiva.avatar_url} alt={conversaAtiva.titulo} className="h-full w-full object-cover" />
                    ) : (
                      <MessageCircle size={18} />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold uppercase text-[#111827]">{conversaAtiva.titulo}</p>
                    <p className="truncate text-[11px] text-zinc-500">{conversaAtiva.referencia_tipo || conversaAtiva.tipo}</p>
                  </div>
                </div>
                <button className="flex h-9 w-9 items-center justify-center text-zinc-500">
                  <MoreVertical size={18} />
                </button>
              </header>

              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 max-md:px-3">
                <div className="mx-auto flex max-w-3xl flex-col gap-2">
                  {mensagens.map((msg) => {
                    const minha = msg.remetente_user_id === user.id
                    return (
                      <div key={msg.id} className={`flex ${minha ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={[
                            'max-w-[78%] px-3 py-2 text-[13px] leading-relaxed max-md:max-w-[86%]',
                            minha ? 'bg-[#2563eb] text-white' : 'bg-white text-[#142340]',
                          ].join(' ')}
                        >
                          {!minha && (
                            <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#2563eb]">
                              Usuário
                            </div>
                          )}
                          <p className="whitespace-pre-wrap break-words">{msg.texto}</p>
                          <div className={`mt-1 flex items-center justify-end gap-1 text-[9px] ${minha ? 'text-blue-100' : 'text-zinc-400'}`}>
                            {horaCurta(msg.created_at)}
                            {minha && <CheckCheck size={12} />}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  <div ref={fimRef} />
                </div>
              </div>

              <form onSubmit={enviarMensagem} className="flex shrink-0 items-center gap-2 border-t border-zinc-200 bg-white p-3">
                <input
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  maxLength={600}
                  placeholder={`Mensagem como ${nomeUsuario}`}
                  className="h-10 flex-1 bg-zinc-50 px-3 text-[13px] outline-none placeholder:text-zinc-400 focus:bg-white focus:ring-1 focus:ring-[#2563eb]"
                />
                <button
                  disabled={!texto.trim() || enviando}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center bg-[#2563eb] text-white disabled:opacity-40"
                >
                  <Send size={17} />
                </button>
              </form>
            </>
          ) : (
            <div className="hidden h-full items-center justify-center text-center text-zinc-500 md:flex">
              <div>
                <Users size={42} className="mx-auto mb-3 text-zinc-300" />
                <p className="text-[14px] font-semibold text-[#142340]">Selecione uma conversa</p>
                <p className="mt-1 text-[12px]">Estilo WhatsApp Web no PC e app no mobile.</p>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

export default function ChatShell() {
  return (
    <Suspense fallback={null}>
      <ChatShellInner />
    </Suspense>
  )
}
