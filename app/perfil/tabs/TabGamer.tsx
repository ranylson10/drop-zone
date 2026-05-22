'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import PlayerCard from '@/app/components/PlayerCard'
import PlayerCardExpanded from '@/app/components/PlayerCardExpanded'
import ServidorSelect from '@/app/components/ServidorSelect'
import { supabase } from '@/lib/supabase'
import {
  Gamepad2,
  Plus,
  Pencil,
  Trash2,
  LogOut,
  Smartphone,
  Monitor,
  Users,
  Loader2,
  Bell,
  Send,
  AlertCircle,
  Check,
  X,
  Trophy,
  BarChart3,
  History,
  Star,
  Copy,
  MapPin,
  CalendarDays,
  Shield,
  Crosshair,
  Zap,
  Upload,
  Move,
  RotateCcw,
} from 'lucide-react'

type EquipeResumo = {
  id: string
  nome: string | null
  tag: string | null
  logo_url: string | null
}

type LineResumo = {
  id: string
  equipe_id: string | null
  nome: string | null
  tipo: string | null
  ativa: boolean | null
}

type VinculoLineJogador = {
  id: string
  line_id: string | null
  perfil_jogo_id: string | null
  tipo_slot: string | null
  ordem: number | null
  line?: LineResumo | null
  equipe?: EquipeResumo | null
}

type AgendaJogador = {
  id: string
  titulo: string | null
  descricao: string | null
  data_evento: string | null
  dia_semana: string | null
  horario: string | null
  status: string | null
  campeonato_id: string | null
  grupo_id: string | null
  fase_id: string | null
  partida_id: string | null
  tipo_evento: string | null
  bloqueia_escalacao_ate: string | null
  bloqueia_alteracao_equipe_ate: string | null
  campeonato_nome?: string | null
  grupo_nome?: string | null
}

type PerfilJogo = {
  id: string
  nick: string | null
  uid_jogo: string | null
  servidor: string | null
  funcao: string | null
  plataforma: 'mobile' | 'emulador' | null
  foto_capa: string | null
  equipe_id: string | null
  user_id: string | null
  ativo?: boolean | null
  created_at?: string | null
  updated_at?: string | null
  equipes?: EquipeResumo | EquipeResumo[] | null
  line_atual?: LineResumo | null
  vinculo_line?: VinculoLineJogador | null
}

type ConviteEquipe = {
  id?: string
  tipo?: string | null
  tipo_convite?: string | null
  origem?: string | null
  status?: string | null
  situacao?: string | null
  mensagem?: string | null
  created_at?: string | null
  equipe_id?: string | null
  perfil_jogo_id?: string | null
  perfil_id?: string | null
  convidado_perfil_jogo_id?: string | null
  perfil_jogo_destino_id?: string | null
  para_perfil_jogo_id?: string | null
  solicitante_perfil_jogo_id?: string | null
  de_perfil_jogo_id?: string | null
  perfil_solicitante_id?: string | null
  jogador_perfil_jogo_id?: string | null
  equipe?: EquipeResumo | EquipeResumo[] | null
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
}

type IndicadoresPerfil = {
  convitesRecebidos: number
  pedidosEnviados: number
  equipeVinculada: boolean
  pendencias: number
}

type FormEdicao = {
  nick: string
  uid_jogo: string
  servidor: string
  funcao: string
  plataforma: 'mobile' | 'emulador'
  foto_capa: string
}

type AbaPerfilJogo = 'visao' | 'estatisticas' | 'agenda' | 'historico' | 'equipes' | 'conquistas'

function normalizarEquipe(equipe: PerfilJogo['equipes'] | ConviteEquipe['equipe']) {
  if (!equipe) return null
  return Array.isArray(equipe) ? equipe[0] || null : equipe
}

function valorNormalizado(valor: unknown) {
  return String(valor || '').trim().toLowerCase()
}

function normalizarServidorSelect(valor: unknown) {
  const texto = String(valor || '').trim().toUpperCase()
  const mapa: Record<string, string> = {
    BRASIL: 'BR',
    BRAZIL: 'BR',
    LATAM: 'LATAM',
    'AMÉRICA DO NORTE': 'NA',
    'AMERICA DO NORTE': 'NA',
    'ESTADOS UNIDOS': 'US',
    'AMÉRICA DO SUL': 'SAC',
    'AMERICA DO SUL': 'SAC',
    EUROPA: 'EU',
    'ORIENTE MÉDIO E ÁFRICA': 'MEA',
    'ORIENTE MEDIO E AFRICA': 'MEA',
    ÍNDIA: 'IND',
    INDIA: 'IND',
    PAQUISTÃO: 'PK',
    PAQUISTAO: 'PK',
    BANGLADESH: 'BD',
    TAILÂNDIA: 'TH',
    TAILANDIA: 'TH',
    VIETNÃ: 'VN',
    VIETNA: 'VN',
    INDONÉSIA: 'ID',
    INDONESIA: 'ID',
    TAIWAN: 'TW',
    SINGAPURA: 'SG',
    'COMUNIDADE DOS ESTADOS INDEPENDENTES': 'CIS',
  }
  return mapa[texto] || texto || 'BR'
}

function servidorLabel(valor: unknown) {
  const codigo = normalizarServidorSelect(valor)
  const nomes: Record<string, string> = {
    BR: 'Brasil',
    LATAM: 'Latam',
    NA: 'América do Norte',
    US: 'Estados Unidos',
    SAC: 'América do Sul',
    EU: 'Europa',
    MEA: 'Oriente Médio e África',
    IND: 'Índia',
    PK: 'Paquistão',
    BD: 'Bangladesh',
    TH: 'Tailândia',
    VN: 'Vietnã',
    ID: 'Indonésia',
    TW: 'Taiwan',
    SG: 'Singapura',
    CIS: 'Comunidade dos Estados Independentes',
  }
  return nomes[codigo] || String(valor || 'Brasil')
}

function conviteTemPerfil(convite: ConviteEquipe, perfilId: string) {
  const id = String(perfilId || '').trim()
  if (!id) return false

  return [
    convite.perfil_jogo_id,
    convite.perfil_id,
    convite.convidado_perfil_jogo_id,
    convite.perfil_jogo_destino_id,
    convite.para_perfil_jogo_id,
    convite.solicitante_perfil_jogo_id,
    convite.de_perfil_jogo_id,
    convite.jogador_perfil_jogo_id,
  ].some((valor) => String(valor || '').trim() === id)
}

function ehDestinoDoConvite(convite: ConviteEquipe, perfilId: string) {
  const id = String(perfilId || '').trim()

  return [
    convite.convidado_perfil_jogo_id,
    convite.perfil_jogo_destino_id,
    convite.para_perfil_jogo_id,
    convite.jogador_perfil_jogo_id,
    convite.perfil_jogo_id,
  ].some((valor) => String(valor || '').trim() === id)
}

function ehOrigemDoPedido(convite: ConviteEquipe, perfilId: string) {
  const id = String(perfilId || '').trim()

  return [
    convite.solicitante_perfil_jogo_id,
    convite.de_perfil_jogo_id,
    convite.perfil_solicitante_id,
  ].some((valor) => String(valor || '').trim() === id)
}

function statusPendente(convite: ConviteEquipe) {
  const status = valorNormalizado(convite.status || convite.situacao)
  return !status || ['pendente', 'enviado', 'aguardando', 'aberto', 'solicitado'].includes(status)
}

function obterIndicadoresPerfil(perfil: PerfilJogo, convites: ConviteEquipe[]): IndicadoresPerfil {
  const relacionados = convites.filter((convite) => conviteTemPerfil(convite, perfil.id))
  const pendentes = relacionados.filter(statusPendente)

  const convitesRecebidos = pendentes.filter((convite) => {
    const tipo = valorNormalizado(convite.tipo || convite.tipo_convite || convite.origem)
    if (tipo.includes('pedido') || tipo.includes('solicit')) return false
    return ehDestinoDoConvite(convite, perfil.id)
  }).length

  const pedidosEnviados = pendentes.filter((convite) => {
    const tipo = valorNormalizado(convite.tipo || convite.tipo_convite || convite.origem)
    if (tipo.includes('convite')) return false
    return ehOrigemDoPedido(convite, perfil.id) || tipo.includes('pedido') || tipo.includes('solicit')
  }).length

  return {
    convitesRecebidos,
    pedidosEnviados,
    equipeVinculada: Boolean(perfil.equipe_id || normalizarEquipe(perfil.equipes)?.id),
    pendencias: convitesRecebidos + pedidosEnviados,
  }
}

function getPlatformIcon(plataforma: string | null) {
  if (plataforma === 'mobile') return <Smartphone size={13} className="text-[#2563eb]" />
  if (plataforma === 'emulador') return <Monitor size={13} className="text-[#2563eb]" />
  return <Gamepad2 size={13} className="text-[#2563eb]" />
}

function getPlatformLabel(plataforma: string | null) {
  if (plataforma === 'mobile') return 'Mobile'
  if (plataforma === 'emulador') return 'Emulador'
  return 'N/I'
}

function getRoleIcon(role: string | null) {
  switch ((role || '').toLowerCase()) {
    case 'sniper':
      return <Crosshair size={14} />
    case 'suporte':
      return <Shield size={14} />
    case 'granadeiro':
      return <Zap size={14} />
    default:
      return <Users size={14} />
  }
}

function formatScore(value: unknown) {
  const n = Number(value || 0)
  return n.toLocaleString('pt-BR', { maximumFractionDigits: 1 })
}

function formatarData(data?: string | null) {
  if (!data) return 'N/I'
  const d = new Date(data)
  if (Number.isNaN(d.getTime())) return 'N/I'
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(d)
}

function formatarHorario(horario?: string | null) {
  if (!horario) return 'Horário N/I'
  return String(horario).slice(0, 5)
}

async function rpcFallback(nameList: string[], payload: Record<string, unknown>) {
  let lastError: unknown = null
  for (const fn of nameList) {
    const { error } = await supabase.rpc(fn, payload)
    if (!error) return
    lastError = error
  }
  throw lastError
}

function MiniCard({ label, value, helper }: { label: string; value: string | number; helper?: string }) {
  return (
    <div className="min-w-0 border border-zinc-200 bg-white p-3 md:p-4">
      <div className="truncate text-[9px] font-semibold uppercase tracking-[0.12em] text-zinc-500">{label}</div>
      <div className="mt-2 break-words text-[15px] font-semibold leading-tight text-[#142340] md:text-[18px]">{value}</div>
      {helper ? <div className="mt-1 truncate text-[9px] font-medium uppercase text-zinc-400">{helper}</div> : null}
    </div>
  )
}

export default function TabGamer() {
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [leavingId, setLeavingId] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [processandoConviteId, setProcessandoConviteId] = useState<string | null>(null)
  const [enviandoPedido, setEnviandoPedido] = useState<string | null>(null)
  const [perfilAberto, setPerfilAberto] = useState<PerfilJogo | null>(null)
  const [abaPerfilJogo, setAbaPerfilJogo] = useState<AbaPerfilJogo>('visao')
  const [perfis, setPerfis] = useState<PerfilJogo[]>([])
  const [convitesEquipe, setConvitesEquipe] = useState<ConviteEquipe[]>([])
  const [rankingAberto, setRankingAberto] = useState<RankingJogador | null>(null)
  const [agendaPerfil, setAgendaPerfil] = useState<AgendaJogador[]>([])
  const [loadingRanking, setLoadingRanking] = useState(false)
  const [loadingAgenda, setLoadingAgenda] = useState(false)
  const [editando, setEditando] = useState(false)
  const [formEdicao, setFormEdicao] = useState<FormEdicao>({
    nick: '',
    uid_jogo: '',
    servidor: 'BR',
    funcao: '',
    plataforma: 'mobile',
    foto_capa: '',
  })
  const [fotoArquivo, setFotoArquivo] = useState<File | null>(null)
  const [fotoPreview, setFotoPreview] = useState<string>('')
  const [fotoZoom, setFotoZoom] = useState(1)
  const [fotoPosX, setFotoPosX] = useState(50)
  const [fotoPosY, setFotoPosY] = useState(50)
  const [enviandoFoto, setEnviandoFoto] = useState(false)
  const [buscaEquipe, setBuscaEquipe] = useState('')
  const [mensagemPedido, setMensagemPedido] = useState('')
  const [equipesBusca, setEquipesBusca] = useState<EquipeResumo[]>([])
  const [carregandoBusca, setCarregandoBusca] = useState(false)
  const [copiado, setCopiado] = useState(false)

  const carregarDadosEquipeReal = useCallback(async (perfisCarregados: PerfilJogo[]) => {
    if (!perfisCarregados.length) return perfisCarregados

    const perfilIds = perfisCarregados.map((perfil) => perfil.id).filter(Boolean)
    if (!perfilIds.length) return perfisCarregados

    try {
      const { data: vinculosRaw, error: vinculosError } = await supabase
        .from('lines_jogadores')
        .select('id, line_id, perfil_jogo_id, tipo_slot, ordem')
        .in('perfil_jogo_id', perfilIds)
        .order('created_at', { ascending: false })

      if (vinculosError) throw vinculosError

      const vinculos = (vinculosRaw || []) as VinculoLineJogador[]
      const lineIds = Array.from(new Set(vinculos.map((v) => v.line_id).filter(Boolean))) as string[]
      if (!lineIds.length) return perfisCarregados

      const { data: linesRaw, error: linesError } = await supabase
        .from('equipes_lines')
        .select('id, equipe_id, nome, tipo, ativa')
        .in('id', lineIds)

      if (linesError) throw linesError

      const lines = (linesRaw || []) as LineResumo[]
      const lineMap = new Map(lines.map((line) => [line.id, line]))
      const equipeIds = Array.from(new Set(lines.map((line) => line.equipe_id).filter(Boolean))) as string[]

      let equipeMap = new Map<string, EquipeResumo>()
      if (equipeIds.length) {
        const { data: equipesRaw, error: equipesError } = await supabase
          .from('equipes')
          .select('id, nome, tag, logo_url')
          .in('id', equipeIds)

        if (equipesError) throw equipesError
        equipeMap = new Map(((equipesRaw || []) as EquipeResumo[]).map((equipe) => [equipe.id, equipe]))
      }

      const vinculoPorPerfil = new Map<string, VinculoLineJogador>()
      for (const vinculo of vinculos) {
        if (!vinculo.perfil_jogo_id || vinculoPorPerfil.has(vinculo.perfil_jogo_id)) continue
        const line = vinculo.line_id ? lineMap.get(vinculo.line_id) || null : null
        const equipe = line?.equipe_id ? equipeMap.get(line.equipe_id) || null : null
        vinculoPorPerfil.set(vinculo.perfil_jogo_id, { ...vinculo, line, equipe })
      }

      return perfisCarregados.map((perfil) => {
        const vinculo = vinculoPorPerfil.get(perfil.id) || null
        const equipeReal = vinculo?.equipe || normalizarEquipe(perfil.equipes)
        return {
          ...perfil,
          equipe_id: equipeReal?.id || perfil.equipe_id || null,
          equipes: equipeReal || perfil.equipes || null,
          line_atual: vinculo?.line || null,
          vinculo_line: vinculo,
        }
      })
    } catch (error) {
      console.warn('Não foi possível carregar vínculo real de equipe/line:', error)
      return perfisCarregados
    }
  }, [])

  const carregarConvitesEquipe = useCallback(async (perfisCarregados: PerfilJogo[]) => {
    try {
      if (!perfisCarregados.length) {
        setConvitesEquipe([])
        return
      }

      const { data, error } = await supabase
        .from('convites_equipe')
        .select(`
          *,
          equipe:equipe_id (
            id,
            nome,
            tag,
            logo_url
          )
        `)
        .limit(500)

      if (error) {
        console.warn('Não foi possível carregar convites de equipe:', error)
        setConvitesEquipe([])
        return
      }

      const perfilIds = new Set(perfisCarregados.map((perfil) => perfil.id))
      const filtrados = (data || []).filter((convite: ConviteEquipe) =>
        Array.from(perfilIds).some((perfilId) => conviteTemPerfil(convite, perfilId))
      )

      setConvitesEquipe(filtrados)
    } catch (error) {
      console.warn('Erro ao carregar convites de equipe:', error)
      setConvitesEquipe([])
    }
  }, [])

  const carregarPerfis = useCallback(async () => {
    try {
      setLoading(true)

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()

      if (sessionError) throw sessionError

      const userId = session?.user?.id
      if (!userId) {
        setPerfis([])
        setConvitesEquipe([])
        return
      }

      const { data, error } = await supabase
        .from('perfis_jogo')
        .select(`
          id,
          nick,
          uid_jogo,
          servidor,
          funcao,
          plataforma,
          foto_capa,
          equipe_id,
          user_id,
          ativo,
          created_at,
          updated_at,
          equipes:equipe_id (
            id,
            nome,
            tag,
            logo_url
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: true })

      if (error) throw error

      const perfisCarregadosBase = (data || []) as PerfilJogo[]
      const perfisCarregados = await carregarDadosEquipeReal(perfisCarregadosBase)
      setPerfis(perfisCarregados)
      await carregarConvitesEquipe(perfisCarregados)
    } catch (error) {
      console.error('Erro ao carregar perfis gamer:', error)
      setPerfis([])
      setConvitesEquipe([])
    } finally {
      setLoading(false)
    }
  }, [carregarConvitesEquipe, carregarDadosEquipeReal])

  useEffect(() => {
    carregarPerfis()
  }, [carregarPerfis])

  useEffect(() => {
    return () => {
      if (fotoPreview && fotoPreview.startsWith('blob:')) URL.revokeObjectURL(fotoPreview)
    }
  }, [fotoPreview])

  const carregarRanking = useCallback(async (perfilId: string) => {
    try {
      setLoadingRanking(true)
      const { data, error } = await supabase
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
          media_abates
        `)
        .eq('perfil_jogo_id', perfilId)
        .maybeSingle()

      if (error) {
        console.warn('Ranking não carregado:', error)
        setRankingAberto(null)
        return
      }

      setRankingAberto((data as RankingJogador | null) || null)
    } finally {
      setLoadingRanking(false)
    }
  }, [])

  const carregarAgendaJogador = useCallback(async (perfilId: string) => {
    try {
      setLoadingAgenda(true)
      setAgendaPerfil([])

      const { data: vinculosCampeonatoRaw, error: vinculosCampeonatoError } = await supabase
        .from('jogadores_campeonato')
        .select('campeonato_id, equipe_id, campeonato_equipe_id, status')
        .eq('perfil_jogo_id', perfilId)
        .in('status', ['ativo', 'aprovado', 'confirmado', 'inscrito', 'escalado'])

      if (vinculosCampeonatoError) throw vinculosCampeonatoError

      const campeonatoIds = Array.from(new Set((vinculosCampeonatoRaw || []).map((item: any) => item.campeonato_id).filter(Boolean))) as string[]
      if (!campeonatoIds.length) return

      const hoje = new Date()
      hoje.setHours(0, 0, 0, 0)
      const hojeIso = hoje.toISOString().slice(0, 10)

      const { data: eventosRaw, error: eventosError } = await supabase
        .from('agenda_eventos')
        .select('id, titulo, descricao, data_evento, dia_semana, horario, status, campeonato_id, grupo_id, fase_id, partida_id, tipo_evento, bloqueia_escalacao_ate, bloqueia_alteracao_equipe_ate')
        .in('campeonato_id', campeonatoIds)
        .gte('data_evento', hojeIso)
        .eq('status', 'ativo')
        .order('data_evento', { ascending: true })
        .order('horario', { ascending: true })
        .limit(20)

      if (eventosError) throw eventosError

      const eventos = (eventosRaw || []) as AgendaJogador[]
      const grupoIds = Array.from(new Set(eventos.map((evento) => evento.grupo_id).filter(Boolean))) as string[]

      const { data: campeonatosRaw } = await supabase
        .from('campeonatos')
        .select('id, nome')
        .in('id', campeonatoIds)

      const campeonatoMap = new Map(((campeonatosRaw || []) as { id: string; nome: string | null }[]).map((item) => [item.id, item.nome]))

      let grupoMap = new Map<string, string | null>()
      if (grupoIds.length) {
        const { data: gruposRaw } = await supabase
          .from('campeonato_grupos')
          .select('id, nome')
          .in('id', grupoIds)
        grupoMap = new Map(((gruposRaw || []) as { id: string; nome: string | null }[]).map((item) => [item.id, item.nome]))
      }

      setAgendaPerfil(eventos.map((evento) => ({
        ...evento,
        campeonato_nome: evento.campeonato_id ? campeonatoMap.get(evento.campeonato_id) || null : null,
        grupo_nome: evento.grupo_id ? grupoMap.get(evento.grupo_id) || null : null,
      })))
    } catch (error) {
      console.warn('Agenda do jogador não carregada:', error)
      setAgendaPerfil([])
    } finally {
      setLoadingAgenda(false)
    }
  }, [])

  function abrirPerfil(perfil: PerfilJogo) {
    setPerfilAberto(perfil)
    setAbaPerfilJogo('visao')
    setEditando(false)
    setBuscaEquipe('')
    setMensagemPedido('')
    setEquipesBusca([])
    setCopiado(false)
    setFormEdicao({
      nick: perfil.nick || '',
      uid_jogo: perfil.uid_jogo || '',
      servidor: normalizarServidorSelect(perfil.servidor),
      funcao: perfil.funcao || '',
      plataforma: perfil.plataforma || 'mobile',
      foto_capa: perfil.foto_capa || '',
    })
    setFotoArquivo(null)
    setFotoPreview(perfil.foto_capa || '')
    setFotoZoom(1)
    setFotoPosX(50)
    setFotoPosY(50)
    void carregarRanking(perfil.id)
    void carregarAgendaJogador(perfil.id)
  }

  function fecharPerfil() {
    setPerfilAberto(null)
    setAbaPerfilJogo('visao')
    setEditando(false)
    setRankingAberto(null)
    setAgendaPerfil([])
  }

  function selecionarFotoPerfil(file: File | null) {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      alert('Envie um arquivo de imagem válido.')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('A foto precisa ter no máximo 5MB.')
      return
    }

    if (fotoPreview && fotoPreview.startsWith('blob:')) URL.revokeObjectURL(fotoPreview)
    setFotoArquivo(file)
    setFotoPreview(URL.createObjectURL(file))
    setFotoZoom(1)
    setFotoPosX(50)
    setFotoPosY(50)
  }

  function carregarImagem(src: string) {
    return new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = src
    })
  }

  function canvasToBlob(canvas: HTMLCanvasElement) {
    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Não foi possível preparar a foto.'))
      }, 'image/png')
    })
  }

  async function uploadFotoPerfilEditada() {
    if (!perfilAberto) return formEdicao.foto_capa.trim() || null
    if (!fotoArquivo || !fotoPreview) return formEdicao.foto_capa.trim() || null

    setEnviandoFoto(true)
    try {
      const img = await carregarImagem(fotoPreview)
      const tamanho = 900
      const canvas = document.createElement('canvas')
      canvas.width = tamanho
      canvas.height = tamanho
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Não foi possível editar a foto no navegador.')

      ctx.clearRect(0, 0, tamanho, tamanho)

      const baseScale = Math.max(tamanho / img.width, tamanho / img.height)
      const scale = baseScale * fotoZoom
      const drawWidth = img.width * scale
      const drawHeight = img.height * scale
      const maxOffsetX = Math.max(0, drawWidth - tamanho)
      const maxOffsetY = Math.max(0, drawHeight - tamanho)
      const offsetX = -maxOffsetX * (fotoPosX / 100)
      const offsetY = -maxOffsetY * (fotoPosY / 100)

      ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight)

      const blob = await canvasToBlob(canvas)
      const pastaUsuario = perfilAberto.user_id || 'sem-usuario'
      const caminho = `perfis-jogo/${pastaUsuario}/${perfilAberto.id}-${Date.now()}.png`
      const { error: uploadError } = await supabase.storage.from('avatars').upload(caminho, blob, {
        contentType: 'image/png',
        upsert: true,
      })

      if (uploadError) throw uploadError

      const { data } = supabase.storage.from('avatars').getPublicUrl(caminho)
      return data.publicUrl
    } finally {
      setEnviandoFoto(false)
    }
  }

  async function salvarPerfil() {
    if (!perfilAberto) return

    try {
      setSavingId(perfilAberto.id)
      const fotoUrl = await uploadFotoPerfilEditada()
      const { data, error } = await supabase
        .from('perfis_jogo')
        .update({
          nick: formEdicao.nick.trim(),
          uid_jogo: formEdicao.uid_jogo.trim() || null,
          servidor: normalizarServidorSelect(formEdicao.servidor) || null,
          funcao: formEdicao.funcao.trim() || null,
          plataforma: formEdicao.plataforma,
          foto_capa: fotoUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', perfilAberto.id)
        .select(`
          id,
          nick,
          uid_jogo,
          servidor,
          funcao,
          plataforma,
          foto_capa,
          equipe_id,
          user_id,
          ativo,
          created_at,
          updated_at,
          equipes:equipe_id (
            id,
            nome,
            tag,
            logo_url
          )
        `)
        .maybeSingle()

      if (error) throw error

      const atualizado = (data as PerfilJogo | null) || { ...perfilAberto, ...formEdicao, foto_capa: fotoUrl }
      setPerfilAberto(atualizado)
      setPerfis((atuais) => atuais.map((perfil) => (perfil.id === perfilAberto.id ? atualizado : perfil)))
      setEditando(false)
    } catch (error: unknown) {
      console.error('Erro ao editar perfil:', error)
      alert(error instanceof Error ? error.message : 'Erro ao editar perfil gamer')
    } finally {
      setSavingId(null)
    }
  }

  async function excluirPerfil(perfilId: string) {
    const confirmou = confirm('Excluir este perfil gamer?')
    if (!confirmou) return

    try {
      setDeletingId(perfilId)
      const { error } = await supabase.from('perfis_jogo').delete().eq('id', perfilId)
      if (error) throw error
      fecharPerfil()
      await carregarPerfis()
    } catch (error: unknown) {
      console.error('Erro ao excluir perfil:', error)
      alert(error instanceof Error ? error.message : 'Erro ao excluir perfil')
    } finally {
      setDeletingId(null)
    }
  }

  async function sairDaEquipe(perfilId: string) {
    const confirmou = confirm('Deseja sair da equipe com este perfil gamer?')
    if (!confirmou) return

    try {
      setLeavingId(perfilId)
      const { error } = await supabase.rpc('sair_da_equipe', {
        p_perfil_jogo_id: perfilId,
      })

      if (error) throw error
      await carregarPerfis()
      const atualizado = perfis.find((perfil) => perfil.id === perfilId)
      if (atualizado) setPerfilAberto({ ...atualizado, equipe_id: null, equipes: null })
    } catch (error: unknown) {
      console.error('Erro ao sair da equipe:', error)
      alert(error instanceof Error ? error.message : 'Erro ao sair da equipe')
    } finally {
      setLeavingId(null)
    }
  }

  async function responderConvite(conviteId: string, acao: 'aceito' | 'recusado') {
    try {
      setProcessandoConviteId(conviteId)

      if (acao === 'aceito') {
        await rpcFallback(['aceitar_convite_equipe_v2', 'aceitar_convite_equipe'], {
          p_convite_id: conviteId,
        })
      } else {
        await rpcFallback(['recusar_convite_equipe_v2', 'recusar_convite_equipe'], {
          p_convite_id: conviteId,
        })
      }

      await carregarPerfis()
      alert(acao === 'aceito' ? 'Convite aceito com sucesso.' : 'Convite recusado.')
    } catch (error: any) {
      console.error('Erro ao responder convite:', error)
      alert(error?.message || 'Não foi possível responder o convite.')
    } finally {
      setProcessandoConviteId(null)
    }
  }

  async function enviarPedido(equipeId: string) {
    if (!perfilAberto) return

    const mensagem = mensagemPedido.trim() || null
    const pedidoExistente = pedidoPendentePorEquipe.get(equipeId)

    try {
      setEnviandoPedido(equipeId)

      if (pedidoExistente?.id) {
        const { error } = await supabase
          .from('convites_equipe')
          .update({
            mensagem,
            updated_at: new Date().toISOString(),
          })
          .eq('id', pedidoExistente.id)

        if (error) throw error

        await carregarPerfis()
        alert('Pedido atualizado para a equipe.')
        return
      }

      await rpcFallback(['fn_solicitar_entrada_equipe', 'solicitar_entrada_equipe'], {
        p_equipe_id: equipeId,
        p_perfil_jogo_id: perfilAberto.id,
        p_mensagem: mensagem,
      })

      setBuscaEquipe('')
      setMensagemPedido('')
      setEquipesBusca([])
      await carregarPerfis()
      alert('Pedido enviado para a equipe.')
    } catch (error) {
      console.error('Erro ao enviar pedido:', error)
      alert(pedidoExistente ? 'Não foi possível atualizar o pedido.' : 'Não foi possível enviar o pedido.')
    } finally {
      setEnviandoPedido(null)
    }
  }

  useEffect(() => {
    let ignore = false

    async function buscarEquipes() {
      if (!perfilAberto || normalizarEquipe(perfilAberto.equipes)?.id || buscaEquipe.trim().length < 2) {
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
  }, [buscaEquipe, perfilAberto])

  const indicadoresPorPerfil = useMemo(() => {
    const mapa = new Map<string, IndicadoresPerfil>()
    perfis.forEach((perfil) => {
      mapa.set(perfil.id, obterIndicadoresPerfil(perfil, convitesEquipe))
    })
    return mapa
  }, [perfis, convitesEquipe])

  const perfisOrdenados = useMemo(() => {
    return [...perfis].sort((a, b) => String(a.nick || '').localeCompare(String(b.nick || ''), 'pt-BR'))
  }, [perfis])

  const podeCriarPerfil = perfis.length < 2
  const totalPerfis = perfis.length
  const totalComEquipe = perfis.filter((perfil) => normalizarEquipe(perfil.equipes)?.id).length
  const totalMobile = perfis.filter((perfil) => perfil.plataforma === 'mobile').length
  const totalEmulador = perfis.filter((perfil) => perfil.plataforma === 'emulador').length
  const totalConvites = perfis.reduce((acc, perfil) => acc + (indicadoresPorPerfil.get(perfil.id)?.convitesRecebidos || 0), 0)
  const totalPedidos = perfis.reduce((acc, perfil) => acc + (indicadoresPorPerfil.get(perfil.id)?.pedidosEnviados || 0), 0)

  const convitesDoPerfil = useMemo(() => {
    if (!perfilAberto) return []
    return convitesEquipe
      .filter((convite) => conviteTemPerfil(convite, perfilAberto.id) && statusPendente(convite))
      .filter((convite) => {
        const tipo = valorNormalizado(convite.tipo || convite.tipo_convite || convite.origem)
        if (tipo.includes('pedido') || tipo.includes('solicit')) return false
        return ehDestinoDoConvite(convite, perfilAberto.id)
      })
  }, [convitesEquipe, perfilAberto])

  const pedidosDoPerfil = useMemo(() => {
    if (!perfilAberto) return []
    return convitesEquipe
      .filter((convite) => conviteTemPerfil(convite, perfilAberto.id))
      .filter((convite) => {
        const tipo = valorNormalizado(convite.tipo || convite.tipo_convite || convite.origem)
        return tipo.includes('pedido') || tipo.includes('solicit') || ehOrigemDoPedido(convite, perfilAberto.id)
      })
  }, [convitesEquipe, perfilAberto])

  const pedidoPendentePorEquipe = useMemo(() => {
    const mapa = new Map<string, ConviteEquipe>()

    if (!perfilAberto) return mapa

    pedidosDoPerfil.forEach((pedido) => {
      const equipeId = String(pedido.equipe_id || normalizarEquipe(pedido.equipe)?.id || '').trim()
      if (!equipeId || !statusPendente(pedido)) return
      mapa.set(equipeId, pedido)
    })

    return mapa
  }, [pedidosDoPerfil, perfilAberto])

  const scoreTotal = Number(rankingAberto?.score_total || 0)
  const partidas = Number(rankingAberto?.partidas_registradas || rankingAberto?.jogos_disputados || 0)
  const abates = Number(rankingAberto?.abates || 0)
  const mediaAbates = Number(rankingAberto?.media_abates || 0)
  const tier = rankingAberto?.tier || (perfilAberto ? (indicadoresPorPerfil.get(perfilAberto.id)?.equipeVinculada ? 'B' : 'C') : 'C')

  return (
    <div className="space-y-4">
      <section className="border border-zinc-200 bg-white p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.22em] text-[#2563eb]">
              <Gamepad2 size={17} />
              Perfis gamer
            </div>
            <h1 className="text-[18px] font-semibold uppercase tracking-tight text-[#142340] md:text-[20px]">
              Contas de jogo
            </h1>
            <p className="mt-1 text-xs font-medium text-zinc-500">
              Gerencie perfis de jogo, vínculos com equipes, convites recebidos e pedidos enviados.
            </p>
          </div>

          {podeCriarPerfil ? (
            <Link
              href="/cadastro"
              className="inline-flex h-10 items-center justify-center gap-2 bg-[#2563eb] px-5 text-[11px] font-semibold uppercase tracking-[0.08em] text-white transition hover:brightness-110"
            >
              <Plus size={16} />
              Novo perfil gamer
            </Link>
          ) : (
            <div className="border border-amber-200 bg-amber-50 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-amber-700">
              Limite de 2 perfis gamer atingido
            </div>
          )}
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-6">
        <ResumoBox icon={<Gamepad2 size={14} />} label="Perfis" value={totalPerfis} helper="cadastrados" />
        <ResumoBox icon={<Users size={14} />} label="Com equipe" value={totalComEquipe} helper="vinculados" />
        <ResumoBox icon={<Smartphone size={14} />} label="Mobile" value={totalMobile} helper="ativos" />
        <ResumoBox icon={<Monitor size={14} />} label="Emulador" value={totalEmulador} helper="ativos" />
        <ResumoBox icon={<Bell size={14} />} label="Convites" value={totalConvites} helper="recebidos" />
        <ResumoBox icon={<Send size={14} />} label="Pedidos" value={totalPedidos} helper="enviados" />
      </section>

      <section className="border border-zinc-200 bg-white">
        <div className="flex flex-col gap-2 px-4 py-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[12px] font-semibold uppercase text-[#142340]">
              <Gamepad2 size={16} className="text-[#2563eb]" />
              Perfis gamer
            </div>
            <p className="mt-1 text-[11px] font-medium text-zinc-500">
              Cada usuário pode manter até 2 perfis de jogo. Toque em uma carta para abrir o perfil completo sem sair da página.
            </p>
          </div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
            {totalPerfis}/2 perfis cadastrados
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-zinc-500">
            <Loader2 size={22} className="animate-spin text-[#2563eb]" />
          </div>
        ) : perfisOrdenados.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 border-t border-zinc-200 p-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {perfisOrdenados.map((perfil, index) => {
              const indicadores = indicadoresPorPerfil.get(perfil.id) || obterIndicadoresPerfil(perfil, [])
              const equipe = normalizarEquipe(perfil.equipes)

              return (
                <article key={perfil.id} className="border border-zinc-200 bg-zinc-50 p-2 shadow-sm transition hover:border-[#2563eb] hover:bg-white">
                  <div className="mx-auto max-w-[150px] sm:max-w-[170px]">
                    <PlayerCard
                      name={perfil.nick || 'Jogador'}
                      number={index + 1}
                      photoUrl={perfil.foto_capa}
                      tier={indicadores.equipeVinculada ? 'B' : 'C'}
                      onClick={() => abrirPerfil(perfil)}
                      className="mx-auto"
                    />
                  </div>
                  <button type="button" onClick={() => abrirPerfil(perfil)} className="mt-2 w-full text-left">
                    <div className="truncate text-[13px] font-bold uppercase text-[#142340]">{perfil.nick || 'Sem nick'}</div>
                    <div className="mt-0.5 truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">UID: {perfil.uid_jogo || 'N/I'}</div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <span className="inline-flex h-7 items-center gap-1 border border-zinc-200 bg-white px-2 text-[10px] font-semibold uppercase text-zinc-600">
                        {getPlatformIcon(perfil.plataforma)} {getPlatformLabel(perfil.plataforma)}
                      </span>
                      <span className="inline-flex h-7 items-center gap-1 border border-zinc-200 bg-white px-2 text-[10px] font-semibold uppercase text-zinc-600">
                        {equipe?.tag || equipe?.nome || 'Sem equipe'}
                      </span>
                    </div>
                  </button>
                </article>
              )
            })}
          </div>
        ) : (
          <div className="border-t border-zinc-200 px-4 py-8 text-center">
            <AlertCircle size={24} className="mx-auto text-zinc-500" />
            <p className="mt-2 text-[12px] font-semibold uppercase tracking-[0.2em] text-zinc-500">Nenhum perfil gamer encontrado</p>
            {podeCriarPerfil ? (
              <Link href="/cadastro" className="mt-5 inline-flex items-center gap-2 bg-[#2563eb] px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-white">
                <Plus size={15} />
                Criar primeiro perfil
              </Link>
            ) : null}
          </div>
        )}
      </section>

      {perfilAberto ? (
        <PlayerCardExpanded
          open={Boolean(perfilAberto)}
          onClose={fecharPerfil}
          title={perfilAberto.nick || 'Jogador'}
          subtitle="Perfil de jogo"
          card={
            <PlayerCard
              name={perfilAberto.nick || 'Jogador'}
              number={rankingAberto?.posicao || 1}
              photoUrl={perfilAberto.foto_capa}
              tier={(tier || 'C') as any}
              className="mx-auto"
            />
          }
        >
            <div className="max-h-[96vh] overflow-y-auto p-3 md:max-h-none md:p-5">
              <section className="border border-zinc-200 bg-white">
                <div className="grid gap-4 bg-gradient-to-r from-amber-50 via-white to-blue-50 p-3 md:p-6">
                  <div className="hidden">
                    <button
                      type="button"
                      onClick={() => setEditando((v) => !v)}
                      className="absolute right-3 top-3 z-10 inline-flex h-9 items-center justify-center gap-2 border border-zinc-300 bg-white/95 px-3 text-[10px] font-bold uppercase tracking-[0.08em] text-[#142340] shadow-sm backdrop-blur hover:border-[#2563eb]"
                    >
                      <Pencil size={13} />
                      Editar
                    </button>
                    <div className="border border-amber-300 bg-white p-2 shadow-[0_16px_45px_rgba(15,23,42,0.12)]">
                      {perfilAberto.foto_capa ? (
                        <img
                          src={perfilAberto.foto_capa}
                          alt={perfilAberto.nick || 'Jogador'}
                          className="h-[280px] w-full object-cover md:h-[360px]"
                        />
                      ) : (
                        <div className="flex h-[280px] w-full items-center justify-center bg-zinc-100 text-6xl font-bold uppercase text-zinc-300 md:h-[360px]">
                          {(perfilAberto.nick || 'J').charAt(0)}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0">
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                          <span className="border border-amber-300 bg-white px-3 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-amber-600">
                            #{rankingAberto?.posicao || '-'}
                          </span>
                          <span className="border border-sky-300 bg-white px-3 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-sky-700">
                            Ranking geral jogadores
                          </span>
                          <span className="border border-cyan-300 bg-cyan-50 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-700">
                            Tier {tier || 'C'}
                          </span>
                        </div>
                        <h2 className="break-words text-3xl font-bold uppercase leading-none text-[#142340] md:text-5xl">{perfilAberto.nick || 'Jogador'}</h2>
                        <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] font-bold uppercase tracking-[0.1em] text-zinc-600">
                          <span className="inline-flex items-center gap-1 text-amber-600"><Shield size={14} /> {normalizarEquipe(perfilAberto.equipes)?.tag || normalizarEquipe(perfilAberto.equipes)?.nome || 'Sem equipe'}</span>
                          <span className="inline-flex items-center gap-1 text-emerald-600"><MapPin size={14} /> {servidorLabel(perfilAberto.servidor)}</span>
                          <span className="inline-flex items-center gap-1">{getRoleIcon(perfilAberto.funcao)} {perfilAberto.funcao || 'Função N/I'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 grid border border-zinc-200 bg-white sm:grid-cols-2 lg:grid-cols-6">
                      <ModalTab ativo={abaPerfilJogo === 'visao'} onClick={() => setAbaPerfilJogo('visao')} icon={<Trophy size={15} />} label="Geral" />
                      <ModalTab ativo={abaPerfilJogo === 'estatisticas'} onClick={() => setAbaPerfilJogo('estatisticas')} icon={<BarChart3 size={15} />} label="Estatísticas" />
                      <ModalTab ativo={abaPerfilJogo === 'agenda'} onClick={() => setAbaPerfilJogo('agenda')} icon={<CalendarDays size={15} />} label="Agenda" />
                      <ModalTab ativo={abaPerfilJogo === 'historico'} onClick={() => setAbaPerfilJogo('historico')} icon={<History size={15} />} label="Histórico" />
                      <ModalTab ativo={abaPerfilJogo === 'equipes'} onClick={() => setAbaPerfilJogo('equipes')} icon={<Users size={15} />} label="Equipes" />
                      <ModalTab ativo={abaPerfilJogo === 'conquistas'} onClick={() => setAbaPerfilJogo('conquistas')} icon={<Star size={15} />} label="Conquistas" />
                    </div>

                    {abaPerfilJogo === 'visao' ? (
                      <div className="mt-4 grid gap-3">
                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                          <MiniCard label="UID" value={perfilAberto.uid_jogo || 'N/I'} helper="Copiar ID" />
                          <MiniCard label="Plataforma" value={getPlatformLabel(perfilAberto.plataforma)} />
                          <MiniCard label="Função" value={perfilAberto.funcao || 'N/I'} />
                        </div>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
                          <MiniCard label="Score total" value={loadingRanking ? '...' : formatScore(scoreTotal)} />
                          <MiniCard label="Posição geral" value={rankingAberto?.posicao ? `${rankingAberto.posicao}º` : '-'} />
                          <MiniCard label="Top percentual" value={`${Number(rankingAberto?.top_percentual || 0).toFixed(2)}%`} />
                          <MiniCard label="Campeonatos" value={rankingAberto?.campeonatos_jogados || 0} />
                          <MiniCard label="Partidas" value={partidas} />
                          <MiniCard label="Abates" value={abates} helper={`Média ${mediaAbates.toFixed(2)}`} />
                        </div>
                        <div className="grid gap-3 lg:grid-cols-[1fr_1fr]">
                          <div className="border border-zinc-200 bg-white p-4">
                            <div className="text-[12px] font-bold uppercase tracking-[0.14em] text-[#142340]">Sobre o jogador</div>
                            <p className="mt-3 text-[12px] font-medium leading-5 text-zinc-600">
                              Perfil competitivo LEALT. O histórico oficial é calculado quando o jogador possui perfil de jogo vinculado à súmula.
                            </p>
                            <div className="mt-4 grid grid-cols-2 gap-2 border-t border-zinc-200 pt-3">
                              <div className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.1em] text-zinc-500"><MapPin size={13} />{servidorLabel(perfilAberto.servidor)}</div>
                              <div className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.1em] text-zinc-500"><CalendarDays size={13} />Desde {formatarData(perfilAberto.created_at)}</div>
                            </div>
                          </div>
                          <div className="border border-zinc-200 bg-white p-4">
                            <div className="flex items-center justify-between">
                              <div className="text-[12px] font-bold uppercase tracking-[0.14em] text-[#142340]">Ações rápidas</div>
                              <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-zinc-400">Dono/Admin</span>
                            </div>
                            <div className="mt-4 grid gap-2 sm:grid-cols-2">
                              <button type="button" onClick={() => setEditando((v) => !v)} className="inline-flex h-10 items-center justify-center gap-2 border border-[#2563eb] bg-blue-50 px-4 text-[11px] font-bold uppercase text-[#2563eb]">
                                <Pencil size={14} /> Editar perfil
                              </button>
                              <button type="button" onClick={() => navigator.clipboard?.writeText(perfilAberto.uid_jogo || '').then(() => setCopiado(true))} className="inline-flex h-10 items-center justify-center gap-2 border border-zinc-300 bg-white px-4 text-[11px] font-bold uppercase text-zinc-600">
                                {copiado ? <Check size={14} /> : <Copy size={14} />} {copiado ? 'UID copiado' : 'Copiar UID'}
                              </button>
                              {normalizarEquipe(perfilAberto.equipes) ? (
                                <button type="button" onClick={() => sairDaEquipe(perfilAberto.id)} disabled={leavingId === perfilAberto.id} className="inline-flex h-10 items-center justify-center gap-2 border border-yellow-300 bg-yellow-50 px-4 text-[11px] font-bold uppercase text-yellow-700 disabled:opacity-60">
                                  {leavingId === perfilAberto.id ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />} Sair da equipe
                                </button>
                              ) : null}
                              <button type="button" onClick={() => excluirPerfil(perfilAberto.id)} disabled={deletingId === perfilAberto.id} className="inline-flex h-10 items-center justify-center gap-2 border border-red-300 bg-red-50 px-4 text-[11px] font-bold uppercase text-red-600 disabled:opacity-60 sm:col-span-2">
                                {deletingId === perfilAberto.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} Excluir perfil
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {abaPerfilJogo === 'estatisticas' ? (
                      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        <MiniCard label="Score total" value={loadingRanking ? '...' : formatScore(scoreTotal)} />
                        <MiniCard label="Score skill" value={formatScore(rankingAberto?.score_skill || 0)} />
                        <MiniCard label="Competitivo" value={formatScore(rankingAberto?.score_competitivo || 0)} />
                        <MiniCard label="Score equipe" value={formatScore(rankingAberto?.score_equipe || 0)} />
                        <MiniCard label="Score perfil" value={formatScore(rankingAberto?.score_perfil || 0)} />
                        <MiniCard label="Score social" value={formatScore(rankingAberto?.score_social || 0)} />
                      </div>
                    ) : null}

                    {abaPerfilJogo === 'agenda' ? (
                      <div className="mt-4 border border-zinc-200 bg-white p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-[12px] font-bold uppercase tracking-[0.14em] text-[#142340]">Agenda do jogador</div>
                          <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-zinc-400">Baseada nos campeonatos vinculados ao perfil</span>
                        </div>
                        <div className="mt-4 grid gap-3">
                          {loadingAgenda ? (
                            <div className="flex items-center gap-2 border border-zinc-200 bg-zinc-50 p-4 text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-500">
                              <Loader2 size={14} className="animate-spin text-[#2563eb]" /> Carregando agenda real...
                            </div>
                          ) : agendaPerfil.length > 0 ? agendaPerfil.map((evento) => (
                            <div key={evento.id} className="grid gap-3 border border-zinc-200 bg-zinc-50 p-3 md:grid-cols-[120px_1fr_auto]">
                              <div className="border border-zinc-200 bg-white p-3 text-center">
                                <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500">{evento.dia_semana || 'Data'}</div>
                                <div className="mt-1 text-[15px] font-bold text-[#142340]">{formatarData(evento.data_evento)}</div>
                                <div className="text-[11px] font-bold uppercase text-[#2563eb]">{formatarHorario(evento.horario)}</div>
                              </div>
                              <div className="min-w-0">
                                <div className="truncate text-[13px] font-bold uppercase text-[#142340]">{evento.titulo || evento.campeonato_nome || 'Evento do campeonato'}</div>
                                <div className="mt-1 truncate text-[11px] font-semibold text-zinc-500">{evento.campeonato_nome || 'Campeonato'} {evento.grupo_nome ? `• ${evento.grupo_nome}` : ''}</div>
                                {evento.descricao ? <p className="mt-2 line-clamp-2 text-[11px] font-medium text-zinc-600">{evento.descricao}</p> : null}
                              </div>
                              <div className="flex flex-wrap items-start gap-2 md:justify-end">
                                <span className="border border-emerald-200 bg-emerald-50 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-emerald-700">{evento.status || 'ativo'}</span>
                                {evento.tipo_evento ? <span className="border border-zinc-200 bg-white px-2 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-zinc-500">{evento.tipo_evento}</span> : null}
                              </div>
                            </div>
                          )) : (
                            <div className="border border-zinc-200 bg-zinc-50 p-4 text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-500">
                              Nenhum evento futuro encontrado para os campeonatos vinculados a este perfil.
                            </div>
                          )}
                        </div>
                      </div>
                    ) : null}

                    {abaPerfilJogo === 'historico' ? (
                      <div className="mt-4 border border-zinc-200 bg-white p-4">
                        <div className="text-[12px] font-bold uppercase tracking-[0.14em] text-[#142340]">Histórico</div>
                        <div className="mt-4 grid gap-3 md:grid-cols-3">
                          <MiniCard label="Campeonatos" value={rankingAberto?.campeonatos_jogados || 0} />
                          <MiniCard label="Partidas" value={partidas} />
                          <MiniCard label="Abates" value={abates} helper={`Média ${mediaAbates.toFixed(2)}`} />
                        </div>
                        <p className="mt-4 text-[12px] font-medium text-zinc-500">Quando conectarmos o histórico oficial completo, esta aba pode listar campeonato por campeonato sem poluir a visão principal.</p>
                      </div>
                    ) : null}

                    {abaPerfilJogo === 'equipes' ? (
                      <div className="mt-4 grid gap-4 lg:grid-cols-2">
                        <div className="border border-zinc-200 bg-white p-4">
                          <div className="text-[12px] font-bold uppercase tracking-[0.14em] text-[#142340]">Equipe atual</div>
                          {normalizarEquipe(perfilAberto.equipes) ? (
                            <div className="mt-4 flex items-center gap-3 border border-zinc-200 bg-zinc-50 p-3">
                              {normalizarEquipe(perfilAberto.equipes)?.logo_url ? <img src={normalizarEquipe(perfilAberto.equipes)?.logo_url || ''} alt="Equipe" className="h-12 w-12 object-cover" /> : <div className="flex h-12 w-12 items-center justify-center bg-white text-[13px] font-bold uppercase text-zinc-500"><Users size={18} /></div>}
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-[14px] font-bold uppercase text-[#142340]">{normalizarEquipe(perfilAberto.equipes)?.nome || 'Equipe'}</div>
                                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">{normalizarEquipe(perfilAberto.equipes)?.tag || 'Sem tag'}{perfilAberto.line_atual?.nome ? ` • Line ${perfilAberto.line_atual.nome}` : ''}</div>
                              </div>
                              <button type="button" onClick={() => sairDaEquipe(perfilAberto.id)} disabled={leavingId === perfilAberto.id} className="inline-flex h-10 items-center justify-center gap-2 border border-yellow-300 bg-yellow-50 px-3 text-[10px] font-bold uppercase text-yellow-700 disabled:opacity-60">
                                {leavingId === perfilAberto.id ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />} Sair
                              </button>
                            </div>
                          ) : (
                            <div className="mt-4 grid gap-3">
                              <div className="border border-zinc-200 bg-zinc-50 p-3 text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-500">Este perfil ainda não está vinculado a nenhuma equipe. Regra visual: 1 equipe por perfil por vez.</div>
                              <input value={buscaEquipe} onChange={(e) => setBuscaEquipe(e.target.value)} placeholder="Buscar equipe por nome ou tag" className="h-10 border border-zinc-200 bg-white px-3 text-[12px] font-semibold uppercase outline-none focus:border-[#2563eb]" />
                              <input value={mensagemPedido} onChange={(e) => setMensagemPedido(e.target.value)} placeholder="Mensagem opcional" className="h-10 border border-zinc-200 bg-white px-3 text-[12px] font-semibold uppercase outline-none focus:border-[#2563eb]" />
                              <div className="space-y-2">
                                {carregandoBusca ? (
                                  <div className="border border-zinc-200 bg-zinc-50 p-3 text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-500">Buscando equipes...</div>
                                ) : equipesBusca.length > 0 ? equipesBusca.map((equipe) => {
                                  const pedidoExistente = pedidoPendentePorEquipe.get(equipe.id)
                                  return (
                                    <div key={equipe.id} className="flex w-full items-center gap-3 border border-zinc-200 bg-zinc-50 p-3 text-left hover:bg-white">
                                      {equipe.logo_url ? (
                                        <img src={equipe.logo_url} alt={equipe.nome || equipe.tag || 'Equipe'} className="h-10 w-10 shrink-0 rounded-sm border border-zinc-200 bg-white object-cover" />
                                      ) : (
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm border border-zinc-200 bg-white text-zinc-500">
                                          <Users size={17} />
                                        </div>
                                      )}
                                      <div className="min-w-0 flex-1">
                                        <div className="truncate text-[12px] font-bold uppercase text-[#142340]">{equipe.nome || equipe.tag || 'Equipe'}</div>
                                        <div className="mt-0.5 truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
                                          {equipe.tag || 'Sem tag'}{pedidoExistente ? ' • pedido já enviado' : ''}
                                        </div>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => enviarPedido(equipe.id)}
                                        disabled={enviandoPedido === equipe.id}
                                        className={[
                                          'inline-flex h-9 shrink-0 items-center gap-1 border px-3 text-[10px] font-bold uppercase tracking-[0.14em] disabled:opacity-60',
                                          pedidoExistente ? 'border-amber-300 bg-amber-50 text-amber-700' : 'border-blue-200 bg-white text-[#2563eb]',
                                        ].join(' ')}
                                      >
                                        {enviandoPedido === equipe.id ? <Loader2 size={12} className="animate-spin" /> : pedidoExistente ? <Pencil size={12} /> : <Send size={12} />}
                                        {pedidoExistente ? 'Editar pedido' : 'Solicitar'}
                                      </button>
                                    </div>
                                  )
                                }) : buscaEquipe.trim().length >= 2 ? (
                                  <div className="border border-zinc-200 bg-zinc-50 p-3 text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-500">Nenhuma equipe encontrada.</div>
                                ) : null}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="border border-zinc-200 bg-white p-4">
                          <div className="text-[12px] font-bold uppercase tracking-[0.14em] text-[#142340]">Pedidos e convites</div>
                          <div className="mt-4 grid gap-3">
                            <div className="border border-zinc-200 bg-zinc-50 p-3">
                              <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-600">Convites recebidos</div>
                              <div className="mt-2 space-y-2">
                                {convitesDoPerfil.length === 0 ? <div className="text-[11px] font-semibold text-zinc-500">Nenhum convite pendente.</div> : convitesDoPerfil.map((convite) => {
                                  const equipe = normalizarEquipe(convite.equipe)
                                  return (
                                    <div key={convite.id} className="flex items-center gap-2 bg-white p-2">
                                      <div className="min-w-0 flex-1"><div className="truncate text-[12px] font-bold uppercase">{equipe?.nome || equipe?.tag || 'Equipe'}</div><div className="text-[10px] text-zinc-500">{formatarData(convite.created_at)}</div></div>
                                      <button onClick={() => convite.id && responderConvite(convite.id, 'aceito')} disabled={processandoConviteId === convite.id} className="h-8 border border-emerald-300 bg-emerald-50 px-2 text-emerald-700"><Check size={13} /></button>
                                      <button onClick={() => convite.id && responderConvite(convite.id, 'recusado')} disabled={processandoConviteId === convite.id} className="h-8 border border-red-300 bg-red-50 px-2 text-red-700"><X size={13} /></button>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>

                            <div className="border border-zinc-200 bg-zinc-50 p-3">
                              <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-600">Pedidos enviados</div>
                              <div className="mt-2 space-y-2">
                                {pedidosDoPerfil.length === 0 ? <div className="text-[11px] font-semibold text-zinc-500">Nenhum pedido enviado.</div> : pedidosDoPerfil.map((pedido) => {
                                  const equipe = normalizarEquipe(pedido.equipe)
                                  return <div key={pedido.id} className="flex items-center justify-between bg-white p-2 text-[11px] font-semibold uppercase text-zinc-600"><span>{equipe?.nome || equipe?.tag || 'Equipe'}</span><span>{pedido.status || pedido.situacao || 'pendente'}</span></div>
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {abaPerfilJogo === 'conquistas' ? (
                      <div className="mt-4 border border-zinc-200 bg-white p-4">
                        <div className="text-[12px] font-bold uppercase tracking-[0.14em] text-[#142340]">Conquistas</div>
                        <p className="mt-4 text-[12px] font-medium text-zinc-500">Ainda não há conquistas oficiais para este perfil.</p>
                      </div>
                    ) : null}
                  </div>
                </div>
              </section>

              {editando ? (
                <section className="mt-4 border border-zinc-200 bg-white p-4 md:p-5">
                  <div className="mb-4 text-[13px] font-bold uppercase tracking-[0.14em] text-[#142340]">Editar perfil de jogo</div>
                  <div className="grid gap-3 md:grid-cols-3">
                    <CampoEdicao label="Nick" value={formEdicao.nick} onChange={(value) => setFormEdicao((f) => ({ ...f, nick: value }))} />
                    <CampoEdicao label="UID" value={formEdicao.uid_jogo} onChange={(value) => setFormEdicao((f) => ({ ...f, uid_jogo: value }))} />
                    <label className="grid gap-1">
                      <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">Servidor</span>
                      <ServidorSelect value={normalizarServidorSelect(formEdicao.servidor)} onChange={(value) => setFormEdicao((f) => ({ ...f, servidor: value }))} className="h-11 rounded-none border-zinc-200 px-3 text-[12px] font-bold uppercase focus:border-[#2563eb]" />
                    </label>
                    <CampoEdicao label="Função" value={formEdicao.funcao} onChange={(value) => setFormEdicao((f) => ({ ...f, funcao: value }))} />
                    <label className="grid gap-1">
                      <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">Plataforma</span>
                      <select value={formEdicao.plataforma} onChange={(e) => setFormEdicao((f) => ({ ...f, plataforma: e.target.value as 'mobile' | 'emulador' }))} className="h-11 border border-zinc-200 bg-white px-3 text-[12px] font-bold uppercase outline-none focus:border-[#2563eb]">
                        <option value="mobile">Mobile</option>
                        <option value="emulador">Emulador</option>
                      </select>
                    </label>
                    <div className="grid gap-2 md:col-span-3">
                      <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">Foto do perfil</span>
                      <div className="grid gap-4 border border-zinc-200 bg-zinc-50 p-3 md:grid-cols-[180px_1fr]">
                        <div className="relative mx-auto h-[170px] w-[170px] overflow-hidden border border-zinc-200 bg-white">
                          {fotoPreview ? (
                            <img
                              src={fotoPreview}
                              alt="Prévia da foto do perfil"
                              className="h-full w-full object-cover"
                              style={{ objectPosition: `${fotoPosX}% ${fotoPosY}%`, transform: `scale(${fotoZoom})` }}
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-400">Sem foto</div>
                          )}
                        </div>

                        <div className="grid gap-3">
                          <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 border border-[#2563eb] bg-white px-4 text-[11px] font-bold uppercase tracking-[0.08em] text-[#2563eb] hover:bg-blue-50">
                            <Upload size={14} /> Enviar foto
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => selecionarFotoPerfil(e.target.files?.[0] || null)} />
                          </label>
                          <div className="grid gap-2">
                            <label className="grid gap-1 text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500">
                              Tamanho
                              <input type="range" min="1" max="2.2" step="0.05" value={fotoZoom} onChange={(e) => setFotoZoom(Number(e.target.value))} />
                            </label>
                            <label className="grid gap-1 text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500">
                              Posição horizontal
                              <input type="range" min="0" max="100" value={fotoPosX} onChange={(e) => setFotoPosX(Number(e.target.value))} />
                            </label>
                            <label className="grid gap-1 text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500">
                              Posição vertical
                              <input type="range" min="0" max="100" value={fotoPosY} onChange={(e) => setFotoPosY(Number(e.target.value))} />
                            </label>
                          </div>
                          <button type="button" onClick={() => { setFotoZoom(1); setFotoPosX(50); setFotoPosY(50) }} className="inline-flex h-9 items-center justify-center gap-2 border border-zinc-300 bg-white px-3 text-[10px] font-bold uppercase text-zinc-600">
                            <RotateCcw size={13} /> Resetar enquadramento
                          </button>
                          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                            <Move size={13} /> Ajuste o corte antes de salvar. Não usamos link manual de imagem.
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button type="button" onClick={salvarPerfil} disabled={savingId === perfilAberto.id || enviandoFoto} className="inline-flex h-10 items-center justify-center gap-2 bg-[#2563eb] px-5 text-[11px] font-bold uppercase text-white disabled:opacity-60">
                      {savingId === perfilAberto.id || enviandoFoto ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} {enviandoFoto ? 'Enviando foto...' : 'Salvar alterações'}
                    </button>
                    <button type="button" onClick={() => setEditando(false)} className="inline-flex h-10 items-center justify-center border border-zinc-300 px-5 text-[11px] font-bold uppercase text-zinc-600">Cancelar</button>
                  </div>
                </section>
              ) : null}
            </div>
        </PlayerCardExpanded>
      ) : null}
    </div>
  )
}

function ResumoBox({ icon, label, value, helper }: { icon: JSX.Element; label: string; value: number; helper: string }) {
  return (
    <div className="border border-zinc-200 bg-white p-3">
      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase text-zinc-500">
        <span className="text-[#2563eb]">{icon}</span>
        {label}
      </div>
      <div className="mt-1 text-[18px] font-semibold text-[#142340]">{value}</div>
      <div className="text-[9px] font-semibold uppercase text-zinc-500">{helper}</div>
    </div>
  )
}

function ModalTab({ icon, label, ativo, onClick }: { icon: JSX.Element; label: string; ativo?: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={["flex h-12 items-center justify-center gap-2 border-b border-r border-zinc-200 px-3 text-[10px] font-bold uppercase tracking-[0.12em] last:border-r-0 md:text-[11px]", ativo ? 'bg-amber-50 text-amber-600' : 'text-zinc-500 hover:bg-zinc-50'].join(' ')}>
      {icon}
      {label}
    </button>
  )
}

function CampoEdicao({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-1">
      <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} className="h-11 border border-zinc-200 bg-white px-3 text-[12px] font-bold uppercase outline-none focus:border-[#2563eb]" />
    </label>
  )
}
