'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import {
 AlertTriangle,
 ArrowLeft,
 CalendarDays,
 CheckCircle2,
 ChevronRight,
 Loader2,
 Plus,
 Shield,
 ShieldCheck,
 Smartphone,
 Swords,
 UserCircle2,
 Wallet,
} from 'lucide-react'

type FormatoConfronto = '1x1' | '2x2' | '3x3' | '4x4'
type RegraPlataforma =
 | 'full_mobile'
 | 'permite_1_emulador'
 | 'permite_2_emuladores'
 | 'permite_3_emuladores'
 | 'full_emulador'

type AdminMode = 'plataforma' | 'privado' | 'misto'

type PerfilJogoRow = {
 id: string
 user_id: string
 nick: string
 uid_jogo: string | null
 servidor: string | null
 funcao: string | null
 plataforma: string | null
 foto_capa: string | null
 ativo: boolean | null
 equipe_id: string | null
 created_at?: string | null
 updated_at?: string | null
}

type AdminPerfil = {
 id: string
 user_id: string
 nick: string
 foto_capa: string | null
}

const FORMATOS: Array<{ value: FormatoConfronto; label: string; maxPlayers: number }> = [
 { value: '1x1', label: '1x1', maxPlayers: 1 },
 { value: '2x2', label: '2x2', maxPlayers: 2 },
 { value: '3x3', label: '3x3', maxPlayers: 3 },
 { value: '4x4', label: '4x4', maxPlayers: 4 },
]

const REGRAS: Array<{ value: RegraPlataforma; label: string; descricao: string }> = [
 {
 value: 'full_mobile',
 label: 'Full mobile',
 descricao: 'Somente jogadores no mobile.',
 },
 {
 value: 'permite_1_emulador',
 label: 'Permite 1 emulador',
 descricao: 'Cada lado pode usar até 1 emulador.',
 },
 {
 value: 'permite_2_emuladores',
 label: 'Permite 2 emuladores',
 descricao: 'Cada lado pode usar até 2 emuladores.',
 },
 {
 value: 'permite_3_emuladores',
 label: 'Permite 3 emuladores',
 descricao: 'Cada lado pode usar até 3 emuladores.',
 },
 {
 value: 'full_emulador',
 label: 'Full emulador',
 descricao: 'Liberado time inteiro em emulador.',
 },
]

const ADMIN_MODES: Array<{ value: AdminMode; label: string; descricao: string }> = [
 {
 value: 'plataforma',
 label: 'Admin da plataforma',
 descricao: 'A plataforma escolhe ou opera a administração da disputa.',
 },
 {
 value: 'privado',
 label: 'Admin privado',
 descricao: 'Você escolhe administradores específicos para validar.',
 },
 {
 value: 'misto',
 label: 'Admin misto',
 descricao: 'Aceita admin da plataforma e admins privados convidados.',
 },
]

export default function NovoConfrontoPage() {
 const router = useRouter()

 const [loadingPerfil, setLoadingPerfil] = useState(true)
 const [salvando, setSalvando] = useState(false)
 const [erro, setErro] = useState('')
 const [sucesso, setSucesso] = useState('')
 const [debugInfo, setDebugInfo] = useState('')
 const [userId, setUserId] = useState<string | null>(null)
 const [perfil, setPerfil] = useState<PerfilJogoRow | null>(null)

 const [adminsDisponiveis, setAdminsDisponiveis] = useState<AdminPerfil[]>([])
 const [loadingAdmins, setLoadingAdmins] = useState(false)

 const [titulo, setTitulo] = useState('')
 const [descricao, setDescricao] = useState('')
 const [formato, setFormato] = useState<FormatoConfronto>('4x4')
 const [regraPlataforma, setRegraPlataforma] = useState<RegraPlataforma>('full_mobile')
 const [valorPorLado, setValorPorLado] = useState('')
 const [adminMode, setAdminMode] = useState<AdminMode>('plataforma')
 const [dataPartida, setDataPartida] = useState('')
 const [prazoAceite, setPrazoAceite] = useState('')
 const [nomeTimeA, setNomeTimeA] = useState('')
 const [usarMeuNickComoTime, setUsarMeuNickComoTime] = useState(true)
 const [adminsSelecionados, setAdminsSelecionados] = useState<string[]>([])

 useEffect(() => {
 carregarBase()
 }, [])

 useEffect(() => {
 if (adminMode === 'plataforma') {
 setAdminsSelecionados([])
 return
 }

 carregarAdmins()
 }, [adminMode, userId])

 const formatoInfo = useMemo(() => {
 return FORMATOS.find((item) => item.value === formato) || FORMATOS[3]
 }, [formato])

 const valorNumerico = useMemo(() => {
 return numeroSeguro(valorPorLado)
 }, [valorPorLado])

 const valorTotal = useMemo(() => {
 return valorNumerico * 2
 }, [valorNumerico])

 const nomeTimeAFinal = useMemo(() => {
 if (usarMeuNickComoTime) {
 return textoSeguro(perfil?.nick, 'Meu time')
 }
 return textoSeguro(nomeTimeA, '')
 }, [usarMeuNickComoTime, perfil?.nick, nomeTimeA])

 async function carregarBase() {
 setLoadingPerfil(true)
 setErro('')
 setDebugInfo('')
 setPerfil(null)

 try {
 const authResponse = await supabase.auth.getUser()
 const authError = authResponse.error
 const uid = authResponse.data?.user?.id || null

 if (authError) {
 console.error('auth.getUser error', authError)
 setErro('Não foi possível validar seu login agora.')
 setDebugInfo('auth_error')
 return
 }

 setUserId(uid)

 if (!uid) {
 setErro('Você precisa estar logado para criar um confronto.')
 setDebugInfo('sem_user_id')
 return
 }

 const { data, error } = await supabase
 .from('perfis_jogo')
 .select('*')
 .eq('user_id', uid)

 if (error) {
 console.error('perfis_jogo query error', error)
 setErro('Não foi possível carregar seu perfil de jogo agora.')
 setDebugInfo('perfis_jogo_query_error')
 return
 }

 const perfis = ((data || []) as PerfilJogoRow[]).filter(Boolean)

 if (perfis.length === 0) {
 setErro('Perfil de jogo não encontrado para este usuário.')
 setDebugInfo(`uid=${uid} | perfis=0`)
 return
 }

 const ativos = perfis.filter((item) => item.ativo === true)
 const baseEscolha = ativos.length > 0 ? ativos : perfis

 const ordenados = [...baseEscolha].sort((a, b) => {
 const aUpdated = a.updated_at ? new Date(a.updated_at).getTime() : 0
 const bUpdated = b.updated_at ? new Date(b.updated_at).getTime() : 0
 if (bUpdated !== aUpdated) return bUpdated - aUpdated

 const aCreated = a.created_at ? new Date(a.created_at).getTime() : 0
 const bCreated = b.created_at ? new Date(b.created_at).getTime() : 0
 return bCreated - aCreated
 })

 const perfilSelecionado = ordenados[0] || null
 setPerfil(perfilSelecionado)
 setDebugInfo(`uid=${uid} | total=${perfis.length} | ativos=${ativos.length}`)
 } catch (err) {
 console.error('carregarBase fatal', err)
 setErro('Não foi possível carregar seus dados agora.')
 setDebugInfo('catch_fatal')
 } finally {
 setLoadingPerfil(false)
 }
 }

 async function carregarAdmins() {
 setLoadingAdmins(true)

 try {
 const { data, error } = await supabase
 .from('perfis_jogo')
 .select('id, user_id, nick, foto_capa, ativo, updated_at, created_at')
 .eq('ativo', true)

 if (error) {
 console.error('carregarAdmins error', error)
 setAdminsDisponiveis([])
 return
 }

 const porUser = new Map<string, AdminPerfil & { updated_at?: string | null; created_at?: string | null }>()

 for (const item of (data || []) as any[]) {
 if (!item?.user_id) continue
 if (item.user_id === userId) continue

 const atual = porUser.get(item.user_id)

 if (!atual) {
 porUser.set(item.user_id, item)
 continue
 }

 const atualTs = atual.updated_at ? new Date(atual.updated_at).getTime() : 0
 const novoTs = item.updated_at ? new Date(item.updated_at).getTime() : 0

 if (novoTs > atualTs) {
 porUser.set(item.user_id, item)
 }
 }

 const lista = Array.from(porUser.values())
 .map((item) => ({
 id: item.id,
 user_id: item.user_id,
 nick: item.nick,
 foto_capa: item.foto_capa,
 }))
 .sort((a, b) => a.nick.localeCompare(b.nick))

 setAdminsDisponiveis(lista)
 } catch (err) {
 console.error('carregarAdmins fatal', err)
 setAdminsDisponiveis([])
 } finally {
 setLoadingAdmins(false)
 }
 }

 function toggleAdmin(userIdAdmin: string) {
 setAdminsSelecionados((prev) => {
 if (prev.includes(userIdAdmin)) {
 return prev.filter((item) => item !== userIdAdmin)
 }
 return [...prev, userIdAdmin]
 })
 }

 async function criarConfronto(e: React.FormEvent) {
 e.preventDefault()
 setErro('')
 setSucesso('')

 if (!userId) {
 setErro('Você precisa estar logado para criar um confronto.')
 return
 }

 if (!perfil) {
 setErro('Você precisa ter um perfil de jogo ativo antes de abrir um confronto.')
 return
 }

 if (!titulo.trim()) {
 setErro('Preencha o título do confronto.')
 return
 }

 if (!nomeTimeAFinal.trim()) {
 setErro('Defina o nome do seu lado/time.')
 return
 }

 if (valorNumerico <= 0) {
 setErro('Informe um valor por lado maior que zero.')
 return
 }

 if ((adminMode === 'privado' || adminMode === 'misto') && adminsSelecionados.length === 0) {
 setErro('Selecione pelo menos um administrador para esse modo.')
 return
 }

 setSalvando(true)

 try {
 const payloadConfronto = {
 titulo: titulo.trim(),
 descricao: descricao.trim() || null,
 criado_por_user_id: userId,
 formato,
 regra_plataforma: regraPlataforma,
 valor_por_lado: valorNumerico,
 status: 'aberto',
 admin_mode: adminMode,
 data_partida: dataPartida || null,
 prazo_aceite: prazoAceite || null,
 }

 const { data: confrontoInserido, error: confrontoError } = await supabase
 .from('confrontos_apostados')
 .insert(payloadConfronto)
 .select('id')
 .single()

 if (confrontoError) throw confrontoError

 const confrontoId = String(confrontoInserido.id)

 const { data: timeInserido, error: timeError } = await supabase
 .from('confrontos_times')
 .insert({
 confronto_id: confrontoId,
 lado: 'a',
 nome_time: nomeTimeAFinal.trim(),
 capitao_user_id: userId,
 status_pagamento: 'pendente',
 valor_pago: 0,
 })
 .select('id')
 .single()

 if (timeError) throw timeError

 const timeAId = String(timeInserido.id)

 const { error: jogadorError } = await supabase.from('confrontos_jogadores').insert({
 confronto_time_id: timeAId,
 user_id: userId,
 nick_snapshot: perfil.nick,
 plataforma:
 perfil.plataforma || (regraPlataforma === 'full_emulador' ? 'emulador' : 'mobile'),
 funcao: perfil.funcao || 'capitao',
 confirmado_em: new Date().toISOString(),
 })

 if (jogadorError) throw jogadorError

 if (adminMode === 'privado' || adminMode === 'misto') {
 const adminsPayload = adminsSelecionados.map((adminUserId) => ({
 confronto_id: confrontoId,
 admin_user_id: adminUserId,
 tipo: 'convidado',
 status: 'pendente',
 }))

 if (adminsPayload.length > 0) {
 const { error: adminsError } = await supabase
 .from('confrontos_admins')
 .insert(adminsPayload)

 if (adminsError) throw adminsError
 }
 }

 setSucesso('Confronto criado com sucesso.')
 setTimeout(() => {
 router.push(`/confrontos/${confrontoId}`)
 }, 700)
 } catch (err) {
 console.error('criarConfronto', err)
 setErro('Não foi possível criar o confronto agora.')
 } finally {
 setSalvando(false)
 }
 }

 return (
 <div className="min-h-screen bg-[#f6f7f8]">
 <div className="border-b border-zinc-200 bg-white">
 <div className="max-w-6xl mx-auto px-4 md:px-8 xl:px-10 py-6 md:py-8">
 <div className="flex flex-col gap-4">
 <div className="flex flex-wrap items-center gap-3">
 <Link
 href="/confrontos"
 className="h-10 px-4 border border-zinc-300 bg-white text-zinc-800 font-semibold text-[11px] uppercase tracking-[0.18em] inline-flex items-center gap-2 hover:bg-zinc-50 transition-colors"
 >
 <ArrowLeft size={15} />
 Voltar
 </Link>

 <div className="h-10 px-4 bg-[#2563eb] text-[#142340] font-semibold text-[11px] uppercase tracking-[0.18em] inline-flex items-center gap-2">
 <Plus size={15} />
 Novo confronto
 </div>
 </div>

 <div className="grid grid-cols-1 xl:grid-cols-[1.45fr_0.95fr] gap-5">
 <div className=" border border-zinc-200 bg-[#f8fbf9] p-5 md:p-7">
 <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#2563eb] mb-3">
 // CADASTRAR DISPUTA
 </p>

 <h1 className="text-3xl md:text-5xl font-semibold leading-none text-zinc-900">
 Abra um confronto apostado e defina as regras do duelo.
 </h1>

 <p className="text-zinc-600 font-semibold mt-4 leading-7 max-w-3xl">
 Escolha formato, regra de mobile/emulador, valor por lado,
 administração da disputa e dados do seu time. Depois disso,
 o confronto entra na vitrine para um adversário aceitar.
 </p>
 </div>

 <div className=" border border-zinc-200 bg-white p-5 md:p-6">
 <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-zinc-500 mb-4">
 PRÉVIA
 </p>

 <div className="grid grid-cols-2 gap-3">
 <MiniResumo titulo="Formato" valor={formato} />
 <MiniResumo titulo="Por lado" valor={formatarMoeda(valorNumerico)} />
 <MiniResumo titulo="Total" valor={formatarMoeda(valorTotal)} />
 <MiniResumo
 titulo="Admin"
 valor={ADMIN_MODES.find((item) => item.value === adminMode)?.label || '—'}
 menor
 />
 </div>

 <div className="mt-4 p-4 border border-zinc-200 bg-zinc-50">
 <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
 Seu lado
 </div>
 <div className="text-lg font-semibold text-zinc-900 mt-2">
 {textoSeguro(nomeTimeAFinal, 'Seu time')}
 </div>
 <div className="text-sm text-zinc-500 font-semibold mt-2 leading-6">
 {REGRAS.find((item) => item.value === regraPlataforma)?.descricao}
 </div>
 <div className="text-sm text-zinc-500 font-semibold mt-2 leading-6">
 Limite por lado: {formatoInfo.maxPlayers} jogador(es)
 </div>
 </div>
 </div>
 </div>
 </div>
 </div>
 </div>

 <div className="max-w-6xl mx-auto px-4 md:px-8 xl:px-10 py-6 md:py-8 xl:py-10">
 {loadingPerfil && (
 <div className="bg-white border border-zinc-200 p-10 flex items-center justify-center gap-3">
 <Loader2 size={20} className="animate-spin" />
 <span className="font-semibold uppercase text-sm tracking-[0.2em]">
 Carregando dados...
 </span>
 </div>
 )}

 {!loadingPerfil && !userId && (
 <div className="bg-red-50 border border-red-200 p-6 flex items-start gap-3">
 <AlertTriangle className="text-red-600 shrink-0 mt-0.5" size={18} />
 <div>
 <p className="font-semibold uppercase text-red-700 text-sm">Login necessário</p>
 <p className="text-red-600 font-semibold text-sm mt-1">
 Você precisa estar logado para criar um confronto.
 </p>
 </div>
 </div>
 )}

 {!loadingPerfil && userId && !perfil && (
 <div className="bg-yellow-50 border border-yellow-200 p-6">
 <div className="flex items-start gap-3">
 <AlertTriangle className="text-yellow-700 shrink-0 mt-0.5" size={18} />
 <div>
 <p className="font-semibold uppercase text-yellow-800 text-sm">
 Perfil de jogo não encontrado
 </p>
 <p className="text-yellow-700 font-semibold text-sm mt-1 leading-6">
 Antes de abrir disputas, você precisa ter um registro em
 <strong> perfis_jogo</strong>.
 </p>
 {debugInfo && (
 <p className="text-xs text-yellow-800 mt-3 font-mono break-all">{debugInfo}</p>
 )}
 </div>
 </div>
 </div>
 )}

 {!loadingPerfil && userId && perfil && (
 <form
 onSubmit={criarConfronto}
 className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.85fr] gap-6"
 >
 <div className="space-y-6">
 <div className="bg-white border border-zinc-200 p-5 md:p-6">
 <div className="flex items-center gap-3 mb-5">
 <div className="w-11 h-11 border border-zinc-200 bg-zinc-50 flex items-center justify-center">
 <Swords size={20} className="text-zinc-700" />
 </div>
 <div>
 <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
 DADOS DO CONFRONTO
 </p>
 <h2 className="text-xl font-semibold text-zinc-900 mt-1">
 Informações principais
 </h2>
 </div>
 </div>

 <div className="space-y-5">
 <Campo>
 <Label>Título do confronto</Label>
 <input
 value={titulo}
 onChange={(e) => setTitulo(e.target.value)}
 placeholder="Ex: X1 valendo 50 hoje 22h"
 className="w-full h-12 border border-zinc-300 px-4 bg-white outline-none font-semibold"
 />
 </Campo>

 <Campo>
 <Label>Descrição / regras extras</Label>
 <textarea
 value={descricao}
 onChange={(e) => setDescricao(e.target.value)}
 placeholder="Ex: sem atraso, sala tal horário, prova obrigatória, etc."
 className="w-full min-h-[140px] border border-zinc-300 px-4 py-3 bg-white outline-none font-semibold resize-y"
 />
 </Campo>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
 <Campo>
 <Label>Formato</Label>
 <div className="grid grid-cols-2 gap-3">
 {FORMATOS.map((item) => (
 <button
 key={item.value}
 type="button"
 onClick={() => setFormato(item.value)}
 className={` border px-4 py-4 text-left transition-colors ${
 formato === item.value
 ? 'border-[#2563eb] bg-[#eefaf1]'
 : 'border-zinc-200 bg-white hover:bg-zinc-50'
 }`}
 >
 <div className="text-lg font-semibold text-zinc-900">{item.label}</div>
 <div className="text-sm text-zinc-500 font-semibold mt-1">
 {item.maxPlayers} por lado
 </div>
 </button>
 ))}
 </div>
 </Campo>

 <Campo>
 <Label>Regra da plataforma</Label>
 <div className="space-y-3">
 {REGRAS.map((item) => (
 <button
 key={item.value}
 type="button"
 onClick={() => setRegraPlataforma(item.value)}
 className={`w-full border px-4 py-4 text-left transition-colors ${
 regraPlataforma === item.value
 ? 'border-[#2563eb] bg-[#eefaf1]'
 : 'border-zinc-200 bg-white hover:bg-zinc-50'
 }`}
 >
 <div className="flex items-start gap-3">
 <div className="w-10 h-10 border border-zinc-200 bg-white flex items-center justify-center shrink-0">
 <Smartphone size={18} className="text-zinc-700" />
 </div>
 <div>
 <div className="text-sm font-semibold uppercase tracking-[0.12em] text-zinc-900">
 {item.label}
 </div>
 <div className="text-sm text-zinc-500 font-semibold mt-1 leading-6">
 {item.descricao}
 </div>
 </div>
 </div>
 </button>
 ))}
 </div>
 </Campo>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
 <Campo>
 <Label>Valor por lado</Label>
 <div className="relative">
 <Wallet
 size={16}
 className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500"
 />
 <input
 value={valorPorLado}
 onChange={(e) => setValorPorLado(e.target.value)}
 placeholder="50"
 className="w-full h-12 border border-zinc-300 pl-11 pr-4 bg-white outline-none font-semibold"
 />
 </div>
 </Campo>

 <Campo>
 <Label>Data da partida</Label>
 <div className="relative">
 <CalendarDays
 size={16}
 className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500"
 />
 <input
 type="datetime-local"
 value={dataPartida}
 onChange={(e) => setDataPartida(e.target.value)}
 className="w-full h-12 border border-zinc-300 pl-11 pr-4 bg-white outline-none font-semibold"
 />
 </div>
 </Campo>

 <Campo>
 <Label>Prazo para aceitar</Label>
 <div className="relative">
 <CalendarDays
 size={16}
 className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500"
 />
 <input
 type="datetime-local"
 value={prazoAceite}
 onChange={(e) => setPrazoAceite(e.target.value)}
 className="w-full h-12 border border-zinc-300 pl-11 pr-4 bg-white outline-none font-semibold"
 />
 </div>
 </Campo>
 </div>
 </div>
 </div>

 <div className="bg-white border border-zinc-200 p-5 md:p-6">
 <div className="flex items-center gap-3 mb-5">
 <div className="w-11 h-11 border border-zinc-200 bg-zinc-50 flex items-center justify-center">
 <UserCircle2 size={20} className="text-zinc-700" />
 </div>
 <div>
 <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
 SEU LADO
 </p>
 <h2 className="text-xl font-semibold text-zinc-900 mt-1">
 Configuração inicial do lado A
 </h2>
 </div>
 </div>

 <div className="space-y-5">
 <div className=" border border-zinc-200 bg-zinc-50 px-4 py-4">
 <div className="flex items-center gap-3">
 <img
 src={perfil.foto_capa || '/placeholder.png'}
 alt={perfil.nick}
 className="w-12 h-12 rounded-full object-cover border border-zinc-200 bg-white"
 />
 <div>
 <div className="text-lg font-semibold text-zinc-900">{perfil.nick}</div>
 <div className="text-sm text-zinc-500 font-semibold">
 Criador e capitão inicial da disputa
 </div>
 </div>
 </div>
 </div>

 <label className=" border border-zinc-200 bg-zinc-50 px-4 py-4 flex items-start gap-3 cursor-pointer">
 <input
 type="checkbox"
 checked={usarMeuNickComoTime}
 onChange={(e) => setUsarMeuNickComoTime(e.target.checked)}
 className="mt-1"
 />
 <div>
 <div className="text-sm font-semibold uppercase text-zinc-800">
 Usar meu nick como nome do lado
 </div>
 <div className="text-sm text-zinc-500 font-semibold mt-1 leading-6">
 Desmarque se quiser colocar um nome próprio para seu time/lado.
 </div>
 </div>
 </label>

 {!usarMeuNickComoTime && (
 <Campo>
 <Label>Nome do seu time/lado</Label>
 <input
 value={nomeTimeA}
 onChange={(e) => setNomeTimeA(e.target.value)}
 placeholder="Ex: Team Aloe"
 className="w-full h-12 border border-zinc-300 px-4 bg-white outline-none font-semibold"
 />
 </Campo>
 )}
 </div>
 </div>

 <div className="bg-white border border-zinc-200 p-5 md:p-6">
 <div className="flex items-center gap-3 mb-5">
 <div className="w-11 h-11 border border-zinc-200 bg-zinc-50 flex items-center justify-center">
 <ShieldCheck size={20} className="text-zinc-700" />
 </div>
 <div>
 <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
 ADMINISTRAÇÃO
 </p>
 <h2 className="text-xl font-semibold text-zinc-900 mt-1">
 Como essa disputa será validada
 </h2>
 </div>
 </div>

 <div className="space-y-3">
 {ADMIN_MODES.map((item) => (
 <button
 key={item.value}
 type="button"
 onClick={() => setAdminMode(item.value)}
 className={`w-full border px-4 py-4 text-left transition-colors ${
 adminMode === item.value
 ? 'border-[#2563eb] bg-[#eefaf1]'
 : 'border-zinc-200 bg-white hover:bg-zinc-50'
 }`}
 >
 <div className="flex items-start gap-3">
 <div className="w-10 h-10 border border-zinc-200 bg-white flex items-center justify-center shrink-0">
 <Shield size={18} className="text-zinc-700" />
 </div>

 <div className="min-w-0">
 <div className="text-sm font-semibold uppercase tracking-[0.12em] text-zinc-900">
 {item.label}
 </div>
 <div className="text-sm text-zinc-500 font-semibold mt-1 leading-6">
 {item.descricao}
 </div>
 </div>
 </div>
 </button>
 ))}
 </div>

 {(adminMode === 'privado' || adminMode === 'misto') && (
 <div className="mt-5">
 <div className="flex items-center justify-between gap-3 mb-3">
 <Label>Selecionar administradores</Label>
 {loadingAdmins && (
 <div className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-500">
 <Loader2 size={15} className="animate-spin" />
 Carregando...
 </div>
 )}
 </div>

 <div className="space-y-3">
 {adminsDisponiveis.length === 0 && !loadingAdmins && (
 <div className=" border border-zinc-200 bg-zinc-50 px-4 py-4 text-sm font-semibold text-zinc-500">
 Nenhum admin disponível para selecionar agora.
 </div>
 )}

 {adminsDisponiveis.map((admin) => {
 const ativo = adminsSelecionados.includes(admin.user_id)

 return (
 <button
 key={admin.user_id}
 type="button"
 onClick={() => toggleAdmin(admin.user_id)}
 className={`w-full border px-4 py-4 text-left transition-colors ${
 ativo
 ? 'border-[#2563eb] bg-[#eefaf1]'
 : 'border-zinc-200 bg-white hover:bg-zinc-50'
 }`}
 >
 <div className="flex items-center justify-between gap-4">
 <div className="flex items-center gap-3 min-w-0">
 <img
 src={admin.foto_capa || '/placeholder.png'}
 alt={admin.nick}
 className="w-11 h-11 rounded-full object-cover border border-zinc-200 bg-white shrink-0"
 />
 <div className="min-w-0">
 <div className="text-sm font-semibold uppercase tracking-[0.12em] text-zinc-900 truncate">
 {admin.nick}
 </div>
 <div className="text-sm text-zinc-500 font-semibold">
 Admin convidado
 </div>
 </div>
 </div>

 {ativo ? (
 <CheckCircle2 size={18} className="text-[#2563eb] shrink-0" />
 ) : (
 <ChevronRight size={18} className="text-zinc-500 shrink-0" />
 )}
 </div>
 </button>
 )
 })}
 </div>
 </div>
 )}
 </div>
 </div>

 <div className="space-y-6">
 <div className="bg-white border border-zinc-200 p-5 md:p-6">
 <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-zinc-500 mb-4">
 RESUMO FINAL
 </p>

 <div className="space-y-3">
 <LinhaResumo label="Título" valor={textoSeguro(titulo, 'Não definido')} />
 <LinhaResumo label="Formato" valor={formato} />
 <LinhaResumo
 label="Regra"
 valor={REGRAS.find((item) => item.value === regraPlataforma)?.label || '—'}
 />
 <LinhaResumo label="Valor por lado" valor={formatarMoeda(valorNumerico)} />
 <LinhaResumo label="Valor total" valor={formatarMoeda(valorTotal)} />
 <LinhaResumo
 label="Admin"
 valor={ADMIN_MODES.find((item) => item.value === adminMode)?.label || '—'}
 />
 <LinhaResumo
 label="Seu time"
 valor={textoSeguro(nomeTimeAFinal, 'Não definido')}
 />
 </div>

 {(erro || sucesso) && (
 <div
 className={`mt-5 border px-4 py-3 text-sm font-semibold ${
 erro
 ? 'border-red-200 bg-red-50 text-red-700'
 : 'border-emerald-200 bg-emerald-50 text-emerald-700'
 }`}
 >
 {erro || sucesso}
 </div>
 )}

 <div className="flex flex-col gap-3 mt-5">
 <button
 type="submit"
 disabled={salvando}
 className="h-12 px-5 bg-[#2563eb] text-[#142340] font-semibold text-sm uppercase tracking-[0.12em] inline-flex items-center justify-center gap-2 hover:bg-[#11913a] transition-colors disabled:opacity-60"
 >
 {salvando ? (
 <>
 <Loader2 size={18} className="animate-spin" />
 Criando...
 </>
 ) : (
 <>
 <Plus size={18} />
 Criar confronto
 </>
 )}
 </button>

 <Link
 href="/confrontos"
 className="h-12 px-5 border border-zinc-300 bg-white text-zinc-800 font-semibold text-sm uppercase tracking-[0.12em] inline-flex items-center justify-center gap-2 hover:bg-zinc-50 transition-colors"
 >
 <ArrowLeft size={18} />
 Cancelar
 </Link>
 </div>
 </div>

 <div className="bg-white border border-zinc-200 p-5 md:p-6">
 <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-zinc-500 mb-4">
 COMO FUNCIONA
 </p>

 <div className="space-y-4">
 <InfoPasso
 icon={<Swords size={18} />}
 titulo="1. Você cria a disputa"
 texto="Define formato, regras, valor e como a validação vai funcionar."
 />
 <InfoPasso
 icon={<UserCircle2 size={18} />}
 titulo="2. Um adversário aceita"
 texto="Depois a disputa aparece na vitrine para outros usuários analisarem."
 />
 <InfoPasso
 icon={<ShieldCheck size={18} />}
 titulo="3. Admin valida"
 texto="O resultado pode passar por prova, histórico e decisão administrativa."
 />
 </div>
 </div>
 </div>
 </form>
 )}
 </div>
 </div>
 )
}

function Campo({ children }: { children: React.ReactNode }) {
 return <div>{children}</div>
}

function Label({ children }: { children: React.ReactNode }) {
 return (
 <label className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500 mb-2">
 {children}
 </label>
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
 <div
 className={`${menor ? 'text-base' : 'text-2xl md:text-3xl'} font-semibold mt-2 leading-none text-zinc-900 break-words`}
 >
 {valor}
 </div>
 </div>
 )
}

function LinhaResumo({ label, valor }: { label: string; valor: string }) {
 return (
 <div className=" border border-zinc-200 bg-zinc-50 px-4 py-3 flex items-start justify-between gap-4">
 <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
 {label}
 </div>
 <div className="text-sm font-semibold text-zinc-900 text-right break-words">{valor}</div>
 </div>
 )
}

function InfoPasso({
 icon,
 titulo,
 texto,
}: {
 icon: React.ReactNode
 titulo: string
 texto: string
}) {
 return (
 <div className="flex items-start gap-3">
 <div className="w-10 h-10 bg-zinc-50 border border-zinc-200 flex items-center justify-center shrink-0 text-zinc-700">
 {icon}
 </div>
 <div>
 <div className="text-sm font-semibold uppercase tracking-[0.14em] text-zinc-800">
 {titulo}
 </div>
 <p className="text-sm text-zinc-500 font-semibold mt-1 leading-6">{texto}</p>
 </div>
 </div>
 )
}

function textoSeguro(valor: any, fallback = '') {
 const texto = String(valor || '').trim()
 return texto || fallback
}

function numeroSeguro(valor: any) {
 if (typeof valor === 'string') {
 const normalizado = valor.replace(/\./g, '').replace(',', '.')
 const numero = Number(normalizado)
 return Number.isFinite(numero) ? numero : 0
 }

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