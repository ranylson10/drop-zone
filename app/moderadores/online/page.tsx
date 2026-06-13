'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Activity, CheckCircle2, Clock3, MessageCircle, Shield, Trophy, Users, Wifi, WifiOff } from 'lucide-react'
import { supabase } from '@/lib/supabase'

type ModeradorRaw = Record<string, any>
type PerfilRaw = Record<string, any>
type ModeradorView = {
  id: string
  userId: string | null
  nome: string
  subtitulo: string
  avatarUrl: string | null
  status: string
  online: boolean
  livre: boolean
  moderacoes: number
  ultimaAtividade: string | null
}

function normalizarTexto(valor?: string | null) {
  return String(valor || '').replaceAll('_', ' ').trim()
}

function dataRelativa(data?: string | null) {
  if (!data) return 'sem atividade recente'

  const diff = Date.now() - new Date(data).getTime()
  if (!Number.isFinite(diff)) return 'sem atividade recente'

  const minutos = Math.max(0, Math.floor(diff / 60000))
  if (minutos < 1) return 'agora'
  if (minutos < 60) return `${minutos} min atrás`

  const horas = Math.floor(minutos / 60)
  if (horas < 24) return `${horas}h atrás`

  const dias = Math.floor(horas / 24)
  return `${dias}d atrás`
}

function pegarUserId(item: ModeradorRaw) {
  return (
    item.user_id ||
    item.usuario_id ||
    item.moderador_user_id ||
    item.perfil_user_id ||
    null
  )
}

function pegarDataAtividade(item: ModeradorRaw) {
  return (
    item.ultima_atividade_em ||
    item.last_seen_at ||
    item.online_at ||
    item.updated_at ||
    item.created_at ||
    null
  )
}

function estaOnline(item: ModeradorRaw) {
  if (typeof item.online === 'boolean') return item.online
  if (typeof item.disponivel_online === 'boolean') return item.disponivel_online
  if (typeof item.esta_online === 'boolean') return item.esta_online

  const data = pegarDataAtividade(item)
  if (!data) return false
  return Date.now() - new Date(data).getTime() <= 5 * 60 * 1000
}

function estaLivre(item: ModeradorRaw) {
  if (typeof item.livre === 'boolean') return item.livre
  if (typeof item.disponivel === 'boolean') return item.disponivel
  if (typeof item.ocupado === 'boolean') return !item.ocupado

  const status = String(item.status_atendimento || item.status_disponibilidade || item.status || '').toLowerCase()
  if (['ocupado', 'moderando', 'em_atendimento'].includes(status)) return false
  return true
}

function contarModeracoesPorUsuario(registros: Record<string, any>[], userId: string | null) {
  if (!userId) return 0

  const camposPossiveis = [
    'moderador_user_id',
    'moderado_por_user_id',
    'finalizado_por_user_id',
    'resolvido_por_user_id',
    'validado_por_user_id',
    'admin_user_id',
    'user_id',
  ]

  return registros.filter((registro) => {
    const status = String(registro.status || registro.resultado_status || '').toLowerCase()
    const finalizado = ['finalizado', 'pago', 'resolvido', 'encerrado', 'validado'].includes(status)
    const achouUsuario = camposPossiveis.some((campo) => registro[campo] === userId)
    return achouUsuario && finalizado
  }).length
}

export default function ModeradoresOnlinePage() {
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [moderadoresRaw, setModeradoresRaw] = useState<ModeradorRaw[]>([])
  const [perfis, setPerfis] = useState<PerfilRaw[]>([])
  const [moderacoes, setModeracoes] = useState<Record<string, any>[]>([])

  const carregar = useCallback(async () => {
    setLoading(true)
    setErro(null)

    try {
      const { data: moderadoresData, error: moderadoresError } = await supabase
        .from('administradores_evento')
        .select('*')
        .eq('status', 'aprovado')
        .order('created_at', { ascending: false })

      if (moderadoresError) throw moderadoresError

      const listaModeradores = (moderadoresData || []) as ModeradorRaw[]
      const userIds = Array.from(new Set(listaModeradores.map(pegarUserId).filter(Boolean))) as string[]

      let perfisData: PerfilRaw[] = []
      if (userIds.length > 0) {
        const { data } = await supabase
          .from('perfis_jogo')
          .select('*')
          .in('user_id', userIds)
        perfisData = (data || []) as PerfilRaw[]
      }

      const { data: confrontosData } = await supabase
        .from('confrontos_apostados')
        .select('*')
        .limit(1000)

      setModeradoresRaw(listaModeradores)
      setPerfis(perfisData)
      setModeracoes((confrontosData || []) as Record<string, any>[])
    } catch (error: any) {
      console.error('Erro ao carregar moderadores online:', error)
      setErro(error?.message || 'Não foi possível carregar a lista de moderadores.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  const moderadores = useMemo<ModeradorView[]>(() => {
    return moderadoresRaw.map((item) => {
      const userId = pegarUserId(item)
      const perfil = perfis.find((p) => p.user_id === userId) || null
      const nome =
        perfil?.nick ||
        perfil?.nome ||
        perfil?.nome_exibicao ||
        item.nome ||
        item.apelido ||
        (userId ? `Moderador ${String(userId).slice(0, 6)}` : 'Moderador')

      return {
        id: String(item.id || userId || nome),
        userId,
        nome,
        subtitulo: perfil?.uid_jogo ? `UID ${perfil.uid_jogo}` : normalizarTexto(item.tipo || item.funcao || 'Moderador de apostados'),
        avatarUrl: perfil?.avatar_url || perfil?.foto_capa || item.avatar_url || item.foto_url || null,
        status: normalizarTexto(item.status_atendimento || item.status_disponibilidade || item.status || 'aprovado'),
        online: estaOnline(item),
        livre: estaLivre(item),
        moderacoes: contarModeracoesPorUsuario(moderacoes, userId),
        ultimaAtividade: pegarDataAtividade(item),
      }
    })
  }, [moderadoresRaw, perfis, moderacoes])

  const total = moderadores.length
  const online = moderadores.filter((m) => m.online).length
  const livres = moderadores.filter((m) => m.online && m.livre).length
  const totalModeracoes = moderadores.reduce((acc, item) => acc + item.moderacoes, 0)

  return (
    <main className="min-h-[calc(100vh-96px)] text-[#142340]">
      <section className="border border-zinc-200 bg-white p-4 md:p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.22em] text-orange-600">
              <Shield size={15} />
              Apostados
            </div>
            <h1 className="text-[24px] font-semibold uppercase tracking-tight text-[#111827] md:text-[30px]">
              Moderadores online
            </h1>
            <p className="mt-1 max-w-2xl text-[13px] text-zinc-500">
              Lista pública para o usuário ver quem está disponível para moderação. O painel de controle dos confrontos continua separado em /moderadores.
            </p>
          </div>

          <button
            onClick={carregar}
            className="inline-flex h-9 items-center justify-center border border-zinc-300 bg-white px-4 text-[12px] font-medium uppercase tracking-wide text-[#142340] transition hover:bg-zinc-50"
          >
            Atualizar
          </button>
        </div>
      </section>

      <section className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="border border-zinc-200 bg-white p-3">
          <div className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">Moderadores</div>
          <div className="mt-2 text-[24px] font-semibold text-[#111827]">{total}</div>
        </div>
        <div className="border border-zinc-200 bg-white p-3">
          <div className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">Online</div>
          <div className="mt-2 text-[24px] font-semibold text-emerald-600">{online}</div>
        </div>
        <div className="border border-zinc-200 bg-white p-3">
          <div className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">Livres agora</div>
          <div className="mt-2 text-[24px] font-semibold text-sky-600">{livres}</div>
        </div>
        <div className="border border-zinc-200 bg-white p-3">
          <div className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">Moderações</div>
          <div className="mt-2 text-[24px] font-semibold text-orange-600">{totalModeracoes}</div>
        </div>
      </section>

      <section className="mt-4 border border-zinc-200 bg-white">
        <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-50 px-3 py-2">
          <div className="flex items-center gap-2 text-[12px] font-medium uppercase tracking-wide text-[#142340]">
            <Users size={15} className="text-orange-600" />
            Lista de moderadores
          </div>
          <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
            {online} online
          </span>
        </div>

        {loading ? (
          <div className="p-6 text-center text-[13px] text-zinc-500">Carregando moderadores...</div>
        ) : erro ? (
          <div className="p-6 text-center text-[13px] text-red-600">{erro}</div>
        ) : moderadores.length === 0 ? (
          <div className="p-6 text-center text-[13px] text-zinc-500">Nenhum moderador aprovado encontrado.</div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {moderadores.map((moderador) => (
              <div key={moderador.id} className="flex items-center gap-3 px-3 py-3 transition hover:bg-zinc-50">
                <div className="relative h-11 w-11 shrink-0 overflow-hidden border border-zinc-200 bg-zinc-100">
                  {moderador.avatarUrl ? (
                    <img src={moderador.avatarUrl} alt={moderador.nome} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[12px] font-semibold uppercase text-zinc-500">
                      {moderador.nome.slice(0, 2)}
                    </div>
                  )}
                  <span
                    className={[
                      'absolute bottom-0 right-0 h-3 w-3 border-2 border-white',
                      moderador.online ? 'bg-emerald-500' : 'bg-zinc-300',
                    ].join(' ')}
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate text-[14px] font-semibold text-[#111827]">{moderador.nome}</h2>
                    <span
                      className={[
                        'inline-flex items-center gap-1 border px-2 py-0.5 text-[10px] font-medium uppercase',
                        moderador.online
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          : 'border-zinc-200 bg-zinc-50 text-zinc-600',
                      ].join(' ')}
                    >
                      {moderador.online ? <Wifi size={11} /> : <WifiOff size={11} />}
                      {moderador.online ? 'online' : 'offline'}
                    </span>
                    <span
                      className={[
                        'inline-flex items-center gap-1 border px-2 py-0.5 text-[10px] font-medium uppercase',
                        moderador.livre
                          ? 'border-blue-200 bg-blue-50 text-blue-700'
                          : 'border-yellow-200 bg-yellow-50 text-yellow-700',
                      ].join(' ')}
                    >
                      <CheckCircle2 size={11} />
                      {moderador.livre ? 'livre' : 'ocupado'}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-[12px] text-zinc-500">{moderador.subtitulo}</p>
                </div>

                <div className="hidden min-w-[120px] text-right md:block">
                  <div className="flex items-center justify-end gap-1 text-[12px] font-semibold text-orange-600">
                    <Trophy size={13} />
                    {moderador.moderacoes}
                  </div>
                  <div className="mt-1 flex items-center justify-end gap-1 text-[11px] text-zinc-500">
                    <Clock3 size={12} />
                    {dataRelativa(moderador.ultimaAtividade)}
                  </div>
                </div>

                <Link
                  href="/chat"
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center border border-zinc-300 bg-white text-[#142340] transition hover:bg-zinc-50 hover:text-[#2563eb]"
                  title="Abrir chat"
                >
                  <MessageCircle size={16} />
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
