'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import {
 Image as ImageIcon,
 Loader2,
 Save,
 Upload,
 X,
 Building2,
 FileText,
 MessageCircle,
 Link2,
} from 'lucide-react'

type FormProdutoraData = {
 id?: string
 nome: string
 descricao: string
 logo_url: string
 capa_url: string
 slug?: string
 dono_id?: string
 whatsapp_suporte?: string
 instagram_url?: string
 discord_url?: string
}

type FormProdutoraProps = {
 mode: 'create' | 'edit'
 initialData?: Partial<FormProdutoraData>
 onCancel?: () => void
 onSuccess?: (produtora: any) => void
 embedded?: boolean
}

function gerarSlug(valor: string) {
 return valor
 .normalize('NFD')
 .replace(/[\u0300-\u036f]/g, '')
 .toLowerCase()
 .replace(/[^a-z0-9\s-]/g, '')
 .trim()
 .replace(/\s+/g, '-')
}

export default function FormProdutora({
 mode,
 initialData,
 onCancel,
 onSuccess,
 embedded = false,
}: FormProdutoraProps) {
 const router = useRouter()

 const [loading, setLoading] = useState(mode === 'edit')
 const [salvando, setSalvando] = useState(false)
 const [uploadingLogo, setUploadingLogo] = useState(false)
 const [uploadingCapa, setUploadingCapa] = useState(false)
 const [userId, setUserId] = useState<string | null>(null)

 const [form, setForm] = useState<FormProdutoraData>({
 id: initialData?.id || '',
 nome: initialData?.nome || '',
 descricao: initialData?.descricao || '',
 logo_url: initialData?.logo_url || '',
 capa_url: initialData?.capa_url || '',
 slug: initialData?.slug || '',
 dono_id: initialData?.dono_id || '',
 whatsapp_suporte: initialData?.whatsapp_suporte || '',
 instagram_url: initialData?.instagram_url || '',
 discord_url: initialData?.discord_url || '',
 })

 const [previewLogo, setPreviewLogo] = useState(initialData?.logo_url || '')
 const [previewCapa, setPreviewCapa] = useState(initialData?.capa_url || '')

 useEffect(() => {
 async function bootstrap() {
 const {
 data: { user },
 } = await supabase.auth.getUser()

 if (!user) {
 router.push('/login')
 return
 }

 setUserId(user.id)
 setLoading(false)
 }

 bootstrap()
 }, [router])

 useEffect(() => {
 setForm({
 id: initialData?.id || '',
 nome: initialData?.nome || '',
 descricao: initialData?.descricao || '',
 logo_url: initialData?.logo_url || '',
 capa_url: initialData?.capa_url || '',
 slug: initialData?.slug || '',
 dono_id: initialData?.dono_id || '',
 whatsapp_suporte: initialData?.whatsapp_suporte || '',
 instagram_url: initialData?.instagram_url || '',
 discord_url: initialData?.discord_url || '',
 })

 setPreviewLogo(initialData?.logo_url || '')
 setPreviewCapa(initialData?.capa_url || '')
 }, [
 initialData?.id,
 initialData?.nome,
 initialData?.descricao,
 initialData?.logo_url,
 initialData?.capa_url,
 initialData?.slug,
 initialData?.dono_id,
 initialData?.whatsapp_suporte,
 initialData?.instagram_url,
 initialData?.discord_url,
 ])

 async function handleUpload(
 event: React.ChangeEvent<HTMLInputElement>,
 campo: 'logo_url' | 'capa_url'
 ) {
 const file = event.target.files?.[0]
 if (!file || !userId) return

 const previewLocal = URL.createObjectURL(file)

 if (campo === 'logo_url') {
 setPreviewLogo(previewLocal)
 setUploadingLogo(true)
 } else {
 setPreviewCapa(previewLocal)
 setUploadingCapa(true)
 }

 try {
 const extensao = file.name.split('.').pop() || 'png'
 const path = `${userId}/${campo}-${Date.now()}.${extensao}`

 const { error: uploadError } = await supabase.storage
 .from('imagem_produtoras')
 .upload(path, file, { upsert: false })

 if (uploadError) throw uploadError

 const { data } = supabase.storage
 .from('imagem_produtoras')
 .getPublicUrl(path)

 if (campo === 'logo_url') {
 setPreviewLogo(data.publicUrl)
 } else {
 setPreviewCapa(data.publicUrl)
 }

 setForm((prev) => ({
 ...prev,
 [campo]: data.publicUrl,
 }))
 } catch (error) {
 console.error(`Erro ao enviar ${campo}:`, error)
 alert(`Erro ao enviar ${campo === 'logo_url' ? 'logo' : 'capa'}.`)

 if (campo === 'logo_url') {
 setPreviewLogo(form.logo_url || '')
 } else {
 setPreviewCapa(form.capa_url || '')
 }
 } finally {
 if (campo === 'logo_url') {
 setUploadingLogo(false)
 } else {
 setUploadingCapa(false)
 }

 event.target.value = ''
 }
 }

 async function handleSubmit() {
 if (!userId) return

 const nomeLimpo = form.nome.trim()

 if (!nomeLimpo) {
 alert('Informe o nome da produtora.')
 return
 }

 setSalvando(true)

 try {
 const payload = {
 nome: nomeLimpo,
 descricao: form.descricao.trim() || null,
 logo_url: form.logo_url || null,
 capa_url: form.capa_url || null,
 slug: gerarSlug(nomeLimpo),
 whatsapp_suporte: form.whatsapp_suporte?.trim() || null,
 instagram_url: form.instagram_url?.trim() || null,
 discord_url: form.discord_url?.trim() || null,
 }

 if (mode === 'create') {
 const { data: existente, error: erroBusca } = await supabase
 .from('produtoras')
 .select('id, nome')
 .eq('dono_id', userId)
 .maybeSingle()

 if (erroBusca) throw erroBusca

 if (existente) {
 alert('Você já possui uma produtora cadastrada.')
 localStorage.setItem('perfil_ativo_id', existente.id)

 if (onSuccess) {
 onSuccess(existente)
 } else {
 router.push(`/produtora/${existente.id}`)
 }

 return
 }

 const { data, error } = await supabase
 .from('produtoras')
 .insert({
 ...payload,
 dono_id: userId,
 })
 .select('*')
 .single()

 if (error) throw error

 localStorage.setItem('perfil_ativo_id', data.id)

 if (onSuccess) {
 onSuccess(data)
 } else {
 router.push(`/produtora/${data.id}`)
 }

 return
 }

 const { data, error } = await supabase
 .from('produtoras')
 .update(payload)
 .eq('id', form.id)
 .select('*')
 .single()

 if (error) throw error

 localStorage.setItem('perfil_ativo_id', data.id)

 if (onSuccess) {
 onSuccess(data)
 } else {
 router.push(`/produtora/${data.id}`)
 }
 } catch (error: any) {
 console.error('Erro ao salvar produtora:', error)
 alert(error?.message || 'Erro ao salvar produtora.')
 } finally {
 setSalvando(false)
 }
 }

 if (loading) {
 return (
 <div className="flex min-h-[300px] items-center justify-center">
 <Loader2 className="animate-spin text-[#2563eb]" size={32} />
 </div>
 )
 }

 return (
 <div
 className={
 embedded ? 'w-full' : 'min-h-screen bg-[#f7f7f7] px-4 py-8 text-[#142340]'
 }
 >
 <div
 className={
 embedded
 ? 'w-full'
 : 'mx-auto w-full max-w-5xl border border-zinc-200 bg-white '
 }
 >
 {!embedded && (
 <div className="border-b border-zinc-200 px-6 py-5 md:px-8">
 <h1 className="text-2xl font-semibold uppercase text-[#142340]">
 {mode === 'create' ? 'Nova Produtora' : 'Editar Produtora'}
 </h1>
 <p className="mt-1 text-[11px] font-bold uppercase tracking-wider text-zinc-500">
 Identidade visual e dados principais da organização
 </p>
 </div>
 )}

 <div className="space-y-8 p-6 md:p-8">
 <div className="relative overflow-hidden border border-zinc-200 bg-white">
 <div className="h-56 w-full bg-gradient-to-br from-[#0e1722] via-[#122235] to-[#0a0f13]">
 {previewCapa ? (
 <img
 src={previewCapa}
 alt="Capa da produtora"
 className="h-full w-full object-cover opacity-55"
 />
 ) : null}
 </div>

 <div className="absolute inset-0 bg-gradient-to-t from-[#11181f] via-transparent to-transparent" />

 <label className="absolute right-4 top-4 inline-flex cursor-pointer items-center gap-2 border border-zinc-200 bg-white/60 px-4 py-2 text-[10px] font-semibold uppercase text-[#142340] transition hover:bg-white/80">
 {uploadingCapa ? (
 <Loader2 size={14} className="animate-spin" />
 ) : (
 <Upload size={14} />
 )}
 Alterar capa
 <input
 type="file"
 accept="image/*"
 className="hidden"
 onChange={(e) => handleUpload(e, 'capa_url')}
 />
 </label>

 <div className="relative z-10 -mt-16 flex flex-col gap-6 px-6 pb-6 md:-mt-20 md:flex-row md:items-end md:px-8">
 <label className="group relative flex h-36 w-36 cursor-pointer items-center justify-center overflow-hidden border-4 border-[#2563eb] bg-white md:h-40 md:w-40">
 {previewLogo ? (
 <img
 src={previewLogo}
 alt="Logo da produtora"
 className="h-full w-full object-cover"
 />
 ) : (
 <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-zinc-500">
 {uploadingLogo ? (
 <Loader2 className="animate-spin" size={24} />
 ) : (
 <ImageIcon size={24} />
 )}
 <span className="text-[10px] font-semibold uppercase">
 Logo
 </span>
 </div>
 )}

 <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 border-t border-zinc-200 bg-white/75 py-2 text-[10px] font-semibold uppercase text-[#142340] transition group-hover:bg-white/90">
 {uploadingLogo ? (
 <Loader2 size={14} className="animate-spin" />
 ) : (
 <Upload size={14} />
 )}
 Alterar
 </div>

 <input
 type="file"
 accept="image/*"
 className="hidden"
 onChange={(e) => handleUpload(e, 'logo_url')}
 />
 </label>

 <div className="min-w-0 flex-1">
 <p className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
 <Building2 size={12} />
 Nome da organização
 </p>
 <input
 value={form.nome}
 onChange={(e) =>
 setForm((prev) => ({ ...prev, nome: e.target.value }))
 }
 placeholder="Ex: SIX BLACK"
 className="w-full border-b-2 border-zinc-200 bg-transparent pb-3 text-3xl font-semibold uppercase tracking-tight text-[#142340] outline-none transition focus:border-[#2563eb] md:text-5xl"
 />
 </div>
 </div>
 </div>



 <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
 <label className="space-y-2">
 <span className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
 <MessageCircle size={12} /> WhatsApp público
 </span>
 <input
 value={form.whatsapp_suporte || ''}
 onChange={(e) => setForm((prev) => ({ ...prev, whatsapp_suporte: e.target.value }))}
 placeholder="Ex: 5591999999999"
 className="h-11 w-full border border-zinc-200 bg-white px-3 text-sm text-[#142340] outline-none transition placeholder:text-zinc-400 focus:border-[#2563eb]"
 />
 </label>

 <label className="space-y-2">
 <span className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
 <Link2 size={12} /> Instagram
 </span>
 <input
 value={form.instagram_url || ''}
 onChange={(e) => setForm((prev) => ({ ...prev, instagram_url: e.target.value }))}
 placeholder="https://instagram.com/sua_produtora"
 className="h-11 w-full border border-zinc-200 bg-white px-3 text-sm text-[#142340] outline-none transition placeholder:text-zinc-400 focus:border-[#2563eb]"
 />
 </label>

 <label className="space-y-2">
 <span className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
 <Link2 size={12} /> Discord ou grupo
 </span>
 <input
 value={form.discord_url || ''}
 onChange={(e) => setForm((prev) => ({ ...prev, discord_url: e.target.value }))}
 placeholder="https://discord.gg/..."
 className="h-11 w-full border border-zinc-200 bg-white px-3 text-sm text-[#142340] outline-none transition placeholder:text-zinc-400 focus:border-[#2563eb]"
 />
 </label>
 </div>

 <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
 <div className="space-y-3">
 <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
 <FileText size={12} />
 Descrição da produtora
 </p>
 <textarea
 value={form.descricao}
 onChange={(e) =>
 setForm((prev) => ({ ...prev, descricao: e.target.value }))
 }
 rows={8}
 placeholder="Conte sobre sua organização, estilo, torneios, comunidade..."
 className="w-full resize-none border border-zinc-200 bg-white/35 p-5 text-sm text-[#142340] outline-none transition placeholder:text-zinc-600 focus:border-[#2563eb]"
 />
 </div>

 <div className="space-y-6">
 <div className="border border-zinc-200 bg-white/25 p-5">
 <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
 Prévia de identificação
 </p>

 <div className="space-y-3">
 <p className="text-2xl font-semibold uppercase text-[#142340]">
 {form.nome || 'NOME DA PRODUTORA'}
 </p>

 <p className="pt-2 text-[11px] font-bold uppercase tracking-wide text-zinc-500">
 Slug público
 </p>
 <div className="border border-zinc-200 bg-white px-4 py-3 text-[11px] font-semibold uppercase text-[#2563eb]">
 {form.nome ? gerarSlug(form.nome) : 'sem-slug'}
 </div>

 <p className="pt-2 text-sm leading-6 text-zinc-500">
 {form.descricao?.trim()
 ? form.descricao
 : 'Nenhuma descrição informada ainda.'}
 </p>
 </div>
 </div>

 <div className="flex flex-wrap items-center justify-end gap-3">
 {onCancel && (
 <button
 onClick={onCancel}
 disabled={salvando}
 className="inline-flex items-center gap-2 border border-zinc-200 bg-zinc-50 px-5 py-3 text-[10px] font-semibold uppercase text-[#142340] transition hover:bg-zinc-50 disabled:opacity-50"
 >
 <X size={14} />
 Cancelar
 </button>
 )}

 <button
 onClick={handleSubmit}
 disabled={salvando || uploadingLogo || uploadingCapa}
 className="inline-flex items-center gap-2 bg-[#2563eb] px-6 py-3 text-[10px] font-semibold uppercase text-[#142340] transition hover:bg-[#1d4ed8] hover:text-white disabled:opacity-50"
 >
 {salvando ? (
 <Loader2 size={14} className="animate-spin" />
 ) : (
 <Save size={14} />
 )}
 {mode === 'create' ? 'Criar Produtora' : 'Salvar Alterações'}
 </button>
 </div>
 </div>
 </div>
 </div>
 </div>
 </div>
 )
}