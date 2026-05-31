'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useParams } from 'next/navigation'
import { Loader2, Users, Filter } from 'lucide-react'

interface EquipeTabela {
 campeonato_equipe_id: string
 equipe_publica_id: string | null
 nome: string
 tag: string
 avatar_url: string
 grupo: string
 partidas: number
 booyahs: number
 abates: number
 pontos: number
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

interface CampeonatoEquipeRow {
 id: string
 equipe_id: string | null
 equipe_avulsa_id: string | null
 grupo_id: string | null
 fase_id?: string | null
 status?: string | null
}

interface ResultadoJogoRow {
 equipe_id: string | null
 fase_id?: string | null
 jogo_id?: string | null
 grupo_id?: string | null
 mapa?: string | null
 posicao?: number | null
 abates?: number | null
 total_pontos?: number | null
}

interface FaseRow {
 id: string
 nome: string
}

interface GrupoRow {
 id: string
 nome: string
 fase_id?: string | null
 classificam?: number | null
}

interface JogoRow {
 id: string
 nome_bloco: string | null
 fase_id?: string | null
 grupo_id?: string | null
}

type FiltroTipo = 'geral' | 'fase' | 'grupo' | 'mapa' | 'jogo'

const MAPA_LABELS: Record<string, string> = {
 bermuda: 'Bermuda',
 purgatorio: 'Purgatório',
 kalahari: 'Kalahari',
 alpes: 'Alpes',
 'nova terra': 'Nova Terra',
 nexterra: 'Nova Terra',
 solara: 'Solara',
}

function textoSeguro(v: any, fallback = '') {
 const s = String(v || '').trim()
 return s || fallback
}

function letraGrupo(nome: any) {
 const texto = textoSeguro(nome, '-')
 if (texto === '-') return '-'
 return texto.replace(/^GRUPO\s+/i, '').trim().slice(0, 2) || texto
}

function normalizarMapa(v: any) {
 const raw = textoSeguro(v).toLowerCase()
 return MAPA_LABELS[raw] || textoSeguro(v, '-')
}

export default function TabelaCampeonato() {
 const params = useParams()
 const id = params?.id as string

 const [equipes, setEquipes] = useState<EquipeTabela[]>([])
 const [loading, setLoading] = useState(true)

 const [inscritas, setInscritas] = useState<CampeonatoEquipeRow[]>([])
 const [resultados, setResultados] = useState<ResultadoJogoRow[]>([])
 const [fases, setFases] = useState<FaseRow[]>([])
 const [grupos, setGrupos] = useState<GrupoRow[]>([])
 const [jogos, setJogos] = useState<JogoRow[]>([])

 const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>('geral')
 const [faseSelecionada, setFaseSelecionada] = useState<string>('todas')
 const [grupoSelecionado, setGrupoSelecionado] = useState<string>('todos')
 const [mapaSelecionado, setMapaSelecionado] = useState<string>('todos')
 const [jogoSelecionado, setJogoSelecionado] = useState<string>('todos')
 const [filtroInicialAplicado, setFiltroInicialAplicado] = useState(false)

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

 const carregarLayout = useCallback(async () => {
 if (!id) return

 const { data, error } = await supabase
 .from('campeonato_layout')
 .select('*')
 .eq('campeonato_id', id)
 .maybeSingle()

 if (error) {
 console.error('Erro ao carregar layout da tabela:', error)
 return
 }

 if (data) setLayout(data as LayoutSettings)
 }, [id])

 const carregarDadosBase = useCallback(async () => {
 if (!id) return

 const [
 { data: inscritasData, error: inscritasError },
 { data: resultadosData, error: resultadosError },
 { data: gruposData, error: gruposError },
 { data: fasesData, error: fasesError },
 { data: jogosData, error: jogosError },
 ] = await Promise.all([
 supabase
 .from('campeonato_equipes')
 .select('id, equipe_id, equipe_avulsa_id, grupo_id, fase_id, status, nome_exibicao, numero_vaga')
 .eq('campeonato_id', id)
 .order('created_at', { ascending: true }),
 supabase
 .from('resultados_jogos')
 .select('equipe_id, fase_id, jogo_id, grupo_id, mapa, posicao, abates, total_pontos')
 .eq('campeonato_id', id),
 supabase
 .from('campeonato_grupos')
 .select('id, nome, fase_id, classificam')
 .eq('campeonato_id', id)
 .order('nome', { ascending: true }),
 supabase
 .from('campeonato_fases')
 .select('id, nome')
 .eq('campeonato_id', id)
 .order('ordem', { ascending: true }),
 supabase
 .from('jogos')
 .select('id, nome_bloco, fase_id, grupo_id')
 .eq('campeonato_id', id)
 .order('created_at', { ascending: true }),
 ])

 if (inscritasError) throw inscritasError
 if (resultadosError) throw resultadosError
 if (gruposError) throw gruposError
 if (fasesError) throw fasesError
 if (jogosError) throw jogosError

 setInscritas((inscritasData || []) as CampeonatoEquipeRow[])
 setResultados((resultadosData || []) as ResultadoJogoRow[])
 setGrupos((gruposData || []) as GrupoRow[])
 setFases((fasesData || []) as FaseRow[])
 setJogos((jogosData || []) as JogoRow[])
 }, [id])

 const gruposFiltrados = useMemo(() => {
 if (faseSelecionada === 'todas') return grupos
 return grupos.filter((g) => textoSeguro(g.fase_id) === faseSelecionada)
 }, [grupos, faseSelecionada])

 const jogosFiltrados = useMemo(() => {
 let lista = jogos
 if (faseSelecionada !== 'todas') {
 lista = lista.filter((j) => textoSeguro(j.fase_id) === faseSelecionada)
 }
 if (grupoSelecionado !== 'todos') {
 lista = lista.filter((j) => textoSeguro(j.grupo_id) === grupoSelecionado)
 }
 return lista
 }, [jogos, faseSelecionada, grupoSelecionado])

 useEffect(() => {
 if (filtroInicialAplicado || grupos.length === 0) return
 const primeiraFase = fases[0]?.id || grupos[0]?.fase_id || 'todas'
 const primeiroGrupo =
 grupos.find((grupo) => textoSeguro(grupo.fase_id) === textoSeguro(primeiraFase)) || grupos[0]

 setFiltroTipo('grupo')
 setFaseSelecionada(primeiraFase || 'todas')
 setGrupoSelecionado(primeiroGrupo?.id || 'todos')
 setFiltroInicialAplicado(true)
 }, [filtroInicialAplicado, fases, grupos])

 const mapasDisponiveis = useMemo(() => {
 let base = resultados

 if (faseSelecionada !== 'todas') {
 base = base.filter((r) => textoSeguro(r.fase_id) === faseSelecionada)
 }
 if (grupoSelecionado !== 'todos') {
 base = base.filter((r) => textoSeguro(r.grupo_id) === grupoSelecionado)
 }
 if (jogoSelecionado !== 'todos') {
 base = base.filter((r) => textoSeguro(r.jogo_id) === jogoSelecionado)
 }

 return Array.from(new Set(base.map((r) => normalizarMapa(r.mapa)).filter(Boolean))).sort((a, b) =>
 a.localeCompare(b)
 )
 }, [resultados, faseSelecionada, grupoSelecionado, jogoSelecionado])

 useEffect(() => {
 if (filtroTipo === 'geral') {
 setFaseSelecionada('todas')
 setGrupoSelecionado('todos')
 setMapaSelecionado('todos')
 setJogoSelecionado('todos')
 }
 if (filtroTipo === 'fase') {
 setGrupoSelecionado('todos')
 setMapaSelecionado('todos')
 setJogoSelecionado('todos')
 }
 if (filtroTipo === 'grupo') {
 setMapaSelecionado('todos')
 setJogoSelecionado('todos')
 }
 if (filtroTipo === 'mapa') {
 setJogoSelecionado('todos')
 }
 }, [filtroTipo])

 useEffect(() => {
 if (grupoSelecionado !== 'todos' && !gruposFiltrados.some((g) => g.id === grupoSelecionado)) {
 setGrupoSelecionado('todos')
 }
 }, [grupoSelecionado, gruposFiltrados])

 useEffect(() => {
 if (jogoSelecionado !== 'todos' && !jogosFiltrados.some((j) => j.id === jogoSelecionado)) {
 setJogoSelecionado('todos')
 }
 }, [jogoSelecionado, jogosFiltrados])

 useEffect(() => {
 if (mapaSelecionado !== 'todos' && !mapasDisponiveis.includes(mapaSelecionado)) {
 setMapaSelecionado('todos')
 }
 }, [mapaSelecionado, mapasDisponiveis])

 const carregarDadosTabela = useCallback(async () => {
 if (!id) return

 try {
 const equipeIds = Array.from(new Set(inscritas.map((row) => textoSeguro(row.equipe_id)).filter(Boolean)))
 const equipeAvulsaIds = Array.from(
 new Set(inscritas.map((row) => textoSeguro(row.equipe_avulsa_id)).filter(Boolean))
 )

 const [
 { data: equipesOficiaisData, error: equipesOficiaisError },
 { data: equipesAvulsasData, error: equipesAvulsasError },
 ] = await Promise.all([
 equipeIds.length > 0
 ? supabase.from('equipes').select('id, nome, tag, logo_url').in('id', equipeIds)
 : Promise.resolve({ data: [], error: null }),
 equipeAvulsaIds.length > 0
 ? supabase
 .from('equipes_avulsas_campeonato')
 .select('id, nome, tag, logo_url')
 .in('id', equipeAvulsaIds)
 : Promise.resolve({ data: [], error: null }),
 ])

 if (equipesOficiaisError) throw equipesOficiaisError
 if (equipesAvulsasError) throw equipesAvulsasError

 const gruposMap = new Map<string, string>(grupos.map((row) => [textoSeguro(row.id), letraGrupo(row.nome)]))
 const gruposById = new Map<string, GrupoRow>(grupos.map((row) => [textoSeguro(row.id), row]))
 const jogosById = new Map<string, JogoRow>(jogos.map((row) => [textoSeguro(row.id), row]))

 const equipesOficiaisMap = new Map<string, any>(
 ((equipesOficiaisData || []) as any[]).map((row) => [textoSeguro(row.id), row])
 )

 const equipesAvulsasMap = new Map<string, any>(
 ((equipesAvulsasData || []) as any[]).map((row) => [textoSeguro(row.id), row])
 )

 let inscritosFiltrados = [...inscritas]
 let resultadosFiltrados = [...resultados]

 if (filtroTipo === 'fase' || filtroTipo === 'grupo' || filtroTipo === 'mapa' || filtroTipo === 'jogo') {
 if (faseSelecionada !== 'todas') {
 inscritosFiltrados = inscritosFiltrados.filter((item) => {
 if (textoSeguro(item.fase_id) === faseSelecionada) return true
 const grupo = item.grupo_id ? gruposById.get(textoSeguro(item.grupo_id)) : null
 return textoSeguro(grupo?.fase_id) === faseSelecionada
 })

 resultadosFiltrados = resultadosFiltrados.filter((r) => textoSeguro(r.fase_id) === faseSelecionada)
 }
 }

 if (filtroTipo === 'grupo' || filtroTipo === 'mapa' || filtroTipo === 'jogo') {
 if (grupoSelecionado !== 'todos') {
 inscritosFiltrados = inscritosFiltrados.filter((item) => textoSeguro(item.grupo_id) === grupoSelecionado)
 resultadosFiltrados = resultadosFiltrados.filter((r) => textoSeguro(r.grupo_id) === grupoSelecionado)
 }
 }

 if (filtroTipo === 'mapa' || filtroTipo === 'jogo') {
 if (mapaSelecionado !== 'todos') {
 resultadosFiltrados = resultadosFiltrados.filter((r) => normalizarMapa(r.mapa) === mapaSelecionado)
 }
 }

 if (filtroTipo === 'jogo') {
 if (jogoSelecionado !== 'todos') {
 const jogo = jogosById.get(jogoSelecionado) || null
 resultadosFiltrados = resultadosFiltrados.filter((r) => textoSeguro(r.jogo_id) === jogoSelecionado)

 if (jogo) {
 inscritosFiltrados = inscritosFiltrados.filter((item) => {
 if (jogo.grupo_id) return textoSeguro(item.grupo_id) === textoSeguro(jogo.grupo_id)
 if (jogo.fase_id) {
 if (textoSeguro(item.fase_id) === textoSeguro(jogo.fase_id)) return true
 const grupo = item.grupo_id ? gruposById.get(textoSeguro(item.grupo_id)) : null
 return textoSeguro(grupo?.fase_id) === textoSeguro(jogo.fase_id)
 }
 return true
 })
 }
 }
 }

 const mapaResultados = new Map<
 string,
 {
 partidas: number
 booyahs: number
 abates: number
 pontos: number
 grupo_id: string | null
 }
 >()

 for (const resultado of resultadosFiltrados) {
 const campeonatoEquipeId = textoSeguro(resultado?.equipe_id)
 if (!campeonatoEquipeId) continue

 const atual = mapaResultados.get(campeonatoEquipeId) || {
 partidas: 0,
 booyahs: 0,
 abates: 0,
 pontos: 0,
 grupo_id: null as string | null,
 }

 atual.partidas += 1
 atual.abates += Number(resultado?.abates || 0)
 atual.pontos += Number(resultado?.total_pontos || 0)

 if (Number(resultado?.posicao || 0) === 1) {
 atual.booyahs += 1
 }

 const grupoResultado = textoSeguro(resultado?.grupo_id)
 if (!atual.grupo_id && grupoResultado) atual.grupo_id = grupoResultado

 mapaResultados.set(campeonatoEquipeId, atual)
 }

 const listaFormatada: EquipeTabela[] = inscritosFiltrados.map((item) => {
 const campeonatoEquipeId = textoSeguro(item?.id)
 const equipePublicaId = textoSeguro(item?.equipe_id || item?.equipe_avulsa_id) || null

 const equipeOficial = item?.equipe_id ? equipesOficiaisMap.get(textoSeguro(item.equipe_id)) : null
 const equipeAvulsa = item?.equipe_avulsa_id
 ? equipesAvulsasMap.get(textoSeguro(item.equipe_avulsa_id))
 : null

 const stats = mapaResultados.get(campeonatoEquipeId)
 const grupoFinalId = textoSeguro(stats?.grupo_id || item?.grupo_id)
 const grupoNome = grupoFinalId ? gruposMap.get(grupoFinalId) || '-' : '-'

 return {
 campeonato_equipe_id: campeonatoEquipeId,
 equipe_publica_id: equipePublicaId,
 nome: item?.nome_exibicao || equipeOficial?.nome || equipeAvulsa?.nome || 'Sem Nome',
 tag: textoSeguro(equipeOficial?.tag || equipeAvulsa?.tag || item?.nome_exibicao || equipeOficial?.nome || equipeAvulsa?.nome, 'EQ').slice(0, 5),
 avatar_url: equipeOficial?.logo_url || equipeAvulsa?.logo_url || '',
 grupo: grupoNome,
 partidas: stats?.partidas || 0,
 booyahs: stats?.booyahs || 0,
 abates: stats?.abates || 0,
 pontos: stats?.pontos || 0,
 }
 })

 listaFormatada.sort((a, b) => {
 if (b.pontos !== a.pontos) return b.pontos - a.pontos
 if (b.booyahs !== a.booyahs) return b.booyahs - a.booyahs
 if (b.abates !== a.abates) return b.abates - a.abates
 return a.nome.localeCompare(b.nome)
 })

 setEquipes(listaFormatada)
 } catch (err: any) {
 console.error('Erro ao carregar tabela de classificação:', err)
 console.error('message:', err?.message)
 console.error('details:', err?.details)
 console.error('hint:', err?.hint)
 console.error('code:', err?.code)
 setEquipes([])
 }
 }, [
 id,
 inscritas,
 resultados,
 grupos,
 jogos,
 filtroTipo,
 faseSelecionada,
 grupoSelecionado,
 mapaSelecionado,
 jogoSelecionado,
 ])

 useEffect(() => {
 if (!id) return

 async function inicializar() {
 setLoading(true)
 try {
 await Promise.all([carregarDadosBase(), carregarLayout()])
 } finally {
 setLoading(false)
 }
 }

 inicializar()
 }, [id, carregarDadosBase, carregarLayout])

 useEffect(() => {
 if (!id || inscritas.length === 0) return
 carregarDadosTabela()
 }, [id, inscritas, resultados, grupos, jogos, carregarDadosTabela])

 if (loading) {
 return (
 <div className='flex items-center justify-center p-20'>
 <Loader2 className='animate-spin text-zinc-500' />
 </div>
 )
 }

 const topEquipe = equipes[0] || null
 const grupoAtual = grupoSelecionado !== 'todos' ? grupos.find((grupo) => grupo.id === grupoSelecionado) : null
 const limiteClassificados = grupoAtual ? Number(grupoAtual.classificam || 0) : 0

 return (
 <div className='w-full space-y-4'>
 <div className='flex flex-wrap items-center gap-2'>
 <div className='flex items-center gap-2 border border-zinc-200 bg-white px-3 py-2'>
 <Filter size={14} className='text-zinc-500' />
 <span className='text-[10px] font-semibold uppercase text-zinc-500'>Filtro</span>
 </div>

 <select
 value={filtroTipo}
 onChange={(e) => setFiltroTipo(e.target.value as FiltroTipo)}
 className='border border-zinc-200 bg-white px-3 py-2 text-[10px] font-semibold uppercase outline-none'
 >
 <option value='geral'>Tabela Geral</option>
 <option value='fase'>Por Fase</option>
 <option value='grupo'>Por Grupo</option>
 <option value='mapa'>Por Mapa</option>
 <option value='jogo'>Por Jogo</option>
 </select>

 {(filtroTipo === 'fase' || filtroTipo === 'grupo' || filtroTipo === 'mapa' || filtroTipo === 'jogo') && (
 <select
 value={faseSelecionada}
 onChange={(e) => setFaseSelecionada(e.target.value)}
 className='border border-zinc-200 bg-white px-3 py-2 text-[10px] font-semibold uppercase outline-none'
 >
 <option value='todas'>Todas as fases</option>
 {fases.map((fase) => (
 <option key={fase.id} value={fase.id}>
 {fase.nome}
 </option>
 ))}
 </select>
 )}

 {(filtroTipo === 'grupo' || filtroTipo === 'mapa' || filtroTipo === 'jogo') && (
 <select
 value={grupoSelecionado}
 onChange={(e) => setGrupoSelecionado(e.target.value)}
 className='border border-zinc-200 bg-white px-3 py-2 text-[10px] font-semibold uppercase outline-none'
 >
 <option value='todos'>Todos os grupos</option>
 {gruposFiltrados.map((grupo) => (
 <option key={grupo.id} value={grupo.id}>
 {grupo.nome}
 </option>
 ))}
 </select>
 )}

 {(filtroTipo === 'mapa' || filtroTipo === 'jogo') && (
 <select
 value={mapaSelecionado}
 onChange={(e) => setMapaSelecionado(e.target.value)}
 className='border border-zinc-200 bg-white px-3 py-2 text-[10px] font-semibold uppercase outline-none'
 >
 <option value='todos'>Todos os mapas</option>
 {mapasDisponiveis.map((mapa) => (
 <option key={mapa} value={mapa}>
 {mapa}
 </option>
 ))}
 </select>
 )}

 {filtroTipo === 'jogo' && (
 <select
 value={jogoSelecionado}
 onChange={(e) => setJogoSelecionado(e.target.value)}
 className='border border-zinc-200 bg-white px-3 py-2 text-[10px] font-semibold uppercase outline-none'
 >
 <option value='todos'>Todos os jogos</option>
 {jogosFiltrados.map((jogo) => (
 <option key={jogo.id} value={jogo.id}>
 {textoSeguro(jogo.nome_bloco, 'Jogo')}
 </option>
 ))}
 </select>
 )}
 </div>

 <div className='grid gap-4 xl:grid-cols-[340px_minmax(0,0.8fr)] xl:justify-center'>
 {topEquipe ? (
 <aside
 className='hidden xl:flex self-start flex-col overflow-hidden border bg-white'
 style={{
 borderColor: `${layout.border_color}33`,
 boxShadow: '0 1px 3px rgba(15, 23, 42, 0.08)',
 }}
 >
 <div
 className='p-4 text-black'
 style={{ backgroundColor: layout.primary_color }}
 >
 <div className='text-[9px] font-black uppercase tracking-[0.24em] opacity-70'>Top 1</div>
 <div className='mt-1 text-xl font-black uppercase leading-none'>{limiteClassificados > 0 ? 'Classificado' : 'Destaque'}</div>
 </div>

 <div className='flex flex-1 flex-col items-center justify-center px-5 py-6 text-center'>
 <div className='flex h-28 w-28 items-center justify-center border border-zinc-200 bg-zinc-50 p-3'>
 {topEquipe.avatar_url ? (
 <img src={topEquipe.avatar_url} alt='' className='h-full w-full object-contain' />
 ) : (
 <Users size={40} className='text-zinc-400' />
 )}
 </div>
 <div className='mt-4 text-lg font-black uppercase leading-tight text-[#142340]'>{topEquipe.nome}</div>
 <div className='mt-2 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500'>Grupo {topEquipe.grupo}</div>
 </div>

 <div className='grid grid-cols-2 border-t border-zinc-200 text-center'>
 <TopStat label='Total' value={topEquipe.pontos} highlight color={layout.primary_color} />
 <TopStat label='Kills' value={topEquipe.abates} />
 <TopStat label='Booyah' value={topEquipe.booyahs} />
 <TopStat label='Quedas' value={topEquipe.partidas} />
 </div>
 </aside>
 ) : null}

 <div
 style={{
 border: `1px solid ${layout.border_color}22`,
 backgroundColor: layout.row_bg_primary,
 boxShadow: '0 1px 3px rgba(15, 23, 42, 0.08)',
 }}
 className='overflow-hidden'
 >
 <table className='w-full table-fixed border-collapse sm:table-auto'>
 <thead>
 <tr style={{ backgroundColor: layout.header_bg_color, color: layout.header_text_color }}>
 <th className='hidden px-3 py-3 text-[10px] font-semibold uppercase w-12 text-center sm:table-cell'>POS</th>
 <th className='w-[36%] px-1 py-1.5 text-left text-[8px] font-semibold uppercase sm:w-auto sm:px-3 sm:py-3 sm:text-[10px]'>EQUIPE</th>
 <th className='w-[10%] px-0.5 py-1.5 text-center text-[8px] font-semibold uppercase sm:w-14 sm:px-2 sm:py-3 sm:text-[10px]'>
 <span className='sm:hidden'>G</span>
 <span className='hidden sm:inline'>GRUPO</span>
 </th>
 <th className='w-[10%] px-0.5 py-1.5 text-center text-[8px] font-semibold uppercase sm:w-10 sm:px-2 sm:py-3 sm:text-[10px]'>QD</th>
 <th className='w-[10%] px-0.5 py-1.5 text-center text-[8px] font-semibold uppercase sm:w-10 sm:px-2 sm:py-3 sm:text-[10px]'>B!</th>
 <th className='w-[14%] px-0.5 py-1.5 text-center text-[8px] font-semibold uppercase sm:w-14 sm:px-2 sm:py-3 sm:text-[10px]'>KILL</th>
 <th
 className='w-[20%] border-l-2 px-0.5 py-1.5 text-center text-[8px] font-semibold uppercase sm:w-24 sm:px-4 sm:py-3 sm:text-[11px]'
 style={{
 backgroundColor: layout.primary_color,
 color: '#000',
 borderColor: layout.border_color,
 }}
 >
 <span className='sm:hidden'>PTS</span>
 <span className='hidden sm:inline'>TOTAL</span>
 </th>
 </tr>
 </thead>

 <tbody style={{ color: layout.text_color }}>
 {equipes.length === 0 ? (
 <tr>
 <td
 colSpan={7}
 className='px-4 py-10 text-center text-[10px] font-semibold uppercase text-zinc-500'
 >
 Nenhuma equipe encontrada para este filtro.
 </td>
 </tr>
 ) : (
 equipes.map((equipe, index) => {
 const isEven = index % 2 === 0
 const classificado = limiteClassificados > 0 && index < limiteClassificados
 const rowBg = layout.row_alt_bg
 ? isEven
 ? layout.row_bg_primary
 : layout.row_bg_secondary
 : layout.row_bg_primary

 return (
 <tr
 key={equipe.campeonato_equipe_id}
 className='h-9 sm:h-[var(--ranking-row-height)]'
 style={{
 backgroundColor: classificado ? `${layout.primary_color}16` : rowBg,
 '--ranking-row-height': `${layout.row_height}px`,
 borderBottom: `${layout.border_width > 0 ? 1 : 0}px solid ${layout.border_color}22`,
 } as React.CSSProperties}
 >
 <td className='hidden text-center font-semibold text-sm sm:table-cell'>{index + 1}º</td>

 <td className='px-1 sm:px-3'>
 <div className='flex min-w-0 items-center gap-1 sm:gap-2'>
 {equipe.avatar_url ? (
 <img
 src={equipe.avatar_url}
 className='h-5 w-5 shrink-0 object-contain border border-zinc-200/10 sm:h-7 sm:w-7'
 alt='logo'
 />
 ) : (
 <div className='flex h-5 w-5 shrink-0 items-center justify-center border border-zinc-200/10 bg-white sm:h-7 sm:w-7'>
 <Users size={12} className='text-zinc-500 sm:size-3.5' />
 </div>
 )}

 <span className='hidden font-semibold uppercase text-[11px] sm:inline'>
 {equipe.nome}
 </span>
 <span className='min-w-0 truncate text-[8px] font-semibold uppercase sm:hidden'>
 {equipe.tag}
 </span>
 {classificado ? (
 <span className='hidden border px-1.5 py-0.5 text-[8px] font-black uppercase sm:inline-flex' style={{ borderColor: layout.primary_color, color: layout.primary_color }}>
 Classificado
 </span>
 ) : null}
 </div>
 </td>

 <td className='px-0.5 text-center text-[9px] font-semibold opacity-70 sm:text-[10px] sm:font-bold'>{equipe.grupo}</td>

 <td className='px-0.5 text-center text-[9px] font-semibold sm:text-[11px] sm:font-bold'>{equipe.partidas}</td>

 <td
 className='px-0.5 text-center text-[9px] font-semibold sm:text-[12px]'
 style={{ color: isEven ? '#ff4500' : 'inherit' }}
 >
 {equipe.booyahs}
 </td>

 <td className='px-0.5 text-center text-[9px] font-semibold sm:text-[11px] sm:font-bold'>{equipe.abates}</td>

 <td
 className='border-l-2 px-0.5 text-center text-[9px] font-semibold sm:text-sm'
 style={{
 backgroundColor: `${layout.primary_color}33`,
 borderColor: layout.border_color,
 }}
 >
 {equipe.pontos}
 </td>
 </tr>
 )
 })
 )}
 </tbody>
 </table>
 </div>
 </div>
 </div>
 )
}

function TopStat({ label, value, highlight = false, color = '#7cfc00' }: { label: string; value: number; highlight?: boolean; color?: string }) {
 return (
 <div className='border-r border-b border-zinc-200 p-3 last:border-r-0' style={highlight ? { backgroundColor: `${color}33` } : undefined}>
 <div className='text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500'>{label}</div>
 <div className='mt-1 text-xl font-black text-[#142340]'>{value}</div>
 </div>
 )
}

