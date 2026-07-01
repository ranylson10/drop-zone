'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useParams } from 'next/navigation'
import { Loader2, Trophy, Users, Filter, ListOrdered } from 'lucide-react'
import MVPTable from './MVPTable'

interface EquipeTabela {
 campeonato_equipe_id: string
 equipe_publica_id: string | null
 nome: string
 avatar_url: string
 grupo: string
 partidas: number
 booyahs: number
 abates: number
 pontos: number
}

interface MVPData {
 nick?: string
 equipe_nome_display?: string
 abates?: number
 quedas?: number
 avatar_url?: string | null
 equipe_avatar?: string | null
 perfil_jogo_id?: string | null
 equipe_id?: string | null
}

interface LayoutSettings {
 primary_color: string
 text_color: string
 header_bg_color: string
 header_text_color: string
 row_alt_bg: boolean
 row_bg_primary: string
 row_bg_secondary: string
 border_width: number
 border_color: string
 row_height: number
 table_width?: number
 column_widths?: Record<string, number>
 column_styles?: Record<string, { bg?: string; color?: string }>
 row_bg_image_url?: string | null
 row_bg_image_opacity?: number | null
}

const DEFAULT_COLUMN_WIDTHS: Record<string, number> = {
 pos: 52,
 logo: 72,
 equipe: 360,
 grupo: 70,
 quedas: 56,
 booyah: 56,
 kill: 70,
 total: 96,
}

const TABLE_COLUMN_KEYS = ['pos', 'logo', 'equipe', 'grupo', 'quedas', 'booyah', 'kill', 'total']

function getColumnWidth(layout: LayoutSettings, key: string, fallback: number) {
 return Number(layout.column_widths?.[key] || fallback)
}

function getTablePixelWidth(layout: LayoutSettings) {
 return TABLE_COLUMN_KEYS.reduce((total, key) => total + getColumnWidth(layout, key, DEFAULT_COLUMN_WIDTHS[key] || 60), 0)
}

function getColumnStyle(layout: LayoutSettings, key: string, fallback: React.CSSProperties = {}) {
 const style = layout.column_styles?.[key] || {}
 return {
 ...fallback,
 ...(style.bg ? { backgroundColor: style.bg } : {}),
 ...(style.color ? { color: style.color } : {}),
 }
}

function hexToRgba(hex: string, alpha: number) {
 const clean = String(hex || '#ffffff').replace('#', '')
 const value = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean
 const r = parseInt(value.slice(0, 2), 16)
 const g = parseInt(value.slice(2, 4), 16)
 const b = parseInt(value.slice(4, 6), 16)
 if ([r, g, b].some((n) => Number.isNaN(n))) return `rgba(255,255,255,${alpha})`
 return `rgba(${r},${g},${b},${alpha})`
}

function rowBackgroundStyle(layout: LayoutSettings, rowBg: string) {
 const image = String(layout.row_bg_image_url || '').trim()
 if (!image) return { backgroundColor: rowBg }
 const opacity = Math.max(0, Math.min(100, Number(layout.row_bg_image_opacity ?? 100))) / 100
 return {
 backgroundColor: rowBg,
 backgroundImage: `linear-gradient(${hexToRgba(rowBg, 1 - opacity)}, ${hexToRgba(rowBg, 1 - opacity)}), url(${image})`,
 backgroundSize: '100% 100%',
 backgroundPosition: 'left center',
 }
}

interface Fase {
 id: string
 nome: string
 ordem?: number | null
}

interface Jogo {
 id: string
 nome_bloco: string
 fase_id: string | null
 grupo_id?: string | null
 grupos_ids?: string[] | null
 created_at?: string | null
}

interface Grupo {
 id: string
 nome: string
}

interface CampeonatoEquipeRow {
 id: string
 equipe_id: string | null
 equipe_avulsa_id: string | null
 line_id?: string | null
 grupo_id: string | null
 status: string | null
 tipo_origem?: 'oficial' | 'app' | 'avulsa' | null
}

interface ResultadoJogoRow {
 campeonato_id: string
 fase_id: string | null
 jogo_id: string | null
 equipe_id: string | null
 grupo_id: string | null
 mapa: string | null
 abates: number | null
 posicao: number | null
 total_pontos?: number | null
}

const PONTOS_PADRAO = [12, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0, 0]

function letraGrupo(nome: any) {
 const texto = String(nome || '').trim()
 if (!texto) return '-'
 return texto.replace(/^GRUPO\s+/i, '').trim().slice(0, 2) || texto
}

export default function TabelaCampeonato() {
 const params = useParams()
 const campeonatoId = params?.id as string

 const [tab, setTab] = useState<'tabela' | 'mvp'>('tabela')
 const [equipes, setEquipes] = useState<EquipeTabela[]>([])
 const [mvp, setMvp] = useState<MVPData[]>([])
 const [loading, setLoading] = useState(true)

 const [fases, setFases] = useState<Fase[]>([])
 const [jogos, setJogos] = useState<Jogo[]>([])
 const [mapasDisponiveis, setMapasDisponiveis] = useState<string[]>([])
 const [gruposDisponiveis, setGruposDisponiveis] = useState<{ id: string; nome: string }[]>([])

 const [filtroFase, setFiltroFase] = useState('TODAS')
 const [filtroGrupo, setFiltroGrupo] = useState('TODOS')
 const [filtroMapa, setFiltroMapa] = useState('TODOS')
 const [filtroJogo, setFiltroJogo] = useState('TODOS')

 const [layout, setLayout] = useState<LayoutSettings>({
 primary_color: '#7cfc00',
 text_color: '#000000',
 header_bg_color: '#000000',
 header_text_color: '#ffffff',
 row_alt_bg: true,
 row_bg_primary: '#ffffff',
 row_bg_secondary: '#f9f9f9',
 border_width: 2,
 border_color: '#000000',
 row_height: 45,
 table_width: 100,
 column_widths: DEFAULT_COLUMN_WIDTHS,
 column_styles: {},
 row_bg_image_url: '',
 row_bg_image_opacity: 100,
 })

 const [pontosColocacao, setPontosColocacao] = useState<number[]>(PONTOS_PADRAO)
 const [pontosAbate, setPontosAbate] = useState<number>(1)

 const nomeFaseMap = useMemo(() => {
 const map: Record<string, string> = {}
 fases.forEach((f) => {
 map[String(f.id)] = String(f.nome || '')
 })
 return map
 }, [fases])

 const jogosFiltradosPorFase = useMemo(() => {
 if (filtroFase === 'TODAS') return jogos
 return jogos.filter((j) => String(j.fase_id || '') === filtroFase)
 }, [jogos, filtroFase])

 const carregarLayout = useCallback(async () => {
 if (!campeonatoId) return

 const { data } = await supabase
 .from('campeonato_layout')
 .select('*')
 .eq('campeonato_id', campeonatoId)
 .maybeSingle()

 if (data) {
 setLayout((current) => ({
 ...current,
 ...(data as LayoutSettings),
 column_widths: { ...DEFAULT_COLUMN_WIDTHS, ...((data as any).column_widths || {}) },
 column_styles: ((data as any).column_styles || {}),
 }))
 }
 }, [campeonatoId])

 const carregarPontuacao = useCallback(async () => {
 if (!campeonatoId) return

 try {
 const { data } = await supabase
 .from('campeonatos')
 .select('pontos_colocacao, pontos_abate')
 .eq('id', campeonatoId)
 .maybeSingle()

 const pontos =
 Array.isArray(data?.pontos_colocacao) && data.pontos_colocacao.length > 0
 ? data.pontos_colocacao.map((v: any) => Number(v || 0))
 : PONTOS_PADRAO

 setPontosColocacao(pontos)
 setPontosAbate(Number(data?.pontos_abate ?? 1))
 } catch (error) {
 console.error('Erro ao carregar pontuação:', error)
 setPontosColocacao(PONTOS_PADRAO)
 setPontosAbate(1)
 }
 }, [campeonatoId])

 const calcularPontosColocacao = useCallback(
 (posicao: number | null | undefined) => {
 const pos = Number(posicao || 0)
 if (!pos || pos < 1) return 0
 return Number(pontosColocacao[pos - 1] ?? 0)
 },
 [pontosColocacao]
 )

 const carregarDadosTabela = useCallback(async () => {
 if (!campeonatoId) return

 try {
 const { data: fasesData, error: fasesError } = await supabase
 .from('campeonato_fases')
 .select('id, nome, ordem')
 .eq('campeonato_id', campeonatoId)
 .order('ordem', { ascending: true })

 if (fasesError) throw fasesError

 const faseIds = (fasesData || []).map((f: any) => f.id)

 const [
 { data: jogosData, error: jogosError },
 { data: inscritasData, error: inscritasError },
 { data: resultadosData, error: resultadosError },
 { data: gruposData, error: gruposError },
 ] = await Promise.all([
 faseIds.length > 0
 ? supabase
 .from('jogos')
 .select('id, nome_bloco, fase_id, grupo_id, grupos_ids, created_at')
 .in('fase_id', faseIds)
 .order('created_at', { ascending: true })
 : Promise.resolve({ data: [], error: null }),
 supabase
 .from('campeonato_equipes')
 .select('id, equipe_id, equipe_avulsa_id, line_id, grupo_id, status, tipo_origem, nome_exibicao, numero_vaga')
 .eq('campeonato_id', campeonatoId)
 .order('created_at', { ascending: true }),
 supabase
 .from('resultados_jogos')
 .select('campeonato_id, fase_id, jogo_id, equipe_id, grupo_id, mapa, abates, posicao, total_pontos')
 .eq('campeonato_id', campeonatoId),
 supabase.from('campeonato_grupos').select('id, nome').eq('campeonato_id', campeonatoId),
 ])

 if (jogosError) throw jogosError
 if (inscritasError) throw inscritasError
 if (resultadosError) throw resultadosError
 if (gruposError) throw gruposError

 const fasesRows = (fasesData || []) as Fase[]
 const jogosRows = (jogosData || []) as Jogo[]
 const inscricoesRows = (inscritasData || []) as CampeonatoEquipeRow[]
 const resultadosRows = (resultadosData || []) as ResultadoJogoRow[]
 const gruposRows = (gruposData || []) as Grupo[]

 setFases(fasesRows)
 setJogos(jogosRows)

 const grupoNomeMap = new Map<string, string>(
 gruposRows.map((row) => [String(row.id), letraGrupo(row.nome)])
 )

 const idsEquipesOficiais = inscricoesRows
 .map((row) => String(row.equipe_id || '').trim())
 .filter(Boolean)

 const idsEquipesAvulsas = inscricoesRows
 .map((row) => String(row.equipe_avulsa_id || '').trim())
 .filter(Boolean)

 const [
 { data: equipesOficiaisData, error: equipesOficiaisError },
 { data: equipesAvulsasData, error: equipesAvulsasError },
 ] = await Promise.all([
 idsEquipesOficiais.length > 0
 ? supabase.from('equipes').select('id, nome, logo_url').in('id', idsEquipesOficiais)
 : Promise.resolve({ data: [], error: null }),
 idsEquipesAvulsas.length > 0
 ? supabase
 .from('equipes_avulsas_campeonato')
 .select('id, nome, logo_url')
 .in('id', idsEquipesAvulsas)
 : Promise.resolve({ data: [], error: null }),
 ])

 if (equipesOficiaisError) throw equipesOficiaisError
 if (equipesAvulsasError) throw equipesAvulsasError

 const equipesOficiaisMap = new Map<string, any>(
 ((equipesOficiaisData || []) as any[]).map((row) => [String(row.id), row])
 )

 const equipesAvulsasMap = new Map<string, any>(
 ((equipesAvulsasData || []) as any[]).map((row) => [String(row.id), row])
 )

 const campeonatoEquipeIdsSet = new Set(inscricoesRows.map((row) => String(row.id)))

 const equipePublicaToCampeonatoEquipe = new Map<string, string>()
 inscricoesRows.forEach((row) => {
 const equipePublicaId = row.equipe_id || row.equipe_avulsa_id
 // Fallback legado: só deve ser usado para resultados antigos.
 // No fluxo atual, resultados_jogos.equipe_id já é campeonato_equipes.id.
 if (equipePublicaId && !equipePublicaToCampeonatoEquipe.has(String(equipePublicaId))) {
 equipePublicaToCampeonatoEquipe.set(String(equipePublicaId), String(row.id))
 }
 })

 const gruposSet = new Set<string>()
 inscricoesRows.forEach((row) => {
 const grupoId = String(row.grupo_id || '').trim()
 if (grupoId) gruposSet.add(grupoId)
 })
 resultadosRows.forEach((row) => {
 const grupoId = String(row.grupo_id || '').trim()
 if (grupoId) gruposSet.add(grupoId)
 })
 jogosRows.forEach((jogo) => {
 const grupoId = String(jogo.grupo_id || '').trim()
 if (grupoId) gruposSet.add(grupoId)

 if (Array.isArray(jogo.grupos_ids)) {
 jogo.grupos_ids.forEach((g) => {
 const grupoMulti = String(g || '').trim()
 if (grupoMulti) gruposSet.add(grupoMulti)
 })
 }
 })

 setGruposDisponiveis(
 Array.from(gruposSet)
 .map((id) => ({
 id,
 nome: grupoNomeMap.get(id) || id,
 }))
 .sort((a, b) => a.nome.localeCompare(b.nome))
 )

 const mapasSet = new Set<string>()
 resultadosRows.forEach((row) => {
 const mapa = String(row.mapa || '').trim()
 if (mapa) mapasSet.add(mapa)
 })
 setMapasDisponiveis(Array.from(mapasSet))

 const resultadosFiltrados = resultadosRows.filter((row) => {
 if (filtroFase !== 'TODAS' && String(row.fase_id || '') !== filtroFase) return false
 if (filtroGrupo !== 'TODOS' && String(row.grupo_id || '') !== filtroGrupo) return false
 if (filtroMapa !== 'TODOS' && String(row.mapa || '') !== filtroMapa) return false
 if (filtroJogo !== 'TODOS' && String(row.jogo_id || '') !== filtroJogo) return false
 return true
 })

 const statsMap = new Map<
 string,
 { partidas: number; booyahs: number; abates: number; pontos: number }
 >()

 resultadosFiltrados.forEach((row) => {
 const equipeRef = String(row.equipe_id || '').trim()
 if (!equipeRef) return

 // No modo line, resultados_jogos.equipe_id representa campeonato_equipes.id.
 // Se vier um registro antigo com equipe_id público, cai no fallback legado abaixo.
 const campeonatoEquipeId = campeonatoEquipeIdsSet.has(equipeRef)
 ? equipeRef
 : equipePublicaToCampeonatoEquipe.get(equipeRef)

 if (!campeonatoEquipeId) return

 const atual = statsMap.get(campeonatoEquipeId) || {
 partidas: 0,
 booyahs: 0,
 abates: 0,
 pontos: 0,
 }

 const abates = Number(row.abates || 0)
 const posicao = Number(row.posicao || 0)
 const pontosSalvos = row.total_pontos
 const pontos =
 pontosSalvos !== null && pontosSalvos !== undefined
 ? Number(pontosSalvos || 0)
 : abates * pontosAbate + calcularPontosColocacao(posicao)

 atual.partidas += 1
 atual.booyahs += posicao === 1 ? 1 : 0
 atual.abates += abates
 atual.pontos += pontos

 statsMap.set(campeonatoEquipeId, atual)
 })

 const listaFormatada: EquipeTabela[] = inscricoesRows.map((item) => {
 const campeonatoEquipeId = String(item.id)
 const equipeOficial = item.equipe_id ? equipesOficiaisMap.get(String(item.equipe_id)) : null
 const equipeAvulsa = item.equipe_avulsa_id
 ? equipesAvulsasMap.get(String(item.equipe_avulsa_id))
 : null
 const stats = statsMap.get(campeonatoEquipeId)

 return {
 campeonato_equipe_id: campeonatoEquipeId,
 equipe_publica_id: item.equipe_id || item.equipe_avulsa_id || null,
 nome: item?.nome_exibicao || equipeOficial?.nome || equipeAvulsa?.nome || 'Equipe sem nome',
 avatar_url: equipeOficial?.logo_url || equipeAvulsa?.logo_url || '',
 grupo: item.grupo_id ? grupoNomeMap.get(String(item.grupo_id)) || String(item.grupo_id) : '-',
 partidas: stats?.partidas || 0,
 booyahs: stats?.booyahs || 0,
 abates: stats?.abates || 0,
 pontos: stats?.pontos || 0,
 }
 })

 listaFormatada.sort((a, b) => {
 return (
 b.pontos - a.pontos ||
 b.booyahs - a.booyahs ||
 b.abates - a.abates ||
 a.nome.localeCompare(b.nome)
 )
 })

 setEquipes(listaFormatada)
 } catch (error) {
 console.error('Erro ao carregar tabela do campeonato:', error)
 setEquipes([])
 }
 }, [
 campeonatoId,
 filtroFase,
 filtroGrupo,
 filtroJogo,
 filtroMapa,
 pontosAbate,
 calcularPontosColocacao,
 ])

 const carregarRankingMvp = useCallback(async () => {
 if (!campeonatoId) return

 try {
 const { data, error } = await supabase
 .from('mvp_ranking_campeonato')
 .select('*')
 .eq('campeonato_id', campeonatoId)

 if (error) throw error
 setMvp((data || []) as MVPData[])
 } catch (error) {
 console.error('Erro ao carregar MVP (view mvp_ranking_campeonato):', error)

 try {
 const { data } = await supabase
 .from('resultados_mvp')
 .select('campeonato_id, nick_raw, game_id_raw, abates, equipe_id, campeonato_equipe_id, equipes(nome, avatar_url)')
 .eq('campeonato_id', campeonatoId)

 const map = new Map<string, MVPData>()
 ;(data || []).forEach((row: any) => {
 const key = `${String(row.game_id_raw || row.nick_raw || Math.random())}::${String(row.campeonato_equipe_id || row.equipe_id || 'sem-line')}`
 const prev = map.get(key) || {
 nick: row.nick_raw,
 equipe_id: row.equipe_id,
 equipe_nome_display: row.equipes?.nome || '-',
 equipe_avatar: row.equipes?.avatar_url || null,
 abates: 0,
 quedas: 0,
 }

 prev.abates = Number(prev.abates || 0) + Number(row.abates || 0)
 prev.quedas = Number(prev.quedas || 0) + 1
 map.set(key, prev)
 })

 setMvp(Array.from(map.values()).sort((a, b) => Number(b.abates || 0) - Number(a.abates || 0)))
 } catch (fallbackError) {
 console.error('Erro no fallback do MVP:', fallbackError)
 setMvp([])
 }
 }
 }, [campeonatoId])

 useEffect(() => {
 if (!campeonatoId) return

 ;(async () => {
 setLoading(true)
 await Promise.all([carregarLayout(), carregarPontuacao(), carregarRankingMvp()])
 setLoading(false)
 })()
 }, [campeonatoId, carregarLayout, carregarPontuacao, carregarRankingMvp])

 useEffect(() => {
 if (!campeonatoId) return
 carregarDadosTabela()
 }, [campeonatoId, carregarDadosTabela])

 useEffect(() => {
 if (filtroJogo !== 'TODOS' && !jogosFiltradosPorFase.some((j) => j.id === filtroJogo)) {
 setFiltroJogo('TODOS')
 }
 }, [filtroJogo, jogosFiltradosPorFase])

 const subtituloFiltro = useMemo(() => {
 const partes: string[] = []

 if (filtroFase !== 'TODAS') {
 partes.push(`FASE: ${nomeFaseMap[filtroFase] || filtroFase}`)
 }

 if (filtroGrupo !== 'TODOS') {
 const grupo = gruposDisponiveis.find((g) => g.id === filtroGrupo)
 partes.push(`GRUPO: ${grupo?.nome || filtroGrupo}`)
 }

 if (filtroMapa !== 'TODOS') {
 partes.push(`MAPA: ${filtroMapa}`)
 }

 if (filtroJogo !== 'TODOS') {
 const jogo = jogos.find((j) => j.id === filtroJogo)
 partes.push(`JOGO: ${jogo?.nome_bloco || filtroJogo}`)
 }

 return partes.length > 0 ? partes.join(' • ') : 'GERAL DO CAMPEONATO'
 }, [filtroFase, filtroGrupo, filtroMapa, filtroJogo, nomeFaseMap, jogos, gruposDisponiveis])

 if (loading) {
 return (
 <div className="flex items-center justify-center p-20">
 <Loader2 className="animate-spin text-zinc-500" />
 </div>
 )
 }

 return (
 <div className="w-full space-y-4">
 <div className="flex w-fit items-center gap-2 border border-zinc-200 bg-white p-2 -[3px_3px_0px_0px_rgba(0,0,0,1)]">
 <button
 onClick={() => setTab('tabela')}
 className={`flex items-center gap-2 border border-zinc-200 px-4 py-2 text-[10px] font-semibold uppercase -[2px_2px_0px_0px_rgba(0,0,0,1)] ${
 tab === 'tabela' ? 'bg-white text-[#2563eb]' : 'bg-white text-zinc-500'
 }`}
 >
 <Trophy size={12} /> Classificação
 </button>

 <button
 onClick={() => setTab('mvp')}
 className={`flex items-center gap-2 border border-zinc-200 px-4 py-2 text-[10px] font-semibold uppercase -[2px_2px_0px_0px_rgba(0,0,0,1)] ${
 tab === 'mvp' ? 'bg-white text-[#2563eb]' : 'bg-white text-zinc-500'
 }`}
 >
 <ListOrdered size={12} /> Ranking MVP
 </button>
 </div>

 {tab === 'mvp' ? (
 <MVPTable data={mvp} />
 ) : (
 <>
 <div className="border border-zinc-200 bg-white p-3 -[3px_3px_0px_0px_rgba(0,0,0,1)]">
 <div className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase text-zinc-600">
 <Filter size={12} />
 Filtros da tabela
 </div>

 <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
 <select
 value={filtroFase}
 onChange={(e) => {
 setFiltroFase(e.target.value)
 setFiltroJogo('TODOS')
 }}
 className="border border-zinc-200 bg-white px-3 py-2 text-[10px] font-semibold uppercase outline-none"
 >
 <option value="TODAS">GERAL DO CAMPEONATO</option>
 {fases.map((fase) => (
 <option key={fase.id} value={fase.id}>
 {fase.nome}
 </option>
 ))}
 </select>

 <select
 value={filtroGrupo}
 onChange={(e) => setFiltroGrupo(e.target.value)}
 className="border border-zinc-200 bg-white px-3 py-2 text-[10px] font-semibold uppercase outline-none"
 >
 <option value="TODOS">TODOS OS GRUPOS</option>
 {gruposDisponiveis.map((grupo) => (
 <option key={grupo.id} value={grupo.id}>
 {grupo.nome}
 </option>
 ))}
 </select>

 <select
 value={filtroMapa}
 onChange={(e) => setFiltroMapa(e.target.value)}
 className="border border-zinc-200 bg-white px-3 py-2 text-[10px] font-semibold uppercase outline-none"
 >
 <option value="TODOS">TODOS OS MAPAS</option>
 {mapasDisponiveis.map((mapa) => (
 <option key={mapa} value={mapa}>
 {mapa}
 </option>
 ))}
 </select>

 <select
 value={filtroJogo}
 onChange={(e) => setFiltroJogo(e.target.value)}
 className="border border-zinc-200 bg-white px-3 py-2 text-[10px] font-semibold uppercase outline-none"
 >
 <option value="TODOS">TODOS OS JOGOS</option>
 {jogosFiltradosPorFase.map((jogo) => (
 <option key={jogo.id} value={jogo.id}>
 {jogo.nome_bloco}
 </option>
 ))}
 </select>
 </div>

 <div className="mt-3 text-[10px] font-semibold uppercase text-zinc-500">{subtituloFiltro}</div>
 </div>

 <div
 className="overflow-x-auto"
 style={{
 border: `${layout.border_width}px solid ${layout.border_color}`,
 backgroundColor: layout.row_bg_primary,
 boxShadow: '6px 6px 0px 0px rgba(0,0,0,1)',
 width: 'fit-content',
 maxWidth: '100%',
 marginInline: 'auto',
 }}
 >
 <table className="table-fixed border-collapse" style={{ width: getTablePixelWidth(layout), minWidth: getTablePixelWidth(layout) }}>
 <thead>
 <tr
 style={{
 backgroundColor: layout.header_bg_color,
 color: layout.header_text_color,
 }}
 >
 <th className="px-3 py-3 text-center text-[10px] font-semibold uppercase" style={getColumnStyle(layout, 'pos', { width: getColumnWidth(layout, 'pos', 52) })}>POS</th>
 <th className="px-3 py-3 text-center text-[10px] font-semibold uppercase" style={getColumnStyle(layout, 'logo', { width: getColumnWidth(layout, 'logo', 72) })}>LOGO</th>
 <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase" style={getColumnStyle(layout, 'equipe', { width: getColumnWidth(layout, 'equipe', 360) })}>EQUIPE</th>
 <th className="px-2 py-3 text-center text-[10px] font-semibold uppercase" style={getColumnStyle(layout, 'grupo', { width: getColumnWidth(layout, 'grupo', 70) })}>GRUPO</th>
 <th className="px-2 py-3 text-center text-[10px] font-semibold uppercase" style={getColumnStyle(layout, 'quedas', { width: getColumnWidth(layout, 'quedas', 56) })}>QD</th>
 <th className="px-2 py-3 text-center text-[10px] font-semibold uppercase" style={getColumnStyle(layout, 'booyah', { width: getColumnWidth(layout, 'booyah', 56) })}>B!</th>
 <th className="px-2 py-3 text-center text-[10px] font-semibold uppercase" style={getColumnStyle(layout, 'kill', { width: getColumnWidth(layout, 'kill', 70) })}>KILL</th>
 <th
 className="px-2 py-3 text-center text-[10px] font-semibold uppercase"
 style={getColumnStyle(layout, 'total', { width: getColumnWidth(layout, 'total', 96), backgroundColor: layout.primary_color, color: layout.text_color })}
 >
 TOTAL
 </th>
 </tr>
 </thead>

 <tbody>
 {equipes.length === 0 ? (
 <tr>
 <td
 colSpan={8}
 className="px-4 py-8 text-center text-[10px] font-semibold uppercase text-zinc-500"
 >
 Nenhuma equipe inscrita encontrada em campeonato_equipes
 </td>
 </tr>
 ) : (
 equipes.map((equipe, index) => (
 <tr
 key={equipe.campeonato_equipe_id}
 className="border-t border-zinc-200"
 style={{
 ...rowBackgroundStyle(
 layout,
 layout.row_alt_bg && index % 2 === 1 ? layout.row_bg_secondary : layout.row_bg_primary
 ),
 height: `${layout.row_height}px`,
 }}
 >
 <td className="px-3 py-2 text-center text-[11px] font-semibold" style={getColumnStyle(layout, 'pos')}>{index + 1}</td>

 <td className="px-3 py-2 text-center" style={getColumnStyle(layout, 'logo')}>
 <div className="mx-auto flex h-7 w-7 items-center justify-center">
 {equipe.avatar_url ? (
 <img src={equipe.avatar_url} alt="" className="h-full w-full object-contain" />
 ) : (
 <Users size={14} className="text-zinc-500" />
 )}
 </div>
 </td>

 <td className="px-3 py-2" style={getColumnStyle(layout, 'equipe')}>
 <div className="flex items-center gap-2">
 <span className="truncate text-[10px] font-semibold uppercase ">
 {equipe.nome}
 </span>
 </div>
 </td>

 <td className="px-2 py-2 text-center text-[10px] font-semibold uppercase" style={getColumnStyle(layout, 'grupo')}>
 {equipe.grupo || '-'}
 </td>
 <td className="px-2 py-2 text-center text-[10px] font-semibold" style={getColumnStyle(layout, 'quedas')}>{equipe.partidas}</td>
 <td className="px-2 py-2 text-center text-[10px] font-semibold" style={getColumnStyle(layout, 'booyah')}>{equipe.booyahs}</td>
 <td className="px-2 py-2 text-center text-[10px] font-semibold" style={getColumnStyle(layout, 'kill')}>{equipe.abates}</td>
 <td
 className="px-2 py-2 text-center text-[12px] font-semibold "
 style={getColumnStyle(layout, 'total', {
 backgroundColor: `${layout.primary_color}22`,
 color: layout.text_color,
 })}
 >
 {equipe.pontos}
 </td>
 </tr>
 ))
 )}
 </tbody>
 </table>
 </div>
 </>
 )}
 </div>
 )
}
