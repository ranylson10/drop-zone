'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, RefreshCcw, Swords, Trash2, GitBranch, Trophy, ListOrdered, Shuffle } from 'lucide-react'
import { toast } from 'react-hot-toast'

type FaseBase = {
 id: string
 nome: string | null
 ordem: number | null
}

type FaseV2 = {
 id: string
 nome: string | null
 ordem: number | null
 tipo_fase: string | null
 status?: string | null
}

type Fase = {
 id: string
 nome: string | null
 ordem: number | null
 tipo_fase: string
 status?: string | null
}

type EquipeItem = {
 id: string
 campeonato_id?: string | null
 equipe_id?: string | null
 grupo_id?: string | null
 seed?: number | null
 status?: string | null
 observacoes?: string | null
 equipe_avulsa_id?: string | null
 tipo_origem?: string | null
 fase_id?: string | null
 nome?: string | null
 equipes?: {
 nome?: string | null
 tag?: string | null
 logo_url?: string | null
 } | null
 equipe_avulsa?: {
 nome?: string | null
 tag?: string | null
 logo_url?: string | null
 } | null
}

type JogoItem = {
 id: string
 fase_id?: string | null
 grupo_id?: string | null
 nome?: string | null
 numero?: number | null
 data_inicio?: string | null
 data_fim?: string | null
 observacoes?: string | null
 created_at?: string | null
 nome_bloco?: string | null
 data_jogo?: string | null
 hora_jogo?: string | null
 duracao_estimada_min?: number | null
 quantidade_partidas?: number | null
 quedas?: any
 bloqueia_alteracao_equipe_ate?: string | null
 bloqueia_escalacao_ate?: string | null
 agenda_publicada?: boolean | null
 ordem?: number | null
 rodada?: number | null
 numero_queda?: number | null
 mapa?: string | null
 data_hora?: string | null
 configuracao?: any
}

type JogoEquipeItem = {
 id: string
 jogo_id: string
 campeonato_id?: string | null
 fase_id?: string | null
 grupo_id?: string | null
 campeonato_equipe_id: string
 origem_slot_id?: string | null
 created_at?: string | null
}

function getErrorMessage(error: any, fallback = 'Erro inesperado') {
 if (!error) return fallback
 if (typeof error === 'string') return error
 if (error.message) return error.message
 if (error.details) return error.details
 if (error.hint) return error.hint
 if (error.code) return `Erro ${error.code}`
 try {
 const texto = JSON.stringify(error)
 if (texto && texto !== '{}') return texto
 } catch {}
 return fallback
}

function parseObservacoesEquipe(item?: EquipeItem | null) {
 if (!item?.observacoes) return {}
 try {
 return JSON.parse(item.observacoes)
 } catch {
 return {}
 }
}

function getEquipeNome(item?: EquipeItem | null) {
 if (!item) return 'Equipe'
 const obs = parseObservacoesEquipe(item)
 return (
 item.nome ||
 item.equipes?.nome ||
 item.equipe_avulsa?.nome ||
 obs.nome ||
 obs.equipe_nome ||
 obs.nome_equipe ||
 obs.tag ||
 `Equipe ${item.seed || item.id.slice(0, 6)}`
 )
}

function getEquipeTag(item?: EquipeItem | null) {
 if (!item) return null
 const obs = parseObservacoesEquipe(item)
 return item.equipes?.tag || item.equipe_avulsa?.tag || obs.tag || null
}

function getEquipeLogo(item?: EquipeItem | null) {
 if (!item) return null
 const obs = parseObservacoesEquipe(item)
 return item.equipes?.logo_url || item.equipe_avulsa?.logo_url || obs.logo_url || obs.logo || null
}

function formatarHorario(jogo?: JogoItem | null) {
 if (!jogo) return 'Sem horário'
 if (jogo.data_hora) {
 try {
 return new Date(jogo.data_hora).toLocaleString('pt-BR')
 } catch {
 return jogo.data_hora
 }
 }
 if (jogo.data_jogo && jogo.hora_jogo) {
 return `${jogo.data_jogo.split('-').reverse().join('/')} • ${jogo.hora_jogo}`
 }
 if (jogo.data_jogo) return jogo.data_jogo.split('-').reverse().join('/')
 if (jogo.data_inicio) {
 try {
 return new Date(jogo.data_inicio).toLocaleString('pt-BR')
 } catch {
 return jogo.data_inicio
 }
 }
 return 'Sem horário'
}

function classNamePainel(claro = false) {
 return claro
 ? 'border border-zinc-200 bg-white p-5'
 : 'border border-zinc-200 bg-[#eceee5] p-5'
}

function getTipoLabel(tipo?: string | null) {
 const valor = String(tipo || 'mata_mata').toLowerCase()
 if (valor === 'dupla_eliminacao') return 'Dupla eliminação'
 if (valor === 'pontos_corridos') return 'Pontos corridos'
 return 'Mata-mata'
}

function getTipoBadgeClass(tipo?: string | null) {
 const valor = String(tipo || 'mata_mata').toLowerCase()
 if (valor === 'dupla_eliminacao') return 'bg-[#fff3d6]'
 if (valor === 'pontos_corridos') return 'bg-[#dff3ff]'
 return 'bg-[#e7ffe1]'
}

function criarPayloadQuedas(quantidade: number) {
 return Array.from({ length: Math.max(1, quantidade) }, (_, idx) => ({
 numero: idx + 1,
 nome: `Queda ${idx + 1}`,
 }))
}

function iconeTipo(tipo?: string | null) {
 const valor = String(tipo || 'mata_mata').toLowerCase()
 if (valor === 'dupla_eliminacao') return GitBranch
 if (valor === 'pontos_corridos') return ListOrdered
 return Trophy
}



function embaralharLista<T>(lista: T[]) {
 const copia = [...lista]
 for (let i = copia.length - 1; i > 0; i -= 1) {
 const j = Math.floor(Math.random() * (i + 1))
 ;[copia[i], copia[j]] = [copia[j], copia[i]]
 }
 return copia
}

function obterEquipesDisponiveisDaFase(
 equipes: EquipeItem[],
 faseId: string,
 tipoConfronto: string,
) {
 if (!faseId) return []
 if (tipoConfronto === 'pontos_corridos') {
 return equipes
 }
 const filtradas = equipes.filter((equipe) => {
 if (!equipe.fase_id) return true
 return equipe.fase_id === faseId
 })
 return filtradas.length > 0 ? filtradas : equipes
}



function PreviewEquipeSelecionada({
 titulo,
 equipe,
}: {
 titulo: string
 equipe?: EquipeItem | null
}) {
 return (
 <div className="border border-zinc-200 bg-[#f8f8f5] px-3 py-3">
 <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
 {titulo}
 </div>
 <div className="flex items-center gap-3">
 <div className="flex h-12 w-12 items-center justify-center overflow-hidden border border-zinc-200 bg-white">
 {getEquipeLogo(equipe) ? (
 <img
 src={getEquipeLogo(equipe) as string}
 alt={getEquipeNome(equipe)}
 className="h-full w-full object-cover"
 />
 ) : (
 <span className="text-lg font-semibold text-zinc-500">
 {getEquipeNome(equipe).charAt(0).toUpperCase()}
 </span>
 )}
 </div>
 <div className="min-w-0">
 <div className="truncate text-sm font-semibold uppercase text-[#142340]">
 {getEquipeNome(equipe)}
 </div>
 <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
 {getEquipeTag(equipe) || 'Sem tag'}
 </div>
 </div>
 </div>
 </div>
 )
}


export default function GerenciarConfrontos({ campeonatoId }: { campeonatoId: string }) {
 const [loading, setLoading] = useState(true)
 const [salvando, setSalvando] = useState(false)

 const [fases, setFases] = useState<Fase[]>([])
 const [equipes, setEquipes] = useState<EquipeItem[]>([])
 const [jogos, setJogos] = useState<JogoItem[]>([])
 const [jogoEquipes, setJogoEquipes] = useState<JogoEquipeItem[]>([])

 const [novaFase, setNovaFase] = useState('')
 const [novoTipoFase, setNovoTipoFase] = useState('mata_mata')

 const [faseSelecionada, setFaseSelecionada] = useState('')
 const [tipoConfronto, setTipoConfronto] = useState('mata_mata')
 const [nomeConfronto, setNomeConfronto] = useState('')
 const [equipeA, setEquipeA] = useState('')
 const [equipeB, setEquipeB] = useState('')
 const [dataJogo, setDataJogo] = useState('')
 const [horaJogo, setHoraJogo] = useState('19:00')
 const [melhorDe, setMelhorDe] = useState('1')
 const [quantidadeQuedas, setQuantidadeQuedas] = useState('1')

 const carregar = useCallback(async () => {
 if (!campeonatoId) return
 setLoading(true)

 try {
 const [fasesRes, fasesV2Res, equipesRes, jogosRes] = await Promise.all([
 supabase
 .from('campeonato_fases')
 .select('id, nome, ordem')
 .eq('campeonato_id', campeonatoId)
 .order('ordem', { ascending: true }),
 supabase
 .from('campeonato_fases_v2')
 .select('id, nome, ordem, tipo_fase, status')
 .eq('campeonato_id', campeonatoId)
 .order('ordem', { ascending: true }),
 supabase
 .from('campeonato_equipes')
 .select(`
 id,
 campeonato_id,
 equipe_id,
 grupo_id,
 seed,
 status,
 observacoes,
 created_at,
 updated_at,
 equipe_avulsa_id,
 tipo_origem,
 fase_id,
 equipes ( nome, tag, logo_url ),
 equipe_avulsa:equipes_avulsas_campeonato ( nome, tag, logo_url )
 `)
 .eq('campeonato_id', campeonatoId)
 .order('seed', { ascending: true })
 .order('created_at', { ascending: true }),
 supabase
 .from('jogos')
 .select(
 'id, fase_id, grupo_id, nome, numero, data_inicio, data_fim, observacoes, created_at, nome_bloco, data_jogo, hora_jogo, duracao_estimada_min, quantidade_partidas, quedas, bloqueia_alteracao_equipe_ate, bloqueia_escalacao_ate, agenda_publicada, ordem, rodada, numero_queda, mapa, data_hora, configuracao'
 )
 .eq('campeonato_id', campeonatoId)
 .order('created_at', { ascending: true }),
 ])

 if (fasesRes.error) throw fasesRes.error
 if (fasesV2Res.error) throw fasesV2Res.error
 if (equipesRes.error) throw equipesRes.error
 if (jogosRes.error) throw jogosRes.error

 const fasesData = (fasesRes.data || []) as FaseBase[]
 const fasesV2Data = (fasesV2Res.data || []) as FaseV2[]
 const equipesData = (equipesRes.data || []) as EquipeItem[]
 const jogosData = (jogosRes.data || []) as JogoItem[]

 const mapV2 = new Map<string, FaseV2>()
 for (const item of fasesV2Data) {
 const chave = `${item.ordem || 0}-${String(item.nome || '').trim().toLowerCase()}`
 mapV2.set(chave, item)
 }

 const fasesMescladas: Fase[] = fasesData.map((fase) => {
 const chave = `${fase.ordem || 0}-${String(fase.nome || '').trim().toLowerCase()}`
 const v2 = mapV2.get(chave)
 return {
 id: fase.id,
 nome: fase.nome,
 ordem: fase.ordem,
 tipo_fase: v2?.tipo_fase || 'mata_mata',
 status: v2?.status || null,
 }
 })

 setFases(fasesMescladas)
 setEquipes(equipesData)
 setJogos(jogosData)

 if ((!faseSelecionada || !fasesMescladas.some((f) => f.id === faseSelecionada)) && fasesMescladas[0]?.id) {
 setFaseSelecionada(fasesMescladas[0].id)
 setTipoConfronto(fasesMescladas[0].tipo_fase || 'mata_mata')
 }

 if (jogosData.length > 0) {
 const jogoIds = jogosData.map((jogo) => jogo.id)
 const { data: jogoEquipesData, error: jogoEquipesError } = await supabase
 .from('jogo_equipes')
 .select('id, jogo_id, campeonato_id, fase_id, grupo_id, campeonato_equipe_id, origem_slot_id, created_at')
 .in('jogo_id', jogoIds)
 .order('created_at', { ascending: true })

 if (jogoEquipesError) throw jogoEquipesError
 setJogoEquipes((jogoEquipesData || []) as JogoEquipeItem[])
 } else {
 setJogoEquipes([])
 }
 } catch (error: any) {
 console.error('Erro detalhado ao carregar confrontos:', error)
 toast.error(getErrorMessage(error, 'Erro ao carregar confrontos'))
 } finally {
 setLoading(false)
 }
 }, [campeonatoId, faseSelecionada])

 useEffect(() => {
 carregar()
 }, [carregar])

 useEffect(() => {
 const fase = fases.find((item) => item.id === faseSelecionada)
 if (fase?.tipo_fase) {
 setTipoConfronto(fase.tipo_fase)
 }
 }, [faseSelecionada, fases])

 const mapaEquipes = useMemo(() => {
 const map = new Map<string, EquipeItem>()
 for (const equipe of equipes) {
 map.set(equipe.id, equipe)
 }
 return map
 }, [equipes])

 const equipesDisponiveisDaFase = useMemo(() => {
 return obterEquipesDisponiveisDaFase(equipes, faseSelecionada, tipoConfronto)
 }, [equipes, faseSelecionada, tipoConfronto])


 const equipesJaUsadasNaFase = useMemo(() => {
 if (tipoConfronto === 'pontos_corridos' || !faseSelecionada) return new Set<string>()
 const ids = new Set<string>()
 const jogosDaFase = jogos.filter((jogo) => (jogo.fase_id || '') === faseSelecionada)
 const jogoIds = new Set(jogosDaFase.map((jogo) => jogo.id))
 for (const item of jogoEquipes) {
 if (jogoIds.has(item.jogo_id)) ids.add(item.campeonato_equipe_id)
 }
 return ids
 }, [tipoConfronto, faseSelecionada, jogos, jogoEquipes])

 const opcoesEquipeA = useMemo(() => {
 if (tipoConfronto === 'pontos_corridos') return equipesDisponiveisDaFase
 return equipesDisponiveisDaFase.filter((equipe) => {
 if (equipe.id === equipeA) return true
 return !equipesJaUsadasNaFase.has(equipe.id)
 })
 }, [tipoConfronto, equipesDisponiveisDaFase, equipesJaUsadasNaFase, equipeA])

 const opcoesEquipeB = useMemo(() => {
 if (tipoConfronto === 'pontos_corridos') return equipesDisponiveisDaFase
 return equipesDisponiveisDaFase.filter((equipe) => {
 if (equipe.id === equipeB) return true
 if (equipe.id === equipeA) return false
 return !equipesJaUsadasNaFase.has(equipe.id)
 })
 }, [tipoConfronto, equipesDisponiveisDaFase, equipesJaUsadasNaFase, equipeA, equipeB])

 const confrontosPorFase = useMemo(() => {
 return fases.map((fase) => {
 const jogosDaFase = jogos.filter((jogo) => (jogo.fase_id || '') === fase.id)

 return {
 fase,
 jogos: jogosDaFase.map((jogo) => {
 const vinculadas = jogoEquipes
 .filter((item) => item.jogo_id === jogo.id)
 .map((item) => mapaEquipes.get(item.campeonato_equipe_id))
 .filter(Boolean) as EquipeItem[]

 return {
 ...jogo,
 equipes: vinculadas,
 }
 }),
 }
 })
 }, [fases, jogos, jogoEquipes, mapaEquipes])

 async function criarFase() {
 const nome = novaFase.trim()
 if (!nome) {
 toast.error('Digite o nome da fase')
 return
 }

 setSalvando(true)
 try {
 const proximaOrdem = (fases[fases.length - 1]?.ordem || 0) + 1

 const { data: faseCriada, error } = await supabase.from('campeonato_fases').insert({
 campeonato_id: campeonatoId,
 nome,
 ordem: proximaOrdem,
 }).select('id').single()

 if (error) throw error

 const { error: errorV2 } = await supabase.from('campeonato_fases_v2').insert({
 campeonato_id: campeonatoId,
 nome,
 ordem: proximaOrdem,
 tipo_fase: novoTipoFase,
 status: 'rascunho',
 })

 if (errorV2) {
 console.error('Erro fase_v2:', errorV2)
 }

 toast.success('Fase criada')
 setNovaFase('')
 setNovoTipoFase('mata_mata')
 if (faseCriada?.id) setFaseSelecionada(faseCriada.id)
 await carregar()
 } catch (error: any) {
 console.error('Erro ao criar fase:', error)
 toast.error(getErrorMessage(error, 'Erro ao criar fase'))
 } finally {
 setSalvando(false)
 }
 }

 async function criarConfrontoIndividual() {
 if (!faseSelecionada) {
 toast.error('Selecione uma fase')
 return
 }

 if (!equipeA || !equipeB) {
 toast.error('Selecione as 2 equipes')
 return
 }

 if (equipeA === equipeB) {
 toast.error('As equipes precisam ser diferentes')
 return
 }

 if (tipoConfronto !== 'pontos_corridos') {
 if (equipesJaUsadasNaFase.has(equipeA) || equipesJaUsadasNaFase.has(equipeB)) {
 toast.error('Uma das equipes já foi usada em outro confronto dessa fase')
 return
 }
 }

 const equipeAObj = mapaEquipes.get(equipeA)
 const equipeBObj = mapaEquipes.get(equipeB)
 const jogosDaFase = jogos.filter((jogo) => (jogo.fase_id || '') === faseSelecionada)
 const numeroConfronto = jogosDaFase.length + 1
 const titulo =
 nomeConfronto.trim() || `${getEquipeNome(equipeAObj)} x ${getEquipeNome(equipeBObj)}`

 setSalvando(true)
 try {
 const configuracao = {
 tipo: tipoConfronto,
 melhor_de: Number(melhorDe || 1),
 quedas: Number(quantidadeQuedas || 1),
 }

 const payloadJogo: Record<string, any> = {
 campeonato_id: campeonatoId,
 fase_id: faseSelecionada,
 nome: titulo,
 nome_bloco: `CONFRONTO ${String(numeroConfronto).padStart(2, '0')}`,
 quantidade_partidas: Number(melhorDe || 1),
 quedas: criarPayloadQuedas(Number(quantidadeQuedas || 1)),
 configuracao,
 observacoes: JSON.stringify(configuracao),
 ordem: numeroConfronto,
 rodada: numeroConfronto,
 }

 if (dataJogo) payloadJogo.data_jogo = dataJogo
 if (horaJogo) payloadJogo.hora_jogo = horaJogo

 const { data: jogoCriado, error: jogoError } = await supabase
 .from('jogos')
 .insert(payloadJogo)
 .select('id, fase_id, grupo_id')
 .single()

 if (jogoError) throw jogoError
 if (!jogoCriado?.id) throw new Error('Não foi possível criar o confronto')

 const { error: equipesError } = await supabase.from('jogo_equipes').insert([
 {
 jogo_id: jogoCriado.id,
 campeonato_id: campeonatoId,
 fase_id: jogoCriado.fase_id || faseSelecionada,
 grupo_id: jogoCriado.grupo_id || null,
 campeonato_equipe_id: equipeA,
 },
 {
 jogo_id: jogoCriado.id,
 campeonato_id: campeonatoId,
 fase_id: jogoCriado.fase_id || faseSelecionada,
 grupo_id: jogoCriado.grupo_id || null,
 campeonato_equipe_id: equipeB,
 },
 ])

 if (equipesError) throw equipesError

 toast.success('Confronto criado')
 setNomeConfronto('')
 setEquipeA('')
 setEquipeB('')
 setDataJogo('')
 setHoraJogo('19:00')
 setMelhorDe('1')
 setQuantidadeQuedas('1')
 await carregar()
 } catch (error: any) {
 console.error('Erro ao criar confronto:', error)
 toast.error(getErrorMessage(error, 'Erro ao criar confronto'))
 } finally {
 setSalvando(false)
 }
 }

 async function gerarPontosCorridos() {
 if (!faseSelecionada) {
 toast.error('Selecione uma fase')
 return
 }

 if (equipes.length < 2) {
 toast.error('É preciso ter pelo menos 2 equipes')
 return
 }

 const ok = window.confirm(
 'Isso vai gerar todos os confrontos de pontos corridos entre todas as equipes do campeonato nessa fase. Deseja continuar?'
 )
 if (!ok) return

 setSalvando(true)
 try {
 const jogosDaFase = jogos.filter((jogo) => (jogo.fase_id || '') === faseSelecionada)
 let ordemAtual = jogosDaFase.length + 1

 for (let i = 0; i < equipes.length; i++) {
 for (let j = i + 1; j < equipes.length; j++) {
 const equipeAObj = equipes[i]
 const equipeBObj = equipes[j]

 const configuracao = {
 tipo: 'pontos_corridos',
 melhor_de: Number(melhorDe || 1),
 quedas: Number(quantidadeQuedas || 1),
 }

 const payloadJogo: Record<string, any> = {
 campeonato_id: campeonatoId,
 fase_id: faseSelecionada,
 nome: `${getEquipeNome(equipeAObj)} x ${getEquipeNome(equipeBObj)}`,
 nome_bloco: `RODADA ${String(ordemAtual).padStart(2, '0')}`,
 quantidade_partidas: Number(melhorDe || 1),
 quedas: criarPayloadQuedas(Number(quantidadeQuedas || 1)),
 configuracao,
 observacoes: JSON.stringify(configuracao),
 ordem: ordemAtual,
 rodada: ordemAtual,
 }

 const { data: jogoCriado, error: jogoError } = await supabase
 .from('jogos')
 .insert(payloadJogo)
 .select('id, fase_id, grupo_id')
 .single()

 if (jogoError) throw jogoError
 if (!jogoCriado?.id) throw new Error('Erro ao gerar rodada')

 const { error: equipesError } = await supabase.from('jogo_equipes').insert([
 {
 jogo_id: jogoCriado.id,
 campeonato_id: campeonatoId,
 fase_id: jogoCriado.fase_id || faseSelecionada,
 grupo_id: jogoCriado.grupo_id || null,
 campeonato_equipe_id: equipeAObj.id,
 },
 {
 jogo_id: jogoCriado.id,
 campeonato_id: campeonatoId,
 fase_id: jogoCriado.fase_id || faseSelecionada,
 grupo_id: jogoCriado.grupo_id || null,
 campeonato_equipe_id: equipeBObj.id,
 },
 ])

 if (equipesError) throw equipesError
 ordemAtual += 1
 }
 }

 toast.success('Tabela de pontos corridos gerada')
 await carregar()
 } catch (error: any) {
 console.error('Erro ao gerar pontos corridos:', error)
 toast.error(getErrorMessage(error, 'Erro ao gerar pontos corridos'))
 } finally {
 setSalvando(false)
 }
 }


 async function gerarConfrontosAutomaticamente() {
 if (!faseSelecionada) {
 toast.error('Selecione uma fase')
 return
 }

 const disponiveis = obterEquipesDisponiveisDaFase(equipes, faseSelecionada, tipoConfronto)

 if (disponiveis.length < 2) {
 toast.error('Não há equipes suficientes disponíveis nessa fase')
 return
 }

 if (tipoConfronto === 'pontos_corridos') {
 await gerarPontosCorridos()
 return
 }

 const confirmacao = window.confirm(
 'Isso vai gerar confrontos automáticos aleatórios com as equipes disponíveis da fase. Deseja continuar?'
 )
 if (!confirmacao) return

 setSalvando(true)
 try {
 const embaralhadas = embaralharLista(disponiveis)
 const jogosDaFase = jogos.filter((jogo) => (jogo.fase_id || '') === faseSelecionada)
 let ordemAtual = jogosDaFase.length + 1

 for (let i = 0; i < embaralhadas.length; i += 2) {
 const equipeAObj = embaralhadas[i]
 const equipeBObj = embaralhadas[i + 1]

 if (!equipeAObj || !equipeBObj) continue

 const configuracao = {
 tipo: tipoConfronto,
 melhor_de: Number(melhorDe || 1),
 quedas: Number(quantidadeQuedas || 1),
 gerado_automaticamente: true,
 }

 const payloadJogo: Record<string, any> = {
 campeonato_id: campeonatoId,
 fase_id: faseSelecionada,
 nome: `${getEquipeNome(equipeAObj)} x ${getEquipeNome(equipeBObj)}`,
 nome_bloco: `CONFRONTO ${String(ordemAtual).padStart(2, '0')}`,
 quantidade_partidas: Number(melhorDe || 1),
 quedas: criarPayloadQuedas(Number(quantidadeQuedas || 1)),
 configuracao,
 observacoes: JSON.stringify(configuracao),
 ordem: ordemAtual,
 rodada: ordemAtual,
 }

 if (dataJogo) payloadJogo.data_jogo = dataJogo
 if (horaJogo) payloadJogo.hora_jogo = horaJogo

 const { data: jogoCriado, error: jogoError } = await supabase
 .from('jogos')
 .insert(payloadJogo)
 .select('id, fase_id, grupo_id')
 .single()

 if (jogoError) throw jogoError
 if (!jogoCriado?.id) throw new Error('Não foi possível criar o confronto automático')

 const { error: equipesError } = await supabase.from('jogo_equipes').insert([
 {
 jogo_id: jogoCriado.id,
 campeonato_id: campeonatoId,
 fase_id: jogoCriado.fase_id || faseSelecionada,
 grupo_id: jogoCriado.grupo_id || null,
 campeonato_equipe_id: equipeAObj.id,
 },
 {
 jogo_id: jogoCriado.id,
 campeonato_id: campeonatoId,
 fase_id: jogoCriado.fase_id || faseSelecionada,
 grupo_id: jogoCriado.grupo_id || null,
 campeonato_equipe_id: equipeBObj.id,
 },
 ])

 if (equipesError) throw equipesError
 ordemAtual += 1
 }

 if (embaralhadas.length % 2 !== 0) {
 toast.success('Confrontos gerados. Sobrou 1 equipe sem adversário nesta fase.')
 } else {
 toast.success('Confrontos automáticos gerados')
 }

 await carregar()
 } catch (error: any) {
 console.error('Erro ao gerar confrontos automáticos:', error)
 toast.error(getErrorMessage(error, 'Erro ao gerar confrontos automáticos'))
 } finally {
 setSalvando(false)
 }
 }

 async function excluirConfronto(jogoId: string) {
 const ok = window.confirm('Deseja excluir esse confronto?')
 if (!ok) return

 try {
 const { error: relError } = await supabase.from('jogo_equipes').delete().eq('jogo_id', jogoId)
 if (relError) throw relError

 const { error: quedaJogadoresError } = await supabase.from('confronto_quedas_jogadores').delete().eq('jogo_id', jogoId)
 if (quedaJogadoresError) console.error(quedaJogadoresError)

 const { error: quedaError } = await supabase.from('confronto_quedas').delete().eq('jogo_id', jogoId)
 if (quedaError) console.error(quedaError)

 const { error: jogoError } = await supabase.from('jogos').delete().eq('id', jogoId)
 if (jogoError) throw jogoError

 toast.success('Confronto excluído')
 await carregar()
 } catch (error: any) {
 console.error('Erro ao excluir confronto:', error)
 toast.error(getErrorMessage(error, 'Erro ao excluir confronto'))
 }
 }

 return (
 <div className="space-y-5">
 <div className="grid gap-5 xl:grid-cols-[430px,1fr]">
 <div className="space-y-5">
 <div className={classNamePainel()}>
 <div className="mb-4 flex items-center justify-between">
 <div>
 <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#142340]">
 Criar fase
 </div>
 <p className="mt-2 text-sm font-semibold text-zinc-500">
 Defina a fase e o formato: mata-mata, dupla eliminação ou pontos corridos.
 </p>
 </div>
 </div>

 <div className="grid gap-3">
 <input
 value={novaFase}
 onChange={(e) => setNovaFase(e.target.value)}
 placeholder="Ex: Quartas de final"
 className="h-11 flex-1 border border-zinc-200 bg-white px-3 text-sm font-semibold outline-none"
 />

 <select
 value={novoTipoFase}
 onChange={(e) => setNovoTipoFase(e.target.value)}
 className="h-11 border border-zinc-200 bg-white px-3 text-sm font-semibold outline-none"
 >
 <option value="mata_mata">Mata-mata</option>
 <option value="dupla_eliminacao">Dupla eliminação</option>
 <option value="pontos_corridos">Pontos corridos</option>
 </select>

 <button
 type="button"
 onClick={criarFase}
 disabled={salvando}
 className="inline-flex h-11 items-center justify-center gap-2 border border-zinc-200 bg-white px-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#142340] hover:bg-[#2563eb] disabled:opacity-60"
 >
 <Plus size={14} />
 Criar fase
 </button>
 </div>
 </div>

 <div className={classNamePainel()}>
 <div className="mb-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#142340]">
 Montar confrontos
 </div>

 <div className="grid gap-3">
 <select
 value={faseSelecionada}
 onChange={(e) => setFaseSelecionada(e.target.value)}
 className="h-11 border border-zinc-200 bg-white px-3 text-sm font-semibold outline-none"
 >
 <option value="">Selecione a fase</option>
 {fases.map((fase) => (
 <option key={fase.id} value={fase.id}>
 {fase.nome || 'Fase'} • {getTipoLabel(fase.tipo_fase)}
 </option>
 ))}
 </select>

 <select
 value={tipoConfronto}
 onChange={(e) => setTipoConfronto(e.target.value)}
 className="h-11 border border-zinc-200 bg-white px-3 text-sm font-semibold outline-none"
 >
 <option value="mata_mata">Mata-mata</option>
 <option value="dupla_eliminacao">Dupla eliminação</option>
 <option value="pontos_corridos">Pontos corridos</option>
 </select>

 <input
 value={nomeConfronto}
 onChange={(e) => setNomeConfronto(e.target.value)}
 placeholder="Nome do confronto (opcional)"
 className="h-11 border border-zinc-200 bg-white px-3 text-sm font-semibold outline-none"
 />

 {tipoConfronto !== 'pontos_corridos' && (
 <>
 <div className="rounded-none border border-zinc-200 bg-[#f8f8f5] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-600">
 Equipes disponíveis na fase: {tipoConfronto === 'pontos_corridos' ? equipesDisponiveisDaFase.length : opcoesEquipeA.length} {tipoConfronto !== 'pontos_corridos' ? `• já usadas: ${equipesJaUsadasNaFase.size}` : ''}
 </div>
 <div className="grid gap-3 md:grid-cols-2">
 <select
 value={equipeA}
 onChange={(e) => {
 const valor = e.target.value
 setEquipeA(valor)
 if (valor && valor === equipeB) setEquipeB('')
 }}
 className="h-11 border border-zinc-200 bg-white px-3 text-sm font-semibold outline-none"
 >
 <option value="">Equipe A</option>
 {opcoesEquipeA.map((equipe) => (
 <option key={equipe.id} value={equipe.id}>
 {getEquipeNome(equipe)}{getEquipeTag(equipe) ? ` • ${getEquipeTag(equipe)}` : ''}
 </option>
 ))}
 </select>

 <select
 value={equipeB}
 onChange={(e) => {
 const valor = e.target.value
 if (valor && valor === equipeA) {
 toast.error('Selecione uma equipe diferente no lado B')
 return
 }
 setEquipeB(valor)
 }}
 className="h-11 border border-zinc-200 bg-white px-3 text-sm font-semibold outline-none"
 >
 <option value="">Equipe B</option>
 {opcoesEquipeB.map((equipe) => (
 <option key={equipe.id} value={equipe.id}>
 {getEquipeNome(equipe)}{getEquipeTag(equipe) ? ` • ${getEquipeTag(equipe)}` : ''}
 </option>
 ))}
 </select>
 </div>

 <div className="grid gap-3 md:grid-cols-2">
 <PreviewEquipeSelecionada
 titulo="Lado A"
 equipe={equipesDisponiveisDaFase.find((item) => item.id === equipeA) || null}
 />
 <PreviewEquipeSelecionada
 titulo="Lado B"
 equipe={equipesDisponiveisDaFase.find((item) => item.id === equipeB) || null}
 />
 </div>
 </>
 )}

 <div className="grid gap-3 md:grid-cols-4">
 <input
 type="date"
 value={dataJogo}
 onChange={(e) => setDataJogo(e.target.value)}
 className="h-11 border border-zinc-200 bg-white px-3 text-sm font-semibold outline-none"
 />
 <input
 type="time"
 value={horaJogo}
 onChange={(e) => setHoraJogo(e.target.value)}
 className="h-11 border border-zinc-200 bg-white px-3 text-sm font-semibold outline-none"
 />
 <select
 value={melhorDe}
 onChange={(e) => setMelhorDe(e.target.value)}
 className="h-11 border border-zinc-200 bg-white px-3 text-sm font-semibold outline-none"
 >
 <option value="1">MD1</option>
 <option value="3">MD3</option>
 <option value="5">MD5</option>
 <option value="7">MD7</option>
 </select>
 <select
 value={quantidadeQuedas}
 onChange={(e) => setQuantidadeQuedas(e.target.value)}
 className="h-11 border border-zinc-200 bg-white px-3 text-sm font-semibold outline-none"
 >
 <option value="1">1 queda</option>
 <option value="2">2 quedas</option>
 <option value="3">3 quedas</option>
 <option value="4">4 quedas</option>
 <option value="5">5 quedas</option>
 <option value="6">6 quedas</option>
 <option value="7">7 quedas</option>
 </select>
 </div>

 {tipoConfronto === 'pontos_corridos' ? (
 <button
 type="button"
 onClick={gerarPontosCorridos}
 disabled={salvando}
 className="inline-flex h-11 items-center justify-center gap-2 border border-zinc-200 bg-white px-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#142340] hover:bg-[#2563eb] disabled:opacity-60"
 >
 <ListOrdered size={14} />
 Gerar todos contra todos
 </button>
 ) : (
 <div className="grid gap-3 md:grid-cols-2">
 <button
 type="button"
 onClick={criarConfrontoIndividual}
 disabled={salvando}
 className="inline-flex h-11 items-center justify-center gap-2 border border-zinc-200 bg-white px-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#142340] hover:bg-[#2563eb] disabled:opacity-60"
 >
 <Swords size={14} />
 Criar confronto
 </button>

 <button
 type="button"
 onClick={gerarConfrontosAutomaticamente}
 disabled={salvando}
 className="inline-flex h-11 items-center justify-center gap-2 border border-zinc-200 bg-[#f3f3ef] px-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#142340] hover:bg-[#dff3ff] disabled:opacity-60"
 >
 <Shuffle size={14} />
 Gerar automático
 </button>
 </div>
 )}
 </div>
 </div>
 </div>

 <div className={classNamePainel(true)}>
 <div className="mb-4 flex items-center justify-between">
 <div>
 <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#142340]">
 Confrontos por fase
 </div>
 <p className="mt-2 text-sm font-semibold text-zinc-500">
 Mata-mata e dupla eliminação em confrontos diretos. Pontos corridos gerando tabela completa.
 </p>
 </div>

 <button
 type="button"
 onClick={carregar}
 className="inline-flex h-10 items-center gap-2 border border-zinc-200 bg-[#f3f3ef] px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#142340] hover:bg-[#eceee5]"
 >
 <RefreshCcw size={14} />
 Atualizar
 </button>
 </div>

 {loading ? (
 <div className="border border-dashed border-zinc-200 bg-[#f8f8f5] px-6 py-10 text-center text-sm font-semibold text-zinc-500">
 Carregando confrontos...
 </div>
 ) : confrontosPorFase.length === 0 ? (
 <div className="border border-dashed border-zinc-200 bg-[#f8f8f5] px-6 py-10 text-center text-sm font-semibold text-zinc-500">
 Nenhuma fase criada ainda.
 </div>
 ) : (
 <div className="space-y-5">
 {confrontosPorFase.map(({ fase, jogos }) => {
 const IconeFase = iconeTipo(fase.tipo_fase)

 return (
 <div key={fase.id} className="border border-zinc-200 bg-[#f8f8f5]">
 <div className="border-b border-zinc-200 bg-[#eceee5] px-4 py-3">
 <div className="flex flex-wrap items-center gap-3">
 <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.08em] text-[#142340]">
 <IconeFase size={15} />
 {fase.nome || 'Fase'}
 </div>
 <span className={`inline-flex items-center border border-zinc-200 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#142340] ${getTipoBadgeClass(fase.tipo_fase)}`}>
 {getTipoLabel(fase.tipo_fase)}
 </span>
 </div>
 </div>

 <div className="p-4">
 {jogos.length === 0 ? (
 <div className="border border-dashed border-zinc-200 bg-white px-5 py-6 text-center text-sm font-semibold text-zinc-500">
 Nenhum confronto criado nessa fase.
 </div>
 ) : (
 <div className="space-y-3">
 {jogos.map((jogo: any) => {
 const equipe1 = jogo.equipes?.[0] || null
 const equipe2 = jogo.equipes?.[1] || null
 const melhorDeTexto =
 jogo.quantidade_partidas ||
 jogo.configuracao?.melhor_de ||
 (() => {
 try {
 const obs = jogo.observacoes ? JSON.parse(jogo.observacoes) : null
 return obs?.melhor_de || null
 } catch {
 return null
 }
 })()

 const qtdQuedas = Array.isArray(jogo.quedas)
 ? jogo.quedas.length
 : jogo.configuracao?.quedas || 1

 const tipoJogo =
 jogo.configuracao?.tipo ||
 (() => {
 try {
 const obs = jogo.observacoes ? JSON.parse(jogo.observacoes) : null
 return obs?.tipo || fase.tipo_fase
 } catch {
 return fase.tipo_fase
 }
 })()

 return (
 <div key={jogo.id} className="border border-zinc-200 bg-white p-4">
 <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
 <div>
 <div className="flex flex-wrap items-center gap-2">
 <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
 {jogo.nome_bloco || 'Confronto'}
 </div>
 <span className={`inline-flex items-center border border-zinc-200 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#142340] ${getTipoBadgeClass(tipoJogo)}`}>
 {getTipoLabel(tipoJogo)}
 </span>
 </div>

 <div className="mt-1 text-lg font-semibold uppercase text-[#142340]">
 {jogo.nome || 'Sem nome'}
 </div>

 <div className="mt-2 text-sm font-semibold text-zinc-500">
 {formatarHorario(jogo)}
 {melhorDeTexto ? ` • MD${melhorDeTexto}` : ''}
 {qtdQuedas ? ` • ${qtdQuedas} queda(s)` : ''}
 </div>
 </div>

 <div className="grid min-w-[320px] gap-3 md:grid-cols-[1fr,auto,1fr] md:items-center">
 {[equipe1, equipe2].map((equipe, idx) => (
 <div
 key={idx}
 className="flex items-center gap-3 border border-zinc-200 bg-[#f8f8f5] px-3 py-3"
 >
 <div className="flex h-12 w-12 items-center justify-center overflow-hidden border border-zinc-200 bg-white">
 {getEquipeLogo(equipe) ? (
 <img
 src={getEquipeLogo(equipe) as string}
 alt={getEquipeNome(equipe)}
 className="h-full w-full object-cover"
 />
 ) : (
 <span className="text-lg font-semibold text-zinc-500">
 {getEquipeNome(equipe).charAt(0).toUpperCase()}
 </span>
 )}
 </div>
 <div className="min-w-0">
 <div className="truncate text-sm font-semibold uppercase text-[#142340]">
 {getEquipeNome(equipe)}
 </div>
 <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
 {getEquipeTag(equipe) || 'Sem tag'}
 </div>
 </div>
 </div>
 ))}

 <div className="px-2 text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
 VS
 </div>
 </div>

 <button
 type="button"
 onClick={() => excluirConfronto(jogo.id)}
 className="inline-flex h-10 items-center justify-center gap-2 border border-zinc-200 bg-white px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#142340] hover:bg-[#ffe5e0]"
 >
 <Trash2 size={14} />
 Excluir
 </button>
 </div>
 </div>
 )
 })}
 </div>
 )}
 </div>
 </div>
 )
 })}
 </div>
 )}
 </div>
 </div>
 </div>
 )
}
