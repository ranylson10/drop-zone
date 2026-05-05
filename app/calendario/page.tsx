'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import {
 CalendarDays,
 ChevronDown,
 ChevronLeft,
 ChevronRight,
 Filter,
 Loader2,
 Search,
 Trophy,
 Layers3,
 Clock3,
 Swords,
 Palette,
 X,
} from 'lucide-react'

type HorarioKey =
 | '13:00'
 | '15:00'
 | '16:00'
 | '18:00'
 | '19:00'
 | '20:00'
 | '21:00'
 | '22:00'

type JogoRow = {
 id: string
 campeonato_id?: string | null
 fase_id: string | null
 nome_bloco: string | null
 data_jogo: string | null
 hora_jogo: string | null
 duracao_estimada_min: number | null
 quantidade_partidas: number | null
 quedas: Record<string, string> | null
}

type FaseRow = {
 id: string
 nome: string | null
 campeonato_id?: string | null
}

type CampeonatoRow = {
 id: string
 nome: string | null
}

type EventoCalendario = {
 id: string
 titulo: string
 descricao: string
 cor: string
 texto?: string
 horarioInicio: HorarioKey
 duracaoSlots: number
 faseNome?: string
 campeonatoNome?: string
 quantidadePartidas?: number | null
 duracaoMin?: number | null
 dataIso?: string
 quedas?: string[]
}

type DiaCalendario = {
 id: string
 diaSemana: string
 diaNumero: number
 dataIso: string
 eventos?: Partial<Record<HorarioKey, EventoCalendario>>
}

type SidebarJogo = {
 id: string
 titulo: string
 faseId: string | null
 faseNome: string
 campeonatoId: string | null
 campeonatoNome: string
 dataJogo: string
 horaJogo: string
 duracaoMin: number
 quantidadePartidas: number
}

type CampeonatoCor = {
 bg: string
 text: string
}

type CampeonatoAgrupado = {
 campeonatoId: string
 campeonatoNome: string
 jogos: SidebarJogo[]
 fases: Array<{
 faseId: string
 faseNome: string
 jogos: SidebarJogo[]
 }>
}

const HORARIOS: HorarioKey[] = ['13:00', '15:00', '16:00', '18:00', '19:00', '20:00', '21:00', '22:00']
const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Quar', 'Quin', 'Sex', 'Sáb']
const STORAGE_CORES_KEY = 'dropzone_calendario_cores_campeonato'

const MESES = [
 { chave: 'janeiro', nome: 'Janeiro', numero: 1 },
 { chave: 'fevereiro', nome: 'Fevereiro', numero: 2 },
 { chave: 'marco', nome: 'Março', numero: 3 },
 { chave: 'abril', nome: 'Abril', numero: 4 },
 { chave: 'maio', nome: 'Maio', numero: 5 },
 { chave: 'junho', nome: 'Junho', numero: 6 },
 { chave: 'julho', nome: 'Julho', numero: 7 },
 { chave: 'agosto', nome: 'Agosto', numero: 8 },
 { chave: 'setembro', nome: 'Setembro', numero: 9 },
 { chave: 'outubro', nome: 'Outubro', numero: 10 },
 { chave: 'novembro', nome: 'Novembro', numero: 11 },
 { chave: 'dezembro', nome: 'Dezembro', numero: 12 },
]

function pad2(value: number) {
 return String(value).padStart(2, '0')
}

function normalizarHorario(valor: string | null): HorarioKey | null {
 if (!valor) return null
 return valor.slice(0, 5) as HorarioKey
}

function calcularSlotsDuracao(horario: HorarioKey, duracaoMin: number | null) {
 const indiceInicio = HORARIOS.indexOf(horario)
 if (indiceInicio < 0) return 1

 const minutos = Math.max(duracaoMin || 60, 60)
 const slots = Math.max(1, Math.ceil(minutos / 60))
 const maximoDisponivel = HORARIOS.length - indiceInicio

 return Math.min(slots, maximoDisponivel)
}

function corDoEvento(chave: string) {
 const cores = [
 { bg: '#ff2b2b', text: '#ffffff' },
 { bg: '#3f7cff', text: '#ffffff' },
 { bg: '#6dbb45', text: '#08130a' },
 { bg: '#7a1cff', text: '#ffffff' },
 { bg: '#f2c230', text: '#111111' },
 { bg: '#eeff00', text: '#111111' },
 { bg: '#ff00ff', text: '#ffffff' },
 ]

 let hash = 0
 for (let i = 0; i < chave.length; i += 1) {
 hash = (hash << 5) - hash + chave.charCodeAt(i)
 hash |= 0
 }

 return cores[Math.abs(hash) % cores.length]
}

function montarDescricao(jogo: JogoRow, nomeFase: string, nomeCampeonato: string) {
 const quedasTexto = jogo.quedas ? Object.values(jogo.quedas).filter(Boolean).join(' • ') : ''

 const partes = [
 nomeCampeonato ? `Campeonato: ${nomeCampeonato}` : '',
 nomeFase ? `Fase: ${nomeFase}` : '',
 jogo.quantidade_partidas ? `Partidas: ${jogo.quantidade_partidas}` : '',
 jogo.duracao_estimada_min ? `Duração: ${jogo.duracao_estimada_min} min` : '',
 quedasTexto ? `Mapas: ${quedasTexto}` : '',
 ].filter(Boolean)

 return partes.join(' | ')
}

function gerarDiasBase(ano: number, mesNumero: number): DiaCalendario[] {
 const ultimoDia = new Date(ano, mesNumero, 0).getDate()

 return Array.from({ length: ultimoDia }, (_, index) => {
 const diaNumero = index + 1
 const data = new Date(ano, mesNumero - 1, diaNumero)
 const dataIso = `${ano}-${pad2(mesNumero)}-${pad2(diaNumero)}`

 return {
 id: `dia-${dataIso}`,
 diaSemana: DIAS_SEMANA[data.getDay()],
 diaNumero,
 dataIso,
 eventos: {},
 }
 })
}

function montarCalendarioDosJogos(
 jogos: JogoRow[],
 fasesMap: Map<string, string>,
 campeonatosMap: Map<string, string>,
 campeonatosCores: Record<string, CampeonatoCor>,
 ano: number,
 mesNumero: number
) {
 const dias = gerarDiasBase(ano, mesNumero)
 const diasMap = new Map(dias.map((dia) => [dia.dataIso, dia]))

 jogos.forEach((jogo) => {
 if (!jogo.data_jogo || !jogo.hora_jogo) return

 const [anoJogo, mesJogo] = jogo.data_jogo.split('-').map(Number)
 if (anoJogo !== ano || mesJogo !== mesNumero) return

 const dia = diasMap.get(jogo.data_jogo)
 const horarioInicio = normalizarHorario(jogo.hora_jogo)

 if (!dia || !horarioInicio) return

 const nomeFase = jogo.fase_id ? fasesMap.get(jogo.fase_id) || 'FASE' : 'SEM FASE'
 const nomeCampeonato = jogo.campeonato_id ? campeonatosMap.get(jogo.campeonato_id) || 'CAMPEONATO' : 'CAMPEONATO'
 const tituloBase = jogo.nome_bloco?.trim() || 'JOGO'
 const corPadrao = corDoEvento(`${nomeCampeonato}-${nomeFase}-${tituloBase}`)
 const corCustom = jogo.campeonato_id ? campeonatosCores[jogo.campeonato_id] : null
 const duracaoSlots = calcularSlotsDuracao(horarioInicio, jogo.duracao_estimada_min)
 const quedasLista = jogo.quedas ? Object.values(jogo.quedas).filter(Boolean) : []

 dia.eventos = dia.eventos || {}
 dia.eventos[horarioInicio] = {
 id: jogo.id,
 titulo: tituloBase,
 descricao: montarDescricao(jogo, nomeFase, nomeCampeonato),
 cor: corCustom?.bg || corPadrao.bg,
 texto: corCustom?.text || corPadrao.text,
 horarioInicio,
 duracaoSlots,
 faseNome: nomeFase,
 campeonatoNome: nomeCampeonato,
 quantidadePartidas: jogo.quantidade_partidas,
 duracaoMin: jogo.duracao_estimada_min,
 dataIso: jogo.data_jogo,
 quedas: quedasLista,
 }
 })

 return dias
}

function obterSlotsOcupados(dia: DiaCalendario) {
 const ocupados = new Set<number>()

 Object.values(dia.eventos || {}).forEach((evento) => {
 if (!evento) return
 const indiceInicio = HORARIOS.indexOf(evento.horarioInicio)
 if (indiceInicio < 0) return

 for (let i = 1; i < evento.duracaoSlots; i += 1) {
 ocupados.add(indiceInicio + i)
 }
 })

 return ocupados
}

function formatarDataCurta(dataIso: string) {
 const data = new Date(`${dataIso}T12:00:00`)
 return data.toLocaleDateString('pt-BR', {
 day: '2-digit',
 month: '2-digit',
 })
}

function carregarCoresSalvas() {
 if (typeof window === 'undefined') return {}
 try {
 const bruto = window.localStorage.getItem(STORAGE_CORES_KEY)
 if (!bruto) return {}
 return JSON.parse(bruto) as Record<string, CampeonatoCor>
 } catch {
 return {}
 }
}

function salvarCores(corMap: Record<string, CampeonatoCor>) {
 if (typeof window === 'undefined') return
 window.localStorage.setItem(STORAGE_CORES_KEY, JSON.stringify(corMap))
}

function agruparSidebarJogos(jogos: SidebarJogo[]) {
 const campeonatoMap = new Map<string, CampeonatoAgrupado>()

 jogos.forEach((jogo) => {
 const campeonatoId = jogo.campeonatoId || `sem-camp-${jogo.campeonatoNome}`
 const faseId = jogo.faseId || `sem-fase-${jogo.faseNome}`

 if (!campeonatoMap.has(campeonatoId)) {
 campeonatoMap.set(campeonatoId, {
 campeonatoId,
 campeonatoNome: jogo.campeonatoNome,
 jogos: [],
 fases: [],
 })
 }

 const campeonato = campeonatoMap.get(campeonatoId)!
 campeonato.jogos.push(jogo)

 let fase = campeonato.fases.find((item) => item.faseId === faseId)
 if (!fase) {
 fase = { faseId, faseNome: jogo.faseNome, jogos: [] }
 campeonato.fases.push(fase)
 }

 fase.jogos.push(jogo)
 })

 return Array.from(campeonatoMap.values()).map((campeonato) => ({
 ...campeonato,
 fases: campeonato.fases.sort((a, b) => a.faseNome.localeCompare(b.faseNome)),
 }))
}

export default function CalendariosPage() {
 const hoje = new Date()
 const [busca, setBusca] = useState('')
 const [mesAtivo, setMesAtivo] = useState(MESES[hoje.getMonth()].chave)
 const [anoAtivo, setAnoAtivo] = useState(hoje.getFullYear())
 const [jogos, setJogos] = useState<JogoRow[]>([])
 const [fasesMap, setFasesMap] = useState<Map<string, string>>(new Map())
 const [campeonatosMap, setCampeonatosMap] = useState<Map<string, string>>(new Map())
 const [campeonatosCores, setCampeonatosCores] = useState<Record<string, CampeonatoCor>>({})
 const [campeonatosAbertos, setCampeonatosAbertos] = useState<Record<string, boolean>>({})
 const [fasesAbertas, setFasesAbertas] = useState<Record<string, boolean>>({})
 const [loading, setLoading] = useState(true)
 const [erro, setErro] = useState<string | null>(null)
 const [eventoSelecionado, setEventoSelecionado] = useState<EventoCalendario | null>(null)

 const indiceMesAtual = Math.max(MESES.findIndex((mes) => mes.chave === mesAtivo), 0)
 const mesAtual = MESES[indiceMesAtual]

 useEffect(() => {
 setCampeonatosCores(carregarCoresSalvas())
 carregarJogos()
 }, [])

 async function carregarJogos() {
 try {
 setLoading(true)
 setErro(null)

 const { data: jogosData, error: jogosError } = await supabase
 .from('jogos')
 .select(
 `
 id,
 campeonato_id,
 fase_id,
 nome_bloco,
 data_jogo,
 hora_jogo,
 duracao_estimada_min,
 quantidade_partidas,
 quedas
 `
 )
 .not('data_jogo', 'is', null)
 .not('hora_jogo', 'is', null)
 .order('data_jogo', { ascending: true })
 .order('hora_jogo', { ascending: true })

 if (jogosError) throw jogosError

 const listaJogos = (jogosData || []) as JogoRow[]
 setJogos(listaJogos)

 const faseIds = [...new Set(listaJogos.map((item) => item.fase_id).filter(Boolean))] as string[]
 const campeonatoIds = [...new Set(listaJogos.map((item) => item.campeonato_id).filter(Boolean))] as string[]

 if (faseIds.length > 0) {
 const { data: fasesData, error: fasesError } = await supabase
 .from('campeonato_fases')
 .select('id, nome, campeonato_id')
 .in('id', faseIds)

 if (fasesError) throw fasesError

 setFasesMap(new Map(((fasesData || []) as FaseRow[]).map((fase) => [fase.id, fase.nome || 'FASE'])))
 } else {
 setFasesMap(new Map())
 }

 if (campeonatoIds.length > 0) {
 const { data: campeonatosData, error: campeonatosError } = await supabase
 .from('campeonatos')
 .select('id, nome')
 .in('id', campeonatoIds)

 if (campeonatosError) throw campeonatosError

 const mapa = new Map(((campeonatosData || []) as CampeonatoRow[]).map((camp) => [camp.id, camp.nome || 'CAMPEONATO']))
 setCampeonatosMap(mapa)

 const abertos: Record<string, boolean> = {}
 Array.from(mapa.keys()).forEach((id) => {
 abertos[id] = true
 })
 setCampeonatosAbertos((prev) => ({ ...abertos, ...prev }))
 } else {
 setCampeonatosMap(new Map())
 }
 } catch (err: any) {
 console.error('Erro ao carregar jogos para o calendário:', err)
 setErro(err?.message || 'Não foi possível carregar os jogos do calendário.')
 } finally {
 setLoading(false)
 }
 }

 const diasDoMes = useMemo(() => {
 return montarCalendarioDosJogos(jogos, fasesMap, campeonatosMap, campeonatosCores, anoAtivo, mesAtual.numero)
 }, [jogos, fasesMap, campeonatosMap, campeonatosCores, anoAtivo, mesAtual.numero])

 const diasFiltrados = useMemo(() => {
 const termo = busca.trim().toLowerCase()
 if (!termo) return diasDoMes

 return diasDoMes.filter((dia) =>
 HORARIOS.some((horario) => {
 const evento = dia.eventos?.[horario]
 return evento ? `${evento.titulo} ${evento.descricao}`.toLowerCase().includes(termo) : false
 })
 )
 }, [busca, diasDoMes])

 const sidebarJogos = useMemo<SidebarJogo[]>(() => {
 return jogos
 .filter((jogo) => !!jogo.data_jogo && !!jogo.hora_jogo)
 .filter((jogo) => {
 if (!busca.trim()) return true
 const faseNome = jogo.fase_id ? fasesMap.get(jogo.fase_id) || '' : ''
 const campeonatoNome = jogo.campeonato_id ? campeonatosMap.get(jogo.campeonato_id) || '' : ''
 const texto = `${jogo.nome_bloco || ''} ${faseNome} ${campeonatoNome}`.toLowerCase()
 return texto.includes(busca.trim().toLowerCase())
 })
 .map((jogo) => ({
 id: jogo.id,
 titulo: jogo.nome_bloco?.trim() || 'JOGO',
 faseId: jogo.fase_id || null,
 faseNome: jogo.fase_id ? fasesMap.get(jogo.fase_id) || 'FASE' : 'SEM FASE',
 campeonatoId: jogo.campeonato_id || null,
 campeonatoNome: jogo.campeonato_id ? campeonatosMap.get(jogo.campeonato_id) || 'CAMPEONATO' : 'CAMPEONATO',
 dataJogo: jogo.data_jogo || '',
 horaJogo: normalizarHorario(jogo.hora_jogo) || '--:--',
 duracaoMin: jogo.duracao_estimada_min || 60,
 quantidadePartidas: jogo.quantidade_partidas || 0,
 }))
 .sort((a, b) => `${a.dataJogo} ${a.horaJogo}`.localeCompare(`${b.dataJogo} ${b.horaJogo}`))
 }, [busca, jogos, fasesMap, campeonatosMap])

 const sidebarAgrupada = useMemo(() => agruparSidebarJogos(sidebarJogos), [sidebarJogos])

 const totalEventosDoMes = useMemo(() => {
 return diasFiltrados.reduce((acc, dia) => acc + Object.values(dia.eventos || {}).filter(Boolean).length, 0)
 }, [diasFiltrados])

 function irMesAnterior() {
 if (indiceMesAtual === 0) {
 setAnoAtivo((prev) => prev - 1)
 setMesAtivo(MESES[MESES.length - 1].chave)
 return
 }
 setMesAtivo(MESES[indiceMesAtual - 1].chave)
 }

 function irMesProximo() {
 if (indiceMesAtual === MESES.length - 1) {
 setAnoAtivo((prev) => prev + 1)
 setMesAtivo(MESES[0].chave)
 return
 }
 setMesAtivo(MESES[indiceMesAtual + 1].chave)
 }

 function toggleCampeonato(campeonatoId: string) {
 setCampeonatosAbertos((prev) => ({ ...prev, [campeonatoId]: !prev[campeonatoId] }))
 }

 function toggleFase(faseId: string) {
 setFasesAbertas((prev) => ({ ...prev, [faseId]: !prev[faseId] }))
 }

 function atualizarCorCampeonato(campeonatoId: string, campo: 'bg' | 'text', valor: string) {
 setCampeonatosCores((prev) => {
 const proximo = {
 ...prev,
 [campeonatoId]: {
 bg: prev[campeonatoId]?.bg || '#3f7cff',
 text: prev[campeonatoId]?.text || '#ffffff',
 [campo]: valor,
 },
 }
 salvarCores(proximo)
 return proximo
 })
 }

 return (
 <div className="h-screen overflow-hidden bg-white text-[#142340]">
 <div className="mx-auto h-full max-w-[1650px] px-4 py-4">
 <div className="grid h-full gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
 <div className="min-w-0 overflow-hidden border border-zinc-200/50 bg-transparent">
 <div className="h-full overflow-y-auto pr-1">
 <div className=" border border-zinc-200 bg-white p-4 ">
 <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
 <div>
 <div className="flex items-center gap-2 text-cyan-400">
 <CalendarDays size={18} />
 <span className="text-[11px] font-semibold uppercase tracking-[0.2em]">Calendário</span>
 </div>
 <h1 className="mt-2 text-3xl font-semibold uppercase tracking-tight text-[#142340]">
 Agenda de Campeonatos
 </h1>
 <p className="mt-2 text-sm font-medium text-zinc-500">
 Calendário puxando diretamente da tabela de jogos do campeonato.
 </p>
 </div>

 <div className="flex flex-col gap-3 md:flex-row">
 <div className="flex items-center gap-2 border border-zinc-200 bg-[#f7f7f7]/60 px-3 py-2">
 <Search size={16} className="text-zinc-500" />
 <input
 value={busca}
 onChange={(e) => setBusca(e.target.value)}
 placeholder="Buscar jogo ou fase"
 className="w-full bg-transparent text-sm font-semibold text-[#142340] outline-none placeholder:text-zinc-500 md:w-56"
 />
 </div>

 <div className="flex items-center gap-2 border border-zinc-200 bg-[#f7f7f7]/60 px-3 py-2">
 <Filter size={16} className="text-zinc-500" />
 <select
 value={mesAtivo}
 onChange={(e) => setMesAtivo(e.target.value)}
 className="bg-transparent text-sm font-bold uppercase text-[#142340] outline-none"
 >
 {MESES.map((mes) => (
 <option key={mes.chave} value={mes.chave} className="bg-white">
 {mes.nome}
 </option>
 ))}
 </select>
 </div>
 </div>
 </div>
 </div>

 {erro ? (
 <div className="mt-5 border border-red-500/30 bg-red-500/10 p-4">
 <p className="text-sm font-semibold uppercase tracking-[0.16em] text-red-300">
 Erro ao carregar calendário
 </p>
 <p className="mt-2 text-sm font-medium text-red-100/80">{erro}</p>
 </div>
 ) : null}

 <div className="mt-5 overflow-hidden border border-zinc-200 bg-white ">
 <div className="flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-3">
 <button
 onClick={irMesAnterior}
 className="inline-flex items-center gap-2 border border-zinc-200 bg-white/70 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-600 transition-colors hover:border-cyan-400 hover:text-[#142340]"
 >
 <ChevronLeft size={14} />
 Mês anterior
 </button>

 <h2 className="text-xl font-semibold uppercase tracking-[0.18em] text-[#142340]">
 {mesAtual.nome}
 </h2>

 <button
 onClick={irMesProximo}
 className="inline-flex items-center gap-2 border border-zinc-200 bg-white/70 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-600 transition-colors hover:border-cyan-400 hover:text-[#142340]"
 >
 Próximo mês
 <ChevronRight size={14} />
 </button>
 </div>

 <div className="overflow-x-auto">
 <div className="min-w-[910px]">
 <div className="grid grid-cols-[58px_42px_repeat(8,minmax(70px,1fr))] border-b border-zinc-200 bg-white">
 <div className="border-r border-zinc-200 px-2 py-3 text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
 Dia
 </div>
 <div className="border-r border-zinc-200 px-2 py-3 text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
 Nº
 </div>

 {HORARIOS.map((horario) => (
 <div
 key={horario}
 className="border-r border-zinc-200 px-2 py-3 text-center text-[11px] font-semibold text-[#142340] last:border-r-0"
 >
 {horario}
 </div>
 ))}
 </div>

 {loading ? (
 <div className="flex min-h-[320px] items-center justify-center bg-white">
 <div className="flex items-center gap-3 text-zinc-500">
 <Loader2 size={20} className="animate-spin" />
 <span className="text-sm font-semibold uppercase tracking-[0.16em]">Carregando jogos</span>
 </div>
 </div>
 ) : diasFiltrados.length === 0 ? (
 <div className="flex min-h-[320px] items-center justify-center bg-white">
 <span className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-500">
 Nenhum jogo encontrado
 </span>
 </div>
 ) : (
 diasFiltrados.map((dia) => {
 const isDomingo = dia.diaSemana === 'Dom'
 const ocupados = obterSlotsOcupados(dia)

 return (
 <div
 key={dia.id}
 className="grid grid-cols-[58px_42px_repeat(8,minmax(70px,1fr))] border-b border-zinc-200 last:border-b-0"
 >
 <div
 className={`border-r border-zinc-200 px-2 py-3 text-center text-[12px] font-semibold ${
 isDomingo ? 'bg-white text-[#f4d48a]' : 'bg-[#c9c9c9] text-[#142340]'
 }`}
 >
 {dia.diaSemana}
 </div>

 <div className="border-r border-zinc-200 bg-[#d7d7d7] px-2 py-3 text-center text-[12px] font-semibold text-[#142340]">
 {dia.diaNumero}
 </div>

 {HORARIOS.map((horario, indiceHorario) => {
 if (ocupados.has(indiceHorario)) return null

 const evento = dia.eventos?.[horario]

 if (evento) {
 return (
 <button
 key={`${dia.id}-${horario}-evento`}
 onClick={() => setEventoSelecionado(evento)}
 className="border-r border-zinc-200 bg-[#efefef] px-1 py-1 text-[#142340] last:border-r-0"
 style={{ gridColumn: `span ${evento.duracaoSlots}` }}
 title={evento.descricao}
 >
 <div
 className="flex h-full min-h-[36px] flex-col items-center justify-center rounded-[2px] px-2 py-2 text-center leading-none "
 style={{
 backgroundColor: evento.cor,
 color: evento.texto || '#ffffff',
 }}
 >
 <span className="text-[8px] font-semibold uppercase tracking-[0.16em] opacity-90">
 {evento.campeonatoNome}
 </span>
 <span className="mt-1 text-[8px] font-bold uppercase tracking-[0.14em] opacity-90">
 {evento.faseNome}
 </span>
 <span className="mt-1 text-[12px] font-semibold uppercase">
 {evento.titulo}
 </span>
 </div>
 </button>
 )
 }

 return (
 <div
 key={`${dia.id}-${horario}`}
 className="border-r border-zinc-200 bg-[#efefef] px-1 py-1 text-center text-[10px] font-bold text-[#142340] last:border-r-0"
 >
 <span>{horario}</span>
 </div>
 )
 })}
 </div>
 )
 })
 )}
 </div>
 </div>
 </div>
 </div>
 </div>

 <aside className="sticky top-4 h-[calc(100vh-2rem)] overflow-hidden border border-zinc-200 bg-white ">
 <div className="flex h-full flex-col">
 <div className="border-b border-zinc-200 p-4">
 <div className="flex items-center gap-2 text-cyan-400">
 <Trophy size={16} />
 <span className="text-[11px] font-semibold uppercase tracking-[0.18em]">Resumo do mês</span>
 </div>

 <div className="mt-4 grid grid-cols-2 gap-3">
 <MetricCard label="Jogos no mês" value={String(totalEventosDoMes)} />
 <MetricCard label="Ano ativo" value={String(anoAtivo)} />
 </div>
 </div>

 <div className="border-b border-zinc-200 p-4">
 <div className="flex items-center gap-2 text-cyan-400">
 <Layers3 size={16} />
 <span className="text-[11px] font-semibold uppercase tracking-[0.18em]">Jogos do organizador</span>
 </div>
 <p className="mt-2 text-sm font-medium leading-relaxed text-zinc-500">
 Lista compacta por campeonato, fase e jogo.
 </p>
 </div>

 <div className="flex-1 overflow-y-auto p-4 space-y-3">
 {sidebarAgrupada.length === 0 ? (
 <p className="text-sm font-bold text-zinc-500">Nenhum jogo com data e hora encontrado.</p>
 ) : (
 sidebarAgrupada.map((campeonato) => {
 const campeonatoId = campeonato.campeonatoId
 const aberto = campeonatosAbertos[campeonatoId] ?? true
 const cores = campeonatosCores[campeonatoId] || { bg: '#3f7cff', text: '#ffffff' }

 return (
 <div key={campeonatoId} className=" border border-zinc-200 bg-zinc-500 overflow-hidden">
 <button
 onClick={() => toggleCampeonato(campeonatoId)}
 className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left transition-colors hover:bg-white"
 >
 <div className="min-w-0">
 <p className="truncate text-sm font-semibold uppercase text-[#142340]">
 {campeonato.campeonatoNome}
 </p>
 <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500">
 {campeonato.jogos.length} jogos
 </p>
 </div>

 <ChevronDown
 size={16}
 className={`shrink-0 text-zinc-500 transition-transform ${aberto ? 'rotate-180' : ''}`}
 />
 </button>

 {aberto ? (
 <div className="border-t border-zinc-200 p-3 space-y-3">
 <div className=" border border-zinc-200 bg-white p-3">
 <div className="mb-2 flex items-center gap-2 text-cyan-400">
 <Palette size={14} />
 <span className="text-[10px] font-semibold uppercase tracking-[0.14em]">
 Cores do campeonato
 </span>
 </div>

 <div className="grid grid-cols-2 gap-3">
 <ColorField
 label="Fundo"
 value={cores.bg}
 onChange={(valor) => atualizarCorCampeonato(campeonatoId, 'bg', valor)}
 />
 <ColorField
 label="Letra"
 value={cores.text}
 onChange={(valor) => atualizarCorCampeonato(campeonatoId, 'text', valor)}
 />
 </div>
 </div>

 {campeonato.fases.map((fase) => {
 const faseKey = `${campeonatoId}-${fase.faseId}`
 const faseAberta = fasesAbertas[faseKey] ?? true

 return (
 <div key={faseKey} className=" border border-zinc-200 bg-white overflow-hidden">
 <button
 onClick={() => toggleFase(faseKey)}
 className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition-colors hover:bg-white/40"
 >
 <div>
 <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-400">
 {fase.faseNome}
 </p>
 <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-500">
 {fase.jogos.length} jogos
 </p>
 </div>

 <ChevronDown
 size={15}
 className={`shrink-0 text-zinc-500 transition-transform ${faseAberta ? 'rotate-180' : ''}`}
 />
 </button>

 {faseAberta ? (
 <div className="border-t border-zinc-200 p-2 space-y-2">
 {fase.jogos.map((jogo) => (
 <div
 key={jogo.id}
 className=" border border-zinc-200 bg-[#f7f7f7]/40 px-3 py-2"
 >
 <div className="flex items-center justify-between gap-3">
 <div className="min-w-0">
 <p className="truncate text-sm font-semibold uppercase text-[#142340]">
 {jogo.titulo}
 </p>
 </div>

 <div className="shrink-0 rounded-md border border-zinc-200 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-600">
 {jogo.quantidadePartidas}p
 </div>
 </div>
 </div>
 ))}
 </div>
 ) : null}
 </div>
 )
 })}
 </div>
 ) : null}
 </div>
 )
 })
 )}
 </div>
 </div>
 </aside>
 </div>
 </div>

 {eventoSelecionado ? (
 <div className="fixed inset-0 z-[100] bg-white/70 flex items-center justify-center p-4">
 <div className="w-full max-w-lg border border-zinc-200 bg-white overflow-hidden">
 <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
 <div>
 <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-400">
 Detalhes do jogo
 </p>
 <h3 className="mt-1 text-xl font-semibold uppercase text-[#142340]">
 {eventoSelecionado.titulo}
 </h3>
 </div>

 <button
 onClick={() => setEventoSelecionado(null)}
 className=" border border-zinc-200 bg-white/60 p-2 text-zinc-500 transition-colors hover:border-cyan-400 hover:text-[#142340]"
 >
 <X size={18} />
 </button>
 </div>

 <div className="p-4 space-y-4">
 <div
 className=" p-4 text-center"
 style={{
 backgroundColor: eventoSelecionado.cor,
 color: eventoSelecionado.texto || '#ffffff',
 }}
 >
 <p className="text-[11px] font-semibold uppercase tracking-[0.16em]">
 {eventoSelecionado.campeonatoNome}
 </p>
 <p className="mt-1 text-[12px] font-bold uppercase tracking-[0.14em]">
 {eventoSelecionado.faseNome}
 </p>
 <p className="mt-2 text-2xl font-semibold uppercase ">
 {eventoSelecionado.titulo}
 </p>
 </div>

 <div className="grid grid-cols-2 gap-3">
 <MiniInfo icon={<CalendarDays size={13} />} text={eventoSelecionado.dataIso ? formatarDataCurta(eventoSelecionado.dataIso) : '--/--'} />
 <MiniInfo icon={<Clock3 size={13} />} text={eventoSelecionado.horarioInicio} />
 <MiniInfo icon={<Clock3 size={13} />} text={`${eventoSelecionado.duracaoMin || 60} min`} />
 <MiniInfo icon={<Swords size={13} />} text={`${eventoSelecionado.quantidadePartidas || 0} partidas`} />
 </div>

 {eventoSelecionado.quedas && eventoSelecionado.quedas.length > 0 ? (
 <div className=" border border-zinc-200 bg-[#f7f7f7]/40 p-3">
 <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-400">
 Quedas / Mapas
 </p>
 <div className="mt-3 flex flex-wrap gap-2">
 {eventoSelecionado.quedas.map((queda, index) => (
 <span
 key={`${queda}-${index}`}
 className=" border border-zinc-200 bg-white px-3 py-2 text-[11px] font-semibold uppercase text-[#142340]"
 >
 {index + 1}. {queda}
 </span>
 ))}
 </div>
 </div>
 ) : null}

 <div className=" border border-zinc-200 bg-[#f7f7f7]/40 p-3">
 <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-400">
 Resumo
 </p>
 <p className="mt-2 text-sm leading-relaxed text-zinc-600">
 {eventoSelecionado.descricao}
 </p>
 </div>
 </div>
 </div>
 </div>
 ) : null}
 </div>
 )
}

function MetricCard({ label, value }: { label: string; value: string }) {
 return (
 <div className=" border border-zinc-200 bg-[#f7f7f7]/40 p-3">
 <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">{label}</p>
 <p className="mt-2 text-2xl font-semibold uppercase text-[#142340]">{value}</p>
 </div>
 )
}

function MiniInfo({ icon, text }: { icon: React.ReactNode; text: string }) {
 return (
 <div className="flex items-center gap-2 border border-zinc-200 bg-white px-2 py-2 text-[11px] font-bold text-zinc-600">
 <span className="text-cyan-400">{icon}</span>
 <span className="truncate">{text}</span>
 </div>
 )
}

function ColorField({
 label,
 value,
 onChange,
}: {
 label: string
 value: string
 onChange: (valor: string) => void
}) {
 return (
 <div>
 <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">{label}</p>
 <div className="flex items-center gap-2 border border-zinc-200 bg-[#f7f7f7]/50 px-2 py-2">
 <input
 type="color"
 value={value}
 onChange={(e) => onChange(e.target.value)}
 className="h-8 w-10 cursor-pointer border-0 bg-transparent"
 />
 <input
 value={value}
 onChange={(e) => onChange(e.target.value)}
 className="w-full bg-transparent text-[11px] font-bold text-[#142340] outline-none"
 />
 </div>
 </div>
 )
}
