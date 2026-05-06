'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import {
  ArrowLeft,
  Grid3X3,
  Trophy,
  Users,
  Plus,
  X,
  UserPlus,
  Wallet,
  MessageCircle,
  Send,
  BarChart3,
  Activity,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getTipoVisual } from '@/lib/getTipoVisual'
import SumulaPartida from '@/app/campeonatos/[id]/components/SumulaPartida'

type Campeonato = {
  id: string
  nome: string
  banner_url?: string | null
  logo_url?: string | null
}

type Grupo = {
  id: string
  campeonato_id: string
  nome: string
  horario_inicio?: string | null
  horario_fim?: string | null
  qtd_slots?: number | null
  qtd_quedas?: number | null
  valor_inscricao?: number | null
  premiacao?: number | null
  status?: string | null
  fase_id?: string | null
  configuracao?: any
}

type Slot = {
  id: string
  campeonato_id: string
  fase_id: string
  grupo_id: string
  slot_numero: number
  campeonato_equipe_id?: string | null
  created_at?: string
  updated_at?: string
}

type CampeonatoEquipe = {
  id: string
  campeonato_id: string
  equipe_id?: string | null
  equipe_avulsa_id?: string | null
  line_id?: string | null
  grupo_id?: string | null
  fase_id?: string | null
  status?: string | null
  tipo_origem?: string | null
  nome_exibicao?: string | null
}

type EquipeOficial = {
  id: string
  nome: string
  logo_url?: string | null
}

type EquipeAvulsa = {
  id: string
  nome: string
  logo_url?: string | null
}

type Line = {
  id: string
  nome: string
  logo_url?: string | null
  equipe_id?: string | null
  plataforma?: string | null
  ativa?: boolean | null
}

type Jogo = {
  id: string
  campeonato_id: string
  grupo_id?: string | null
  fase_id?: string | null
  nome?: string | null
  nome_bloco?: string | null
  numero_queda?: number | null
  mapa?: string | null
  data_hora?: string | null
  quantidade_partidas?: number | null
  configuracao?: any
}

type ResultadoJogo = {
  id: string
  campeonato_id: string
  fase_id?: string | null
  jogo_id: string
  equipe_id: string
  grupo_id?: string | null
  mapa?: string | null
  posicao: number
  abates: number
  total_pontos: number
}

type Partida = {
  id: string
  campeonato_id: string
  jogo_id: string
  partida_id?: string | null
  grupo_id?: string | null
  numero: number
  mapa?: string | null
  status?: string | null
  ordem_exibicao?: number | null
}

type ResultadoPartidaEquipe = {
  id: string
  campeonato_id: string
  jogo_id: string
  partida_id: string
  equipe_id: string
  grupo_id?: string | null
  colocacao: number
  abates: number
  pontos_colocacao?: number | null
  pontos_abates?: number | null
  pontos_total: number
}

type ResultadoPartidaJogador = {
  id: string
  campeonato_id: string
  jogo_id: string
  partida_id: string
  equipe_id?: string | null
  perfil_jogo_id?: string | null
  jogador_campeonato_id?: string | null
  abates: number
  dano?: number | null
  assistencias?: number | null
  revives?: number | null
}

type ResultadoMvp = {
  id: string
  campeonato_id: string
  jogo_id: string
  partida_id?: string | null
  grupo_id?: string | null
  equipe_id?: string | null
  equipe_avulsa_id?: string | null
  perfil_jogo_id?: string | null
  jogador_campeonato_id?: string | null
  nick_snapshot?: string | null
  uid_jogo_snapshot?: string | null
  abates: number
  dano: number
  assistencias: number
  revives: number
}

type SlotComEquipe = Slot & {
  equipe: null | {
    campeonato_equipe_id: string
    nome: string
    logo_url?: string | null
    status?: string | null
    tipo_origem?: string | null
    participante_tipo?: 'equipe' | 'line' | 'avulsa'
  }
}

type LinhaTabela = {
  key: string
  campeonato_equipe_id?: string | null
  equipe_publica_id?: string | null
  nome: string
  logo_url?: string | null
  partidas: number
  booyahs: number
  abates: number
  pontos: number
}

type LinhaMvp = {
  key: string
  nick: string
  equipe: string
  equipe_logo?: string | null
  abates: number
  dano: number
  assistencias: number
  revives: number
}

type QuedaResumo = {
  id: string
  jogoId: string
  partidaId?: string | null
  titulo: string
  mapa: string
  ordem: number
}

function formatarHora(hora?: string | null) {
  if (!hora) return '--:--'
  return String(hora).slice(0, 5)
}

function moeda(valor?: number | null) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(valor || 0))
}

function safeJsonParse(value: any) {
  if (!value) return null
  if (typeof value === 'object') return value
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

function extrairErroPagina(error: any) {
  if (!error) return 'Erro desconhecido'
  if (typeof error === 'string') return error
  if (error.message) return error.message
  if (error.details) return error.details
  if (error.hint) return error.hint
  try {
    const serializado = JSON.stringify(error, Object.getOwnPropertyNames(error))
    if (serializado && serializado !== '{}') return serializado
  } catch {}
  return 'Erro desconhecido'
}

function logFalhaPagina(contexto: string, error: any) {
  const online =
    typeof navigator !== 'undefined' ? navigator.onLine : 'desconhecido'
  const origem =
    typeof window !== 'undefined' ? window.location.origin : 'server'

  console.error(`[${contexto}] Falha de rede/Supabase`, {
    mensagem: extrairErroPagina(error),
    online,
    origem,
    supabaseUrl:
      typeof process !== 'undefined'
        ? process.env.NEXT_PUBLIC_SUPABASE_URL
        : undefined,
    erroBruto: error,
  })
}

function normalizarMapa(valor?: string | null) {
  const raw = String(valor || '').trim().toLowerCase()
  const mapa: Record<string, string> = {
    bermuda: 'Bermuda',
    purgatorio: 'Purgatório',
    kalahari: 'Kalahari',
    alpes: 'Alpes',
    alpine: 'Alpine',
    nexterra: 'Nova Terra',
    'nova terra': 'Nova Terra',
    solara: 'Solara',
  }
  return mapa[raw] || (valor ? String(valor) : '-')
}

function BadgeStatus({ status }: { status?: string | null }) {
  const valor = String(status || 'aberto').toLowerCase()
  const estilos: Record<string, string> = {
    aberto: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    lotado: 'border-amber-200 bg-amber-50 text-amber-700',
    em_andamento: 'border-sky-200 bg-sky-50 text-sky-700',
    finalizado: 'border-zinc-200 bg-zinc-50 text-zinc-600',
  }

  return (
    <span
      className={`inline-flex border px-2 py-1 text-[10px] font-medium uppercase tracking-[0.16em] ${
        estilos[valor] || 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50'
      }`}
    >
      {valor.replaceAll('_', ' ')}
    </span>
  )
}

function CardInfo({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="border border-zinc-200 bg-white px-3 py-2">
      <div className="mb-2 flex h-8 w-8 items-center justify-center bg-white text-sky-600">
        {icon}
      </div>
      <div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
        {label}
      </div>
      <div className="mt-1 text-xl font-semibold text-[#142340]">{value}</div>
    </div>
  )
}

export default function CampeonatoDiarioDetalhePage() {
  const params = useParams<{ id: string }>()
  const campeonatoId = String(params?.id || '')

  const [loading, setLoading] = useState(true)
  const [salvandoSlot, setSalvandoSlot] = useState(false)
  const [erro, setErro] = useState('')
  const [campeonato, setCampeonato] = useState<Campeonato | null>(null)

  const [grupos, setGrupos] = useState<Grupo[]>([])
  const [grupoId, setGrupoId] = useState('')
  const [abaDireita, setAbaDireita] = useState<'equipes' | 'tabela' | 'sumula' | 'mvp'>('equipes')
  const [abaLateral, setAbaLateral] = useState<'estatisticas' | 'chat'>('estatisticas')

  const [slots, setSlots] = useState<Slot[]>([])
  const [campeonatoEquipes, setCampeonatoEquipes] = useState<CampeonatoEquipe[]>([])
  const [equipesOficiais, setEquipesOficiais] = useState<EquipeOficial[]>([])
  const [equipesAvulsas, setEquipesAvulsas] = useState<EquipeAvulsa[]>([])
  const [lines, setLines] = useState<Line[]>([])
  const [jogos, setJogos] = useState<Jogo[]>([])
  const [partidas, setPartidas] = useState<Partida[]>([])
  const [resultadosJogos, setResultadosJogos] = useState<ResultadoJogo[]>([])
  const [resultadosPartidasEquipes, setResultadosPartidasEquipes] = useState<ResultadoPartidaEquipe[]>([])
  const [resultadosPartidasJogadores, setResultadosPartidasJogadores] = useState<ResultadoPartidaJogador[]>([])
  const [resultadosMvp, setResultadosMvp] = useState<ResultadoMvp[]>([])

  const [equipesDisponiveis, setEquipesDisponiveis] = useState<EquipeOficial[]>([])
  const [linesDisponiveis, setLinesDisponiveis] = useState<Line[]>([])
  const [tipoParticipanteSlot, setTipoParticipanteSlot] = useState<'equipe' | 'line'>('equipe')
  const [slotModal, setSlotModal] = useState<SlotComEquipe | null>(null)
  const [equipeSelecionadaId, setEquipeSelecionadaId] = useState('')
  const [lineSelecionadaId, setLineSelecionadaId] = useState('')
  const [quedaAtiva, setQuedaAtiva] = useState<string>('')
  const [usuarioId, setUsuarioId] = useState<string | null>(null)
  const [podeGerenciar, setPodeGerenciar] = useState(false)
  const [saldoCarteira, setSaldoCarteira] = useState<number | null>(null)
  const [modoSlotModal, setModoSlotModal] = useState<'comprar' | 'gerenciar'>('comprar')
  const [mensagemChat, setMensagemChat] = useState('')
  const [chatMensagens, setChatMensagens] = useState<Array<{ id: string; autor: string; texto: string; horario: string }>>([
    { id: 'boas-vindas', autor: 'Arena', texto: 'Chat aberto para acompanhar o diário ao vivo.', horario: 'agora' },
  ])

  function enviarMensagemChat() {
    const texto = mensagemChat.trim()
    if (!texto) return

    setChatMensagens((atual) => [
      ...atual,
      {
        id: `${Date.now()}`,
        autor: 'Você',
        texto,
        horario: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      },
    ])
    setMensagemChat('')
  }

  const grupoAtivo = useMemo(
    () => grupos.find((g) => g.id === grupoId) || null,
    [grupos, grupoId]
  )

  const slotsDoGrupo = useMemo(() => {
    if (!grupoAtivo) return []
    return slots
      .filter((slot) => slot.grupo_id === grupoAtivo.id)
      .sort((a, b) => Number(a.slot_numero) - Number(b.slot_numero))
  }, [slots, grupoAtivo])

  const campeonatoEquipeMap = useMemo(() => {
    const map = new Map<string, CampeonatoEquipe>()
    campeonatoEquipes.forEach((item) => map.set(String(item.id), item))
    return map
  }, [campeonatoEquipes])

  const equipesOficiaisMap = useMemo(() => {
    const map = new Map<string, EquipeOficial>()
    equipesOficiais.forEach((item) => map.set(String(item.id), item))
    return map
  }, [equipesOficiais])

  const equipesAvulsasMap = useMemo(() => {
    const map = new Map<string, EquipeAvulsa>()
    equipesAvulsas.forEach((item) => map.set(String(item.id), item))
    return map
  }, [equipesAvulsas])

  const linesMap = useMemo(() => {
    const map = new Map<string, Line>()
    lines.forEach((item) => map.set(String(item.id), item))
    return map
  }, [lines])

  const slotsComEquipe = useMemo<SlotComEquipe[]>(() => {
    return slotsDoGrupo.map((slot) => {
      const campeonatoEquipe = slot.campeonato_equipe_id
        ? campeonatoEquipeMap.get(String(slot.campeonato_equipe_id))
        : null

      let equipe = null as SlotComEquipe['equipe']

      if (campeonatoEquipe) {
        const line = campeonatoEquipe.line_id
          ? linesMap.get(String(campeonatoEquipe.line_id))
          : null
        const oficial = campeonatoEquipe.equipe_id
          ? equipesOficiaisMap.get(String(campeonatoEquipe.equipe_id))
          : null
        const avulsa = campeonatoEquipe.equipe_avulsa_id
          ? equipesAvulsasMap.get(String(campeonatoEquipe.equipe_avulsa_id))
          : null

        const participanteTipo = line ? 'line' : oficial ? 'equipe' : 'avulsa'

        equipe = {
          campeonato_equipe_id: campeonatoEquipe.id,
          nome:
            line?.nome ||
            oficial?.nome ||
            avulsa?.nome ||
            campeonatoEquipe.nome_exibicao ||
            'Participante sem nome',
          logo_url: line?.logo_url || oficial?.logo_url || avulsa?.logo_url || null,
          status: campeonatoEquipe.status || null,
          tipo_origem: campeonatoEquipe.tipo_origem || participanteTipo,
          participante_tipo: participanteTipo,
        }
      }

      return {
        ...slot,
        equipe,
      }
    })
  }, [slotsDoGrupo, campeonatoEquipeMap, equipesOficiaisMap, equipesAvulsasMap, linesMap])

  const jogosDoGrupo = useMemo(() => {
    if (!grupoAtivo) return []

    return jogos
      .filter((jogo) => {
        const cfg = safeJsonParse(jogo.configuracao)
        const grupoDireto = String(jogo.grupo_id || '').trim()
        const grupoCfg = String(cfg?.grupo_id || '').trim()
        return grupoDireto === String(grupoAtivo.id) || grupoCfg === String(grupoAtivo.id)
      })
      .sort((a, b) => {
        const da = new Date(String(a.data_hora || 0)).getTime()
        const db = new Date(String(b.data_hora || 0)).getTime()
        return da - db
      })
  }, [jogos, grupoAtivo])

  const jogoIdsDoGrupo = useMemo(() => jogosDoGrupo.map((j) => j.id), [jogosDoGrupo])

  const quedasDoGrupo = useMemo<QuedaResumo[]>(() => {
    const jogoSet = new Set(jogosDoGrupo.map((jogo) => String(jogo.id)))
    const partidasDoGrupo = partidas
      .filter((partida) => jogoSet.has(String(partida.jogo_id || '')))
      .sort((a, b) => {
        const jogoA = String(a.jogo_id || '')
        const jogoB = String(b.jogo_id || '')
        if (jogoA !== jogoB) return jogoA.localeCompare(jogoB)
        return Number(a.ordem_exibicao || a.numero || 0) - Number(b.ordem_exibicao || b.numero || 0)
      })

    if (partidasDoGrupo.length > 0) {
      return partidasDoGrupo.map((partida, index) => ({
        id: String(partida.id),
        jogoId: String(partida.jogo_id),
        partidaId: String(partida.id),
        titulo: `Queda ${Number(partida.numero || index + 1)}`,
        mapa: normalizarMapa(partida.mapa),
        ordem: Number(partida.ordem_exibicao || partida.numero || index + 1),
      }))
    }

    return jogosDoGrupo.flatMap((jogo) => {
      const quantidade = Math.max(0, Number(jogo.quantidade_partidas || grupoAtivo?.qtd_quedas || 0))
      return Array.from({ length: quantidade }).map((_, index) => ({
        id: `${jogo.id}-queda-${index + 1}`,
        jogoId: jogo.id,
        partidaId: null,
        titulo: `Queda ${index + 1}`,
        mapa: normalizarMapa(jogo.mapa),
        ordem: index + 1,
      }))
    })
  }, [jogosDoGrupo, partidas, grupoAtivo?.qtd_quedas])

  useEffect(() => {
    if (!quedaAtiva && quedasDoGrupo[0]) {
      setQuedaAtiva(quedasDoGrupo[0].id)
    }
    if (quedaAtiva && !quedasDoGrupo.some((q) => q.id === quedaAtiva)) {
      setQuedaAtiva(quedasDoGrupo[0]?.id || '')
    }
  }, [quedasDoGrupo, quedaAtiva])

  const linhasTabela = useMemo<LinhaTabela[]>(() => {
    if (!grupoAtivo) return []

    const linhasBase = new Map<string, LinhaTabela>()
    const campeonatoEquipeIdsDoGrupo = new Set<string>()
    const publicToCampeonatoEquipeId = new Map<string, string>()

    slotsComEquipe.forEach((slot) => {
      if (!slot.equipe) return

      const campeonatoEquipeId = String(slot.equipe.campeonato_equipe_id || '').trim()
      const ce = campeonatoEquipeMap.get(campeonatoEquipeId)
      const publicId = String(ce?.line_id || ce?.equipe_id || ce?.equipe_avulsa_id || '').trim()

      if (campeonatoEquipeId) campeonatoEquipeIdsDoGrupo.add(campeonatoEquipeId)
      if (publicId && campeonatoEquipeId) publicToCampeonatoEquipeId.set(publicId, campeonatoEquipeId)

      if (!linhasBase.has(campeonatoEquipeId)) {
        linhasBase.set(campeonatoEquipeId, {
          key: campeonatoEquipeId,
          campeonato_equipe_id: campeonatoEquipeId,
          equipe_publica_id: publicId || null,
          nome: slot.equipe.nome,
          logo_url: slot.equipe.logo_url || null,
          partidas: 0,
          booyahs: 0,
          abates: 0,
          pontos: 0,
        })
      }
    })

    const jogoSet = new Set(jogoIdsDoGrupo.map((id) => String(id)))

    resultadosJogos
      .filter((row) => jogoSet.has(String(row.jogo_id || '')))
      .forEach((row) => {
        const equipeRef = String(row.equipe_id || '').trim()
        if (!equipeRef) return

        let finalKey = ''

        // fluxo atual: resultados_jogos.equipe_id = campeonato_equipes.id
        if (campeonatoEquipeIdsDoGrupo.has(equipeRef)) {
          finalKey = equipeRef
        } else {
          // fallback legado: resultados_jogos.equipe_id = id público da equipe
          finalKey = publicToCampeonatoEquipeId.get(equipeRef) || ''
        }

        if (!finalKey || !linhasBase.has(finalKey)) return

        const linha = linhasBase.get(finalKey)!
        linha.partidas += 1
        linha.abates += Number(row.abates || 0)
        linha.pontos += Number(row.total_pontos || 0)
        if (Number(row.posicao || 0) === 1) linha.booyahs += 1
      })

    const linhas = Array.from(linhasBase.values()).sort((a, b) => {
      if (b.pontos !== a.pontos) return b.pontos - a.pontos
      if (b.abates !== a.abates) return b.abates - a.abates
      return a.nome.localeCompare(b.nome)
    })

    if (linhas.length > 0) return linhas

    return Array.from({ length: Number(grupoAtivo.qtd_slots || 12) }).map((_, index) => ({
      key: `placeholder-${index + 1}`,
      campeonato_equipe_id: null,
      equipe_publica_id: null,
      nome: `EQUIPE ${index + 1}`,
      logo_url: null,
      partidas: 0,
      booyahs: 0,
      abates: 0,
      pontos: 0,
    }))
  }, [grupoAtivo, slotsComEquipe, resultadosJogos, jogoIdsDoGrupo, campeonatoEquipeMap])

  const linhasMvp = useMemo<LinhaMvp[]>(() => {
    if (!grupoAtivo) return []

    const acumulado = new Map<string, LinhaMvp>()
    const jogoSet = new Set(jogoIdsDoGrupo.map((id) => String(id)))
    const campeonatoEquipeIdsDoGrupo = new Set<string>()
    const publicIdsDoGrupo = new Set<string>()

    slotsComEquipe.forEach((slot) => {
      const campeonatoEquipeId = String(slot.campeonato_equipe_id || '').trim()
      if (campeonatoEquipeId) campeonatoEquipeIdsDoGrupo.add(campeonatoEquipeId)

      const ce = campeonatoEquipeMap.get(campeonatoEquipeId)
      const publicId = String(ce?.line_id || ce?.equipe_id || ce?.equipe_avulsa_id || '').trim()
      if (publicId) publicIdsDoGrupo.add(publicId)
    })

    resultadosMvp
      .filter((row) => jogoSet.has(String(row.jogo_id || '')))
      .forEach((row) => {
        const equipeRef = String(row.equipe_id || '').trim()

        let campeonatoEquipeId = ''
        if (equipeRef && campeonatoEquipeIdsDoGrupo.has(equipeRef)) {
          campeonatoEquipeId = equipeRef
        }

        const campeonatoEquipe = campeonatoEquipeId
          ? campeonatoEquipeMap.get(campeonatoEquipeId)
          : null

        const equipePublicaId = String(
          campeonatoEquipe?.equipe_id ||
            campeonatoEquipe?.equipe_avulsa_id ||
            row.equipe_avulsa_id ||
            ''
        ).trim()

        if (
          !campeonatoEquipeId &&
          equipePublicaId &&
          !publicIdsDoGrupo.has(equipePublicaId)
        ) {
          return
        }

        const oficial = equipePublicaId ? equipesOficiaisMap.get(equipePublicaId) : null
        const avulsa = equipePublicaId ? equipesAvulsasMap.get(equipePublicaId) : null

        const key =
          String(row.jogador_campeonato_id || '').trim() ||
          String(row.perfil_jogo_id || '').trim() ||
          `${String(row.uid_jogo_snapshot || '').trim()}::${campeonatoEquipeId || equipePublicaId || 'sem-equipe'}`

        if (!acumulado.has(key)) {
          acumulado.set(key, {
            key,
            nick: String(row.nick_snapshot || 'SEM NICK').trim() || 'SEM NICK',
            equipe: oficial?.nome || avulsa?.nome || 'SEM EQUIPE',
            equipe_logo: oficial?.logo_url || avulsa?.logo_url || null,
            abates: 0,
            dano: 0,
            assistencias: 0,
            revives: 0,
          })
        }

        const item = acumulado.get(key)!
        item.abates += Number(row.abates || 0)
        item.dano += Number(row.dano || 0)
        item.assistencias += Number(row.assistencias || 0)
        item.revives += Number(row.revives || 0)
      })

    const linhas = Array.from(acumulado.values()).sort((a, b) => {
      if (b.abates !== a.abates) return b.abates - a.abates
      if (b.dano !== a.dano) return b.dano - a.dano
      return a.nick.localeCompare(b.nick)
    })

    if (linhas.length > 0) return linhas

    return Array.from({ length: 12 }).map((_, index) => ({
      key: `mvp-placeholder-${index + 1}`,
      nick: `JOGADOR ${index + 1}`,
      equipe: `EQUIPE ${index + 1}`,
      equipe_logo: null,
      abates: 0,
      dano: 0,
      assistencias: 0,
      revives: 0,
    }))
  }, [grupoAtivo, slotsComEquipe, jogoIdsDoGrupo, resultadosMvp, campeonatoEquipeMap, equipesOficiaisMap, equipesAvulsasMap])

  const quedaSelecionada = useMemo(() => {
    return quedasDoGrupo.find((queda) => queda.id === quedaAtiva) || quedasDoGrupo[0] || null
  }, [quedasDoGrupo, quedaAtiva])

  const linhasSumula = useMemo(() => {
    const resultadoMap = new Map<string, { posicao: number; abates: number; total_pontos: number }>()
    const partidaAtual = String(quedaSelecionada?.partidaId || '').trim()
    const jogoAtual = String(quedaSelecionada?.jogoId || '').trim()

    if (partidaAtual) {
      resultadosPartidasEquipes
        .filter((row) => String(row.partida_id || '') === partidaAtual)
        .forEach((row) => {
          const key = String(row.equipe_id || '').trim()
          if (key) {
            resultadoMap.set(key, {
              posicao: Number(row.colocacao || 0),
              abates: Number(row.abates || 0),
              total_pontos: Number(row.pontos_total || 0),
            })
          }
        })
    } else if (jogoAtual) {
      resultadosJogos
        .filter((row) => String(row.jogo_id || '') === jogoAtual)
        .forEach((row) => {
          const key = String(row.equipe_id || '').trim()
          if (key) resultadoMap.set(key, row)
        })
    }

    const linhas = slotsComEquipe.map((slot) => {
      const campeonatoEquipeId = String(slot.campeonato_equipe_id || '').trim()
      const resultadoDireto = campeonatoEquipeId ? resultadoMap.get(campeonatoEquipeId) : null

      let resultado = resultadoDireto || null

      if (!resultado && slot.equipe?.campeonato_equipe_id) {
        const ce = campeonatoEquipeMap.get(String(slot.equipe.campeonato_equipe_id))
        const publicId = String(ce?.line_id || ce?.equipe_id || ce?.equipe_avulsa_id || '').trim()
        if (publicId) resultado = resultadoMap.get(publicId) || null
      }

      return {
        slot_numero: slot.slot_numero,
        nome: slot.equipe?.nome || `SLOT ${slot.slot_numero}`,
        logo_url: slot.equipe?.logo_url || null,
        posicao: Number(resultado?.posicao || 0),
        abates: Number(resultado?.abates || 0),
        pontos: Number(resultado?.total_pontos || 0),
      }
    })

    if (linhas.length > 0) return linhas

    return Array.from({ length: Number(grupoAtivo?.qtd_slots || 12) }).map((_, index) => ({
      slot_numero: index + 1,
      nome: `SLOT ${index + 1}`,
      logo_url: null,
      posicao: 0,
      abates: 0,
      pontos: 0,
    }))
  }, [slotsComEquipe, resultadosJogos, resultadosPartidasEquipes, quedaSelecionada, grupoAtivo, campeonatoEquipeMap])

  const estatisticasQuedaSelecionada = useMemo(() => {
    const partidaAtual = String(quedaSelecionada?.partidaId || '').trim()
    const jogoAtual = String(quedaSelecionada?.jogoId || '').trim()
    const jogo = jogosDoGrupo.find((item) => String(item.id) === jogoAtual) || null

    function resolverEquipe(row: ResultadoPartidaEquipe) {
      const equipeRef = String(row.equipe_id || '').trim()
      let campeonatoEquipe = equipeRef ? campeonatoEquipeMap.get(equipeRef) : null

      if (!campeonatoEquipe && equipeRef) {
        campeonatoEquipe = campeonatoEquipes.find((ce) => {
          return (
            String(ce.equipe_id || '') === equipeRef ||
            String(ce.equipe_avulsa_id || '') === equipeRef ||
            String(ce.line_id || '') === equipeRef
          )
        }) || null
      }

      const campeonatoEquipeId = String(campeonatoEquipe?.id || equipeRef)
      const slot = slotsComEquipe.find((item) => String(item.equipe?.campeonato_equipe_id || item.campeonato_equipe_id || '') === campeonatoEquipeId)
      const publicId = String(campeonatoEquipe?.line_id || campeonatoEquipe?.equipe_id || campeonatoEquipe?.equipe_avulsa_id || equipeRef || '').trim()
      const oficial = publicId ? equipesOficiaisMap.get(publicId) : null
      const avulsa = publicId ? equipesAvulsasMap.get(publicId) : null

      return {
        nome: slot?.equipe?.nome || oficial?.nome || avulsa?.nome || `Equipe ${equipeRef.slice(0, 6)}`,
        logo_url: slot?.equipe?.logo_url || oficial?.logo_url || avulsa?.logo_url || null,
      }
    }

    const mvpRowsDaQueda = resultadosMvp
      .filter((row) => partidaAtual ? String(row.partida_id || '') === partidaAtual : String(row.jogo_id || '') === jogoAtual)

    const equipesPartida = resultadosPartidasEquipes
      .filter((row) => partidaAtual ? String(row.partida_id || '') === partidaAtual : String(row.jogo_id || '') === jogoAtual)
      .map((row) => {
        const info = resolverEquipe(row)
        return {
          key: String(row.id),
          nome: info.nome,
          logo_url: info.logo_url,
          posicao: Number(row.colocacao || 0),
          abates: Number(row.abates || 0),
          pontos: Number(row.pontos_total || 0),
        }
      })

    const equipesLegado = equipesPartida.length > 0
      ? []
      : resultadosJogos
          .filter((row) => {
            if (String(row.jogo_id || '') !== jogoAtual) return false
            // resultados_jogos é legado e não tem partida_id. Só usa como fallback quando
            // existe MVP salvo para a queda selecionada, evitando repetir dados em quedas vazias.
            if (partidaAtual && mvpRowsDaQueda.length === 0) return false
            return true
          })
          .map((row) => {
            const fakeRow = {
              id: row.id,
              campeonato_id: row.campeonato_id,
              jogo_id: row.jogo_id,
              partida_id: partidaAtual || '',
              equipe_id: row.equipe_id,
              grupo_id: row.grupo_id,
              colocacao: Number(row.posicao || 0),
              abates: Number(row.abates || 0),
              pontos_total: Number(row.total_pontos || 0),
            } as ResultadoPartidaEquipe
            const info = resolverEquipe(fakeRow)
            return {
              key: String(row.id),
              nome: info.nome,
              logo_url: info.logo_url,
              posicao: Number(row.posicao || 0),
              abates: Number(row.abates || 0),
              pontos: Number(row.total_pontos || 0),
            }
          })

    const equipes = [...equipesPartida, ...equipesLegado]
      .sort((a, b) => {
        if (Number(a.posicao || 0) && Number(b.posicao || 0)) return Number(a.posicao || 0) - Number(b.posicao || 0)
        if (b.pontos !== a.pontos) return b.pontos - a.pontos
        return b.abates - a.abates
      })

    const maxPontos = Math.max(...equipes.map((linha) => Number(linha.pontos || 0)), 1)
    const maxAbates = Math.max(...equipes.map((linha) => Number(linha.abates || 0)), 1)

    const mvpPorJogador = new Map<string, ResultadoMvp>()
    mvpRowsDaQueda.forEach((row) => {
      const key = String(row.jogador_campeonato_id || row.perfil_jogo_id || row.uid_jogo_snapshot || '').trim()
      if (key) mvpPorJogador.set(key, row)
    })

    const jogadoresPartida = resultadosPartidasJogadores
      .filter((row) => partidaAtual ? String(row.partida_id || '') === partidaAtual : String(row.jogo_id || '') === jogoAtual)
      .map((row, index) => {
        const keyBase = String(row.jogador_campeonato_id || row.perfil_jogo_id || '').trim()
        const mvp = keyBase ? mvpPorJogador.get(keyBase) : null
        return {
          key: String(row.id || keyBase || index),
          nick: String(mvp?.nick_snapshot || (keyBase ? `Jogador ${keyBase.slice(0, 6)}` : `Jogador ${index + 1}`)).trim(),
          abates: Number(row.abates || 0),
        }
      })

    const jogadoresLegado = jogadoresPartida.length > 0
      ? []
      : mvpRowsDaQueda.map((row, index) => {
          const keyBase = String(row.jogador_campeonato_id || row.perfil_jogo_id || row.uid_jogo_snapshot || '').trim()
          return {
            key: String(row.id || keyBase || index),
            nick: String(row.nick_snapshot || (keyBase ? `Jogador ${keyBase.slice(0, 6)}` : `Jogador ${index + 1}`)).trim(),
            abates: Number(row.abates || 0),
          }
        })

    const jogadores = [...jogadoresPartida, ...jogadoresLegado]
      .sort((a, b) => b.abates - a.abates)
      .slice(0, 12)

    const maxAbatesJogadores = Math.max(...jogadores.map((jogador) => Number(jogador.abates || 0)), 1)

    return { jogoAtual, partidaAtual, jogo, equipes, jogadores, maxPontos, maxAbates, maxAbatesJogadores }
  }, [quedaSelecionada, jogosDoGrupo, resultadosPartidasEquipes, resultadosPartidasJogadores, resultadosMvp, campeonatoEquipeMap, campeonatoEquipes, slotsComEquipe, equipesOficiaisMap, equipesAvulsasMap])


  async function carregarSaldoCarteira(token?: string | null) {
    try {
      if (!token) {
        setSaldoCarteira(null)
        return
      }

      const res = await fetch('/api/wallet/saldo', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const json = await res.json()

      if (!res.ok) throw new Error(json?.error || 'Erro ao consultar saldo.')

      setSaldoCarteira(Number(json?.saldo_disponivel ?? json?.saldo ?? 0))
    } catch (e) {
      console.warn('Não foi possível carregar saldo da carteira:', e)
      setSaldoCarteira(null)
    }
  }

  async function carregarUsuarioEPermissao() {
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token || null
      const user = sessionData.session?.user || null

      setUsuarioId(user?.id || null)
      await carregarSaldoCarteira(token)

      if (!user || !campeonatoId) {
        setPodeGerenciar(false)
        return
      }

      const { data, error } = await supabase.rpc('fn_usuario_admin_do_campeonato', {
        p_campeonato_id: campeonatoId,
      })

      if (!error && Boolean(data)) {
        setPodeGerenciar(true)
        return
      }

      if (error) {
        console.warn('Falha ao verificar permissão via RPC:', error)
      }

      const { data: campeonatoOwner } = await supabase
        .from('campeonatos')
        .select('criado_por')
        .eq('id', campeonatoId)
        .maybeSingle()

      setPodeGerenciar(String((campeonatoOwner as any)?.criado_por || '') === user.id)
    } catch (e) {
      console.warn('Falha ao carregar usuário/permissão:', e)
      setUsuarioId(null)
      setPodeGerenciar(false)
    }
  }

  function abrirCompraVaga() {
    const primeiroLivre = slotsComEquipe.find((s) => !s.equipe)
    if (!primeiroLivre) {
      setErro('Não há slots livres neste horário.')
      return
    }

    setModoSlotModal('comprar')
    setSlotModal(primeiroLivre)
    setEquipeSelecionadaId('')
    setLineSelecionadaId('')
  }


  async function carregarParticipantesDoUsuario(userId: string) {
    const [equipesDonoRes, membrosRes] = await Promise.all([
      supabase
        .from('equipes')
        .select('id, nome, logo_url')
        .eq('criado_por', userId)
        .order('nome', { ascending: true }),
      supabase
        .from('membros_equipe')
        .select('equipe_id, tipo, ativo, perfis_jogo:perfil_jogo_id ( id, user_id )')
        .eq('ativo', true),
    ])

    if (equipesDonoRes.error) throw equipesDonoRes.error
    if (membrosRes.error) throw membrosRes.error

    const equipeIdsPermitidos = new Set<string>()

    ;((equipesDonoRes.data || []) as any[]).forEach((item) => {
      if (item?.id) equipeIdsPermitidos.add(String(item.id))
    })

    ;((membrosRes.data || []) as any[]).forEach((item) => {
      const perfilJogo = Array.isArray(item.perfis_jogo)
        ? item.perfis_jogo[0]
        : item.perfis_jogo

      if (perfilJogo?.user_id === userId && item.equipe_id) {
        equipeIdsPermitidos.add(String(item.equipe_id))
      }
    })

    const equipeIds = Array.from(equipeIdsPermitidos)

    const equipesPermitidasRes = equipeIds.length > 0
      ? await supabase
          .from('equipes')
          .select('id, nome, logo_url')
          .in('id', equipeIds)
          .order('nome', { ascending: true })
      : { data: [], error: null as any }

    if (equipesPermitidasRes.error) throw equipesPermitidasRes.error

    const [linesCriadasRes, linesEquipesRes] = await Promise.all([
      supabase
        .from('lines')
        .select('id, nome, logo_url, equipe_id, plataforma, ativa')
        .eq('created_by', userId)
        .eq('ativa', true)
        .order('nome', { ascending: true }),
      equipeIds.length > 0
        ? supabase
            .from('lines')
            .select('id, nome, logo_url, equipe_id, plataforma, ativa')
            .in('equipe_id', equipeIds)
            .eq('ativa', true)
            .order('nome', { ascending: true })
        : Promise.resolve({ data: [], error: null as any }),
    ])

    if (linesCriadasRes.error) throw linesCriadasRes.error
    if (linesEquipesRes.error) throw linesEquipesRes.error

    const linesMapLocal = new Map<string, Line>()
    ;([...(linesCriadasRes.data || []), ...(linesEquipesRes.data || [])] as Line[]).forEach((line) => {
      if (line?.id) linesMapLocal.set(String(line.id), line)
    })

    setEquipesDisponiveis((equipesPermitidasRes.data || []) as EquipeOficial[])
    setLinesDisponiveis(Array.from(linesMapLocal.values()))
  }

  async function carregar() {
    if (!campeonatoId) return

    setLoading(true)
    setErro('')

    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const userAtual = sessionData.session?.user || null

      const [
        campeonatoRes,
        gruposRes,
        slotsRes,
        campeonatoEquipesRes,
        jogosRes,
        partidasRes,
        resultadosJogosRes,
        resultadosPartidasEquipesRes,
        resultadosPartidasJogadoresRes,
        resultadosMvpRes,
      ] = await Promise.all([
        supabase.from('campeonatos').select('id, nome, banner_url, logo_url').eq('id', campeonatoId).single(),
        supabase
          .from('campeonato_grupos')
          .select('id, campeonato_id, nome, horario_inicio, horario_fim, qtd_slots, qtd_quedas, valor_inscricao, premiacao, status, fase_id, configuracao')
          .eq('campeonato_id', campeonatoId)
          .order('ordem', { ascending: true }),
        supabase
          .from('campeonato_grupo_slots')
          .select('id, campeonato_id, fase_id, grupo_id, slot_numero, campeonato_equipe_id, created_at, updated_at')
          .eq('campeonato_id', campeonatoId)
          .order('grupo_id', { ascending: true })
          .order('slot_numero', { ascending: true }),
        supabase
          .from('campeonato_equipes')
          .select('id, campeonato_id, equipe_id, equipe_avulsa_id, line_id, grupo_id, fase_id, status, tipo_origem, nome_exibicao')
          .eq('campeonato_id', campeonatoId),
        supabase
          .from('jogos')
          .select('id, campeonato_id, grupo_id, fase_id, nome, nome_bloco, numero_queda, mapa, data_hora, quantidade_partidas, configuracao')
          .eq('campeonato_id', campeonatoId)
          .order('created_at', { ascending: true }),
        supabase
          .from('partidas')
          .select('id, campeonato_id, jogo_id, grupo_id, numero, mapa, status, ordem_exibicao')
          .eq('campeonato_id', campeonatoId)
          .order('jogo_id', { ascending: true })
          .order('numero', { ascending: true }),
        supabase
          .from('resultados_jogos')
          .select('id, campeonato_id, fase_id, jogo_id, equipe_id, grupo_id, mapa, posicao, abates, total_pontos')
          .eq('campeonato_id', campeonatoId),
        supabase
          .from('resultados_partidas_equipes')
          .select('id, campeonato_id, jogo_id, partida_id, equipe_id, grupo_id, colocacao, abates, pontos_colocacao, pontos_abates, pontos_total')
          .eq('campeonato_id', campeonatoId),
        supabase
          .from('resultados_partidas_jogadores')
          .select('id, campeonato_id, jogo_id, partida_id, equipe_id, perfil_jogo_id, jogador_campeonato_id, abates, dano, assistencias, revives')
          .eq('campeonato_id', campeonatoId),
        supabase
          .from('resultados_mvp')
          .select('id, campeonato_id, jogo_id, partida_id, grupo_id, equipe_id, equipe_avulsa_id, perfil_jogo_id, jogador_campeonato_id, nick_snapshot, uid_jogo_snapshot, abates, dano, assistencias, revives')
          .eq('campeonato_id', campeonatoId),
      ])

      if (campeonatoRes.error) throw campeonatoRes.error
      if (gruposRes.error) throw gruposRes.error
      if (slotsRes.error) throw slotsRes.error
      if (campeonatoEquipesRes.error) throw campeonatoEquipesRes.error
      if (jogosRes.error) throw jogosRes.error
      if (partidasRes.error) throw partidasRes.error
      if (resultadosJogosRes.error) throw resultadosJogosRes.error
      if (resultadosPartidasEquipesRes.error) throw resultadosPartidasEquipesRes.error
      if (resultadosPartidasJogadoresRes.error) throw resultadosPartidasJogadoresRes.error
      if (resultadosMvpRes.error) throw resultadosMvpRes.error

      const campeonatoEquipesRows = (campeonatoEquipesRes.data || []) as CampeonatoEquipe[]

      const equipeIds = Array.from(new Set(campeonatoEquipesRows.map((row) => String(row.equipe_id || '').trim()).filter(Boolean)))
      const equipeAvulsaIds = Array.from(new Set(campeonatoEquipesRows.map((row) => String(row.equipe_avulsa_id || '').trim()).filter(Boolean)))
      const lineIds = Array.from(new Set(campeonatoEquipesRows.map((row) => String(row.line_id || '').trim()).filter(Boolean)))

      const [equipesOficiaisRes, equipesAvulsasRes, linesRes] = await Promise.all([
        equipeIds.length > 0
          ? supabase.from('equipes').select('id, nome, logo_url').in('id', equipeIds)
          : Promise.resolve({ data: [], error: null as any }),
        equipeAvulsaIds.length > 0
          ? supabase.from('equipes_avulsas_campeonato').select('id, nome, logo_url').in('id', equipeAvulsaIds)
          : Promise.resolve({ data: [], error: null as any }),
        lineIds.length > 0
          ? supabase.from('lines').select('id, nome, logo_url, equipe_id, plataforma, ativa').in('id', lineIds)
          : Promise.resolve({ data: [], error: null as any }),
      ])

      if (equipesOficiaisRes.error) throw equipesOficiaisRes.error
      if (equipesAvulsasRes.error) throw equipesAvulsasRes.error
      if (linesRes.error) throw linesRes.error

      setCampeonato(campeonatoRes.data as Campeonato)
      setGrupos((gruposRes.data || []) as Grupo[])
      setSlots((slotsRes.data || []) as Slot[])
      setCampeonatoEquipes(campeonatoEquipesRows)
      setEquipesOficiais((equipesOficiaisRes.data || []) as EquipeOficial[])
      setEquipesAvulsas((equipesAvulsasRes.data || []) as EquipeAvulsa[])
      setLines((linesRes.data || []) as Line[])
      setJogos((jogosRes.data || []) as Jogo[])
      setPartidas((partidasRes.data || []) as Partida[])
      setResultadosJogos((resultadosJogosRes.data || []) as ResultadoJogo[])
      setResultadosPartidasEquipes((resultadosPartidasEquipesRes.data || []) as ResultadoPartidaEquipe[])
      setResultadosPartidasJogadores((resultadosPartidasJogadoresRes.data || []) as ResultadoPartidaJogador[])
      setResultadosMvp((resultadosMvpRes.data || []) as ResultadoMvp[])
      if (userAtual?.id) {
        await carregarParticipantesDoUsuario(userAtual.id)
      } else {
        setEquipesDisponiveis([])
        setLinesDisponiveis([])
      }

      if ((gruposRes.data || []).length > 0) {
        setGrupoId((atual) => atual || (gruposRes.data || [])[0].id)
      }
    } catch (e: any) {
      logFalhaPagina('DiarioPage/carregar', e)
      console.error('Erro ao carregar diário:', e)
      setErro(extrairErroPagina(e) || 'Erro ao carregar o diário.')
    } finally {
      setLoading(false)
    }
  }

  async function adicionarParticipanteNoSlot() {
    if (!slotModal || !grupoAtivo) return
    const participanteId = tipoParticipanteSlot === 'line' ? lineSelecionadaId : equipeSelecionadaId
    if (!participanteId) return

    try {
      setSalvandoSlot(true)
      setErro('')

      const { data: existente, error: existenteError } = await supabase
        .from('campeonato_equipes')
        .select('id')
        .eq('campeonato_id', campeonatoId)
        .eq(tipoParticipanteSlot === 'line' ? 'line_id' : 'equipe_id', participanteId)
        .eq('grupo_id', grupoAtivo.id)
        .maybeSingle()

      if (existenteError) throw existenteError

      let campeonatoEquipeId = existente?.id as string | undefined

      if (!campeonatoEquipeId) {
        const { data: novoRegistro, error: novoRegistroError } = await supabase
          .from('campeonato_equipes')
          .insert({
            campeonato_id: campeonatoId,
            equipe_id: tipoParticipanteSlot === 'equipe' ? participanteId : null,
            line_id: tipoParticipanteSlot === 'line' ? participanteId : null,
            grupo_id: grupoAtivo.id,
            fase_id: grupoAtivo.fase_id || null,
            status: 'confirmado',
            tipo_origem: tipoParticipanteSlot === 'line' ? 'line' : 'oficial',
            nome_exibicao:
              tipoParticipanteSlot === 'line'
                ? linesDisponiveis.find((line) => line.id === participanteId)?.nome || null
                : null,
          })
          .select('id')
          .single()

        if (novoRegistroError) throw novoRegistroError
        campeonatoEquipeId = novoRegistro.id
      }

      const { error: slotError } = await supabase
        .from('campeonato_grupo_slots')
        .update({
          campeonato_equipe_id: campeonatoEquipeId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', slotModal.id)

      if (slotError) throw slotError

      setSlotModal(null)
      setEquipeSelecionadaId('')
      setLineSelecionadaId('')
      await carregar()
    } catch (e: any) {
      console.error('Erro ao adicionar participante no slot:', e)
      setErro(e?.message || 'Erro ao adicionar participante no slot.')
    } finally {
      setSalvandoSlot(false)
    }
  }


  async function comprarVagaComCarteira() {
    if (!slotModal || !grupoAtivo || !resumoGrupo) return

    const participanteId = tipoParticipanteSlot === 'line' ? lineSelecionadaId : equipeSelecionadaId
    if (!participanteId) {
      setErro('Selecione uma equipe ou line para comprar a vaga.')
      return
    }

    try {
      setSalvandoSlot(true)
      setErro('')

      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token || null
      const user = sessionData.session?.user || null

      if (!user || !token) {
        window.location.href = '/login'
        return
      }

      const payload = {
        campeonatoId,
        grupoId: grupoAtivo.id,
        equipeId: tipoParticipanteSlot === 'equipe' ? participanteId : undefined,
        lineId: tipoParticipanteSlot === 'line' ? participanteId : undefined,
      }

      const res = await fetch('/api/campeonatos/diarios/inscrever', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Erro ao comprar vaga com saldo da carteira.')

      setSlotModal(null)
      setEquipeSelecionadaId('')
      setLineSelecionadaId('')
      await carregar()
      await carregarUsuarioEPermissao()
    } catch (e: any) {
      console.error('Erro ao comprar vaga com carteira:', e)
      setErro(e?.message || e?.details || 'Erro ao comprar vaga com saldo da carteira.')
    } finally {
      setSalvandoSlot(false)
    }
  }

  async function removerEquipeDoSlot() {
    if (!slotModal) return

    try {
      setSalvandoSlot(true)
      setErro('')

      const { error: slotError } = await supabase
        .from('campeonato_grupo_slots')
        .update({
          campeonato_equipe_id: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', slotModal.id)

      if (slotError) throw slotError

      setSlotModal(null)
      setEquipeSelecionadaId('')
      setLineSelecionadaId('')
      await carregar()
    } catch (e: any) {
      console.error('Erro ao remover participante do slot:', e)
      setErro(e?.message || 'Erro ao remover participante do slot.')
    } finally {
      setSalvandoSlot(false)
    }
  }

  useEffect(() => {
    carregar()
    carregarUsuarioEPermissao()
  }, [campeonatoId])

  useEffect(() => {
    if (!podeGerenciar && abaDireita === 'sumula') {
      setAbaDireita('equipes')
    }
  }, [podeGerenciar, abaDireita])

  const resumoGrupo = useMemo(() => {
    if (!grupoAtivo) return null

    const ocupados = slotsComEquipe.filter((slot) => !!slot.equipe).length

    return {
      ocupados,
      totalSlots: Number(grupoAtivo.qtd_slots || slotsComEquipe.length || 0),
      quedas: Number(grupoAtivo.qtd_quedas || 0),
      premiacao: Number(grupoAtivo.premiacao || 0),
      inscricao: Number(grupoAtivo.valor_inscricao || 0),
    }
  }, [grupoAtivo, slotsComEquipe])

  const visual = getTipoVisual('diario')

  if (loading) {
    return <div className="mx-auto max-w-7xl px-4 py-10 text-[#142340]">Carregando...</div>
  }

  if (!campeonato) {
    return <div className="mx-auto max-w-7xl px-4 py-10 text-[#142340]">Diário não encontrado.</div>
  }

  return (
    <div className="mx-auto max-w-7xl px-3 py-4 text-[#142340] max-md:px-0 max-md:py-0">
      <Link
        href="/campeonatos/diarios"
        className="mb-4 inline-flex items-center gap-2 text-[12px] font-medium uppercase tracking-wide text-zinc-500 hover:text-[#2563eb]"
      >
        <ArrowLeft size={14} /> Voltar
      </Link>

      <div className="mb-4 overflow-hidden border border-sky-900/20 bg-gradient-to-r from-sky-700 via-blue-700 to-sky-900 text-white shadow-sm">
        <div className="flex flex-col gap-4 px-4 py-5 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            {campeonato.logo_url ? (
              <img
                src={campeonato.logo_url}
                alt="Logo"
                className="h-16 w-16 shrink-0 border border-white/30 bg-white object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center border border-white/30 bg-white/15 text-xl font-bold text-white">
                {String(campeonato.nome || 'D').charAt(0).toUpperCase()}
              </div>
            )}

            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center border border-white/25 bg-white/10 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-white">
                  Diário por horários
                </span>
                <span className="inline-flex items-center border border-white/25 bg-white/90 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-sky-800">
                  Mobile
                </span>
              </div>
              <h1 className="truncate text-3xl font-semibold uppercase tracking-tight text-white md:text-4xl">
                {campeonato.nome}
              </h1>
            </div>
          </div>

          {grupoAtivo && resumoGrupo ? (
            <div className="grid grid-cols-2 gap-3 text-white sm:grid-cols-4 md:min-w-[620px]">
              <div className="border-l border-white/20 pl-4">
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/70">Horário</div>
                <div className="mt-1 text-xl font-semibold">{formatarHora(grupoAtivo.horario_inicio)}</div>
              </div>
              <div className="border-l border-white/20 pl-4">
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/70">Slots</div>
                <div className="mt-1 text-xl font-semibold">{resumoGrupo.ocupados} / {resumoGrupo.totalSlots}</div>
              </div>
              <div className="border-l border-white/20 pl-4">
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/70">Premiação</div>
                <div className="mt-1 text-xl font-semibold">{moeda(resumoGrupo.premiacao)}</div>
              </div>
              <div className="border-l border-white/20 pl-4">
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/70">Inscrição</div>
                <div className="mt-1 text-xl font-semibold">{moeda(resumoGrupo.inscricao)}</div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {erro ? (
        <div className="mb-4 border border-red-200 bg-red-50 px-3 py-2 text-[12px] font-medium text-red-700">
          {erro}
        </div>
      ) : null}

      <div className="mb-4 flex flex-wrap gap-1">
        {grupos.map((g) => (
          <button
            key={g.id}
            onClick={() => {
              setGrupoId(g.id)
              setAbaDireita('equipes')
            }}
            className={`px-3 py-2 text-[12px] font-semibold uppercase tracking-[0.08em] ${
              grupoId === g.id
                ? 'bg-sky-500 text-white'
                : 'border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50'
            }`}
          >
            {g.nome}
          </button>
        ))}
      </div>

      {grupoAtivo && resumoGrupo ? (
        <>
          <div className="grid gap-3 xl:grid-cols-[minmax(0,820px)_430px] xl:justify-center">
            <section className="border border-zinc-200 bg-white">
              <div className="border-b border-zinc-200 px-3 py-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-[16px] font-semibold uppercase text-[#142340]">Painel do horário</h2>
                    <p className="text-[12px] text-zinc-500">
                      Equipes, tabela e MVP em abas. Súmula fica disponível apenas para administradores.
                    </p>
                  </div>

                  <BadgeStatus status={grupoAtivo.status} />
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-zinc-500 md:grid-cols-4">
                  <div className="border border-zinc-200 bg-zinc-50 px-3 py-2">
                    <div className="text-[9px] font-bold uppercase tracking-[0.14em] text-zinc-400">Horário</div>
                    <div className="mt-1 font-semibold text-[#142340]">
                      {formatarHora(grupoAtivo.horario_inicio)}
                      {grupoAtivo.horario_fim ? ` - ${formatarHora(grupoAtivo.horario_fim)}` : ''}
                    </div>
                  </div>
                  <div className="border border-zinc-200 bg-zinc-50 px-3 py-2">
                    <div className="text-[9px] font-bold uppercase tracking-[0.14em] text-zinc-400">Quedas</div>
                    <div className="mt-1 font-semibold text-[#142340]">{grupoAtivo.qtd_quedas || 0}</div>
                  </div>
                  <div className="border border-zinc-200 bg-zinc-50 px-3 py-2">
                    <div className="text-[9px] font-bold uppercase tracking-[0.14em] text-zinc-400">Slots</div>
                    <div className="mt-1 font-semibold text-[#142340]">{resumoGrupo.ocupados} / {resumoGrupo.totalSlots}</div>
                  </div>
                  <div className="border border-zinc-200 bg-zinc-50 px-3 py-2">
                    <div className="text-[9px] font-bold uppercase tracking-[0.14em] text-zinc-400">Inscrição</div>
                    <div className="mt-1 font-semibold text-[#142340]">{moeda(resumoGrupo.inscricao)}</div>
                  </div>
                </div>
              </div>

              <div className="p-3">
                <div className="border border-zinc-200 bg-white">
                  <div className={`grid ${podeGerenciar ? 'grid-cols-4' : 'grid-cols-3'} border-b border-zinc-200 bg-zinc-50 p-2`}>
                    <button
                      onClick={() => setAbaDireita('equipes')}
                      className={`h-11 border text-[11px] font-semibold uppercase tracking-[0.14em] ${
                        abaDireita === 'equipes'
                          ? 'border-sky-500 bg-sky-500 text-white'
                          : 'border-zinc-200 bg-white text-zinc-600 hover:border-sky-200 hover:text-sky-700'
                      }`}
                    >
                      Equipes
                    </button>

                    <button
                      onClick={() => setAbaDireita('tabela')}
                      className={`h-11 border text-[11px] font-semibold uppercase tracking-[0.14em] ${
                        abaDireita === 'tabela'
                          ? 'border-sky-500 bg-sky-500 text-white'
                          : 'border-zinc-200 bg-white text-zinc-600 hover:border-sky-200 hover:text-sky-700'
                      }`}
                    >
                      Tabela
                    </button>

                    {podeGerenciar ? (
                      <button
                        onClick={() => setAbaDireita('sumula')}
                        className={`h-11 border text-[11px] font-semibold uppercase tracking-[0.14em] ${
                          abaDireita === 'sumula'
                            ? 'border-sky-500 bg-sky-500 text-white'
                            : 'border-zinc-200 bg-white text-zinc-600 hover:border-sky-200 hover:text-sky-700'
                        }`}
                      >
                        Súmula
                      </button>
                    ) : null}

                    <button
                      onClick={() => setAbaDireita('mvp')}
                      className={`h-11 border text-[11px] font-semibold uppercase tracking-[0.14em] ${
                        abaDireita === 'mvp'
                          ? 'border-sky-500 bg-sky-500 text-white'
                          : 'border-zinc-200 bg-white text-zinc-600 hover:border-sky-200 hover:text-sky-700'
                      }`}
                    >
                      MVP
                    </button>
                  </div>

                  <div className="min-h-[620px] p-3">
                    {abaDireita === 'equipes' && (
                      <div>
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <h3 className="text-[14px] font-semibold uppercase text-[#142340]">Slots do horário</h3>
                            <p className="text-[12px] text-zinc-500">Equipes confirmadas e vagas disponíveis.</p>
                          </div>
                          <span className="border border-emerald-100 bg-emerald-50 px-3 py-2 text-[11px] font-semibold uppercase text-emerald-700">
                            {Math.max(resumoGrupo.totalSlots - resumoGrupo.ocupados, 0)} livres
                          </span>
                        </div>

                        <div className="mb-3 grid gap-2 md:grid-cols-[minmax(0,1fr)_170px]">
                          {podeGerenciar ? (
                            <button
                              onClick={() => {
                                const primeiroLivre = slotsComEquipe.find((s) => !s.equipe)
                                if (primeiroLivre) {
                                  setModoSlotModal('gerenciar')
                                  setSlotModal(primeiroLivre)
                                  setEquipeSelecionadaId('')
                                  setLineSelecionadaId('')
                                }
                              }}
                              className="inline-flex h-11 items-center justify-center gap-2 border border-sky-200 bg-sky-50 px-3 text-[12px] font-semibold uppercase tracking-[0.08em] text-sky-700 transition hover:bg-sky-100"
                            >
                              <UserPlus size={14} />
                              Adicionar participante
                            </button>
                          ) : (
                            <button
                              onClick={abrirCompraVaga}
                              disabled={resumoGrupo.ocupados >= resumoGrupo.totalSlots}
                              className="inline-flex h-11 items-center justify-center gap-2 border border-blue-600 bg-blue-600 px-3 text-[12px] font-semibold uppercase tracking-[0.08em] text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:border-zinc-200 disabled:bg-zinc-100 disabled:text-zinc-400"
                            >
                              <Wallet size={14} />
                              {resumoGrupo.inscricao > 0 ? `Comprar vaga • ${moeda(resumoGrupo.inscricao)}` : 'Inscrever grátis'}
                            </button>
                          )}

                          {!podeGerenciar ? (
                            <div className="flex h-11 items-center border border-blue-100 bg-blue-50 px-3 text-[12px] font-semibold text-blue-800">
                              Saldo: {saldoCarteira === null ? 'entrar para consultar' : moeda(saldoCarteira)}
                            </div>
                          ) : (
                            <div className="flex h-11 items-center border border-zinc-200 bg-zinc-50 px-3 text-[12px] font-semibold text-zinc-600">
                              {resumoGrupo.ocupados} / {resumoGrupo.totalSlots} ocupadas
                            </div>
                          )}
                        </div>

                        <div className="max-h-[560px] space-y-2 overflow-y-auto pr-1">
                          {slotsComEquipe.length === 0 ? (
                            <div className="border border-dashed border-zinc-200 bg-zinc-50 px-3 py-10 text-center text-[12px] text-zinc-500">Nenhum slot encontrado.</div>
                          ) : (
                            slotsComEquipe.map((slot) => {
                              const ocupado = !!slot.equipe
                              const podeComprarSlot = !podeGerenciar && !ocupado

                              return (
                                <div
                                  key={slot.id}
                                  onClick={() => {
                                    if (!podeGerenciar) return
                                    setModoSlotModal('gerenciar')
                                    setSlotModal(slot)
                                    setEquipeSelecionadaId('')
                                    setLineSelecionadaId('')
                                  }}
                                  className={`grid grid-cols-[38px_38px_minmax(0,1fr)_auto] items-center gap-2 border px-2 py-2 text-left transition ${
                                    ocupado
                                      ? 'border-sky-100 bg-sky-50 hover:bg-sky-100'
                                      : 'border-zinc-200 bg-white hover:bg-zinc-50'
                                  } ${podeGerenciar ? 'cursor-pointer' : ''}`}
                                >
                                  <div className={`flex h-9 w-9 items-center justify-center border text-[12px] font-semibold ${
                                    ocupado
                                      ? 'border-sky-200 bg-white text-sky-700'
                                      : 'border-zinc-200 bg-zinc-50 text-zinc-600'
                                  }`}>
                                    {slot.slot_numero}
                                  </div>

                                  <div className="h-9 w-9 border border-zinc-200 bg-zinc-50">
                                    {slot.equipe?.logo_url ? (
                                      <img src={slot.equipe.logo_url} alt={slot.equipe.nome} className="h-full w-full object-cover" />
                                    ) : null}
                                  </div>

                                  <div className="min-w-0">
                                    <div className="truncate text-[12px] font-semibold uppercase text-[#142340]">
                                      {slot.equipe?.nome || 'SLOT LIVRE'}
                                    </div>
                                    <div className={`text-[9px] font-semibold uppercase tracking-[0.10em] ${ocupado ? 'text-emerald-600' : 'text-zinc-400'}`}>
                                      {ocupado ? 'Confirmada' : 'Livre'}
                                    </div>
                                  </div>

                                  {podeComprarSlot ? (
                                    <button
                                      type="button"
                                      onClick={(event) => {
                                        event.stopPropagation()
                                        setModoSlotModal('comprar')
                                        setSlotModal(slot)
                                        setEquipeSelecionadaId('')
                                        setLineSelecionadaId('')
                                      }}
                                      className="h-9 border border-blue-600 bg-blue-600 px-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-white transition hover:brightness-110"
                                    >
                                      Comprar
                                    </button>
                                  ) : (
                                    <div className="h-9 w-[74px]" />
                                  )}
                                </div>
                              )
                            })
                          )}
                        </div>
                      </div>
                    )}

                    {abaDireita === 'tabela' && (
                      <div>
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <h3 className="text-[14px] font-semibold uppercase text-[#142340]">Tabela do horário</h3>
                            <p className="text-[12px] text-zinc-500">Classificação pública das equipes neste horário.</p>
                          </div>

                        </div>

                        <div className="overflow-hidden border border-zinc-200">
                          <div className="grid grid-cols-[46px_minmax(0,1fr)_66px_72px_72px_78px] bg-zinc-50 px-2 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
                            <div>#</div>
                            <div>Participante</div>
                            <div className="text-center">Part.</div>
                            <div className="text-center">Booyah</div>
                            <div className="text-center">Abates</div>
                            <div className="text-center">Pontos</div>
                          </div>

                          {linhasTabela.length > 0 ? (
                            linhasTabela.map((linha, index) => (
                              <div key={linha.key} className="grid grid-cols-[46px_minmax(0,1fr)_66px_72px_72px_78px] items-center border-t border-zinc-200 bg-white px-2 py-2 text-[12px]">
                                <div className="font-semibold text-[#142340]">{index + 1}</div>
                                <div className="flex min-w-0 items-center gap-2">
                                  <div className="h-7 w-7 border border-zinc-200 bg-zinc-50">
                                    {linha.logo_url ? <img src={linha.logo_url} alt={linha.nome} className="h-full w-full object-cover" /> : null}
                                  </div>
                                  <div className="truncate font-medium text-[#142340]">{linha.nome}</div>
                                </div>
                                <div className="text-center font-semibold text-zinc-600">{linha.partidas}</div>
                                <div className="text-center font-semibold text-zinc-600">{linha.booyahs}</div>
                                <div className="text-center font-semibold text-zinc-600">{linha.abates}</div>
                                <div className="text-center font-semibold text-sky-600">{linha.pontos}</div>
                              </div>
                            ))
                          ) : (
                            <div className="border-t border-zinc-200 px-3 py-10 text-center text-[12px] text-zinc-500">
                              Nenhum resultado lançado ainda.
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {abaDireita === 'mvp' && (
                      <div>
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <h3 className="text-[14px] font-semibold uppercase text-[#142340]">MVP do horário</h3>
                            <p className="text-[12px] text-zinc-500">Ranking de atletas por abates no padrão LEALT.</p>
                          </div>
                          <span className="border border-emerald-100 bg-emerald-50 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-700">
                            {linhasMvp.filter((item) => item.abates > 0).length} atletas pontuando
                          </span>
                        </div>

                        <div className="overflow-hidden border border-zinc-200 bg-white">
                          <div className="grid grid-cols-[48px_minmax(0,1fr)_72px_72px] border-b border-zinc-200 bg-zinc-50 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
                            <div>Rank</div>
                            <div>Atleta / Equipe</div>
                            <div className="text-center">Quedas</div>
                            <div className="text-center">Abates</div>
                          </div>

                          {linhasMvp.length > 0 ? (
                            linhasMvp.slice(0, 12).map((item, index) => {
                              const destaque = index === 0
                              const medalha = index === 0 ? 'bg-amber-50 text-amber-700 border-amber-200' : index === 1 ? 'bg-slate-50 text-slate-700 border-slate-200' : index === 2 ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-white text-[#142340] border-zinc-200'

                              return (
                                <div
                                  key={item.key}
                                  className={`grid grid-cols-[48px_minmax(0,1fr)_72px_72px] items-center border-b border-zinc-100 px-3 py-2 text-[12px] last:border-b-0 ${destaque ? 'bg-blue-50/70' : 'bg-white'}`}
                                >
                                  <div>
                                    <span className={`inline-flex h-8 w-8 items-center justify-center border text-[11px] font-bold ${medalha}`}>
                                      {index + 1}º
                                    </span>
                                  </div>

                                  <div className="flex min-w-0 items-center gap-2">
                                    <div className="h-8 w-8 overflow-hidden border border-zinc-200 bg-zinc-50">
                                      {item.equipe_logo ? (
                                        <img src={item.equipe_logo} alt={item.equipe} className="h-full w-full object-cover" />
                                      ) : null}
                                    </div>
                                    <div className="min-w-0">
                                      <div className="truncate text-[12px] font-semibold uppercase text-[#142340]">{item.nick}</div>
                                      <div className="truncate text-[9px] font-semibold uppercase tracking-[0.10em] text-zinc-500">{item.equipe}</div>
                                    </div>
                                  </div>

                                  <div className="text-center text-[12px] font-semibold text-zinc-600">{item.abates > 0 ? Math.max(1, jogoIdsDoGrupo.length || 1) : 0}</div>
                                  <div className="text-center">
                                    <span className="inline-flex min-w-10 justify-center border border-emerald-100 bg-emerald-50 px-2 py-1 text-[12px] font-bold text-emerald-700">
                                      {item.abates}
                                    </span>
                                  </div>
                                </div>
                              )
                            })
                          ) : (
                            <div className="px-3 py-10 text-center text-[12px] text-zinc-500">Nenhum MVP registrado ainda.</div>
                          )}
                        </div>
                      </div>
                    )}

                    {podeGerenciar && abaDireita === 'sumula' && (
                      <div>
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <h3 className="text-[14px] font-semibold uppercase text-[#142340]">Súmula administrativa</h3>
                            <p className="text-[12px] text-zinc-500">Área exclusiva para donos e ajudantes do campeonato.</p>
                          </div>
                          <button
                            onClick={() => setAbaDireita('tabela')}
                            className="h-9 border border-zinc-200 bg-white px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-600 hover:bg-zinc-50"
                          >
                            Voltar tabela
                          </button>
                        </div>

                        <div className="mb-3 flex flex-wrap gap-1">
                          {quedasDoGrupo.length > 0 ? (
                            quedasDoGrupo.map((queda) => (
                              <button
                                key={queda.id}
                                onClick={() => setQuedaAtiva(queda.id)}
                                className={`px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] ${
                                  quedaAtiva === queda.id ? 'bg-sky-500 text-white' : 'border border-zinc-200 bg-white text-zinc-600'
                                }`}
                              >
                                {queda.titulo}
                              </button>
                            ))
                          ) : (
                            Array.from({ length: Number(grupoAtivo.qtd_quedas || 0) }).map((_, index) => (
                              <span key={`queda-placeholder-${index}`} className="border border-zinc-200 bg-white px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-600">
                                Queda {index + 1}
                              </span>
                            ))
                          )}
                        </div>

                        <div className="mb-3 border border-zinc-200 bg-zinc-50 px-3 py-2 text-[12px] text-zinc-500">
                          {quedaAtiva && quedasDoGrupo.find((q) => q.id === quedaAtiva)
                            ? `${quedasDoGrupo.find((q) => q.id === quedaAtiva)?.titulo} • ${quedasDoGrupo.find((q) => q.id === quedaAtiva)?.mapa}`
                            : 'Sem queda selecionada'}
                        </div>

                        <div className="border border-zinc-200 bg-zinc-50 p-2">
                          {jogosDoGrupo.length > 0 ? (
                            <SumulaPartida
                              key={`${grupoAtivo?.id || 'grupo'}-${quedaSelecionada?.id || quedaAtiva || jogosDoGrupo[0]?.id || 'jogo'}`}
                              faseInicialId={grupoAtivo?.fase_id || undefined}
                              jogoInicialId={quedaSelecionada?.jogoId || jogosDoGrupo[0]?.id || undefined}
                            />
                          ) : (
                            <div className="px-3 py-6 text-center text-[12px] text-zinc-500">Nenhum jogo cadastrado para este horário.</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>

            <aside className="flex min-h-[620px] flex-col border border-zinc-200 bg-white">
              <div className="grid grid-cols-2 border-b border-zinc-200 bg-zinc-50 p-2">
                <button
                  onClick={() => setAbaLateral('estatisticas')}
                  className={`h-9 border text-[10px] font-semibold uppercase tracking-[0.12em] ${
                    abaLateral === 'estatisticas'
                      ? 'border-sky-500 bg-sky-500 text-white'
                      : 'border-zinc-200 bg-white text-zinc-600 hover:border-sky-200 hover:text-sky-700'
                  }`}
                >
                  Estatísticas
                </button>
                <button
                  onClick={() => setAbaLateral('chat')}
                  className={`h-9 border text-[10px] font-semibold uppercase tracking-[0.12em] ${
                    abaLateral === 'chat'
                      ? 'border-sky-500 bg-sky-500 text-white'
                      : 'border-zinc-200 bg-white text-zinc-600 hover:border-sky-200 hover:text-sky-700'
                  }`}
                >
                  Chat
                </button>
              </div>

              {abaLateral === 'estatisticas' ? (
                <div className="flex-1 overflow-y-auto p-3">
                  <div className="mb-3 flex items-center gap-2 text-[#142340]">
                    <BarChart3 size={16} className="text-sky-600" />
                    <div>
                      <h2 className="text-[14px] font-semibold uppercase">Estatísticas da queda</h2>
                      <p className="text-[11px] text-zinc-500">Selecione uma queda e acompanhe os dados visuais.</p>
                    </div>
                  </div>

                  <select
                    value={quedaAtiva || quedaSelecionada?.id || ''}
                    onChange={(e) => setQuedaAtiva(e.target.value)}
                    className="mb-3 h-10 w-full border border-zinc-200 bg-white px-3 text-[12px] font-semibold text-[#142340] outline-none focus:border-sky-500"
                  >
                    {quedasDoGrupo.length > 0 ? (
                      quedasDoGrupo.map((queda) => (
                        <option key={queda.id} value={queda.id}>
                          {queda.titulo} • {queda.mapa}
                        </option>
                      ))
                    ) : (
                      <option value="">Sem queda</option>
                    )}
                  </select>

                  <div className="mb-3 grid grid-cols-3 gap-2">
                    <div className="border border-sky-100 bg-sky-50 p-2">
                      <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-sky-700">Equipes</div>
                      <div className="mt-1 text-xl font-bold text-[#142340]">{estatisticasQuedaSelecionada.equipes.length}</div>
                    </div>
                    <div className="border border-emerald-100 bg-emerald-50 p-2">
                      <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-emerald-700">Abates</div>
                      <div className="mt-1 text-xl font-bold text-[#142340]">
                        {estatisticasQuedaSelecionada.equipes.reduce((acc, row) => acc + Number(row.abates || 0), 0)}
                      </div>
                    </div>
                    <div className="border border-violet-100 bg-violet-50 p-2">
                      <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-violet-700">Pontos</div>
                      <div className="mt-1 text-xl font-bold text-[#142340]">
                        {estatisticasQuedaSelecionada.equipes.reduce((acc, row) => acc + Number(row.pontos || 0), 0)}
                      </div>
                    </div>
                  </div>

                  <div className="mb-4 border border-zinc-200 bg-white p-3">
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="text-[12px] font-semibold uppercase text-[#142340]">Equipes</h3>
                      <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-400">Posição • Pontos • Abates</span>
                    </div>
                    <div className="space-y-2">
                      {estatisticasQuedaSelecionada.equipes.length > 0 ? (
                        estatisticasQuedaSelecionada.equipes.slice(0, 12).map((linha, index) => {
                          const larguraPontos = Math.max(6, Math.round((Number(linha.pontos || 0) / estatisticasQuedaSelecionada.maxPontos) * 100))
                          const larguraAbates = Math.max(6, Math.round((Number(linha.abates || 0) / estatisticasQuedaSelecionada.maxAbates) * 100))

                          return (
                            <div key={`stats-equipe-${linha.nome}-${index}`} className="border border-zinc-100 bg-zinc-50 p-2">
                              <div className="mb-2 flex items-center justify-between gap-2">
                                <div className="flex min-w-0 items-center gap-2">
                                  <span className="flex h-6 w-6 items-center justify-center bg-sky-600 text-[11px] font-bold text-white">{linha.posicao || index + 1}</span>
                                  <span className="truncate text-[11px] font-bold uppercase text-[#142340]">{linha.nome}</span>
                                </div>
                                <span className="text-[11px] font-bold text-sky-700">{linha.pontos} pts</span>
                              </div>
                              <div className="mb-1 h-2 bg-white">
                                <div className="h-2 bg-sky-500" style={{ width: `${larguraPontos}%` }} />
                              </div>
                              <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                                <span>{linha.abates} abates</span>
                                <div className="h-1 flex-1 bg-white">
                                  <div className="h-1 bg-emerald-500" style={{ width: `${larguraAbates}%` }} />
                                </div>
                              </div>
                            </div>
                          )
                        })
                      ) : (
                        <div className="border border-dashed border-zinc-200 bg-zinc-50 px-3 py-6 text-center text-[12px] text-zinc-500">
                          Sem estatísticas de equipes para esta queda.
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="border border-zinc-200 bg-white p-3">
                    <div className="mb-3 flex items-center gap-2">
                      <Activity size={14} className="text-emerald-600" />
                      <h3 className="text-[12px] font-semibold uppercase text-[#142340]">Jogadores</h3>
                    </div>
                    <div className="space-y-2">
                      {estatisticasQuedaSelecionada.jogadores.length > 0 ? (
                        estatisticasQuedaSelecionada.jogadores.map((jogador, index) => {
                          const largura = Math.max(6, Math.round((Number(jogador.abates || 0) / estatisticasQuedaSelecionada.maxAbatesJogadores) * 100))
                          return (
                            <div key={jogador.key} className="border border-zinc-100 bg-zinc-50 p-2">
                              <div className="mb-1 flex items-center justify-between gap-2">
                                <span className="truncate text-[11px] font-bold uppercase text-[#142340]">#{index + 1} {jogador.nick}</span>
                                <span className="text-[11px] font-bold text-emerald-700">{jogador.abates} abates</span>
                              </div>
                              <div className="h-2 bg-white">
                                <div className="h-2 bg-emerald-500" style={{ width: `${largura}%` }} />
                              </div>
                            </div>
                          )
                        })
                      ) : (
                        <div className="border border-dashed border-zinc-200 bg-zinc-50 px-3 py-6 text-center text-[12px] text-zinc-500">
                          Sem abates de jogadores registrados nesta queda.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="border-b border-zinc-200 px-3 py-3">
                    <div className="flex items-center gap-2 text-[#142340]">
                      <MessageCircle size={16} className="text-sky-600" />
                      <h2 className="text-[14px] font-semibold uppercase">Chat ao vivo</h2>
                    </div>
                    <p className="mt-1 text-[11px] text-zinc-500">Interação da comunidade durante o horário.</p>
                  </div>

                  <div className="flex-1 space-y-2 overflow-y-auto bg-zinc-50 p-3">
                    {chatMensagens.map((mensagem) => (
                      <div key={mensagem.id} className="border border-zinc-200 bg-white px-3 py-2">
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <span className="text-[11px] font-semibold uppercase text-[#142340]">{mensagem.autor}</span>
                          <span className="text-[10px] text-zinc-400">{mensagem.horario}</span>
                        </div>
                        <p className="text-[12px] leading-5 text-zinc-600">{mensagem.texto}</p>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-zinc-200 p-3">
                    <div className="flex gap-2">
                      <input
                        value={mensagemChat}
                        onChange={(e) => setMensagemChat(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') enviarMensagemChat()
                        }}
                        placeholder="Enviar mensagem..."
                        className="h-10 min-w-0 flex-1 border border-zinc-200 bg-white px-3 text-[12px] text-[#142340] outline-none focus:border-sky-500"
                      />
                      <button
                        onClick={enviarMensagemChat}
                        className="flex h-10 w-10 items-center justify-center border border-sky-600 bg-sky-600 text-white hover:brightness-110"
                        aria-label="Enviar mensagem"
                      >
                        <Send size={15} />
                      </button>
                    </div>
                    <div className="mt-2 text-[10px] text-zinc-400">Chat visual em tempo real na página. Persistência no banco pode ser ligada depois.</div>
                  </div>
                </>
              )}
            </aside>

          </div>
        </>
      ) : (
        <div className="border border-dashed border-zinc-200 bg-white px-4 py-10 text-center text-sm text-zinc-500">
          Nenhum horário encontrado neste diário.
        </div>
      )}

      {slotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
          <div className="w-full max-w-lg border border-zinc-200 bg-white p-4 ">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-600">
                  Slot {slotModal.slot_numero}
                </div>
                <h3 className="mt-1 text-lg font-semibold text-[#142340]">
                  {modoSlotModal === 'comprar' ? 'Comprar vaga com carteira' : slotModal.equipe ? 'Editar slot' : 'Adicionar participante'}
                </h3>
              </div>

              <button
                onClick={() => {
                  setSlotModal(null)
                  setEquipeSelecionadaId('')
                  setLineSelecionadaId('')
                }}
                className="border border-zinc-200 bg-white p-2 text-zinc-600 transition hover:bg-zinc-50"
              >
                <X size={14} />
              </button>
            </div>

            <div className="mb-4 border border-zinc-200 bg-zinc-50 p-3">
              <div className="mb-2 text-[10px] uppercase tracking-[0.12em] text-zinc-500">
                Situação atual
              </div>

              {slotModal.equipe ? (
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 border border-zinc-200 bg-zinc-50">
                    {slotModal.equipe.logo_url ? (
                      <img
                        src={slotModal.equipe.logo_url}
                        alt={slotModal.equipe.nome}
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                  </div>
                  <div>
                    <div className="font-medium text-[#142340]">{slotModal.equipe.nome}</div>
                    <div className="text-[12px] text-zinc-500">Slot ocupado</div>
                  </div>
                </div>
              ) : (
                <div className="text-[12px] text-zinc-500">Este slot está livre.</div>
              )}
            </div>

            <div className="mb-4">
              <label className="mb-2 block text-[12px] font-semibold text-zinc-600">
                Selecionar participante
              </label>
              <div className="mb-2 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setTipoParticipanteSlot('equipe')
                    setLineSelecionadaId('')
                  }}
                  className={`h-9 border text-[11px] font-semibold uppercase ${
                    tipoParticipanteSlot === 'equipe'
                      ? 'border-sky-500 bg-sky-500 text-white'
                      : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50'
                  }`}
                >
                  Equipe
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTipoParticipanteSlot('line')
                    setEquipeSelecionadaId('')
                  }}
                  className={`h-9 border text-[11px] font-semibold uppercase ${
                    tipoParticipanteSlot === 'line'
                      ? 'border-sky-500 bg-sky-500 text-white'
                      : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50'
                  }`}
                >
                  Line
                </button>
              </div>

              {tipoParticipanteSlot === 'equipe' ? (
                <select
                  value={equipeSelecionadaId}
                  onChange={(e) => setEquipeSelecionadaId(e.target.value)}
                  className="h-10 w-full border border-zinc-200 bg-white px-3 text-[12px] font-medium text-[#142340] outline-none focus:border-sky-500"
                >
                  <option value="">{equipesDisponiveis.length > 0 ? 'Selecione uma equipe' : 'Nenhuma equipe vinculada ao seu usuário'}</option>
                  {equipesDisponiveis.map((equipe) => (
                    <option key={equipe.id} value={equipe.id}>
                      {equipe.nome}
                    </option>
                  ))}
                </select>
              ) : (
                <select
                  value={lineSelecionadaId}
                  onChange={(e) => setLineSelecionadaId(e.target.value)}
                  className="h-10 w-full border border-zinc-200 bg-white px-3 text-[12px] font-medium text-[#142340] outline-none focus:border-sky-500"
                >
                  <option value="">{linesDisponiveis.length > 0 ? 'Selecione uma line' : 'Nenhuma line vinculada ao seu usuário'}</option>
                  {linesDisponiveis.map((line) => (
                    <option key={line.id} value={line.id}>
                      {line.nome}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {modoSlotModal === 'comprar' ? (
              <div className="space-y-2">
                <div className="border border-blue-100 bg-blue-50 px-3 py-2 text-[12px] text-blue-900">
                  Pagamento pela carteira: <strong>{moeda(resumoGrupo?.inscricao || 0)}</strong>
                  {saldoCarteira !== null ? ` • Saldo disponível: ${moeda(saldoCarteira)}` : ''}
                </div>
                <button
                  onClick={comprarVagaComCarteira}
                  disabled={!(tipoParticipanteSlot === 'line' ? lineSelecionadaId : equipeSelecionadaId) || salvandoSlot}
                  className="inline-flex h-10 w-full items-center justify-center gap-2 border border-blue-600 bg-blue-600 text-[12px] font-semibold uppercase tracking-[0.08em] text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Wallet size={14} />
                  {salvandoSlot ? 'Processando...' : 'Confirmar e pagar com saldo'}
                </button>
              </div>
            ) : (
              <div className="grid gap-2 md:grid-cols-2">
                <button
                  onClick={adicionarParticipanteNoSlot}
                  disabled={!(tipoParticipanteSlot === 'line' ? lineSelecionadaId : equipeSelecionadaId) || salvandoSlot}
                  className="inline-flex h-10 items-center justify-center gap-2 border border-sky-500 bg-sky-500 text-[12px] font-medium text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Plus size={14} />
                  {salvandoSlot ? 'Salvando...' : 'Salvar participante'}
                </button>

                <button
                  onClick={removerEquipeDoSlot}
                  disabled={!slotModal.equipe || salvandoSlot}
                  className="inline-flex h-10 items-center justify-center gap-2 border border-red-200 bg-red-50 text-[12px] font-medium text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <X size={14} />
                  Remover participante
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
