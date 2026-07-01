'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'
import { usePerfil } from '@/app/contexts/PerfilContext'
import Image from 'next/image'
import Link from 'next/link'
import SocialActions from '@/app/components/SocialActions'
import RankingTierBadge, { formatScore } from '@/app/components/RankingTierBadge'
import {
  ArrowLeft,
  BarChart3,
  CalendarDays,
  Check,
  Copy,
  Crosshair,
  Gamepad2,
  History,
  MapPin,
  Monitor,
  Send,
  Shield,
  Smartphone,
  Star,
  Trophy,
  UserCircle2,
  Users,
  X,
  Zap,
} from 'lucide-react'

type EquipeResumo = {
  id: string
  nome: string | null
  tag: string | null
  logo_url: string | null
}

type PerfilJogo = {
  id: string
  user_id: string | null
  nick: string | null
  uid_jogo: string | null
  servidor: string | null
  funcao: string | null
  plataforma: 'mobile' | 'emulador' | null
  foto_capa: string | null
  ativo: boolean | null
  equipe_id: string | null
  created_at?: string | null
  updated_at?: string | null
  equipes?: EquipeResumo | EquipeResumo[] | null
}

type RankingJogador = {
  posicao: number | null
  tier: string | null
  top_percentual: number | null
  score_total: number | null
  score_skill: number | null
  score_competitivo: number | null
  score_equipe: number | null
  score_social: number | null
  score_perfil: number | null
  campeonatos_jogados: number | null
  jogos_disputados: number | null
  partidas_registradas: number | null
  abates: number | null
  media_abates: number | null
  ranking_pontos: boolean | null
}

type ConviteEquipe = {
  id: string
  tipo: 'convite' | 'pedido'
  status: 'pendente' | 'aceito' | 'recusado' | 'cancelado'
  mensagem: string | null
  created_at: string
  equipe: EquipeResumo | null
}

function normalizarEquipe(equipe: EquipeResumo | EquipeResumo[] | null | undefined): EquipeResumo | null {
  if (!equipe) return null
  return Array.isArray(equipe) ? equipe[0] || null : equipe
}

function formatarData(data?: string | null) {
  if (!data) return 'N/I'
  const d = new Date(data)
  if (Number.isNaN(d.getTime())) return 'N/I'
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(d)
}

function getRoleIcon(role: string | null) {
  switch ((role || '').toLowerCase()) {
    case 'sniper':
      return <Crosshair size={15} />
    case 'suporte':
      return <Shield size={15} />
    case 'granadeiro':
      return <Zap size={15} />
    default:
      return <Users size={15} />
  }
}

function getPlatformIcon(plataforma: string | null) {
  if (plataforma === 'mobile') return <Smartphone size={15} />
  if (plataforma === 'emulador') return <Monitor size={15} />
  return <Gamepad2 size={15} />
}

function getPlatformLabel(plataforma?: string | null) {
  if (plataforma === 'mobile') return 'Mobile'
  if (plataforma === 'emulador') return 'Emulador'
  return 'N/I'
}

function primeiraLetra(nome?: string | null) {
  return (nome || 'J').trim().charAt(0).toUpperCase() || 'J'
}

async function rpcFallback(nameList: string[], payload: Record<string, any>) {
  let lastError: any = null
  for (const fn of nameList) {
    const { error } = await supabase.rpc(fn, payload)
    if (!error) return
    lastError = error
  }
  throw lastError
}

function InfoCard({
  label,
  value,
  icon,
  helper,
}: {
  label: string
  value: string | number
  icon?: React.ReactNode
  helper?: string
}) {
  return (
    <div className="border border-zinc-200 bg-white/90 p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
      <div className="flex items-center justify-between gap-3">
        <div className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">{label}</div>
        {icon ? <div className="text-zinc-400">{icon}</div> : null}
      </div>
      <div className="mt-3 text-[22px] font-black uppercase leading-none text-[#142340]">{value}</div>
      {helper ? <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-400">{helper}</div> : null}
    </div>
  )
}

function StatMini({
  label,
  value,
  helper,
}: {
  label: string
  value: string | number
  helper?: string
}) {
  return (
    <div className="border border-zinc-200 bg-white p-4">
      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">{label}</div>
      <div className="mt-2 text-[24px] font-black leading-none text-[#0f172a]">{value}</div>
      {helper ? <div className="mt-1 text-[10px] font-bold uppercase text-zinc-400">{helper}</div> : null}
    </div>
  )
}

function TabButton({ icon, label, ativo }: { icon: React.ReactNode; label: string; ativo?: boolean }) {
  return (
    <button
      type="button"
      className={[
        'flex h-12 items-center justify-center gap-2 border-r border-zinc-200 px-4 text-[11px] font-black uppercase tracking-[0.14em] last:border-r-0',
        ativo ? 'bg-amber-50 text-amber-600' : 'text-zinc-500 hover:bg-zinc-50',
      ].join(' ')}
    >
      {icon}
      {label}
    </button>
  )
}

export default function PerfilPublicoAtleta() {
  const { id } = useParams()
  const router = useRouter()
  const { user } = usePerfil()

  const [atleta, setAtleta] = useState<PerfilJogo | null>(null)
  const [ranking, setRanking] = useState<RankingJogador | null>(null)
  const [loading, setLoading] = useState(true)
  const [processandoId, setProcessandoId] = useState<string | null>(null)
  const [enviandoPedido, setEnviandoPedido] = useState<string | null>(null)
  const [copiado, setCopiado] = useState(false)

  const [convitesRecebidos, setConvitesRecebidos] = useState<ConviteEquipe[]>([])
  const [solicitacoesEnviadas, setSolicitacoesEnviadas] = useState<ConviteEquipe[]>([])
  const [buscaEquipe, setBuscaEquipe] = useState('')
  const [mensagemPedido, setMensagemPedido] = useState('')
  const [equipesBusca, setEquipesBusca] = useState<EquipeResumo[]>([])
  const [carregandoBusca, setCarregandoBusca] = useState(false)

  const perfilId = String(id || '')
  const equipeAtual = useMemo(() => normalizarEquipe(atleta?.equipes), [atleta?.equipes])

  const ehMeuPerfil = useMemo(() => {
    return !!user?.id && !!atleta?.user_id && user.id === atleta.user_id
  }, [user?.id, atleta?.user_id])

  const carregarAtleta = useCallback(async () => {
    if (!perfilId) return

    try {
      setLoading(true)

      const { data, error } = await supabase
        .from('perfis_jogo')
        .select(`
          id,
          user_id,
          nick,
          uid_jogo,
          servidor,
          funcao,
          plataforma,
          foto_capa,
          ativo,
          equipe_id,
          created_at,
          updated_at,
          equipes:equipe_id (
            id,
            nome,
            tag,
            logo_url
          )
        `)
        .eq('id', perfilId)
        .maybeSingle()

      if (error) throw error

      setAtleta((data as PerfilJogo | null) || null)

      const { data: rankingData } = await supabase
        .from('vw_lealt_ranking_jogadores')
        .select(`
          posicao,
          tier,
          top_percentual,
          score_total,
          score_skill,
          score_competitivo,
          score_equipe,
          score_social,
          score_perfil,
          campeonatos_jogados,
          jogos_disputados,
          partidas_registradas,
          abates,
          media_abates,
          ranking_pontos
        `)
        .eq('perfil_jogo_id', perfilId)
        .maybeSingle()

      setRanking((rankingData as RankingJogador | null) || null)
    } catch (error) {
      console.error('Erro ao carregar atleta:', error)
    } finally {
      setLoading(false)
    }
  }, [perfilId])

  const carregarPendencias = useCallback(async () => {
    if (!perfilId) return

    try {
      const { data: recebidos } = await supabase
        .from('convites_equipe')
        .select(`
          id,
          tipo,
          status,
          mensagem,
          created_at,
          equipe:equipe_id (
            id,
            nome,
            tag,
            logo_url
          )
        `)
        .eq('perfil_jogo_id', perfilId)
        .eq('status', 'pendente')
        .eq('tipo', 'convite')
        .order('created_at', { ascending: false })

      const { data: enviados } = await supabase
        .from('convites_equipe')
        .select(`
          id,
          tipo,
          status,
          mensagem,
          created_at,
          equipe:equipe_id (
            id,
            nome,
            tag,
            logo_url
          )
        `)
        .eq('perfil_jogo_id', perfilId)
        .eq('tipo', 'pedido')
        .order('created_at', { ascending: false })

      setConvitesRecebidos(((recebidos || []) as any[]).map((item) => ({
        ...item,
        equipe: normalizarEquipe(item.equipe),
      })))

      setSolicitacoesEnviadas(((enviados || []) as any[]).map((item) => ({
        ...item,
        equipe: normalizarEquipe(item.equipe),
      })))
    } catch (error) {
      console.error('Erro ao carregar pendências:', error)
    }
  }, [perfilId])

  useEffect(() => {
    carregarAtleta()
    carregarPendencias()
  }, [carregarAtleta, carregarPendencias])

  useEffect(() => {
    let ignore = false

    async function buscarEquipes() {
      if (!ehMeuPerfil || buscaEquipe.trim().length < 2) {
        setEquipesBusca([])
        return
      }

      try {
        setCarregandoBusca(true)
        const termo = `%${buscaEquipe.trim()}%`

        const { data, error } = await supabase
          .from('equipes')
          .select('id, nome, tag, logo_url')
          .or(`nome.ilike.${termo},tag.ilike.${termo}`)
          .limit(8)

        if (error) throw error
        if (!ignore) setEquipesBusca((data || []) as EquipeResumo[])
      } catch (error) {
        console.error('Erro ao buscar equipes:', error)
        if (!ignore) setEquipesBusca([])
      } finally {
        if (!ignore) setCarregandoBusca(false)
      }
    }

    const timer = setTimeout(buscarEquipes, 250)
    return () => {
      ignore = true
      clearTimeout(timer)
    }
  }, [buscaEquipe, ehMeuPerfil])

  async function responderConvite(conviteId: string, acao: 'aceito' | 'recusado') {
    try {
      setProcessandoId(conviteId)
      await rpcFallback(['fn_responder_convite_equipe', 'responder_convite_equipe'], {
        p_convite_id: conviteId,
        p_status: acao,
      })

      await carregarAtleta()
      await carregarPendencias()
    } catch (error) {
      console.error('Erro ao responder convite:', error)
      alert('Não foi possível responder o convite.')
    } finally {
      setProcessandoId(null)
    }
  }

  async function enviarPedido(equipeId: string) {
    if (!perfilId) return

    try {
      setEnviandoPedido(equipeId)

      await rpcFallback(['fn_solicitar_entrada_equipe', 'solicitar_entrada_equipe'], {
        p_equipe_id: equipeId,
        p_perfil_jogo_id: perfilId,
        p_mensagem: mensagemPedido.trim() || null,
      })

      setBuscaEquipe('')
      setMensagemPedido('')
      setEquipesBusca([])
      await carregarPendencias()
    } catch (error) {
      console.error('Erro ao enviar pedido:', error)
      alert('Não foi possível enviar o pedido.')
    } finally {
      setEnviandoPedido(null)
    }
  }

  async function copiarUid() {
    const uid = atleta?.uid_jogo || ''
    if (!uid) return
    await navigator.clipboard.writeText(uid)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 1200)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f7f9fc] px-4 py-10 text-[#142340]">
        <div className="mx-auto max-w-[1440px] border border-zinc-200 bg-white p-10 text-center text-[12px] font-black uppercase tracking-[0.18em] text-zinc-500">
          Carregando jogador...
        </div>
      </div>
    )
  }

  if (!atleta) {
    return (
      <div className="min-h-screen bg-[#f7f9fc] px-4 py-10 text-[#142340]">
        <div className="mx-auto max-w-[1440px] border border-zinc-200 bg-white p-10 text-center">
          <p className="text-[14px] font-black uppercase tracking-[0.14em] text-zinc-600">Jogador não encontrado.</p>
          <button
            onClick={() => router.back()}
            className="mt-4 border border-zinc-300 bg-white px-4 py-2 text-[11px] font-black uppercase tracking-[0.14em] text-[#142340]"
          >
            Voltar
          </button>
        </div>
      </div>
    )
  }

  const scoreTotal = ranking?.score_total || 0
  const posicao = ranking?.posicao || null
  const tier = ranking?.tier || null
  const topPercentual = Number(ranking?.top_percentual || 0)
  const abates = ranking?.abates || 0
  const partidas = ranking?.partidas_registradas || ranking?.jogos_disputados || 0
  const mediaAbates = Number(ranking?.media_abates || 0)
  const desde = formatarData(atleta.created_at)

  return (
    <div className="min-h-screen bg-[#f7f9fc] text-[#142340]">
      <div className="mx-auto max-w-[1500px] px-4 py-6">
        <button
          onClick={() => router.back()}
          className="mb-4 inline-flex h-9 items-center gap-2 border border-zinc-200 bg-white px-3 text-[11px] font-black uppercase tracking-[0.16em] text-zinc-500 transition hover:border-[#2563eb] hover:text-[#2563eb]"
        >
          <ArrowLeft size={14} />
          Retornar para database
        </button>

        <section className="relative overflow-hidden border border-zinc-200 bg-white">
          <div className="absolute inset-x-0 top-0 h-[210px] bg-[radial-gradient(circle_at_10%_10%,rgba(245,158,11,0.22),transparent_28%),linear-gradient(135deg,#f8fafc_0%,#ffffff_45%,#eef5ff_100%)]" />
          <div className="absolute right-8 top-8 hidden lg:block">
            <div className="relative">
              <div className="absolute inset-0 translate-x-2 translate-y-2 border border-amber-200 bg-amber-100/30" />
              <div className="relative flex h-[150px] w-[150px] flex-col items-center justify-center border border-amber-300 bg-gradient-to-br from-amber-50 via-white to-amber-100 text-center shadow-[0_18px_40px_rgba(245,158,11,0.12)]">
                <div className="text-[10px] font-black uppercase tracking-[0.28em] text-amber-600">Tier</div>
                <div className="text-[54px] font-black leading-none text-amber-500">{tier || 'E'}</div>
                <div className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">LEALT</div>
              </div>
            </div>
          </div>

          <div className="relative grid gap-6 px-6 pb-6 pt-8 lg:grid-cols-[360px_minmax(0,1fr)] xl:grid-cols-[400px_minmax(0,1fr)]">
            <div className="relative min-h-[420px]">
              <div className="absolute bottom-0 left-0 h-[360px] w-[320px] border border-amber-300 bg-gradient-to-br from-white via-amber-50 to-white shadow-[0_20px_60px_rgba(15,23,42,0.08)] md:h-[430px] md:w-[360px]">
                <div className="absolute inset-3 border border-amber-200" />
              </div>

              <div className="absolute bottom-3 left-8 h-[46px] w-[250px] rounded-[50%] bg-amber-200/45 blur-xl" />

              <div className="relative z-10 ml-5 mt-5 h-[390px] w-[285px] overflow-visible md:h-[470px] md:w-[335px]">
                {atleta.foto_capa ? (
                  <Image
                    src={atleta.foto_capa}
                    alt={atleta.nick || 'Jogador'}
                    fill
                    className="object-cover object-center drop-shadow-[0_24px_28px_rgba(15,23,42,0.22)]"
                    priority
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center border border-zinc-200 bg-white text-[90px] font-black text-zinc-300">
                    {primeiraLetra(atleta.nick)}
                  </div>
                )}
              </div>
            </div>

            <div className="relative z-10 pt-2 lg:pr-[190px]">
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex h-9 items-center border border-amber-300 bg-amber-50 px-3 text-[12px] font-black uppercase tracking-[0.16em] text-amber-600">
                  #{posicao || '-'}
                </span>
                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">
                  Ranking geral<br />
                  jogadores
                </div>
                <RankingTierBadge tier={tier} posicao={posicao} score={scoreTotal} tipo="jogador" />
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <h1 className="text-[52px] font-black uppercase leading-none tracking-tight text-[#0f172a] md:text-[70px]">
                  {atleta.nick || 'SEM NICK'}
                </h1>
                {ranking?.ranking_pontos ? (
                  <span className="inline-flex h-8 items-center border border-blue-300 bg-blue-50 px-2 text-[10px] font-black uppercase tracking-[0.12em] text-blue-700">
                    Ranking
                  </span>
                ) : null}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3 text-[12px] font-black uppercase tracking-[0.12em] text-zinc-600">
                <span className="inline-flex items-center gap-2">
                  <Shield size={14} className="text-amber-500" />
                  {equipeAtual?.tag || equipeAtual?.nome || 'Sem equipe'}
                </span>
                <span className="h-4 w-px bg-zinc-300" />
                <span className="inline-flex items-center gap-2">
                  <MapPin size={14} className="text-emerald-600" />
                  {atleta.servidor || 'Brasil'}
                </span>
                <span className="h-4 w-px bg-zinc-300" />
                <span className="inline-flex items-center gap-2">
                  {getRoleIcon(atleta.funcao || null)}
                  {atleta.funcao || 'Sem função'}
                </span>
              </div>

              <div className="mt-7 grid gap-3 md:grid-cols-3">
                <InfoCard
                  label="UID"
                  value={atleta.uid_jogo || 'N/I'}
                  icon={
                    <button type="button" onClick={copiarUid} className="hover:text-[#2563eb]">
                      {copiado ? <Check size={15} /> : <Copy size={15} />}
                    </button>
                  }
                />
                <InfoCard label="Plataforma" value={getPlatformLabel(atleta.plataforma)} icon={getPlatformIcon(atleta.plataforma)} />
                <InfoCard label="Função" value={atleta.funcao || 'N/I'} icon={getRoleIcon(atleta.funcao || null)} />
              </div>

              <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-6">
                <StatMini label="Score total" value={formatScore(scoreTotal)} />
                <StatMini label="Posição geral" value={posicao ? `${posicao}º` : '-'} />
                <StatMini label="Top percentual" value={`${topPercentual.toFixed(2)}%`} />
                <StatMini label="Campeonatos" value={ranking?.campeonatos_jogados || 0} />
                <StatMini label="Partidas" value={partidas} />
                <StatMini label="Abates" value={abates} helper={`Média ${mediaAbates.toFixed(2)}`} />
              </div>
            </div>
          </div>
        </section>

        <section className="mt-4 grid border border-zinc-200 bg-white md:grid-cols-5">
          <TabButton ativo icon={<Trophy size={15} />} label="Visão geral" />
          <TabButton icon={<BarChart3 size={15} />} label="Estatísticas" />
          <TabButton icon={<History size={15} />} label="Histórico" />
          <TabButton icon={<Users size={15} />} label="Equipes" />
          <TabButton icon={<Star size={15} />} label="Conquistas" />
        </section>

        <section className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr_1.15fr]">
          <div className="border border-zinc-200 bg-white p-5">
            <div className="text-[13px] font-black uppercase tracking-[0.14em] text-[#142340]">Sobre o jogador</div>
            <p className="mt-4 min-h-[72px] text-[13px] font-medium leading-6 text-zinc-600">
              Perfil competitivo LEALT. O histórico oficial é calculado apenas quando o jogador possui perfil de jogo vinculado à súmula.
            </p>

            <div className="mt-5 grid grid-cols-2 gap-2 border-t border-zinc-200 pt-4">
              <div className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.12em] text-zinc-500">
                <MapPin size={14} />
                {atleta.servidor || 'Brasil'}
              </div>
              <div className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.12em] text-zinc-500">
                <CalendarDays size={14} />
                Desde {desde}
              </div>
            </div>

            <div className="mt-5">
              <div className="mb-2 text-[11px] font-black uppercase tracking-[0.18em] text-zinc-500">Torcida do jogador</div>
              <SocialActions alvoTipo="perfil_jogo" alvoId={atleta.id} compacto />
            </div>
          </div>

          <div className="border border-zinc-200 bg-white p-5">
            <div className="text-[13px] font-black uppercase tracking-[0.14em] text-[#142340]">Atributos LEALT</div>

            <div className="mt-5 space-y-4">
              {[
                ['Skill', ranking?.score_skill || 0],
                ['Competitivo', ranking?.score_competitivo || 0],
                ['Equipe', ranking?.score_equipe || 0],
                ['Perfil', ranking?.score_perfil || 0],
                ['Social', ranking?.score_social || 0],
              ].map(([label, value]) => {
                const n = Number(value || 0)
                const max = Math.max(100, scoreTotal || 100)
                const width = Math.max(4, Math.min(100, (n / max) * 100))

                return (
                  <div key={String(label)}>
                    <div className="mb-1 flex items-center justify-between text-[11px] font-black uppercase tracking-[0.14em]">
                      <span className="text-zinc-500">{label}</span>
                      <span className="text-[#142340]">{formatScore(n)}</span>
                    </div>
                    <div className="h-2 bg-zinc-100">
                      <div className="h-full bg-amber-400" style={{ width: `${width}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="border border-zinc-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <div className="text-[13px] font-black uppercase tracking-[0.14em] text-[#142340]">Desempenho recente</div>
              <span className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-400">Resumo</span>
            </div>

            <div className="mt-5 space-y-3">
              {[
                ['Score total', formatScore(scoreTotal), 'Ranking oficial'],
                ['Abates registrados', abates, `${partidas} partidas`],
                ['Média de abates', mediaAbates.toFixed(2), 'Por partida'],
                ['Tier atual', tier || 'E', posicao ? `#${posicao} geral` : 'Sem posição'],
              ].map(([label, value, helper]) => (
                <div key={label} className="grid grid-cols-[40px_1fr_90px] items-center gap-3 border border-zinc-200 bg-zinc-50 p-3">
                  <div className="flex h-9 w-9 items-center justify-center border border-amber-200 bg-amber-50 text-amber-600">
                    <Trophy size={16} />
                  </div>
                  <div>
                    <div className="text-[12px] font-black uppercase text-[#142340]">{label}</div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">{helper}</div>
                  </div>
                  <div className="text-right text-[18px] font-black text-[#142340]">{value}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {ehMeuPerfil ? (
          <section className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="border border-zinc-200 bg-white p-5">
              <div className="text-[13px] font-black uppercase tracking-[0.14em] text-[#142340]">Convites pendentes</div>
              <div className="mt-4 space-y-2">
                {convitesRecebidos.length === 0 ? (
                  <div className="border border-zinc-200 bg-zinc-50 p-3 text-[11px] font-black uppercase tracking-[0.14em] text-zinc-500">
                    Nenhum convite pendente.
                  </div>
                ) : (
                  convitesRecebidos.map((convite) => (
                    <div key={convite.id} className="flex items-center gap-3 border border-zinc-200 bg-zinc-50 p-3">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13px] font-black uppercase">{convite.equipe?.nome || 'Equipe'}</div>
                        <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">{formatarData(convite.created_at)}</div>
                      </div>
                      <button
                        onClick={() => responderConvite(convite.id, 'aceito')}
                        disabled={processandoId === convite.id}
                        className="h-8 border border-emerald-300 bg-emerald-50 px-3 text-[10px] font-black uppercase text-emerald-700"
                      >
                        <Check size={13} />
                      </button>
                      <button
                        onClick={() => responderConvite(convite.id, 'recusado')}
                        disabled={processandoId === convite.id}
                        className="h-8 border border-red-300 bg-red-50 px-3 text-[10px] font-black uppercase text-red-700"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="border border-zinc-200 bg-white p-5">
              <div className="text-[13px] font-black uppercase tracking-[0.14em] text-[#142340]">Solicitar entrada em equipe</div>
              <div className="mt-4 grid gap-2">
                <input
                  value={buscaEquipe}
                  onChange={(e) => setBuscaEquipe(e.target.value)}
                  placeholder="Buscar equipe"
                  className="h-10 border border-zinc-200 bg-white px-3 text-[12px] font-bold uppercase outline-none focus:border-[#2563eb]"
                />
                <input
                  value={mensagemPedido}
                  onChange={(e) => setMensagemPedido(e.target.value)}
                  placeholder="Mensagem opcional"
                  className="h-10 border border-zinc-200 bg-white px-3 text-[12px] font-bold uppercase outline-none focus:border-[#2563eb]"
                />

                <div className="space-y-2">
                  {carregandoBusca ? (
                    <div className="border border-zinc-200 bg-zinc-50 p-3 text-[11px] font-black uppercase tracking-[0.14em] text-zinc-500">
                      Buscando equipes...
                    </div>
                  ) : (
                    equipesBusca.map((equipe) => (
                      <button
                        key={equipe.id}
                        onClick={() => enviarPedido(equipe.id)}
                        disabled={enviandoPedido === equipe.id}
                        className="flex w-full items-center justify-between border border-zinc-200 bg-zinc-50 p-3 text-left hover:bg-white"
                      >
                        <span className="text-[12px] font-black uppercase">{equipe.nome}</span>
                        <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#2563eb]">
                          <Send size={12} />
                          Solicitar
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
          </section>
        ) : null}

        <section className="mt-4 border border-amber-200 bg-white p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center border border-amber-300 bg-amber-50 text-amber-600">
                <Trophy size={22} />
              </div>
              <div>
                <div className="text-[15px] font-black uppercase tracking-[0.08em] text-[#142340]">Veja o ranking completo de jogadores</div>
                <div className="text-[12px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Confira os melhores jogadores da temporada atual.</div>
              </div>
            </div>
            <Link
              href="/ranking?tab=jogadores"
              className="inline-flex h-10 items-center justify-center border border-amber-300 bg-amber-400 px-5 text-[11px] font-black uppercase tracking-[0.14em] text-amber-950 transition hover:bg-amber-300"
            >
              Ver ranking geral
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}
