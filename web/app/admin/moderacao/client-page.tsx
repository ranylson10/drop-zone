'use client'

export const dynamic = 'force-dynamic'

import { Suspense, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import AdminTabs from '../components/AdminTabs'
import {
 AlertTriangle,
 Gavel,
 Loader2,
 Search,
 ShieldCheck,
} from 'lucide-react'

type CasoModeracao = {
 id: string
 tipo_caso:
 | 'denuncia'
 | 'disputa'
 | 'contestacao'
 | 'prova'
 | 'punicao'
 | 'analise_produtora'
 | 'analise_admin_evento'
 origem_tipo:
 | 'campeonato'
 | 'produtora'
 | 'administrador_evento'
 | 'usuario'
 | 'outro'
 origem_id: string | null
 titulo: string
 descricao: string | null
 status:
 | 'aberto'
 | 'em_analise'
 | 'aguardando_resposta'
 | 'resolvido'
 | 'recusado'
 | 'arquivado'
 aberto_por: string | null
 responsavel_user_id: string | null
 resolvido_por: string | null
 resolvido_em: string | null
 created_at: string | null
 updated_at: string | null
}

type ProfileMap = Record<string, { nome_exibicao: string | null }>

const statusOptions = [
 'todos',
 'aberto',
 'em_analise',
 'aguardando_resposta',
 'resolvido',
 'recusado',
 'arquivado',
] as const

const tipoCasoLabels: Record<string, string> = {
 denuncia: 'Denúncia',
 disputa: 'Disputa',
 contestacao: 'Contestação',
 prova: 'Prova',
 punicao: 'Punição',
 analise_produtora: 'Análise de produtora',
 analise_admin_evento: 'Análise de admin de evento',
}

const origemLabels: Record<string, string> = {
 campeonato: 'Campeonato',
 produtora: 'Produtora',
 administrador_evento: 'Administrador de evento',
 usuario: 'Usuário',
 outro: 'Outro',
}

function AdminModeracaoContent() {
 const router = useRouter()
 const searchParams = useSearchParams()

 const [loading, setLoading] = useState(true)
 const [autorizado, setAutorizado] = useState(false)
 const [casos, setCasos] = useState<CasoModeracao[]>([])
 const [profilesById, setProfilesById] = useState<ProfileMap>({})
 const [busca, setBusca] = useState('')

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
 .from('moderacao_casos')
 .select('*')
 .order('created_at', { ascending: false })

 if (error) throw error

 const lista = (data || []) as CasoModeracao[]
 setCasos(lista)

 const ids = Array.from(
 new Set(
 lista
 .flatMap((item) => [
 item.aberto_por,
 item.responsavel_user_id,
 item.resolvido_por,
 ])
 .filter(Boolean)
 )
 ) as string[]

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
 console.error('Erro ao carregar casos de moderação:', error)
 setAutorizado(false)
 } finally {
 setLoading(false)
 }
 }

 useEffect(() => {
 carregar()
 }, [])

 const listaFiltrada = useMemo(() => {
 const termo = busca.trim().toLowerCase()

 return casos.filter((item) => {
 const matchStatus =
 filtroStatus === 'todos' || item.status === filtroStatus

 const abertoPor =
 (item.aberto_por && profilesById[item.aberto_por]?.nome_exibicao) || ''
 const responsavel =
 (item.responsavel_user_id &&
 profilesById[item.responsavel_user_id]?.nome_exibicao) ||
 ''

 const matchBusca =
 !termo ||
 item.titulo?.toLowerCase().includes(termo) ||
 item.descricao?.toLowerCase().includes(termo) ||
 item.tipo_caso?.toLowerCase().includes(termo) ||
 item.origem_tipo?.toLowerCase().includes(termo) ||
 abertoPor.toLowerCase().includes(termo) ||
 responsavel.toLowerCase().includes(termo) ||
 item.origem_id?.toLowerCase().includes(termo)

 return matchStatus && !!matchBusca
 })
 }, [busca, casos, filtroStatus, profilesById])

 const resumo = useMemo(() => {
 return {
 aberto: casos.filter((item) => item.status === 'aberto').length,
 em_analise: casos.filter((item) => item.status === 'em_analise').length,
 aguardando_resposta: casos.filter(
 (item) => item.status === 'aguardando_resposta'
 ).length,
 resolvido: casos.filter((item) => item.status === 'resolvido').length,
 recusado: casos.filter((item) => item.status === 'recusado').length,
 arquivado: casos.filter((item) => item.status === 'arquivado').length,
 }
 }, [casos])

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
 Moderação
 </h1>
 <p className="mt-2 text-sm text-zinc-500">
 Acompanhe denúncias, disputas, contestações e análises internas da
 plataforma.
 </p>
 </div>

 <AdminTabs />
 </div>

 <section className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
 <div className="border border-zinc-200 bg-white p-4">
 <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
 Abertos
 </p>
 <div className="mt-3 text-3xl font-semibold text-[#142340]">
 {resumo.aberto}
 </div>
 </div>

 <div className="border border-zinc-200 bg-white p-4">
 <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
 Em análise
 </p>
 <div className="mt-3 text-3xl font-semibold text-[#142340]">
 {resumo.em_analise}
 </div>
 </div>

 <div className="border border-zinc-200 bg-white p-4">
 <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
 Aguardando resposta
 </p>
 <div className="mt-3 text-3xl font-semibold text-[#142340]">
 {resumo.aguardando_resposta}
 </div>
 </div>

 <div className="border border-zinc-200 bg-white p-4">
 <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
 Resolvidos
 </p>
 <div className="mt-3 text-3xl font-semibold text-[#142340]">
 {resumo.resolvido}
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
 Arquivados
 </p>
 <div className="mt-3 text-3xl font-semibold text-[#142340]">
 {resumo.arquivado}
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
 placeholder="Buscar por título, descrição, tipo, origem ou usuário"
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
 ? '/admin/moderacao'
 : `/admin/moderacao?status=${status}`

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
 Nenhum caso de moderação encontrado nesse filtro.
 </div>
 ) : (
 listaFiltrada.map((item) => {
 const abertoPor =
 (item.aberto_por && profilesById[item.aberto_por]?.nome_exibicao) ||
 'Não identificado'

 const responsavel =
 (item.responsavel_user_id &&
 profilesById[item.responsavel_user_id]?.nome_exibicao) ||
 'Não atribuído'

 return (
 <Link
 key={item.id}
 href={`/admin/moderacao/${item.id}`}
 className="block border border-zinc-200 bg-[#f7f7f7] p-5 transition hover:border-[#2563eb]"
 >
 <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
 <div className="space-y-4">
 <div>
 <div className="flex flex-wrap items-center gap-2">
 <h2 className="text-lg font-semibold uppercase text-[#142340]">
 {item.titulo}
 </h2>
 <span className="border border-zinc-200 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#2563eb]">
 {item.status.replaceAll('_', ' ')}
 </span>
 </div>

 <p className="mt-2 text-sm text-zinc-500">
 {tipoCasoLabels[item.tipo_caso] || item.tipo_caso} •{' '}
 {origemLabels[item.origem_tipo] || item.origem_tipo}
 </p>

 {item.origem_id ? (
 <p className="mt-1 break-all text-xs text-zinc-500">
 Origem ID: {item.origem_id}
 </p>
 ) : null}
 </div>

 {item.descricao ? (
 <p className="max-w-4xl text-sm leading-6 text-zinc-600">
 {item.descricao}
 </p>
 ) : (
 <p className="text-sm text-zinc-500">
 Sem descrição informada.
 </p>
 )}

 <div className="flex flex-wrap gap-4 text-sm text-zinc-500">
 <span>
 <strong className="text-[#142340]">Aberto por:</strong>{' '}
 {abertoPor}
 </span>
 <span>
 <strong className="text-[#142340]">Responsável:</strong>{' '}
 {responsavel}
 </span>
 </div>
 </div>

 <div className="w-full max-w-sm space-y-4 border border-zinc-200 bg-white p-4">
 <div className="grid grid-cols-1 gap-4 text-sm text-zinc-600">
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
 Última atualização
 </p>
 <p className="mt-2">
 {item.updated_at
 ? new Date(item.updated_at).toLocaleString('pt-BR')
 : '-'}
 </p>
 </div>

 <div className="inline-flex items-center gap-2 text-xs text-zinc-500">
 <Gavel size={14} />
 Abrir detalhe do caso
 </div>
 </div>
 </div>
 </div>
 </Link>
 )
 })
 )}
 </div>
 </section>

 <section className="grid gap-4 xl:grid-cols-2">
 <div className="border border-zinc-200 bg-white p-5">
 <div className="flex items-start gap-3">
 <AlertTriangle className="mt-0.5 text-[#2563eb]" size={18} />
 <div>
 <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#2563eb]">
 Uso recomendado
 </p>
 <h3 className="mt-2 text-lg font-semibold uppercase text-[#142340]">
 Centralize disputas aqui
 </h3>
 <p className="mt-2 text-sm leading-6 text-zinc-500">
 Use essa área para tratar contestação de resultado, denúncias
 contra produtoras, admins de evento, campeonatos e eventos do
 site.
 </p>
 </div>
 </div>
 </div>

 <div className="border border-zinc-200 bg-white p-5">
 <div className="flex items-start gap-3">
 <Gavel className="mt-0.5 text-[#2563eb]" size={18} />
 <div>
 <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#2563eb]">
 Próximo passo
 </p>
 <h3 className="mt-2 text-lg font-semibold uppercase text-[#142340]">
 Abrir casos pelo usuário
 </h3>
 <p className="mt-2 text-sm leading-6 text-zinc-500">
 Depois dessa tela admin, o próximo bloco ideal é permitir que o
 usuário abra casos de moderação nos campeonatos e eventos em
 que ele participou.
 </p>
 </div>
 </div>
 </div>
 </section>
 </div>
 )
}

function AdminModeracaoPageInner() {
 return (
  <Suspense fallback={<main className="min-h-screen bg-slate-100 p-6 text-sm font-bold text-slate-600">Carregando moderação...</main>}>
   <AdminModeracaoContent />
  </Suspense>
 )
}

export default function AdminModeracaoPage() {
  return (
    <Suspense fallback={null}>
      <AdminModeracaoPageInner />
    </Suspense>
  )
}
