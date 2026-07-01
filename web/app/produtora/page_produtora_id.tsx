'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { resolverTipoCompeticao } from '@/app/campeonatos/components/tiposCompeticao'
import { getCampeonatoHref } from '@/app/campeonatos/utils/getCampeonatoHref'
import {
 Building2,
 CalendarDays,
 Loader2,
 Pencil,
 Radio,
 ShieldCheck,
 Trophy,
 Users,
 Settings,
 Plus,
 Eye,
 Layers3,
 Copy,
 ExternalLink,
 MessageCircle,
} from 'lucide-react'

type Produtora = {
 id: string
 nome: string
 slug: string | null
 logo_url: string | null
 capa_url: string | null
 descricao: string | null
 dono_id: string
 created_at?: string | null
 whatsapp_suporte?: string | null
 instagram_url?: string | null
 discord_url?: string | null
}



 function obterOrigem() {
 if (typeof window === 'undefined') return ''
 return window.location.origin
 }

 async function copiarLinkPublico(texto: string) {
 try {
 await navigator.clipboard.writeText(texto)
 alert('Link copiado.')
 } catch {
 window.prompt('Copie o link:', texto)
 }
 }

type Profile = {
 id: string
 nome_exibicao: string | null
 avatar_url: string | null
}

type CampeonatoProdutora = {
 id: string
 nome: string
 logo_url: string | null
 banner_url: string | null
 status: string | null
 formato: string | null
 tipo_competicao: string | null
 modelo_competicao: string | null
 valor_vaga: number | null
 valor_premiacao: number | null
 vagas: number | null
 plataforma: string | null
 categoria: string | null
 regiao: string | null
 created_at?: string | null
 edicao?: string | number | null
 numero_edicao?: string | number | null
 edicao_numero?: string | number | null
 edicao_nome?: string | null
}

type AbaTipo = 'todos' | 'diario' | 'copa' | 'liga' | 'xtreino' | 'outros'

const ABAS_TIPOS: { key: AbaTipo; label: string }[] = [
 { key: 'todos', label: 'Todos' },
 { key: 'diario', label: 'Diário' },
 { key: 'copa', label: 'Copa' },
 { key: 'liga', label: 'Liga' },
 { key: 'xtreino', label: 'Xtreino' },
 { key: 'outros', label: 'Outros' },
]

function formatarMoeda(valor: number | null | undefined) {
 return new Intl.NumberFormat('pt-BR', {
 style: 'currency',
 currency: 'BRL',
 }).format(Number(valor || 0))
}

function removerAcentos(valor: string) {
 return valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function normalizarTipoParaAba(valor: string | null | undefined): AbaTipo {
 const tipo = removerAcentos(String(valor || '')).toLowerCase().trim()

 if (!tipo) return 'outros'
 if (tipo.includes('diario') || tipo.includes('jogo_unico') || tipo.includes('jogo unico')) return 'diario'
 if (tipo.includes('copa') || tipo.includes('mata_mata') || tipo.includes('mata mata')) return 'copa'
 if (tipo.includes('liga') || tipo.includes('pontos_corridos') || tipo.includes('pontos corridos')) return 'liga'
 if (tipo.includes('xtreino') || tipo.includes('x_treino') || tipo.includes('x-treino') || tipo.includes('treino')) return 'xtreino'
 if (tipo.includes('4x4') || tipo.includes('x4')) return 'outros'

 return 'outros'
}

function obterTipoCampeonato(camp: CampeonatoProdutora) {
 const tipoResolvido = resolverTipoCompeticao(camp as any)
 return String(tipoResolvido || camp.tipo_competicao || camp.modelo_competicao || camp.formato || 'campeonato')
}

function obterAbaCampeonato(camp: CampeonatoProdutora): AbaTipo {
 return normalizarTipoParaAba(obterTipoCampeonato(camp))
}

function obterEdicaoCampeonato(camp: CampeonatoProdutora) {
 const valorDireto = camp.edicao ?? camp.numero_edicao ?? camp.edicao_numero ?? camp.edicao_nome

 if (valorDireto !== null && valorDireto !== undefined && String(valorDireto).trim() !== '') {
 const valor = String(valorDireto).trim()
 return valor.toLowerCase().includes('edi') ? valor : `Edição ${valor}`
 }

 const nome = camp.nome || ''
 const matchEdicao = nome.match(/(?:edi[cç][aã]o|ed\.?|temporada|temp\.?|season)\s*#?\s*(\d+)/i)
 if (matchEdicao?.[1]) return `Edição ${matchEdicao[1]}`

 const matchNumeroOrdinal = nome.match(/(\d+)\s*[ªº]/i)
 if (matchNumeroOrdinal?.[1]) return `Edição ${matchNumeroOrdinal[1]}`

 return 'Sem edição'
}

function obterPesoEdicao(edicao: string) {
 const numero = edicao.match(/\d+/)?.[0]
 if (!numero) return -1
 return Number(numero)
}

export default function PerfilProdutoraPage() {
 const router = useRouter()
 const params = useParams<{ id: string }>()
 const produtoraId = params?.id

 const [loading, setLoading] = useState(true)
 const [userId, setUserId] = useState<string | null>(null)
 const [produtora, setProdutora] = useState<Produtora | null>(null)
 const [dono, setDono] = useState<Profile | null>(null)
 const [staffCount, setStaffCount] = useState(0)
 const [equipesInscritasCount, setEquipesInscritasCount] = useState(0)
 const [jogadoresInscritosCount, setJogadoresInscritosCount] = useState(0)
 const [campeonatos, setCampeonatos] = useState<CampeonatoProdutora[]>([])
 const [abaAtiva, setAbaAtiva] = useState<AbaTipo>('todos')

 async function carregar() {
 if (!produtoraId) return

 setLoading(true)

 try {
 const {
 data: { user },
 } = await supabase.auth.getUser()

 setUserId(user?.id || null)

 const { data: produtoraData, error } = await supabase
 .from('produtoras')
 .select('*')
 .eq('id', produtoraId)
 .single()

 if (error || !produtoraData) {
 router.push('/produtora')
 return
 }

 setProdutora(produtoraData)
 localStorage.setItem('perfil_ativo_id', produtoraData.id)

 if (produtoraData.dono_id) {
 const { data: donoData } = await supabase
 .from('profiles')
 .select('id, nome_exibicao, avatar_url')
 .eq('id', produtoraData.dono_id)
 .maybeSingle()

 if (donoData) setDono(donoData)
 }

 const { count: staff } = await supabase
 .from('membros_produtora')
 .select('*', { count: 'exact', head: true })
 .eq('produtora_id', produtoraId)
 .eq('ativo', true)

 setStaffCount(staff || 0)

 const { data: campeonatosData, error: campeonatosError } = await supabase
 .from('campeonatos')
 .select('*')
 .eq('produtora_id', produtoraId)
 .order('created_at', { ascending: false })

 if (campeonatosError) throw campeonatosError

 const campeonatosCarregados = (campeonatosData || []) as CampeonatoProdutora[]
 setCampeonatos(campeonatosCarregados)

 const campeonatoIds = campeonatosCarregados.map((camp) => camp.id).filter(Boolean)

 if (campeonatoIds.length > 0) {
 const { count: equipesCount, error: equipesCountError } = await supabase
 .from('campeonato_equipes')
 .select('id', { count: 'exact', head: true })
 .in('campeonato_id', campeonatoIds)

 setEquipesInscritasCount(equipesCountError ? 0 : equipesCount || 0)

 const { count: jogadoresCount, error: jogadoresCountError } = await supabase
 .from('campeonato_jogadores')
 .select('id', { count: 'exact', head: true })
 .in('campeonato_id', campeonatoIds)

 setJogadoresInscritosCount(jogadoresCountError ? 0 : jogadoresCount || 0)
 } else {
 setEquipesInscritasCount(0)
 setJogadoresInscritosCount(0)
 }
 } catch (error) {
 console.error('Erro ao carregar perfil da produtora:', error)
 } finally {
 setLoading(false)
 }
 }

 useEffect(() => {
 carregar()
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [produtoraId])

 const souDono = useMemo(() => {
 return !!produtora && !!userId && produtora.dono_id === userId
 }, [produtora, userId])

 const iniciais = useMemo(() => {
 const nome = produtora?.nome?.trim() || 'PR'
 const partes = nome.split(' ').filter(Boolean)
 if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase()
 return `${partes[0][0] || ''}${partes[1][0] || ''}`.toUpperCase()
 }, [produtora?.nome])

 const contagemPorTipo = useMemo(() => {
 const contagem = ABAS_TIPOS.reduce((acc, item) => {
 acc[item.key] = 0
 return acc
 }, {} as Record<AbaTipo, number>)

 contagem.todos = campeonatos.length

 campeonatos.forEach((camp) => {
 const aba = obterAbaCampeonato(camp)
 contagem[aba] = (contagem[aba] || 0) + 1
 })

 return contagem
 }, [campeonatos])

 const estatisticasProdutora = useMemo(() => {
 const premiacaoTotal = campeonatos.reduce(
 (acc, camp) => acc + Number(camp.valor_premiacao || 0),
 0
 )
 const vagasTotal = campeonatos.reduce(
 (acc, camp) => acc + Number(camp.vagas || 0),
 0
 )

 const pagos = campeonatos.filter((camp) => Number(camp.valor_vaga || 0) > 0).length
 const gratuitos = campeonatos.length - pagos

 return {
 premiacaoTotal,
 vagasTotal,
 pagos,
 gratuitos,
 }
 }, [campeonatos])

 const campeonatosFiltrados = useMemo(() => {
 if (abaAtiva === 'todos') return campeonatos
 return campeonatos.filter((camp) => obterAbaCampeonato(camp) === abaAtiva)
 }, [abaAtiva, campeonatos])

 const campeonatosPorEdicao = useMemo(() => {
 const grupos = campeonatosFiltrados.reduce((acc, camp) => {
 const edicao = obterEdicaoCampeonato(camp)
 if (!acc[edicao]) acc[edicao] = []
 acc[edicao].push(camp)
 return acc
 }, {} as Record<string, CampeonatoProdutora[]>)

 return Object.entries(grupos).sort(([edicaoA], [edicaoB]) => {
 const pesoA = obterPesoEdicao(edicaoA)
 const pesoB = obterPesoEdicao(edicaoB)
 if (pesoA !== pesoB) return pesoB - pesoA
 return edicaoA.localeCompare(edicaoB)
 })
 }, [campeonatosFiltrados])

 if (loading) {
 return (
 <div className="flex h-screen items-center justify-center bg-[#f7f7f7]">
 <Loader2 className="animate-spin text-[#2563eb]" size={40} />
 </div>
 )
 }

 if (!produtora) return null


 const origem = obterOrigem()
 const slugPublico = produtora.slug || produtora.id
 const linkPublicoProdutora = origem ? `${origem}/p/${slugPublico}` : `/p/${slugPublico}`
 const whatsappProdutora = String(produtora.whatsapp_suporte || '').replace(/\D/g, '')
 const linkWhatsAppProdutora = whatsappProdutora
 ? `https://wa.me/${whatsappProdutora}?text=${encodeURIComponent(`Olá, vim pelo Drop Zone e quero informações sobre os campeonatos da produtora ${produtora.nome}.`)}`
 : ''

 return (
 <>
 <div className="min-h-screen bg-[#f7f7f7] text-[#142340]">
 <div className="mx-auto max-w-7xl px-3 py-3 md:px-6">
 <section className="relative overflow-hidden border border-zinc-200 bg-white">
 <div className="h-[170px] w-full md:h-[210px]">
 {produtora.capa_url ? (
 <img
 src={produtora.capa_url}
 alt="Capa da produtora"
 className="h-full w-full object-cover opacity-90"
 />
 ) : null}
 </div>
 </section>

 <section className="relative border-x border-b border-zinc-200 bg-white px-4 pb-6 pt-0 md:px-8">
 <div className="-mt-14 flex flex-col gap-3 md:-mt-12 md:flex-row md:items-end md:justify-between">
 <div className="flex flex-col gap-3 md:flex-row md:items-end">
 <div className="relative h-[118px] w-[118px] shrink-0 overflow-hidden border border-zinc-300 bg-white md:h-[128px] md:w-[128px]">
 {produtora.logo_url ? (
 <img
 src={produtora.logo_url}
 alt={produtora.nome}
 className="h-full w-full object-cover"
 />
 ) : (
 <div className="flex h-full w-full items-center justify-center bg-zinc-100 text-4xl font-semibold text-zinc-500">
 {iniciais}
 </div>
 )}

 <div className="absolute bottom-1 right-1 flex h-7 w-7 items-center justify-center border border-zinc-200 bg-white">
 <ShieldCheck size={16} className="text-[#2563eb]" />
 </div>
 </div>

 <div className="pb-1">
 <div className="mb-2 flex flex-wrap items-center gap-3">
 <h1 className="text-[24px] font-semibold uppercase tracking-tight text-[#142340] md:text-[30px]">
 {produtora.nome}
 </h1>

 <span className="border border-zinc-200 bg-zinc-50 px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-[#2563eb]">
 Produtora Oficial
 </span>
 </div>

 <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">
 <div className="flex items-center gap-2">
 <CalendarDays size={13} className="text-[#2563eb]" />
 <span>
 Ativa desde{' '}
 {produtora.created_at
 ? new Date(produtora.created_at).toLocaleDateString(
 'pt-BR'
 )
 : 'data não informada'}
 </span>
 </div>

 <div className="flex items-center gap-2">
 <Radio size={13} className="text-[#2563eb]" />
 <span>Organização de campeonatos</span>
 </div>
 </div>
 </div>
 </div>

 {souDono && (
 <div className="flex flex-wrap gap-3 pb-2">
 <Link
 href={`/produtora/${produtoraId}/gestao`}
 className="inline-flex h-10 items-center gap-2 border border-zinc-300 bg-white px-4 text-[12px] font-medium uppercase tracking-wide text-[#142340] transition hover:bg-zinc-50"
 >
 <Settings size={15} className="text-[#2563eb]" />
 Gestão
 </Link>

 <Link
 href="/produtora/config"
 className="inline-flex h-10 items-center gap-2 border border-zinc-300 bg-white px-4 text-[12px] font-medium uppercase tracking-wide text-[#142340] transition hover:bg-zinc-50"
 >
 <Pencil size={15} className="text-[#2563eb]" />
 Editar Perfil
 </Link>
 </div>
 )}
 </div>

 <div className="mt-3 border-b-4 border-[#00d15f]" />
 </section>

 <section className="mt-3 border border-zinc-200 bg-white">
 <div className="px-4 py-3 md:px-4">
 <div className="mb-2 flex items-center gap-2 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
 <span className="inline-block h-2 w-2 bg-[#2563eb]" />
 <span>Resumo da Produtora</span>
 </div>

 <p className="text-[13px] leading-7 text-[#142340] md:text-[15px]">
 {produtora.descricao?.trim()
 ? produtora.descricao
 : 'Nenhuma descrição cadastrada no protocolo atual.'}
 </p>
 </div>
 </section>

 <section className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-7">
 {[
 { label: 'Identidade', value: produtora.slug || 'sem-slug', icon: Building2 },
 { label: 'Staff', value: staffCount, icon: Users },
 { label: 'Campeonatos', value: campeonatos.length, icon: Trophy },
 { label: 'Equipes', value: equipesInscritasCount, icon: ShieldCheck },
 { label: 'Jogadores', value: jogadoresInscritosCount, icon: Users },
 { label: 'Vagas', value: estatisticasProdutora.vagasTotal || '-', icon: Layers3 },
 { label: 'Premiação', value: formatarMoeda(estatisticasProdutora.premiacaoTotal), icon: Trophy },
 ].map((item) => {
 const Icon = item.icon

 return (
 <div key={item.label} className="border border-zinc-200 bg-white p-2">
 <div className="mb-1 flex items-center gap-2 text-[10px] font-medium uppercase text-zinc-500">
 <Icon size={13} className="text-[#2563eb]" />
 {item.label}
 </div>
 <p className="truncate text-[15px] font-semibold text-[#142340]">
 {item.value}
 </p>
 </div>
 )
 })}
 </section>


 <section className="mt-3 border border-zinc-200 bg-white p-4">
 <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
 <div>
 <div className="mb-1 flex items-center gap-2 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
 <span className="inline-block h-2 w-2 bg-[#2563eb]" /> Links públicos
 </div>
 <p className="text-[12px] text-zinc-500">Use esse link na bio, WhatsApp, Discord ou descrição dos grupos.</p>
 </div>
 <div className="flex flex-wrap gap-2">
 <button
 type="button"
 onClick={() => copiarLinkPublico(linkPublicoProdutora)}
 className="inline-flex h-9 items-center gap-2 border border-zinc-300 bg-white px-3 text-[11px] font-medium uppercase tracking-wide text-[#142340] hover:bg-zinc-50"
 >
 <Copy size={14} className="text-[#2563eb]" /> Copiar link da produtora
 </button>
 <Link
 href={linkPublicoProdutora}
 target="_blank"
 className="inline-flex h-9 items-center gap-2 bg-[#2563eb] px-3 text-[11px] font-medium uppercase tracking-wide text-white hover:bg-[#1d4ed8]"
 >
 <ExternalLink size={14} /> Abrir link público
 </Link>
 {linkWhatsAppProdutora ? (
 <Link
 href={linkWhatsAppProdutora}
 target="_blank"
 className="inline-flex h-9 items-center gap-2 bg-[#16a34a] px-3 text-[11px] font-medium uppercase tracking-wide text-white hover:bg-[#15803d]"
 >
 <MessageCircle size={14} /> WhatsApp
 </Link>
 ) : null}
 </div>
 </div>
 <div className="border border-zinc-200 bg-zinc-50 px-3 py-2 text-[12px] font-semibold text-[#142340]">
 {linkPublicoProdutora}
 </div>
 </section>

 <section className="mt-3 border border-zinc-200 bg-white">
 <div className="flex flex-col gap-3 border-b border-zinc-200 px-3 py-3 md:flex-row md:items-center md:justify-between md:px-4">
 <div>
 <div className="mb-1 flex items-center gap-2 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
 <span className="inline-block h-2 w-2 bg-[#2563eb]" />
 Campeonatos da Produtora
 </div>
 <p className="text-[12px] text-zinc-500">
 Separados por tipo e organizados por edição
 </p>
 </div>

 {souDono && (
 <button
 onClick={() => {
 localStorage.setItem('ff_tipo_perfil_ativo', 'produtora')
 localStorage.setItem('ff_id_perfil_ativo', String(produtoraId))
 router.push(`/campeonatos/nova?produtoraId=${produtoraId}`)
 }}
 className="inline-flex h-9 items-center justify-center gap-2 bg-[#2563eb] px-4 text-[12px] font-medium uppercase tracking-wide text-[#142340] transition hover:bg-[#1d4ed8]"
 >
 <Plus size={14} />
 Novo campeonato
 </button>
 )}
 </div>

 {campeonatos.length === 0 ? (
 <div className="px-6 py-12 text-center text-sm font-semibold uppercase tracking-wide text-zinc-500">
 Nenhum campeonato criado por esta produtora ainda.
 </div>
 ) : (
 <>
 <div className="flex gap-2 overflow-x-auto border-b border-zinc-200 bg-zinc-50 px-4 py-3 md:px-6">
 {ABAS_TIPOS.map((aba) => {
 const ativo = abaAtiva === aba.key
 const total = contagemPorTipo[aba.key] || 0

 return (
 <button
 key={aba.key}
 onClick={() => setAbaAtiva(aba.key)}
 className={`flex shrink-0 items-center gap-2 border px-3 py-2 text-[11px] font-medium uppercase tracking-wide transition ${
 ativo
 ? 'border-zinc-200 bg-white text-[#142340]'
 : 'border-zinc-200 bg-white text-zinc-500 hover:border-zinc-200 hover:text-[#142340]'
 }`}
 >
 {aba.label}
 <span className={ativo ? 'text-[#2563eb]' : 'text-zinc-500'}>
 {total}
 </span>
 </button>
 )
 })}
 </div>

 {campeonatosFiltrados.length === 0 ? (
 <div className="px-6 py-12 text-center text-sm font-semibold uppercase tracking-wide text-zinc-500">
 Nenhum campeonato encontrado neste tipo.
 </div>
 ) : (
 <div className="divide-y divide-[#d7dce5]">
 {campeonatosPorEdicao.map(([edicao, lista]) => {
 const totalPremiacao = lista.reduce((acc, camp) => acc + Number(camp.valor_premiacao || 0), 0)
 const totalVagas = lista.reduce((acc, camp) => acc + Number(camp.vagas || 0), 0)

 return (
 <div key={edicao}>
 <div className="grid gap-3 border-b border-zinc-200 bg-zinc-50 px-4 py-3 md:grid-cols-[minmax(0,1fr)_150px_120px] md:items-center md:px-4">
 <div className="flex items-center gap-3">
 <div className="flex h-9 w-9 items-center justify-center border border-zinc-200 bg-white text-[#142340]">
 <Layers3 size={17} className="text-[#2563eb]" />
 </div>
 <div>
 <h3 className="text-[15px] font-semibold uppercase text-[#142340]">
 {edicao}
 </h3>
 <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
 {lista.length} campeonato{lista.length === 1 ? '' : 's'} nesta edição
 </p>
 </div>
 </div>

 <div>
 <div className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">Premiação total</div>
 <div className="mt-1 text-[13px] font-semibold text-emerald-600">{formatarMoeda(totalPremiacao)}</div>
 </div>

 <div>
 <div className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">Vagas</div>
 <div className="mt-1 text-[13px] font-semibold text-[#142340]">{totalVagas || '-'}</div>
 </div>
 </div>

 <div className="divide-y divide-[#e3e7ee]">
 {lista.map((camp) => {
 const tipoResolvido = obterTipoCampeonato(camp)
 const href = getCampeonatoHref(camp.id, tipoResolvido)
 const inscricao = Number(camp.valor_vaga || 0) > 0
 ? formatarMoeda(camp.valor_vaga)
 : 'Grátis'

 return (
 <Link
 key={camp.id}
 href={href}
 className="grid gap-3 px-4 py-3 transition hover:bg-zinc-50 md:grid-cols-[minmax(0,1fr)_130px_130px_110px_120px] md:items-center md:px-4"
 >
 <div className="flex min-w-0 items-center gap-4">
 <div className="h-10 w-10 shrink-0 overflow-hidden border border-zinc-200 bg-zinc-100">
 {camp.logo_url ? (
 <img src={camp.logo_url} alt={camp.nome} className="h-full w-full object-cover" />
 ) : (
 <div className="flex h-full w-full items-center justify-center text-[15px] font-semibold text-zinc-500">
 {camp.nome?.slice(0, 2).toUpperCase() || 'CP'}
 </div>
 )}
 </div>

 <div className="min-w-0">
 <div className="truncate text-[14px] font-semibold uppercase text-[#142340]">
 {camp.nome}
 </div>
 <div className="mt-1 flex flex-wrap gap-2 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
 <span>{String(tipoResolvido || 'campeonato')}</span>
 <span>•</span>
 <span>{camp.plataforma || 'Plataforma não informada'}</span>
 <span>•</span>
 <span>{camp.categoria || 'Categoria não informada'}</span>
 </div>
 </div>
 </div>

 <div>
 <div className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">Premiação</div>
 <div className="mt-1 text-[13px] font-semibold text-emerald-600">{formatarMoeda(camp.valor_premiacao)}</div>
 </div>

 <div>
 <div className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">Inscrição</div>
 <div className="mt-1 text-[13px] font-semibold text-[#142340]">{inscricao}</div>
 </div>

 <div>
 <div className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">Região</div>
 <div className="mt-1 text-[13px] font-semibold uppercase text-[#142340]">{camp.regiao || '-'}</div>
 </div>

 <div className="flex items-center justify-between gap-3 md:justify-end">
 <span className="border border-zinc-200 bg-zinc-50 px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
 {camp.status || 'rascunho'}
 </span>
 <Eye size={18} className="text-[#2563eb]" />
 </div>
 </Link>
 )
 })}
 </div>
 </div>
 )
 })}
 </div>
 )}
 </>
 )}
 </section>

 <section className="mt-3 border border-zinc-200 bg-white">
 <div className="px-4 py-3 md:px-4">
 <div className="mb-2 flex items-center gap-2 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
 <span className="inline-block h-2 w-2 bg-[#2563eb]" />
 Responsável Principal
 </div>

 <div className="flex items-center gap-4">
 <div className="h-10 w-10 overflow-hidden border border-zinc-200 bg-zinc-100">
 {dono?.avatar_url ? (
 <img
 src={dono.avatar_url}
 alt={dono.nome_exibicao || 'Dono'}
 className="h-full w-full object-cover"
 />
 ) : (
 <div className="flex h-full w-full items-center justify-center text-[15px] font-semibold text-zinc-500">
 {(dono?.nome_exibicao || 'DP').slice(0, 2).toUpperCase()}
 </div>
 )}
 </div>

 <div>
 <p className="text-[15px] font-semibold uppercase text-[#142340]">
 {dono?.nome_exibicao || 'Responsável não identificado'}
 </p>
 <p className="text-[12px] text-zinc-500">
 Dono da produtora
 </p>
 </div>
 </div>
 </div>
 </section>
 </div>
 </div>
 </>
 )
}
