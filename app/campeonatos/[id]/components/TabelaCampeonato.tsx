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

 if (data) setLayout(data as LayoutSettings)
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
 className="overflow-hidden"
 style={{
 border: `${layout.border_width}px solid ${layout.border_color}`,
 backgroundColor: layout.row_bg_primary,
 boxShadow: '6px 6px 0px 0px rgba(0,0,0,1)',
 }}
 >
 <table className="w-full border-collapse">
 <thead>
 <tr
 style={{
 backgroundColor: layout.header_bg_color,
 color: layout.header_text_color,
 }}
 >
 <th className="w-12 px-3 py-3 text-center text-[10px] font-semibold uppercase">POS</th>
 <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase">EQUIPE</th>
 <th className="w-16 px-2 py-3 text-center text-[10px] font-semibold uppercase">GRUPO</th>
 <th className="w-12 px-2 py-3 text-center text-[10px] font-semibold uppercase">QD</th>
 <th className="w-12 px-2 py-3 text-center text-[10px] font-semibold uppercase">B!</th>
 <th className="w-14 px-2 py-3 text-center text-[10px] font-semibold uppercase">KILL</th>
 <th
 className="w-24 px-2 py-3 text-center text-[10px] font-semibold uppercase"
 style={{ backgroundColor: layout.primary_color, color: layout.text_color }}
 >
 TOTAL
 </th>
 </tr>
 </thead>

 <tbody>
 {equipes.length === 0 ? (
 <tr>
 <td
 colSpan={7}
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
 backgroundColor:
 layout.row_alt_bg && index % 2 === 1
 ? layout.row_bg_secondary
 : layout.row_bg_primary,
 height: `${layout.row_height}px`,
 }}
 >
 <td className="px-3 py-2 text-center text-[11px] font-semibold">{index + 1}</td>

 <td className="px-3 py-2">
 <div className="flex items-center gap-2">
 <div className="flex h-7 w-7 items-center justify-center border border-zinc-200 bg-white">
 {equipe.avatar_url ? (
 <img src={equipe.avatar_url} alt="" className="h-full w-full object-cover" />
 ) : (
 <Users size={14} className="text-zinc-500" />
 )}
 </div>

 <span className="truncate text-[10px] font-semibold uppercase ">
 {equipe.nome}
 </span>
 </div>
 </td>

 <td className="px-2 py-2 text-center text-[10px] font-semibold uppercase">
 {equipe.grupo || '-'}
 </td>
 <td className="px-2 py-2 text-center text-[10px] font-semibold">{equipe.partidas}</td>
 <td className="px-2 py-2 text-center text-[10px] font-semibold">{equipe.booyahs}</td>
 <td className="px-2 py-2 text-center text-[10px] font-semibold">{equipe.abates}</td>
 <td
 className="px-2 py-2 text-center text-[12px] font-semibold "
 style={{
 backgroundColor: `${layout.primary_color}22`,
 color: layout.text_color,
 }}
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
