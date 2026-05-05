'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { ArrowLeft, Image as ImageIcon, Loader2, Save, Upload } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { optimizeImageToWebp, sanitizeImageName } from '@/lib/imageOptimize'
import { usePerfil } from '@/app/contexts/PerfilContext'

type Equipe = {
 id: string
 nome: string
 tag: string | null
 logo_url: string | null
 cover_url: string | null
 descricao: string | null
 cidade: string | null
 estado: string | null
 pais: string | null
 data_fundacao: string | null
 criado_por: string | null
}

function normalizarDataInput(data?: string | null) {
 if (!data) return ''
 if (/^\d{4}-\d{2}-\d{2}$/.test(data)) return data
 const d = new Date(data)
 if (Number.isNaN(d.getTime())) return ''
 return d.toISOString().slice(0, 10)
}

async function uploadImagem(bucket: string, file: File, userId: string, kind: 'logo' | 'original' = 'original') {
 const finalFile = kind === 'logo' ? await optimizeImageToWebp(file, 'logo') : file
 const extensao = kind === 'logo' ? 'webp' : finalFile.name.split('.').pop() || 'png'
 const nomeSeguro = sanitizeImageName(finalFile.name, kind === 'logo' ? 'logo' : 'imagem')
 const fileName = `${userId}/${Date.now()}-${nomeSeguro}.${extensao}`

 const { error } = await supabase.storage.from(bucket).upload(fileName, finalFile, {
 upsert: true,
 cacheControl: '3600',
 contentType: finalFile.type || undefined,
 })

 if (error) throw error

 const { data } = supabase.storage.from(bucket).getPublicUrl(fileName)
 return data.publicUrl
}

export default function EditarEquipePage() {
 const router = useRouter()
 const params = useParams()
 const { user } = usePerfil()
 const equipeId = String(params?.id || '')

 const [loading, setLoading] = useState(true)
 const [salvando, setSalvando] = useState(false)
 const [erro, setErro] = useState<string | null>(null)

 const [equipe, setEquipe] = useState<Equipe | null>(null)
 const [nome, setNome] = useState('')
 const [tag, setTag] = useState('')
 const [descricao, setDescricao] = useState('')
 const [cidade, setCidade] = useState('')
 const [estado, setEstado] = useState('')
 const [pais, setPais] = useState('')
 const [dataFundacao, setDataFundacao] = useState('')
 const [logo, setLogo] = useState<File | null>(null)
 const [capa, setCapa] = useState<File | null>(null)

 const logoPreview = useMemo(() => {
 if (logo) return URL.createObjectURL(logo)
 return equipe?.logo_url || ''
 }, [logo, equipe?.logo_url])

 const capaPreview = useMemo(() => {
 if (capa) return URL.createObjectURL(capa)
 return equipe?.cover_url || ''
 }, [capa, equipe?.cover_url])

 const podeEditar = Boolean(user?.id && equipe?.criado_por === user.id)

 const carregarEquipe = useCallback(async () => {
 if (!equipeId) return

 try {
 setLoading(true)
 setErro(null)

 const { data, error } = await supabase
 .from('equipes')
 .select('id, nome, tag, logo_url, cover_url, descricao, cidade, estado, pais, data_fundacao, criado_por')
 .eq('id', equipeId)
 .maybeSingle()

 if (error) throw error
 if (!data) throw new Error('Equipe não encontrada.')

 setEquipe(data as Equipe)
 setNome(data.nome || '')
 setTag(data.tag || '')
 setDescricao(data.descricao || '')
 setCidade(data.cidade || '')
 setEstado(data.estado || '')
 setPais(data.pais || '')
 setDataFundacao(normalizarDataInput(data.data_fundacao))
 } catch (err: any) {
 setErro(err?.message || 'Erro ao carregar equipe.')
 } finally {
 setLoading(false)
 }
 }, [equipeId])

 useEffect(() => {
 carregarEquipe()
 }, [carregarEquipe])

 async function salvarAlteracoes(e: React.FormEvent<HTMLFormElement>) {
 e.preventDefault()

 if (!user?.id) {
 setErro('Você precisa estar logado para editar a equipe.')
 return
 }

 if (!equipe) return

 if (equipe.criado_por !== user.id) {
 setErro('Você não tem permissão para editar esta equipe.')
 return
 }

 try {
 setSalvando(true)
 setErro(null)

 let logoUrl = equipe.logo_url
 let coverUrl = equipe.cover_url

 if (logo) logoUrl = await uploadImagem('team-logos', logo, user.id, 'logo')
 if (capa) coverUrl = await uploadImagem('team-covers', capa, user.id)

 const { error } = await supabase
 .from('equipes')
 .update({
 nome: nome.trim(),
 tag: tag.trim().toUpperCase() || null,
 descricao: descricao.trim() || null,
 cidade: cidade.trim() || null,
 estado: estado.trim() || null,
 pais: pais.trim() || null,
 data_fundacao: dataFundacao || null,
 logo_url: logoUrl,
 cover_url: coverUrl,
 updated_at: new Date().toISOString(),
 })
 .eq('id', equipe.id)
 .eq('criado_por', user.id)

 if (error) throw error

 router.push(`/equipe/${equipe.id}`)
 router.refresh()
 } catch (err: any) {
 setErro(err?.message || 'Erro ao salvar alterações.')
 } finally {
 setSalvando(false)
 }
 }

 if (loading) {
 return (
 <main className="min-h-screen bg-[#f5f5f5] px-6 py-10 text-[#142340]">
 <div className="mx-auto max-w-5xl border border-zinc-200 bg-white p-10">
 <div className="flex items-center gap-3 text-[12px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
 <Loader2 className="animate-spin" size={18} />
 Carregando edição da equipe...
 </div>
 </div>
 </main>
 )
 }

 if (erro && !equipe) {
 return (
 <main className="min-h-screen bg-[#f5f5f5] px-6 py-10 text-[#142340]">
 <div className="mx-auto max-w-5xl border border-red-200 bg-white p-10">
 <p className="text-[12px] font-semibold uppercase tracking-[0.22em] text-red-600">{erro}</p>
 <button
 onClick={() => router.back()}
 className="mt-6 inline-flex h-11 items-center gap-2 border border-zinc-200 px-5 text-[11px] font-semibold uppercase tracking-wide"
 >
 <ArrowLeft size={15} />
 Voltar
 </button>
 </div>
 </main>
 )
 }

 return (
 <main className="min-h-screen bg-[#f5f5f5] px-6 py-10 text-[#142340]">
 <div className="mx-auto max-w-6xl">
 <button
 onClick={() => router.push(`/equipe/${equipeId}`)}
 className="mb-6 inline-flex h-11 items-center gap-2 border border-zinc-200 bg-white px-5 text-[11px] font-semibold uppercase tracking-wide text-[#142340] transition hover:bg-white"
 >
 <ArrowLeft size={15} />
 Voltar ao perfil
 </button>

 <form onSubmit={salvarAlteracoes} className="border border-zinc-300 bg-white p-8">
 <div className="mb-8 flex flex-col gap-4 border-b border-zinc-200 pb-6 md:flex-row md:items-end md:justify-between">
 <div>
 <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#2563eb]">// edição da equipe</p>
 <h1 className="mt-2 text-4xl font-semibold uppercase tracking-tighter text-[#142340]">Editar perfil</h1>
 <p className="mt-2 text-[13px] font-semibold text-zinc-500">Atualize capa, logo e informações públicas da equipe.</p>
 </div>

 <button
 type="submit"
 disabled={salvando || !podeEditar}
 className="inline-flex h-12 items-center justify-center gap-2 border border-[#2563eb] bg-[#2563eb] px-6 text-[12px] font-semibold uppercase tracking-wide text-[#142340] transition hover:bg-[#12923b] disabled:cursor-not-allowed disabled:opacity-50"
 >
 {salvando ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
 Salvar alterações
 </button>
 </div>

 {!podeEditar ? (
 <div className="mb-6 border border-red-200 bg-red-50 p-4 text-[12px] font-semibold uppercase tracking-[0.14em] text-red-700">
 Você não tem permissão para editar esta equipe.
 </div>
 ) : null}

 {erro ? <div className="mb-6 border border-red-200 bg-red-50 p-4 text-[12px] font-bold text-red-700">{erro}</div> : null}

 <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_0.8fr]">
 <section className="space-y-5">
 <div>
 <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">Capa</label>
 <label className="relative flex h-48 cursor-pointer items-center justify-center overflow-hidden border border-zinc-300 bg-[#eef1f5] transition hover:border-[#2563eb]">
 {capaPreview ? <Image src={capaPreview} alt="Capa da equipe" fill className="object-cover" unoptimized /> : <div className="flex flex-col items-center gap-2 text-zinc-500"><ImageIcon size={28} /><span className="text-[11px] font-semibold uppercase tracking-[0.2em]">Adicionar capa</span></div>}
 <input type="file" accept="image/*" className="hidden" onChange={(event) => setCapa(event.target.files?.[0] || null)} />
 <span className="absolute bottom-4 right-4 inline-flex h-9 items-center gap-2 border border-zinc-200 bg-white/70 px-4 text-[10px] font-semibold uppercase tracking-wide text-[#142340]"><Upload size={13} />Trocar capa</span>
 </label>
 </div>

 <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
 <div>
 <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">Nome da equipe</label>
 <input required value={nome} onChange={(event) => setNome(event.target.value)} className="h-12 w-full border border-zinc-300 bg-white px-4 text-[13px] font-bold outline-none transition focus:border-[#2563eb]" placeholder="Nome da equipe" />
 </div>
 <div>
 <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">Tag</label>
 <input value={tag} onChange={(event) => setTag(event.target.value.toUpperCase())} className="h-12 w-full border border-zinc-300 bg-white px-4 text-[13px] font-bold uppercase outline-none transition focus:border-[#2563eb]" placeholder="TAG" />
 </div>
 </div>

 <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
 <div>
 <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">Cidade</label>
 <input value={cidade} onChange={(event) => setCidade(event.target.value)} className="h-12 w-full border border-zinc-300 bg-white px-4 text-[13px] font-bold outline-none transition focus:border-[#2563eb]" placeholder="Cidade" />
 </div>
 <div>
 <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">Estado</label>
 <input value={estado} onChange={(event) => setEstado(event.target.value)} className="h-12 w-full border border-zinc-300 bg-white px-4 text-[13px] font-bold outline-none transition focus:border-[#2563eb]" placeholder="Estado" />
 </div>
 <div>
 <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">País</label>
 <input value={pais} onChange={(event) => setPais(event.target.value)} className="h-12 w-full border border-zinc-300 bg-white px-4 text-[13px] font-bold outline-none transition focus:border-[#2563eb]" placeholder="País" />
 </div>
 </div>

 <div>
 <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">Fundação</label>
 <input type="date" value={dataFundacao} onChange={(event) => setDataFundacao(event.target.value)} className="h-12 w-full border border-zinc-300 bg-white px-4 text-[13px] font-bold outline-none transition focus:border-[#2563eb]" />
 </div>

 <div>
 <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">Descrição</label>
 <textarea value={descricao} onChange={(event) => setDescricao(event.target.value)} rows={6} className="w-full resize-none border border-zinc-300 bg-white p-4 text-[13px] font-semibold leading-6 outline-none transition focus:border-[#2563eb]" placeholder="Descrição da equipe" />
 </div>
 </section>

 <aside>
 <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">Logo</label>
 <label className="relative flex aspect-square cursor-pointer items-center justify-center overflow-hidden border border-zinc-300 bg-[#f4f4f4] transition hover:border-[#2563eb]">
 {logoPreview ? <Image src={logoPreview} alt="Logo da equipe" fill className="object-contain p-4" unoptimized /> : <div className="flex flex-col items-center gap-2 text-zinc-500"><ImageIcon size={32} /><span className="text-[11px] font-semibold uppercase tracking-[0.2em]">Adicionar logo</span></div>}
 <input type="file" accept="image/*" className="hidden" onChange={(event) => setLogo(event.target.files?.[0] || null)} />
 <span className="absolute bottom-4 right-4 inline-flex h-9 items-center gap-2 border border-zinc-300 bg-white px-4 text-[10px] font-semibold uppercase tracking-wide text-[#142340]"><Upload size={13} />Trocar logo</span>
 </label>

 <div className="mt-4 border border-zinc-200 bg-[#f7f7f7] p-4 text-[11px] font-semibold leading-5 text-zinc-500">
 Imagens novas substituem o link público salvo na equipe. As imagens antigas continuam no bucket até você remover manualmente no Supabase.
 </div>
 </aside>
 </div>
 </form>
 </div>
 </main>
 )
}
