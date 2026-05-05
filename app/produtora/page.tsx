'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import {
 Building2,
 Calendar,
 ExternalLink,
 Globe,
 Hash,
 Info,
 Loader2,
 Plus,
 Search,
 ShieldCheck,
 Star,
 TrendingUp,
 Users,
 X,
} from 'lucide-react'
import FormProdutora from './components/FormProdutora'

type Produtora = {
 id: string
 nome: string
 slug: string | null
 logo_url: string | null
 descricao: string | null
 dono_id: string
 created_at?: string | null
}

function dataCurta(data?: string | null) {
 if (!data) return '--'
 return new Date(data).toLocaleDateString('pt-BR')
}

function iniciais(nome?: string | null) {
 const texto = (nome || 'PR').trim()
 const partes = texto.split(' ').filter(Boolean)
 if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase()
 return `${partes[0][0] || ''}${partes[1][0] || ''}`.toUpperCase()
}

export default function ProdutoraPage() {
 const router = useRouter()

 const [loading, setLoading] = useState(true)
 const [userId, setUserId] = useState<string | null>(null)
 const [listaProdutoras, setListaProdutoras] = useState<Produtora[]>([])
 const [busca, setBusca] = useState('')
 const [modalNovaAberto, setModalNovaAberto] = useState(false)

 const carregarDados = useCallback(async () => {
 setLoading(true)

 try {
 const {
 data: { user },
 } = await supabase.auth.getUser()

 if (!user) {
 router.push('/login')
 return
 }

 setUserId(user.id)

 const { data, error } = await supabase
 .from('produtoras')
 .select('*')
 .order('created_at', { ascending: false })

 if (error) throw error

 setListaProdutoras(data || [])
 } catch (error) {
 console.error('Erro ao carregar produtoras:', error)
 } finally {
 setLoading(false)
 }
 }, [router])

 useEffect(() => {
 carregarDados()
 }, [carregarDados])

 const minhasProdutoras = useMemo(() => {
 return listaProdutoras.filter((item) => item.dono_id === userId)
 }, [listaProdutoras, userId])

 const explorarProdutoras = useMemo(() => {
 const termo = busca.trim().toLowerCase()
 if (!termo) return listaProdutoras

 return listaProdutoras.filter((item) => {
 return (
 item.nome?.toLowerCase().includes(termo) ||
 item.slug?.toLowerCase().includes(termo) ||
 item.id?.toLowerCase().includes(termo) ||
 item.descricao?.toLowerCase().includes(termo)
 )
 })
 }, [listaProdutoras, busca])

 const ultimasProdutoras = useMemo(() => {
 return [...listaProdutoras]
 .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
 .slice(0, 6)
 }, [listaProdutoras])

 function abrirPerfil(id: string) {
 localStorage.setItem('perfil_ativo_id', id)
 router.push(`/produtora/${id}`)
 }

 if (loading) {
 return (
 <div className="flex h-screen items-center justify-center bg-[#f7f7f7]">
 <Loader2 className="animate-spin text-[#2563eb]" size={40} />
 </div>
 )
 }

 return (
 <>
 <div className="min-h-screen bg-[#f7f7f7] text-[#142340]">
 <div className="mx-auto max-w-[1520px] px-4 pb-6 pt-5">
 <section className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
 <div>
 <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#2563eb]">
 <Building2 size={18} />
 Produtoras
 </div>
 <h1 className="text-[20px] font-semibold tracking-tight text-[#142340] md:text-[22px]">
 Ecossistema de organizações
 </h1>
 <p className="mt-1 text-xs font-medium text-zinc-500">
 Contas de gestão, produtoras oficiais e organizações cadastradas na plataforma.
 </p>
 </div>

 <button
 onClick={() => setModalNovaAberto(true)}
 className="inline-flex h-9 items-center justify-center gap-2 bg-[#2563eb] px-4 text-[12px] font-medium uppercase tracking-wide text-[#142340] transition hover:bg-[#1d4ed8]"
 >
 <Plus size={16} />
 Criar nova
 </button>
 </section>

 <section className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4">
 <div className="border border-zinc-200 bg-white p-3">
 <div className="flex items-center gap-2 text-[10px] font-medium uppercase text-zinc-500">
 <Globe size={15} className="text-[#2563eb]" />
 Organizações
 </div>
 <div className="mt-1 text-[18px] font-semibold text-[#142340]">
 {listaProdutoras.length}
 </div>
 <div className="text-[10px] font-medium uppercase text-zinc-500">
 cadastradas
 </div>
 </div>

 <div className="border border-zinc-200 bg-white p-3">
 <div className="flex items-center gap-2 text-[10px] font-medium uppercase text-zinc-500">
 <ShieldCheck size={15} className="text-[#2563eb]" />
 Minhas
 </div>
 <div className="mt-1 text-[18px] font-semibold text-[#142340]">
 {minhasProdutoras.length}
 </div>
 <div className="text-[10px] font-medium uppercase text-zinc-500">
 contas de gestão
 </div>
 </div>

 <div className="border border-zinc-200 bg-white p-3">
 <div className="flex items-center gap-2 text-[10px] font-medium uppercase text-zinc-500">
 <Users size={15} className="text-[#2563eb]" />
 Público
 </div>
 <div className="mt-1 text-[18px] font-semibold text-[#142340]">
 {Math.max(listaProdutoras.length - minhasProdutoras.length, 0)}
 </div>
 <div className="text-[10px] font-medium uppercase text-zinc-500">
 para explorar
 </div>
 </div>

 <div className="border border-zinc-200 bg-white p-3">
 <div className="flex items-center gap-2 text-[10px] font-medium uppercase text-zinc-500">
 <TrendingUp size={15} className="text-[#2563eb]" />
 Resultado
 </div>
 <div className="mt-1 text-[18px] font-semibold text-[#142340]">
 {explorarProdutoras.length}
 </div>
 <div className="text-[10px] font-medium uppercase text-zinc-500">
 no filtro atual
 </div>
 </div>
 </section>

 {minhasProdutoras.length > 0 && (
 <section className="mb-4 border border-zinc-200 bg-white">
 <div className="flex items-center justify-between px-4 py-3">
 <div className="flex items-center gap-2 text-[12px] font-semibold uppercase ">
 <Star size={16} className="text-[#2563eb]" />
 Minhas contas de gestão
 </div>
 <span className="text-[10px] font-medium uppercase text-zinc-500">
 administradas por você
 </span>
 </div>

 <div className="overflow-x-auto px-3 pb-3">
 <div className="flex min-w-max gap-3">
 {minhasProdutoras.map((item) => (
 <button
 key={item.id}
 onClick={() => abrirPerfil(item.id)}
 className="flex w-[260px] shrink-0 items-center gap-2 border border-zinc-200 bg-white p-2 text-left transition hover:bg-zinc-50"
 >
 <div className="h-10 w-10 shrink-0 overflow-hidden bg-zinc-100">
 {item.logo_url ? (
 <img
 src={item.logo_url}
 alt={item.nome}
 className="h-full w-full object-cover"
 />
 ) : (
 <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-[#2563eb]">
 {iniciais(item.nome)}
 </div>
 )}
 </div>

 <div className="min-w-0 flex-1">
 <h3 className="truncate text-[13px] font-semibold uppercase text-[#142340]">
 {item.nome}
 </h3>
 <span className="text-[10px] font-semibold uppercase text-[#2563eb]">
 Conta administradora
 </span>
 <div className="mt-1 text-[10px] font-medium uppercase text-zinc-500">
 {item.slug || item.id.slice(0, 8)}
 </div>
 </div>
 </button>
 ))}
 </div>
 </div>
 </section>
 )}

 {ultimasProdutoras.length > 0 && (
 <section className="mb-4 border border-zinc-200 bg-white">
 <div className="flex items-center justify-between px-4 py-3">
 <div className="flex items-center gap-2 text-[12px] font-semibold uppercase ">
 <TrendingUp size={16} className="text-[#2563eb]" />
 Últimas produtoras
 </div>
 <span className="text-[10px] font-medium uppercase text-zinc-500">
 recém-cadastradas
 </span>
 </div>

 <div className="overflow-x-auto px-3 pb-3">
 <div className="flex min-w-max gap-3">
 {ultimasProdutoras.map((item) => (
 <button
 key={`ultima-${item.id}`}
 onClick={() => abrirPerfil(item.id)}
 className="flex w-[230px] shrink-0 items-center gap-2 border border-zinc-200 bg-white p-2 text-left transition hover:bg-zinc-50"
 >
 <div className="h-10 w-10 shrink-0 overflow-hidden bg-zinc-100">
 {item.logo_url ? (
 <img
 src={item.logo_url}
 alt={item.nome}
 className="h-full w-full object-cover"
 />
 ) : (
 <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-[#2563eb]">
 {iniciais(item.nome)}
 </div>
 )}
 </div>

 <div className="min-w-0">
 <div className="truncate text-[13px] font-semibold uppercase text-[#142340]">
 {item.nome}
 </div>
 <div className="mt-1 text-[10px] font-medium uppercase text-zinc-500">
 {dataCurta(item.created_at)}
 </div>
 </div>
 </button>
 ))}
 </div>
 </div>
 </section>
 )}

 <section className="border border-zinc-200 bg-white">
 <div className="flex flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
 <div>
 <div className="flex items-center gap-2 text-[12px] font-semibold uppercase ">
 <Globe size={16} className="text-[#2563eb]" />
 Explorar ecossistema
 </div>
 <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
 Base de dados completa de organizações
 </p>
 </div>

 <div className="relative lg:w-[420px]">
 <Search
 className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
 size={15}
 />
 <input
 type="text"
 placeholder="Filtrar por nome, slug ou id..."
 value={busca}
 onChange={(e) => setBusca(e.target.value)}
 className="h-9 w-full border border-zinc-200 bg-white pl-9 pr-3 text-[12px] font-medium text-[#142340] outline-none placeholder:text-zinc-500 transition focus:border-[#2563eb]"
 />
 </div>
 </div>

 <div className="overflow-x-auto px-3 pb-3">
 <div className="min-w-[1040px]">
 <div className="grid grid-cols-[2fr_2.2fr_1.2fr_150px_110px] bg-zinc-50 px-3 py-2 text-[10px] font-medium uppercase text-zinc-500">
 <div>Organização</div>
 <div>Informações / Bio</div>
 <div>Identidade</div>
 <div>Registro</div>
 <div className="text-right">Ação</div>
 </div>

 {explorarProdutoras.map((item) => (
 <button
 key={item.id}
 onClick={() => abrirPerfil(item.id)}
 className="grid w-full grid-cols-[2fr_2.2fr_1.2fr_150px_110px] items-center border-t border-zinc-200 px-3 py-2 text-left text-[12px] transition hover:bg-zinc-50"
 >
 <div className="flex min-w-0 items-center gap-3">
 <div className="h-10 w-10 shrink-0 overflow-hidden bg-zinc-100">
 {item.logo_url ? (
 <img
 src={item.logo_url}
 alt={item.nome}
 className="h-full w-full object-cover"
 />
 ) : (
 <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-[#2563eb]">
 {iniciais(item.nome)}
 </div>
 )}
 </div>

 <div className="min-w-0">
 <div className="truncate text-[13px] font-semibold uppercase text-[#142340]">
 {item.nome}
 </div>
 <div className="mt-0.5 flex items-center gap-1.5 text-[10px] font-mono text-zinc-500">
 <Hash size={10} />
 {item.id.substring(0, 18)}...
 </div>
 </div>
 </div>

 <div className="flex min-w-0 items-start gap-2 pr-4">
 <Info size={14} className="mt-0.5 shrink-0 text-zinc-500" />
 <p className="line-clamp-2 text-[11px] font-medium uppercase leading-5 text-zinc-500">
 {item.descricao || 'Nenhuma descrição técnica informada.'}
 </p>
 </div>

 <div>
 <div className="text-[11px] font-semibold uppercase text-zinc-500">
 {item.slug || 'Sem slug'}
 </div>
 <div className="mt-1 text-[9px] font-semibold uppercase text-zinc-500">
 identidade pública
 </div>
 </div>

 <div className="flex items-center gap-2 text-zinc-500">
 <Calendar size={14} className="text-[#2563eb]" />
 <span className="text-[11px] font-semibold">
 {dataCurta(item.created_at)}
 </span>
 </div>

 <div className="flex justify-end">
 <span className="inline-flex items-center gap-2 border border-zinc-300 px-3 py-1.5 text-[10px] font-semibold uppercase text-[#142340] transition hover:bg-[#2563eb] hover:text-[#142340]">
 Ver
 <ExternalLink size={12} />
 </span>
 </div>
 </button>
 ))}
 </div>

 {explorarProdutoras.length === 0 && (
 <div className="py-20 text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
 Nenhuma produtora encontrada para o filtro: "{busca}"
 </div>
 )}
 </div>
 </section>
 </div>
 </div>

 {modalNovaAberto && (
 <div className="fixed inset-0 z-[999] flex items-center justify-center p-3">
 <div
 className="absolute inset-0 bg-zinc-100/80 -md"
 onClick={() => setModalNovaAberto(false)}
 />

 <div className="relative z-10 w-full max-w-5xl overflow-hidden border border-zinc-200 bg-white">
 <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
 <div>
 <h2 className="text-[18px] font-semibold text-[#142340]">
 Nova produtora
 </h2>
 <p className="mt-1 text-[10px] font-medium uppercase text-zinc-500">
 Criar conta de gestão sem sair da tela
 </p>
 </div>

 <button
 onClick={() => setModalNovaAberto(false)}
 className="flex h-10 w-10 items-center justify-center text-zinc-500 transition hover:bg-zinc-50 hover:text-[#142340]"
 >
 <X size={18} />
 </button>
 </div>

 <FormProdutora
 mode="create"
 embedded
 onCancel={() => setModalNovaAberto(false)}
 onSuccess={(nova) => {
 setModalNovaAberto(false)
 carregarDados()
 abrirPerfil(nova.id)
 }}
 />
 </div>
 </div>
 )}
 </>
 )
}
