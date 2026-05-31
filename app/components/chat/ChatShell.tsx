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

type Remetente = {
  id: string
  username: string | null
  nome_exibicao: string | null
  foto_url: string | null
}

type PerfilBusca = Remetente

type ParticipanteChat = {
  conversa_id: string
  user_id: string
  papel: string | null
  ultima_lida_em: string | null
  perfil?: Remetente | null
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

function tipoChatLabel(conversa: Pick<Conversa, 'tipo' | 'referencia_tipo'>) {
  const tipo = String(conversa.referencia_tipo || conversa.tipo || '').toLowerCase()
  if (tipo === 'equipe') return 'Equipe'
  if (tipo === 'campeonato') return 'Campeonato'
  if (tipo === 'grupo' || tipo === 'grupo_campeonato' || tipo === 'campeonato_grupo') return 'Grupo'
  if (tipo === 'jogo') return 'Jogo'
  if (tipo === 'dm' || tipo === 'jogador') return 'Direto'
  if (tipo === 'confronto') return 'Confronto'
  if (tipo === 'apostado') return 'Apostado'
  if (tipo === 'moderacao') return 'Moderacao'
  return 'Geral'
}

function ehConversaGrupo(conversa?: Pick<Conversa, 'tipo' | 'referencia_tipo'> | null) {
  if (!conversa) return false
  const tipo = String(conversa.referencia_tipo || conversa.tipo || '').toLowerCase()
  return !['dm', 'jogador', 'perfil'].includes(tipo)
}

function nomePerfil(perfil?: Remetente | null) {
  return perfil?.nome_exibicao || perfil?.username || 'Usuario'
}

function dataOrdenacao(conversa: Conversa) {
  return new Date(conversa.ultima_mensagem_em || conversa.created_at || 0).getTime()
}

function deduplicarConversas(lista: Conversa[]) {
  const vistas = new Set<string>()
  const ordenadas = [...lista].sort((a, b) => dataOrdenacao(b) - dataOrdenacao(a))

  return ordenadas.filter((conversa) => {
    if (conversa.tipo === 'geral' && conversa.titulo.toLowerCase() === 'chat geral') return false

    const chaveContexto = conversa.referencia_tipo && conversa.referencia_id
      ? `${conversa.tipo}:${conversa.referencia_tipo}:${conversa.referencia_id}`
      : `${conversa.tipo}:${conversa.titulo.toLowerCase()}`

    if (vistas.has(chaveContexto)) return false
    vistas.add(chaveContexto)
    return true
  })
}

function ChatShellInner() {
  const { user, perfilAtivo } = usePerfil()
  const searchParams = useSearchParams()

  const [loading, setLoading] = useState(true)
  const [conversas, setConversas] = useState<Conversa[]>([])
  const [conversaAtiva, setConversaAtiva] = useState<Conversa | null>(null)
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [remetentes, setRemetentes] = useState<Record<string, Remetente>>({})
  const [participantesPorConversa, setParticipantesPorConversa] = useState<Record<string, ParticipanteChat[]>>({})
  const [naoLidasPorConversa, setNaoLidasPorConversa] = useState<Record<string, number>>({})
  const [mostrarParticipantes, setMostrarParticipantes] = useState(false)
  const [perfisBusca, setPerfisBusca] = useState<PerfilBusca[]>([])
  const [buscandoPerfis, setBuscandoPerfis] = useState(false)
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
    return conversas.filter((c) => c.titulo.toLowerCase().includes(termo) && c.tipo !== 'geral')
  }, [busca, conversas])

  const participantesAtivos = useMemo(() => {
    return conversaAtiva?.id ? participantesPorConversa[conversaAtiva.id] || [] : []
  }, [conversaAtiva?.id, participantesPorConversa])

  const participantesHumanos = useMemo(() => {
    return participantesAtivos.filter((participante) => participante.user_id !== user?.id)
  }, [participantesAtivos, user?.id])

  useEffect(() => {
    const termo = busca.trim()
    let cancelado = false

    async function buscarPerfis() {
      if (termo.length < 2) {
        setPerfisBusca([])
        setBuscandoPerfis(false)
        return
      }

      setBuscandoPerfis(true)
      const termoSeguro = termo.replaceAll('%', '').replaceAll('_', '')
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, nome_exibicao, foto_url')
        .or(`username.ilike.%${termoSeguro}%,nome_exibicao.ilike.%${termoSeguro}%`)
        .limit(12)

      if (cancelado) return
      if (error) {
        console.error('Erro ao buscar perfis no chat:', error)
        setPerfisBusca([])
      } else {
        setPerfisBusca(((data || []) as PerfilBusca[]).filter((perfil) => perfil.id !== user?.id))
      }
      setBuscandoPerfis(false)
    }

    buscarPerfis()

    return () => {
      cancelado = true
    }
  }, [busca, user?.id])

  const carregarRemetentes = useCallback(async (ids: string[]) => {
    const unicos = Array.from(new Set(ids.filter(Boolean)))
    if (!unicos.length) return

    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, nome_exibicao, foto_url')
      .in('id', unicos)

    if (error) {
      console.error('Erro ao carregar remetentes do chat:', error)
      return
    }

    setRemetentes((atual) => {
      const proximo = { ...atual }
      ;((data || []) as Remetente[]).forEach((perfil) => {
        proximo[perfil.id] = perfil
      })
      return proximo
    })
  }, [])

  const carregarParticipantes = useCallback(async (conversaIds: string[]) => {
    const ids = Array.from(new Set(conversaIds.filter(Boolean)))
    if (!ids.length) return

    const { data, error } = await supabase
      .from('chat_participantes')
      .select('conversa_id, user_id, papel, ultima_lida_em')
      .in('conversa_id', ids)

    if (error) {
      console.error('Erro ao carregar participantes do chat:', error)
      return
    }

    const linhas = (data || []) as ParticipanteChat[]
    const userIds = Array.from(new Set(linhas.map((p) => p.user_id).filter(Boolean)))
    let perfis: Record<string, Remetente> = {}

    if (userIds.length) {
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, username, nome_exibicao, foto_url')
        .in('id', userIds)

      perfis = Object.fromEntries(((profilesData || []) as Remetente[]).map((perfil) => [perfil.id, perfil]))
    }

    const agrupado: Record<string, ParticipanteChat[]> = {}
    linhas.forEach((participante) => {
      const item = { ...participante, perfil: perfis[participante.user_id] || null }
      agrupado[item.conversa_id] = [...(agrupado[item.conversa_id] || []), item]
    })

    setParticipantesPorConversa((atual) => ({ ...atual, ...agrupado }))
    setRemetentes((atual) => ({ ...atual, ...perfis }))
  }, [])

  const carregarConversas = useCallback(async () => {
    if (!user?.id) return

    setLoading(true)
    setErro(null)

    const { data: participantes, error: participantesError } = await supabase
      .from('chat_participantes')
      .select('conversa_id, ultima_lida_em')
      .eq('user_id', user.id)
      .eq('arquivado', false)

    if (participantesError) {
      setErro(participantesError.message)
      setLoading(false)
      return
    }

    const meusParticipantes = (participantes || []) as Array<{ conversa_id: string; ultima_lida_em: string | null }>
    const ids = meusParticipantes.map((p) => p.conversa_id)

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

    const lista = deduplicarConversas((data || []) as Conversa[])
    setConversas(lista)
    setConversaAtiva((atual) => atual || lista[0] || null)

    await carregarParticipantes(ids)

    const leituraMap = Object.fromEntries(meusParticipantes.map((p) => [p.conversa_id, p.ultima_lida_em]))
    const { data: mensagensNaoLidas } = await supabase
      .from('chat_mensagens')
      .select('conversa_id, remetente_user_id, created_at')
      .in('conversa_id', ids)
      .neq('remetente_user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(600)

    const contagem: Record<string, number> = {}
    ;((mensagensNaoLidas || []) as Array<{ conversa_id: string; created_at: string }>).forEach((mensagem) => {
      const ultimaLida = leituraMap[mensagem.conversa_id]
      if (!ultimaLida || new Date(mensagem.created_at).getTime() > new Date(ultimaLida).getTime()) {
        contagem[mensagem.conversa_id] = (contagem[mensagem.conversa_id] || 0) + 1
      }
    })

    setNaoLidasPorConversa(contagem)
    setLoading(false)
  }, [carregarParticipantes, user])

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

    const lista = ((data || []) as Mensagem[]).reverse()
    setMensagens(lista)
    await carregarRemetentes(lista.map((mensagem) => mensagem.remetente_user_id))
  }, [carregarRemetentes])

  const marcarConversaComoLida = useCallback(async (conversaId: string) => {
    if (!user?.id) return

    const agora = new Date().toISOString()
    setNaoLidasPorConversa((atual) => ({ ...atual, [conversaId]: 0 }))
    setParticipantesPorConversa((atual) => ({
      ...atual,
      [conversaId]: (atual[conversaId] || []).map((participante) =>
        participante.user_id === user.id ? { ...participante, ultima_lida_em: agora } : participante
      ),
    }))

    await supabase
      .from('chat_participantes')
      .update({ ultima_lida_em: agora })
      .eq('conversa_id', conversaId)
      .eq('user_id', user.id)
  }, [user?.id])

  useEffect(() => {
    carregarConversas()
  }, [carregarConversas])

  useEffect(() => {
    if (!user?.id) return

    const canal = supabase
      .channel(`chat_lista_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_participantes',
          filter: `user_id=eq.${user.id}`,
        },
        () => carregarConversas()
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_conversas',
        },
        (payload) => {
          const atualizada = payload.new as Conversa
          setConversas((prev) => {
            if (!prev.some((conversa) => conversa.id === atualizada.id)) return prev
            return deduplicarConversas(prev
              .map((conversa) => (conversa.id === atualizada.id ? { ...conversa, ...atualizada } : conversa))
              .sort((a, b) => {
                const dataA = new Date(a.ultima_mensagem_em || a.created_at || 0).getTime()
                const dataB = new Date(b.ultima_mensagem_em || b.created_at || 0).getTime()
                return dataB - dataA
              }))
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(canal)
    }
  }, [carregarConversas, user?.id])

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

    const conversaId = String(Array.isArray(data) ? data[0] || '' : data || '')
    if (conversaId) {
      await supabase.rpc('chat_sincronizar_participantes_contexto', {
        p_conversa_id: conversaId,
      })

      const { data: conversa, error: conversaBuscaError } = await supabase
        .from('chat_conversas')
        .select('id, tipo, titulo, avatar_url, ultimo_texto, ultima_mensagem_em, created_at, referencia_tipo, referencia_id')
        .eq('id', conversaId)
        .single()

      if (conversaBuscaError) {
        setErro(conversaBuscaError.message)
        setLoading(false)
        return
      }

      setConversas((prev) => {
        const semDuplicar = prev.filter((c) => c.id !== conversa.id)
        return deduplicarConversas([conversa as Conversa, ...semDuplicar])
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
    carregarParticipantes([conversaAtiva.id])
    marcarConversaComoLida(conversaAtiva.id)

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
          carregarRemetentes([nova.remetente_user_id])
          setMensagens((prev) => {
            if (prev.some((m) => m.id === nova.id)) return prev
            return [...prev, nova]
          })
          setConversas((prev) =>
            deduplicarConversas(prev.map((c) =>
              c.id === nova.conversa_id
                ? { ...c, ultimo_texto: nova.texto, ultima_mensagem_em: nova.created_at }
                : c
            ))
          )
          if (nova.remetente_user_id !== user?.id) {
            if (conversaAtiva.id === nova.conversa_id) {
              marcarConversaComoLida(nova.conversa_id)
            } else {
              setNaoLidasPorConversa((atual) => ({
                ...atual,
                [nova.conversa_id]: (atual[nova.conversa_id] || 0) + 1,
              }))
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_participantes',
          filter: `conversa_id=eq.${conversaAtiva.id}`,
        },
        () => carregarParticipantes([conversaAtiva.id])
      )
      .subscribe()

    return () => {
      supabase.removeChannel(canal)
    }
  }, [carregarMensagens, carregarParticipantes, carregarRemetentes, conversaAtiva?.id, marcarConversaComoLida, user?.id])

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensagens.length, conversaAtiva?.id])

  useEffect(() => {
    setMostrarParticipantes(false)
  }, [conversaAtiva?.id])

  async function abrirPerfil(perfil: PerfilBusca) {
    if (!user?.id) return
    setErro(null)

    const titulo = perfil.nome_exibicao || perfil.username || 'Perfil'
    const conversaExistente = conversas.find(
      (conversa) => conversa.referencia_tipo === 'perfil' && conversa.referencia_id === perfil.id
    )

    if (conversaExistente) {
      setConversaAtiva(conversaExistente)
      setBusca('')
      return
    }

    const { data, error } = await supabase.rpc('chat_abrir_conversa', {
      p_tipo: 'dm',
      p_titulo: titulo,
      p_avatar_url: perfil.foto_url || null,
      p_referencia_tipo: 'perfil',
      p_referencia_id: perfil.id,
    })

    if (error) {
      setErro(error.message)
      return
    }

    const conversaId = String(Array.isArray(data) ? data[0] || '' : data || '')
    if (!conversaId) return

    const { data: conversa, error: conversaBuscaError } = await supabase
      .from('chat_conversas')
      .select('id, tipo, titulo, avatar_url, ultimo_texto, ultima_mensagem_em, created_at, referencia_tipo, referencia_id')
      .eq('id', conversaId)
      .single()

    if (conversaBuscaError) {
      setErro(conversaBuscaError.message)
      return
    }

    setConversas((prev) => deduplicarConversas([conversa as Conversa, ...prev.filter((item) => item.id !== conversa.id)]))
    setConversaAtiva(conversa as Conversa)
    setBusca('')
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
    <main className="relative h-[calc(100vh-68px)] overflow-hidden bg-[#d1d7db] text-[#111b21] max-md:h-[calc(100dvh-64px)] max-md:pb-[76px]">
      <div className="absolute inset-x-0 top-0 h-[126px] bg-[#00a884]" />
      <div className="relative z-10 mx-auto flex h-full max-w-[1480px] border border-[#c7d0d5] bg-white shadow-[0_8px_30px_rgba(17,27,33,0.16)] max-md:border-0">
        <aside
          className={[
            'flex h-full w-[410px] shrink-0 flex-col border-r border-[#d1d7db] bg-white max-md:w-full',
            conversaAtiva ? 'max-md:hidden' : 'max-md:flex',
          ].join(' ')}
        >
          <div className="flex h-[64px] items-center justify-between bg-[#008069] px-4 text-white">
            <div className="flex min-w-0 items-center gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/18 text-[12px] font-black uppercase text-white ring-1 ring-white/25">
                {iniciais(nomeUsuario)}
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-[17px] font-semibold tracking-tight">WhatsDrop</h1>
                <p className="truncate text-[11px] text-white/75">{nomeUsuario}</p>
              </div>
            </div>
          </div>

          <div className="border-b border-[#edf1f3] bg-[#f0f2f5] p-3">
            <div className="flex h-10 items-center gap-2 rounded-lg bg-white px-3 shadow-[0_1px_0_rgba(17,27,33,0.04)]">
              <Search size={15} className="text-[#54656f]" />
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar perfil ou conversa"
                className="h-full flex-1 bg-transparent text-[13px] outline-none placeholder:text-[#667781]"
              />
            </div>
          </div>

          {erro && <div className="mx-3 mt-3 border border-red-200 bg-red-50 p-2 text-[11px] text-red-700">{erro}</div>}

          <div className="min-h-0 flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-[12px] text-zinc-500">Carregando conversas...</div>
            ) : (
              <>
                {busca.trim().length >= 2 ? (
                  <div className="border-b border-[#edf1f3] bg-white">
                    <div className="px-4 pb-2 pt-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#667781]">
                      Perfis encontrados
                    </div>
                    {buscandoPerfis ? (
                      <div className="px-4 pb-4 text-[12px] text-[#667781]">Buscando perfis...</div>
                    ) : perfisBusca.length ? (
                      perfisBusca.map((perfil) => {
                        const nome = perfil.nome_exibicao || perfil.username || 'Perfil'
                        return (
                          <button
                            key={perfil.id}
                            type="button"
                            onClick={() => abrirPerfil(perfil)}
                            className="flex w-full items-center gap-3 border-t border-[#edf1f3] px-3 py-3 text-left transition hover:bg-[#f5f6f6] active:bg-[#ebedef]"
                          >
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#dfe5e7] text-[12px] font-semibold uppercase text-[#008069] ring-1 ring-black/5">
                              {perfil.foto_url ? (
                                <img src={perfil.foto_url} alt={nome} className="h-full w-full object-cover" />
                              ) : (
                                iniciais(nome)
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-[15px] font-medium text-[#111b21]">{nome}</div>
                              <div className="mt-0.5 truncate text-[12px] text-[#667781]">
                                {perfil.username ? `@${perfil.username}` : 'Perfil pessoal'}
                              </div>
                            </div>
                            <span className="rounded-full bg-[#d9fdd3] px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.08em] text-[#008069]">
                              Direto
                            </span>
                          </button>
                        )
                      })
                    ) : (
                      <div className="px-4 pb-4 text-[12px] text-[#667781]">Nenhum perfil encontrado.</div>
                    )}
                  </div>
                ) : null}

                {conversasFiltradas.length ? (
                  conversasFiltradas.map((conversa) => {
                    const ativa = conversaAtiva?.id === conversa.id
                    const grupo = ehConversaGrupo(conversa)
                    const naoLidas = naoLidasPorConversa[conversa.id] || 0
                    return (
                  <button
                    key={conversa.id}
                    onClick={() => setConversaAtiva(conversa)}
                    className={[
                      'flex w-full items-center gap-3 border-b border-[#edf1f3] px-3 py-3 text-left transition active:bg-[#ebedef]',
                      ativa ? 'bg-[#e7f7ee]' : 'bg-white hover:bg-[#f5f6f6]',
                    ].join(' ')}
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#dfe5e7] text-[12px] font-semibold uppercase text-[#008069] ring-1 ring-black/5">
                      {conversa.avatar_url ? (
                        <img src={conversa.avatar_url} alt={conversa.titulo} className="h-full w-full object-cover" />
                      ) : (
                        iniciais(conversa.titulo)
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="shrink-0 text-[#008069]">
                          {grupo ? <Users size={14} /> : <MessageCircle size={14} />}
                        </span>
                        <p className="min-w-0 flex-1 truncate text-[15px] font-medium text-[#111b21]">{conversa.titulo}</p>
                        <span className="shrink-0 text-[11px] text-[#667781]">{dataLista(conversa.ultima_mensagem_em || conversa.created_at)}</span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-2">
                        <span className="shrink-0 rounded-full bg-[#d9fdd3] px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.08em] text-[#008069]">
                          {tipoChatLabel(conversa)}
                        </span>
                        <p className="min-w-0 flex-1 truncate text-[12px] text-[#667781]">{conversa.ultimo_texto || 'Sem mensagens ainda'}</p>
                        {naoLidas > 0 ? (
                          <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-[#25d366] px-1.5 text-[10px] font-bold text-white">
                            {naoLidas > 99 ? '99+' : naoLidas}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </button>
                )
                  })
                ) : !busca.trim() ? (
                  <div className="p-4 text-[12px] text-[#667781]">
                    Busque um perfil, equipe, grupo ou campeonato para iniciar uma conversa.
                  </div>
                ) : busca.trim().length < 2 ? (
                  <div className="p-4 text-[12px] text-[#667781]">
                    Digite pelo menos 2 letras para buscar perfis.
                  </div>
                ) : null}
              </>
            )}
          </div>
        </aside>

        <section
          className={[
            'flex min-w-0 flex-1 flex-col bg-[#efeae2] max-md:w-full',
            conversaAtiva ? 'max-md:flex' : 'max-md:hidden',
          ].join(' ')}
        >
          {conversaAtiva ? (
            <>
              <header className="flex h-[64px] shrink-0 items-center justify-between bg-[#008069] px-4 text-white">
                <div className="flex min-w-0 items-center gap-3">
                  <button onClick={() => setConversaAtiva(null)} className="hidden h-9 w-9 items-center justify-center rounded-full hover:bg-white/15 max-md:flex">
                    <ArrowLeft size={20} />
                  </button>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/18 text-[12px] font-semibold text-white ring-1 ring-white/25">
                    {conversaAtiva.avatar_url ? (
                      <img src={conversaAtiva.avatar_url} alt={conversaAtiva.titulo} className="h-full w-full object-cover" />
                    ) : (
                      iniciais(conversaAtiva.titulo)
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-semibold">{conversaAtiva.titulo}</p>
                    <p className="truncate text-[11px] text-white/72">
                      {ehConversaGrupo(conversaAtiva)
                        ? `${participantesAtivos.length || 1} participantes`
                        : participantesHumanos[0]?.perfil
                          ? `Direto com ${nomePerfil(participantesHumanos[0].perfil)}`
                          : tipoChatLabel(conversaAtiva)}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMostrarParticipantes((atual) => !atual)}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-white hover:bg-white/15"
                  title="Ver participantes"
                >
                  {ehConversaGrupo(conversaAtiva) ? <Users size={18} /> : <MoreVertical size={18} />}
                </button>
              </header>

              {mostrarParticipantes ? (
                <div className="shrink-0 border-b border-[#d1d7db] bg-white px-4 py-3 shadow-sm">
                  <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#667781]">
                    Participantes da conversa
                  </div>
                  <div className="grid max-h-64 gap-2 overflow-y-auto pr-1">
                    {participantesAtivos.length ? participantesAtivos.map((participante) => {
                      const nome = participante.user_id === user.id ? `${nomeUsuario} (voce)` : nomePerfil(participante.perfil)
                      return (
                        <div key={participante.user_id} className="flex items-center gap-3 rounded-lg bg-[#f0f2f5] px-3 py-2">
                          <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-[#dfe5e7] text-[11px] font-bold uppercase text-[#008069]">
                            {participante.perfil?.foto_url ? (
                              <img src={participante.perfil.foto_url} alt={nome} className="h-full w-full object-cover" />
                            ) : (
                              iniciais(nome)
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-[13px] font-semibold text-[#111b21]">{nome}</div>
                            <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#667781]">
                              {participante.papel || 'membro'}
                            </div>
                          </div>
                        </div>
                      )
                    }) : (
                      <div className="text-[12px] text-[#667781]">Nenhum participante carregado ainda.</div>
                    )}
                  </div>
                </div>
              ) : null}

              <div className="min-h-0 flex-1 overflow-y-auto bg-[#efe7dc] bg-[radial-gradient(circle_at_20%_20%,rgba(17,27,33,0.055)_0_1px,transparent_1px),radial-gradient(circle_at_80%_10%,rgba(17,27,33,0.045)_0_1px,transparent_1px),radial-gradient(circle_at_55%_70%,rgba(17,27,33,0.04)_0_1px,transparent_1px)] bg-[length:44px_44px] px-6 py-5 max-md:px-3">
                <div className="mx-auto flex max-w-4xl flex-col gap-2">
                  {mensagens.map((msg) => {
                    const minha = msg.remetente_user_id === user.id
                    const outrosParticipantes = participantesAtivos.filter((participante) => participante.user_id !== user.id)
                    const visualizada = minha && outrosParticipantes.length > 0 && outrosParticipantes.every((participante) =>
                      participante.ultima_lida_em && new Date(participante.ultima_lida_em).getTime() >= new Date(msg.created_at).getTime()
                    )
                    const entregue = minha && outrosParticipantes.length > 0
                    return (
                      <div
                        key={msg.id}
                        title={!minha ? remetentes[msg.remetente_user_id]?.nome_exibicao || remetentes[msg.remetente_user_id]?.username || 'Usuario' : undefined}
                        className={`flex ${minha ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={[
                            'relative max-w-[72%] px-3 py-2 text-[14px] leading-relaxed shadow-[0_1px_1px_rgba(17,27,33,0.16)] max-md:max-w-[86%]',
                            minha
                              ? 'rounded-bl-lg rounded-br-sm rounded-tl-lg rounded-tr-lg bg-[#d9fdd3] text-[#111b21] after:absolute after:right-[-7px] after:top-0 after:h-0 after:w-0 after:border-y-[7px] after:border-l-[8px] after:border-y-transparent after:border-l-[#d9fdd3]'
                              : 'rounded-bl-sm rounded-br-lg rounded-tl-lg rounded-tr-lg bg-white text-[#111b21] after:absolute after:left-[-7px] after:top-0 after:h-0 after:w-0 after:border-y-[7px] after:border-r-[8px] after:border-y-transparent after:border-r-white',
                          ].join(' ')}
                        >
                          {!minha && (<>
                            <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#008069]">
                              {remetentes[msg.remetente_user_id]?.nome_exibicao || remetentes[msg.remetente_user_id]?.username || 'Usuario'}
                            </div>
                            <div className="hidden">
                              Usuário
                            </div>
                          </>)}
                          <p className="whitespace-pre-wrap break-words">{msg.texto}</p>
                          <div className="mt-1 flex items-center justify-end gap-1 pl-8 text-[10px] text-[#667781]">
                            {horaCurta(msg.created_at)}
                            {minha && (
                              <CheckCheck
                                size={12}
                                className={visualizada ? 'text-[#53bdeb]' : 'text-[#8696a0]'}
                                aria-label={visualizada ? 'Visualizada' : entregue ? 'Entregue' : 'Enviada'}
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  <div ref={fimRef} />
                </div>
              </div>

              <form onSubmit={enviarMensagem} className="flex shrink-0 items-center gap-2 bg-[#f0f2f5] p-3">
                <input
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  maxLength={600}
                  placeholder={`Mensagem como ${nomeUsuario}`}
                  className="h-11 flex-1 rounded-full bg-white px-5 text-[14px] outline-none placeholder:text-[#667781] focus:ring-1 focus:ring-[#00a884]"
                />
                <button
                  disabled={!texto.trim() || enviando}
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#00a884] text-white shadow-sm transition hover:bg-[#008f72] disabled:opacity-40"
                >
                  <Send size={17} />
                </button>
              </form>
            </>
          ) : (
            <div className="hidden h-full items-center justify-center text-center text-zinc-500 md:flex">
              <div>
                <div className="mx-auto mb-4 grid h-20 w-20 place-items-center rounded-full bg-[#d9fdd3] text-[#008069]">
                  <Users size={38} />
                </div>
                <p className="text-[18px] font-light text-[#41525d]">Selecione uma conversa</p>
                <p className="mt-1 text-[13px] text-[#667781]">Chats em tempo real para equipes, campeonatos, grupos e perfis.</p>
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
