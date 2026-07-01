'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import {
 Search,
 Swords,
 Filter,
 Loader2,
 AlertTriangle,
 ShieldCheck,
 Wallet,
 ChevronRight,
 UserCircle2,
 Users,
 Smartphone,
 Monitor,
 Clock3,
 Trophy,
 Shield,
 CircleDot,
 Plus,
} from 'lucide-react'

type FormatoConfronto = '1x1' | '2x2' | '3x3' | '4x4'
type RegraPlataforma =
 | 'full_mobile'
 | 'permite_1_emulador'
 | 'permite_2_emuladores'
 | 'permite_3_emuladores'
 | 'full_emulador'

type StatusConfronto =
 | 'aberto'
 | 'aguardando_oponente'
 | 'aguardando_pagamento'
 | 'pronto'
 | 'em_jogo'
 | 'aguardando_resultado'
 | 'aguardando_validacao'
 | 'finalizado'
 | 'cancelado'
 | 'reembolsado'

type AdminMode = 'plataforma' | 'privado' | 'misto'
type LadoConfronto = 'a' | 'b'

type ConfrontoRow = {
 id: string
 titulo: string
 descricao: string | null
 criado_por_user_id: string
 formato: FormatoConfronto
 regra_plataforma: RegraPlataforma
 valor_por_lado: number | string
 valor_total: number | string | null
 status: StatusConfronto
 admin_mode: AdminMode
 vencedor_lado: LadoConfronto | null
 resultado_texto: string | null
 data_partida: string | null
 prazo_aceite: string | null
 finalizado_em: string | null
 cancelado_em: string | null
 created_at: string
 updated_at: string
}

type PerfilRow = {
 id: string
 user_id: string
 nick: string
 foto_url: string | null
 bio: string | null
 status_publico: boolean
 aceita_desafios: boolean
}

type TimeRow = {
 id: string
 confronto_id: string
 lado: LadoConfronto
 nome_time: string | null
 capitao_user_id: string | null
 status_pagamento: string
 valor_pago: number | string
 pago_em: string | null
}

type JogadorRow = {
 id: string
 confronto_time_id: string
 user_id: string
 nick_snapshot: string | null
 plataforma: string | null
 funcao: string | null
 confirmado_em: string | null
 created_at: string
}

type AdminRow = {
 id: string
 confronto_id: string
 admin_user_id: string
 tipo: string
 status: string
 created_at: string
}

type ConfrontoCard = {
 id: string
 titulo: string
 descricao: string | null
 criado_por_user_id: string
 criador_nick: string
 criador_foto_url: string | null
 formato: FormatoConfronto
 regra_plataforma: RegraPlataforma
 valor_por_lado: number
 valor_total: number
 status: StatusConfronto
 admin_mode: AdminMode
 data_partida: string | null
 prazo_aceite: string | null
 created_at: string
 lado_a: {
 nome_time: string
 total_jogadores: number
 status_pagamento: string
 valor_pago: number
 }
 lado_b: {
 nome_time: string
 total_jogadores: number
 status_pagamento: string
 valor_pago: number
 }
 total_admins: number
}

const FORMATOS: Array<{ value: 'todos' | FormatoConfronto; label: string }> = [
 { value: 'todos', label: 'Todos formatos' },
 { value: '1x1', label: '1x1' },
 { value: '2x2', label: '2x2' },
 { value: '3x3', label: '3x3' },
 { value: '4x4', label: '4x4' },
]

const REGRAS: Array<{ value: 'todas' | RegraPlataforma; label: string }> = [
 { value: 'todas', label: 'Todas regras' },
 { value: 'full_mobile', label: 'Full mobile' },
 { value: 'permite_1_emulador', label: 'Permite 1 emulador' },
 { value: 'permite_2_emuladores', label: 'Permite 2 emuladores' },
 { value: 'permite_3_emuladores', label: 'Permite 3 emuladores' },
 { value: 'full_emulador', label: 'Full emulador' },
]

const STATUS: Array<{ value: 'todos' | StatusConfronto; label: string }> = [
 { value: 'todos', label: 'Todos status' },
 { value: 'aberto', label: 'Aberto' },
 { value: 'aguardando_oponente', label: 'Aguardando oponente' },
 { value: 'aguardando_pagamento', label: 'Aguardando pagamento' },
 { value: 'pronto', label: 'Pronto' },
 { value: 'em_jogo', label: 'Em jogo' },
 { value: 'aguardando_resultado', label: 'Aguardando resultado' },
 { value: 'aguardando_validacao', label: 'Aguardando validação' },
 { value: 'finalizado', label: 'Finalizado' },
 { value: 'cancelado', label: 'Cancelado' },
 { value: 'reembolsado', label: 'Reembolsado' },
]

export default function ConfrontosPageClient() {
 const [loading, setLoading] = useState(true)
 const [erro, setErro] = useState('')
 const [busca, setBusca] = useState('')
 const [filtroFormato, setFiltroFormato] = useState<'todos' | FormatoConfronto>('todos')
 const [filtroRegra, setFiltroRegra] = useState<'todas' | RegraPlataforma>('todas')
 const [filtroStatus, setFiltroStatus] = useState<'todos' | StatusConfronto>('todos')
 const [confrontos, setConfrontos] = useState<ConfrontoCard[]>([])

 useEffect(() => {
 carregarConfrontos()
 }, [])

 async function carregarConfrontos() {
 setLoading(true)
 setErro('')

 try {
 const { data: confrontosData, error: confrontosError } = await supabase
 .from('confrontos_apostados')
 .select('*')
 .order('created_at', { ascending: false })
 .limit(60)

 if (confrontosError) throw confrontosError

 const confrontosLista = ((confrontosData || []) as ConfrontoRow[]).filter((item) => item?.id)

 if (confrontosLista.length === 0) {
 setConfrontos([])
 return
 }

 const confrontoIds = confrontosLista.map((item) => item.id)
 const criadoresIds = Array.from(new Set(confrontosLista.map((item) => item.criado_por_user_id)))

 const [
 { data: perfisData, error: perfisError },
 { data: timesData, error: timesError },
 { data: adminsData, error: adminsError },
 ] = await Promise.all([
 supabase
 .from('apostadores_perfis')
 .select('id, user_id, nick, foto_url, bio, status_publico, aceita_desafios')
 .in('user_id', criadoresIds),
 supabase
 .from('confrontos_times')
 .select('*')
 .in('confronto_id', confrontoIds),
 supabase
 .from('confrontos_admins')
 .select('*')
 .in('confronto_id', confrontoIds),
 ])

 if (perfisError) throw perfisError
 if (timesError) throw timesError
 if (adminsError) throw adminsError

 const timesLista = (timesData || []) as TimeRow[]
 const adminsLista = (adminsData || []) as AdminRow[]
 const perfisLista = (perfisData || []) as PerfilRow[]

 const timeIds = timesLista.map((item) => item.id)

 const { data: jogadoresData, error: jogadoresError } = await supabase
 .from('confrontos_jogadores')
 .select('*')
 .in('confronto_time_id', timeIds)

 if (jogadoresError) throw jogadoresError

 const jogadoresLista = (jogadoresData || []) as JogadorRow[]

 const perfilByUserId = new Map<string, PerfilRow>()
 for (const perfil of perfisLista) {
 perfilByUserId.set(perfil.user_id, perfil)
 }

 const timesByConfronto = new Map<string, TimeRow[]>()
 for (const time of timesLista) {
 const atual = timesByConfronto.get(time.confronto_id) || []
 atual.push(time)
 timesByConfronto.set(time.confronto_id, atual)
 }

 const jogadoresByTime = new Map<string, JogadorRow[]>()
 for (const jogador of jogadoresLista) {
 const atual = jogadoresByTime.get(jogador.confronto_time_id) || []
 atual.push(jogador)
 jogadoresByTime.set(jogador.confronto_time_id, atual)
 }

 const adminsByConfronto = new Map<string, AdminRow[]>()
 for (const admin of adminsLista) {
 const atual = adminsByConfronto.get(admin.confronto_id) || []
 atual.push(admin)
 adminsByConfronto.set(admin.confronto_id, atual)
 }

 const cards: ConfrontoCard[] = confrontosLista.map((confronto) => {
 const perfilCriador = perfilByUserId.get(confronto.criado_por_user_id)
 const timesDoConfronto = timesByConfronto.get(confronto.id) || []
 const timeA = timesDoConfronto.find((item) => item.lado === 'a') || null
 const timeB = timesDoConfronto.find((item) => item.lado === 'b') || null
 const jogadoresA = timeA ? jogadoresByTime.get(timeA.id) || [] : []
 const jogadoresB = timeB ? jogadoresByTime.get(timeB.id) || [] : []
 const adminsDoConfronto = adminsByConfronto.get(confronto.id) || []

 return {
 id: confronto.id,
 titulo: confronto.titulo,
 descricao: confronto.descricao,
 criado_por_user_id: confronto.criado_por_user_id,
 criador_nick: textoSeguro(perfilCriador?.nick, 'Usuário'),
 criador_foto_url: perfilCriador?.foto_url || null,
 formato: confronto.formato,
 regra_plataforma: confronto.regra_plataforma,
 valor_por_lado: numeroSeguro(confronto.valor_por_lado),
 valor_total: numeroSeguro(confronto.valor_total ?? numeroSeguro(confronto.valor_por_lado) * 2),
 status: confronto.status,
 admin_mode: confronto.admin_mode,
 data_partida: confronto.data_partida,
 prazo_aceite: confronto.prazo_aceite,
 created_at: confronto.created_at,
 lado_a: {
 nome_time: textoSeguro(timeA?.nome_time, 'Lado A'),
 total_jogadores: jogadoresA.length,
 status_pagamento: textoSeguro(timeA?.status_pagamento, 'pendente'),
 valor_pago: numeroSeguro(timeA?.valor_pago),
 },
 lado_b: {
 nome_time: textoSeguro(timeB?.nome_time, 'Lado B'),
 total_jogadores: jogadoresB.length,
 status_pagamento: textoSeguro(timeB?.status_pagamento, 'pendente'),
 valor_pago: numeroSeguro(timeB?.valor_pago),
 },
 total_admins: adminsDoConfronto.length,
 }
 })

 setConfrontos(cards)
 } catch (err) {
 console.error(err)
 setErro('Não foi possível carregar os confrontos agora.')
 setConfrontos([])
 } finally {
 setLoading(false)
 }
 }

 const confrontosFiltrados = useMemo(() => {
 const termo = busca.trim().toLowerCase()

 return confrontos.filter((item) => {
 const bateBusca =
 !termo ||
 item.titulo.toLowerCase().includes(termo) ||
 item.criador_nick.toLowerCase().includes(termo) ||
 item.lado_a.nome_time.toLowerCase().includes(termo) ||
 item.lado_b.nome_time.toLowerCase().includes(termo)

 const bateFormato = filtroFormato === 'todos' || item.formato === filtroFormato
 const bateRegra = filtroRegra === 'todas' || item.regra_plataforma === filtroRegra
 const bateStatus = filtroStatus === 'todos' || item.status === filtroStatus

 return bateBusca && bateFormato && bateRegra && bateStatus
 })
 }, [busca, confrontos, filtroFormato, filtroRegra, filtroStatus])

 const resumo = useMemo(() => {
 return {
 total: confrontosFiltrados.length,
 abertas: confrontosFiltrados.filter((item) =>
 ['aberto', 'aguardando_oponente'].includes(item.status)
 ).length,
 emAndamento: confrontosFiltrados.filter((item) =>
 ['pronto', 'em_jogo', 'aguardando_resultado', 'aguardando_validacao'].includes(item.status)
 ).length,
 finalizadas: confrontosFiltrados.filter((item) => item.status === 'finalizado').length,
 }
 }, [confrontosFiltrados])

 return (
 <div className="min-h-screen bg-[#f6f7f8]">
 <div className="border-b border-zinc-200 bg-white">
 <div className="max-w-7xl mx-auto px-4 md:px-8 xl:px-10 py-6 md:py-8">
 <div className="grid grid-cols-1 xl:grid-cols-[1.5fr_0.95fr] gap-5">
 <div className=" border border-zinc-200 bg-[#f8fbf9] p-5 md:p-7">
 <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#2563eb] mb-3">
 // CONFRONTOS APOSTADOS
 </p>

 <h1 className="text-3xl md:text-5xl font-semibold leading-none text-zinc-900">
 Encontre e crie disputas apostadas com histórico e validação.
 </h1>

 <p className="text-zinc-600 font-semibold mt-4 leading-7 max-w-3xl">
 Aqui os usuários podem abrir confrontos 1x1, 2x2, 3x3 e 4x4,
 definir regra de mobile e emulador, escolher administração da disputa
 e analisar o histórico antes de aceitar um adversário.
 </p>

 <div className="flex flex-wrap gap-3 mt-6">
 <Link
 href="/confrontos/nova"
 className="h-12 px-5 bg-[#2563eb] text-[#142340] font-semibold text-sm uppercase tracking-[0.12em] inline-flex items-center justify-center gap-2 hover:bg-[#11913a] transition-colors"
 >
 <Plus size={18} />
 Criar confronto
 </Link>

 <Link
 href="/apostadores"
 className="h-12 px-5 border border-zinc-300 bg-white text-zinc-800 font-semibold text-sm uppercase tracking-[0.12em] inline-flex items-center justify-center gap-2 hover:bg-zinc-50 transition-colors"
 >
 <UserCircle2 size={18} />
 Ver apostadores
 </Link>
 </div>
 </div>

 <div className=" border border-zinc-200 bg-white p-5 md:p-6">
 <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-zinc-500 mb-4">
 RESUMO
 </p>

 <div className="grid grid-cols-2 gap-3">
 <MiniResumo titulo="Confrontos" valor={String(resumo.total)} />
 <MiniResumo titulo="Abertos" valor={String(resumo.abertas)} />
 <MiniResumo titulo="Em andamento" valor={String(resumo.emAndamento)} />
 <MiniResumo titulo="Finalizados" valor={String(resumo.finalizadas)} />
 </div>

 <div className="mt-4 p-4 border border-zinc-200 bg-zinc-50">
 <div className="flex items-start gap-3">
 <div className="w-10 h-10 border border-zinc-200 bg-white flex items-center justify-center shrink-0">
 <Shield size={18} className="text-zinc-700" />
 </div>

 <div>
 <div className="text-sm font-semibold uppercase tracking-[0.14em] text-zinc-800">
 Histórico e confiança
 </div>
 <p className="text-sm text-zinc-500 font-semibold mt-1 leading-6">
 O objetivo dessa área é facilitar a escolha do adversário com base em
 histórico, administração e reputação.
 </p>
 </div>
 </div>
 </div>
 </div>
 </div>

 <div className="mt-5 grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr] gap-3">
 <div className=" border border-zinc-200 bg-white px-4 h-14 flex items-center gap-3">
 <Search size={18} className="text-zinc-500 shrink-0" />
 <input
 value={busca}
 onChange={(e) => setBusca(e.target.value)}
 placeholder="Buscar por confronto, criador ou time..."
 className="w-full outline-none bg-transparent font-semibold text-zinc-800 placeholder:text-zinc-500"
 />
 </div>

 <SelectFiltro
 icon={<Filter size={16} />}
 value={filtroFormato}
 onChange={setFiltroFormato}
 options={FORMATOS}
 />

 <SelectFiltro
 icon={<Smartphone size={16} />}
 value={filtroRegra}
 onChange={setFiltroRegra}
 options={REGRAS}
 />

 <SelectFiltro
 icon={<CircleDot size={16} />}
 value={filtroStatus}
 onChange={setFiltroStatus}
 options={STATUS}
 />
 </div>
 </div>
 </div>

 <div className="max-w-7xl mx-auto px-4 md:px-8 xl:px-10 py-6 md:py-8 xl:py-10">
 {loading && (
 <div className="bg-white border border-zinc-200 p-10 flex items-center justify-center gap-3">
 <Loader2 size={20} className="animate-spin" />
 <span className="font-semibold uppercase text-sm tracking-[0.2em]">Carregando confrontos...</span>
 </div>
 )}

 {!loading && erro && (
 <div className="bg-red-50 border border-red-200 p-6 flex items-start gap-3">
 <AlertTriangle className="text-red-600 shrink-0 mt-0.5" size={18} />
 <div>
 <p className="font-semibold uppercase text-red-700 text-sm">Erro ao carregar</p>
 <p className="text-red-600 font-semibold text-sm mt-1">{erro}</p>
 </div>
 </div>
 )}

 {!loading && !erro && confrontosFiltrados.length === 0 && (
 <div className="bg-white border border-zinc-200 p-10 text-center">
 <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-zinc-500 mb-2">
 SEM RESULTADOS
 </p>
 <h2 className="text-2xl md:text-3xl font-semibold text-zinc-900">
 Nenhum confronto encontrado
 </h2>
 <p className="text-zinc-500 font-semibold mt-3 max-w-2xl mx-auto">
 Tenta mudar os filtros ou criar o primeiro confronto dessa categoria.
 </p>

 <Link
 href="/confrontos/nova"
 className="mt-5 inline-flex items-center gap-2 h-12 px-5 bg-[#2563eb] text-[#142340] font-semibold text-sm uppercase tracking-[0.12em] hover:bg-[#11913a] transition-colors"
 >
 <Plus size={18} />
 Criar confronto
 </Link>
 </div>
 )}

 {!loading && !erro && confrontosFiltrados.length > 0 && (
 <div className="space-y-4">
 {confrontosFiltrados.map((item) => (
 <CardConfronto key={item.id} item={item} />
 ))}
 </div>
 )}
 </div>
 </div>
 )
}

function CardConfronto({ item }: { item: ConfrontoCard }) {
 const status = getStatusStyle(item.status)
 const adminMode = getAdminModeLabel(item.admin_mode)
 const regra = getRegraPlataformaLabel(item.regra_plataforma)

 return (
 <div className="bg-white border border-zinc-200 p-5 md:p-6">
 <div className="flex flex-col gap-5">
 <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-5">
 <div className="min-w-0">
 <div className="flex flex-wrap items-center gap-2 mb-3">
 <TagTexto className={status.className} label={status.label} />
 <TagTexto className="bg-zinc-100 text-zinc-700 border-zinc-200" label={item.formato} />
 <TagTexto className="bg-blue-50 text-blue-700 border-blue-200" label={regra} />
 <TagTexto className="bg-yellow-50 text-yellow-800 border-yellow-200" label={adminMode} />
 </div>

 <h2 className="text-2xl font-semibold text-zinc-900 leading-tight break-words">
 {item.titulo}
 </h2>

 <p className="text-sm text-zinc-500 font-semibold mt-2 leading-6 max-w-4xl">
 {textoSeguro(item.descricao, 'Sem descrição adicional.')}
 </p>

 <div className="flex flex-wrap items-center gap-3 mt-4">
 <div className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-800">
 <img
 src={item.criador_foto_url || '/placeholder.png'}
 alt={item.criador_nick}
 className="w-9 h-9 rounded-full object-cover border border-zinc-200 bg-white"
 />
 <span>{item.criador_nick}</span>
 </div>

 <div className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-500">
 <Clock3 size={15} />
 Criado em {formatarDataCurta(item.created_at)}
 </div>

 {item.data_partida && (
 <div className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-500">
 <Trophy size={15} />
 Partida {formatarDataCurta(item.data_partida)}
 </div>
 )}
 </div>
 </div>

 <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-2 gap-3 xl:min-w-[280px]">
 <MiniResumo titulo="Por lado" valor={formatarMoeda(item.valor_por_lado)} />
 <MiniResumo titulo="Total" valor={formatarMoeda(item.valor_total)} />
 <MiniResumo titulo="Admins" valor={String(item.total_admins)} />
 <MiniResumo titulo="Criador" valor={item.criador_nick} menor />
 </div>
 </div>

 <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
 <CardLado
 titulo={item.lado_a.nome_time}
 lado="Lado A"
 totalJogadores={item.lado_a.total_jogadores}
 pagamentoStatus={item.lado_a.status_pagamento}
 valorPago={item.lado_a.valor_pago}
 />

 <CardLado
 titulo={item.lado_b.nome_time}
 lado="Lado B"
 totalJogadores={item.lado_b.total_jogadores}
 pagamentoStatus={item.lado_b.status_pagamento}
 valorPago={item.lado_b.valor_pago}
 />
 </div>

 <div className="flex flex-wrap justify-end gap-3 pt-1">
 <Link
 href={`/apostadores/${item.criado_por_user_id}`}
 className="h-11 px-5 border border-zinc-300 bg-white text-zinc-800 font-semibold text-[11px] uppercase tracking-[0.18em] inline-flex items-center gap-2 hover:bg-zinc-50 transition-colors"
 >
 <UserCircle2 size={15} />
 Ver apostador
 </Link>

 <Link
 href={`/confrontos/${item.id}`}
 className="h-11 px-5 bg-white text-[#142340] font-semibold text-[11px] uppercase tracking-[0.18em] inline-flex items-center gap-2 hover:bg-[#2563eb] transition-colors"
 >
 Ver confronto
 <ChevronRight size={15} />
 </Link>
 </div>
 </div>
 </div>
 )
}

function CardLado({
 titulo,
 lado,
 totalJogadores,
 pagamentoStatus,
 valorPago,
}: {
 titulo: string
 lado: string
 totalJogadores: number
 pagamentoStatus: string
 valorPago: number
}) {
 const pagamento = getPagamentoStatusStyle(pagamentoStatus)

 return (
 <div className=" border border-zinc-200 bg-zinc-50 p-4">
 <div className="flex items-start justify-between gap-3">
 <div>
 <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
 {lado}
 </div>
 <div className="text-lg font-semibold text-zinc-900 mt-1 break-words">
 {titulo}
 </div>
 </div>

 <span className={`px-2.5 py-1 border text-[10px] font-semibold uppercase tracking-[0.14em] ${pagamento.className}`}>
 {pagamento.label}
 </span>
 </div>

 <div className="grid grid-cols-2 gap-3 mt-4">
 <IndicadorLado
 icon={<Users size={15} />}
 label="Jogadores"
 valor={String(totalJogadores)}
 />
 <IndicadorLado
 icon={<Wallet size={15} />}
 label="Pago"
 valor={formatarMoeda(valorPago)}
 />
 </div>
 </div>
 )
}

function IndicadorLado({
 icon,
 label,
 valor,
}: {
 icon: React.ReactNode
 label: string
 valor: string
}) {
 return (
 <div className=" border border-zinc-200 bg-white px-3 py-3">
 <div className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
 {icon}
 {label}
 </div>
 <div className="text-sm font-semibold text-zinc-900 mt-2">{valor}</div>
 </div>
 )
}

function SelectFiltro<T extends string>({
 icon,
 value,
 onChange,
 options,
}: {
 icon: React.ReactNode
 value: T
 onChange: (value: T) => void
 options: Array<{ value: T; label: string }>
}) {
 return (
 <div className=" border border-zinc-200 bg-white px-4 h-14 flex items-center gap-3">
 <div className="text-zinc-500 shrink-0">{icon}</div>
 <select
 value={value}
 onChange={(e) => onChange(e.target.value as T)}
 className="w-full outline-none bg-transparent font-semibold text-zinc-800"
 >
 {options.map((item) => (
 <option key={item.value} value={item.value}>
 {item.label}
 </option>
 ))}
 </select>
 </div>
 )
}

function MiniResumo({
 titulo,
 valor,
 menor = false,
}: {
 titulo: string
 valor: string
 menor?: boolean
}) {
 return (
 <div className=" border border-zinc-200 bg-zinc-50 p-3 min-w-0">
 <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
 {titulo}
 </div>
 <div className={`${menor ? 'text-base' : 'text-2xl md:text-3xl'} font-semibold mt-2 leading-none text-zinc-900 break-words`}>
 {valor}
 </div>
 </div>
 )
}

function TagTexto({ label, className }: { label: string; className: string }) {
 return (
 <span className={`px-2.5 py-1 border text-[10px] font-semibold uppercase tracking-[0.14em] ${className}`}>
 {label}
 </span>
 )
}

function textoSeguro(valor: any, fallback = '') {
 const texto = String(valor || '').trim()
 return texto || fallback
}

function numeroSeguro(valor: any) {
 const numero = Number(valor)
 return Number.isFinite(numero) ? numero : 0
}

function formatarMoeda(valor: number | null | undefined) {
 const numero = Number(valor)
 if (!Number.isFinite(numero)) return 'R$ 0,00'
 return numero.toLocaleString('pt-BR', {
 style: 'currency',
 currency: 'BRL',
 })
}

function formatarDataCurta(valor?: string | null) {
 if (!valor) return '—'
 const data = new Date(valor)
 if (Number.isNaN(data.getTime())) return '—'
 return data.toLocaleDateString('pt-BR', {
 day: '2-digit',
 month: '2-digit',
 year: 'numeric',
 })
}

function getStatusStyle(status?: string | null) {
 const valor = String(status || '').toLowerCase()

 switch (valor) {
 case 'aberto':
 return {
 label: 'Aberto',
 className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
 }
 case 'aguardando_oponente':
 return {
 label: 'Aguardando oponente',
 className: 'bg-lime-50 text-lime-700 border-lime-200',
 }
 case 'aguardando_pagamento':
 return {
 label: 'Aguardando pagamento',
 className: 'bg-yellow-50 text-yellow-800 border-yellow-200',
 }
 case 'pronto':
 return {
 label: 'Pronto',
 className: 'bg-blue-50 text-blue-700 border-blue-200',
 }
 case 'em_jogo':
 return {
 label: 'Em jogo',
 className: 'bg-violet-50 text-violet-700 border-violet-200',
 }
 case 'aguardando_resultado':
 return {
 label: 'Aguardando resultado',
 className: 'bg-orange-50 text-orange-700 border-orange-200',
 }
 case 'aguardando_validacao':
 return {
 label: 'Aguardando validação',
 className: 'bg-amber-50 text-amber-800 border-amber-200',
 }
 case 'finalizado':
 return {
 label: 'Finalizado',
 className: 'bg-zinc-100 text-zinc-700 border-zinc-300',
 }
 case 'cancelado':
 return {
 label: 'Cancelado',
 className: 'bg-red-50 text-red-700 border-red-200',
 }
 case 'reembolsado':
 return {
 label: 'Reembolsado',
 className: 'bg-sky-50 text-sky-700 border-sky-200',
 }
 default:
 return {
 label: textoSeguro(status, 'Sem status'),
 className: 'bg-zinc-100 text-zinc-700 border-zinc-300',
 }
 }
}

function getPagamentoStatusStyle(status?: string | null) {
 const valor = String(status || '').toLowerCase()

 switch (valor) {
 case 'pago':
 return {
 label: 'Pago',
 className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
 }
 case 'pendente':
 return {
 label: 'Pendente',
 className: 'bg-yellow-50 text-yellow-800 border-yellow-200',
 }
 case 'falhou':
 return {
 label: 'Falhou',
 className: 'bg-red-50 text-red-700 border-red-200',
 }
 case 'estornado':
 return {
 label: 'Estornado',
 className: 'bg-sky-50 text-sky-700 border-sky-200',
 }
 case 'liberado':
 return {
 label: 'Liberado',
 className: 'bg-blue-50 text-blue-700 border-blue-200',
 }
 default:
 return {
 label: textoSeguro(status, 'Sem status'),
 className: 'bg-zinc-100 text-zinc-700 border-zinc-300',
 }
 }
}

function getRegraPlataformaLabel(valor?: string | null) {
 switch (valor) {
 case 'full_mobile':
 return 'Full mobile'
 case 'permite_1_emulador':
 return 'Permite 1 emulador'
 case 'permite_2_emuladores':
 return 'Permite 2 emuladores'
 case 'permite_3_emuladores':
 return 'Permite 3 emuladores'
 case 'full_emulador':
 return 'Full emulador'
 default:
 return textoSeguro(valor, 'Sem regra')
 }
}

function getAdminModeLabel(valor?: string | null) {
 switch (valor) {
 case 'plataforma':
 return 'Admin da plataforma'
 case 'privado':
 return 'Admin privado'
 case 'misto':
 return 'Admin misto'
 default:
 return textoSeguro(valor, 'Sem admin')
 }
}