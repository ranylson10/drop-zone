'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import {
 Users,
 Loader2,
 UserCheck,
 X,
 Shield,
 Zap,
 Crosshair,
 Trophy,
 Save,
 RotateCcw,
 GripVertical,
 Lock,
 Flame,
} from 'lucide-react'

const getRoleIcon = (role: string | null) => {
 switch (role?.toLowerCase()) {
 case 'sniper':
 return <Crosshair size={14} className="text-red-500" />
 case 'suporte':
 return <Shield size={14} className="text-blue-500" />
 case 'granadeiro':
 return <Zap size={14} className="text-yellow-500" />
 default:
 return <Users size={14} className="text-zinc-500" />
 }
}

type PerfilJogo = {
 id: string
 nick: string | null
 foto_capa: string | null
 funcao: string | null
}

type JogadorAvulso = {
 id: string
 nick: string
 uid_jogo: string
 funcao: string | null
 foto_url: string | null
}

type Convocavel = {
 kind: 'perfil' | 'avulso' | 'sumula'
 id: string
 nick: string
 foto: string | null
 funcao: string | null
 jogosEquipe: number
 extraLabel?: string | null
 isMvp?: boolean
}

type Inscricao = {
 id: string
 campeonato_id: string
 status: string | null
 equipe_avulsa_id?: string | null
 campeonatos?: {
 id: string
 nome: string
 logo_url: string | null
 } | null
}

type JogadorCampeonatoRow = {
 id: string
 perfil_jogo_id: string | null
 jogador_avulso_id: string | null
 observacoes: string | null
 status: string
 origem: string
}

type ConfrontoQuedaJogadorRow = {
 jogo_id: string
 jogador_campeonato_id: string
}

type ResultadoMvpRow = {
 jogo_id: string
 perfil_jogo_id: string | null
 jogador_avulso_id: string | null
 jogador_campeonato_id: string | null
 nick_snapshot: string | null
 uid_jogo_snapshot: string | null
 abates?: number | null
}

function makeKey(kind: 'perfil' | 'avulso' | 'sumula', id: string) {
 return `${kind}:${id}`
}

function dedupeById<T extends { id: string }>(items: T[]) {
 const map = new Map<string, T>()
 items.forEach((item) => map.set(item.id, item))
 return Array.from(map.values())
}

function dedupeInscricoesPorCampeonato(items: Inscricao[]) {
 const map = new Map<string, Inscricao>()

 items.forEach((item) => {
 const atual = map.get(item.campeonato_id)
 if (!atual) {
 map.set(item.campeonato_id, item)
 return
 }

 const peso = (status: string | null | undefined) => {
 const valor = String(status || '').toLowerCase()
 if (valor === 'confirmado' || valor === 'ativo') return 3
 if (valor === 'pendente') return 2
 return 1
 }

 if (peso(item.status) >= peso(atual.status)) {
 map.set(item.campeonato_id, item)
 }
 })

 return Array.from(map.values())
}

export default function AbaCampeonatos({
 equipeId,
 canManage = true,
 onAtualizado,
}: {
 equipeId: string
 canManage?: boolean
 onAtualizado?: () => void | Promise<void>
}) {
 const [inscricoes, setInscricoes] = useState<Inscricao[]>([])
 const [loading, setLoading] = useState(true)
 const [idCampEditando, setIdCampEditando] = useState<string | null>(null)

 const [membrosEquipe, setMembrosEquipe] = useState<Convocavel[]>([])
 const [avulsosEquipe, setAvulsosEquipe] = useState<Convocavel[]>([]) // avulsos cadastrados + jogadores criados automaticamente pela súmula
 const [titulares, setTitulares] = useState<(Convocavel | null)[]>([null, null, null, null])
 const [reservas, setReservas] = useState<(Convocavel | null)[]>([null, null, null, null])
 const [escalacaoBloqueada, setEscalacaoBloqueada] = useState(false)
 const [salvando, setSalvando] = useState(false)

 const statusConvocacao = useMemo(() => {
 const totalTitulares = titulares.filter((t) => t !== null).length
 if (totalTitulares === 0) {
 return { label: 'Vazio', color: 'text-red-500', border: 'border-red-500/50' }
 }
 if (totalTitulares < 4) {
 return { label: 'Incompleto', color: 'text-yellow-500', border: 'border-yellow-500/50' }
 }
 return { label: 'Pronto', color: 'text-[#2563eb]', border: 'border-[#2563eb]/50' }
 }, [titulares])

 const carregarInscricoes = useCallback(async () => {
 setLoading(true)
 try {
 const { data: participacoes, error: partError } = await supabase
 .from('campeonato_equipes')
 .select('id, campeonato_id, status, equipe_avulsa_id')
 .eq('equipe_id', equipeId)

 if (partError) throw partError

 if (participacoes && participacoes.length > 0) {
 const idsCamp = participacoes.map((p) => p.campeonato_id)

 const { data: dadosCamps, error: campError } = await supabase
 .from('campeonatos')
 .select('id, nome, logo_url')
 .in('id', idsCamp)

 if (campError) throw campError

 const inscricoesNormalizadas = participacoes
 .map((insc) => ({
 ...insc,
 campeonatos: dadosCamps?.find((c) => c.id === insc.campeonato_id) || null,
 }))
 .filter((item) => item.campeonatos) as Inscricao[]

 setInscricoes(dedupeInscricoesPorCampeonato(inscricoesNormalizadas))
 } else {
 setInscricoes([])
 }
 } catch (error) {
 console.error('Erro ao carregar campeonatos da equipe:', error)
 } finally {
 setLoading(false)
 }
 }, [equipeId])

 const carregarDadosEscalacao = async (inscricao: Inscricao) => {
 const campId = inscricao.campeonato_id

 if (idCampEditando === campId) {
 setIdCampEditando(null)
 return
 }

 setTitulares([null, null, null, null])
 setReservas([null, null, null, null])
 setEscalacaoBloqueada(false)
 setMembrosEquipe([])
 setAvulsosEquipe([])
 setIdCampEditando(campId)

 try {
 const { data: membrosAtivos, error: membrosError } = await supabase
 .from('membros_equipe')
 .select('perfil_jogo_id')
 .eq('equipe_id', equipeId)
 .eq('ativo', true)
 .in('tipo', ['membro', 'admin', 'dono'])

 if (membrosError) throw membrosError

 const idsMembros =
 (membrosAtivos || [])
 .map((m: { perfil_jogo_id: string | null }) => m.perfil_jogo_id)
 .filter((id): id is string => !!id)

 const equipeAvulsaId = inscricao.equipe_avulsa_id || null

 let queryJogadores = supabase
 .from('jogadores_campeonato')
 .select('id, perfil_jogo_id, jogador_avulso_id, observacoes, status, origem, equipe_id, equipe_avulsa_id')
 .eq('campeonato_id', campId)

 if (equipeAvulsaId) {
 queryJogadores = queryJogadores.or(`equipe_id.eq.${equipeId},equipe_avulsa_id.eq.${equipeAvulsaId}`)
 } else {
 queryJogadores = queryJogadores.eq('equipe_id', equipeId)
 }

 const { data: jogadoresAtuais, error: jogadoresError } = await queryJogadores

 if (jogadoresError) throw jogadoresError

 let linhasAtuais = (jogadoresAtuais || []) as JogadorCampeonatoRow[]

 const { data: jogoEquipesData, error: jogoEquipesError } = await supabase
 .from('jogo_equipes')
 .select('jogo_id')
 .eq('campeonato_id', campId)
 .eq('campeonato_equipe_id', inscricao.id)

 if (jogoEquipesError) throw jogoEquipesError

 const idsJogosDaEquipe = Array.from(
 new Set((jogoEquipesData || []).map((row: { jogo_id: string | null }) => row.jogo_id).filter(Boolean) as string[])
 )

 const { data: jogosDoElencoData, error: jogosDoElencoError } = idsJogosDaEquipe.length
 ? await supabase
 .from('jogos')
 .select('id, data_hora, data_inicio, data_jogo, hora_jogo')
 .in('id', idsJogosDaEquipe)
 : { data: [], error: null }

 if (jogosDoElencoError) throw jogosDoElencoError

 const agora = new Date()
 const algumJogoIniciado = ((jogosDoElencoData || []) as any[]).some((jogo) => {
 const dataBase =
 jogo.data_hora ||
 jogo.data_inicio ||
 (jogo.data_jogo ? `${jogo.data_jogo}T${jogo.hora_jogo || '00:00:00'}` : null)

 if (!dataBase) return false
 const dataJogo = new Date(dataBase)
 return !Number.isNaN(dataJogo.getTime()) && dataJogo.getTime() <= agora.getTime()
 })

 setEscalacaoBloqueada(algumJogoIniciado)

 const { data: cqjData, error: cqjError } = idsJogosDaEquipe.length
 ? await supabase
 .from('confronto_quedas_jogadores')
 .select('jogo_id, jogador_campeonato_id')
 .in('jogo_id', idsJogosDaEquipe)
 : { data: [], error: null }

 if (cqjError) throw cqjError

 const idsJogadoresDaSumula = Array.from(
 new Set(
 ((cqjData || []) as ConfrontoQuedaJogadorRow[])
 .map((row) => row.jogador_campeonato_id)
 .filter(Boolean)
 )
 )

 const idsJaCarregados = new Set(linhasAtuais.map((row) => row.id))
 const idsFaltandoDaSumula = idsJogadoresDaSumula.filter((id) => !idsJaCarregados.has(id))

 if (idsFaltandoDaSumula.length > 0) {
 const { data: jogadoresSumulaData, error: jogadoresSumulaError } = await supabase
 .from('jogadores_campeonato')
 .select('id, perfil_jogo_id, jogador_avulso_id, observacoes, status, origem, equipe_id, equipe_avulsa_id')
 .in('id', idsFaltandoDaSumula)

 if (jogadoresSumulaError) throw jogadoresSumulaError

 const jogadoresSumulaDaEquipe = ((jogadoresSumulaData || []) as any[]).filter((row) => {
 if (row.equipe_id && row.equipe_id === equipeId) return true
 if (equipeAvulsaId && row.equipe_avulsa_id && row.equipe_avulsa_id === equipeAvulsaId) return true
 return false
 }) as JogadorCampeonatoRow[]

 linhasAtuais = dedupeById([...linhasAtuais, ...jogadoresSumulaDaEquipe])
 }

 const idsPerfisExtras = linhasAtuais
 .map((j) => j.perfil_jogo_id)
 .filter((id): id is string => !!id && !idsMembros.includes(id))

 const idsPerfisTodos = Array.from(new Set([...idsMembros, ...idsPerfisExtras]))

 const { data: perfisData, error: perfisError } = idsPerfisTodos.length
 ? await supabase
 .from('perfis_jogo')
 .select('id, nick, foto_capa, funcao')
 .in('id', idsPerfisTodos)
 : { data: [], error: null }

 if (perfisError) throw perfisError

 const perfisLista = dedupeById((perfisData || []) as PerfilJogo[])

 const idsAvulsosDasLinhas = linhasAtuais
 .map((j) => j.jogador_avulso_id)
 .filter((id): id is string => !!id)

 let queryAvulsos = supabase
 .from('jogadores_avulsos_campeonato')
 .select('id, nick, uid_jogo, funcao, foto_url, equipe_id, equipe_avulsa_id')
 .eq('campeonato_id', campId)

 if (equipeAvulsaId) {
 queryAvulsos = queryAvulsos.or(`equipe_id.eq.${equipeId},equipe_avulsa_id.eq.${equipeAvulsaId}`)
 } else {
 queryAvulsos = queryAvulsos.eq('equipe_id', equipeId)
 }

 const { data: avulsosDiretosData, error: avulsosDiretosError } = await queryAvulsos

 if (avulsosDiretosError) throw avulsosDiretosError

 const idsAvulsosDiretos = (avulsosDiretosData || []).map((a: any) => a.id).filter(Boolean)
 const idsAvulsosTodos = Array.from(new Set([...idsAvulsosDiretos, ...idsAvulsosDasLinhas]))

 const { data: avulsosData, error: avulsosError } = idsAvulsosTodos.length
 ? await supabase
 .from('jogadores_avulsos_campeonato')
 .select('id, nick, uid_jogo, funcao, foto_url')
 .in('id', idsAvulsosTodos)
 : { data: [], error: null }

 if (avulsosError) throw avulsosError

 const avulsosLista = dedupeById((avulsosData || []) as JogadorAvulso[])

 const { data: mvpData, error: mvpError } = await supabase
 .from('resultados_mvp')
 .select('jogo_id, perfil_jogo_id, jogador_avulso_id, jogador_campeonato_id, nick_snapshot, uid_jogo_snapshot, abates')
 .eq('campeonato_id', campId)
 .eq('equipe_id', equipeId)

 if (mvpError) throw mvpError

 const totalAbatesPorJogador = new Map<string, number>()
 ;((mvpData || []) as ResultadoMvpRow[]).forEach((row) => {
 const key = row.perfil_jogo_id
 ? makeKey('perfil', row.perfil_jogo_id)
 : row.jogador_avulso_id
 ? makeKey('avulso', row.jogador_avulso_id)
 : row.jogador_campeonato_id
 ? makeKey('sumula', row.jogador_campeonato_id)
 : row.nick_snapshot
 ? makeKey('sumula', `snapshot:${row.uid_jogo_snapshot || row.nick_snapshot}`)
 : null

 if (!key) return
 totalAbatesPorJogador.set(key, (totalAbatesPorJogador.get(key) || 0) + Number(row.abates || 0))
 })

 const maiorAbate = Math.max(0, ...Array.from(totalAbatesPorJogador.values()))
 const mvpKeys = new Set(
 Array.from(totalAbatesPorJogador.entries())
 .filter(([, total]) => maiorAbate > 0 && total === maiorAbate)
 .map(([key]) => key)
 )

 const jogoSetPorJogador = new Map<string, Set<string>>()

 ;((cqjData || []) as ConfrontoQuedaJogadorRow[]).forEach((row) => {
 const jogador = linhasAtuais.find((j) => j.id === row.jogador_campeonato_id)
 if (!jogador) return

 const key = jogador.perfil_jogo_id
 ? makeKey('perfil', jogador.perfil_jogo_id)
 : jogador.jogador_avulso_id
 ? makeKey('avulso', jogador.jogador_avulso_id)
 : makeKey('sumula', jogador.id)

 if (!jogoSetPorJogador.has(key)) jogoSetPorJogador.set(key, new Set())
 jogoSetPorJogador.get(key)!.add(row.jogo_id)
 })

 ;((mvpData || []) as ResultadoMvpRow[]).forEach((row) => {
 if (row.perfil_jogo_id) {
 const key = makeKey('perfil', row.perfil_jogo_id)
 if (!jogoSetPorJogador.has(key)) jogoSetPorJogador.set(key, new Set())
 jogoSetPorJogador.get(key)!.add(row.jogo_id)
 }
 if (row.jogador_avulso_id) {
 const key = makeKey('avulso', row.jogador_avulso_id)
 if (!jogoSetPorJogador.has(key)) jogoSetPorJogador.set(key, new Set())
 jogoSetPorJogador.get(key)!.add(row.jogo_id)
 }
 if (!row.perfil_jogo_id && !row.jogador_avulso_id && row.nick_snapshot) {
 const idSumula = row.jogador_campeonato_id || `snapshot:${row.uid_jogo_snapshot || row.nick_snapshot}`
 const key = makeKey('sumula', idSumula)
 if (!jogoSetPorJogador.has(key)) jogoSetPorJogador.set(key, new Set())
 jogoSetPorJogador.get(key)!.add(row.jogo_id)
 }
 })

 const perfisConvocaveis: Convocavel[] = perfisLista.map((p) => ({
 kind: 'perfil',
 id: p.id,
 nick: p.nick || 'Sem nick',
 foto: p.foto_capa,
 funcao: p.funcao,
 jogosEquipe: jogoSetPorJogador.get(makeKey('perfil', p.id))?.size || 0,
 isMvp: mvpKeys.has(makeKey('perfil', p.id)),
 }))

 const avulsosConvocaveis: Convocavel[] = avulsosLista.map((a) => ({
 kind: 'avulso',
 id: a.id,
 nick: a.nick || 'Sem nick',
 foto: a.foto_url,
 funcao: a.funcao,
 jogosEquipe: jogoSetPorJogador.get(makeKey('avulso', a.id))?.size || 0,
 extraLabel: a.uid_jogo || null,
 isMvp: mvpKeys.has(makeKey('avulso', a.id)),
 }))

 const chavesJaCadastradas = new Set([
 ...perfisConvocaveis.map((p) => makeKey('perfil', p.id)),
 ...avulsosConvocaveis.map((a) => makeKey('avulso', a.id)),
 ])

 const snapshotPorJogadorCampeonato = new Map<string, ResultadoMvpRow>()
 ;((mvpData || []) as ResultadoMvpRow[]).forEach((row) => {
 if (row.jogador_campeonato_id && row.nick_snapshot) {
 snapshotPorJogadorCampeonato.set(row.jogador_campeonato_id, row)
 }
 })

 const sumulaMap = new Map<string, Convocavel>()

 linhasAtuais.forEach((row) => {
 if (row.perfil_jogo_id || row.jogador_avulso_id) return

 const key = makeKey('sumula', row.id)
 if (chavesJaCadastradas.has(key) || sumulaMap.has(key)) return

 const snapshot = snapshotPorJogadorCampeonato.get(row.id)

 sumulaMap.set(key, {
 kind: 'sumula',
 id: row.id,
 nick: snapshot?.nick_snapshot || 'Jogador da súmula',
 foto: null,
 funcao: null,
 jogosEquipe: jogoSetPorJogador.get(key)?.size || 0,
 extraLabel: snapshot?.uid_jogo_snapshot || null,
 isMvp: mvpKeys.has(key),
 })
 })

 ;((mvpData || []) as ResultadoMvpRow[]).forEach((row) => {
 if (row.perfil_jogo_id || row.jogador_avulso_id || !row.nick_snapshot) return

 const idSumula = row.jogador_campeonato_id || `snapshot:${row.uid_jogo_snapshot || row.nick_snapshot}`
 const key = makeKey('sumula', idSumula)
 if (chavesJaCadastradas.has(key) || sumulaMap.has(key)) return

 sumulaMap.set(key, {
 kind: 'sumula',
 id: idSumula,
 nick: row.nick_snapshot || 'Jogador da súmula',
 foto: null,
 funcao: null,
 jogosEquipe: jogoSetPorJogador.get(key)?.size || 0,
 extraLabel: row.uid_jogo_snapshot || null,
 isMvp: mvpKeys.has(key),
 })
 })

 const sumulaConvocaveis = Array.from(sumulaMap.values())
 const avulsosESumula = [...avulsosConvocaveis, ...sumulaConvocaveis]

 setMembrosEquipe(perfisConvocaveis)
 setAvulsosEquipe(avulsosESumula)

 const mapaConvocaveis = new Map<string, Convocavel>()
 perfisConvocaveis.forEach((p) => mapaConvocaveis.set(makeKey('perfil', p.id), p))
 avulsosConvocaveis.forEach((a) => mapaConvocaveis.set(makeKey('avulso', a.id), a))
 sumulaConvocaveis.forEach((s) => mapaConvocaveis.set(makeKey('sumula', s.id), s))

 const titularesAtivos: Convocavel[] = []
 const reservasAtivos: Convocavel[] = []

 linhasAtuais
 .filter((row) => row.status === 'ativo')
 .forEach((row) => {
 const key = row.perfil_jogo_id
 ? makeKey('perfil', row.perfil_jogo_id)
 : row.jogador_avulso_id
 ? makeKey('avulso', row.jogador_avulso_id)
 : makeKey('sumula', row.id)

 const convocavel = mapaConvocaveis.get(key)
 if (!convocavel) return

 if (row.observacoes === 'reserva') {
 reservasAtivos.push(convocavel)
 } else {
 titularesAtivos.push(convocavel)
 }
 })

 // Jogadores que apareceram pela súmula entram automaticamente nos slots.
 // Se tiver mais jogadores que os 4 slots padrão, cria slots extras.
 const sumulaSemSlot = sumulaConvocaveis.filter((jogador) => {
 const key = makeKey(jogador.kind, jogador.id)
 return !titularesAtivos.some((item) => makeKey(item.kind, item.id) === key)
 && !reservasAtivos.some((item) => makeKey(item.kind, item.id) === key)
 })

 const titularesBase = [...titularesAtivos, ...sumulaSemSlot]
 const quantidadeSlotsTitulares = Math.max(4, titularesBase.length)
 const quantidadeSlotsReservas = Math.max(4, reservasAtivos.length)

 const tits: (Convocavel | null)[] = Array.from({ length: quantidadeSlotsTitulares }, (_, index) => titularesBase[index] || null)
 const ress: (Convocavel | null)[] = Array.from({ length: quantidadeSlotsReservas }, (_, index) => reservasAtivos[index] || null)

 setTitulares(tits)
 setReservas(ress)
 } catch (error) {
 console.error('Erro ao carregar elenco:', error)
 }
 }

 const selecionarJogador = (
 valor: string,
 index: number,
 tipo: 'titular' | 'reserva'
 ) => {
 if (escalacaoBloqueada) return

 if (!valor) {
 removerJogador(index, tipo)
 return
 }

 const [kind, id] = valor.split(':') as ['perfil' | 'avulso' | 'sumula', string]

 const todos = [...membrosEquipe, ...avulsosEquipe]
 const jaEscalado = [...titulares, ...reservas].some((p) => p?.kind === kind && p?.id === id)

 if (jaEscalado) {
 alert('Este jogador já está na convocação!')
 return
 }

 const jogador = todos.find((m) => m.kind === kind && m.id === id) || null

 if (tipo === 'titular') {
 const novos = [...titulares]
 novos[index] = jogador
 setTitulares(novos)
 } else {
 const novos = [...reservas]
 novos[index] = jogador
 setReservas(novos)
 }
 }

 const removerJogador = (index: number, tipo: 'titular' | 'reserva') => {
 if (escalacaoBloqueada) return

 if (tipo === 'titular') {
 const novos = [...titulares]
 novos[index] = null
 setTitulares(novos)
 } else {
 const novos = [...reservas]
 novos[index] = null
 setReservas(novos)
 }
 }

 const moverSlot = (
 origemIndex: number,
 destinoIndex: number,
 origemTipo: 'titular' | 'reserva',
 destinoTipo: 'titular' | 'reserva'
 ) => {
 if (escalacaoBloqueada) return

 const listaOrigem = origemTipo === 'titular' ? [...titulares] : [...reservas]
 const listaDestino = destinoTipo === 'titular' ? [...titulares] : [...reservas]

 const jogadorOrigem = listaOrigem[origemIndex] || null
 const jogadorDestino = listaDestino[destinoIndex] || null

 if (origemTipo === destinoTipo) {
 listaOrigem[origemIndex] = jogadorDestino
 listaOrigem[destinoIndex] = jogadorOrigem
 origemTipo === 'titular' ? setTitulares(listaOrigem) : setReservas(listaOrigem)
 return
 }

 listaOrigem[origemIndex] = jogadorDestino
 listaDestino[destinoIndex] = jogadorOrigem

 origemTipo === 'titular' ? setTitulares(listaOrigem) : setReservas(listaOrigem)
 destinoTipo === 'titular' ? setTitulares(listaDestino) : setReservas(listaDestino)
 }

 const aplicarUltimaLineup = () => {
 if (escalacaoBloqueada) return

 const disponiveis = [...membrosEquipe, ...avulsosEquipe]
 .filter((item) => item.jogosEquipe > 0)
 .sort((a, b) => {
 if (Number(b.isMvp) !== Number(a.isMvp)) return Number(b.isMvp) - Number(a.isMvp)
 return b.jogosEquipe - a.jogosEquipe
 })

 const jaUsados = new Set<string>()
 const titularesAuto = disponiveis
 .filter((item) => {
 const key = makeKey(item.kind, item.id)
 if (jaUsados.has(key)) return false
 jaUsados.add(key)
 return true
 })

 const quantidadeSlots = Math.max(4, titularesAuto.length, titulares.length)
 setTitulares(Array.from({ length: quantidadeSlots }, (_, index) => titularesAuto[index] || null))
 }

 const salvarLineupPadrao = () => {
 if (!idCampEditando) return

 const payload = {
 titulares: titulares.filter(Boolean).map((item) => makeKey(item!.kind, item!.id)),
 reservas: reservas.filter(Boolean).map((item) => makeKey(item!.kind, item!.id)),
 }

 localStorage.setItem(`lineup_padrao_equipe_${equipeId}`, JSON.stringify(payload))
 alert('Lineup padrão salva neste navegador.')
 }

 const aplicarLineupPadrao = () => {
 if (escalacaoBloqueada) return

 const raw = localStorage.getItem(`lineup_padrao_equipe_${equipeId}`)
 if (!raw) {
 alert('Nenhuma lineup padrão salva para esta equipe neste navegador.')
 return
 }

 const payload = JSON.parse(raw) as { titulares?: string[]; reservas?: string[] }
 const mapa = new Map<string, Convocavel>()
 ;[...membrosEquipe, ...avulsosEquipe].forEach((item) => mapa.set(makeKey(item.kind, item.id), item))

 const titularesPadrao = (payload.titulares || []).map((key) => mapa.get(key) || null).filter(Boolean) as Convocavel[]
 const reservasPadrao = (payload.reservas || []).map((key) => mapa.get(key) || null).filter(Boolean) as Convocavel[]

 setTitulares(Array.from({ length: Math.max(4, titularesPadrao.length) }, (_, index) => titularesPadrao[index] || null))
 setReservas(Array.from({ length: Math.max(4, reservasPadrao.length) }, (_, index) => reservasPadrao[index] || null))
 }

 const salvarEscalacao = async () => {
 if (!idCampEditando || escalacaoBloqueada) return
 setSalvando(true)

 try {
 const { data: existentes, error: existentesError } = await supabase
 .from('jogadores_campeonato')
 .select('id, perfil_jogo_id, jogador_avulso_id, observacoes, status, origem')
 .eq('campeonato_id', idCampEditando)
 .eq('equipe_id', equipeId)

 if (existentesError) throw existentesError

 const linhasExistentes = (existentes || []) as JogadorCampeonatoRow[]
 const mapaExistentes = new Map<string, JogadorCampeonatoRow>()

 linhasExistentes.forEach((row) => {
 if (row.perfil_jogo_id) {
 mapaExistentes.set(makeKey('perfil', row.perfil_jogo_id), row)
 } else if (row.jogador_avulso_id) {
 mapaExistentes.set(makeKey('avulso', row.jogador_avulso_id), row)
 } else {
 mapaExistentes.set(makeKey('sumula', row.id), row)
 }
 })

 const desejados = [...titulares, ...reservas].filter(
 (item): item is Convocavel => item !== null
 )

 const desejadosMap = new Map<string, { jogador: Convocavel; observacoes: string }>()
 titulares.forEach((item) => {
 if (item) desejadosMap.set(makeKey(item.kind, item.id), { jogador: item, observacoes: 'titular' })
 })
 reservas.forEach((item) => {
 if (item) desejadosMap.set(makeKey(item.kind, item.id), { jogador: item, observacoes: 'reserva' })
 })

 const updates: any[] = []
 const inserts: any[] = []
 const sumulaParaCriar: { jogador: Convocavel; observacoes: string }[] = []

 desejadosMap.forEach(({ jogador, observacoes }, key) => {
 const existente = mapaExistentes.get(key)

 if (existente) {
 if (
 existente.status !== 'ativo' ||
 (existente.observacoes || 'titular') !== observacoes ||
 existente.origem !== 'app'
 ) {
 updates.push(
 supabase
 .from('jogadores_campeonato')
 .update({
 status: 'ativo',
 observacoes,
 origem: 'app',
 criado_automaticamente: false,
 updated_at: new Date().toISOString(),
 })
 .eq('id', existente.id)
 )
 }
 } else if (jogador.kind !== 'sumula') {
 inserts.push({
 campeonato_id: idCampEditando,
 equipe_id: equipeId,
 perfil_jogo_id: jogador.kind === 'perfil' ? jogador.id : null,
 jogador_avulso_id: jogador.kind === 'avulso' ? jogador.id : null,
 origem: 'app',
 status: 'ativo',
 criado_automaticamente: false,
 observacoes,
 })
 } else {
 // Jogador que apareceu apenas pela súmula/resultados_mvp.
 // Primeiro vamos transformar em avulso do campeonato para manter vínculo real.
 sumulaParaCriar.push({ jogador, observacoes })
 }
 })

 for (const item of sumulaParaCriar) {
 const { data: avulsoCriado, error: avulsoCriadoError } = await supabase
 .from('jogadores_avulsos_campeonato')
 .insert({
 campeonato_id: idCampEditando,
 equipe_id: equipeId,
 nick: item.jogador.nick,
 uid_jogo: item.jogador.extraLabel || '',
 funcao: item.jogador.funcao || null,
 foto_url: item.jogador.foto || null,
 criado_automaticamente: true,
 origem: 'sumula',
 })
 .select('id')
 .single()

 if (avulsoCriadoError) throw avulsoCriadoError

 inserts.push({
 campeonato_id: idCampEditando,
 equipe_id: equipeId,
 perfil_jogo_id: null,
 jogador_avulso_id: avulsoCriado?.id || null,
 origem: 'sumula',
 status: 'ativo',
 criado_automaticamente: true,
 observacoes: item.observacoes,
 })
 }

 linhasExistentes.forEach((existente) => {
 const key = existente.perfil_jogo_id
 ? makeKey('perfil', existente.perfil_jogo_id)
 : existente.jogador_avulso_id
 ? makeKey('avulso', existente.jogador_avulso_id)
 : makeKey('sumula', existente.id)

 if (!key) return
 if (!desejadosMap.has(key) && existente.status !== 'inativo') {
 updates.push(
 supabase
 .from('jogadores_campeonato')
 .update({
 status: 'inativo',
 observacoes: 'fora_convocacao',
 updated_at: new Date().toISOString(),
 })
 .eq('id', existente.id)
 )
 }
 })

 if (inserts.length > 0) {
 const { error: insertError } = await supabase
 .from('jogadores_campeonato')
 .insert(inserts)

 if (insertError) throw insertError
 }

 if (updates.length > 0) {
 const resultados = await Promise.all(updates)
 const erroUpdate = resultados.find((r) => r.error)
 if (erroUpdate?.error) throw erroUpdate.error
 }

 alert('Convocação salva com sucesso!')
 setIdCampEditando(null)
 await onAtualizado?.()
 } catch (error: any) {
 console.error(error)
 alert('Erro ao salvar: ' + (error?.message || 'erro desconhecido'))
 } finally {
 setSalvando(false)
 }
 }

 useEffect(() => {
 carregarInscricoes()
 }, [carregarInscricoes])

 if (loading) {
 return (
 <div className="flex justify-center py-20">
 <Loader2 className="animate-spin text-[#2563eb]" />
 </div>
 )
 }

 if (inscricoes.length === 0) {
 return (
 <div className="border border-zinc-200 bg-zinc-50 p-6 text-zinc-500 font-bold uppercase tracking-wider">
 A equipe ainda não está vinculada a campeonatos.
 </div>
 )
 }

 return (
 <div className="flex flex-col gap-4">
 {inscricoes.map((item) => (
 <div key={item.id} className="flex flex-col">
 <div
 className={`bg-zinc-50 border border-zinc-200 p-4 flex items-center justify-between transition-all ${
 idCampEditando === item.campeonato_id ? 'border-[#2563eb]/40 bg-white' : ''
 }`}
 >
 <div className="flex items-center gap-4">
 <div className="w-14 h-14 bg-white border border-zinc-200 overflow-hidden relative">
 {item.campeonatos?.logo_url ? (
 <img
 src={item.campeonatos.logo_url}
 className="w-full h-full object-cover"
 alt="Logo"
 />
 ) : null}
 </div>

 <div>
 <h3 className="text-[#142340] text-base font-semibold uppercase tracking-tighter">
 {item.campeonatos?.nome}
 </h3>
 <span className="text-[#2563eb] text-[9px] font-bold uppercase tracking-widest bg-[#2563eb]/10 px-2 py-0.5 border border-[#2563eb]/20 inline-block mt-1">
 {item.status || 'ativo'}
 </span>
 </div>
 </div>

 <button
 onClick={() => carregarDadosEscalacao(item)}
 disabled={!canManage}
 className={`h-12 px-6 text-[10px] font-semibold uppercase flex items-center gap-2 border transition-all ${
 idCampEditando === item.campeonato_id
 ? 'bg-[#2563eb] text-[#142340] border-[#2563eb]'
 : 'bg-white text-[#142340] border-zinc-200 hover:bg-zinc-50'
 } disabled:opacity-50 disabled:cursor-not-allowed`}
 >
 {idCampEditando === item.campeonato_id ? (
 <>
 <X size={14} /> Fechar
 </>
 ) : (
 <>
 <Users size={14} /> Convocar
 </>
 )}
 </button>
 </div>

 {idCampEditando === item.campeonato_id && (
 <div className="bg-white border-x border-b border-zinc-200 p-6 animate-in fade-in slide-in-from-top-2 duration-500">
 <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
 <div className="border border-zinc-200 bg-zinc-50 p-4">
 <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#142340]">
 Perfis da equipe
 </p>
 <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-500">
 {membrosEquipe.length} disponíveis para convocação
 </p>
 </div>

 <div className="border border-zinc-200 bg-zinc-50 p-4">
 <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#142340]">
 Avulsos / súmula
 </p>
 <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-500">
 {avulsosEquipe.length} disponíveis para convocação
 </p>
 </div>
 </div>

 {escalacaoBloqueada ? (
 <div className="mb-6 border border-red-200 bg-red-50 p-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-red-600 flex items-center gap-2">
 <Lock size={14} />
 Escalação travada: o jogo já começou.
 </div>
 ) : null}

 <div className="mb-6 flex flex-wrap gap-2">
 <button
 onClick={aplicarUltimaLineup}
 disabled={escalacaoBloqueada}
 className="h-10 px-4 border border-zinc-200 bg-white text-[#142340] text-[10px] font-semibold uppercase flex items-center gap-2 hover:border-[#2563eb] disabled:opacity-50"
 >
 <RotateCcw size={14} /> Auto preencher última partida
 </button>

 <button
 onClick={salvarLineupPadrao}
 disabled={escalacaoBloqueada}
 className="h-10 px-4 border border-zinc-200 bg-white text-[#142340] text-[10px] font-semibold uppercase flex items-center gap-2 hover:border-[#2563eb] disabled:opacity-50"
 >
 <Save size={14} /> Salvar lineup padrão
 </button>

 <button
 onClick={aplicarLineupPadrao}
 disabled={escalacaoBloqueada}
 className="h-10 px-4 border border-zinc-200 bg-white text-[#142340] text-[10px] font-semibold uppercase flex items-center gap-2 hover:border-[#2563eb] disabled:opacity-50"
 >
 <UserCheck size={14} /> Usar lineup padrão
 </button>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 <div className="space-y-4">
 <div className="flex items-center gap-2 border-l-2 border-[#2563eb] pl-3 mb-2">
 <span className="text-[11px] font-semibold uppercase text-[#142340] tracking-widest">
 Titulares
 </span>
 <span className="text-[9px] text-zinc-500 font-bold">4 SLOTS</span>
 </div>

 <div className="flex flex-col gap-2">
 {titulares.map((slot, i) => (
 <SlotJogador
 key={`tit-${i}`}
 slot={slot}
 index={i}
 tipo="titular"
 perfis={membrosEquipe}
 avulsos={avulsosEquipe}
 onSelect={selecionarJogador}
 onRemove={removerJogador}
 onMove={moverSlot}
 locked={escalacaoBloqueada}
 />
 ))}
 </div>
 </div>

 <div className="space-y-4">
 <div className="flex items-center gap-2 border-l-2 border-zinc-400 pl-3 mb-2">
 <span className="text-[11px] font-semibold uppercase text-zinc-500 tracking-widest">
 Reservas
 </span>
 <span className="text-[9px] text-zinc-500 font-bold">OPCIONAL</span>
 </div>

 <div className="flex flex-col gap-2">
 {reservas.map((slot, i) => (
 <SlotJogador
 key={`res-${i}`}
 slot={slot}
 index={i}
 tipo="reserva"
 perfis={membrosEquipe}
 avulsos={avulsosEquipe}
 onSelect={selecionarJogador}
 onRemove={removerJogador}
 onMove={moverSlot}
 locked={escalacaoBloqueada}
 />
 ))}
 </div>
 </div>
 </div>

 <div className="mt-8 pt-6 border-t border-zinc-100 flex flex-col md:flex-row items-center justify-between gap-6">
 <div className="flex items-center gap-4">
 <div className={`w-12 h-12 flex items-center justify-center border-2 rotate-45 ${statusConvocacao.border}`}>
 <Trophy size={20} className={`-rotate-45 ${statusConvocacao.color}`} />
 </div>
 <div>
 <p className={`text-[12px] font-semibold uppercase ${statusConvocacao.color}`}>
 Status: {statusConvocacao.label}
 </p>
 <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-tight ">
 Jogadores mostram quantos jogos já atuaram pela equipe neste campeonato
 </p>
 </div>
 </div>

 <button
 disabled={salvando || !canManage || escalacaoBloqueada}
 onClick={salvarEscalacao}
 className="w-full md:w-auto bg-[#2563eb] text-[#142340] h-14 px-10 text-[11px] font-semibold uppercase flex items-center justify-center gap-3 hover:brightness-110 transition-all disabled:opacity-50"
 >
 {salvando ? (
 <Loader2 className="animate-spin" />
 ) : (
 <>
 <UserCheck size={20} /> Confirmar elenco
 </>
 )}
 </button>
 </div>
 </div>
 )}
 </div>
 ))}
 </div>
 )
}

function SlotJogador({
 slot,
 index,
 tipo,
 perfis,
 avulsos,
 onSelect,
 onRemove,
 onMove,
 locked,
}: {
 slot: Convocavel | null
 index: number
 tipo: 'titular' | 'reserva'
 perfis: Convocavel[]
 avulsos: Convocavel[]
 onSelect: (valor: string, index: number, tipo: 'titular' | 'reserva') => void
 onRemove: (index: number, tipo: 'titular' | 'reserva') => void
 onMove: (
 origemIndex: number,
 destinoIndex: number,
 origemTipo: 'titular' | 'reserva',
 destinoTipo: 'titular' | 'reserva'
 ) => void
 locked: boolean
}) {
 return (
 <div
 draggable={!!slot && !locked}
 onDragStart={(event) => {
 event.dataTransfer.setData('text/plain', JSON.stringify({ index, tipo }))
 }}
 onDragOver={(event) => event.preventDefault()}
 onDrop={(event) => {
 event.preventDefault()
 try {
 const data = JSON.parse(event.dataTransfer.getData('text/plain')) as {
 index: number
 tipo: 'titular' | 'reserva'
 }
 onMove(data.index, index, data.tipo, tipo)
 } catch {
 // ignora drag inválido
 }
 }}
 className={`relative group flex items-center justify-between p-3 bg-zinc-50 border border-zinc-200 transition-all hover:border-zinc-300 ${
 slot ? 'border-l-2 border-l-[#18b54a]' : ''
 }`}
 >
 <div className="flex items-center gap-3">
 <GripVertical size={14} className={locked || !slot ? 'text-[#142340]' : 'text-zinc-500 cursor-grab'} />
 <div className="w-10 h-10 bg-white flex items-center justify-center border border-zinc-200 relative overflow-hidden">
 {slot ? (
 slot.foto ? (
 <img src={slot.foto} className="w-full h-full object-cover" alt="Avatar" />
 ) : (
 <span className="text-[10px] font-semibold text-zinc-500 ">#{index + 1}</span>
 )
 ) : (
 <span className="text-[10px] font-semibold text-zinc-500 ">#{index + 1}</span>
 )}
 </div>

 <div className="flex flex-col">
 <div className="flex items-center gap-2">
 <span className={`text-[10px] font-semibold uppercase ${slot ? 'text-[#142340]' : 'text-zinc-500'}`}>
 {slot ? slot.nick : 'Vazio'}
 </span>
 {slot ? getRoleIcon(slot.funcao) : null}
 {slot ? (
 <span className={`text-[8px] font-semibold uppercase px-1.5 py-0.5 border ${
 slot.kind === 'perfil'
 ? 'text-[#2563eb] border-[#2563eb]/30 bg-[#2563eb]/10'
 : slot.kind === 'sumula'
 ? 'text-orange-600 border-orange-600/30 bg-orange-600/10'
 : 'text-sky-600 border-sky-600/30 bg-sky-600/10'
 }`}>
 {slot.kind === 'perfil' ? 'equipe' : slot.kind === 'sumula' ? '🔥 súmula' : 'avulso'}
 </span>
 ) : null}
 {slot?.isMvp ? (
 <span className="text-[8px] font-semibold uppercase px-1.5 py-0.5 border text-amber-600 border-amber-500/30 bg-amber-500/10 flex items-center gap-1">
 <Trophy size={9} /> MVP
 </span>
 ) : null}
 </div>
 <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-[1px]">
 {slot ? `${slot.funcao || 'Membro'} • ${slot.jogosEquipe} jogo(s)` : `${tipo} slot`}
 </span>
 </div>
 </div>

 <div className="flex items-center gap-2">
 <select
 disabled={locked}
 className="bg-white text-[9px] font-bold uppercase border border-zinc-200 text-zinc-500 px-2 py-1.5 outline-none focus:border-[#2563eb] transition-all w-44 appearance-none cursor-pointer disabled:bg-zinc-100 disabled:cursor-not-allowed"
 onChange={(e) => onSelect(e.target.value, index, tipo)}
 value={slot ? makeKey(slot.kind, slot.id) : ''}
 >
 <option value="">Escolher...</option>

 {perfis.length > 0 ? <optgroup label="Perfis da equipe">
 {perfis.map((m) => (
 <option key={makeKey(m.kind, m.id)} value={makeKey(m.kind, m.id)}>
 {m.nick} - {m.jogosEquipe} jogo(s)
 </option>
 ))}
 </optgroup> : null}

 {avulsos.length > 0 ? <optgroup label="Avulsos e súmula">
 {avulsos.map((m) => (
 <option key={makeKey(m.kind, m.id)} value={makeKey(m.kind, m.id)}>
 {m.nick} - {m.jogosEquipe} jogo(s)
 </option>
 ))}
 </optgroup> : null}
 </select>

 {slot ? (
 <button
 disabled={locked}
 onClick={() => onRemove(index, tipo)}
 className="p-1.5 bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-[#142340] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
 >
 <X size={12} />
 </button>
 ) : null}
 </div>
 </div>
 )
}
