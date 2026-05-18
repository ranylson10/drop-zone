'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Save, Table2, Target } from 'lucide-react'
import { toast } from 'react-hot-toast'

type EquipeItem = {
 id: string
 equipe_id?: string | null
 equipe_avulsa_id?: string | null
 equipes?: { nome?: string | null; tag?: string | null; logo_url?: string | null } | null
 equipe_avulsa?: { nome?: string | null; tag?: string | null; logo_url?: string | null } | null
}

type JogoItem = {
 id: string
 nome?: string | null
 nome_bloco?: string | null
 fase_id?: string | null
 observacoes?: string | null
 created_at?: string | null
 quantidade_partidas?: number | null
 quedas?: any
}

type JogoEquipeItem = {
 jogo_id: string
 campeonato_equipe_id: string
}

type JogadorCampeonatoItem = {
 id: string
 campeonato_equipe_id?: string | null
 equipe_id?: string | null
 equipe_avulsa_id?: string | null
 perfil_jogo_id?: string | null
 perfis_jogo?: { id?: string | null; nick?: string | null } | null
}

type PartidaResultado = {
 partida: number
 roundsA: number
 roundsB: number
 abatesA: number
 abatesB: number
}

type ResultadoSalvo = {
 melhorDe: number
 partidas: PartidaResultado[]
 vencedorId: string | null
 resumoA: { vitorias: number; rounds: number; abates: number }
 resumoB: { vitorias: number; rounds: number; abates: number }
 atualizadoEm: string
}

type AbatesJogadorPorQueda = Record<string, Record<number, number>>

type ConfrontoQuedaRow = {
 jogo_id?: string
 numero_queda: number
 rounds_a: number | null
 rounds_b: number | null
 abates_a: number | null
 abates_b: number | null
 vencedor_equipe_id?: string | null
}

type ConfrontoQuedaJogadorRow = {
 numero_queda: number
 jogador_campeonato_id: string
 abates: number | null
}

type LinhaTabelaCampeonato = {
 equipe: EquipeItem
 pontos: number
 jogos: number
 vitorias: number
 empates: number
 derrotas: number
 roundsPro: number
 roundsContra: number
 saldoRounds: number
 abates: number
 status: string
}

const PREFIXO = '__confronto_resultado__:'

function getErrorMessage(error: any, fallback = 'Erro inesperado') {
 if (!error) return fallback
 if (typeof error === 'string') return error
 if (error.message) return error.message
 if (error.details) return error.details
 try {
 const texto = JSON.stringify(error)
 if (texto && texto !== '{}') return texto
 } catch {}
 return fallback
}

function getEquipeNome(item?: EquipeItem | null) {
 if (!item) return 'Equipe'
 return item.equipes?.nome || item.equipe_avulsa?.nome || 'Equipe'
}

function getEquipeTag(item?: EquipeItem | null) {
 if (!item) return null
 return item.equipes?.tag || item.equipe_avulsa?.tag || null
}

function getJogadorNome(item?: JogadorCampeonatoItem | null) {
 if (!item) return 'Jogador'
 return item.perfis_jogo?.nick || item.perfil_jogo_id || 'Jogador'
}

function extrairResultado(observacoes?: string | null): ResultadoSalvo | null {
 if (!observacoes) return null
 const texto = String(observacoes)
 const idx = texto.indexOf(PREFIXO)
 if (idx === -1) return null
 const json = texto.slice(idx + PREFIXO.length).trim()
 try {
 return JSON.parse(json) as ResultadoSalvo
 } catch {
 return null
 }
}

function serializarResultado(resultado: ResultadoSalvo) {
 return `${PREFIXO}${JSON.stringify(resultado)}`
}

function gerarPartidas(quantidade: number): PartidaResultado[] {
 return Array.from({ length: Math.max(1, quantidade) }, (_, idx) => ({
 partida: idx + 1,
 roundsA: 0,
 roundsB: 0,
 abatesA: 0,
 abatesB: 0,
 }))
}

function normalizarNumero(valor: any) {
 return Math.max(0, Number(valor || 0))
}

function getQuantidadeQuedasDoJogo(jogo?: JogoItem | null) {
 if (!jogo) return 1

 const quedas = jogo.quedas
 if (Array.isArray(quedas) && quedas.length > 0) return quedas.length

 if (typeof quedas === 'number' && Number.isFinite(quedas)) return Math.max(1, Number(quedas))

 if (quedas && typeof quedas === 'object') {
 const possiveis = [(quedas as any).quantidade, (quedas as any).total, (quedas as any).qtd, (quedas as any).numero]
 for (const item of possiveis) {
 if (typeof item === 'number' && Number.isFinite(item)) return Math.max(1, Number(item))
 }
 }

 if (jogo.quantidade_partidas && jogo.quantidade_partidas > 0) return jogo.quantidade_partidas

 const legado = extrairResultado(jogo.observacoes)
 if (legado?.partidas?.length) return legado.partidas.length

 return 1
}

export default function GerenciarResultadosConfronto({ campeonatoId }: { campeonatoId: string }) {
 const [loading, setLoading] = useState(true)
 const [salvando, setSalvando] = useState(false)
 const [subAba, setSubAba] = useState<'pontuacao' | 'tabela'>('pontuacao')

 const [jogos, setJogos] = useState<JogoItem[]>([])
 const [jogoEquipes, setJogoEquipes] = useState<JogoEquipeItem[]>([])
 const [equipes, setEquipes] = useState<EquipeItem[]>([])
 const [jogadores, setJogadores] = useState<JogadorCampeonatoItem[]>([])
 const [quedasCampeonato, setQuedasCampeonato] = useState<ConfrontoQuedaRow[]>([])

 const [jogoSelecionadoId, setJogoSelecionadoId] = useState('')
 const [partidas, setPartidas] = useState<PartidaResultado[]>([])
 const [abatesJogadores, setAbatesJogadores] = useState<AbatesJogadorPorQueda>({})
 const [quedaSelecionada, setQuedaSelecionada] = useState(1)

 const carregar = useCallback(async () => {
 if (!campeonatoId) return
 setLoading(true)
 try {
 const [jogosRes, jogoEquipesRes, equipesRes, jogadoresRes, quedasRes] = await Promise.all([
 supabase
 .from('jogos')
 .select('id, nome, nome_bloco, fase_id, observacoes, created_at, quantidade_partidas, quedas')
 .eq('campeonato_id', campeonatoId)
 .order('created_at', { ascending: true }),
 supabase
 .from('jogo_equipes')
 .select('jogo_id, campeonato_equipe_id')
 .eq('campeonato_id', campeonatoId),
 supabase
 .from('campeonato_equipes')
 .select(`
 id,
 equipe_id,
 equipe_avulsa_id,
 equipes ( nome, tag, logo_url ),
 equipe_avulsa:equipes_avulsas_campeonato ( nome, tag, logo_url )
 `)
 .eq('campeonato_id', campeonatoId),
 supabase
 .from('jogadores_campeonato')
 .select(`
 id,
 campeonato_equipe_id,
 equipe_id,
 equipe_avulsa_id,
 perfil_jogo_id,
 perfis_jogo:perfil_jogo_id ( id, nick )
 `)
 .eq('campeonato_id', campeonatoId),
 supabase
 .from('confronto_quedas')
 .select('jogo_id, numero_queda, rounds_a, rounds_b, abates_a, abates_b, vencedor_equipe_id'),
 ])

 if (jogosRes.error) throw jogosRes.error
 if (jogoEquipesRes.error) throw jogoEquipesRes.error
 if (equipesRes.error) throw equipesRes.error
 if (jogadoresRes.error) throw jogadoresRes.error
 if (quedasRes.error) throw quedasRes.error

 const jogosData = (jogosRes.data || []) as JogoItem[]
 const jogoIds = new Set(jogosData.map((jogo) => jogo.id))

 setJogos(jogosData)
 setJogoEquipes((jogoEquipesRes.data || []) as JogoEquipeItem[])
 setEquipes((equipesRes.data || []) as unknown as EquipeItem[])
 setJogadores((jogadoresRes.data || []) as unknown as JogadorCampeonatoItem[])
 setQuedasCampeonato(((quedasRes.data || []) as ConfrontoQuedaRow[]).filter((queda) => queda.jogo_id && jogoIds.has(queda.jogo_id)))

 if (!jogoSelecionadoId && jogosData[0]?.id) setJogoSelecionadoId(jogosData[0].id)
 } catch (error: any) {
 console.error(error)
 toast.error(getErrorMessage(error, 'Erro ao carregar resultados'))
 } finally {
 setLoading(false)
 }
 }, [campeonatoId, jogoSelecionadoId])

 useEffect(() => {
 carregar()
 }, [carregar])

 const mapaEquipes = useMemo(() => {
 const map = new Map<string, EquipeItem>()
 for (const equipe of equipes) map.set(equipe.id, equipe)
 return map
 }, [equipes])

 const jogoSelecionado = useMemo(() => jogos.find((jogo) => jogo.id === jogoSelecionadoId) || null, [jogos, jogoSelecionadoId])

 const equipesDoJogo = useMemo(() => {
 if (!jogoSelecionadoId) return [] as EquipeItem[]
 return jogoEquipes
 .filter((item) => item.jogo_id === jogoSelecionadoId)
 .map((item) => mapaEquipes.get(item.campeonato_equipe_id))
 .filter(Boolean) as EquipeItem[]
 }, [jogoEquipes, jogoSelecionadoId, mapaEquipes])

 const equipeA = equipesDoJogo[0] || null
 const equipeB = equipesDoJogo[1] || null

 const jogadoresEquipeA = useMemo(() => {
 if (!equipeA) return [] as JogadorCampeonatoItem[]
 return jogadores.filter((item) =>
 item.campeonato_equipe_id === equipeA.id ||
 Boolean(equipeA.equipe_id && item.equipe_id === equipeA.equipe_id) ||
 Boolean(equipeA.equipe_avulsa_id && item.equipe_avulsa_id === equipeA.equipe_avulsa_id),
 )
 }, [jogadores, equipeA])

 const jogadoresEquipeB = useMemo(() => {
 if (!equipeB) return [] as JogadorCampeonatoItem[]
 return jogadores.filter((item) =>
 item.campeonato_equipe_id === equipeB.id ||
 Boolean(equipeB.equipe_id && item.equipe_id === equipeB.equipe_id) ||
 Boolean(equipeB.equipe_avulsa_id && item.equipe_avulsa_id === equipeB.equipe_avulsa_id),
 )
 }, [jogadores, equipeB])

 const carregarResultadoDetalhado = useCallback(async (jogoId: string, jogo?: JogoItem | null) => {
 const quantidade = getQuantidadeQuedasDoJogo(jogo)
 const partidasBase = gerarPartidas(quantidade)

 try {
 const [quedasRes, jogadoresRes] = await Promise.all([
 supabase
 .from('confronto_quedas')
 .select('numero_queda, rounds_a, rounds_b, abates_a, abates_b')
 .eq('jogo_id', jogoId)
 .order('numero_queda', { ascending: true }),
 supabase
 .from('confronto_quedas_jogadores')
 .select('numero_queda, jogador_campeonato_id, abates')
 .eq('jogo_id', jogoId)
 .order('numero_queda', { ascending: true }),
 ])

 if (quedasRes.error) throw quedasRes.error
 if (jogadoresRes.error) throw jogadoresRes.error

 const quedasSalvas = (quedasRes.data || []) as ConfrontoQuedaRow[]
 const jogadoresSalvos = (jogadoresRes.data || []) as ConfrontoQuedaJogadorRow[]

 if (quedasSalvas.length > 0) {
 const byNumero = new Map<number, ConfrontoQuedaRow>()
 for (const item of quedasSalvas) byNumero.set(item.numero_queda, item)
 setPartidas(partidasBase.map((partida) => {
 const salvo = byNumero.get(partida.partida)
 if (!salvo) return partida
 return {
 partida: partida.partida,
 roundsA: normalizarNumero(salvo.rounds_a),
 roundsB: normalizarNumero(salvo.rounds_b),
 abatesA: normalizarNumero(salvo.abates_a),
 abatesB: normalizarNumero(salvo.abates_b),
 }
 }))
 } else {
 const legado = extrairResultado(jogo?.observacoes)
 setPartidas(legado?.partidas?.length ? partidasBase.map((partida, idx) => legado.partidas[idx] || partida) : partidasBase)
 }

 const mapa: AbatesJogadorPorQueda = {}
 for (const item of jogadoresSalvos) {
 if (!mapa[item.jogador_campeonato_id]) mapa[item.jogador_campeonato_id] = {}
 mapa[item.jogador_campeonato_id][item.numero_queda] = normalizarNumero(item.abates)
 }
 setAbatesJogadores(mapa)
 } catch (error: any) {
 console.error(error)
 toast.error(getErrorMessage(error, 'Erro ao carregar detalhes do confronto'))
 setPartidas(partidasBase)
 setAbatesJogadores({})
 }
 }, [])

 useEffect(() => {
 if (!jogoSelecionadoId || !jogoSelecionado) {
 setPartidas([])
 setAbatesJogadores({})
 return
 }
 carregarResultadoDetalhado(jogoSelecionadoId, jogoSelecionado)
 }, [jogoSelecionadoId, jogoSelecionado, carregarResultadoDetalhado])

 useEffect(() => {
 if (partidas.length === 0) {
 setQuedaSelecionada(1)
 return
 }
 if (!partidas.some((item) => item.partida === quedaSelecionada)) setQuedaSelecionada(partidas[0].partida)
 }, [partidas, quedaSelecionada])

 const partidaAtual = useMemo(() => partidas.find((item) => item.partida === quedaSelecionada) || partidas[0] || null, [partidas, quedaSelecionada])

 const totaisJogadoresA = useMemo(() => {
 const mapa = new Map<number, number>()
 for (const partida of partidas) {
 const total = jogadoresEquipeA.reduce((acc, jogador) => acc + normalizarNumero(abatesJogadores[jogador.id]?.[partida.partida]), 0)
 mapa.set(partida.partida, total)
 }
 return mapa
 }, [partidas, jogadoresEquipeA, abatesJogadores])

 const totaisJogadoresB = useMemo(() => {
 const mapa = new Map<number, number>()
 for (const partida of partidas) {
 const total = jogadoresEquipeB.reduce((acc, jogador) => acc + normalizarNumero(abatesJogadores[jogador.id]?.[partida.partida]), 0)
 mapa.set(partida.partida, total)
 }
 return mapa
 }, [partidas, jogadoresEquipeB, abatesJogadores])

 const partidasComAbates = useMemo(() => partidas.map((partida) => ({
 ...partida,
 abatesA: totaisJogadoresA.get(partida.partida) || 0,
 abatesB: totaisJogadoresB.get(partida.partida) || 0,
 })), [partidas, totaisJogadoresA, totaisJogadoresB])

 const resumo = useMemo(() => {
 const totalA = { vitorias: 0, rounds: 0, abates: 0 }
 const totalB = { vitorias: 0, rounds: 0, abates: 0 }

 for (const partida of partidasComAbates) {
 totalA.rounds += Number(partida.roundsA || 0)
 totalB.rounds += Number(partida.roundsB || 0)
 totalA.abates += Number(partida.abatesA || 0)
 totalB.abates += Number(partida.abatesB || 0)
 if (Number(partida.roundsA || 0) > Number(partida.roundsB || 0)) totalA.vitorias += 1
 if (Number(partida.roundsB || 0) > Number(partida.roundsA || 0)) totalB.vitorias += 1
 }

 let vencedorId: string | null = null
 if (equipesDoJogo.length >= 2) {
 if (totalA.rounds > totalB.rounds) vencedorId = equipesDoJogo[0].id
 if (totalB.rounds > totalA.rounds) vencedorId = equipesDoJogo[1].id
 }

 return { totalA, totalB, vencedorId }
 }, [partidasComAbates, equipesDoJogo])

 const tabelaCampeonato = useMemo(() => {
 const linhas = new Map<string, LinhaTabelaCampeonato>()
 for (const equipe of equipes) {
 linhas.set(equipe.id, {
 equipe,
 pontos: 0,
 jogos: 0,
 vitorias: 0,
 empates: 0,
 derrotas: 0,
 roundsPro: 0,
 roundsContra: 0,
 saldoRounds: 0,
 abates: 0,
 status: 'Aguardando',
 })
 }

 const quedasPorJogo = new Map<string, ConfrontoQuedaRow[]>()
 for (const queda of quedasCampeonato) {
 if (!queda.jogo_id) continue
 if (!quedasPorJogo.has(queda.jogo_id)) quedasPorJogo.set(queda.jogo_id, [])
 quedasPorJogo.get(queda.jogo_id)!.push(queda)
 }

 for (const jogo of jogos) {
 const vinculadas = jogoEquipes
 .filter((item) => item.jogo_id === jogo.id)
 .map((item) => item.campeonato_equipe_id)
 .filter((id) => linhas.has(id))

 if (vinculadas.length < 2) continue
 const [idA, idB] = vinculadas
 const linhaA = linhas.get(idA)!
 const linhaB = linhas.get(idB)!
 const quedas = quedasPorJogo.get(jogo.id) || []
 if (quedas.length === 0) continue

 const roundsA = quedas.reduce((acc, queda) => acc + normalizarNumero(queda.rounds_a), 0)
 const roundsB = quedas.reduce((acc, queda) => acc + normalizarNumero(queda.rounds_b), 0)
 const abatesA = quedas.reduce((acc, queda) => acc + normalizarNumero(queda.abates_a), 0)
 const abatesB = quedas.reduce((acc, queda) => acc + normalizarNumero(queda.abates_b), 0)

 linhaA.jogos += 1
 linhaB.jogos += 1
 linhaA.roundsPro += roundsA
 linhaA.roundsContra += roundsB
 linhaB.roundsPro += roundsB
 linhaB.roundsContra += roundsA
 linhaA.abates += abatesA
 linhaB.abates += abatesB

 if (roundsA > roundsB) {
 linhaA.vitorias += 1
 linhaA.pontos += 3
 linhaB.derrotas += 1
 } else if (roundsB > roundsA) {
 linhaB.vitorias += 1
 linhaB.pontos += 3
 linhaA.derrotas += 1
 } else {
 linhaA.empates += 1
 linhaB.empates += 1
 linhaA.pontos += 1
 linhaB.pontos += 1
 }
 }

 const ordenadas = Array.from(linhas.values()).map((linha) => ({
 ...linha,
 saldoRounds: linha.roundsPro - linha.roundsContra,
 status: linha.jogos === 0 ? 'Aguardando' : 'Em disputa',
 }))

 ordenadas.sort((a, b) =>
 b.pontos - a.pontos ||
 b.vitorias - a.vitorias ||
 b.saldoRounds - a.saldoRounds ||
 b.roundsPro - a.roundsPro ||
 b.abates - a.abates ||
 getEquipeNome(a.equipe).localeCompare(getEquipeNome(b.equipe)),
 )

 return ordenadas.map((linha, index) => ({
 ...linha,
 status: linha.jogos === 0 ? 'Aguardando' : index < Math.max(1, Math.ceil(ordenadas.length / 2)) ? 'Zona de classificação' : 'Em disputa',
 }))
 }, [equipes, jogos, jogoEquipes, quedasCampeonato])

 function atualizarCampo(index: number, campo: keyof Pick<PartidaResultado, 'roundsA' | 'roundsB'>, valor: string) {
 const numero = Math.max(0, Number(valor || 0))
 setPartidas((anterior) => anterior.map((item, idx) => (idx === index ? { ...item, [campo]: numero } : item)))
 }

 function atualizarAbateJogador(jogadorId: string, numeroQueda: number, valor: string) {
 const numero = Math.max(0, Number(valor || 0))
 setAbatesJogadores((anterior) => ({
 ...anterior,
 [jogadorId]: {
 ...(anterior[jogadorId] || {}),
 [numeroQueda]: numero,
 },
 }))
 }

 async function salvarResultado() {
 if (!jogoSelecionadoId || !jogoSelecionado) return toast.error('Selecione um confronto')
 if (equipesDoJogo.length !== 2) return toast.error('Esse confronto precisa ter exatamente 2 equipes')

 setSalvando(true)
 try {
 const resultado: ResultadoSalvo = {
 melhorDe: partidasComAbates.length,
 partidas: partidasComAbates,
 vencedorId: resumo.vencedorId,
 resumoA: resumo.totalA,
 resumoB: resumo.totalB,
 atualizadoEm: new Date().toISOString(),
 }

 const linhasQuedas = partidasComAbates.map((partida) => ({
 jogo_id: jogoSelecionadoId,
 numero_queda: partida.partida,
 rounds_a: normalizarNumero(partida.roundsA),
 rounds_b: normalizarNumero(partida.roundsB),
 abates_a: normalizarNumero(partida.abatesA),
 abates_b: normalizarNumero(partida.abatesB),
 vencedor_equipe_id: partida.roundsA > partida.roundsB ? equipeA?.id || null : partida.roundsB > partida.roundsA ? equipeB?.id || null : null,
 }))

 const linhasJogadores = [...jogadoresEquipeA, ...jogadoresEquipeB].flatMap((jogador) =>
 partidasComAbates.map((partida) => ({
 jogo_id: jogoSelecionadoId,
 numero_queda: partida.partida,
 jogador_campeonato_id: jogador.id,
 abates: normalizarNumero(abatesJogadores[jogador.id]?.[partida.partida]),
 })),
 )

 const { error: delJogadoresError } = await supabase.from('confronto_quedas_jogadores').delete().eq('jogo_id', jogoSelecionadoId)
 if (delJogadoresError) throw delJogadoresError

 const { error: delQuedasError } = await supabase.from('confronto_quedas').delete().eq('jogo_id', jogoSelecionadoId)
 if (delQuedasError) throw delQuedasError

 const { error: insertQuedasError } = await supabase.from('confronto_quedas').insert(linhasQuedas)
 if (insertQuedasError) throw insertQuedasError

 if (linhasJogadores.length > 0) {
 const { error: insertJogadoresError } = await supabase.from('confronto_quedas_jogadores').insert(linhasJogadores)
 if (insertJogadoresError) throw insertJogadoresError
 }

 const { error: jogoUpdateError } = await supabase.from('jogos').update({ observacoes: serializarResultado(resultado) }).eq('id', jogoSelecionadoId)
 if (jogoUpdateError) throw jogoUpdateError

 toast.success('Resultado salvo no banco')
 await carregar()
 await carregarResultadoDetalhado(jogoSelecionadoId, jogoSelecionado)
 } catch (error: any) {
 console.error(error)
 toast.error(getErrorMessage(error, 'Erro ao salvar resultado'))
 } finally {
 setSalvando(false)
 }
 }

 return (
 <div className="space-y-4">
 <div className="grid gap-2 border border-zinc-200 bg-white p-2 md:grid-cols-2">
 <button
 type="button"
 onClick={() => setSubAba('pontuacao')}
 className={`flex items-center justify-center gap-2 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] ${
 subAba === 'pontuacao' ? 'bg-[#e60012] text-white' : 'bg-[#f8f8f5] text-[#142340]'
 }`}
 >
 <Target size={15} /> Pontuação do confronto
 </button>
 <button
 type="button"
 onClick={() => setSubAba('tabela')}
 className={`flex items-center justify-center gap-2 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] ${
 subAba === 'tabela' ? 'bg-[#e60012] text-white' : 'bg-[#f8f8f5] text-[#142340]'
 }`}
 >
 <Table2 size={15} /> Resultados do campeonato
 </button>
 </div>

 {subAba === 'pontuacao' ? (
 <>
 <div className="border border-zinc-200 bg-white p-4">
 <div className="grid gap-3 lg:grid-cols-[1.2fr,1fr]">
 <div>
 <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#142340]">Selecionar confronto</div>
 <select
 value={jogoSelecionadoId}
 onChange={(e) => setJogoSelecionadoId(e.target.value)}
 className="mt-2 h-11 w-full border border-zinc-200 px-3 text-sm font-semibold outline-none"
 >
 <option value="">Selecione um confronto</option>
 {jogos.map((jogo) => (
 <option key={jogo.id} value={jogo.id}>{jogo.nome_bloco || 'Confronto'} - {jogo.nome || 'Sem nome'}</option>
 ))}
 </select>
 </div>

 <div className="grid gap-3 md:grid-cols-2">
 <div className="border border-zinc-200 bg-[#f8f8f5] px-3 py-3">
 <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Equipe A</div>
 <div className="mt-1 truncate text-base font-semibold uppercase text-[#142340]">{getEquipeNome(equipeA)}</div>
 <div className="text-[11px] font-semibold uppercase text-zinc-500">{getEquipeTag(equipeA) || 'Sem tag'}</div>
 </div>
 <div className="border border-zinc-200 bg-[#f8f8f5] px-3 py-3">
 <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Equipe B</div>
 <div className="mt-1 truncate text-base font-semibold uppercase text-[#142340]">{getEquipeNome(equipeB)}</div>
 <div className="text-[11px] font-semibold uppercase text-zinc-500">{getEquipeTag(equipeB) || 'Sem tag'}</div>
 </div>
 </div>
 </div>

 <div className="mt-3 grid grid-cols-[1fr,auto,1fr] items-center gap-3 border border-zinc-200 bg-[#f3f3ef] px-4 py-3">
 <div className="text-sm font-semibold uppercase">{getEquipeNome(equipeA)}</div>
 <div className="flex items-center gap-3 text-[11px] font-semibold uppercase">
 <span>{resumo.totalA.rounds} R</span><span>{resumo.totalA.abates} K</span><span className="px-2">X</span><span>{resumo.totalB.rounds} R</span><span>{resumo.totalB.abates} K</span>
 </div>
 <div className="text-right text-sm font-semibold uppercase">{getEquipeNome(equipeB)}</div>
 </div>
 </div>

 {loading ? (
 <div className="border border-zinc-200 bg-white px-5 py-10 text-center text-sm font-semibold text-zinc-500">Carregando resultados...</div>
 ) : !jogoSelecionado ? (
 <div className="border border-dashed border-zinc-200 bg-white px-5 py-10 text-center text-sm font-semibold text-zinc-500">Selecione um confronto para lançar o resultado.</div>
 ) : equipesDoJogo.length !== 2 ? (
 <div className="border border-dashed border-zinc-200 bg-white px-5 py-10 text-center text-sm font-semibold text-zinc-500">Esse confronto precisa ter exatamente 2 equipes vinculadas.</div>
 ) : (
 <>
 <div className="grid gap-4 xl:grid-cols-[1.1fr,0.9fr]">
 <div className="border border-zinc-200 bg-white">
 <div className="border-b border-zinc-200 bg-[#f3f3ef] px-4 py-3">
 <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#142340]">Pontuar rounds por partida</div>
 </div>

 <div className="border-b border-zinc-200 px-4 py-3">
 <div className="flex flex-wrap gap-2">
 {partidasComAbates.map((partida) => {
 const ativo = partida.partida === quedaSelecionada
 const vencedorPartida = partida.roundsA > partida.roundsB ? getEquipeNome(equipeA) : partida.roundsB > partida.roundsA ? getEquipeNome(equipeB) : 'Empate'
 return (
 <button
 key={partida.partida}
 type="button"
 onClick={() => setQuedaSelecionada(partida.partida)}
 className={`inline-flex items-center gap-2 border border-zinc-200 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] ${ativo ? 'bg-[#e60012] text-white' : 'bg-white text-zinc-700'}`}
 >
 <span>Partida {partida.partida}</span><span className="text-[10px] opacity-80">{partida.roundsA}x{partida.roundsB}</span><span className="text-[10px] opacity-80">{vencedorPartida}</span>
 </button>
 )
 })}
 </div>
 </div>

 {partidaAtual && (
 <div className="p-4">
 <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
 <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#142340]">Partida {partidaAtual.partida}</div>
 <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Abates são somados automaticamente pelos jogadores</div>
 </div>

 <div className="grid gap-3 lg:grid-cols-[1fr,auto,1fr] lg:items-stretch">
 <div className="border border-zinc-200 bg-[#f8f8f5] p-3">
 <div className="mb-2 text-sm font-semibold uppercase text-[#142340]">{getEquipeNome(equipeA)}</div>
 <div className="grid grid-cols-2 gap-2">
 <div>
 <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Rounds</div>
 <input type="number" min={0} value={partidaAtual.roundsA} onChange={(e) => atualizarCampo(partidaAtual.partida - 1, 'roundsA', e.target.value)} className="h-10 w-full border border-zinc-200 px-3 text-sm font-semibold outline-none" />
 </div>
 <div>
 <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Abates</div>
 <div className="flex h-10 items-center border border-zinc-200 bg-white px-3 text-sm font-semibold">{totaisJogadoresA.get(partidaAtual.partida) || 0}</div>
 </div>
 </div>
 </div>

 <div className="flex items-center justify-center px-1 text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">VS</div>

 <div className="border border-zinc-200 bg-[#f8f8f5] p-3">
 <div className="mb-2 text-sm font-semibold uppercase text-[#142340]">{getEquipeNome(equipeB)}</div>
 <div className="grid grid-cols-2 gap-2">
 <div>
 <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Rounds</div>
 <input type="number" min={0} value={partidaAtual.roundsB} onChange={(e) => atualizarCampo(partidaAtual.partida - 1, 'roundsB', e.target.value)} className="h-10 w-full border border-zinc-200 px-3 text-sm font-semibold outline-none" />
 </div>
 <div>
 <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Abates</div>
 <div className="flex h-10 items-center border border-zinc-200 bg-white px-3 text-sm font-semibold">{totaisJogadoresB.get(partidaAtual.partida) || 0}</div>
 </div>
 </div>
 </div>
 </div>
 </div>
 )}
 </div>

 <div className="space-y-4">
 {[{ titulo: `Abates por jogador — ${getEquipeNome(equipeA)}`, lista: jogadoresEquipeA }, { titulo: `Abates por jogador — ${getEquipeNome(equipeB)}`, lista: jogadoresEquipeB }].map((grupo) => (
 <div key={grupo.titulo} className="border border-zinc-200 bg-white">
 <div className="border-b border-zinc-200 bg-[#f3f3ef] px-4 py-3"><div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#142340]">{grupo.titulo}</div></div>
 <div className="overflow-x-auto">
 <table className="min-w-full border-collapse">
 <thead>
 <tr>
 <th className="border-b border-r border-zinc-200 bg-[#f8f8f5] px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Jogador</th>
 {partidas.map((partida) => <th key={partida.partida} className={`border-b border-r border-zinc-200 px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-[0.12em] last:border-r-0 ${partida.partida === quedaSelecionada ? 'bg-[#e60012] text-white' : 'bg-[#f8f8f5] text-zinc-500'}`}>P{partida.partida}</th>)}
 <th className="border-b border-zinc-200 bg-[#f3f3ef] px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Total</th>
 </tr>
 </thead>
 <tbody>
 {grupo.lista.length === 0 ? (
 <tr><td colSpan={Math.max(3, partidas.length + 2)} className="px-4 py-6 text-center text-sm font-semibold text-zinc-500">Nenhum jogador encontrado para essa equipe.</td></tr>
 ) : grupo.lista.map((jogador) => (
 <tr key={jogador.id}>
 <td className="border-b border-r border-zinc-200 px-3 py-2 text-sm font-semibold uppercase text-[#142340]">{getJogadorNome(jogador)}</td>
 {partidas.map((partida) => (
 <td key={partida.partida} className="border-b border-r border-zinc-200 p-1.5 last:border-r-0">
 <input type="number" min={0} value={abatesJogadores[jogador.id]?.[partida.partida] ?? 0} onChange={(e) => atualizarAbateJogador(jogador.id, partida.partida, e.target.value)} className={`h-9 w-full border border-zinc-200 px-2 text-center text-sm font-semibold outline-none ${partida.partida === quedaSelecionada ? 'bg-[#fff5f5]' : ''}`} />
 </td>
 ))}
 <td className="border-b border-zinc-200 px-2 py-2 text-center text-sm font-semibold text-[#142340]">{partidas.reduce((acc, partida) => acc + (abatesJogadores[jogador.id]?.[partida.partida] ?? 0), 0)}</td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>
 ))}
 </div>
 </div>

 <div className="flex flex-wrap items-center justify-between gap-3 border border-zinc-200 bg-white p-4">
 <div>
 <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Vencedor do confronto</div>
 <div className="text-lg font-black uppercase text-[#142340]">{resumo.vencedorId === equipeA?.id ? getEquipeNome(equipeA) : resumo.vencedorId === equipeB?.id ? getEquipeNome(equipeB) : 'Empate / indefinido'}</div>
 </div>
 <button type="button" onClick={salvarResultado} disabled={salvando} className="inline-flex items-center gap-2 bg-[#e60012] px-5 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-white disabled:opacity-60">
 <Save size={16} /> {salvando ? 'Salvando...' : 'Salvar resultado'}
 </button>
 </div>
 </>
 )}
 </>
 ) : (
 <div className="border border-zinc-200 bg-white">
 <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 bg-[#f3f3ef] px-4 py-3">
 <div>
 <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#142340]">Tabela geral do campeonato</div>
 <div className="mt-1 text-xs font-semibold text-zinc-500">Ordenada por pontos, vitórias, saldo de rounds, rounds pró e abates.</div>
 </div>
 <button type="button" onClick={carregar} className="border border-zinc-200 bg-white px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#142340]">Atualizar</button>
 </div>
 <div className="overflow-x-auto">
 <table className="min-w-full border-collapse">
 <thead>
 <tr>
 {['#', 'Equipe', 'PTS', 'J', 'V', 'E', 'D', 'RP', 'RC', 'SR', 'K', 'Status'].map((titulo) => (
 <th key={titulo} className="border-b border-r border-zinc-200 bg-[#f8f8f5] px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500 last:border-r-0">{titulo}</th>
 ))}
 </tr>
 </thead>
 <tbody>
 {tabelaCampeonato.length === 0 ? (
 <tr><td colSpan={12} className="px-4 py-10 text-center text-sm font-semibold text-zinc-500">Nenhuma equipe encontrada no campeonato.</td></tr>
 ) : tabelaCampeonato.map((linha, index) => (
 <tr key={linha.equipe.id} className={index === 0 ? 'bg-[#fff8f8]' : ''}>
 <td className="border-b border-r border-zinc-200 px-3 py-3 text-sm font-black text-[#142340]">{index + 1}</td>
 <td className="border-b border-r border-zinc-200 px-3 py-3">
 <div className="text-sm font-black uppercase text-[#142340]">{getEquipeNome(linha.equipe)}</div>
 <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">{getEquipeTag(linha.equipe) || 'Sem tag'}</div>
 </td>
 <td className="border-b border-r border-zinc-200 px-3 py-3 text-sm font-black text-[#142340]">{linha.pontos}</td>
 <td className="border-b border-r border-zinc-200 px-3 py-3 text-sm font-semibold">{linha.jogos}</td>
 <td className="border-b border-r border-zinc-200 px-3 py-3 text-sm font-semibold">{linha.vitorias}</td>
 <td className="border-b border-r border-zinc-200 px-3 py-3 text-sm font-semibold">{linha.empates}</td>
 <td className="border-b border-r border-zinc-200 px-3 py-3 text-sm font-semibold">{linha.derrotas}</td>
 <td className="border-b border-r border-zinc-200 px-3 py-3 text-sm font-semibold">{linha.roundsPro}</td>
 <td className="border-b border-r border-zinc-200 px-3 py-3 text-sm font-semibold">{linha.roundsContra}</td>
 <td className="border-b border-r border-zinc-200 px-3 py-3 text-sm font-semibold">{linha.saldoRounds}</td>
 <td className="border-b border-r border-zinc-200 px-3 py-3 text-sm font-semibold">{linha.abates}</td>
 <td className="border-b border-zinc-200 px-3 py-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">{linha.status}</td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>
 )}
 </div>
 )
}
