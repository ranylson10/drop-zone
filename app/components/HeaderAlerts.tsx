'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Bell,
  MessageCircle,
  Users,
  Heart,
  MessageSquare,
  ShieldAlert,
  Check,
  Loader2,
  X,
  ExternalLink,
  MailOpen,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { usePerfil } from '@/app/contexts/PerfilContext'

type NotificacaoBanco = {
  id: string
  user_id: string | null
  titulo: string | null
  descricao: string | null
  tipo: string | null
  lido: boolean | null
  created_at: string | null
  mensagem: string | null
  link: string | null
}

type Conversa = {
  id: string
  tipo: string | null
  titulo: string | null
  avatar_url: string | null
  ultimo_texto: string | null
  ultima_mensagem_em: string | null
}

type ParticipanteChat = {
  id: string
  conversa_id: string
  user_id: string
  ultima_lida_em: string | null
  arquivado: boolean | null
}

type MensagemChat = {
  id: string
  conversa_id: string
  remetente_user_id: string
  texto: string
  created_at: string
  apagado_em?: string | null
}

type EquipeResumo = {
  id: string
  nome: string | null
  tag: string | null
  logo_url: string | null
  criado_por?: string | null
}

type PerfilJogoResumo = {
  id: string
  nick: string | null
  foto_capa: string | null
  user_id: string | null
}

type ConviteEquipe = {
  id: string
  equipe_id: string
  perfil_jogo_id: string
  convidado_por_user_id: string
  status: string | null
  mensagem: string | null
  created_at: string | null
  updated_at: string | null
  tipo: string | null
  equipe?: EquipeResumo | EquipeResumo[] | null
  perfil_jogo?: PerfilJogoResumo | PerfilJogoResumo[] | null
}

type AlertaUnificado = {
  id: string
  origem: 'notificacao' | 'convite_equipe' | 'pedido_equipe' | 'manager' | 'chat'
  titulo: string
  descricao: string
  tipo: string
  created_at: string | null
  lido: boolean
  link?: string | null
  avatar_url?: string | null
  acaoLabel?: string
}

function normalizarItem<T>(item: T | T[] | null | undefined): T | null {
  if (!item) return null
  return Array.isArray(item) ? item[0] || null : item
}

function isPendente(status: unknown) {
  const s = String(status || '').trim().toLowerCase()
  return !s || ['pendente', 'enviado', 'aguardando', 'aberto', 'solicitado'].includes(s)
}

function tempoRelativo(data?: string | null) {
  if (!data) return 'agora'
  const date = new Date(data)
  if (Number.isNaN(date.getTime())) return 'agora'
  const diff = Date.now() - date.getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'agora'
  if (min < 60) return `${min}min`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h}h`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d`
  return date.toLocaleDateString('pt-BR')
}

function cortar(texto: string, max = 86) {
  if (texto.length <= max) return texto
  return `${texto.slice(0, max - 1)}…`
}

function iconePorTipo(tipo: string, origem: AlertaUnificado['origem']) {
  const t = tipo.toLowerCase()
  if (origem === 'chat') return <MessageCircle size={15} />
  if (origem === 'convite_equipe' || origem === 'pedido_equipe' || t.includes('equipe')) return <Users size={15} />
  if (t.includes('curt') || t.includes('torcedor') || t.includes('segu')) return <Heart size={15} />
  if (t.includes('coment') || t.includes('resposta')) return <MessageSquare size={15} />
  if (t.includes('denuncia') || t.includes('moderacao')) return <ShieldAlert size={15} />
  return <Bell size={15} />
}

export default function HeaderAlerts() {
  const { user, perfisJogo } = usePerfil()
  const [aba, setAba] = useState<'notificacoes' | 'mensagens' | null>(null)
  const [notificacoes, setNotificacoes] = useState<NotificacaoBanco[]>([])
  const [convites, setConvites] = useState<ConviteEquipe[]>([])
  const [pedidosEquipe, setPedidosEquipe] = useState<ConviteEquipe[]>([])
  const [conversas, setConversas] = useState<Conversa[]>([])
  const [participantes, setParticipantes] = useState<ParticipanteChat[]>([])
  const [mensagensRecentes, setMensagensRecentes] = useState<MensagemChat[]>([])
  const [loading, setLoading] = useState(false)
  const [marcando, setMarcando] = useState(false)

  const userId = user?.id || null
  const perfilIds = useMemo(() => (perfisJogo || []).map((p: any) => p.id).filter(Boolean), [perfisJogo])

  const carregar = useCallback(async () => {
    if (!userId) return

    try {
      setLoading(true)

      const [notificacoesRes, chatParticipantesRes, equipesCriadasRes] = await Promise.all([
        supabase
          .from('notificacoes')
          .select('id,user_id,titulo,descricao,tipo,lido,created_at,mensagem,link')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(40),
        supabase
          .from('chat_participantes')
          .select('id,conversa_id,user_id,ultima_lida_em,arquivado')
          .eq('user_id', userId)
          .eq('arquivado', false)
          .limit(80),
        supabase
          .from('equipes')
          .select('id,nome,tag,logo_url,criado_por')
          .eq('criado_por', userId)
          .limit(100),
      ])

      if (!notificacoesRes.error) setNotificacoes((notificacoesRes.data || []) as NotificacaoBanco[])

      const participantesData = !chatParticipantesRes.error ? ((chatParticipantesRes.data || []) as ParticipanteChat[]) : []
      setParticipantes(participantesData)
      const conversaIds = participantesData.map((p) => p.conversa_id).filter(Boolean)

      if (conversaIds.length) {
        const [conversasRes, mensagensRes] = await Promise.all([
          supabase
            .from('chat_conversas')
            .select('id,tipo,titulo,avatar_url,ultimo_texto,ultima_mensagem_em')
            .in('id', conversaIds)
            .order('ultima_mensagem_em', { ascending: false, nullsFirst: false })
            .limit(40),
          supabase
            .from('chat_mensagens')
            .select('id,conversa_id,remetente_user_id,texto,created_at,apagado_em')
            .in('conversa_id', conversaIds)
            .is('apagado_em', null)
            .order('created_at', { ascending: false })
            .limit(250),
        ])

        if (!conversasRes.error) setConversas((conversasRes.data || []) as Conversa[])
        if (!mensagensRes.error) setMensagensRecentes((mensagensRes.data || []) as MensagemChat[])
      } else {
        setConversas([])
        setMensagensRecentes([])
      }

      if (perfilIds.length) {
        const { data, error } = await supabase
          .from('convites_equipe')
          .select(`
            id,
            equipe_id,
            perfil_jogo_id,
            convidado_por_user_id,
            status,
            mensagem,
            created_at,
            updated_at,
            tipo,
            equipe:equipe_id (id,nome,tag,logo_url,criado_por),
            perfil_jogo:perfil_jogo_id (id,nick,foto_capa,user_id)
          `)
          .in('perfil_jogo_id', perfilIds)
          .limit(80)

        if (!error) setConvites(((data || []) as ConviteEquipe[]).filter((c) => isPendente(c.status)))
      } else {
        setConvites([])
      }

      const equipesCriadas = !equipesCriadasRes.error ? ((equipesCriadasRes.data || []) as EquipeResumo[]) : []
      const equipeIds = equipesCriadas.map((e) => e.id)

      if (equipeIds.length) {
        const { data, error } = await supabase
          .from('convites_equipe')
          .select(`
            id,
            equipe_id,
            perfil_jogo_id,
            convidado_por_user_id,
            status,
            mensagem,
            created_at,
            updated_at,
            tipo,
            equipe:equipe_id (id,nome,tag,logo_url,criado_por),
            perfil_jogo:perfil_jogo_id (id,nick,foto_capa,user_id)
          `)
          .in('equipe_id', equipeIds)
          .neq('convidado_por_user_id', userId)
          .limit(80)

        if (!error) {
          setPedidosEquipe(((data || []) as ConviteEquipe[]).filter((c) => isPendente(c.status) && String(c.tipo || '').toLowerCase().includes('pedido')))
        }
      } else {
        setPedidosEquipe([])
      }
    } finally {
      setLoading(false)
    }
  }, [userId, perfilIds])

  useEffect(() => {
    void carregar()
  }, [carregar])

  useEffect(() => {
    if (!userId) return

    const canal = supabase
      .channel(`header_alertas_${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notificacoes', filter: `user_id=eq.${userId}` }, () => void carregar())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_mensagens' }, () => void carregar())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'convites_equipe' }, () => void carregar())
      .subscribe()

    return () => {
      supabase.removeChannel(canal)
    }
  }, [userId, carregar])

  const unreadPorConversa = useMemo(() => {
    const mapa = new Map<string, number>()
    const participantePorConversa = new Map(participantes.map((p) => [p.conversa_id, p]))

    mensagensRecentes.forEach((msg) => {
      if (msg.remetente_user_id === userId) return
      const participante = participantePorConversa.get(msg.conversa_id)
      const lidaEm = participante?.ultima_lida_em ? new Date(participante.ultima_lida_em).getTime() : 0
      const criadaEm = new Date(msg.created_at).getTime()
      if (criadaEm > lidaEm) mapa.set(msg.conversa_id, (mapa.get(msg.conversa_id) || 0) + 1)
    })

    return mapa
  }, [mensagensRecentes, participantes, userId])

  const alertas = useMemo<AlertaUnificado[]>(() => {
    const diretas: AlertaUnificado[] = notificacoes.map((n) => ({
      id: n.id,
      origem: 'notificacao',
      titulo: n.titulo || 'Notificação',
      descricao: n.descricao || n.mensagem || 'Você recebeu uma atualização.',
      tipo: n.tipo || 'notificacao',
      created_at: n.created_at,
      lido: Boolean(n.lido),
      link: n.link,
      acaoLabel: n.link ? 'Abrir' : undefined,
    }))

    const convitesRecebidos: AlertaUnificado[] = convites
      .filter((c) => !String(c.tipo || '').toLowerCase().includes('pedido'))
      .map((c) => {
        const equipe = normalizarItem(c.equipe)
        const perfil = normalizarItem(c.perfil_jogo)
        return {
          id: c.id,
          origem: 'convite_equipe',
          titulo: `Convite para ${equipe?.tag || equipe?.nome || 'equipe'}`,
          descricao: c.mensagem || `${perfil?.nick || 'Seu perfil'} recebeu um convite de equipe.`,
          tipo: 'convite_equipe',
          created_at: c.created_at,
          lido: false,
          avatar_url: equipe?.logo_url,
          link: '/perfil',
          acaoLabel: 'Responder',
        }
      })

    const pedidosRecebidos: AlertaUnificado[] = pedidosEquipe.map((c) => {
      const equipe = normalizarItem(c.equipe)
      const perfil = normalizarItem(c.perfil_jogo)
      return {
        id: c.id,
        origem: 'pedido_equipe',
        titulo: `Pedido para ${equipe?.tag || equipe?.nome || 'sua equipe'}`,
        descricao: c.mensagem || `${perfil?.nick || 'Um jogador'} pediu para entrar na equipe.`,
        tipo: 'pedido_equipe',
        created_at: c.created_at,
        lido: false,
        avatar_url: perfil?.foto_capa || equipe?.logo_url,
        link: equipe?.id ? `/equipe/${equipe.id}` : '/equipe',
        acaoLabel: 'Ver equipe',
      }
    })

    return [...diretas, ...convitesRecebidos, ...pedidosRecebidos].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
  }, [notificacoes, convites, pedidosEquipe])

  const conversasOrdenadas = useMemo(() => {
    return [...conversas].sort((a, b) => new Date(b.ultima_mensagem_em || 0).getTime() - new Date(a.ultima_mensagem_em || 0).getTime())
  }, [conversas])

  const totalNotificacoes = alertas.filter((a) => !a.lido).length
  const totalMensagens = Array.from(unreadPorConversa.values()).reduce((acc, n) => acc + n, 0)

  async function marcarNotificacoesComoLidas() {
    if (!userId) return
    try {
      setMarcando(true)
      await supabase.from('notificacoes').update({ lido: true }).eq('user_id', userId).eq('lido', false)
      setNotificacoes((atuais) => atuais.map((n) => ({ ...n, lido: true })))
    } finally {
      setMarcando(false)
    }
  }

  async function marcarConversaLida(conversaId: string) {
    if (!userId) return
    const agora = new Date().toISOString()
    await supabase
      .from('chat_participantes')
      .update({ ultima_lida_em: agora })
      .eq('user_id', userId)
      .eq('conversa_id', conversaId)

    setParticipantes((atuais) => atuais.map((p) => (p.conversa_id === conversaId ? { ...p, ultima_lida_em: agora } : p)))
  }

  if (!userId) return null

  return (
    <div className="relative flex items-center gap-2">
      <AlertButton label="Mensagens" ativo={aba === 'mensagens'} count={totalMensagens} onClick={() => setAba((atual) => (atual === 'mensagens' ? null : 'mensagens'))}>
        <MessageCircle size={17} />
      </AlertButton>
      <AlertButton label="Notificações" ativo={aba === 'notificacoes'} count={totalNotificacoes} onClick={() => setAba((atual) => (atual === 'notificacoes' ? null : 'notificacoes'))}>
        <Bell size={17} />
      </AlertButton>

      {aba ? (
        <>
          <div className="fixed inset-0 z-[210]" onClick={() => setAba(null)} />
          <section className="absolute right-0 top-[52px] z-[230] w-[380px] max-w-[92vw] overflow-hidden border border-zinc-200 bg-white shadow-[0_26px_80px_rgba(15,23,42,0.20)]">
            <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
              <div>
                <div className="text-[12px] font-black uppercase tracking-[0.16em] text-[#142340]">
                  {aba === 'notificacoes' ? 'Central de notificações' : 'Mensagens'}
                </div>
                <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
                  Dados reais da sua conta e perfis
                </div>
              </div>
              <button type="button" onClick={() => setAba(null)} className="flex h-8 w-8 items-center justify-center border border-zinc-200 text-zinc-500 hover:bg-zinc-50">
                <X size={14} />
              </button>
            </div>

            {aba === 'notificacoes' ? (
              <div>
                <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-2">
                  <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500">{totalNotificacoes} pendente(s)</span>
                  <button type="button" onClick={marcarNotificacoesComoLidas} disabled={marcando || totalNotificacoes === 0} className="inline-flex h-8 items-center gap-2 border border-zinc-200 px-3 text-[10px] font-bold uppercase text-zinc-600 disabled:opacity-40">
                    {marcando ? <Loader2 size={12} className="animate-spin" /> : <MailOpen size={12} />}
                    Marcar lidas
                  </button>
                </div>
                <div className="max-h-[440px] overflow-y-auto p-2">
                  {loading ? <LoadingLine /> : alertas.length ? alertas.map((alerta) => <AlertaItem key={`${alerta.origem}-${alerta.id}`} alerta={alerta} />) : <EmptyState texto="Nenhuma notificação encontrada." />}
                </div>
              </div>
            ) : (
              <div className="max-h-[500px] overflow-y-auto p-2">
                {loading ? <LoadingLine /> : conversasOrdenadas.length ? conversasOrdenadas.map((conversa) => {
                  const unread = unreadPorConversa.get(conversa.id) || 0
                  return (
                    <Link key={conversa.id} href="/chat" onClick={() => { void marcarConversaLida(conversa.id); setAba(null) }} className="flex gap-3 border border-transparent p-3 hover:border-blue-100 hover:bg-blue-50/40">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-zinc-100 text-zinc-500">
                        {conversa.avatar_url ? <img src={conversa.avatar_url} alt="" className="h-full w-full object-cover" /> : <MessageCircle size={18} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="truncate text-[13px] font-bold text-[#142340]">{conversa.titulo || 'Conversa'}</div>
                          <div className="shrink-0 text-[10px] font-bold uppercase text-zinc-400">{tempoRelativo(conversa.ultima_mensagem_em)}</div>
                        </div>
                        <div className="mt-1 truncate text-[11px] font-medium text-zinc-500">{conversa.ultimo_texto || 'Sem mensagens recentes.'}</div>
                      </div>
                      {unread > 0 ? <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-red-600 px-1.5 text-[10px] font-black text-white">{unread > 99 ? '99+' : unread}</span> : null}
                    </Link>
                  )
                }) : <EmptyState texto="Nenhuma conversa encontrada." />}
              </div>
            )}
          </section>
        </>
      ) : null}
    </div>
  )
}

function AlertButton({ children, count, label, ativo, onClick }: { children: React.ReactNode; count: number; label: string; ativo?: boolean; onClick: () => void }) {
  return (
    <button type="button" aria-label={label} onClick={onClick} className={["relative flex h-10 w-10 items-center justify-center rounded-full border transition", ativo ? 'border-blue-200 bg-blue-50 text-[#2563eb]' : 'border-zinc-200 bg-zinc-50 text-zinc-700 hover:border-blue-200 hover:bg-blue-50 hover:text-[#2563eb]'].join(' ')}>
      {children}
      {count > 0 ? <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-black leading-none text-white ring-2 ring-white">{count > 99 ? '99+' : count}</span> : null}
    </button>
  )
}

function AlertaItem({ alerta }: { alerta: AlertaUnificado }) {
  const body = (
    <div className={["flex gap-3 border p-3 transition", alerta.lido ? 'border-transparent hover:border-zinc-200 hover:bg-zinc-50' : 'border-blue-100 bg-blue-50/50 hover:bg-blue-50'].join(' ')}>
      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-zinc-200 bg-white text-[#2563eb]">
        {alerta.avatar_url ? <img src={alerta.avatar_url} alt="" className="h-full w-full object-cover" /> : iconePorTipo(alerta.tipo, alerta.origem)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <div className="truncate text-[12px] font-black uppercase tracking-[0.08em] text-[#142340]">{alerta.titulo}</div>
          <div className="shrink-0 text-[10px] font-bold text-zinc-400">{tempoRelativo(alerta.created_at)}</div>
        </div>
        <p className="mt-1 text-[11px] font-medium leading-4 text-zinc-600">{cortar(alerta.descricao)}</p>
        {alerta.acaoLabel ? <div className="mt-2 inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#2563eb]">{alerta.acaoLabel}<ExternalLink size={11} /></div> : null}
      </div>
      {!alerta.lido ? <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#2563eb]" /> : null}
    </div>
  )

  if (alerta.link) {
    return <Link href={alerta.link}>{body}</Link>
  }

  return body
}

function LoadingLine() {
  return <div className="flex items-center justify-center py-10 text-zinc-500"><Loader2 size={18} className="animate-spin" /></div>
}

function EmptyState({ texto }: { texto: string }) {
  return <div className="px-4 py-10 text-center text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-400">{texto}</div>
}
