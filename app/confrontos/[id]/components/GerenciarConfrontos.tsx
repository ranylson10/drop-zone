'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, RefreshCcw, Swords, Trash2, GitBranch, Trophy, ListOrdered, Shuffle, CalendarDays, Clock3, Pencil } from 'lucide-react'
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


function formatarDataCurta(jogo?: JogoItem | null) {
 if (!jogo) return '-'
 if (jogo.data_jogo) return jogo.data_jogo.split('-').reverse().join('/')
 if (jogo.data_hora) {
  try { return new Date(jogo.data_hora).toLocaleDateString('pt-BR') } catch { return '-' }
 }
 if (jogo.data_inicio) {
  try { return new Date(jogo.data_inicio).toLocaleDateString('pt-BR') } catch { return '-' }
 }
 return '-'
}

function formatarHoraCurta(jogo?: JogoItem | null) {
 if (!jogo) return '-'
 if (jogo.hora_jogo) return String(jogo.hora_jogo).slice(0, 5)
 if (jogo.data_hora) {
  try { return new Date(jogo.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) } catch { return '-' }
 }
 if (jogo.data_inicio) {
  try { return new Date(jogo.data_inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) } catch { return '-' }
 }
 return '-'
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
 const [quedas, setQuedas] = useState<any[]>([])

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
 const [showCriarConfronto, setShowCriarConfronto] = useState(false)

 const carregar = useCallback(async () => {
  if (!campeonatoId) return
  setLoading(true)
  try {
   const [fasesRes, fasesV2Res, equipesRes, jogosRes] = await Promise.all([
    supabase.from('campeonato_fases').select('id, nome, ordem').eq('campeonato_id', campeonatoId).order('ordem', { ascending: true }),
    supabase.from('campeonato_fases_v2').select('id, nome, ordem, tipo_fase, status').eq('campeonato_id', campeonatoId).order('ordem', { ascending: true }),
    supabase.from('campeonato_equipes').select(`id, campeonato_id, equipe_id, grupo_id, seed, status, observacoes, created_at, updated_at, equipe_avulsa_id, tipo_origem, fase_id, equipes ( nome, tag, logo_url ), equipe_avulsa:equipes_avulsas_campeonato ( nome, tag, logo_url )`).eq('campeonato_id', campeonatoId).order('seed', { ascending: true }).order('created_at', { ascending: true }),
    supabase.from('jogos').select('id, fase_id, grupo_id, nome, numero, data_inicio, data_fim, observacoes, created_at, nome_bloco, data_jogo, hora_jogo, duracao_estimada_min, quantidade_partidas, quedas, bloqueia_alteracao_equipe_ate, bloqueia_escalacao_ate, agenda_publicada, ordem, rodada, numero_queda, mapa, data_hora, configuracao').eq('campeonato_id', campeonatoId).order('data_jogo', { ascending: true, nullsFirst: false }).order('hora_jogo', { ascending: true, nullsFirst: false }).order('ordem', { ascending: true, nullsFirst: false }).order('created_at', { ascending: true }),
   ])
   if (fasesRes.error) throw fasesRes.error
   if (fasesV2Res.error) throw fasesV2Res.error
   if (equipesRes.error) throw equipesRes.error
   if (jogosRes.error) throw jogosRes.error

   const fasesData = (fasesRes.data || []) as FaseBase[]
   const fasesV2Data = (fasesV2Res.data || []) as FaseV2[]
   const fasesMescladas: Fase[] = fasesData.map((fase) => {
    const v2 = fasesV2Data.find((item) => item.nome === fase.nome && item.ordem === fase.ordem)
    return { id: fase.id, nome: fase.nome, ordem: fase.ordem, tipo_fase: v2?.tipo_fase || 'mata_mata', status: v2?.status || null }
   })
   const jogosData = (jogosRes.data || []) as JogoItem[]
   setFases(fasesMescladas)
   setEquipes((equipesRes.data || []) as EquipeItem[])
   setJogos(jogosData)
   if ((!faseSelecionada || !fasesMescladas.some((f) => f.id === faseSelecionada)) && fasesMescladas[0]?.id) {
    setFaseSelecionada(fasesMescladas[0].id)
    setTipoConfronto(fasesMescladas[0].tipo_fase || 'mata_mata')
   }
   if (jogosData.length > 0) {
    const jogoIds = jogosData.map((jogo) => jogo.id)
    const [jeRes, qRes] = await Promise.all([
     supabase.from('jogo_equipes').select('id, jogo_id, campeonato_id, fase_id, grupo_id, campeonato_equipe_id, origem_slot_id, created_at').in('jogo_id', jogoIds).order('created_at', { ascending: true }),
     supabase.from('confronto_quedas').select('jogo_id, numero_queda, rounds_a, rounds_b, abates_a, abates_b, vencedor_equipe_id').in('jogo_id', jogoIds).order('numero_queda', { ascending: true }),
    ])
    if (jeRes.error) throw jeRes.error
    if (qRes.error) throw qRes.error
    setJogoEquipes((jeRes.data || []) as JogoEquipeItem[])
    setQuedas(qRes.data || [])
   } else {
    setJogoEquipes([])
    setQuedas([])
   }
  } catch (error: any) {
   console.error('Erro detalhado ao carregar confrontos:', error)
   toast.error(getErrorMessage(error, 'Erro ao carregar confrontos'))
  } finally {
   setLoading(false)
  }
 }, [campeonatoId, faseSelecionada])

 useEffect(() => { carregar() }, [carregar])
 useEffect(() => {
  const fase = fases.find((item) => item.id === faseSelecionada)
  if (fase?.tipo_fase) setTipoConfronto(fase.tipo_fase)
 }, [faseSelecionada, fases])

 const mapaEquipes = useMemo(() => {
  const map = new Map<string, EquipeItem>()
  for (const equipe of equipes) map.set(equipe.id, equipe)
  return map
 }, [equipes])

 const equipesDisponiveisDaFase = useMemo(() => obterEquipesDisponiveisDaFase(equipes, faseSelecionada, tipoConfronto), [equipes, faseSelecionada, tipoConfronto])
 const equipesJaUsadasNaFase = useMemo(() => {
  if (tipoConfronto === 'pontos_corridos' || !faseSelecionada) return new Set<string>()
  const ids = new Set<string>()
  const jogoIds = new Set(jogos.filter((jogo) => (jogo.fase_id || '') === faseSelecionada).map((jogo) => jogo.id))
  for (const item of jogoEquipes) if (jogoIds.has(item.jogo_id)) ids.add(item.campeonato_equipe_id)
  return ids
 }, [tipoConfronto, faseSelecionada, jogos, jogoEquipes])
 const opcoesEquipeA = useMemo(() => tipoConfronto === 'pontos_corridos' ? equipesDisponiveisDaFase : equipesDisponiveisDaFase.filter((equipe) => equipe.id === equipeA || !equipesJaUsadasNaFase.has(equipe.id)), [tipoConfronto, equipesDisponiveisDaFase, equipesJaUsadasNaFase, equipeA])
 const opcoesEquipeB = useMemo(() => tipoConfronto === 'pontos_corridos' ? equipesDisponiveisDaFase : equipesDisponiveisDaFase.filter((equipe) => equipe.id === equipeB || (equipe.id !== equipeA && !equipesJaUsadasNaFase.has(equipe.id))), [tipoConfronto, equipesDisponiveisDaFase, equipesJaUsadasNaFase, equipeA, equipeB])

 const confrontosPorFase = useMemo(() => fases.map((fase) => ({
  fase,
  jogos: jogos.filter((jogo) => (jogo.fase_id || '') === fase.id).map((jogo) => ({
   ...jogo,
   equipes: jogoEquipes.filter((item) => item.jogo_id === jogo.id).map((item) => mapaEquipes.get(item.campeonato_equipe_id)).filter(Boolean) as EquipeItem[],
   quedasResultado: quedas.filter((queda) => queda.jogo_id === jogo.id),
  })),
 })), [fases, jogos, jogoEquipes, mapaEquipes, quedas])

 function getResumoJogo(jogo: any) {
  const resultados = Array.isArray(jogo.quedasResultado) ? jogo.quedasResultado : []
  const md = Number(jogo.quantidade_partidas || jogo.configuracao?.melhor_de || 1)
  let vitoriasA = 0, vitoriasB = 0, roundsA = 0, roundsB = 0, abatesA = 0, abatesB = 0
  for (const queda of resultados) {
   const ra = Number(queda.rounds_a || 0)
   const rb = Number(queda.rounds_b || 0)
   roundsA += ra; roundsB += rb
   abatesA += Number(queda.abates_a || 0); abatesB += Number(queda.abates_b || 0)
   if (ra > rb) vitoriasA += 1
   if (rb > ra) vitoriasB += 1
  }
  const status = resultados.length === 0 ? 'Agendado' : resultados.length < md ? 'Em andamento' : 'Finalizado'
  return { md, status, vitoriasA, vitoriasB, roundsA, roundsB, abatesA, abatesB }
 }

 async function criarFase() {
  const nome = novaFase.trim()
  if (!nome) return toast.error('Digite o nome da fase')
  setSalvando(true)
  try {
   const proximaOrdem = (fases[fases.length - 1]?.ordem || 0) + 1
   const { data: faseCriada, error } = await supabase.from('campeonato_fases').insert({ campeonato_id: campeonatoId, nome, ordem: proximaOrdem }).select('id').single()
   if (error) throw error
   const { error: errorV2 } = await supabase.from('campeonato_fases_v2').insert({ campeonato_id: campeonatoId, nome, ordem: proximaOrdem, tipo_fase: novoTipoFase, status: 'rascunho' })
   if (errorV2) console.error('Erro fase_v2:', errorV2)
   toast.success('Fase criada')
   setNovaFase(''); setNovoTipoFase('mata_mata')
   if (faseCriada?.id) setFaseSelecionada(faseCriada.id)
   await carregar()
  } catch (error: any) { console.error(error); toast.error(getErrorMessage(error, 'Erro ao criar fase')) }
  finally { setSalvando(false) }
 }

 async function inserirJogo(equipeAId: string, equipeBId: string, ordemAtual?: number) {
  const equipeAObj = mapaEquipes.get(equipeAId)
  const equipeBObj = mapaEquipes.get(equipeBId)
  const jogosDaFase = jogos.filter((jogo) => (jogo.fase_id || '') === faseSelecionada)
  const numeroConfronto = ordemAtual || jogosDaFase.length + 1
  const configuracao = { tipo: tipoConfronto, melhor_de: Number(melhorDe || 1), quedas: Number(quantidadeQuedas || 1) }
  const payloadJogo: Record<string, any> = {
   campeonato_id: campeonatoId,
   fase_id: faseSelecionada,
   nome: nomeConfronto.trim() || `${getEquipeNome(equipeAObj)} x ${getEquipeNome(equipeBObj)}`,
   nome_bloco: tipoConfronto === 'pontos_corridos' ? `RODADA ${String(numeroConfronto).padStart(2, '0')}` : `CONFRONTO ${String(numeroConfronto).padStart(2, '0')}`,
   quantidade_partidas: Number(melhorDe || 1),
   quedas: criarPayloadQuedas(Number(melhorDe || 1)),
   configuracao,
   observacoes: JSON.stringify(configuracao),
   ordem: numeroConfronto,
   rodada: numeroConfronto,
  }
  if (dataJogo) payloadJogo.data_jogo = dataJogo
  if (horaJogo) payloadJogo.hora_jogo = horaJogo
  const { data: jogoCriado, error: jogoError } = await supabase.from('jogos').insert(payloadJogo).select('id, fase_id, grupo_id').single()
  if (jogoError) throw jogoError
  if (!jogoCriado?.id) throw new Error('Não foi possível criar o confronto')
  const { error: equipesError } = await supabase.from('jogo_equipes').insert([
   { jogo_id: jogoCriado.id, campeonato_id: campeonatoId, fase_id: jogoCriado.fase_id || faseSelecionada, grupo_id: jogoCriado.grupo_id || null, campeonato_equipe_id: equipeAId },
   { jogo_id: jogoCriado.id, campeonato_id: campeonatoId, fase_id: jogoCriado.fase_id || faseSelecionada, grupo_id: jogoCriado.grupo_id || null, campeonato_equipe_id: equipeBId },
  ])
  if (equipesError) throw equipesError
 }

 async function criarConfrontoIndividual() {
  if (!faseSelecionada) return toast.error('Selecione uma fase')
  if (!equipeA || !equipeB) return toast.error('Selecione as 2 equipes')
  if (equipeA === equipeB) return toast.error('As equipes precisam ser diferentes')
  if (tipoConfronto !== 'pontos_corridos' && (equipesJaUsadasNaFase.has(equipeA) || equipesJaUsadasNaFase.has(equipeB))) return toast.error('Uma das equipes já foi usada em outro confronto dessa fase')
  setSalvando(true)
  try {
   await inserirJogo(equipeA, equipeB)
   toast.success('Confronto criado')
   setNomeConfronto(''); setEquipeA(''); setEquipeB(''); setDataJogo(''); setHoraJogo('19:00'); setMelhorDe('1'); setQuantidadeQuedas('1')
   await carregar()
  } catch (error: any) { console.error(error); toast.error(getErrorMessage(error, 'Erro ao criar confronto')) }
  finally { setSalvando(false) }
 }

 async function gerarPontosCorridos() {
  if (!faseSelecionada) return toast.error('Selecione uma fase')
  if (equipes.length < 2) return toast.error('É preciso ter pelo menos 2 equipes')
  if (!window.confirm('Isso vai gerar todos os confrontos de pontos corridos. Deseja continuar?')) return
  setSalvando(true)
  try {
   let ordemAtual = jogos.filter((jogo) => (jogo.fase_id || '') === faseSelecionada).length + 1
   for (let i = 0; i < equipes.length; i++) {
    for (let j = i + 1; j < equipes.length; j++) {
     await inserirJogo(equipes[i].id, equipes[j].id, ordemAtual)
     ordemAtual += 1
    }
   }
   toast.success('Tabela de pontos corridos gerada')
   await carregar()
  } catch (error: any) { console.error(error); toast.error(getErrorMessage(error, 'Erro ao gerar pontos corridos')) }
  finally { setSalvando(false) }
 }

 async function gerarConfrontosAutomaticamente() {
  if (!faseSelecionada) return toast.error('Selecione uma fase')
  if (tipoConfronto === 'pontos_corridos') return gerarPontosCorridos()
  const disponiveis = obterEquipesDisponiveisDaFase(equipes, faseSelecionada, tipoConfronto).filter((e) => !equipesJaUsadasNaFase.has(e.id))
  if (disponiveis.length < 2) return toast.error('Não há equipes suficientes disponíveis nessa fase')
  if (!window.confirm('Isso vai gerar confrontos automáticos aleatórios. Deseja continuar?')) return
  setSalvando(true)
  try {
   const embaralhadas = embaralharLista(disponiveis)
   let ordemAtual = jogos.filter((jogo) => (jogo.fase_id || '') === faseSelecionada).length + 1
   for (let i = 0; i < embaralhadas.length; i += 2) {
    if (!embaralhadas[i] || !embaralhadas[i + 1]) continue
    await inserirJogo(embaralhadas[i].id, embaralhadas[i + 1].id, ordemAtual)
    ordemAtual += 1
   }
   toast.success('Confrontos automáticos gerados')
   await carregar()
  } catch (error: any) { console.error(error); toast.error(getErrorMessage(error, 'Erro ao gerar confrontos automáticos')) }
  finally { setSalvando(false) }
 }

 async function excluirConfronto(jogoId: string) {
  if (!window.confirm('Deseja excluir esse confronto?')) return
  try {
   const { error: relError } = await supabase.from('jogo_equipes').delete().eq('jogo_id', jogoId)
   if (relError) throw relError
   await supabase.from('confronto_quedas_jogadores').delete().eq('jogo_id', jogoId)
   await supabase.from('confronto_quedas').delete().eq('jogo_id', jogoId)
   const { error: jogoError } = await supabase.from('jogos').delete().eq('id', jogoId)
   if (jogoError) throw jogoError
   toast.success('Confronto excluído')
   await carregar()
  } catch (error: any) { console.error(error); toast.error(getErrorMessage(error, 'Erro ao excluir confronto')) }
 }

 return (
  <div className="space-y-5">
   <div className={classNamePainel(true)}>
    <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
     <div>
      <div className="text-[12px] font-black uppercase tracking-[0.14em] text-[#142340]">Lista de confrontos</div>
      <p className="mt-2 text-sm font-semibold text-zinc-500">Confrontos em linha única: equipe A x equipe B, data, horário, MD e quedas.</p>
     </div>
     <button type="button" onClick={carregar} className="inline-flex h-11 items-center justify-center gap-2 border border-zinc-200 bg-white px-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#142340] hover:bg-[#f3f3ef]"><RefreshCcw size={14} /> Atualizar</button>
    </div>

    {loading ? (
     <div className="border border-dashed border-zinc-200 bg-white p-8 text-center text-sm font-semibold text-zinc-500">Carregando confrontos...</div>
    ) : confrontosPorFase.every((grupo) => grupo.jogos.length === 0) ? (
     <div className="border border-dashed border-zinc-200 bg-white p-8 text-center text-sm font-semibold text-zinc-500">Nenhum confronto criado ainda.</div>
    ) : (
     <div className="space-y-5">
      {confrontosPorFase.map(({ fase, jogos }) => {
       if (jogos.length === 0) return null
       const IconeFase = iconeTipo(fase.tipo_fase)
       return (
        <div key={fase.id} className="overflow-hidden border border-zinc-200 bg-white">
         <div className="flex flex-wrap items-center gap-3 border-b border-zinc-200 bg-[#eceee5] px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.08em] text-[#142340]"><IconeFase size={15} />{fase.nome || 'Fase'}</div>
          <span className={`inline-flex items-center px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[#142340] ${getTipoBadgeClass(fase.tipo_fase)}`}>{getTipoLabel(fase.tipo_fase)}</span>
         </div>
         <div className="space-y-2 p-3">
          {jogos.map((jogo: any, index: number) => {
           const equipe1 = jogo.equipes?.[0] || null
           const equipe2 = jogo.equipes?.[1] || null
           const r = getResumoJogo(jogo)
           const melhorDeTexto = jogo.configuracao?.melhor_de || jogo.quantidade_partidas || melhorDe
           const qtdQuedas = jogo.configuracao?.quedas || jogo.configuracao?.melhor_de || jogo.quantidade_partidas || melhorDe
           const resultadoFinal = r.status === 'Finalizado' ? `${r.vitoriasA} x ${r.vitoriasB}` : 'X'

           return (
            <div key={jogo.id} className="grid items-center gap-3 rounded-sm border border-[#101827] bg-[#121b2a] px-4 py-3 text-white lg:grid-cols-[42px_minmax(280px,1fr)_220px_70px_90px_auto]">
             <div className="text-center text-[12px] font-black text-zinc-300">{String(jogo.ordem || jogo.numero || index + 1).padStart(2, '0')}</div>

             <div className="flex min-w-0 items-center justify-center gap-4">
              <div className="flex min-w-0 flex-1 items-center justify-end gap-3">
               <div className="min-w-0 text-right"><div className="truncate text-sm font-black uppercase">{getEquipeNome(equipe1)}</div><div className="truncate text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-400">{getEquipeTag(equipe1) || 'Sem tag'}</div></div>
               <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white">{getEquipeLogo(equipe1) ? <img src={getEquipeLogo(equipe1) as string} alt={getEquipeNome(equipe1)} className="h-full w-full object-cover" /> : <span className="text-base font-black text-[#142340]">{getEquipeNome(equipe1).charAt(0).toUpperCase()}</span>}</div>
              </div>

              <div className="shrink-0 rounded bg-black/25 px-4 py-2 text-center text-xl font-black leading-none">{resultadoFinal}</div>

              <div className="flex min-w-0 flex-1 items-center justify-start gap-3">
               <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white">{getEquipeLogo(equipe2) ? <img src={getEquipeLogo(equipe2) as string} alt={getEquipeNome(equipe2)} className="h-full w-full object-cover" /> : <span className="text-base font-black text-[#142340]">{getEquipeNome(equipe2).charAt(0).toUpperCase()}</span>}</div>
               <div className="min-w-0"><div className="truncate text-sm font-black uppercase">{getEquipeNome(equipe2)}</div><div className="truncate text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-400">{getEquipeTag(equipe2) || 'Sem tag'}</div></div>
              </div>
             </div>

             <div className="flex flex-wrap items-center justify-center gap-4 text-[12px] font-semibold text-zinc-200 lg:justify-start"><span className="inline-flex items-center gap-2"><CalendarDays size={15} />{formatarDataCurta(jogo)}</span><span className="inline-flex items-center gap-2"><Clock3 size={15} />{formatarHoraCurta(jogo)}</span></div>
             <div className="text-center text-[12px] font-black uppercase text-white">MD{melhorDeTexto}</div>
             <div className="text-center text-[12px] font-semibold text-zinc-200">{qtdQuedas} queda{Number(qtdQuedas) === 1 ? '' : 's'}</div>
             <div className="flex items-center justify-end gap-2"><button type="button" title="Editar confronto" className="inline-flex h-9 w-9 items-center justify-center border border-white/10 bg-white/5 text-white hover:bg-white/10"><Pencil size={15} /></button><button type="button" onClick={() => excluirConfronto(jogo.id)} title="Excluir confronto" className="inline-flex h-9 w-9 items-center justify-center border border-red-400/30 bg-red-500/10 text-red-300 hover:bg-red-500/20"><Trash2 size={15} /></button></div>
            </div>
           )
          })}
         </div>
        </div>
       )
      })}
     </div>
    )}
   </div>

   <div className="grid gap-5 xl:grid-cols-[430px,1fr]">
    <div className={classNamePainel()}>
     <div className="mb-4"><div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#142340]">Criar fase</div><p className="mt-2 text-sm font-semibold text-zinc-500">Defina a fase e o formato.</p></div>
     <div className="grid gap-3"><input value={novaFase} onChange={(e) => setNovaFase(e.target.value)} placeholder="Ex: Quartas de final" className="h-11 border border-zinc-200 bg-white px-3 text-sm font-semibold outline-none" /><select value={novoTipoFase} onChange={(e) => setNovoTipoFase(e.target.value)} className="h-11 border border-zinc-200 bg-white px-3 text-sm font-semibold outline-none"><option value="mata_mata">Mata-mata</option><option value="dupla_eliminacao">Dupla eliminação</option><option value="pontos_corridos">Pontos corridos</option></select><button type="button" onClick={criarFase} disabled={salvando} className="inline-flex h-11 items-center justify-center gap-2 border border-zinc-200 bg-white px-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#142340] hover:bg-[#2563eb] disabled:opacity-60"><Plus size={14} /> Criar fase</button></div>
    </div>

    <div className={classNamePainel()}>
     <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div>
       <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#142340]">Confrontos</div>
       <p className="mt-2 text-sm font-semibold text-zinc-500">Em pontos corridos, gere todos os jogos de uma vez. Para mata-mata, adicione confrontos manualmente.</p>
      </div>
      <button type="button" onClick={() => setShowCriarConfronto((valor) => !valor)} className="inline-flex h-11 items-center justify-center gap-2 border border-zinc-200 bg-white px-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#142340] hover:bg-[#f3f3ef]">
       <Plus size={14} /> {showCriarConfronto ? 'Fechar' : 'Adicionar confronto'}
      </button>
     </div>

     <div className="grid gap-3 md:grid-cols-2">
      <select value={faseSelecionada} onChange={(e) => setFaseSelecionada(e.target.value)} className="h-11 border border-zinc-200 bg-white px-3 text-sm font-semibold outline-none"><option value="">Selecione a fase</option>{fases.map((fase) => <option key={fase.id} value={fase.id}>{fase.nome || 'Fase'} • {getTipoLabel(fase.tipo_fase)}</option>)}</select>
      <select value={tipoConfronto} onChange={(e) => setTipoConfronto(e.target.value)} className="h-11 border border-zinc-200 bg-white px-3 text-sm font-semibold outline-none"><option value="mata_mata">Mata-mata</option><option value="dupla_eliminacao">Dupla eliminação</option><option value="pontos_corridos">Pontos corridos</option></select>
     </div>

     {tipoConfronto === 'pontos_corridos' ? (
      <button type="button" onClick={gerarPontosCorridos} disabled={salvando} className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 border border-red-600 bg-red-600 px-4 text-[11px] font-black uppercase tracking-[0.16em] text-white hover:brightness-95 disabled:opacity-60"><ListOrdered size={14} /> Gerar todos os confrontos</button>
     ) : null}

     {showCriarConfronto ? (
      <div className="mt-4 border-t border-zinc-200 pt-4">
       <input value={nomeConfronto} onChange={(e) => setNomeConfronto(e.target.value)} placeholder="Nome do confronto (opcional)" className="h-11 w-full border border-zinc-200 bg-white px-3 text-sm font-semibold outline-none" />
       <div className="mt-3 grid gap-3 md:grid-cols-[1fr,34px,1fr] md:items-center"><select value={equipeA} onChange={(e) => { setEquipeA(e.target.value); if (e.target.value === equipeB) setEquipeB('') }} className="h-12 border border-zinc-200 bg-white px-3 text-sm font-semibold outline-none"><option value="">Selecione a equipe 1</option>{opcoesEquipeA.map((equipe) => <option key={equipe.id} value={equipe.id}>{getEquipeNome(equipe)}{getEquipeTag(equipe) ? ` • ${getEquipeTag(equipe)}` : ''}</option>)}</select><div className="hidden text-center text-2xl font-black text-[#142340] md:block">X</div><select value={equipeB} onChange={(e) => setEquipeB(e.target.value)} className="h-12 border border-zinc-200 bg-white px-3 text-sm font-semibold outline-none"><option value="">Selecione a equipe 2</option>{opcoesEquipeB.map((equipe) => <option key={equipe.id} value={equipe.id}>{getEquipeNome(equipe)}{getEquipeTag(equipe) ? ` • ${getEquipeTag(equipe)}` : ''}</option>)}</select></div>
       <div className="mt-3 grid gap-3 md:grid-cols-3"><input type="date" value={dataJogo} onChange={(e) => setDataJogo(e.target.value)} className="h-11 border border-zinc-200 bg-white px-3 text-sm font-semibold outline-none" /><input type="time" value={horaJogo} onChange={(e) => setHoraJogo(e.target.value)} className="h-11 border border-zinc-200 bg-white px-3 text-sm font-semibold outline-none" /><select value={melhorDe} onChange={(e) => setMelhorDe(e.target.value)} className="h-11 border border-zinc-200 bg-white px-3 text-sm font-semibold outline-none"><option value="1">MD1</option><option value="3">MD3</option><option value="5">MD5</option><option value="7">MD7</option></select></div>
       <div className="mt-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">A quantidade de quedas será definida automaticamente pelo MD selecionado.</div>
       <div className="mt-4 grid gap-3 md:grid-cols-2"><button type="button" onClick={criarConfrontoIndividual} disabled={salvando} className="inline-flex h-12 items-center justify-center gap-2 border border-red-600 bg-red-600 px-4 text-[11px] font-black uppercase tracking-[0.16em] text-white hover:brightness-95 disabled:opacity-60"><Swords size={14} /> Criar confronto</button><button type="button" onClick={gerarConfrontosAutomaticamente} disabled={salvando} className="inline-flex h-12 items-center justify-center gap-2 border border-zinc-200 bg-white px-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#142340] hover:bg-[#f3f3ef] disabled:opacity-60"><Shuffle size={14} /> Gerar automático</button></div>
      </div>
     ) : null}
    </div>
   </div>
  </div>
 )
}
