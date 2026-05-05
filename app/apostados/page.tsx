'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Formato = '1x1' | '2x2' | '3x3' | '4x4'
type Plataforma = 'mobile' | 'emulador' | 'misto' | 'a_combinar'
type MelhorDe = 1 | 3 | 5

type WalletSaldo = { saldo: number | null; saldo_retido: number | null }

type PerfilJogo = {
 id: string
 user_id: string
 nick: string
 uid_jogo: string
 plataforma: string | null
 equipe_id: string | null
 nome_exibicao?: string | null
 avatar_url?: string | null
 equipe_nome?: string | null
 equipe_logo?: string | null
 filas_jogadas?: number | null
 vitorias?: number | null
 derrotas?: number | null
 abates?: number | null
 mvps?: number | null
 winrate?: number | null
}

type FilaResumo = {
 formato: Formato
 plataforma: Plataforma
 valor: number | null
 valor_label: string
 melhor_de?: MelhorDe | number | null
 filas_aguardando: number
 jogadores_aguardando: number
 primeiro_da_fila?: string | null
}

type MinhaFila = {
 id: string
 responsavel_user_id?: string
 formato: Formato
 plataforma: Plataforma
 valor: number | null
 valor_label: string
 melhor_de?: MelhorDe | number | null
 valor_retido: number | null
 status: string
 confronto_id: string | null
 created_at: string
 lineup_id?: string | null
 lineup_nome?: string | null
 lineup_simbolo?: string | null
}

type FilaDetalhe = {
 id: string
 responsavel_user_id: string
 equipe_id: string | null
 formato: Formato
 plataforma: Plataforma
 valor: number | null
 valor_label: string
 melhor_de?: MelhorDe | number | null
 valor_retido: number | null
 status: string
 confronto_id: string | null
 created_at: string
 lineup_id: string | null
 lineup_nome: string | null
 lineup_simbolo: string | null
 equipe_nome: string | null
 equipe_logo: string | null
 responsavel_nome: string | null
 total_participantes: number
}

type ParticipanteCard = {
 id: string
 fila_id: string
 user_id: string
 perfil_jogo_id: string
 ordem: number
 nick: string | null
 uid_jogo: string | null
 plataforma: string | null
 nome_exibicao: string | null
 avatar_url: string | null
 equipe_nome: string | null
 equipe_logo: string | null
 filas_jogadas: number | null
 vitorias: number | null
 derrotas: number | null
 abates: number | null
 mvps: number | null
 winrate: number | null
}

type LineReal = {
 id: string
 nome: string
 simbolo: string
 formato: Formato | null
 plataforma: Plataforma | null
 equipe_id: string | null
 participantes: string[]
}

const VALORES = [2, 5, 7, 10, 15, 20, 30, 50]
const SIMBOLOS_LINEUP = ['🔥','⚡','💀','🎯','🛡️','👑','🐺','🐉','🦂','🦅','🦁','💎','🚀','🎮','🧠','⚔️','🏆','☠️','🌪️','🔱']
const FORMATOS: Formato[] = ['1x1', '2x2', '3x3', '4x4']
const MELHORES_DE: MelhorDe[] = [1, 3, 5]
const PLATAFORMAS: Array<{ id: Plataforma; label: string; icon: string }> = [
 { id: 'mobile', label: 'Mobile', icon: '▣' },
 { id: 'emulador', label: 'Emulador', icon: '▤' },
 { id: 'misto', label: 'Misto', icon: '⇄' },
 { id: 'a_combinar', label: 'A combinar', icon: '⚙' },
]

function moeda(valor: number) {
 return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function quantidadePorFormato(formato: Formato) {
 if (formato === '1x1') return 1
 if (formato === '2x2') return 2
 if (formato === '3x3') return 3
 return 4
}

function plataformaLabel(id: Plataforma) {
 return PLATAFORMAS.find((p) => p.id === id)?.label || id
}

function compactNome(nome?: string | null) {
 return nome?.trim() || 'SEM NOME'
}


function formatarTempoFila(createdAt?: string | null, agoraMs = Date.now()) {
 if (!createdAt) return '00:00'
 const inicio = new Date(createdAt).getTime()
 if (!Number.isFinite(inicio)) return '00:00'
 const total = Math.max(0, Math.floor((agoraMs - inicio) / 1000))
 const horas = Math.floor(total / 3600)
 const minutos = Math.floor((total % 3600) / 60)
 const segundos = total % 60
 const mm = String(minutos).padStart(2, '0')
 const ss = String(segundos).padStart(2, '0')
 if (horas > 0) return `${horas}:${mm}:${ss}`
 return `${mm}:${ss}`
}

export default function ApostadosPage() {
 const router = useRouter()

 const [loading, setLoading] = useState(true)
 const [userId, setUserId] = useState<string | null>(null)
 const [saldo, setSaldo] = useState<WalletSaldo | null>(null)
 const [resumos, setResumos] = useState<FilaResumo[]>([])
 const [filasDetalhes, setFilasDetalhes] = useState<FilaDetalhe[]>([])
 const [minhasFilas, setMinhasFilas] = useState<MinhaFila[]>([])

 const [formatoAtivo, setFormatoAtivo] = useState<Formato>('2x2')
 const [plataformaAtiva, setPlataformaAtiva] = useState<Plataforma>('mobile')
 const [melhorDeAtivo, setMelhorDeAtivo] = useState<MelhorDe>(1)
 const [valorSelecionado, setValorSelecionado] = useState<number | null>(5)
 const [valorLabelSelecionado, setValorLabelSelecionado] = useState('R$ 5,00')

 const [modalAberto, setModalAberto] = useState(false)
 const [perfisDisponiveis, setPerfisDisponiveis] = useState<PerfilJogo[]>([])
 const [selecionados, setSelecionados] = useState<string[]>([])
 const [buscaPerfil, setBuscaPerfil] = useState('')
 const [lineupPadrao, setLineupPadrao] = useState<LineReal | null>(null)
 const [lineIdAtual, setLineIdAtual] = useState<string | null>(null)
 const [lineupNome, setLineupNome] = useState('')
 const [lineupSimbolo, setLineupSimbolo] = useState('🔥')
 const [carregandoPerfis, setCarregandoPerfis] = useState(false)
 const [entrando, setEntrando] = useState(false)
 const [filaAbertaId, setFilaAbertaId] = useState<string | null>(null)
 const [participantesFila, setParticipantesFila] = useState<ParticipanteCard[]>([])
 const [carregandoFila, setCarregandoFila] = useState(false)
 const [cancelandoFila, setCancelandoFila] = useState(false)
 const [agora, setAgora] = useState(() => Date.now())

 useEffect(() => {
 const timer = window.setInterval(() => setAgora(Date.now()), 1000)
 return () => window.clearInterval(timer)
 }, [])

 useEffect(() => {
 inicializar()

 const channel = supabase
 .channel('apostados-matchmaking-v2')
 .on('postgres_changes', { event: '*', schema: 'public', table: 'apostados_matchmaking_filas' }, () => {
 carregarResumos()
 carregarFilasDetalhes()
 if (userId) carregarMinhaFila(userId)
 })
 .on('postgres_changes', { event: '*', schema: 'public', table: 'apostados_matchmaking_participantes' }, () => {
 carregarFilasDetalhes()
 if (filaAbertaId) carregarParticipantesFila(filaAbertaId)
 })
 .subscribe()

 return () => {
 supabase.removeChannel(channel)
 }
 }, [userId, filaAbertaId])

 useEffect(() => {
 if (!userId) return
 const refresh = window.setInterval(() => {
 carregarSaldo(userId)
 carregarResumos()
 carregarFilasDetalhes()
 carregarMinhaFila(userId)
 if (filaAbertaId) carregarParticipantesFila(filaAbertaId)
 }, 15000)
 return () => window.clearInterval(refresh)
 }, [userId, filaAbertaId])

 useEffect(() => {
 const atual = filasDaSelecao[0]
 if (atual && !filaAbertaId) {
 setFilaAbertaId(atual.id)
 carregarParticipantesFila(atual.id)
 }
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [filasDetalhes, formatoAtivo, plataformaAtiva, melhorDeAtivo, valorSelecionado])

 async function inicializar() {
 setLoading(true)
 const { data: { user } } = await supabase.auth.getUser()
 const uid = user?.id ?? null
 setUserId(uid)

 await Promise.all([
 carregarResumos(),
 carregarFilasDetalhes(),
 uid ? carregarSaldo(uid) : Promise.resolve(),
 uid ? carregarMinhaFila(uid) : Promise.resolve(),
 ])

 setLoading(false)
 }

 async function carregarSaldo(uid: string) {
 const { data, error } = await supabase
 .from('wallet_saldo')
 .select('saldo, saldo_retido')
 .eq('user_id', uid)
 .maybeSingle()

 if (error) {
 console.error('Erro ao carregar saldo:', error)
 return
 }

 setSaldo({ saldo: Number(data?.saldo || 0), saldo_retido: Number(data?.saldo_retido || 0) })
 }

 async function carregarResumos() {
 const { data, error } = await supabase.from('vw_apostados_matchmaking_resumo').select('*')
 if (error) {
 console.error('Erro ao carregar resumo das filas:', error)
 return
 }
 setResumos((data || []) as FilaResumo[])
 }

 async function carregarFilasDetalhes() {
 const { data, error } = await supabase
 .from('vw_apostados_filas_aguardando_detalhes')
 .select('*')
 .order('created_at', { ascending: true })

 if (error) {
 console.error('Erro ao carregar filas detalhadas:', error)
 return
 }

 setFilasDetalhes((data || []) as FilaDetalhe[])
 }

 async function carregarMinhaFila(uid: string) {
 const { data, error } = await supabase
 .from('apostados_matchmaking_filas')
 .select('id, responsavel_user_id, formato, plataforma, valor, valor_label, melhor_de, valor_retido, status, confronto_id, created_at, lineup_id, lineup_nome, lineup_simbolo')
 .eq('responsavel_user_id', uid)
 .in('status', ['aguardando', 'pareado'])
 .order('created_at', { ascending: false })

 if (error) {
 console.error('Erro ao carregar minhas filas:', error)
 return
 }

 const filas = (data || []) as MinhaFila[]
 setMinhasFilas(filas)

 const pareada = filas.find((fila) => fila.status === 'pareado' && fila.confronto_id)
 if (pareada?.confronto_id) {
 router.push(`/apostados/${pareada.confronto_id}`)
 }

 return filas
 }

 async function buscarMinhasFilasAtualizadas(uid: string) {
 const { data, error } = await supabase
 .from('apostados_matchmaking_filas')
 .select('id, responsavel_user_id, formato, plataforma, valor, valor_label, melhor_de, valor_retido, status, confronto_id, created_at, lineup_id, lineup_nome, lineup_simbolo')
 .eq('responsavel_user_id', uid)
 .in('status', ['aguardando', 'pareado'])
 .order('created_at', { ascending: false })

 if (error) {
 console.error('Erro ao buscar minhas filas atualizadas:', error)
 return minhasFilas
 }

 const filas = (data || []) as MinhaFila[]
 setMinhasFilas(filas)
 return filas
 }

 function mesmaOpcaoFila(fila: MinhaFila | FilaDetalhe, valor: number | null, formato: Formato = formatoAtivo, plataforma: Plataforma = plataformaAtiva, melhorDe: MelhorDe = melhorDeAtivo) {
 return (
 fila.status === 'aguardando' &&
 fila.formato === formato &&
 fila.plataforma === plataforma &&
 Number((fila as any).melhor_de || 1) === Number(melhorDe || 1) &&
 Number(fila.valor || 0) === Number(valor || 0)
 )
 }

 async function sincronizarAposMudancaFila(uid: string) {
 await Promise.all([
 carregarSaldo(uid),
 carregarResumos(),
 carregarFilasDetalhes(),
 buscarMinhasFilasAtualizadas(uid),
 ])
 if (filaAbertaId) await carregarParticipantesFila(filaAbertaId)
 }

 async function carregarParticipantesFila(filaId: string) {
 setCarregandoFila(true)
 const { data, error } = await supabase
 .from('vw_apostados_fila_participantes_cards')
 .select('*')
 .eq('fila_id', filaId)
 .order('ordem', { ascending: true })

 if (error) {
 console.error('Erro ao carregar participantes da fila:', error)
 setCarregandoFila(false)
 return
 }

 setParticipantesFila((data || []) as ParticipanteCard[])
 setCarregandoFila(false)
 }

 const resumoAtual = useMemo(() => {
 return resumos.find((item) => {
 const valorBanco = Number(item.valor || 0)
 const valorSel = Number(valorSelecionado || 0)
 return item.formato === formatoAtivo && item.plataforma === plataformaAtiva && Number((item as any).melhor_de || 1) === Number(melhorDeAtivo) && valorBanco === valorSel
 })
 }, [resumos, formatoAtivo, plataformaAtiva, melhorDeAtivo, valorSelecionado])

 const filasDaSelecao = useMemo(() => {
 const valorSel = Number(valorSelecionado || 0)
 const mapa = new Map<string, FilaDetalhe>()

 filasDetalhes.forEach((fila) => {
 const mesmaFila =
 fila.formato === formatoAtivo &&
 fila.plataforma === plataformaAtiva &&
 Number((fila as any).melhor_de || 1) === Number(melhorDeAtivo) &&
 Number(fila.valor || 0) === valorSel

 if (!mesmaFila || !fila.id) return

 const existente = mapa.get(fila.id)
 if (!existente) {
 mapa.set(fila.id, fila)
 return
 }

 mapa.set(fila.id, {
 ...existente,
 ...fila,
 equipe_nome: existente.equipe_nome || fila.equipe_nome,
 equipe_logo: existente.equipe_logo || fila.equipe_logo,
 responsavel_nome: existente.responsavel_nome || fila.responsavel_nome,
 total_participantes: Math.max(Number(existente.total_participantes || 0), Number(fila.total_participantes || 0)),
 })
 })

 return Array.from(mapa.values()).sort((a, b) => {
 const dataA = new Date(a.created_at || 0).getTime()
 const dataB = new Date(b.created_at || 0).getTime()
 return dataA - dataB
 })
 }, [filasDetalhes, formatoAtivo, plataformaAtiva, melhorDeAtivo, valorSelecionado])

 const saldoDisponivel = Number(saldo?.saldo || 0)
 const saldoRetido = Number(saldo?.saldo_retido || 0)
 const valorAtual = Number(valorSelecionado || 0)
 const taxaEntrada = valorAtual > 0 ? Number((valorAtual * 0.10).toFixed(2)) : 0
 const valorTotalEntrada = valorAtual > 0 ? Number((valorAtual + taxaEntrada).toFixed(2)) : 0
 const qtdLineup = quantidadePorFormato(formatoAtivo)

 const filaAtualDoUsuario = useMemo(() => {
 return minhasFilas.find((fila) => {
 const mesmoValor = Number(fila.valor || 0) === Number(valorSelecionado || 0)
 return fila.status === 'aguardando' && fila.formato === formatoAtivo && fila.plataforma === plataformaAtiva && Number((fila as any).melhor_de || 1) === Number(melhorDeAtivo) && mesmoValor
 }) || null
 }, [minhasFilas, formatoAtivo, plataformaAtiva, melhorDeAtivo, valorSelecionado])

 const filaPareadaDoUsuario = useMemo(() => minhasFilas.find((fila) => fila.status === 'pareado' && fila.confronto_id) || null, [minhasFilas])
 const minhaFilaPrincipal = filaAtualDoUsuario || filaPareadaDoUsuario || minhasFilas.find((fila) => fila.status === 'aguardando') || null
 const totalMinhasFilasAguardando = minhasFilas.filter((fila) => fila.status === 'aguardando').length

 const minhaFilaDaOpcao = (valor: number | null, formato: Formato = formatoAtivo, plataforma: Plataforma = plataformaAtiva) => {
 const porTabela = minhasFilas.find((fila) => mesmaOpcaoFila(fila, valor, formato, plataforma))
 if (porTabela) return porTabela

 const porView = filasDetalhes.find((fila) =>
 fila.responsavel_user_id === userId && mesmaOpcaoFila(fila, valor, formato, plataforma)
 )

 return porView
 ? ({
 id: porView.id,
 responsavel_user_id: porView.responsavel_user_id,
 formato: porView.formato,
 plataforma: porView.plataforma,
 valor: porView.valor,
 valor_label: porView.valor_label,
 valor_retido: porView.valor_retido,
 status: porView.status,
 confronto_id: porView.confronto_id,
 created_at: porView.created_at,
 lineup_id: porView.lineup_id,
 lineup_nome: porView.lineup_nome,
 lineup_simbolo: porView.lineup_simbolo,
 melhor_de: (porView as any).melhor_de || 1,
 } as MinhaFila)
 : null
 }

 const usuarioEstaNaFilaId = (filaId?: string | null) => {
 if (!filaId) return false
 return minhasFilas.some((fila) => fila.status === 'aguardando' && fila.id === filaId) ||
 filasDetalhes.some((fila) => fila.id === filaId && fila.responsavel_user_id === userId && fila.status === 'aguardando')
 }

 async function abrirModalEntrada() {
 if (!userId) {
 alert('Você precisa estar logado para entrar na fila.')
 return
 }

 if (filaPareadaDoUsuario?.confronto_id) {
 router.push(`/apostados/${filaPareadaDoUsuario.confronto_id}`)
 return
 }

 if (filaAtualDoUsuario?.status === 'aguardando') {
 alert('Você já está aguardando nessa mesma fila. Escolha outro valor, formato ou tipo para entrar em outra fila.')
 return
 }

 if (valorAtual > 0 && saldoDisponivel < valorTotalEntrada) {
 alert(`Saldo insuficiente. Essa fila retém ${moeda(valorTotalEntrada)}: ${moeda(valorAtual)} da aposta + ${moeda(taxaEntrada)} de taxa.`)
 return
 }

 setModalAberto(true)
 setBuscaPerfil('')
 setSelecionados([])
 setLineupNome('')
 setLineupSimbolo('🔥')
 setLineIdAtual(null)

 await carregarPerfisDisponiveis()
 await carregarLineupPadrao(userId)
 }

 async function carregarPerfisDisponiveis() {
 setCarregandoPerfis(true)

 const { data: perfisData, error } = await supabase
 .from('perfis_jogo')
 .select('id, user_id, nick, uid_jogo, plataforma, equipe_id')
 .eq('ativo', true)
 .order('nick', { ascending: true })

 if (error) {
 console.error('Erro ao carregar perfis:', error)
 setCarregandoPerfis(false)
 return
 }

 const perfis = (perfisData || []) as PerfilJogo[]
 const userIds = Array.from(new Set(perfis.map((p) => p.user_id).filter(Boolean)))
 const equipeIds = Array.from(new Set(perfis.map((p) => p.equipe_id).filter(Boolean))) as string[]
 const perfilIds = perfis.map((p) => p.id)

 const { data: profilesData } = userIds.length
 ? await supabase.from('perfis').select('id, nome, avatar_url').in('id', userIds)
 : { data: [] as any[] }

 const { data: equipesData } = equipeIds.length
 ? await supabase.from('equipes').select('id, nome, logo_url').in('id', equipeIds)
 : { data: [] as any[] }

 const { data: statsData } = perfilIds.length
 ? await supabase.from('vw_apostados_perfil_stats').select('*').in('perfil_jogo_id', perfilIds)
 : { data: [] as any[] }

 const profileMap = new Map<string, any>()
 ;(profilesData || []).forEach((item: any) => profileMap.set(item.id, item))

 const equipeMap = new Map<string, any>()
 ;(equipesData || []).forEach((item: any) => equipeMap.set(item.id, item))

 const statsMap = new Map<string, any>()
 ;(statsData || []).forEach((item: any) => statsMap.set(item.perfil_jogo_id, item))

 setPerfisDisponiveis(
 perfis.map((p) => {
 const profile = profileMap.get(p.user_id)
 const equipe = p.equipe_id ? equipeMap.get(p.equipe_id) : null
 const stats = statsMap.get(p.id)
 return {
 ...p,
 nome_exibicao: profile?.nome || null,
 avatar_url: profile?.avatar_url || null,
 equipe_nome: equipe?.nome || null,
 equipe_logo: equipe?.logo_url || null,
 filas_jogadas: Number(stats?.filas_jogadas || 0),
 vitorias: Number(stats?.vitorias || 0),
 derrotas: Number(stats?.derrotas || 0),
 abates: Number(stats?.abates || 0),
 mvps: Number(stats?.mvps || 0),
 winrate: Number(stats?.winrate || 0),
 }
 })
 )

 setCarregandoPerfis(false)
 }

 async function carregarLineupPadrao(uid: string) {
 // Agora a line real vem da tabela `lines`, sem depender de equipe oficial.
 const { data: lineData, error } = await supabase
 .from('lines')
 .select('id, nome, simbolo, tipo, plataforma, equipe_id')
 .eq('created_by', uid)
 .eq('ativa', true)
 .order('updated_at', { ascending: false })
 .limit(1)
 .maybeSingle()

 if (error) {
 console.error('Erro ao carregar line:', JSON.stringify(error, null, 2))
 setLineupPadrao(null)
 setLineIdAtual(null)
 return
 }

 if (!lineData?.id) {
 setLineupPadrao(null)
 setLineIdAtual(null)
 return
 }

 const { data: participantesData, error: participantesError } = await supabase
 .from('lines_jogadores')
 .select('perfil_jogo_id, ordem')
 .eq('line_id', lineData.id)
 .order('ordem', { ascending: true })

 if (participantesError) {
 console.error('Erro ao carregar jogadores da line:', JSON.stringify(participantesError, null, 2))
 }

 const participantes = (participantesData || [])
 .map((item: any) => item.perfil_jogo_id)
 .filter(Boolean)

 const lineup = {
 id: lineData.id,
 nome: lineData.nome || '',
 simbolo: lineData.simbolo || '🔥',
 formato: lineData.tipo || null,
 plataforma: lineData.plataforma || null,
 equipe_id: lineData.equipe_id || null,
 participantes,
 } as LineReal

 setLineupPadrao(lineup)
 setLineIdAtual(lineup.id)
 setLineupNome(lineup.nome || '')
 setLineupSimbolo(lineup.simbolo || '🔥')
 setSelecionados(participantes.slice(0, qtdLineup))
 }

 function alternarSelecionado(perfilId: string) {
 setSelecionados((prev) => {
 if (prev.includes(perfilId)) return prev.filter((id) => id !== perfilId)
 if (prev.length >= qtdLineup) return prev
 return [...prev, perfilId]
 })
 }

 async function confirmarEntrada() {
 if (!userId) return
 if (entrando || cancelandoFila) return

 if (!lineupNome.trim()) {
 alert('Digite um nome para a line.')
 return
 }

 if (selecionados.length !== qtdLineup) {
 alert(`Selecione exatamente ${qtdLineup} jogador(es).`)
 return
 }

 try {
 setEntrando(true)

 const filasAtuais = await buscarMinhasFilasAtualizadas(userId)
 const filaPareadaAtual = filasAtuais.find((fila) => fila.status === 'pareado' && fila.confronto_id)
 const filaIgualAtual = filasAtuais.find((fila) => mesmaOpcaoFila(fila, valorSelecionado, formatoAtivo, plataformaAtiva))

 if (filaPareadaAtual?.confronto_id) {
 setModalAberto(false)
 router.push(`/apostados/${filaPareadaAtual.confronto_id}`)
 return
 }

 if (filaIgualAtual?.status === 'aguardando') {
 alert('Você já está aguardando nessa mesma fila. Escolha outro valor, formato ou tipo.')
 return
 }

 if (valorAtual > 0 && saldoDisponivel < valorTotalEntrada) {
 alert(`Saldo insuficiente. Essa fila retém ${moeda(valorTotalEntrada)}: ${moeda(valorAtual)} da aposta + ${moeda(taxaEntrada)} de taxa.`)
 return
 }

 const perfisSelecionados = perfisDisponiveis.filter((p) => selecionados.includes(p.id))
 const equipeIds = Array.from(new Set(perfisSelecionados.map((p) => p.equipe_id).filter(Boolean))) as string[]
 const equipeId = equipeIds.length === 1 ? equipeIds[0] : null

 const { data, error } = await supabase.rpc('user_entrar_fila_matchmaking', {
 p_formato: formatoAtivo,
 p_plataforma: plataformaAtiva,
 p_valor: valorAtual,
 p_valor_label: valorLabelSelecionado,
 p_equipe_id: equipeId,
 p_participantes: selecionados,
 p_lineup_nome: lineupNome.trim(),
 p_lineup_simbolo: lineupSimbolo,
 p_line_id: lineIdAtual,
 p_melhor_de: melhorDeAtivo,
 })

 if (error) throw error

 await sincronizarAposMudancaFila(userId)

 setModalAberto(false)
 await carregarLineupPadrao(userId)

 const result = data as any
 if (result?.match && result?.confronto_id) {
 try { void new Audio('/match.mp3').play() } catch {}
 router.push(`/apostados/${result.confronto_id}`)
 return
 }

 alert('Você entrou na fila. O valor foi retido até encontrar adversário ou cancelar.')
 } catch (error: any) {
 console.error('Erro ao entrar na fila:', JSON.stringify(error, null, 2))
 const mensagem = String(error?.message || '')
 const detalhes = String(error?.details || '')
 const codigo = String(error?.code || '')

 if (codigo === '23505' && (mensagem.includes('unique_user_na_fila') || detalhes.includes('unique_user_na_fila'))) {
 alert('Existe um registro antigo do seu usuário preso na tabela de participantes. Rode o SQL PATCH_BANCO_APOSTADOS_UNIQUE_USER_NA_FILA.sql e tente novamente.')
 await sincronizarAposMudancaFila(userId)
 return
 }

 if (mensagem.includes('Você já está aguardando em uma fila')) {
 alert('Você já está nessa mesma fila. Escolha outro valor, formato ou tipo para entrar em outra fila.')
 await carregarMinhaFila(userId)
 return
 }

 alert(mensagem || 'Erro ao entrar na fila.')
 } finally {
 setEntrando(false)
 }
 }

 async function cancelarFila(silencioso = false, filaId?: string): Promise<boolean> {
 if (!userId) return false

 const filaAlvo = filaId
 ? (minhasFilas.find((fila) => fila.id === filaId) || minhaFilaDaOpcao(null) || filasDetalhes.find((fila) => fila.id === filaId && fila.responsavel_user_id === userId))
 : (filaAtualDoUsuario || minhaFilaPrincipal)

 if (filaAlvo?.status === 'pareado') {
 if (!silencioso) alert('Essa fila já foi pareada. Abra o confronto para acompanhar.')
 if (filaAlvo.confronto_id) router.push(`/apostados/${filaAlvo.confronto_id}`)
 return false
 }

 if (!filaAlvo?.id) {
 if (!silencioso) alert('Nenhuma fila ativa encontrada para cancelar.')
 return false
 }

 if (!silencioso) {
 const valorFila = Number(filaAlvo.valor || 0)
 const taxaFila = valorFila > 0 ? Number((valorFila * 0.10).toFixed(2)) : 0
 const confirmar = window.confirm(`Sair desta fila? Será devolvido ${moeda(valorFila)} e a taxa de ${moeda(taxaFila)} ficará com o site.`)
 if (!confirmar) return false
 }

 try {
 setCancelandoFila(true)

 const { error } = await supabase.rpc('fn_apostados_cancelar_fila_matchmaking', {
 p_fila_id: filaAlvo.id,
 p_user_id: userId,
 })

 if (error) {
 alert(error.message || 'Erro ao sair da fila.')
 return false
 }

 setMinhasFilas((prev) => prev.filter((fila) => fila.id !== filaAlvo.id))
 setFilasDetalhes((prev) => prev.filter((fila) => fila.id !== filaAlvo.id))
 if (filaAbertaId === filaAlvo.id) {
 setFilaAbertaId(null)
 setParticipantesFila([])
 }

 await sincronizarAposMudancaFila(userId)
 return true
 } finally {
 setCancelandoFila(false)
 }
 }

 async function sairDaFilaAtual() {
 if (!userId) return
 const filasAtivas = minhasFilas.filter((fila) => fila.status === 'aguardando')
 if (filasAtivas.length === 0) {
 alert('Nenhuma fila ativa encontrada para cancelar.')
 return
 }

 const confirmar = window.confirm(`Sair de todas as ${filasAtivas.length} fila(s) ativas? O valor da aposta volta para a carteira e a taxa de 10% fica com o site.`)
 if (!confirmar) return

 let canceladas = 0
 setCancelandoFila(true)
 try {
 for (const fila of filasAtivas) {
 const { error } = await supabase.rpc('fn_apostados_cancelar_fila_matchmaking', {
 p_fila_id: fila.id,
 p_user_id: userId,
 })
 if (!error) canceladas += 1
 else console.error('Erro ao cancelar fila:', fila.id, error)
 }

 setMinhasFilas([])
 setFilasDetalhes((prev) => prev.filter((fila) => fila.responsavel_user_id !== userId))
 setFilaAbertaId(null)
 setParticipantesFila([])
 await sincronizarAposMudancaFila(userId)
 alert(`${canceladas} fila(s) cancelada(s). O valor da aposta foi liberado e a taxa de 10% foi retida pelo site.`)
 } finally {
 setCancelandoFila(false)
 }
 }

 const perfisFiltrados = useMemo(() => {
 const termo = buscaPerfil.trim().toLowerCase()
 return perfisDisponiveis.filter((p) => {
 if (!termo) return true
 return (
 p.nick?.toLowerCase().includes(termo) ||
 p.uid_jogo?.toLowerCase().includes(termo) ||
 p.equipe_nome?.toLowerCase().includes(termo) ||
 p.nome_exibicao?.toLowerCase().includes(termo)
 )
 })
 }, [perfisDisponiveis, buscaPerfil])

 return (
 <div className="min-h-screen bg-[#f6f8fb] px-4 py-6 text-[#142340] md:px-8">
 <div className="mx-auto max-w-[1480px] space-y-4">
 <header className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_520px]">
 <div>
 <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-[#ff6a00]">Apostados</p>
 <h1 className="mt-1 text-[26px] font-semibold uppercase tracking-[-0.04em] text-[#142340]">Filas automáticas</h1>
 <p className="mt-1 text-[12px] text-zinc-500">Escolha formato, plataforma e valor. Você pode entrar em várias filas diferentes; só não pode repetir a mesma fila.</p>
 <div className="mt-3 flex flex-wrap items-center gap-2">
 <button
 onClick={sairDaFilaAtual}
 disabled={!userId || cancelandoFila}
 className="border border-red-300 bg-red-50 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-red-700 hover:bg-red-600 hover:text-[#142340] disabled:cursor-not-allowed disabled:opacity-40"
 >
 {cancelandoFila ? 'Saindo...' : 'Sair da fila'}
 </button>
 {minhaFilaPrincipal?.status === 'aguardando' ? (
 <span className="border border-cyan-200 bg-cyan-50 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-700">{totalMinhasFilasAguardando} fila(s) ativa(s)</span>
 ) : null}
 </div>
 </div>

 <div className="grid grid-cols-3 gap-2">
 <div className="border border-slate-200 bg-white p-3 ">
 <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-zinc-500">Saldo</p>
 <p className="mt-2 text-[19px] font-semibold text-[#142340]">{moeda(saldoDisponivel)}</p>
 </div>
 <div className="border border-slate-200 bg-white p-3 ">
 <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-zinc-500">Retido</p>
 <p className="mt-2 text-[19px] font-semibold text-[#142340]">{moeda(saldoRetido)}</p>
 </div>
 <div className="border border-slate-200 bg-white p-3 ">
 <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-zinc-500">Na fila</p>
 <p className="mt-2 text-[19px] font-semibold text-[#142340]">{totalMinhasFilasAguardando}</p>
 </div>
 </div>
 </header>

 {minhaFilaPrincipal ? (
 <div className="flex flex-col gap-3 border border-cyan-300 bg-cyan-50 p-3 md:flex-row md:items-center md:justify-between">
 <div>
 <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-cyan-700">Suas filas ativas</p>
 <p className="mt-1 text-[12px] font-bold text-cyan-950">{totalMinhasFilasAguardando} fila(s) aguardando • retido total {moeda(saldoRetido)}</p>
 <div className="mt-2 flex flex-wrap gap-2">
 {minhasFilas.filter((fila) => fila.status === 'aguardando').map((fila) => (
 <span key={fila.id} className="border border-cyan-200 bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-cyan-900">
 {fila.lineup_simbolo || '🔥'} {fila.formato} • MD{Number((fila as any).melhor_de || 1)} • {plataformaLabel(fila.plataforma)} • {fila.valor_label} • retido {moeda(Number(fila.valor_retido || 0))} • tempo {formatarTempoFila(fila.created_at, agora)}
 </span>
 ))}
 </div>
 </div>
 {minhaFilaPrincipal.status === 'aguardando' ? (
 <button onClick={() => cancelarFila(false, minhaFilaPrincipal.id)} className="border border-cyan-400 bg-white px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-900 hover:bg-cyan-900 hover:text-[#142340]">Sair da fila</button>
 ) : null}
 </div>
 ) : null}

 <main className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)_330px]">
 <aside className="space-y-3">
 <section className="border border-slate-200 bg-white p-3 ">
 <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-zinc-500">Formato</p>
 <div className="grid grid-cols-2 gap-2">
 {FORMATOS.map((f) => (
 <button key={f} onClick={() => setFormatoAtivo(f)} className={['border px-3 py-3 text-[12px] font-bold transition', formatoAtivo === f ? 'border-cyan-400 bg-cyan-50 text-cyan-700' : 'border-slate-200 bg-white text-slate-600 hover:border-cyan-300'].join(' ')}>{f}</button>
 ))}
 </div>
 </section>

 <section className="border border-slate-200 bg-white p-3 ">
 <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-zinc-500">Melhor de</p>
 <div className="grid grid-cols-3 gap-2">
 {MELHORES_DE.map((md) => (
 <button key={md} onClick={() => setMelhorDeAtivo(md)} className={['border px-3 py-3 text-[12px] font-bold transition', melhorDeAtivo === md ? 'border-orange-400 bg-orange-50 text-orange-700' : 'border-slate-200 bg-white text-slate-600 hover:border-orange-300'].join(' ')}>MD{md}</button>
 ))}
 </div>
 </section>

 <section className="border border-slate-200 bg-white p-3 ">
 <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-zinc-500">Tipo</p>
 <div className="space-y-2">
 {PLATAFORMAS.map((p) => (
 <button key={p.id} onClick={() => setPlataformaAtiva(p.id)} className={['flex w-full items-center justify-between border px-3 py-3 text-[12px] transition', plataformaAtiva === p.id ? 'border-violet-300 bg-violet-50 text-violet-700' : 'border-slate-200 bg-white text-slate-600 hover:border-violet-200'].join(' ')}>
 <span>{p.icon} {p.label}</span><span>›</span>
 </button>
 ))}
 </div>
 </section>

 <section className="border border-slate-200 bg-white p-3 text-[12px] leading-5 text-zinc-500 ">
 <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.25em] text-zinc-500">Regra</p>
 A fila só dá match com mesmo valor, formato e tipo. O sistema retém o valor da aposta + 10% de taxa. Se cancelar antes do pareamento, o valor da aposta volta e a taxa fica com o site.
 </section>
 </aside>

 <section className="border border-slate-200 bg-white p-3 ">
 <div className="mb-3 flex flex-col gap-2 border-b border-slate-100 pb-3 md:flex-row md:items-center md:justify-between">
 <div>
 <p className="text-[10px] font-semibold uppercase tracking-[0.30em] text-[#ff6a00]">Escolha a fila</p>
 <h2 className="mt-1 text-[20px] font-semibold uppercase text-[#142340]">{formatoAtivo} • MD{melhorDeAtivo} • {plataformaLabel(plataformaAtiva)}</h2>
 </div>
 <button onClick={abrirModalEntrada} disabled={entrando || !!filaAtualDoUsuario || (minhaFilaPrincipal?.status === 'pareado') || (valorAtual > 0 && saldoDisponivel < valorTotalEntrada)} className="bg-cyan-400 px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#142340] hover:bg-white hover:text-[#142340] disabled:cursor-not-allowed disabled:opacity-40">
 {filaAtualDoUsuario ? 'Já está nessa fila' : minhaFilaPrincipal?.status === 'pareado' ? 'Confronto aberto' : valorAtual > 0 && saldoDisponivel < valorTotalEntrada ? 'Saldo insuficiente' : 'Entrar'}
 </button>
 </div>

 <div className="grid gap-2 md:grid-cols-4">
 {VALORES.map((valor) => {
 const resumo = resumos.find((r) => r.formato === formatoAtivo && r.plataforma === plataformaAtiva && Number((r as any).melhor_de || 1) === Number(melhorDeAtivo) && Number(r.valor || 0) === valor)
 const ativo = valorSelecionado === valor
 const minhaFilaValor = minhaFilaDaOpcao(valor)
 const estouNessaFila = !!minhaFilaValor
 return (
 <div
 key={valor}
 role="button"
 tabIndex={0}
 onClick={() => {
 if (estouNessaFila) return
 setValorSelecionado(valor)
 setValorLabelSelecionado(moeda(valor))
 setFilaAbertaId(null)
 }}
 onKeyDown={(e) => {
 if (e.key !== 'Enter') return
 if (estouNessaFila) return
 setValorSelecionado(valor)
 setValorLabelSelecionado(moeda(valor))
 setFilaAbertaId(null)
 }}
 className={[
 'relative border p-3 text-left transition',
 estouNessaFila
 ? 'border-emerald-500 bg-emerald-50 shadow-[inset_0_0_0_1px_rgba(16,185,129,0.35)] hover:border-emerald-600'
 : ativo
 ? 'border-cyan-400 bg-cyan-50'
 : 'border-slate-200 bg-white hover:border-cyan-300'
 ].join(' ')}
 >
 <div className="flex items-start justify-between gap-2">
 <p className="text-[22px] font-semibold text-[#142340]">R$ {valor}</p>
 <span className={[
 'px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.08em]',
 estouNessaFila
 ? 'bg-emerald-600 text-white'
 : Number(resumo?.filas_aguardando || 0) > 0
 ? 'bg-emerald-100 text-emerald-700'
 : 'bg-slate-100 text-zinc-500'
 ].join(' ')}>
 {estouNessaFila ? 'Minha fila' : Number(resumo?.filas_aguardando || 0) > 0 ? `${resumo?.filas_aguardando} fila` : 'livre'}
 </span>
 </div>
 <p className="mt-1 text-[11px] text-zinc-500">Retém: {moeda(Number((valor * 1.10).toFixed(2)))} • Prêmio: {moeda(valor * 2)}</p>
 <p className={['mt-2 text-[11px] font-bold', estouNessaFila ? 'text-emerald-700' : 'text-[#142340]'].join(' ')}>
 {estouNessaFila ? 'Você já está nesta fila' : `${Number(resumo?.jogadores_aguardando || 0)} jogador(es) aguardando`}
 </p>
 {estouNessaFila ? (
 <div className="mt-2 space-y-2">
 <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-700">
 {minhaFilaValor?.lineup_simbolo || '🔥'} {minhaFilaValor?.lineup_nome || 'Sua line'} • retido {moeda(Number(minhaFilaValor?.valor_retido || 0))}
 </p>
 <div className="flex items-center justify-between gap-2">
 <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-700">tempo {formatarTempoFila(minhaFilaValor?.created_at, agora)}</span>
 <button
 type="button"
 onClick={(e) => { e.stopPropagation(); if (minhaFilaValor?.id) cancelarFila(false, minhaFilaValor.id) }}
 disabled={cancelandoFila}
 className="border border-red-300 bg-white px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-red-700 hover:bg-red-600 hover:text-white disabled:opacity-40"
 >
 {cancelandoFila ? 'Saindo...' : 'Sair'}
 </button>
 </div>
 </div>
 ) : null}
 </div>
 )
 })}

 {(() => {
 const minhaFilaCombinar = minhaFilaDaOpcao(null)
 const estouNessaFila = !!minhaFilaCombinar
 return (
 <div
 role="button"
 tabIndex={0}
 onClick={() => {
 if (estouNessaFila) return
 setValorSelecionado(null)
 setValorLabelSelecionado('A combinar')
 setFilaAbertaId(null)
 }}
 onKeyDown={(e) => {
 if (e.key !== 'Enter') return
 if (estouNessaFila) return
 setValorSelecionado(null)
 setValorLabelSelecionado('A combinar')
 setFilaAbertaId(null)
 }}
 className={[
 'border p-3 text-left transition',
 estouNessaFila
 ? 'border-emerald-500 bg-emerald-50 shadow-[inset_0_0_0_1px_rgba(16,185,129,0.35)]'
 : valorSelecionado === null
 ? 'border-orange-300 bg-orange-50'
 : 'border-slate-200 bg-white hover:border-orange-200'
 ].join(' ')}
 >
 <div className="flex items-start justify-between gap-2">
 <p className="text-[22px] font-semibold text-[#142340]">A combinar</p>
 {estouNessaFila ? <span className="bg-emerald-600 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-white">Minha fila</span> : null}
 </div>
 <p className="mt-1 text-[11px] text-zinc-500">Sem débito automático</p>
 <p className={['mt-2 text-[11px] font-bold', estouNessaFila ? 'text-emerald-700' : 'text-orange-600'].join(' ')}>{estouNessaFila ? 'Você já está nesta fila' : 'manual/moderação'}</p>
 {estouNessaFila ? (
 <div className="mt-2 flex items-center justify-between gap-2">
 <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-700">tempo {formatarTempoFila(minhaFilaCombinar?.created_at, agora)}</span>
 <button type="button" onClick={(e) => { e.stopPropagation(); if (minhaFilaCombinar?.id) cancelarFila(false, minhaFilaCombinar.id) }} disabled={cancelandoFila} className="border border-red-300 bg-white px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-red-700 hover:bg-red-600 hover:text-white disabled:opacity-40">{cancelandoFila ? 'Saindo...' : 'Sair'}</button>
 </div>
 ) : null}
 </div>
 )
})()}
 </div>

 <div className="mt-4 border border-slate-200 bg-slate-50 p-3">
 <div className="mb-3 flex items-center justify-between">
 <div>
 <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-zinc-500">Lineups aguardando</p>
 <p className="mt-1 text-[13px] font-semibold text-[#142340]">{valorLabelSelecionado} • {resumoAtual?.filas_aguardando || 0} fila(s)</p>
 </div>
 <span className="text-[11px] font-bold text-zinc-500">{qtdLineup} jogador(es) por equipe</span>
 </div>

 {filasDaSelecao.length === 0 ? (
 <div className="flex h-28 items-center justify-center border border-dashed border-slate-300 bg-white text-[12px] text-zinc-500">Nenhuma equipe aguardando nessa fila.</div>
 ) : (
 <div className="space-y-2">
 {filasDaSelecao.map((fila, index) => {
 const ativo = filaAbertaId === fila.id
 const minhaFila = usuarioEstaNaFilaId(fila.id)
 return (
 <div
 key={`${fila.id}-${index}`}
 role="button"
 tabIndex={0}
 onClick={() => { setFilaAbertaId(fila.id); carregarParticipantesFila(fila.id) }}
 onKeyDown={(e) => { if (e.key === 'Enter') { setFilaAbertaId(fila.id); carregarParticipantesFila(fila.id) } }}
 className={[
 'flex w-full items-center justify-between border p-2 text-left transition',
 minhaFila
 ? 'border-emerald-500 bg-emerald-50 shadow-[inset_0_0_0_1px_rgba(16,185,129,0.30)]'
 : ativo
 ? 'border-cyan-400 bg-white'
 : 'border-slate-200 bg-white hover:border-cyan-300'
 ].join(' ')}
 >
 <div className="flex min-w-0 items-center gap-3">
 <div className={[
 'flex h-9 w-9 items-center justify-center border text-[12px] font-semibold',
 minhaFila ? 'border-emerald-300 bg-emerald-100 text-emerald-700' : 'border-slate-200 bg-slate-100 text-zinc-500'
 ].join(' ')}>#{index + 1}</div>
 <div className={[
 'flex h-9 w-9 items-center justify-center border text-[18px]',
 minhaFila ? 'border-emerald-300 bg-white' : 'border-cyan-200 bg-cyan-50'
 ].join(' ')}>
 {fila.lineup_simbolo || '🔥'}
 </div>
 <div className="min-w-0">
 <p className="truncate text-[13px] font-semibold uppercase text-[#142340]">{compactNome(fila.lineup_nome || fila.equipe_nome || fila.responsavel_nome)}</p>
 <p className={['truncate text-[11px]', minhaFila ? 'font-semibold text-emerald-700' : 'text-zinc-500'].join(' ')}>
 {minhaFila ? 'Sua equipe nesta fila • ' : ''}{fila.total_participantes}/{qtdLineup} jogadores • retido {moeda(Number(fila.valor_retido || 0))} {minhaFila ? `• tempo ${formatarTempoFila(fila.created_at, agora)}` : ''}
 </p>
 </div>
 </div>
 <div className="flex shrink-0 items-center gap-2">
 <span className={[
 'text-[10px] font-semibold uppercase tracking-[0.15em]',
 minhaFila ? 'text-emerald-700' : 'text-cyan-600'
 ].join(' ')}>{minhaFila ? 'minha fila' : 'ver cartas'}</span>
 {minhaFila ? (
 <button
 type="button"
 onClick={(e) => { e.stopPropagation(); cancelarFila(false, fila.id) }}
 disabled={cancelandoFila}
 className="border border-red-300 bg-white px-3 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-red-700 hover:bg-red-600 hover:text-white disabled:opacity-40"
 >
 {cancelandoFila ? 'Saindo...' : 'Sair'}
 </button>
 ) : null}
 </div>
 </div>
 )
 })}
 </div>
 )}
 </div>
 </section>

 <aside className="space-y-3">
 <section className="border border-slate-200 bg-white p-3 ">
 <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-zinc-500">Fila selecionada</p>
 <div className="mt-3 border border-slate-200 bg-slate-50 p-3">
 <p className="text-[22px] font-semibold text-[#142340]">{valorLabelSelecionado}</p>
 <p className="mt-1 text-[12px] text-zinc-500">{formatoAtivo} • MD{melhorDeAtivo} • {plataformaLabel(plataformaAtiva)}</p>
 <p className="mt-1 text-[11px] font-semibold text-red-600">Retém {moeda(valorTotalEntrada)} ({moeda(valorAtual)} + taxa {moeda(taxaEntrada)})</p>
 </div>
 <div className="mt-2 grid grid-cols-2 gap-2">
 <div className="border border-slate-200 p-3"><p className="text-[9px] font-semibold uppercase text-zinc-500">Lineups</p><p className="text-[18px] font-semibold">{resumoAtual?.filas_aguardando || 0}</p></div>
 <div className="border border-slate-200 p-3"><p className="text-[9px] font-semibold uppercase text-zinc-500">Jogadores</p><p className="text-[18px] font-semibold">{resumoAtual?.jogadores_aguardando || 0}</p></div>
 </div>
 <button onClick={abrirModalEntrada} disabled={entrando || !!filaAtualDoUsuario || (minhaFilaPrincipal?.status === 'pareado') || (valorAtual > 0 && saldoDisponivel < valorTotalEntrada)} className="mt-3 w-full bg-white px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.20em] text-[#142340] hover:bg-cyan-400 hover:text-[#142340] disabled:opacity-40">{filaAtualDoUsuario ? `Já está nessa fila • ${formatarTempoFila(filaAtualDoUsuario.created_at, agora)}` : 'Entrar na fila'}</button>
 {filaAtualDoUsuario ? (
 <button onClick={() => cancelarFila(false, filaAtualDoUsuario.id)} className="mt-2 w-full border border-red-300 bg-red-50 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.20em] text-red-700 hover:bg-red-600 hover:text-[#142340]">Sair da fila</button>
 ) : null}
 </section>

 <section className="border border-slate-200 bg-white p-3 ">
 <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-zinc-500">Cartas da equipe</p>
 {carregandoFila ? (
 <div className="py-8 text-center text-[12px] text-zinc-500">Carregando cartas...</div>
 ) : participantesFila.length === 0 ? (
 <div className="py-8 text-center text-[12px] text-zinc-500">Clique em uma equipe da fila.</div>
 ) : (
 <div className="space-y-2">
 {participantesFila.map((p) => (
 <div key={p.id} className="border border-slate-200 bg-slate-50 p-2">
 <div className="flex items-center gap-2">
 <div className="h-10 w-10 overflow-hidden border border-slate-200 bg-white">
 {p.avatar_url ? <img src={p.avatar_url} alt={p.nick || 'Jogador'} className="h-full w-full object-cover" /> : null}
 </div>
 <div className="min-w-0">
 <p className="truncate text-[12px] font-semibold uppercase text-[#142340]">{p.nick || 'Jogador'}</p>
 <p className="truncate text-[10px] text-zinc-500">UID {p.uid_jogo || '-'} • {p.plataforma || '-'}</p>
 </div>
 </div>
 <div className="mt-2 grid grid-cols-4 gap-1 text-center">
 <div className="bg-white p-1"><p className="text-[8px] font-semibold text-zinc-500">J</p><p className="text-[12px] font-semibold">{p.filas_jogadas || 0}</p></div>
 <div className="bg-white p-1"><p className="text-[8px] font-semibold text-zinc-500">W%</p><p className="text-[12px] font-semibold">{Number(p.winrate || 0)}%</p></div>
 <div className="bg-white p-1"><p className="text-[8px] font-semibold text-zinc-500">K</p><p className="text-[12px] font-semibold">{p.abates || 0}</p></div>
 <div className="bg-white p-1"><p className="text-[8px] font-semibold text-zinc-500">MVP</p><p className="text-[12px] font-semibold">{p.mvps || 0}</p></div>
 </div>
 </div>
 ))}
 </div>
 )}
 </section>
 </aside>
 </main>

 {loading ? <div className="border border-slate-200 bg-white p-4 text-[12px] text-zinc-500">Carregando...</div> : null}
 </div>

 {modalAberto ? (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#f7f7f7]/70 p-4">
 <div className="max-h-[92vh] w-full max-w-5xl overflow-hidden border border-slate-200 bg-white ">
 <div className="flex items-start justify-between border-b border-slate-200 p-4">
 <div>
 <p className="text-[10px] font-semibold uppercase tracking-[0.30em] text-[#ff6a00]">{lineupPadrao ? 'Sua line' : 'Criar line'}</p>
 <h3 className="mt-1 text-[22px] font-semibold uppercase text-[#142340]">{formatoAtivo} • MD{melhorDeAtivo} • {plataformaLabel(plataformaAtiva)} • {valorLabelSelecionado}</h3>
 <p className="mt-1 text-[12px] text-zinc-500">Use sua line salva ou troque nome, símbolo e jogadores antes de entrar.</p>
 {lineupPadrao ? <p className="mt-2 inline-flex border border-cyan-200 bg-cyan-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-700">Line carregada automaticamente</p> : null}
 </div>
 <button onClick={() => setModalAberto(false)} className="border border-slate-200 px-4 py-2 text-[11px] font-semibold uppercase text-zinc-500 hover:bg-slate-100">Fechar</button>
 </div>

 <div className="grid max-h-[calc(92vh-105px)] grid-cols-1 overflow-hidden xl:grid-cols-[minmax(0,1fr)_310px]">
 <div className="overflow-y-auto p-4">
 <div className="mb-3 grid gap-3 border border-slate-200 bg-slate-50 p-3 lg:grid-cols-[260px_minmax(0,1fr)]">
 <div>
 <label className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500">Nome da line</label>
 <input
 value={lineupNome}
 onChange={(e) => setLineupNome(e.target.value)}
 maxLength={28}
 placeholder="Ex: ALOE ELITE"
 className="mt-2 w-full border border-slate-200 bg-white px-3 py-3 text-[13px] font-bold uppercase outline-none focus:border-cyan-400"
 />
 <p className="mt-1 text-[10px] text-zinc-500">Esse nome aparece na fila e no confronto.</p>
 </div>
 <div>
 <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500">Símbolo da line</p>
 <div className="mt-2 grid grid-cols-10 gap-1">
 {SIMBOLOS_LINEUP.map((simbolo) => (
 <button
 key={simbolo}
 type="button"
 onClick={() => setLineupSimbolo(simbolo)}
 className={['flex h-9 items-center justify-center border text-[17px] transition', lineupSimbolo === simbolo ? 'border-cyan-400 bg-cyan-50' : 'border-slate-200 bg-white hover:border-cyan-300'].join(' ')}
 >
 {simbolo}
 </button>
 ))}
 </div>
 </div>
 </div>

 <div className="mb-3 grid gap-2 md:grid-cols-[minmax(0,1fr)_170px]">
 <input value={buscaPerfil} onChange={(e) => setBuscaPerfil(e.target.value)} placeholder="Buscar nick, UID ou equipe" className="w-full border border-slate-200 bg-slate-50 px-4 py-3 text-[13px] outline-none focus:border-cyan-400" />
 <button
 type="button"
 onClick={() => { if (lineupPadrao) { setLineupNome(lineupPadrao.nome); setLineupSimbolo(lineupPadrao.simbolo || '🔥'); setSelecionados((lineupPadrao.participantes || []).slice(0, qtdLineup)) } }}
 disabled={!lineupPadrao}
 className="border border-slate-200 bg-white px-3 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500 hover:border-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
 >
 Restaurar line
 </button>
 </div>

 {carregandoPerfis ? (
 <div className="py-10 text-center text-[12px] text-zinc-500">Carregando jogadores...</div>
 ) : perfisFiltrados.length === 0 ? (
 <div className="py-10 text-center text-[12px] text-zinc-500">Nenhum jogador encontrado.</div>
 ) : (
 <div className="grid gap-2 md:grid-cols-2">
 {perfisFiltrados.map((perfil) => {
 const ativo = selecionados.includes(perfil.id)
 return (
 <button key={perfil.id} onClick={() => alternarSelecionado(perfil.id)} className={['border p-3 text-left transition', ativo ? 'border-cyan-400 bg-cyan-50' : 'border-slate-200 bg-white hover:border-cyan-300'].join(' ')}>
 <div className="flex gap-3">
 <div className="h-12 w-12 overflow-hidden border border-slate-200 bg-slate-100">
 {perfil.avatar_url ? <img src={perfil.avatar_url} alt={perfil.nick} className="h-full w-full object-cover" /> : null}
 </div>
 <div className="min-w-0 flex-1">
 <div className="flex items-start justify-between gap-2">
 <p className="truncate text-[13px] font-semibold uppercase text-[#142340]">{perfil.nick}</p>
 {ativo ? <span className="bg-cyan-400 px-2 py-1 text-[9px] font-semibold">OK</span> : null}
 </div>
 <p className="truncate text-[11px] text-zinc-500">{perfil.equipe_nome || 'Sem equipe'} • UID {perfil.uid_jogo}</p>
 <div className="mt-2 grid grid-cols-4 gap-1 text-center">
 <span className="bg-slate-50 p-1 text-[10px] font-bold">J {perfil.filas_jogadas || 0}</span>
 <span className="bg-slate-50 p-1 text-[10px] font-bold">W {Number(perfil.winrate || 0)}%</span>
 <span className="bg-slate-50 p-1 text-[10px] font-bold">K {perfil.abates || 0}</span>
 <span className="bg-slate-50 p-1 text-[10px] font-bold">★ {perfil.mvps || 0}</span>
 </div>
 </div>
 </div>
 </button>
 )
 })}
 </div>
 )}
 </div>

 <aside className="border-t border-slate-200 bg-slate-50 p-4 xl:border-l xl:border-t-0">
 <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-zinc-500">Resumo</p>
 <div className="mt-3 border border-cyan-200 bg-white p-3">
 <p className="text-[10px] font-semibold uppercase tracking-[0.20em] text-zinc-500">Line</p>
 <div className="mt-2 flex items-center gap-2">
 <div className="flex h-9 w-9 items-center justify-center border border-cyan-200 bg-cyan-50 text-[18px]">{lineupSimbolo}</div>
 <p className="min-w-0 truncate text-[13px] font-semibold uppercase text-[#142340]">{lineupNome.trim() || 'Nome da line'}</p>
 </div>
 </div>
 <div className="mt-3 border border-slate-200 bg-white p-3">
 <p className="text-[11px] text-zinc-500">Valor retido</p>
 <p className="text-[24px] font-semibold text-[#142340]">{moeda(valorAtual)}</p>
 </div>
 <p className="mt-3 text-[12px] font-bold text-slate-600">Jogadores da line: {selecionados.length}/{qtdLineup}</p>

 <div className="mt-3 space-y-2">
 {selecionados.map((id) => {
 const perfil = perfisDisponiveis.find((p) => p.id === id)
 if (!perfil) return null
 return (
 <div key={id} className="flex items-center gap-2 border border-slate-200 bg-white p-2">
 <div className="h-8 w-8 overflow-hidden border border-slate-200 bg-slate-100">{perfil.avatar_url ? <img src={perfil.avatar_url} alt={perfil.nick} className="h-full w-full object-cover" /> : null}</div>
 <div className="min-w-0"><p className="truncate text-[12px] font-semibold">{perfil.nick}</p><p className="truncate text-[10px] text-zinc-500">{perfil.equipe_nome || 'Sem equipe'}</p></div>
 </div>
 )
 })}
 </div>

 <button onClick={confirmarEntrada} disabled={entrando || selecionados.length !== qtdLineup || !lineupNome.trim()} className="mt-4 w-full bg-white px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.20em] text-[#142340] hover:bg-cyan-400 hover:text-[#142340] disabled:cursor-not-allowed disabled:opacity-40">{entrando ? 'Confirmando...' : lineupPadrao ? 'Salvar line e entrar' : 'Criar line e entrar'}</button>
 </aside>
 </div>
 </div>
 </div>
 ) : null}
 </div>
 )
}
