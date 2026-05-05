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
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getTipoVisual } from '@/lib/getTipoVisual'
import SumulaPartida from '@/app/campeonatos/[id]/components/SumulaPartida'
import MVPTable from '@/app/campeonatos/[id]/components/MVPTable'

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

type ResultadoMvp = {
  id: string
  campeonato_id: string
  jogo_id: string
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
  const [abaDireita, setAbaDireita] = useState<'tabela' | 'sumula' | 'mvp'>('tabela')

  const [slots, setSlots] = useState<Slot[]>([])
  const [campeonatoEquipes, setCampeonatoEquipes] = useState<CampeonatoEquipe[]>([])
  const [equipesOficiais, setEquipesOficiais] = useState<EquipeOficial[]>([])
  const [equipesAvulsas, setEquipesAvulsas] = useState<EquipeAvulsa[]>([])
  const [lines, setLines] = useState<Line[]>([])
  const [jogos, setJogos] = useState<Jogo[]>([])
  const [resultadosJogos, setResultadosJogos] = useState<ResultadoJogo[]>([])
  const [resultadosMvp, setResultadosMvp] = useState<ResultadoMvp[]>([])

  const [equipesDisponiveis, setEquipesDisponiveis] = useState<EquipeOficial[]>([])
  const [linesDisponiveis, setLinesDisponiveis] = useState<Line[]>([])
  const [tipoParticipanteSlot, setTipoParticipanteSlot] = useState<'equipe' | 'line'>('equipe')
  const [slotModal, setSlotModal] = useState<SlotComEquipe | null>(null)
  const [equipeSelecionadaId, setEquipeSelecionadaId] = useState('')
  const [lineSelecionadaId, setLineSelecionadaId] = useState('')
  const [quedaAtiva, setQuedaAtiva] = useState<string>('')

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
    return jogosDoGrupo.map((jogo, index) => ({
      id: `${jogo.id}-${jogo.numero_queda || index + 1}`,
      jogoId: jogo.id,
      titulo:
        jogo.nome ||
        jogo.nome_bloco ||
        `Queda ${jogo.numero_queda || index + 1}`,
      mapa: normalizarMapa(jogo.mapa),
      ordem: Number(jogo.numero_queda || index + 1),
    }))
  }, [jogosDoGrupo])

  useEffect(() => {
    if (!quedaAtiva && quedasDoGrupo[0]) {
      setQuedaAtiva(quedasDoGrupo[0].jogoId)
    }
    if (quedaAtiva && !quedasDoGrupo.some((q) => q.jogoId === quedaAtiva)) {
      setQuedaAtiva(quedasDoGrupo[0]?.jogoId || '')
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

  const linhasSumula = useMemo(() => {
    const resultadoMap = new Map<string, ResultadoJogo>()
    const jogoAtual = String(quedaAtiva || '').trim()

    if (jogoAtual) {
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
  }, [slotsComEquipe, resultadosJogos, quedaAtiva, grupoAtivo, campeonatoEquipeMap])

  async function carregar() {
    if (!campeonatoId) return

    setLoading(true)
    setErro('')

    try {
      const [
        campeonatoRes,
        gruposRes,
        slotsRes,
        campeonatoEquipesRes,
        jogosRes,
        resultadosJogosRes,
        resultadosMvpRes,
        equipesDisponiveisRes,
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
          .select('id, campeonato_id, grupo_id, fase_id, nome, nome_bloco, numero_queda, mapa, data_hora, configuracao')
          .eq('campeonato_id', campeonatoId)
          .order('created_at', { ascending: true }),
        supabase
          .from('resultados_jogos')
          .select('id, campeonato_id, fase_id, jogo_id, equipe_id, grupo_id, mapa, posicao, abates, total_pontos')
          .eq('campeonato_id', campeonatoId),
        supabase
          .from('resultados_mvp')
          .select('id, campeonato_id, jogo_id, grupo_id, equipe_id, equipe_avulsa_id, perfil_jogo_id, jogador_campeonato_id, nick_snapshot, uid_jogo_snapshot, abates, dano, assistencias, revives')
          .eq('campeonato_id', campeonatoId),
        supabase.from('equipes').select('id, nome, logo_url').order('nome', { ascending: true }),
      ])

      if (campeonatoRes.error) throw campeonatoRes.error
      if (gruposRes.error) throw gruposRes.error
      if (slotsRes.error) throw slotsRes.error
      if (campeonatoEquipesRes.error) throw campeonatoEquipesRes.error
      if (jogosRes.error) throw jogosRes.error
      if (resultadosJogosRes.error) throw resultadosJogosRes.error
      if (resultadosMvpRes.error) throw resultadosMvpRes.error
      if (equipesDisponiveisRes.error) throw equipesDisponiveisRes.error

      const campeonatoEquipesRows = (campeonatoEquipesRes.data || []) as CampeonatoEquipe[]

      const equipeIds = Array.from(new Set(campeonatoEquipesRows.map((row) => String(row.equipe_id || '').trim()).filter(Boolean)))
      const equipeAvulsaIds = Array.from(new Set(campeonatoEquipesRows.map((row) => String(row.equipe_avulsa_id || '').trim()).filter(Boolean)))
      const lineIds = Array.from(new Set(campeonatoEquipesRows.map((row) => String(row.line_id || '').trim()).filter(Boolean)))

      const [equipesOficiaisRes, equipesAvulsasRes, linesRes, minhasLinesRes] = await Promise.all([
        equipeIds.length > 0
          ? supabase.from('equipes').select('id, nome, logo_url').in('id', equipeIds)
          : Promise.resolve({ data: [], error: null as any }),
        equipeAvulsaIds.length > 0
          ? supabase.from('equipes_avulsas_campeonato').select('id, nome, logo_url').in('id', equipeAvulsaIds)
          : Promise.resolve({ data: [], error: null as any }),
        lineIds.length > 0
          ? supabase.from('lines').select('id, nome, logo_url, equipe_id, plataforma, ativa').in('id', lineIds)
          : Promise.resolve({ data: [], error: null as any }),
        supabase.from('lines').select('id, nome, logo_url, equipe_id, plataforma, ativa').eq('ativa', true).order('nome', { ascending: true }),
      ])

      if (equipesOficiaisRes.error) throw equipesOficiaisRes.error
      if (equipesAvulsasRes.error) throw equipesAvulsasRes.error
      if (linesRes.error) throw linesRes.error
      if (minhasLinesRes.error) throw minhasLinesRes.error

      setCampeonato(campeonatoRes.data as Campeonato)
      setGrupos((gruposRes.data || []) as Grupo[])
      setSlots((slotsRes.data || []) as Slot[])
      setCampeonatoEquipes(campeonatoEquipesRows)
      setEquipesOficiais((equipesOficiaisRes.data || []) as EquipeOficial[])
      setEquipesAvulsas((equipesAvulsasRes.data || []) as EquipeAvulsa[])
      setLines((linesRes.data || []) as Line[])
      setJogos((jogosRes.data || []) as Jogo[])
      setResultadosJogos((resultadosJogosRes.data || []) as ResultadoJogo[])
      setResultadosMvp((resultadosMvpRes.data || []) as ResultadoMvp[])
      setEquipesDisponiveis((equipesDisponiveisRes.data || []) as EquipeOficial[])
      setLinesDisponiveis((minhasLinesRes.data || []) as Line[])

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
  }, [campeonatoId])

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

      <div className={`relative mb-4 overflow-hidden border border-zinc-200 border-l-4 bg-white ${visual.borderStrong}`}>
        <div className="absolute inset-0">
          {campeonato.banner_url ? (
            <img
              src={campeonato.banner_url}
              alt={campeonato.nome}
              className="h-full w-full object-cover opacity-70"
            />
          ) : (
            <div className="h-full w-full bg-zinc-100" />
          )}
          <div className="absolute inset-0 bg-white/65" />
        </div>

        <div className="relative z-10 flex items-center gap-3 px-4 py-4">
          {campeonato.logo_url ? (
            <img
              src={campeonato.logo_url}
              alt="Logo"
              className="h-12 w-12 border border-zinc-200 bg-white object-cover"
            />
          ) : (
            <div className={`flex h-12 w-12 items-center justify-center border border-zinc-200 bg-white text-sm font-semibold ${visual.text}`}>
              {String(campeonato.nome || 'D').charAt(0).toUpperCase()}
            </div>
          )}

          <div>
            <div className={`mb-1 text-[9px] font-medium uppercase tracking-[0.18em] ${visual.text}`}>
              Diário por horários
            </div>
            <h1 className={`text-2xl font-semibold uppercase ${visual.text}`}>{campeonato.nome}</h1>
          </div>
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
              setAbaDireita('tabela')
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
          <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-4">
            <CardInfo icon={<Grid3X3 size={16} />} label="Slots" value={String(resumoGrupo.totalSlots)} />
            <CardInfo icon={<Users size={16} />} label="Ocupados" value={`${resumoGrupo.ocupados} / ${resumoGrupo.totalSlots}`} />
            <CardInfo icon={<Trophy size={16} />} label="Premiação" value={moeda(resumoGrupo.premiacao)} />
            <CardInfo icon={<Users size={16} />} label="Inscrição" value={moeda(resumoGrupo.inscricao)} />
          </div>

          <div className="grid gap-3 lg:grid-cols-[285px_minmax(0,1fr)]">
            <section className="border border-zinc-200 bg-white p-3">
              <div className="mb-3 border-b border-zinc-200 pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="text-[16px] font-semibold uppercase text-[#142340]">{grupoAtivo.nome}</h2>
                    <div className="mt-1 text-[12px] text-zinc-500">
                      {formatarHora(grupoAtivo.horario_inicio)}
                      {grupoAtivo.horario_fim ? ` - ${formatarHora(grupoAtivo.horario_fim)}` : ''}
                    </div>
                  </div>
                  <BadgeStatus status={grupoAtivo.status} />
                </div>

                <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-zinc-500">
                  <div>Quedas: {grupoAtivo.qtd_quedas || 0}</div>
                  <div className="text-right">Slots: {grupoAtivo.qtd_slots || 0}</div>
                </div>
              </div>

              <div className="mb-2">
                <button
                  onClick={() => {
                    const primeiroLivre = slotsComEquipe.find((s) => !s.equipe)
                    if (primeiroLivre) {
                      setSlotModal(primeiroLivre)
                      setEquipeSelecionadaId('')
                    }
                  }}
                  className="inline-flex h-9 w-full items-center justify-center gap-2 border border-sky-200 bg-sky-50 px-3 text-[12px] font-medium text-sky-700 transition hover:bg-sky-100"
                >
                  <UserPlus size={14} />
                  Adicionar participante
                </button>
              </div>

              <div className="border border-zinc-200">
                {slotsComEquipe.length === 0 ? (
                  <div className="px-3 py-6 text-center text-[12px] text-zinc-500">Nenhum slot encontrado.</div>
                ) : (
                  slotsComEquipe.map((slot) => {
                    const ocupado = !!slot.equipe

                    return (
                      <button
                        key={slot.id}
                        onClick={() => {
                          setSlotModal(slot)
                          setEquipeSelecionadaId('')
                        }}
                        className={`grid w-full grid-cols-[44px_36px_minmax(0,1fr)] items-center gap-2 border-b border-zinc-200 px-2 py-2 text-left transition last:border-b-0 ${
                          ocupado
                            ? 'bg-sky-50 hover:bg-sky-100'
                            : 'bg-white hover:bg-zinc-50'
                        }`}
                      >
                        <div className={`flex h-8 w-8 items-center justify-center border text-[13px] font-semibold ${
                          ocupado
                            ? 'border-sky-200 bg-sky-50 text-sky-700'
                            : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50'
                        }`}>
                          {slot.slot_numero}
                        </div>

                        <div className="h-8 w-8 border border-zinc-200 bg-zinc-50">
                          {slot.equipe?.logo_url ? (
                            <img
                              src={slot.equipe.logo_url}
                              alt={slot.equipe.nome}
                              className="h-full w-full object-cover"
                            />
                          ) : null}
                        </div>

                        <div className="min-w-0">
                          <div className="truncate text-[13px] font-medium text-[#142340]">
                            {slot.equipe?.nome || 'SLOT LIVRE'}
                          </div>
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
            </section>

            <section className="border border-zinc-200 bg-white p-3">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 pb-2">
                <div>
                  <h2 className="text-[16px] font-semibold uppercase text-[#142340]">Painel do horário</h2>
                  <p className="text-[12px] text-zinc-500">Tabela, súmula e MVP separados por horário.</p>
                </div>

                <div className="flex gap-1">
                  <button
                    onClick={() => setAbaDireita('tabela')}
                    className={`px-3 py-2 text-[12px] font-medium ${
                      abaDireita === 'tabela'
                        ? 'bg-sky-500 text-white'
                        : 'border border-zinc-200 bg-white text-zinc-600'
                    }`}
                  >
                    Tabela
                  </button>

                  <button
                    onClick={() => setAbaDireita('sumula')}
                    className={`px-3 py-2 text-[12px] font-medium ${
                      abaDireita === 'sumula'
                        ? 'bg-sky-500 text-white'
                        : 'border border-zinc-200 bg-white text-zinc-600'
                    }`}
                  >
                    Súmula
                  </button>

                  <button
                    onClick={() => setAbaDireita('mvp')}
                    className={`px-3 py-2 text-[12px] font-medium ${
                      abaDireita === 'mvp'
                        ? 'bg-sky-500 text-white'
                        : 'border border-zinc-200 bg-white text-zinc-600'
                    }`}
                  >
                    MVP
                  </button>
                </div>
              </div>

              {abaDireita === 'tabela' && (
                <div className="overflow-hidden border border-zinc-200">
                  <div className="grid grid-cols-[46px_minmax(0,1fr)_66px_72px_72px_78px] bg-zinc-50 px-2 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
                    <div>#</div>
                    <div>Participante</div>
                    <div className="text-center">Part.</div>
                    <div className="text-center">Booyah</div>
                    <div className="text-center">Abates</div>
                    <div className="text-center">Pontos</div>
                  </div>

                  {linhasTabela.map((linha, index) => (
                    <div
                      key={linha.key}
                      className="grid grid-cols-[46px_minmax(0,1fr)_66px_72px_72px_78px] items-center border-t border-zinc-200 bg-white px-2 py-2 text-[12px]"
                    >
                      <div className="font-semibold text-[#142340]">{index + 1}</div>

                      <div className="flex min-w-0 items-center gap-2">
                        <div className="h-7 w-7 border border-zinc-200 bg-zinc-50">
                          {linha.logo_url ? (
                            <img
                              src={linha.logo_url}
                              alt={linha.nome}
                              className="h-full w-full object-cover"
                            />
                          ) : null}
                        </div>
                        <div className="truncate font-medium text-[#142340]">{linha.nome}</div>
                      </div>

                      <div className="text-center font-semibold text-zinc-600">{linha.partidas}</div>
                      <div className="text-center font-semibold text-zinc-600">{linha.booyahs}</div>
                      <div className="text-center font-semibold text-zinc-600">{linha.abates}</div>
                      <div className="text-center font-semibold text-sky-600">{linha.pontos}</div>
                    </div>
                  ))}
                </div>
              )}

              {abaDireita === 'sumula' && (
                <div>
                  <div className="mb-3 flex flex-wrap gap-1">
                    {quedasDoGrupo.length > 0 ? (
                      quedasDoGrupo.map((queda) => (
                        <button
                          key={queda.id}
                          onClick={() => setQuedaAtiva(queda.jogoId)}
                          className={`px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] ${
                            quedaAtiva === queda.jogoId
                              ? 'bg-sky-500 text-white'
                              : 'border border-zinc-200 bg-white text-zinc-600'
                          }`}
                        >
                          {queda.titulo}
                        </button>
                      ))
                    ) : (
                      Array.from({ length: Number(grupoAtivo.qtd_quedas || 0) }).map((_, index) => (
                        <span
                          key={`queda-placeholder-${index}`}
                          className="border border-zinc-200 bg-white px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-600"
                        >
                          Queda {index + 1}
                        </span>
                      ))
                    )}
                  </div>

                  <div className="mb-3 border border-zinc-200 bg-zinc-50 px-3 py-2 text-[12px] text-zinc-500">
                    {quedaAtiva && quedasDoGrupo.find((q) => q.jogoId === quedaAtiva)
                      ? `${quedasDoGrupo.find((q) => q.jogoId === quedaAtiva)?.titulo} • ${
                          quedasDoGrupo.find((q) => q.jogoId === quedaAtiva)?.mapa
                        }`
                      : 'Sem queda selecionada'}
                  </div>

                  <div className="border border-zinc-200 bg-zinc-50 p-2">
                    {jogosDoGrupo.length > 0 ? (
                      <SumulaPartida
                        key={`${grupoAtivo?.id || 'grupo'}-${quedaAtiva || jogosDoGrupo[0]?.id || 'jogo'}`}
                        faseInicialId={grupoAtivo?.fase_id || undefined}
                        jogoInicialId={quedaAtiva || jogosDoGrupo[0]?.id || undefined}
                      />
                    ) : (
                      <div className="px-3 py-6 text-center text-[12px] text-zinc-500">
                        Nenhum jogo cadastrado para este horário.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {abaDireita === 'mvp' && (
                <div className="overflow-hidden border border-zinc-200 bg-zinc-50 p-2">
                  <MVPTable data={[]} />
                </div>
              )}
            </section>
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
                  {slotModal.equipe ? 'Editar slot' : 'Adicionar participante'}
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
                  <option value="">Selecione uma equipe</option>
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
                  <option value="">Selecione uma line</option>
                  {linesDisponiveis.map((line) => (
                    <option key={line.id} value={line.id}>
                      {line.nome}
                    </option>
                  ))}
                </select>
              )}
            </div>

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
          </div>
        </div>
      )}
    </div>
  )
}
