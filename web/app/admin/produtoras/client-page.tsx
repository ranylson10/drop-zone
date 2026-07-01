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

type Produtora = {
 id: string
 nome: string
 slug: string | null
 descricao: string | null
 logo_url: string | null
 capa_url: string | null
 dono_id: string | null
 status: 'pendente' | 'aprovada' | 'recusada' | 'suspensa'
 taxa_site_padrao: number | null
 pode_criar_evento_publico: boolean
 aprovada_por: string | null
 aprovada_em: string | null
 motivo_recusa: string | null
 suspensa_em: string | null
 created_at: string | null
}

type ProfileMap = Record<string, { nome_exibicao: string | null }>

const statusOptions = ['todos', 'pendente', 'aprovada', 'recusada', 'suspensa']

function AdminProdutorasContent() {
 const router = useRouter()
 const searchParams = useSearchParams()

 const [loading, setLoading] = useState(true)
 const [autorizado, setAutorizado] = useState(false)
 const [salvandoId, setSalvandoId] = useState<string | null>(null)
 const [produtoras, setProdutoras] = useState<Produtora[]>([])
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
 .from('produtoras')
 .select('*')
 .order('created_at', { ascending: false })

 if (error) throw error

 const lista = (data || []) as Produtora[]
 setProdutoras(lista)
 setTaxas(
 Object.fromEntries(
 lista.map((item) => [item.id, String(item.taxa_site_padrao ?? 0)])
 )
 )

 const ids = Array.from(
 new Set(lista.map((item) => item.dono_id).filter(Boolean) as string[])
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
 console.error('Erro ao carregar produtoras admin:', error)
 setAutorizado(false)
 } finally {
 setLoading(false)
 }
 }

 useEffect(() => {
 carregar()
 }, [])

 async function atualizarProdutora(
 produtoraId: string,
 payload: Partial<Produtora> & Record<string, unknown>
 ) {
 try {
 setSalvandoId(produtoraId)

 const {
 data: { user },
 } = await supabase.auth.getUser()

 if (!user) {
 router.push('/login')
 return
 }

 const { error } = await supabase
 .from('produtoras')
 .update(payload)
 .eq('id', produtoraId)

 if (error) throw error

 await carregar()
 } catch (error: any) {
 console.error('Erro ao atualizar produtora:', error)
 alert(error?.message || 'Erro ao atualizar produtora.')
 } finally {
 setSalvandoId(null)
 }
 }

 async function aprovar(produtoraId: string) {
 const {
 data: { user },
 } = await supabase.auth.getUser()

 if (!user) return

 const taxa = Number(taxas[produtoraId] ?? 0)

 await atualizarProdutora(produtoraId, {
 status: 'aprovada',
 aprovada_por: user.id,
 aprovada_em: new Date().toISOString(),
 motivo_recusa: null,
 suspensa_em: null,
 taxa_site_padrao: Number.isFinite(taxa) ? taxa : 0,
 pode_criar_evento_publico: true,
 })
 }

 async function recusar(produtoraId: string) {
 const motivo = window.prompt('Motivo da recusa:')
 if (motivo === null) return

 await atualizarProdutora(produtoraId, {
 status: 'recusada',
 motivo_recusa: motivo.trim() || 'Recusada pela administração do site.',
 pode_criar_evento_publico: false,
 })
 }

 async function suspender(produtoraId: string) {
 await atualizarProdutora(produtoraId, {
 status: 'suspensa',
 suspensa_em: new Date().toISOString(),
 pode_criar_evento_publico: false,
 })
 }

 const listaFiltrada = useMemo(() => {
 const termo = busca.trim().toLowerCase()

 return produtoras.filter((item) => {
 const matchStatus = filtroStatus === 'todos' || item.status === filtroStatus
 const matchBusca =
 !termo ||
 item.nome?.toLowerCase().includes(termo) ||
 item.slug?.toLowerCase().includes(termo) ||
 item.id.toLowerCase().includes(termo) ||
 profilesById[item.dono_id || '']?.nome_exibicao
 ?.toLowerCase()
 .includes(termo)

 return matchStatus && matchBusca
 })
 }, [busca, filtroStatus, produtoras, profilesById])

 const resumo = useMemo(() => {
 return {
 pendente: produtoras.filter((item) => item.status === 'pendente').length,
 aprovada: produtoras.filter((item) => item.status === 'aprovada').length,
 recusada: produtoras.filter((item) => item.status === 'recusada').length,
 suspensa: produtoras.filter((item) => item.status === 'suspensa').length,
 }
 }, [produtoras])

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
 <div className="mx-auto max-w-[1700px] space-y-8 p-6">
 <div className="space-y-4">
 <div>
 <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-[#2563eb]">
 Painel do site
 </p>
 <h1 className="mt-2 text-3xl font-semibold uppercase text-[#142340]">
 Gestão de produtoras
 </h1>
 <p className="mt-2 text-sm text-zinc-500">
 Aprove, recuse ou suspenda organizações antes de liberar eventos públicos.
 </p>
 </div>

 <AdminTabs />
 </div>

 <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
 {[
 ['Pendente', resumo.pendente],
 ['Aprovada', resumo.aprovada],
 ['Recusada', resumo.recusada],
 ['Suspensa', resumo.suspensa],
 ].map(([label, value]) => (
 <div key={label} className="border border-zinc-200 bg-white p-4">
 <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
 {label}
 </div>
 <div className="mt-3 text-3xl font-semibold text-[#142340]">{value}</div>
 </div>
 ))}
 </section>

 <section className="space-y-4 border border-zinc-200 bg-white p-5">
 <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
 <div className="flex flex-wrap gap-2">
 {statusOptions.map((status) => {
 const ativo = filtroStatus === status
 return (
 <Link
 key={status}
 href={status === 'todos' ? '/admin/produtoras' : `/admin/produtoras?status=${status}`}
 className={[
 'border px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.22em] transition',
 ativo
 ? 'border-[#2563eb] bg-[#2563eb] text-[#142340]'
 : 'border-zinc-200 text-zinc-500 hover:border-[#2563eb] hover:text-[#142340]',
 ].join(' ')}
 >
 {status}
 </Link>
 )
 })}
 </div>

 <div className="relative w-full xl:w-96">
 <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
 <input
 value={busca}
 onChange={(e) => setBusca(e.target.value)}
 placeholder="Buscar por nome, slug, dono ou ID..."
 className="w-full border border-zinc-200 bg-[#f7f7f7] py-3 pl-11 pr-4 text-[11px] font-bold uppercase text-[#142340] outline-none transition focus:border-[#2563eb]"
 />
 </div>
 </div>

 <div className="overflow-x-auto">
 <table className="w-full min-w-[1400px] border-collapse text-left">
 <thead>
 <tr className="border-b border-zinc-200 text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
 <th className="px-4 py-4">Produtora</th>
 <th className="px-4 py-4">Dono</th>
 <th className="px-4 py-4">Status</th>
 <th className="px-4 py-4">Taxa do site</th>
 <th className="px-4 py-4">Eventos públicos</th>
 <th className="px-4 py-4">Criada em</th>
 <th className="px-4 py-4">Motivo / Observação</th>
 <th className="px-4 py-4 text-right">Ações</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-white/5">
 {listaFiltrada.map((item) => {
 const donoNome = profilesById[item.dono_id || '']?.nome_exibicao || item.dono_id || '-'
 const salvando = salvandoId === item.id

 return (
 <tr key={item.id} className="align-top hover:bg-white/[0.02]">
 <td className="px-4 py-4">
 <div className="flex items-start gap-3">
 <div className="h-12 w-12 overflow-hidden border border-zinc-200 bg-white">
 {item.logo_url ? (
 <img src={item.logo_url} alt={item.nome} className="h-full w-full object-cover" />
 ) : null}
 </div>
 <div>
 <div className="text-sm font-semibold uppercase text-[#142340]">
 {item.nome}
 </div>
 <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-zinc-500">
 {item.slug || 'sem-slug'}
 </div>
 <div className="mt-2 max-w-[260px] text-xs leading-5 text-zinc-500">
 {item.descricao?.trim() || 'Sem descrição cadastrada.'}
 </div>
 </div>
 </div>
 </td>

 <td className="px-4 py-4 text-sm text-zinc-600">{donoNome}</td>

 <td className="px-4 py-4">
 <span className="border border-zinc-200 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#142340]">
 {item.status}
 </span>
 </td>

 <td className="px-4 py-4">
 <div className="flex items-center gap-2">
 <input
 type="number"
 min="0"
 step="0.01"
 value={taxas[item.id] ?? '0'}
 onChange={(e) =>
 setTaxas((prev) => ({ ...prev, [item.id]: e.target.value }))
 }
 className="w-24 border border-zinc-200 bg-[#f7f7f7] px-3 py-2 text-sm font-bold text-[#142340] outline-none focus:border-[#2563eb]"
 />
 <span className="text-xs text-zinc-500">%</span>
 </div>
 </td>

 <td className="px-4 py-4 text-sm text-zinc-600">
 {item.pode_criar_evento_publico ? 'Liberado' : 'Bloqueado'}
 </td>

 <td className="px-4 py-4 text-sm text-zinc-500">
 {item.created_at
 ? new Date(item.created_at).toLocaleDateString('pt-BR')
 : '-'}
 </td>

 <td className="px-4 py-4 text-sm text-zinc-500">
 {item.motivo_recusa || (item.suspensa_em ? 'Produtora suspensa pela administração.' : '-')}
 </td>

 <td className="px-4 py-4">
 <div className="flex flex-wrap justify-end gap-2">
 <button
 onClick={() => aprovar(item.id)}
 disabled={salvando}
 className="inline-flex items-center gap-2 border border-emerald-500/30 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-400 transition hover:bg-emerald-500/10 disabled:opacity-50"
 >
 <CheckCircle2 size={14} />
 Aprovar
 </button>

 <button
 onClick={() => recusar(item.id)}
 disabled={salvando}
 className="inline-flex items-center gap-2 border border-red-500/30 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-red-400 transition hover:bg-red-500/10 disabled:opacity-50"
 >
 <XCircle size={14} />
 Recusar
 </button>

 <button
 onClick={() => suspender(item.id)}
 disabled={salvando}
 className="inline-flex items-center gap-2 border border-yellow-500/30 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-yellow-300 transition hover:bg-yellow-500/10 disabled:opacity-50"
 >
 <Slash size={14} />
 Suspender
 </button>
 </div>
 </td>
 </tr>
 )
 })}

 {listaFiltrada.length === 0 ? (
 <tr>
 <td colSpan={8} className="px-4 py-10 text-center text-sm text-zinc-500">
 Nenhuma produtora encontrada com esse filtro.
 </td>
 </tr>
 ) : null}
 </tbody>
 </table>
 </div>
 </section>
 </div>
 )
}

function ConteudoInner() {
 return (
 <Suspense fallback={<div className="flex h-screen items-center justify-center bg-[#f7f7f7] text-sm font-semibold text-zinc-500">Carregando...</div>}>
 <AdminProdutorasContent />
 </Suspense>
 )
}

export default function Conteudo() {
  return (
    <Suspense fallback={null}>
      <ConteudoInner />
    </Suspense>
  )
}
