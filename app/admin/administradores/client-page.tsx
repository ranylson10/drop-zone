'use client'

export const dynamic = 'force-dynamic'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import AdminTabs from '../components/AdminTabs'
import {
 CheckCircle2,
 Loader2,
 Search,
 ShieldCheck,
 Slash,
 XCircle,
} from 'lucide-react'

type AdminEvento = {
 id: string
 user_id: string
 nome_exibicao: string | null
 descricao: string | null
 status: 'pendente' | 'aprovado' | 'recusado' | 'suspenso'
 taxa_padrao: number | null
 aprovado_por: string | null
 aprovado_em: string | null
 motivo_recusa: string | null
 suspenso_em: string | null
 created_at: string | null
}

type AdminTipo = {
 administrador_evento_id: string
 tipo_evento: string
}

type ProfileMap = Record<string, { nome_exibicao: string | null }>

const statusOptions = [
 'todos',
 'pendente',
 'aprovado',
 'recusado',
 'suspenso',
] as const

const tipoLabels: Record<string, string> = {
 apostado: 'Apostados',
 confronto: 'Confronto',
 diario: 'Diário',
 xtreino: 'Xtreino',
 copa: 'Copa',
 liga: 'Liga',
}

function AdminAdministradoresContent() {
 const router = useRouter()
 const searchParams = useSearchParams()

 const [loading, setLoading] = useState(true)
 const [autorizado, setAutorizado] = useState(false)
 const [salvandoId, setSalvandoId] = useState<string | null>(null)
 const [administradores, setAdministradores] = useState<AdminEvento[]>([])
 const [tipos, setTipos] = useState<AdminTipo[]>([])
 const [profilesById, setProfilesById] = useState<ProfileMap>({})
 const [busca, setBusca] = useState('')
 const [taxas, setTaxas] = useState<Record<string, string>>({})

 const filtroStatus = searchParams.get('status') || 'todos'

 async function validarAcesso() {
 const {
 data: { user },
 } = await supabase.auth.getUser()

 if (!user) {
 router.push('/login')
 return null
 }

 const { data: staff, error } = await supabase
 .from('site_administradores')
 .select('id')
 .eq('user_id', user.id)
 .eq('ativo', true)
 .limit(1)

 if (error) throw error

 if (!staff || staff.length === 0) {
 setAutorizado(false)
 return null
 }

 setAutorizado(true)
 return user.id
 }

 async function carregar() {
 setLoading(true)

 try {
 const adminUserId = await validarAcesso()
 if (!adminUserId) {
 setLoading(false)
 return
 }

 const { data, error } = await supabase
 .from('administradores_evento')
 .select('*')
 .order('created_at', { ascending: false })

 if (error) throw error

 const lista = (data || []) as AdminEvento[]
 setAdministradores(lista)
 setTaxas(
 Object.fromEntries(
 lista.map((item) => [item.id, String(item.taxa_padrao ?? 0)])
 )
 )

 const { data: tiposData, error: tiposError } = await supabase
 .from('administradores_evento_tipos')
 .select('administrador_evento_id, tipo_evento')

 if (tiposError) throw tiposError
 setTipos((tiposData || []) as AdminTipo[])

 const ids = Array.from(
 new Set(lista.map((item) => item.user_id).filter(Boolean))
 )

 if (ids.length > 0) {
 const { data: perfis } = await supabase
 .from('profiles')
 .select('id, nome_exibicao')
 .in('id', ids)

 const mapa: ProfileMap = {}
 ;(perfis || []).forEach((perfil: any) => {
 mapa[perfil.id] = { nome_exibicao: perfil.nome_exibicao }
 })
 setProfilesById(mapa)
 } else {
 setProfilesById({})
 }
 } catch (error) {
 console.error('Erro ao carregar admins de evento:', error)
 setAutorizado(false)
 } finally {
 setLoading(false)
 }
 }

 useEffect(() => {
 carregar()
 }, [])

 async function atualizarAdministrador(
 administradorId: string,
 payload: Partial<AdminEvento> & Record<string, unknown>
 ) {
 try {
 setSalvandoId(administradorId)

 const { error } = await supabase
 .from('administradores_evento')
 .update(payload)
 .eq('id', administradorId)

 if (error) throw error

 await carregar()
 } catch (error: any) {
 console.error('Erro ao atualizar admin de evento:', error)
 alert(error?.message || 'Erro ao atualizar administrador de evento.')
 } finally {
 setSalvandoId(null)
 }
 }

 async function aprovar(administradorId: string) {
 const {
 data: { user },
 } = await supabase.auth.getUser()

 if (!user) return

 const taxa = Number(taxas[administradorId] ?? 0)

 if (!Number.isFinite(taxa)) {
 alert('Informe uma taxa válida antes de aprovar.')
 return
 }

 if (taxa <= 0) {
 alert('Defina uma taxa maior que 0% antes de aprovar.')
 return
 }

 await atualizarAdministrador(administradorId, {
 status: 'aprovado',
 aprovado_por: user.id,
 aprovado_em: new Date().toISOString(),
 motivo_recusa: null,
 suspenso_em: null,
 taxa_padrao: taxa,
 })
 }

 async function recusar(administradorId: string) {
 const motivo = window.prompt('Motivo da recusa:')
 if (motivo === null) return

 await atualizarAdministrador(administradorId, {
 status: 'recusado',
 motivo_recusa: motivo.trim() || 'Recusado pela administração do site.',
 })
 }

 async function suspender(administradorId: string) {
 await atualizarAdministrador(administradorId, {
 status: 'suspenso',
 suspenso_em: new Date().toISOString(),
 })
 }

 const tiposPorAdmin = useMemo(() => {
 const mapa: Record<string, string[]> = {}

 tipos.forEach((item) => {
 if (!mapa[item.administrador_evento_id]) {
 mapa[item.administrador_evento_id] = []
 }
 mapa[item.administrador_evento_id].push(item.tipo_evento)
 })

 return mapa
 }, [tipos])

 const listaFiltrada = useMemo(() => {
 const termo = busca.trim().toLowerCase()

 return administradores.filter((item) => {
 const matchStatus =
 filtroStatus === 'todos' || item.status === filtroStatus

 const nomePerfil = profilesById[item.user_id]?.nome_exibicao || ''
 const tiposTexto = (tiposPorAdmin[item.id] || []).join(' ')

 const matchBusca =
 !termo ||
 item.nome_exibicao?.toLowerCase().includes(termo) ||
 item.descricao?.toLowerCase().includes(termo) ||
 nomePerfil.toLowerCase().includes(termo) ||
 item.user_id.toLowerCase().includes(termo) ||
 tiposTexto.toLowerCase().includes(termo)

 return matchStatus && !!matchBusca
 })
 }, [administradores, busca, filtroStatus, profilesById, tiposPorAdmin])

 const resumo = useMemo(() => {
 return {
 pendente: administradores.filter((item) => item.status === 'pendente')
 .length,
 aprovado: administradores.filter((item) => item.status === 'aprovado')
 .length,
 recusado: administradores.filter((item) => item.status === 'recusado')
 .length,
 suspenso: administradores.filter((item) => item.status === 'suspenso')
 .length,
 }
 }, [administradores])

 if (loading) {
 return (
 <div className="flex h-screen items-center justify-center bg-[#f7f7f7]">
 <Loader2 className="animate-spin text-[#2563eb]" size={42} />
 </div>
 )
 }

 if (!autorizado) {
 return (
 <div className="mx-auto max-w-4xl p-6">
 <div className="border border-red-500/30 bg-white p-8 text-center">
 <ShieldCheck className="mx-auto mb-4 text-red-400" size={42} />
 <h1 className="text-xl font-semibold uppercase text-[#142340]">
 Acesso restrito
 </h1>
 <p className="mt-3 text-sm text-zinc-500">
 Seu usuário não está cadastrado como administrador do site.
 </p>
 <Link
 href="/"
 className="mt-6 inline-flex items-center gap-2 border border-zinc-200 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-600 transition hover:border-[#2563eb] hover:text-[#142340]"
 >
 Voltar ao início
 </Link>
 </div>
 </div>
 )
 }

 return (
 <div className="mx-auto max-w-[1600px] space-y-8 p-6">
 <div className="space-y-4">
 <div>
 <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-[#2563eb]">
 Painel do site
 </p>
 <h1 className="mt-2 text-3xl font-semibold uppercase text-[#142340]">
 Administradores de evento
 </h1>
 <p className="mt-2 text-sm text-zinc-500">
 Aprove, recuse, suspenda e defina a taxa padrão dos admins que vão
 operar apostados, diários, copas, ligas e confrontos.
 </p>
 </div>

 <AdminTabs />
 </div>

 <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
 <div className="border border-zinc-200 bg-white p-4">
 <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
 Pendentes
 </p>
 <div className="mt-3 text-3xl font-semibold text-[#142340]">
 {resumo.pendente}
 </div>
 </div>

 <div className="border border-zinc-200 bg-white p-4">
 <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
 Aprovados
 </p>
 <div className="mt-3 text-3xl font-semibold text-[#142340]">
 {resumo.aprovado}
 </div>
 </div>

 <div className="border border-zinc-200 bg-white p-4">
 <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
 Recusados
 </p>
 <div className="mt-3 text-3xl font-semibold text-[#142340]">
 {resumo.recusado}
 </div>
 </div>

 <div className="border border-zinc-200 bg-white p-4">
 <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
 Suspensos
 </p>
 <div className="mt-3 text-3xl font-semibold text-[#142340]">
 {resumo.suspenso}
 </div>
 </div>
 </section>

 <section className="space-y-4 border border-zinc-200 bg-white p-5">
 <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
 <div className="relative w-full max-w-xl">
 <Search
 className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
 size={16}
 />
 <input
 value={busca}
 onChange={(e) => setBusca(e.target.value)}
 placeholder="Buscar por nome, descrição, user id ou tipo de evento"
 className="w-full border border-zinc-200 bg-[#f7f7f7] py-3 pl-10 pr-3 text-sm text-[#142340] outline-none transition focus:border-[#2563eb]"
 />
 </div>

 <div className="flex flex-wrap gap-2">
 {statusOptions.map((status) => {
 const ativo = filtroStatus === status

 return (
 <button
 key={status}
 onClick={() => {
 const url =
 status === 'todos'
 ? '/admin/administradores'
 : `/admin/administradores?status=${status}`

 router.push(url)
 }}
 className={[
 'border px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.22em] transition',
 ativo
 ? 'border-[#2563eb] bg-[#2563eb] text-[#142340]'
 : 'border-zinc-200 bg-[#f7f7f7] text-zinc-600 hover:border-[#2563eb] hover:text-[#142340]',
 ].join(' ')}
 >
 {status}
 </button>
 )
 })}
 </div>
 </div>

 <div className="grid gap-4">
 {listaFiltrada.length === 0 ? (
 <div className="border border-dashed border-zinc-200 px-4 py-8 text-center text-sm text-zinc-500">
 Nenhum administrador encontrado nesse filtro.
 </div>
 ) : (
 listaFiltrada.map((item) => {
 const dono =
 profilesById[item.user_id]?.nome_exibicao || 'Usuário sem nome'
 const tiposDoAdmin = tiposPorAdmin[item.id] || []
 const salvando = salvandoId === item.id

 return (
 <div
 key={item.id}
 className="border border-zinc-200 bg-[#f7f7f7] p-5"
 >
 <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
 <div className="space-y-4">
 <div>
 <div className="flex flex-wrap items-center gap-2">
 <h2 className="text-lg font-semibold uppercase text-[#142340]">
 {item.nome_exibicao || dono}
 </h2>
 <span className="border border-zinc-200 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#2563eb]">
 {item.status}
 </span>
 </div>

 <p className="mt-2 text-sm text-zinc-500">
 Perfil: {dono}
 </p>
 <p className="mt-1 break-all text-xs text-zinc-500">
 User ID: {item.user_id}
 </p>
 </div>

 {item.descricao ? (
 <p className="max-w-3xl text-sm leading-6 text-zinc-600">
 {item.descricao}
 </p>
 ) : (
 <p className="text-sm text-zinc-500">
 Sem descrição enviada.
 </p>
 )}

 <div>
 <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
 Tipos de evento selecionados
 </p>

 <div className="mt-2 flex flex-wrap gap-2">
 {tiposDoAdmin.length > 0 ? (
 tiposDoAdmin.map((tipo) => (
 <span
 key={tipo}
 className="border border-zinc-200 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-600"
 >
 {tipoLabels[tipo] || tipo}
 </span>
 ))
 ) : (
 <span className="text-sm text-zinc-500">
 Nenhum tipo informado.
 </span>
 )}
 </div>
 </div>

 {item.motivo_recusa ? (
 <div className="border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-200">
 <span className="font-semibold uppercase tracking-[0.18em]">
 Motivo da recusa:
 </span>{' '}
 {item.motivo_recusa}
 </div>
 ) : null}
 </div>

 <div className="w-full max-w-md space-y-4 border border-zinc-200 bg-white p-4">
 <div className="grid grid-cols-2 gap-4 text-sm text-zinc-600">
 <div>
 <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
 Criado em
 </p>
 <p className="mt-2">
 {item.created_at
 ? new Date(item.created_at).toLocaleString('pt-BR')
 : '-'}
 </p>
 </div>

 <div>
 <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
 Aprovado em
 </p>
 <p className="mt-2">
 {item.aprovado_em
 ? new Date(item.aprovado_em).toLocaleString(
 'pt-BR'
 )
 : '-'}
 </p>
 </div>
 </div>

 <div>
 <label className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
 Taxa padrão do admin (%)
 </label>
 <input
 value={taxas[item.id] ?? ''}
 onChange={(e) =>
 setTaxas((prev) => ({
 ...prev,
 [item.id]: e.target.value,
 }))
 }
 type="number"
 min="0.01"
 step="0.01"
 className="mt-2 w-full border border-zinc-200 bg-[#f7f7f7] px-3 py-3 text-sm text-[#142340] outline-none transition focus:border-[#2563eb]"
 />
 </div>

 <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
 <button
 disabled={salvando}
 onClick={() => aprovar(item.id)}
 className="inline-flex items-center justify-center gap-2 bg-[#2563eb] px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#142340] transition hover:bg-[#1d4ed8] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
 >
 <CheckCircle2 size={14} />
 Aprovar
 </button>

 <button
 disabled={salvando}
 onClick={() => recusar(item.id)}
 className="inline-flex items-center justify-center gap-2 border border-red-500/30 bg-red-500/10 px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-red-200 transition hover:border-red-400 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
 >
 <XCircle size={14} />
 Recusar
 </button>

 <button
 disabled={salvando}
 onClick={() => suspender(item.id)}
 className="inline-flex items-center justify-center gap-2 border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-yellow-100 transition hover:border-yellow-400 hover:bg-yellow-500/20 disabled:cursor-not-allowed disabled:opacity-50"
 >
 <Slash size={14} />
 Suspender
 </button>
 </div>

 {salvando ? (
 <div className="inline-flex items-center gap-2 text-xs text-zinc-500">
 <Loader2 size={14} className="animate-spin" />
 Salvando alterações...
 </div>
 ) : null}
 </div>
 </div>
 </div>
 )
 })
 )}
 </div>
 </section>
 </div>
 )
}

export default function AdminAdministradoresPage() {
 return (
  <Suspense fallback={<div className="p-6 text-sm font-bold text-zinc-400">Carregando...</div>}>
   <AdminAdministradoresContent />
  </Suspense>
 )
}
