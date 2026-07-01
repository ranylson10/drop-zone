import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useMemo, useState } from 'react'
import { Alert, Dimensions, Linking, Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import * as ImageManipulator from 'expo-image-manipulator'
import * as DocumentPicker from 'expo-document-picker'
import { File } from 'expo-file-system'
import { Ionicons } from '@expo/vector-icons'
import { Screen } from '@/components/Screen'
import { BackHeader } from '@/components/BackHeader'
import { Button } from '@/components/Button'
import { InfoGrid } from '@/components/InfoGrid'
import { SectionHeader } from '@/components/SectionHeader'
import { CompactRow } from '@/components/CompactRow'
import { HeroBanner } from '@/components/HeroBanner'
import { LogoAvatar } from '@/components/LogoAvatar'
import { Body, Tiny } from '@/components/AppText'
import { mock } from '@/data/mock'
import { normalizeChampionship } from '@/lib/adapters'
import { pickImage } from '@/lib/images'
import { supabase } from '@/lib/supabase'
import { useRemoteItem } from '@/lib/useRemoteItem'
import { colors } from '@/theme/colors'
import { useTheme } from '@/theme/ThemeProvider'

type ChampionshipTeam = {
  id: string
  status?: string | null
  nome_exibicao?: string | null
  numero_vaga?: number | null
  grupo_id?: string | null
  equipe_id?: string | null
  equipe_avulsa_id?: string | null
  equipes?: TeamRef | TeamRef[] | null
  equipes_avulsas_campeonato?: TeamRef | TeamRef[] | null
}

type TeamRef = {
  id: string
  nome?: string | null
  tag?: string | null
  logo_url?: string | null
  cover_url?: string | null
}

type Fase = { id: string; nome?: string | null; slug?: string | null; ordem?: number | null }
type Grupo = { id: string; nome?: string | null; status?: string | null; qtd_slots?: number | null; qtd_quedas?: number | null; horario_inicio?: string | null; quantidade_equipes?: number | null; fase_id?: string | null; premiacao?: number | null; valor_inscricao?: number | null }
type Jogo = { id: string; nome?: string | null; nome_bloco?: string | null; mapa?: string | null; data_hora?: string | null; data_jogo?: string | null; hora_jogo?: string | null; created_at?: string | null; grupo_id?: string | null; fase_id?: string | null; numero_queda?: number | null; quedas?: any; grupos_ids?: any; configuracao?: any }
type Jogador = { id: string; nick_snapshot?: string | null; uid_jogo_snapshot?: string | null; status?: string | null; equipe_id?: string | null; equipe_avulsa_id?: string | null; campeonato_equipe_id?: string | null; jogador_avulso_id?: string | null; perfis_jogo?: { id?: string | null; nick?: string | null; uid_jogo?: string | null; foto_capa?: string | null } | { id?: string | null; nick?: string | null; uid_jogo?: string | null; foto_capa?: string | null }[] | null }
type JogadorAvulso = { id: string; campeonato_id: string; equipe_id?: string | null; equipe_avulsa_id?: string | null; nick: string; uid_jogo: string; funcao?: string | null; foto_url?: string | null; origem?: string | null }
type PerfilJogo = { id: string; nick: string; uid_jogo: string; funcao?: string | null; foto_capa?: string | null; equipe_id?: string | null }
type ResultadoJogo = { id?: string | null; equipe_id?: string | null; grupo_id?: string | null; fase_id?: string | null; posicao?: number | null; abates?: number | null; total_pontos?: number | null }
type ResultadoMvp = { id?: string | null; jogador_campeonato_id?: string | null; perfil_jogo_id?: string | null; equipe_id?: string | null; campeonato_equipe_id?: string | null; equipe_avulsa_id?: string | null; nick_snapshot?: string | null; uid_jogo_snapshot?: string | null; abates?: number | null; partida_id?: string | null }
type TabelaRow = { id: string; nome: string; tag: string; logoUri?: string; grupo: string; partidas: number; booyahs: number; abates: number; pontos: number }
type MvpRow = { id: string; nome: string; equipe: string; tag: string; abates: number; quedas: number }
type PontuadorQueda = { id: string; jogo_id: string; fase_id?: string | null; grupo_id?: string | null; numero_partida: number; mapa: string; data_hora?: string | null; nome_bloco?: string | null }
type MatchResultTeam = { nome_equipe: string; posicao: number; abates_total: number }

type TabId = 'equipes' | 'jogadores' | 'grupos' | 'jogos' | 'tabela' | 'regras'
type TabelaView = 'tabela' | 'mvp' | 'pontuador'
const PONTOS_PADRAO = [12, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0, 0]
const FUNCOES_JOGADOR = ['SUPORTE', 'RUSH', 'SNIPER']

function extFromUri(uri: string) {
  const clean = uri.split('?')[0] || ''
  return clean.split('.').pop()?.toLowerCase() || 'jpg'
}

function first<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] || null : value
}

function texto(value: unknown, fallback = '-') {
  const str = String(value || '').trim()
  return str || fallback
}

function money(value: unknown) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function letraGrupo(value: unknown) {
  const str = texto(value)
  if (str === '-') return str
  return str.replace(/^grupo\s+/i, '').trim().slice(0, 2).toUpperCase() || str
}

function getTeam(entry: ChampionshipTeam) {
  return first(entry.equipes) || first(entry.equipes_avulsas_campeonato)
}

function getTeamPublicId(entry: ChampionshipTeam) {
  return String(entry.equipe_id || entry.equipe_avulsa_id || '').trim()
}


function parseJsonLike(value: any) {
  if (!value) return value
  if (typeof value !== 'string') return value
  try { return JSON.parse(value) } catch { return value }
}

function getGrupoIdDoJogoMobile(jogo: Partial<Jogo>) {
  const direto = String(jogo?.grupo_id || '').trim()
  if (direto) return direto
  const gruposIds = parseJsonLike(jogo?.grupos_ids)
  if (Array.isArray(gruposIds)) return String(gruposIds[0] || '').trim()
  if (gruposIds) return String(gruposIds).split(',')[0]?.trim() || ''
  const cfg = parseJsonLike(jogo?.configuracao) || {}
  return String(cfg?.grupo_id || '').trim()
}

function getGrupoIdsDoJogoMobile(jogo: Partial<Jogo>) {
  const ids = new Set<string>()
  const direto = String(jogo?.grupo_id || '').trim()
  if (direto) ids.add(direto)
  const gruposIds = parseJsonLike(jogo?.grupos_ids)
  if (Array.isArray(gruposIds)) gruposIds.forEach((value) => { if (String(value || '').trim()) ids.add(String(value).trim()) })
  else if (gruposIds) String(gruposIds).split(',').forEach((value) => { if (value.trim()) ids.add(value.trim()) })
  const cfg = parseJsonLike(jogo?.configuracao) || {}
  const configGrupoId = String(cfg?.grupo_id || '').trim()
  if (configGrupoId) ids.add(configGrupoId)
  return Array.from(ids)
}

function getGrupoIdPorNomeDoBloco(jogo: Partial<Jogo>, grupos: Grupo[] = []) {
  const nomeBloco = normalizeMatchName(jogo?.nome_bloco || jogo?.nome || '')
  if (!nomeBloco) return ''
  const grupo = grupos.find((entry) => normalizeMatchName(entry?.nome || '') === nomeBloco)
  return String(grupo?.id || '').trim()
}

function montarQuedasDoJogo(jogo: Jogo, grupos: Grupo[] = []): PontuadorQueda[] {
  const grupoId = getGrupoIdDoJogoMobile(jogo) || getGrupoIdPorNomeDoBloco(jogo, grupos)
  const parsedQuedas = parseJsonLike(jogo.quedas) || {}
  if (Array.isArray(parsedQuedas) && parsedQuedas.length) {
    return parsedQuedas.map((mapa, index) => ({
      id: `${jogo.id}:${index + 1}:${String(mapa || '').trim() || 'queda'}`,
      jogo_id: String(jogo.id),
      fase_id: jogo.fase_id || null,
      grupo_id: grupoId || null,
      numero_partida: index + 1,
      mapa: String(mapa || `Queda ${index + 1}`).trim(),
      data_hora: jogo.data_hora || jogo.data_jogo || null,
      nome_bloco: jogo.nome_bloco || jogo.nome || null
    }))
  }
  if (parsedQuedas && typeof parsedQuedas === 'object' && Object.keys(parsedQuedas).length) {
    return Object.entries(parsedQuedas).map(([numero, mapa], index) => {
      const num = Number.parseInt(String(numero), 10)
      const numeroPartida = Number.isFinite(num) && num > 0 ? num : index + 1
      return {
        id: `${jogo.id}:${numeroPartida}:${String(mapa || '').trim() || 'queda'}`,
        jogo_id: String(jogo.id),
        fase_id: jogo.fase_id || null,
        grupo_id: grupoId || null,
        numero_partida: numeroPartida,
        mapa: String(mapa || `Queda ${numeroPartida}`).trim(),
        data_hora: jogo.data_hora || jogo.data_jogo || null,
        nome_bloco: jogo.nome_bloco || jogo.nome || null
      }
    })
  }
  return [{
    id: `${jogo.id}:${Number(jogo.numero_queda || 1)}:${String(jogo.mapa || '').trim() || 'queda'}`,
    jogo_id: String(jogo.id),
    fase_id: jogo.fase_id || null,
    grupo_id: grupoId || null,
    numero_partida: Number(jogo.numero_queda || 1),
    mapa: String(jogo.mapa || `Queda ${Number(jogo.numero_queda || 1)}`).trim(),
    data_hora: jogo.data_hora || jogo.data_jogo || null,
    nome_bloco: jogo.nome_bloco || jogo.nome || null
  }]
}

function normalizeMatchName(value: unknown) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase()
    .trim()
}

function parseMatchResult(text: string): MatchResultTeam[] {
  const teams: MatchResultTeam[] = []
  const teamRe = /TeamName:\s*(.+?)\s+Rank:\s*(\d+)\s+KillScore:\s*(\d+)/i
  text.split(/\r?\n/).forEach((line) => {
    const match = line.trim().match(teamRe)
    if (!match) return
    teams.push({
      nome_equipe: String(match[1] || '').trim(),
      posicao: Number(match[2] || 12),
      abates_total: Number(match[3] || 0)
    })
  })
  return teams
}

export default function CampeonatoDetalhe() {
  const theme = useTheme()
  const colors = theme.colors
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const [teams, setTeams] = useState<ChampionshipTeam[]>([])
  const [grupos, setGrupos] = useState<Grupo[]>([])
  const [fases, setFases] = useState<Fase[]>([])
  const [jogos, setJogos] = useState<Jogo[]>([])
  const [jogadores, setJogadores] = useState<Jogador[]>([])
  const [jogadoresAvulsos, setJogadoresAvulsos] = useState<JogadorAvulso[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [selectedGroup, setSelectedGroup] = useState<Grupo | null>(null)
  const [selectedTeam, setSelectedTeam] = useState<ChampionshipTeam | null>(null)
  const [selectedPlayer, setSelectedPlayer] = useState<{ tipo: 'perfil'; jogador: Jogador } | { tipo: 'avulso'; jogador: JogadorAvulso } | null>(null)
  const [groupForm, setGroupForm] = useState({ nome: '', qtd_slots: '12', horario_inicio: '', status: 'aberto' })
  const [groupModalOpen, setGroupModalOpen] = useState(false)
  const [phaseModalOpen, setPhaseModalOpen] = useState(false)
  const [phaseName, setPhaseName] = useState('')
  const [playerModalOpen, setPlayerModalOpen] = useState(false)
  const [uploadingPlayerPhoto, setUploadingPlayerPhoto] = useState(false)
  const [rolePickerOpen, setRolePickerOpen] = useState(false)
  const [selectedAvulso, setSelectedAvulso] = useState<JogadorAvulso | null>(null)
  const [prefillTeam, setPrefillTeam] = useState<{ equipe_id?: string | null; equipe_avulsa_id?: string | null } | null>(null)
  const [playerForm, setPlayerForm] = useState({ nick: '', uid_jogo: '', funcao: '', foto_url: '', perfil_jogo_id: '' })
  const [resultados, setResultados] = useState<ResultadoJogo[]>([])
  const [resultadosMvp, setResultadosMvp] = useState<ResultadoMvp[]>([])
  const [pontosColocacao, setPontosColocacao] = useState<number[]>(PONTOS_PADRAO)
  const [pontosAbate, setPontosAbate] = useState(1)
  const fallback: any = mock.campeonatos.find((item) => String(item.id) === String(id)) || { id, nome: 'Carregando campeonato...', status: 'carregando' }
  const { data: item } = useRemoteItem({
    table: 'campeonatos',
    id,
    select: 'id, criado_por, nome, slug, logo_url, banner_url, valor_vaga, valor_premiacao, vagas, status, formato, tipo_competicao, modelo_competicao, regiao, plataforma, categoria, created_at',
    fallback,
    mapRow: normalizeChampionship
  })

  const tipo = String(item.tipo_competicao || item.modelo_competicao || item.tipo || item.formato || '').toLowerCase()
  const isCopa = tipo.includes('copa')
  const isLiga = tipo.includes('liga')
  const isDiario = tipo.includes('diario') || tipo.includes('diario')
  const tabs = useMemo(() => {
    const base: Array<{ id: TabId; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
      { id: 'equipes', label: 'Equipes', icon: 'shield-outline' },
      { id: 'jogadores', label: 'Jogadores', icon: 'people-outline' },
      { id: 'grupos', label: 'Grupos', icon: 'git-branch-outline' }
    ]
    if (!isCopa) base.push({ id: 'jogos', label: isDiario ? 'Horarios' : 'Jogos', icon: 'calendar-outline' })
    base.push({ id: 'tabela', label: isLiga ? 'Tabela' : 'Tabela/MVP', icon: 'podium-outline' })
    base.push({ id: 'regras', label: 'Regras', icon: 'document-text-outline' })
    return base
  }, [isCopa, isDiario, isLiga])
  const [tab, setTab] = useState<TabId>('equipes')
  const [tabelaView, setTabelaView] = useState<TabelaView>('tabela')
  const [diarioGroupId, setDiarioGroupId] = useState('')
  const [pontuadorOptionsOpen, setPontuadorOptionsOpen] = useState(false)
  const [pontuadorFaseId, setPontuadorFaseId] = useState('todas')
  const [pontuadorJogoId, setPontuadorJogoId] = useState('')
  const [pontuadorGameId, setPontuadorGameId] = useState('')
  const [screenSize, setScreenSize] = useState(Dimensions.get('window'))
  const [pontuadorGroupId, setPontuadorGroupId] = useState('todos')
  const [pontuadorMapa, setPontuadorMapa] = useState('QUEDA 1')
  const [pontuadorDraft, setPontuadorDraft] = useState<Record<string, { posicao: string; abates: string }>>({})
  const [matchResultTeams, setMatchResultTeams] = useState<MatchResultTeam[]>([])
  const [pontuadorVinculos, setPontuadorVinculos] = useState<Record<string, string>>({})
  const [uploadingMatchResult, setUploadingMatchResult] = useState(false)
  const [savingPontuador, setSavingPontuador] = useState(false)

  const isOrganizer = Boolean(currentUserId && item?.criado_por && String(item.criado_por) === String(currentUserId))


  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ window }) => setScreenSize(window))
    return () => sub.remove()
  }, [])

  useEffect(() => {
    let alive = true
    async function loadUser() {
      if (!supabase) return
      const { data } = await supabase.auth.getUser()
      if (alive) setCurrentUserId(data.user?.id || null)
    }
    loadUser()
    return () => { alive = false }
  }, [])

  useEffect(() => {
    let alive = true
    async function loadDetails() {
      if (!supabase || !id) return
      const [teamsRes, fasesRes, gruposRes, jogosRes, jogadoresRes, avulsosRes, resultadosRes, mvpRes] = await Promise.all([
        supabase
          .from('campeonato_equipes')
          .select('id,status,nome_exibicao,numero_vaga,grupo_id,equipe_id,equipe_avulsa_id,equipes:equipe_id(id,nome,tag,logo_url,cover_url),equipes_avulsas_campeonato:equipe_avulsa_id(id,nome,tag,logo_url)')
          .eq('campeonato_id', id)
          .order('numero_vaga', { ascending: true }),
        supabase
          .from('campeonato_fases')
          .select('id,nome,slug,ordem')
          .eq('campeonato_id', id)
          .order('ordem', { ascending: true }),
        supabase
          .from('campeonato_grupos')
          .select('id,nome,status,qtd_slots,qtd_quedas,horario_inicio,quantidade_equipes,fase_id,premiacao,valor_inscricao')
          .eq('campeonato_id', id)
          .order('nome', { ascending: true }),
        supabase
          .from('jogos')
          .select('*')
          .eq('campeonato_id', id)
          .order('created_at', { ascending: true }),
        supabase
          .from('jogadores_campeonato')
          .select('id,status,equipe_id,equipe_avulsa_id,campeonato_equipe_id,jogador_avulso_id,perfis_jogo:perfil_jogo_id(id,nick,uid_jogo,foto_capa)')
          .eq('campeonato_id', id)
          .neq('status', 'removido')
          .limit(300),
        supabase
          .from('jogadores_avulsos_campeonato')
          .select('id,campeonato_id,equipe_id,equipe_avulsa_id,nick,uid_jogo,funcao,foto_url,origem')
          .eq('campeonato_id', id)
          .order('created_at', { ascending: true }),
        supabase
          .from('resultados_jogos')
          .select('id,equipe_id,jogo_id,grupo_id,fase_id,mapa,posicao,abates,total_pontos')
          .eq('campeonato_id', id),
        supabase
          .from('resultados_mvp')
          .select('id,jogador_campeonato_id,perfil_jogo_id,equipe_id,campeonato_equipe_id,equipe_avulsa_id,nick_snapshot,uid_jogo_snapshot,abates,partida_id')
          .eq('campeonato_id', id)
      ])
      if (!alive) return
      setTeams((teamsRes.data || []) as ChampionshipTeam[])
      setFases((fasesRes.data || []) as Fase[])
      setGrupos((gruposRes.data || []) as Grupo[])
      setJogos((jogosRes.data || []) as Jogo[])
      setJogadores((jogadoresRes.data || []) as Jogador[])
      setJogadoresAvulsos((avulsosRes.data || []) as JogadorAvulso[])
      setResultados((resultadosRes.data || []) as ResultadoJogo[])
      setResultadosMvp((mvpRes.data || []) as ResultadoMvp[])
    }
    loadDetails()
    return () => { alive = false }
  }, [id])

  useEffect(() => {
    setPontosColocacao(PONTOS_PADRAO)
    setPontosAbate(1)
  }, [item?.id])

  useEffect(() => {
    if (!isDiario || !grupos.length) return
    if (!diarioGroupId || !grupos.some((grupo) => String(grupo.id) === String(diarioGroupId))) {
      setDiarioGroupId(String(grupos[0].id))
    }
  }, [diarioGroupId, grupos, isDiario])

  const ranking = useMemo<TabelaRow[]>(() => {
    const scopedTeams = isDiario && diarioGroupId
      ? teams.filter((entry) => String(entry.grupo_id || '') === String(diarioGroupId))
      : teams
    const championshipIds = new Set(scopedTeams.map((entry) => String(entry.id)))
    const publicToChampionship = new Map<string, string>()
    scopedTeams.forEach((entry) => {
      const publicId = getTeamPublicId(entry)
      if (publicId && !publicToChampionship.has(publicId)) publicToChampionship.set(publicId, String(entry.id))
    })
    const stats = new Map<string, { partidas: number; booyahs: number; abates: number; pontos: number }>()
    const grupoMap = new Map(grupos.map((grupo) => [String(grupo.id), letraGrupo(grupo.nome)]))

    resultados.forEach((row) => {
      if (isDiario && diarioGroupId && String(row.grupo_id || '') !== String(diarioGroupId)) return
      const rawTeamId = String(row.equipe_id || '').trim()
      if (!rawTeamId) return
      const championshipTeamId = championshipIds.has(rawTeamId) ? rawTeamId : publicToChampionship.get(rawTeamId)
      if (!championshipTeamId) return

      const atual = stats.get(championshipTeamId) || { partidas: 0, booyahs: 0, abates: 0, pontos: 0 }
      const posicao = Number(row.posicao || 0)
      const abates = Number(row.abates || 0)
      const pontosPosicao = posicao > 0 ? Number(pontosColocacao[posicao - 1] ?? 0) : 0
      const pontos = row.total_pontos !== null && row.total_pontos !== undefined ? Number(row.total_pontos || 0) : (abates * pontosAbate) + pontosPosicao
      atual.partidas += 1
      atual.booyahs += posicao === 1 ? 1 : 0
      atual.abates += abates
      atual.pontos += pontos
      stats.set(championshipTeamId, atual)
    })

    const rows = scopedTeams.map((entry) => {
      const eq = getTeam(entry)
      const rowStats = stats.get(String(entry.id))
      return {
        id: entry.id,
        nome: entry.nome_exibicao || eq?.nome || 'Equipe',
        tag: eq?.tag || '',
        logoUri: eq?.logo_url || undefined,
        grupo: entry.grupo_id ? grupoMap.get(String(entry.grupo_id)) || letraGrupo(entry.grupo_id) : '-',
        partidas: rowStats?.partidas || 0,
        booyahs: rowStats?.booyahs || 0,
        abates: rowStats?.abates || 0,
        pontos: rowStats?.pontos || 0
      }
    })
    rows.sort((a, b) => b.pontos - a.pontos || b.booyahs - a.booyahs || b.abates - a.abates || a.nome.localeCompare(b.nome))
    return rows
  }, [diarioGroupId, grupos, isDiario, pontosAbate, pontosColocacao, resultados, teams])

  const mvpRanking = useMemo<MvpRow[]>(() => {
    const teamNameByChampionshipId = new Map<string, { nome: string; tag: string }>()
    const teamNameByPublicId = new Map<string, { nome: string; tag: string }>()
    const scopedTeams = isDiario && diarioGroupId
      ? teams.filter((entry) => String(entry.grupo_id || '') === String(diarioGroupId))
      : teams
    scopedTeams.forEach((entry) => {
      const eq = getTeam(entry)
      const team = { nome: entry.nome_exibicao || eq?.nome || 'Equipe', tag: eq?.tag || entry.nome_exibicao || eq?.nome || 'TIME' }
      teamNameByChampionshipId.set(String(entry.id), team)
      const publicId = getTeamPublicId(entry)
      if (publicId) teamNameByPublicId.set(publicId, team)
    })
    const playerInfo = new Map<string, Jogador>()
    jogadores.forEach((jogador) => {
      playerInfo.set(String(jogador.id), jogador)
      if (jogador.perfis_jogo) {
        const perfil = first(jogador.perfis_jogo)
        if (perfil?.uid_jogo) playerInfo.set(`uid:${perfil.uid_jogo}`, jogador)
      }
      if (jogador.uid_jogo_snapshot) playerInfo.set(`uid:${jogador.uid_jogo_snapshot}`, jogador)
    })
    const rows = new Map<string, MvpRow>()
    resultadosMvp.forEach((row) => {
      const jogador = row.jogador_campeonato_id ? playerInfo.get(String(row.jogador_campeonato_id)) : null
      const perfil = first(jogador?.perfis_jogo)
      const nome = texto(row.nick_snapshot || perfil?.nick || jogador?.nick_snapshot || row.uid_jogo_snapshot, 'Jogador')
      const teamRef = String(row.campeonato_equipe_id || jogador?.campeonato_equipe_id || row.equipe_id || '').trim()
      const publicRef = String(row.equipe_avulsa_id || jogador?.equipe_id || jogador?.equipe_avulsa_id || '').trim()
      const team = (teamRef && teamNameByChampionshipId.get(teamRef)) || (publicRef && teamNameByPublicId.get(publicRef)) || { nome: 'Sem equipe', tag: 'SEM' }
      const key = String(row.jogador_campeonato_id || row.perfil_jogo_id || row.uid_jogo_snapshot || `${nome}-${team.nome}`)
      const current = rows.get(key) || { id: key, nome, equipe: team.nome, tag: team.tag, abates: 0, quedas: 0 }
      current.abates += Number(row.abates || 0)
      current.quedas += row.partida_id ? 1 : 0
      rows.set(key, current)
    })
    return Array.from(rows.values()).sort((a, b) => b.abates - a.abates || b.quedas - a.quedas || a.nome.localeCompare(b.nome))
  }, [diarioGroupId, isDiario, jogadores, resultadosMvp, teams])

  const reloadDetails = async () => {
    if (!supabase || !id) return
    const [teamsRes, fasesRes, gruposRes, jogadoresRes, avulsosRes] = await Promise.all([
      supabase.from('campeonato_equipes').select('id,status,nome_exibicao,numero_vaga,grupo_id,equipe_id,equipe_avulsa_id,equipes:equipe_id(id,nome,tag,logo_url,cover_url),equipes_avulsas_campeonato:equipe_avulsa_id(id,nome,tag,logo_url)').eq('campeonato_id', id).order('numero_vaga', { ascending: true }),
      supabase.from('campeonato_fases').select('id,nome,slug,ordem').eq('campeonato_id', id).order('ordem', { ascending: true }),
      supabase.from('campeonato_grupos').select('id,nome,status,qtd_slots,qtd_quedas,horario_inicio,quantidade_equipes,fase_id,premiacao,valor_inscricao').eq('campeonato_id', id).order('nome', { ascending: true }),
      supabase.from('jogadores_campeonato').select('id,status,equipe_id,equipe_avulsa_id,campeonato_equipe_id,jogador_avulso_id,perfis_jogo:perfil_jogo_id(id,nick,uid_jogo,foto_capa)').eq('campeonato_id', id).neq('status', 'removido').limit(300),
      supabase.from('jogadores_avulsos_campeonato').select('id,campeonato_id,equipe_id,equipe_avulsa_id,nick,uid_jogo,funcao,foto_url,origem').eq('campeonato_id', id).order('created_at', { ascending: true })
    ])
    setTeams((teamsRes.data || []) as ChampionshipTeam[])
    setFases((fasesRes.data || []) as Fase[])
    setGrupos((gruposRes.data || []) as Grupo[])
    setJogadores((jogadoresRes.data || []) as Jogador[])
    setJogadoresAvulsos((avulsosRes.data || []) as JogadorAvulso[])
  }

  const openAvulsoModal = (avulso?: JogadorAvulso | null, team?: { equipe_id?: string | null; equipe_avulsa_id?: string | null } | null) => {
    setSelectedAvulso(avulso || null)
    setPrefillTeam(team || null)
    setPlayerForm({
      nick: avulso?.nick || '',
      uid_jogo: avulso?.uid_jogo || '',
      funcao: avulso?.funcao || '',
      foto_url: avulso?.foto_url || '',
      perfil_jogo_id: ''
    })
    setPlayerModalOpen(true)
  }

  const base64ToUint8Array = (base64: string) => {
    const binary = globalThis.atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
    return bytes
  }

  const uploadPlayerPhoto = async () => {
    if (!supabase) return
    try {
      setUploadingPlayerPhoto(true)
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (!permission.granted) {
        Alert.alert('Upload', 'Permita acesso as imagens para enviar a foto.')
        return
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [5, 6],
        quality: 1
      })
      if (result.canceled || !result.assets[0]?.uri) return

      const { data: sessionData } = await supabase.auth.getSession()
      const userId = sessionData.session?.user?.id
      if (!userId) throw new Error('Faça login para enviar foto.')

      const cropped = await ImageManipulator.manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: 500, height: 600 } }],
        { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      )
      if (!cropped.base64) throw new Error('Não foi possível preparar a imagem.')

      const fileName = `${userId}/mvp-avulsos/${String(id || 'campeonato')}-${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`
      const bytes = base64ToUint8Array(cropped.base64)
      const { error } = await supabase.storage
        .from('avatars')
        .upload(fileName, bytes.buffer, { cacheControl: '3600', upsert: true, contentType: 'image/jpeg' })
      if (error) throw error
      const { data } = supabase.storage.from('avatars').getPublicUrl(fileName)
      setPlayerForm((value) => ({ ...value, foto_url: data.publicUrl }))
      Alert.alert('Upload', 'Foto enviada com sucesso.')
    } catch (error: any) {
      Alert.alert('Upload', error?.message || 'Não foi possível enviar a foto.')
    } finally {
      setUploadingPlayerPhoto(false)
    }
  }

  const openPlayerPhotoMenu = () => {
    if (!playerForm.foto_url) {
      uploadPlayerPhoto()
      return
    }
    Alert.alert('Foto do jogador', 'Escolha uma opção.', [
      { text: 'Ver em tela cheia', onPress: () => Linking.openURL(playerForm.foto_url).catch(() => Alert.alert('Foto', 'Não foi possível abrir a foto.')) },
      { text: 'Trocar foto', onPress: uploadPlayerPhoto },
      { text: 'Cancelar', style: 'cancel' }
    ])
  }

  const saveAvulso = async () => {
    if (!supabase || !id) return
    const nick = playerForm.nick.trim()
    const uid = playerForm.uid_jogo.trim()
    if (!nick || !uid) {
      Alert.alert('Jogador', 'Preencha nick e ID do jogo.')
      return
    }
    const payload = {
      campeonato_id: String(id),
      equipe_id: selectedAvulso?.equipe_id || prefillTeam?.equipe_id || null,
      equipe_avulsa_id: selectedAvulso?.equipe_avulsa_id || prefillTeam?.equipe_avulsa_id || null,
      nick,
      uid_jogo: uid,
      funcao: playerForm.funcao.trim() || null,
      foto_url: playerForm.foto_url.trim() || null,
      criado_por: currentUserId,
      origem: 'manual'
    }
    const res = selectedAvulso
      ? await supabase.from('jogadores_avulsos_campeonato').update(payload).eq('id', selectedAvulso.id)
      : await supabase.from('jogadores_avulsos_campeonato').insert(payload)
    if (res.error) {
      Alert.alert('Jogador', res.error.message)
      return
    }
    setPlayerModalOpen(false)
    await reloadDetails()
  }

  const addPerfilJogo = async () => {
    if (!supabase || !id) return
    const perfilId = playerForm.perfil_jogo_id.trim()
    if (!perfilId) {
      Alert.alert('Perfil de jogo', 'Informe o ID do perfil de jogo.')
      return
    }
    const equipe_id = selectedAvulso?.equipe_id || prefillTeam?.equipe_id || null
    const equipe_avulsa_id = selectedAvulso?.equipe_avulsa_id || prefillTeam?.equipe_avulsa_id || null
    const payload = {
      campeonato_id: String(id),
      perfil_jogo_id: perfilId,
      equipe_id,
      equipe_avulsa_id,
      origem: 'manual',
      status: 'ativo',
      criado_automaticamente: false,
      criado_por: currentUserId
    }
    const res = await supabase.from('jogadores_campeonato').insert(payload)
    if (res.error) {
      Alert.alert('Perfil de jogo', res.error.message)
      return
    }
    if (selectedAvulso) await supabase.from('jogadores_avulsos_campeonato').delete().eq('id', selectedAvulso.id)
    setPlayerModalOpen(false)
    await reloadDetails()
  }

  const deleteAvulso = async (avulso: JogadorAvulso) => {
    if (!supabase) return
    const res = await supabase.from('jogadores_avulsos_campeonato').delete().eq('id', avulso.id)
    if (res.error) Alert.alert('Jogador', res.error.message)
    else await reloadDetails()
  }

  const openGroupModal = (grupo?: Grupo | null) => {
    setSelectedGroup(grupo || null)
    setGroupForm({
      nome: grupo?.nome || '',
      qtd_slots: String(grupo?.qtd_slots || grupo?.quantidade_equipes || 12),
      horario_inicio: grupo?.horario_inicio || '',
      status: grupo?.status || 'aberto'
    })
    setGroupModalOpen(true)
  }

  const saveGroup = async () => {
    if (!supabase || !id) return
    const nome = groupForm.nome.trim()
    if (!nome) return Alert.alert('Grupo', 'Informe o nome do grupo.')
    const payload = {
      campeonato_id: String(id),
      nome,
      qtd_slots: Number(groupForm.qtd_slots || 12),
      quantidade_equipes: Number(groupForm.qtd_slots || 12),
      horario_inicio: groupForm.horario_inicio.trim() || null,
      status: groupForm.status.trim() || 'aberto'
    }
    const res = selectedGroup
      ? await supabase.from('campeonato_grupos').update(payload).eq('id', selectedGroup.id)
      : await supabase.from('campeonato_grupos').insert(payload)
    if (res.error) return Alert.alert('Grupo', res.error.message)
    setGroupModalOpen(false)
    await reloadDetails()
  }

  const deleteGroup = async () => {
    if (!supabase || !selectedGroup) return
    await supabase.from('campeonato_equipes').update({ grupo_id: null }).eq('grupo_id', selectedGroup.id)
    const res = await supabase.from('campeonato_grupos').delete().eq('id', selectedGroup.id)
    if (res.error) return Alert.alert('Grupo', res.error.message)
    setGroupModalOpen(false)
    await reloadDetails()
  }

  const createPhase = async () => {
    if (!supabase || !id) return
    const nome = phaseName.trim()
    if (!nome) return Alert.alert('Fase', 'Informe o nome da fase.')
    const nextOrder = fases.length ? Math.max(...fases.map((fase) => Number(fase.ordem || 0))) + 1 : 1
    const slug = nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `fase-${nextOrder}`
    const res = await supabase.from('campeonato_fases').insert({ campeonato_id: String(id), nome, slug, ordem: nextOrder })
    if (res.error) return Alert.alert('Fase', res.error.message)
    setPhaseName('')
    setPhaseModalOpen(false)
    await reloadDetails()
  }

  const setTeamGroup = async (entry: ChampionshipTeam, grupoId: string | null) => {
    if (!supabase) return
    const res = await supabase.from('campeonato_equipes').update({ grupo_id: grupoId }).eq('id', entry.id)
    if (res.error) Alert.alert('Grupo', res.error.message)
    else await reloadDetails()
  }


  const openTeamSheet = (entry: ChampionshipTeam) => setSelectedTeam(entry)
  const closeTeamSheet = () => setSelectedTeam(null)
  const openPlayerSheet = (player: { tipo: 'perfil'; jogador: Jogador } | { tipo: 'avulso'; jogador: JogadorAvulso }) => setSelectedPlayer(player)
  const closePlayerSheet = () => setSelectedPlayer(null)

  const removeTeamFromChampionship = async (entry: ChampionshipTeam) => {
    if (!supabase) return
    const res = await supabase.from('campeonato_equipes').delete().eq('id', entry.id)
    if (res.error) return Alert.alert('Equipe', res.error.message)
    closeTeamSheet()
    await reloadDetails()
  }

  const removePlayerFromChampionship = async () => {
    if (!supabase || !selectedPlayer) return
    const res = selectedPlayer.tipo === 'avulso'
      ? await supabase.from('jogadores_avulsos_campeonato').delete().eq('id', selectedPlayer.jogador.id)
      : await supabase.from('jogadores_campeonato').delete().eq('id', selectedPlayer.jogador.id)
    if (res.error) return Alert.alert('Jogador', res.error.message)
    closePlayerSheet()
    await reloadDetails()
  }


  const pontuadorJogosDaFase = useMemo(() => {
    return jogos
      .filter((jogo) => pontuadorFaseId === 'todas' || String(jogo.fase_id || '') === String(pontuadorFaseId))
      .slice()
      .sort((a, b) => Number(a?.numero_queda || 0) - Number(b?.numero_queda || 0))
  }, [jogos, pontuadorFaseId])

  const pontuadorBlocos = useMemo(() => {
    const map = new Map<string, Jogo>()
    pontuadorJogosDaFase.forEach((jogo) => {
      const grupoId = getGrupoIdDoJogoMobile(jogo) || getGrupoIdPorNomeDoBloco(jogo, grupos)
      const nomeNormalizado = normalizeMatchName(jogo.nome_bloco || jogo.nome || '')
      const key = grupoId || nomeNormalizado || String(jogo.id)
      if (!map.has(key)) map.set(key, jogo)
    })
    return Array.from(map.values())
  }, [pontuadorJogosDaFase, grupos])

  const pontuadorBlocoSelecionado = useMemo(() => {
    return pontuadorBlocos.find((jogo) => String(jogo.id) === String(pontuadorGroupId)) || pontuadorBlocos[0] || null
  }, [pontuadorBlocos, pontuadorGroupId])

  const pontuadorQuedas = useMemo<PontuadorQueda[]>(() => {
    const bloco = pontuadorBlocoSelecionado
    if (!bloco) return []
    const grupoRef = getGrupoIdDoJogoMobile(bloco) || getGrupoIdPorNomeDoBloco(bloco, grupos)
    const nomeRef = normalizeMatchName(bloco.nome_bloco || bloco.nome || '')
    const jogosDoMesmoBloco = pontuadorJogosDaFase
      .filter((jogo) => {
        const grupoJogo = getGrupoIdDoJogoMobile(jogo) || getGrupoIdPorNomeDoBloco(jogo, grupos)
        const mesmoGrupo = grupoRef && grupoJogo && String(grupoJogo) === String(grupoRef)
        const mesmoNome = nomeRef && normalizeMatchName(jogo.nome_bloco || jogo.nome || '') === nomeRef
        return mesmoGrupo || mesmoNome || String(jogo.id) === String(bloco.id)
      })
      .sort((a, b) => Number(a?.numero_queda || 0) - Number(b?.numero_queda || 0))

    if (jogosDoMesmoBloco.length > 1) {
      return jogosDoMesmoBloco.map((jogo, index) => ({
        id: String(jogo.id),
        jogo_id: String(jogo.id),
        fase_id: jogo.fase_id || null,
        grupo_id: getGrupoIdDoJogoMobile(jogo) || getGrupoIdPorNomeDoBloco(jogo, grupos) || null,
        numero_partida: Number(jogo.numero_queda || index + 1),
        mapa: String(jogo.mapa || `Queda ${Number(jogo.numero_queda || index + 1)}`).trim(),
        data_hora: jogo.data_hora || jogo.data_jogo || null,
        nome_bloco: jogo.nome_bloco || jogo.nome || null
      }))
    }

    return montarQuedasDoJogo(bloco, grupos).sort((a, b) => Number(a.numero_partida || 0) - Number(b.numero_partida || 0))
  }, [pontuadorBlocoSelecionado, pontuadorJogosDaFase, grupos])

  const pontuadorQueda = useMemo(() => pontuadorQuedas.find((queda) => String(queda.id) === String(pontuadorGameId)) || pontuadorQuedas[0] || null, [pontuadorQuedas, pontuadorGameId])
  const pontuadorJogo = useMemo(() => jogos.find((jogo) => String(jogo.id) === String(pontuadorQueda?.jogo_id || '')) || null, [jogos, pontuadorQueda?.jogo_id])
  const pontuadorEquipes = useMemo(() => {
    const grupoDaQueda = String(
      pontuadorQueda?.grupo_id ||
      (pontuadorBlocoSelecionado ? getGrupoIdDoJogoMobile(pontuadorBlocoSelecionado) || getGrupoIdPorNomeDoBloco(pontuadorBlocoSelecionado, grupos) : '') ||
      ''
    ).trim()
    const base = !grupoDaQueda ? teams : teams.filter((team) => String(team.grupo_id || '') === String(grupoDaQueda))
    return base.slice().sort((a, b) => Number(a.numero_vaga || 9999) - Number(b.numero_vaga || 9999)).slice(0, 12)
  }, [pontuadorQueda?.grupo_id, pontuadorBlocoSelecionado, grupos, teams])

  useEffect(() => {
    if (!pontuadorBlocos.length) {
      if (pontuadorGroupId) setPontuadorGroupId('')
      if (pontuadorGameId) setPontuadorGameId('')
      return
    }
    if (!pontuadorGroupId || !pontuadorBlocos.some((jogo) => String(jogo.id) === String(pontuadorGroupId))) {
      setPontuadorGroupId(String(pontuadorBlocos[0].id))
      setPontuadorGameId('')
    }
  }, [pontuadorBlocos, pontuadorGroupId, pontuadorGameId])

  useEffect(() => {
    if (!pontuadorGameId && pontuadorQuedas[0]?.id) setPontuadorGameId(String(pontuadorQuedas[0].id))
    if (pontuadorGameId && !pontuadorQuedas.some((queda) => String(queda.id) === String(pontuadorGameId))) setPontuadorGameId(String(pontuadorQuedas[0]?.id || ''))
  }, [pontuadorQuedas, pontuadorGameId])

  useEffect(() => {
    let alive = true
    async function loadVinculos() {
      if (!supabase || !pontuadorJogo?.id) {
        if (alive) setPontuadorVinculos({})
        return
      }
      setMatchResultTeams([])
      const { data, error } = await supabase
        .from('jogo_vinculos_equipes')
        .select('campeonato_equipe_id,nome_raw')
        .eq('jogo_id', pontuadorJogo.id)
      if (!alive || error) return
      const next: Record<string, string> = {}
      ;(data || []).forEach((row: any) => {
        if (row?.campeonato_equipe_id) next[String(row.campeonato_equipe_id)] = String(row.nome_raw || '')
      })
      setPontuadorVinculos(next)
      setMatchResultTeams(Object.values(next).filter((name) => name && name !== '__FALTA__').map((nome_equipe) => ({ nome_equipe, posicao: 12, abates_total: 0 })))
    }
    loadVinculos()
    return () => { alive = false }
  }, [pontuadorJogo?.id])

  useEffect(() => {
    const next: Record<string, { posicao: string; abates: string }> = {}
    pontuadorEquipes.forEach((entry, index) => {
      const salvo = resultados.find((row) => {
        const sameTeam = String(row.equipe_id || '') === String(entry.id) || String(row.equipe_id || '') === String(getTeamPublicId(entry))
        const sameGame = pontuadorQueda?.jogo_id ? String((row as any).jogo_id || '') === String(pontuadorQueda.jogo_id) || !(row as any).jogo_id : true
        const sameMapa = pontuadorQueda?.mapa ? String((row as any).mapa || '') === String(pontuadorQueda.mapa) || !(row as any).mapa : true
        return sameTeam && sameGame && sameMapa
      })
      next[String(entry.id)] = {
        posicao: String(salvo?.posicao || index + 1),
        abates: String(salvo?.abates || 0)
      }
    })
    setPontuadorDraft(next)
  }, [pontuadorEquipes, pontuadorQueda?.jogo_id, pontuadorQueda?.mapa, resultados])

  const updatePontuadorRow = (teamId: string, field: 'posicao' | 'abates', value: string) => {
    const onlyNumbers = value.replace(/[^0-9]/g, '')
    setPontuadorDraft((current) => ({ ...current, [teamId]: { ...(current[teamId] || { posicao: '', abates: '' }), [field]: onlyNumbers } }))
  }

  const savePontuadorVinculo = async (teamId: string, nomeRaw: string) => {
    if (!supabase || !pontuadorJogo?.id) return
    const previous = pontuadorVinculos[teamId] || ''
    setPontuadorVinculos((current) => ({ ...current, [teamId]: nomeRaw }))
    const query = nomeRaw
      ? supabase.from('jogo_vinculos_equipes').upsert({
          jogo_id: pontuadorJogo.id,
          campeonato_equipe_id: teamId,
          nome_raw: nomeRaw,
          updated_at: new Date().toISOString()
        }, { onConflict: 'jogo_id,campeonato_equipe_id' })
      : supabase.from('jogo_vinculos_equipes').delete().eq('jogo_id', pontuadorJogo.id).eq('campeonato_equipe_id', teamId)
    const { error } = await query
    if (error) {
      setPontuadorVinculos((current) => ({ ...current, [teamId]: previous }))
      Alert.alert('Vínculo MatchResult', error.message)
    }
  }

  const importMatchResult = async () => {
    if (!isOrganizer || !pontuadorJogo?.id) {
      Alert.alert('MatchResult', 'Selecione um jogo e acesse como organizador para importar.')
      return
    }
    if (!supabase) return
    const client = supabase
    try {
      setUploadingMatchResult(true)
      const picked = await DocumentPicker.getDocumentAsync({ type: ['text/plain', 'application/octet-stream', '*/*'], copyToCacheDirectory: true })
      if (picked.canceled || !picked.assets[0]) return
      const asset = picked.assets[0]
      if (!/^MatchResult_/i.test(asset.name) || !/\.(log|txt)$/i.test(asset.name)) {
        Alert.alert('MatchResult', 'Selecione um arquivo MatchResult_*.log ou MatchResult_*.txt.')
        return
      }
      const parsed = parseMatchResult(await new File(asset.uri).text())
      if (!parsed.length) {
        Alert.alert('MatchResult', 'Nenhuma equipe foi encontrada no arquivo.')
        return
      }

      const nextVinculos = { ...pontuadorVinculos }
      const nextDraft = { ...pontuadorDraft }
      const vinculosParaSalvar: Array<{ jogo_id: string; campeonato_equipe_id: string; nome_raw: string; updated_at: string }> = []

      parsed.forEach((rawTeam) => {
        const rawNorm = normalizeMatchName(rawTeam.nome_equipe)
        const entry = pontuadorEquipes.find((team) => {
          const eq = getTeam(team)
          return [team.nome_exibicao, eq?.nome, eq?.tag].some((name) => {
            const normalized = normalizeMatchName(name)
            return normalized && (normalized === rawNorm || normalized.includes(rawNorm) || rawNorm.includes(normalized))
          })
        })
        if (!entry) return
        nextVinculos[String(entry.id)] = rawTeam.nome_equipe
        nextDraft[String(entry.id)] = { posicao: String(rawTeam.posicao || 12), abates: String(rawTeam.abates_total || 0) }
        vinculosParaSalvar.push({
          jogo_id: pontuadorJogo.id,
          campeonato_equipe_id: String(entry.id),
          nome_raw: rawTeam.nome_equipe,
          updated_at: new Date().toISOString()
        })
      })

      if (vinculosParaSalvar.length) {
        const { error } = await client.from('jogo_vinculos_equipes').upsert(vinculosParaSalvar, { onConflict: 'jogo_id,campeonato_equipe_id' })
        if (error) throw error
      }
      setMatchResultTeams(parsed)
      setPontuadorVinculos(nextVinculos)
      setPontuadorDraft(nextDraft)
      Alert.alert('MatchResult', `${parsed.length} equipes importadas. Revise os indicadores vermelhos antes de salvar.`)
    } catch (error: any) {
      Alert.alert('MatchResult', error?.message || 'Não foi possível importar o arquivo.')
    } finally {
      setUploadingMatchResult(false)
    }
  }

  const savePontuador = async () => {
    if (!supabase || !id) return
    if (!isOrganizer) {
      Alert.alert('Pontuador', 'Apenas o organizador pode salvar a súmula.')
      return
    }
    if (!pontuadorQueda?.jogo_id) {
      Alert.alert('Pontuador', 'Selecione uma queda antes de salvar.')
      return
    }
    try {
      setSavingPontuador(true)
      const mapa = pontuadorQueda?.mapa || pontuadorMapa.trim() || 'QUEDA 1'
      const inserts = pontuadorEquipes.map((entry, index) => {
        const draft = pontuadorDraft[String(entry.id)] || { posicao: String(index + 1), abates: '0' }
        const posicao = Math.max(1, Number(draft.posicao || index + 1))
        const abates = Math.max(0, Number(draft.abates || 0))
        const pontosPosicao = Number(pontosColocacao[posicao - 1] ?? 0)
        const total_pontos = pontosPosicao + abates * pontosAbate
        return {
          campeonato_id: String(id),
          jogo_id: pontuadorQueda.jogo_id,
          equipe_id: entry.id,
          grupo_id: entry.grupo_id || pontuadorQueda.grupo_id || (pontuadorGroupId !== 'todos' ? pontuadorGroupId : null),
          fase_id: pontuadorQueda.fase_id || (pontuadorFaseId !== 'todas' ? pontuadorFaseId : null),
          mapa,
          posicao,
          abates,
          total_pontos
        }
      })
      const del = await supabase.from('resultados_jogos').delete().eq('jogo_id', pontuadorQueda.jogo_id).eq('mapa', mapa)
      if (del.error) throw del.error
      if (inserts.length) {
        const ins = await supabase.from('resultados_jogos').insert(inserts)
        if (ins.error) throw ins.error
      }
      Alert.alert('Pontuador', 'Súmula salva com sucesso.')
      const refreshed = await supabase.from('resultados_jogos').select('id,equipe_id,jogo_id,grupo_id,fase_id,mapa,posicao,abates,total_pontos').eq('campeonato_id', id)
      if (!refreshed.error) setResultados((refreshed.data || []) as ResultadoJogo[])
    } catch (error: any) {
      Alert.alert('Pontuador', error?.message || 'Não foi possível salvar a súmula.')
    } finally {
      setSavingPontuador(false)
    }
  }

  const selectedTeamRef = selectedTeam ? getTeam(selectedTeam) : null
  const selectedTeamTitle = selectedTeam ? selectedTeam.nome_exibicao || selectedTeamRef?.nome || 'Equipe' : 'Equipe'
  const selectedPerfil = selectedPlayer?.tipo === 'perfil' ? first(selectedPlayer.jogador.perfis_jogo) : null
  const selectedPlayerTitle = selectedPlayer?.tipo === 'avulso'
    ? selectedPlayer.jogador.nick
    : selectedPerfil?.nick || selectedPlayer?.jogador.nick_snapshot || 'Jogador'
  const selectedPlayerUid = selectedPlayer?.tipo === 'avulso'
    ? selectedPlayer.jogador.uid_jogo
    : selectedPerfil?.uid_jogo || selectedPlayer?.jogador.uid_jogo_snapshot || '-'

  return <Screen>
    <BackHeader eyebrow="CAMPEONATO" title={item.nome} />
    <HeroBanner title={item.nome} subtitle={item.meta} badge={`${item.status} - ${item.valor}`} logo={item.sigla || item.nome} logoUri={pickImage(item, ['logo_url', 'logo', 'imagem_url'], 'imagem_campeonatos')} imageUri={pickImage(item, ['banner_url', 'capa_url', 'imagem_url'], 'imagem_campeonatos')} type="champ" />
    <InfoGrid items={[{ label: 'vagas', value: item.vagas || '-' }, { label: 'valor', value: item.valor || '-' }, { label: 'status', value: item.status }, { label: 'tipo', value: item.tipo_competicao || item.modelo_competicao || item.tipo || '-' }]} />
    <Button label="Inscrever equipe / comprar vaga" />

    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
      {tabs.map((entry) => {
        const active = tab === entry.id
        return <Pressable key={entry.id} onPress={() => setTab(entry.id)} style={[styles.tab, { backgroundColor: colors.card, borderColor: colors.border }, active && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
          <Ionicons name={entry.icon} size={14} color={active ? colors.bg : colors.text} />
          <Body style={[styles.tabText, active && { color: colors.bg }]}>{entry.label}</Body>
        </Pressable>
      })}
    </ScrollView>

    {tab === 'equipes' ? <View>
      <SectionHeader title="Equipes no campeonato" action={`${teams.length || item.vagas || 0} vagas`} />
      {!teams.length ? <CompactRow logo="DZ" title="Nenhuma equipe inscrita" meta="Aguardando compra de vagas" tag="aberto" /> : null}
      {teams.map((entry) => {
        const eq = getTeam(entry)
        const title = entry.nome_exibicao || eq?.nome || 'Equipe'
        return <CompactRow key={entry.id} onPress={() => openTeamSheet(entry)} logo={eq?.tag || title} logoUri={pickImage(eq, ['logo_url'], 'team-logos')} title={title} meta={[entry.numero_vaga ? `vaga ${entry.numero_vaga}` : '', eq?.tag || '', entry.grupo_id ? 'com grupo' : 'sem grupo'].filter(Boolean).join(' - ')} tag={entry.status || 'ativa'} right={eq?.tag || 'ver'} />
      })}
    </View> : null}

    {tab === 'jogadores' ? <View>
      <SectionHeader title="Jogadores" action={`${jogadores.length + jogadoresAvulsos.length} nomes`} />
      {isOrganizer ? <View style={styles.adminActions}>
        <Button label="Criar jogador avulso" onPress={() => openAvulsoModal()} />
        <Button label="Adicionar perfil de jogo" variant="ghost" onPress={() => { setSelectedAvulso(null); setPrefillTeam(null); setPlayerForm({ nick: '', uid_jogo: '', funcao: '', foto_url: '', perfil_jogo_id: '' }); setPlayerModalOpen(true) }} />
      </View> : null}
      {!jogadores.length && !jogadoresAvulsos.length ? <CompactRow logo="JG" title="Nenhum jogador escalado" meta="As escalacoes aparecem aqui" tag="aguardando" /> : null}
      {jogadores.map((jogador, index) => {
        const perfil = first(jogador.perfis_jogo)
        const nick = perfil?.nick || jogador.nick_snapshot || `Jogador ${index + 1}`
        return <CompactRow key={`perfil-${jogador.id}`} onPress={() => openPlayerSheet({ tipo: 'perfil', jogador })} logo={nick} logoUri={perfil?.foto_capa || undefined} type="player" title={nick} meta={`UID ${perfil?.uid_jogo || jogador.uid_jogo_snapshot || '-'} - ${jogador.status || 'ativo'}`} tag="perfil" right="ver" />
      })}
      {jogadoresAvulsos.map((avulso, index) => <CompactRow key={`avulso-${avulso.id}`} onPress={() => openPlayerSheet({ tipo: 'avulso', jogador: avulso })} logo={avulso.nick} logoUri={avulso.foto_url || undefined} type="player" title={avulso.nick} meta={`UID ${avulso.uid_jogo || '-'} - ${avulso.funcao || 'avulso provisório'}`} tag="avulso" right={`#${jogadores.length + index + 1}`} />)}
    </View> : null}

    {tab === 'grupos' ? <View>
      <SectionHeader title="Grupos" action={`${grupos.length} grupos`} />
      {isOrganizer ? <View style={styles.adminActions}><Button label="Criar fase" variant="ghost" onPress={() => setPhaseModalOpen(true)} /><Button label="Criar grupo" onPress={() => openGroupModal()} /></View> : null}
      {!grupos.length ? <CompactRow logo="GP" title="Grupos ainda nao publicados" meta="A organizacao ainda nao gerou os grupos" tag="pendente" /> : null}
      {grupos.map((grupo) => {
        const totalGrupo = teams.filter((team) => team.grupo_id === grupo.id).length
        return <CompactRow key={grupo.id} onPress={() => openGroupModal(grupo)} logo="GP" title={texto(grupo.nome, 'Grupo')} meta={`${totalGrupo}/${grupo.qtd_slots || grupo.quantidade_equipes || '-'} equipes - ${grupo.horario_inicio || 'sem horario'}`} tag={grupo.status || 'ativo'} right="abrir" />
      })}
    </View> : null}

    {tab === 'jogos' ? <View>
      <SectionHeader title={isDiario ? 'Horarios' : 'Jogos'} action={`${isDiario ? grupos.length : jogos.length} itens`} />
      {isDiario ? <>
        {!grupos.length ? <CompactRow logo="HR" title="Nenhum horario cadastrado" meta="Adicione os grupos independentes do diario" tag="pendente" /> : null}
        {grupos.map((grupo, index) => <CompactRow
          key={grupo.id}
          onPress={() => { setDiarioGroupId(String(grupo.id)); setTab('tabela') }}
          logo={`${index + 1}`}
          title={grupo.nome || `Horario ${index + 1}`}
          meta={`${grupo.horario_inicio || 'sem horario'} - ${grupo.qtd_slots || grupo.quantidade_equipes || 0} vagas - ${grupo.qtd_quedas || 0} quedas`}
          tag={grupo.status || 'rascunho'}
          right={money(grupo.premiacao)}
        />)}
      </> : <>
        {!jogos.length ? <CompactRow logo="JG" title="Nenhum jogo publicado" meta="Agenda ainda nao cadastrada" tag="pendente" /> : null}
        {jogos.map((jogo, index) => <CompactRow key={jogo.id} logo="JG" title={jogo.nome || jogo.nome_bloco || `Jogo ${index + 1}`} meta={[jogo.mapa || '', jogo.data_hora || jogo.data_jogo || '', jogo.numero_queda ? `queda ${jogo.numero_queda}` : ''].filter(Boolean).join(' - ')} tag="agenda" />)}
      </>}
    </View> : null}

    {tab === 'tabela' ? <View>
      <SectionHeader title={isLiga ? 'Tabela' : 'Tabela e MVP'} action={tabelaView === 'tabela' ? `${ranking.length} equipes` : `${mvpRanking.length} jogadores`} />
      {isDiario && grupos.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.diarioGroupFilter}>
        {grupos.map((grupo) => {
          const active = String(diarioGroupId) === String(grupo.id)
          return <Pressable key={grupo.id} onPress={() => setDiarioGroupId(String(grupo.id))} style={[styles.diarioGroupChip, { borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.primary : colors.card }]}>
            <Ionicons name="time-outline" size={14} color={active ? colors.bg : colors.text} />
            <View>
              <Body style={[styles.diarioGroupChipTitle, active && { color: colors.bg }]}>{grupo.horario_inicio || grupo.nome || 'Horario'}</Body>
              <Tiny style={active ? { color: colors.bg } : undefined}>{money(grupo.premiacao)}</Tiny>
            </View>
          </Pressable>
        })}
      </ScrollView> : null}
      <View style={styles.switcher}>
        <Pressable onPress={() => setTabelaView('tabela')} style={[styles.switchButton, tabelaView === 'tabela' && styles.switchButtonActive]}>
          <Body style={[styles.switchText, tabelaView === 'tabela' && styles.switchTextActive]}>Tabela</Body>
        </Pressable>
        <Pressable onPress={() => setTabelaView('mvp')} style={[styles.switchButton, tabelaView === 'mvp' && styles.switchButtonActive]}>
          <Body style={[styles.switchText, tabelaView === 'mvp' && styles.switchTextActive]}>MVP</Body>
        </Pressable>
        <Pressable onPress={() => setTabelaView('pontuador')} style={[styles.switchButton, tabelaView === 'pontuador' && styles.switchButtonActive]}>
          <Body style={[styles.switchText, tabelaView === 'pontuador' && styles.switchTextActive]}>Pontuador</Body>
        </Pressable>
      </View>
      {tabelaView === 'tabela' ? <>
        {!ranking.length ? <CompactRow logo="TB" title="Tabela ainda vazia" meta="Resultados aparecem depois das partidas" tag="0 pts" /> : <TabelaCampeonatoMobile rows={ranking} />}
      </> : tabelaView === 'mvp' ? <>
        {!mvpRanking.length ? <CompactRow logo="MVP" title="Ranking MVP ainda vazio" meta="Abates dos jogadores aparecem depois das sumulas" tag="0 abates" /> : null}
        {mvpRanking.map((row, index) => <CompactRow key={row.id} logo={row.nome} type="player" title={`${index + 1}. ${row.nome}`} meta={`${row.equipe} - ${row.quedas} quedas`} tag={row.tag} right={`${row.abates} abates`} />)}
      </> : <PontuadorMobile
        equipes={pontuadorEquipes}
        fases={fases}
        grupos={grupos}
        quedas={pontuadorQuedas}
        queda={pontuadorQueda}
        vinculos={pontuadorVinculos}
        matchResultTeams={matchResultTeams}
        faseId={pontuadorFaseId}
        grupoId={pontuadorGroupId}
        mapa={pontuadorQueda?.mapa || pontuadorMapa}
        screenSize={screenSize}
        draft={pontuadorDraft}
        pontosAbate={pontosAbate}
        pontosColocacao={pontosColocacao}
        saving={savingPontuador}
        uploadingMatchResult={uploadingMatchResult}
        isOrganizer={isOrganizer}
        onOpenOptions={() => setPontuadorOptionsOpen(true)}
        onImportMatchResult={importMatchResult}
        onVinculoChange={savePontuadorVinculo}
        onChange={updatePontuadorRow}
        onSave={savePontuador}
      />}
    </View> : null}

    {tab === 'regras' ? <View>
      <SectionHeader title="Regras" action="campeonato" />
      <View style={styles.rulesBox}>
        <Ionicons name="document-text-outline" size={20} color={colors.primary} />
        <View style={{ flex: 1 }}>
          <Body style={styles.ruleTitle}>Regras e informacoes</Body>
          <Tiny>Formato: {texto(item.formato || item.tipo_competicao || item.modelo_competicao)}. Plataforma: {texto(item.plataforma)}. Status: {texto(item.status)}.</Tiny>
        </View>
      </View>
    </View> : null}



    <Modal visible={Boolean(selectedTeam)} transparent animationType="slide" onRequestClose={closeTeamSheet}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <SectionHeader title={selectedTeamTitle} action={selectedTeam?.status || 'equipe'} />
          <View style={styles.sheetHeader}>
            <LogoAvatar name={selectedTeamRef?.tag || selectedTeamTitle} uri={pickImage(selectedTeamRef, ['logo_url'], 'team-logos')} size={54} rounded={14} />
            <View style={{ flex: 1 }}>
              <Body style={styles.sheetTitle}>{selectedTeamTitle}</Body>
              <Tiny>{[selectedTeam?.numero_vaga ? `Vaga ${selectedTeam.numero_vaga}` : '', selectedTeamRef?.tag || '', selectedTeam?.grupo_id ? 'com grupo' : 'sem grupo'].filter(Boolean).join(' - ') || 'Equipe do campeonato'}</Tiny>
            </View>
          </View>
          <Button label="Ver perfil completo" variant="ghost" onPress={() => { const eq = selectedTeamRef; closeTeamSheet(); if (eq?.id && first(selectedTeam?.equipes)) router.push(`/equipe/${eq.id}`) }} />
          {isOrganizer && selectedTeam ? <>
            <Button label="Escalar jogador" onPress={() => { const entry = selectedTeam; closeTeamSheet(); openAvulsoModal(null, { equipe_id: entry.equipe_id, equipe_avulsa_id: entry.equipe_avulsa_id }) }} />
            <Button label="Remover equipe do campeonato" variant="ghost" onPress={() => removeTeamFromChampionship(selectedTeam)} />
          </> : null}
          <Button label="Fechar" variant="ghost" onPress={closeTeamSheet} />
        </View>
      </View>
    </Modal>

    <Modal visible={Boolean(selectedPlayer)} transparent animationType="slide" onRequestClose={closePlayerSheet}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <SectionHeader title={selectedPlayerTitle} action={selectedPlayer?.tipo === 'avulso' ? 'avulso' : 'perfil'} />
          <View style={styles.sheetHeader}>
            <LogoAvatar name={selectedPlayerTitle} uri={selectedPlayer?.tipo === 'avulso' ? selectedPlayer.jogador.foto_url || undefined : selectedPerfil?.foto_capa || undefined} size={54} rounded={14} />
            <View style={{ flex: 1 }}>
              <Body style={styles.sheetTitle}>{selectedPlayerTitle}</Body>
              <Tiny>UID {selectedPlayerUid}</Tiny>
              <Tiny>{selectedPlayer?.tipo === 'avulso' ? selectedPlayer.jogador.funcao || 'avulso provisório' : selectedPlayer?.jogador.status || 'ativo'}</Tiny>
            </View>
          </View>
          {selectedPlayer?.tipo === 'perfil' && selectedPerfil?.id ? <Button label="Ver perfil completo" variant="ghost" onPress={() => { const pid = selectedPerfil.id; closePlayerSheet(); router.push(`/jogador/${pid}`) }} /> : null}
          {isOrganizer && selectedPlayer ? <>
            {selectedPlayer.tipo === 'avulso' ? <>
              <Button label="Editar jogador avulso" onPress={() => { const jogador = selectedPlayer.jogador; closePlayerSheet(); openAvulsoModal(jogador) }} />
              <Button label="Trocar avulso por perfil de jogo" variant="ghost" onPress={() => { const jogador = selectedPlayer.jogador; closePlayerSheet(); openAvulsoModal(jogador) }} />
            </> : null}
            <Button label="Remover jogador do campeonato" variant="ghost" onPress={removePlayerFromChampionship} />
          </> : null}
          <Button label="Fechar" variant="ghost" onPress={closePlayerSheet} />
        </View>
      </View>
    </Modal>

    <Modal visible={playerModalOpen} transparent animationType="slide" onRequestClose={() => setPlayerModalOpen(false)}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <SectionHeader title={selectedAvulso ? 'Editar jogador avulso' : 'Escalar jogador'} action="campeonato" />
          <TextInput value={playerForm.nick} onChangeText={(nick) => setPlayerForm((v) => ({ ...v, nick }))} placeholder="Nick do jogador avulso" style={styles.input} />
          <TextInput value={playerForm.uid_jogo} onChangeText={(uid_jogo) => setPlayerForm((v) => ({ ...v, uid_jogo }))} placeholder="ID do jogo" style={styles.input} />
          <Pressable style={styles.selectInput} onPress={() => setRolePickerOpen(true)}>
            <Body style={playerForm.funcao ? styles.selectValue : styles.selectPlaceholder}>{playerForm.funcao || 'Selecionar função'}</Body>
            <Ionicons name="chevron-down" size={18} color={colors.muted} />
          </Pressable>
          <Pressable style={styles.uploadBox} onPress={openPlayerPhotoMenu} disabled={uploadingPlayerPhoto}>
            <LogoAvatar name={playerForm.nick || 'Jogador'} uri={playerForm.foto_url || undefined} size={62} rounded={14} />
            <View style={styles.uploadInfo}>
              <Body style={styles.uploadTitle}>{uploadingPlayerPhoto ? 'Enviando foto...' : playerForm.foto_url ? 'Foto do jogador' : 'Adicionar foto'}</Body>
              <Tiny>{playerForm.foto_url ? 'Toque para trocar ou ver em tela cheia.' : 'Toque aqui para selecionar, ajustar e recortar.'}</Tiny>
            </View>
            <Ionicons name={playerForm.foto_url ? 'create-outline' : 'cloud-upload-outline'} size={24} color={colors.primary} />
          </Pressable>
          <TextInput value={playerForm.perfil_jogo_id} onChangeText={(perfil_jogo_id) => setPlayerForm((v) => ({ ...v, perfil_jogo_id }))} placeholder="Pesquisar/colar ID do perfil de jogo existente" style={styles.input} />
          <Button label={selectedAvulso ? 'Salvar jogador avulso' : 'Criar jogador avulso'} onPress={saveAvulso} />
          <Button label={selectedAvulso ? 'Trocar avulso por perfil de jogo' : 'Adicionar perfil de jogo'} variant="ghost" onPress={addPerfilJogo} />
          <Button label="Cancelar" variant="ghost" onPress={() => setPlayerModalOpen(false)} />
        </View>
      </View>
    </Modal>

    <Modal visible={rolePickerOpen} transparent animationType="fade" onRequestClose={() => setRolePickerOpen(false)}>
      <Pressable style={styles.modalBackdrop} onPress={() => setRolePickerOpen(false)}>
        <View style={styles.roleCard}>
          <SectionHeader title="Selecionar função" action="jogador" />
          {FUNCOES_JOGADOR.map((funcao) => (
            <Pressable key={funcao} style={styles.roleOption} onPress={() => { setPlayerForm((v) => ({ ...v, funcao })); setRolePickerOpen(false) }}>
              <Body style={styles.roleOptionText}>{funcao}</Body>
              {playerForm.funcao === funcao ? <Ionicons name="checkmark-circle" size={20} color={colors.primary} /> : null}
            </Pressable>
          ))}
          <Pressable style={styles.roleOption} onPress={() => { setPlayerForm((v) => ({ ...v, funcao: '' })); setRolePickerOpen(false) }}>
            <Body style={styles.roleOptionText}>Limpar função</Body>
          </Pressable>
        </View>
      </Pressable>
    </Modal>


    <Modal visible={pontuadorOptionsOpen} transparent animationType="slide" onRequestClose={() => setPontuadorOptionsOpen(false)}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <SectionHeader title="Filtros do pontuador" action={isLiga ? 'FASE/JOGO/QUEDA' : 'FASE/GRUPO/QUEDA'} />
          <Tiny style={styles.modalLabel}>Fase</Tiny>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            <Pressable style={[styles.chip, pontuadorFaseId === 'todas' && styles.chipActive]} onPress={() => { setPontuadorFaseId('todas'); setPontuadorGroupId(''); setPontuadorGameId('') }}><Tiny style={[styles.chipText, pontuadorFaseId === 'todas' && styles.chipTextActive]}>TODAS</Tiny></Pressable>
            {fases.map((fase) => <Pressable key={fase.id} style={[styles.chip, pontuadorFaseId === fase.id && styles.chipActive]} onPress={() => { setPontuadorFaseId(String(fase.id)); setPontuadorGroupId(''); setPontuadorGameId('') }}><Tiny style={[styles.chipText, pontuadorFaseId === fase.id && styles.chipTextActive]}>{texto(fase.nome, 'Fase')}</Tiny></Pressable>)}
          </ScrollView>
          <Tiny style={styles.modalLabel}>{isLiga ? 'Jogo' : 'Grupo'}</Tiny>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {pontuadorBlocos.map((bloco, index) => {
              const grupoId = getGrupoIdDoJogoMobile(bloco) || getGrupoIdPorNomeDoBloco(bloco, grupos)
              const grupoNome = grupos.find((grupo) => String(grupo.id) === String(grupoId))?.nome
              const label = texto(bloco.nome_bloco || grupoNome || bloco.nome, `${isLiga ? 'Jogo' : 'Grupo'} ${index + 1}`)
              return <Pressable key={bloco.id} style={[styles.chip, pontuadorGroupId === bloco.id && styles.chipActive]} onPress={() => { setPontuadorGroupId(String(bloco.id)); setPontuadorGameId('') }}><Tiny style={[styles.chipText, pontuadorGroupId === bloco.id && styles.chipTextActive]}>{label}</Tiny></Pressable>
            })}
            {!pontuadorBlocos.length ? <Tiny>Nenhum grupo/jogo encontrado nesta fase.</Tiny> : null}
          </ScrollView>
          <Tiny style={styles.modalLabel}>Queda</Tiny>
          <ScrollView style={styles.optionList}>
            {pontuadorQuedas.map((queda) => {
              const active = String(pontuadorQueda?.id || '') === String(queda.id)
              const grupoNome = texto(grupos.find((grupo) => String(grupo.id) === String(queda.grupo_id || ''))?.nome, '')
              return <Pressable key={queda.id} style={[styles.optionRow, active && styles.optionRowActive]} onPress={() => setPontuadorGameId(String(queda.id))}>
                <Body style={styles.optionTitle}>{queda.mapa}</Body>
                <Tiny>{[grupoNome, `Queda ${queda.numero_partida}`, formatShortDate(queda.data_hora)].filter(Boolean).join(' • ')}</Tiny>
              </Pressable>
            })}
            {!pontuadorQuedas.length ? <Tiny>Nenhuma queda encontrada. Verifique se a fase e o grupo/jogo selecionados são os mesmos da súmula do site.</Tiny> : null}
          </ScrollView>
          <Button label="Aplicar filtros" onPress={() => setPontuadorOptionsOpen(false)} />
          <Button label="Fechar" variant="ghost" onPress={() => setPontuadorOptionsOpen(false)} />
        </View>
      </View>
    </Modal>

    <Modal visible={phaseModalOpen} transparent animationType="slide" onRequestClose={() => setPhaseModalOpen(false)}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <SectionHeader title="Criar fase" action="campeonato" />
          <TextInput value={phaseName} onChangeText={setPhaseName} placeholder="Nome da fase" style={styles.input} />
          <Button label="Salvar fase" onPress={createPhase} />
          <Button label="Cancelar" variant="ghost" onPress={() => setPhaseModalOpen(false)} />
        </View>
      </View>
    </Modal>

    <Modal visible={groupModalOpen} transparent animationType="slide" onRequestClose={() => setGroupModalOpen(false)}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <SectionHeader title={selectedGroup ? texto(selectedGroup.nome, 'Grupo') : 'Novo grupo'} action={`${teams.filter((team) => selectedGroup && team.grupo_id === selectedGroup.id).length} equipes`} />
          {isOrganizer ? <>
            <TextInput value={groupForm.nome} onChangeText={(nome) => setGroupForm((v) => ({ ...v, nome }))} placeholder="Nome do grupo" style={styles.input} />
            <TextInput value={groupForm.qtd_slots} onChangeText={(qtd_slots) => setGroupForm((v) => ({ ...v, qtd_slots }))} placeholder="Quantidade de slots" keyboardType="numeric" style={styles.input} />
            <TextInput value={groupForm.horario_inicio} onChangeText={(horario_inicio) => setGroupForm((v) => ({ ...v, horario_inicio }))} placeholder="Horário de início" style={styles.input} />
            <TextInput value={groupForm.status} onChangeText={(status) => setGroupForm((v) => ({ ...v, status }))} placeholder="Status" style={styles.input} />
            <Button label="Salvar grupo" onPress={saveGroup} />
            {selectedGroup ? <Button label="Apagar grupo" variant="ghost" onPress={deleteGroup} /> : null}
          </> : null}
          {selectedGroup ? <ScrollView style={styles.groupList}>
            <Tiny style={styles.modalLabel}>Equipes no grupo</Tiny>
            {teams.filter((team) => team.grupo_id === selectedGroup.id).map((entry) => {
              const eq = getTeam(entry)
              const title = entry.nome_exibicao || eq?.nome || 'Equipe'
              return <View key={`in-${entry.id}`} style={styles.modalTeamRow}>
                <Body style={styles.modalTeamName}>{title}</Body>
                {isOrganizer ? <Pressable onPress={() => setTeamGroup(entry, null)}><Tiny style={styles.removeLink}>remover</Tiny></Pressable> : null}
              </View>
            })}
            <Tiny style={styles.modalLabel}>Equipes disponíveis</Tiny>
            {teams.filter((team) => team.grupo_id !== selectedGroup.id).map((entry) => {
              const eq = getTeam(entry)
              const title = entry.nome_exibicao || eq?.nome || 'Equipe'
              return <View key={`out-${entry.id}`} style={styles.modalTeamRow}>
                <Body style={styles.modalTeamName}>{title}</Body>
                {isOrganizer ? <Pressable onPress={() => setTeamGroup(entry, selectedGroup.id)}><Tiny style={styles.addLink}>adicionar</Tiny></Pressable> : null}
              </View>
            })}
          </ScrollView> : null}
          <Button label="Fechar" variant="ghost" onPress={() => setGroupModalOpen(false)} />
        </View>
      </View>
    </Modal>
  </Screen>
}

function formatShortDate(value?: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value).replace('T00:00:00+00:00', '')
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

function jogoLabel(jogo: Jogo, index = 0) {
  return jogo.mapa || (jogo.numero_queda ? `Queda ${jogo.numero_queda}` : `Queda ${index + 1}`)
}

function PontuadorMobile({ equipes, fases, grupos, quedas, queda, vinculos, matchResultTeams, faseId, grupoId, mapa, screenSize, draft, pontosAbate, pontosColocacao, saving, uploadingMatchResult, isOrganizer, onOpenOptions, onImportMatchResult, onVinculoChange, onChange, onSave }: {
  equipes: ChampionshipTeam[]
  fases: Fase[]
  grupos: Grupo[]
  quedas: PontuadorQueda[]
  queda: PontuadorQueda | null
  vinculos: Record<string, string>
  matchResultTeams: MatchResultTeam[]
  faseId: string
  grupoId: string
  mapa: string
  screenSize: { width: number; height: number }
  draft: Record<string, { posicao: string; abates: string }>
  pontosAbate: number
  pontosColocacao: number[]
  saving: boolean
  uploadingMatchResult: boolean
  isOrganizer: boolean
  onOpenOptions: () => void
  onImportMatchResult: () => void
  onVinculoChange: (teamId: string, nomeRaw: string) => void
  onChange: (teamId: string, field: 'posicao' | 'abates', value: string) => void
  onSave: () => void
}) {
  const faseNome = faseId === 'todas' ? 'Todas as fases' : texto(fases.find((fase) => String(fase.id) === String(faseId))?.nome, 'Fase')
  const grupoNome = texto(queda?.nome_bloco || grupos.find((grupo) => String(grupo.id) === String(queda?.grupo_id || ''))?.nome, 'Grupo')
  const [positionPickerTeamId, setPositionPickerTeamId] = useState<string | null>(null)
  const [linkPickerTeamId, setLinkPickerTeamId] = useState<string | null>(null)
  const quedaTitulo = queda?.mapa || mapa || 'Selecione uma queda'
  const quedaMeta = [queda?.numero_partida ? `Queda ${queda.numero_partida}` : '', queda?.data_hora ? formatShortDate(queda.data_hora) : ''].filter(Boolean).join(' • ')
  const positionOptions = Array.from({ length: 12 }, (_, index) => ({ value: String(index + 1), label: index === 0 ? 'B!' : String(index + 1) }))
  const selectMatchLink = (teamId: string, nomeRaw: string) => {
    onVinculoChange(teamId, nomeRaw)
    const raw = matchResultTeams.find((entry) => entry.nome_equipe === nomeRaw)
    if (raw) {
      onChange(teamId, 'posicao', String(raw.posicao || 12))
      onChange(teamId, 'abates', String(raw.abates_total || 0))
    }
    setLinkPickerTeamId(null)
  }

  const renderScoreSheet = () => (
    <View style={styles.scoreSheet}>
      <View style={[styles.scoreRow, styles.scoreRowHead]}>
        <Tiny style={[styles.scoreHeadText, styles.scoreLogoCol]}>LOGO</Tiny>
        <Tiny style={[styles.scoreHeadText, styles.scoreTagCol]}>TAG</Tiny>
        <Tiny style={[styles.scoreHeadText, styles.scoreLinkCol]}>MR</Tiny>
        <Tiny style={[styles.scoreHeadText, styles.scorePositionCol]}>POS</Tiny>
        <Tiny style={[styles.scoreHeadText, styles.scoreKillsCol]}>KILL</Tiny>
        <Tiny style={[styles.scoreHeadText, styles.scorePtsCol]}>PTS</Tiny>
      </View>
      {equipes.slice(0, 12).map((entry, index) => {
        const eq = getTeam(entry)
        const title = entry.nome_exibicao || eq?.nome || `Equipe ${index + 1}`
        const tag = String(eq?.tag || title || `E${index + 1}`).replace(/[^a-zA-Z0-9]/g, '').slice(0, 5).toUpperCase()
        const values = draft[String(entry.id)] || { posicao: String(index + 1), abates: '0' }
        const posicao = Number(values.posicao || index + 1)
        const abates = Number(values.abates || 0)
        const total = Number(pontosColocacao[posicao - 1] ?? 0) + abates * pontosAbate
        const vinculo = vinculos[String(entry.id)] || ''
        const linkStatus = vinculo === '__FALTA__' ? 'absent' : vinculo ? 'linked' : 'missing'
        return <View key={entry.id} style={styles.scoreRow}>
          <View style={styles.scoreLogoCol}>
            <LogoAvatar name={tag || title} uri={pickImage(eq, ['logo_url'], 'team-logos')} size={24} rounded={6} />
          </View>
          <Body numberOfLines={1} style={styles.scoreTagCol}>{tag}</Body>
          <View style={styles.scoreLinkCol}>
            <Pressable
              disabled={!isOrganizer}
              onPress={() => setLinkPickerTeamId(String(entry.id))}
              style={[styles.scoreLinkButton, linkStatus === 'linked' ? styles.scoreLinkLinked : linkStatus === 'absent' ? styles.scoreLinkAbsent : styles.scoreLinkMissing]}
            >
              <Ionicons name={linkStatus === 'linked' ? 'checkmark' : linkStatus === 'absent' ? 'remove' : 'close'} size={12} color={colors.white} />
            </Pressable>
          </View>
          <Pressable
            disabled={!isOrganizer}
            onPress={() => setPositionPickerTeamId(String(entry.id))}
            style={[styles.scoreSelectCell, styles.scorePositionCol]}
          >
            <Body style={styles.scoreSelectText}>{posicao === 1 ? 'B!' : posicao}</Body>
          </Pressable>
          <TextInput editable={isOrganizer} keyboardType="numeric" value={values.abates} onChangeText={(value) => onChange(String(entry.id), 'abates', value)} style={[styles.scoreCellInput, styles.scoreKillsCol]} />
          <Body style={[styles.scorePtsCol, styles.scorePtsText]}>{total}</Body>
        </View>
      })}
    </View>
  )

  return <View style={styles.scoreWrap}>
    <View style={styles.scoreHeader}>
      <View style={{ flex: 1 }}>
        <Tiny style={styles.scoreEyebrow}>Pontuador</Tiny>
        <Body style={styles.scoreTitle}>{quedaTitulo}</Body>
        <Tiny>{faseNome} • {grupoNome} • {quedaMeta || 'Queda'} • {equipes.length} equipes</Tiny>
      </View>
      <View style={styles.scoreHeaderActions}>
        {isOrganizer ? <Pressable style={styles.scoreCompactButton} onPress={onImportMatchResult} disabled={uploadingMatchResult}>
          <Ionicons name={uploadingMatchResult ? 'hourglass-outline' : 'cloud-upload-outline'} size={18} color={colors.primary} />
        </Pressable> : null}
        <Pressable style={styles.scoreCompactButton} onPress={onOpenOptions}>
          <Ionicons name="filter-outline" size={18} color={colors.primary} />
        </Pressable>
      </View>
    </View>
    {!isOrganizer ? <View style={styles.scoreNotice}><Tiny>Somente organizador/admin pode editar a súmula. A visualização continua liberada.</Tiny></View> : null}
    {!quedas.length ? <CompactRow logo="QD" title="Nenhuma queda cadastrada" meta="Cadastre as quedas no campeonato para usar o pontuador" tag="pendente" /> : null}
    {renderScoreSheet()}
    <Modal visible={!!positionPickerTeamId} transparent animationType="fade" onRequestClose={() => setPositionPickerTeamId(null)}>
      <View style={styles.modalBackdrop}>
        <View style={styles.positionPickerCard}>
          <View style={styles.modalTop}>
            <Body style={styles.modalTitle}>Selecionar posição</Body>
            <Tiny>PONTUAÇÃO</Tiny>
          </View>
          <View style={styles.positionGrid}>
            {positionOptions.map((option) => (
              <Pressable
                key={option.value}
                style={styles.positionOption}
                onPress={() => {
                  if (positionPickerTeamId) onChange(positionPickerTeamId, 'posicao', option.value)
                  setPositionPickerTeamId(null)
                }}
              >
                <Body style={styles.positionOptionText}>{option.label}</Body>
              </Pressable>
            ))}
          </View>
          <Button label="Cancelar" variant="ghost" onPress={() => setPositionPickerTeamId(null)} />
        </View>
      </View>
    </Modal>
    <Modal visible={!!linkPickerTeamId} transparent animationType="slide" onRequestClose={() => setLinkPickerTeamId(null)}>
      <View style={styles.modalBackdrop}>
        <View style={styles.positionPickerCard}>
          <View style={styles.modalTop}>
            <Body style={styles.modalTitle}>Vincular MatchResult</Body>
            <Tiny>{matchResultTeams.length} EQUIPES NO ARQUIVO</Tiny>
          </View>
          <ScrollView style={styles.linkOptionList}>
            <Pressable style={styles.linkOption} onPress={() => { if (linkPickerTeamId) selectMatchLink(linkPickerTeamId, ''); else setLinkPickerTeamId(null) }}>
              <View style={[styles.linkStatusDot, styles.scoreLinkMissing]} />
              <Body style={styles.linkOptionText}>Sem vínculo</Body>
            </Pressable>
            <Pressable style={styles.linkOption} onPress={() => { if (linkPickerTeamId) selectMatchLink(linkPickerTeamId, '__FALTA__'); else setLinkPickerTeamId(null) }}>
              <View style={[styles.linkStatusDot, styles.scoreLinkAbsent]} />
              <Body style={styles.linkOptionText}>Faltou na queda</Body>
            </Pressable>
            {matchResultTeams.map((raw) => {
              const selectedBy = Object.entries(vinculos).find(([, name]) => name === raw.nome_equipe)?.[0]
              const unavailable = Boolean(selectedBy && selectedBy !== linkPickerTeamId)
              return <Pressable key={raw.nome_equipe} disabled={unavailable} style={[styles.linkOption, unavailable && styles.linkOptionDisabled]} onPress={() => { if (linkPickerTeamId) selectMatchLink(linkPickerTeamId, raw.nome_equipe); else setLinkPickerTeamId(null) }}>
                <View style={[styles.linkStatusDot, styles.scoreLinkLinked]} />
                <Body numberOfLines={1} style={styles.linkOptionText}>{raw.nome_equipe}</Body>
                <Tiny>{raw.posicao}º · {raw.abates_total} kills</Tiny>
              </Pressable>
            })}
          </ScrollView>
          <Button label="Fechar" variant="ghost" onPress={() => setLinkPickerTeamId(null)} />
        </View>
      </View>
    </Modal>
    {isOrganizer ? <Button label={saving ? 'Salvando súmula...' : 'Salvar súmula da queda'} onPress={onSave} /> : null}
  </View>
}

function TabelaCampeonatoMobile({ rows }: { rows: TabelaRow[] }) {
  return <View style={styles.tableCard}>
    <View style={[styles.tableLine, styles.tableHead]}>
      <Tiny style={[styles.tableHeadText, styles.posCell]}>POS</Tiny>
      <Tiny style={[styles.tableHeadText, styles.teamCell]}>EQUIPE</Tiny>
      <Tiny style={styles.statCell}>QD</Tiny>
      <Tiny style={styles.statCell}>B!</Tiny>
      <Tiny style={styles.statCell}>KILL</Tiny>
      <Tiny style={[styles.statCell, styles.totalCell]}>PTS</Tiny>
    </View>

    {rows.map((row, index) => (
      <View key={row.id} style={styles.tableLine}>
        <Body style={styles.posCell}>{index + 1}</Body>
        <View style={styles.teamCell}>
          <LogoAvatar name={row.tag || row.nome} uri={row.logoUri} size={30} rounded={8} />
          <View style={styles.teamTextWrap}>
            <Body numberOfLines={1} style={styles.tableTeamName}>{row.nome}</Body>
            <Tiny numberOfLines={1}>{[row.tag || '', row.grupo !== '-' ? `Grupo ${row.grupo}` : ''].filter(Boolean).join(' - ')}</Tiny>
          </View>
        </View>
        <Body style={styles.statCell}>{row.partidas}</Body>
        <Body style={styles.statCell}>{row.booyahs}</Body>
        <Body style={styles.statCell}>{row.abates}</Body>
        <Body style={[styles.statCell, styles.totalText]}>{row.pontos}</Body>
      </View>
    ))}
  </View>
}

const styles = StyleSheet.create({

  rowWrap: { gap: 5, marginBottom: 6 },
  rowActions: { flexDirection: 'row', gap: 5 },
  smallAction: { flex: 1, minHeight: 32, paddingVertical: 7 },
  inlineButton: { marginTop: 0, minHeight: 34 },
  adminActions: { gap: 7, marginBottom: 8 },
  adminButton: { marginBottom: 8 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.48)', justifyContent: 'flex-end', padding: 14 },
  modalCard: { maxHeight: '88%', gap: 8, backgroundColor: colors.bg, borderRadius: 10, borderWidth: 1, borderColor: colors.border, padding: 12 },
  input: { minHeight: 44, borderWidth: 1, borderColor: colors.border, borderRadius: 6, paddingHorizontal: 10, backgroundColor: colors.card, color: colors.text, fontWeight: '700' },
  selectInput: { minHeight: 44, borderWidth: 1, borderColor: colors.border, borderRadius: 6, paddingHorizontal: 10, backgroundColor: colors.card, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  selectValue: { color: colors.text, fontWeight: '800' },
  selectPlaceholder: { color: colors.muted, fontWeight: '800' },
  uploadBox: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: colors.border, borderRadius: 6, backgroundColor: colors.card, padding: 10 },
  uploadInfo: { flex: 1, minWidth: 0 },
  uploadTitle: { fontWeight: '900' },
  roleCard: { marginTop: 'auto', gap: 7, backgroundColor: colors.bg, borderRadius: 10, borderWidth: 1, borderColor: colors.border, padding: 12 },
  modalTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  modalTitle: { flex: 1, fontSize: 16, fontWeight: '900' },
  roleOption: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: colors.borderSoft, borderRadius: 6, backgroundColor: colors.card, paddingHorizontal: 10 },
  roleOptionText: { fontWeight: '900', textTransform: 'uppercase' },
  groupList: { maxHeight: 260, marginVertical: 4 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  sheetTitle: { fontWeight: '900', fontSize: 16 },
  modalLabel: { marginTop: 8, marginBottom: 4, color: colors.muted, fontWeight: '900', textTransform: 'uppercase' },
  modalTeamRow: { minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: colors.borderSoft, borderRadius: 5, paddingHorizontal: 8, marginBottom: 5, backgroundColor: colors.card },
  modalTeamName: { flex: 1, fontWeight: '800' },
  removeLink: { color: '#ef4444', fontWeight: '900', textTransform: 'uppercase' },
  addLink: { color: colors.primary, fontWeight: '900', textTransform: 'uppercase' },
  tabs: { gap: 6, paddingVertical: 8 },
  tab: { height: 36, flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, borderRadius: 4, paddingHorizontal: 10 },
  tabActive: { borderColor: colors.primary, backgroundColor: colors.primary },
  tabText: { fontSize: 10.5, fontWeight: '800', textTransform: 'uppercase' },
  tabTextActive: { color: colors.white },
  switcher: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  diarioGroupFilter: { gap: 7, paddingBottom: 9 },
  diarioGroupChip: { minWidth: 104, height: 48, flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: 1, borderRadius: 6, paddingHorizontal: 9 },
  diarioGroupChipTitle: { fontSize: 12, fontWeight: '900' },
  switchButton: { flex: 1, height: 34, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 4, backgroundColor: colors.card },
  switchButtonActive: { borderColor: colors.primary, backgroundColor: colors.primary },
  switchText: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  switchTextActive: { color: colors.white },
  scoreWrap: { gap: 8 },
  scoreHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: colors.borderSoft, borderRadius: 8, backgroundColor: colors.card, padding: 10 },
  scoreEyebrow: { color: colors.primary, fontWeight: '900', textTransform: 'uppercase' },
  scoreTitle: { fontSize: 15, fontWeight: '900' },
  scoreHeaderActions: { flexDirection: 'row', gap: 5 },
  scoreCompactButton: { width: 36, height: 40, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 7, backgroundColor: colors.panel2 },
  scoreNotice: { borderWidth: 1, borderColor: colors.borderSoft, borderRadius: 6, backgroundColor: colors.panel2, padding: 9 },
  scoreSheet: { width: '100%', borderWidth: 1, borderColor: colors.borderSoft, borderRadius: 6, overflow: 'hidden', backgroundColor: colors.card },
  scoreSheetLandscape: { minWidth: 760 },
  scoreHorizontalContent: { paddingBottom: 16 },
  scoreRow: { minHeight: 34, flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.borderSoft },
  scoreRowHead: { minHeight: 28, borderTopWidth: 0, backgroundColor: colors.panel2 },
  scoreHeadText: { color: colors.muted, fontWeight: '900', textAlign: 'center' },
  scoreSlotCol: { width: 34, textAlign: 'center', fontWeight: '900' },
  scoreLogoCol: { width: 50, alignItems: 'center', justifyContent: 'center' },
  scoreTagCol: { flex: 1, minWidth: 55, maxWidth: 82, textAlign: 'center', fontWeight: '900', fontSize: 11 },
  scoreLinkCol: { width: 28, alignItems: 'center', justifyContent: 'center' },
  scoreLinkButton: { width: 20, height: 20, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  scoreLinkLinked: { backgroundColor: '#16a34a' },
  scoreLinkMissing: { backgroundColor: '#dc2626' },
  scoreLinkAbsent: { backgroundColor: '#d97706' },
  scoreTeamCol: { width: 265, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 8 },
  scoreBooyahCol: { width: 66, alignItems: 'center', justifyContent: 'center' },
  scoreTeamName: { flex: 1, minWidth: 0, fontWeight: '900', fontSize: 12 },
  scorePositionCol: { width: 58 },
  scoreKillsCol: { width: 58 },
  scorePtsCol: { width: 52, textAlign: 'center' },
  scoreCellInput: { height: 30, marginHorizontal: 4, borderWidth: 1, borderColor: colors.borderSoft, borderRadius: 5, backgroundColor: colors.panel2, color: colors.text, fontSize: 13, fontWeight: '900', textAlign: 'center', paddingVertical: 0 },
  scoreSelectCell: { height: 30, marginHorizontal: 4, borderWidth: 1, borderColor: colors.borderSoft, borderRadius: 5, backgroundColor: colors.panel2, alignItems: 'center', justifyContent: 'center' },
  scoreSelectText: { color: colors.text, fontSize: 13, fontWeight: '900' },
  scorePtsText: { color: colors.primary, fontWeight: '900', fontSize: 13 },
  positionPickerCard: { marginTop: 'auto', gap: 8, backgroundColor: colors.bg, borderRadius: 10, borderWidth: 1, borderColor: colors.border, padding: 12 },
  positionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  positionOption: { width: '30%', minHeight: 42, borderWidth: 1, borderColor: colors.borderSoft, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card },
  positionOptionText: { fontWeight: '900' },
  linkOptionList: { maxHeight: 360 },
  linkOption: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 9, borderBottomWidth: 1, borderBottomColor: colors.borderSoft, paddingHorizontal: 5 },
  linkOptionDisabled: { opacity: 0.35 },
  linkOptionText: { flex: 1, minWidth: 0, fontWeight: '800' },
  linkStatusDot: { width: 12, height: 12, borderRadius: 3 },
  optionList: { maxHeight: 190 },
  optionRow: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: colors.borderSoft, borderRadius: 6, backgroundColor: colors.card, paddingHorizontal: 10, marginBottom: 6 },
  optionRowActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  optionTitle: { fontWeight: '900' },
  chipRow: { gap: 6, paddingVertical: 6 },
  chip: { minHeight: 34, justifyContent: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 12, backgroundColor: colors.card },
  chipActive: { borderColor: colors.primary, backgroundColor: colors.primary },
  chipText: { fontWeight: '900', color: colors.text },
  chipTextActive: { color: colors.white },
  tableCard: { borderWidth: 1, borderColor: colors.borderSoft, borderRadius: 6, overflow: 'hidden', backgroundColor: colors.card },
  tableLine: { minHeight: 48, flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.borderSoft, paddingHorizontal: 7 },
  tableHead: { minHeight: 32, borderTopWidth: 0, backgroundColor: colors.panel2 },
  tableHeadText: { color: colors.muted, fontWeight: '900' },
  posCell: { width: 30, textAlign: 'center', fontWeight: '900' },
  teamCell: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 7 },
  teamTextWrap: { flex: 1, minWidth: 0 },
  tableTeamName: { fontSize: 12.5, fontWeight: '800' },
  statCell: { width: 43, textAlign: 'center', fontSize: 10.5, fontWeight: '800' },
  totalCell: { color: colors.primary },
  totalText: { color: colors.primary, fontWeight: '900' },
  landscapeModal: { flex: 1, backgroundColor: colors.bg, padding: 10, gap: 8 },
  landscapeBody: { flex: 1 },
  landscapeTopbar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  rotatedLandscapeStage: { flex: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  rotatedLandscapeContent: { transform: [{ rotate: '90deg' }], alignItems: 'center', justifyContent: 'center' },
  rulesBox: { minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderWidth: 1, borderColor: colors.borderSoft, borderRadius: 6, backgroundColor: colors.card },
  ruleTitle: { fontWeight: '800', marginBottom: 3 }
})
