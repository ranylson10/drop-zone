'use client'

import { type ChangeEvent, useEffect, useMemo, useState } from 'react'
import { Image as ImageIcon, Loader2, Upload, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'

type GalleryImage = {
 id: string
 bucket: string
 path: string
 public_url: string
 nome?: string | null
 created_at?: string | null
}

type ImageGalleryPickerProps = {
 label?: string
 bucket?: string
 folder?: string
 context?: string
 value?: string
 onSelect: (url: string) => void
 onClear?: () => void
}

export default function ImageGalleryPicker({
 label = 'Galeria',
 bucket = 'avatars',
 folder = 'gallery',
 context = 'geral',
 value,
 onSelect,
 onClear,
}: ImageGalleryPickerProps) {
 const [open, setOpen] = useState(false)
 const [loading, setLoading] = useState(false)
 const [uploading, setUploading] = useState(false)
 const [items, setItems] = useState<GalleryImage[]>([])
 const [userId, setUserId] = useState<string | null>(null)

 const normalizedFolder = useMemo(() => String(folder || 'gallery').replace(/^\/+|\/+$/g, ''), [folder])

 useEffect(() => {
 if (!open) return
 carregarGaleria()
 }, [open])

 async function carregarGaleria() {
 setLoading(true)
 try {
 const { data: authData } = await supabase.auth.getUser()
 const user = authData?.user
 if (!user?.id) {
 setUserId(null)
 setItems([])
 return
 }

 setUserId(user.id)

 const { data, error } = await supabase
 .from('user_image_gallery')
 .select('id, bucket, path, public_url, nome, created_at')
 .eq('user_id', user.id)
 .order('created_at', { ascending: false })
 .limit(80)

 if (error) throw error
 setItems((data || []) as GalleryImage[])
 } catch (error: any) {
 console.error('Erro ao carregar galeria:', error)
 window.alert(error?.message || 'Nao foi possivel carregar a galeria.')
 } finally {
 setLoading(false)
 }
 }

 async function uploadImagem(event: ChangeEvent<HTMLInputElement>) {
 const file = event.currentTarget.files?.[0]
 event.currentTarget.value = ''
 if (!file) return

 setUploading(true)
 try {
 const { data: authData } = await supabase.auth.getUser()
 const user = authData?.user
 if (!user?.id) throw new Error('Faça login para enviar imagens.')

 setUserId(user.id)

 const ext = file.name.split('.').pop()?.toLowerCase() || 'png'
 const safeName = file.name
 .replace(/\.[^.]+$/, '')
 .normalize('NFD')
 .replace(/[\u0300-\u036f]/g, '')
 .replace(/[^a-zA-Z0-9_-]+/g, '-')
 .replace(/^-+|-+$/g, '')
 .slice(0, 48) || 'imagem'
 const path = `${user.id}/${normalizedFolder}/${Date.now()}-${safeName}.${ext}`

 const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file, {
 upsert: false,
 cacheControl: '3600',
 contentType: file.type || undefined,
 })
 if (uploadError) throw uploadError

 const {
 data: { publicUrl },
 } = supabase.storage.from(bucket).getPublicUrl(path)

 const payload = {
 user_id: user.id,
 bucket,
 path,
 public_url: publicUrl,
 nome: file.name,
 mime_type: file.type || null,
 size_bytes: file.size || null,
 context,
 }

 const { data: inserted, error: insertError } = await supabase
 .from('user_image_gallery')
 .insert([payload])
 .select('id, bucket, path, public_url, nome, created_at')
 .single()
 if (insertError) throw insertError

 setItems((current) => [inserted as GalleryImage, ...current])
 onSelect(publicUrl)
 } catch (error: any) {
 console.error('Erro ao enviar imagem para galeria:', error)
 window.alert(error?.message || 'Nao foi possivel enviar a imagem.')
 } finally {
 setUploading(false)
 }
 }

 return (
 <div className="space-y-2">
 <div className="flex flex-wrap gap-2">
 <button
 type="button"
 onClick={() => setOpen(true)}
 className="inline-flex items-center gap-2 border border-zinc-200 px-3 py-2 text-[9px] font-semibold uppercase"
 >
 <ImageIcon size={13} />
 {label}
 </button>
 {value && onClear ? (
 <button
 type="button"
 onClick={onClear}
 className="inline-flex items-center gap-2 border border-red-200 px-3 py-2 text-[9px] font-semibold uppercase text-red-600"
 >
 <X size={13} />
 Remover
 </button>
 ) : null}
 </div>

 {open ? (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
 <div className="max-h-[86vh] w-full max-w-4xl overflow-hidden border border-zinc-300 bg-white">
 <div className="flex items-center justify-between border-b border-zinc-200 p-4">
 <div>
 <div className="text-[11px] font-black uppercase tracking-[0.18em] text-zinc-500">Galeria de imagens</div>
 <h3 className="text-lg font-black uppercase text-[#142340]">Escolher imagem</h3>
 </div>
 <button type="button" onClick={() => setOpen(false)} className="border border-zinc-200 p-2">
 <X size={16} />
 </button>
 </div>

 <div className="flex items-center justify-between gap-3 border-b border-zinc-200 p-4">
 <p className="text-[10px] font-semibold uppercase leading-5 text-zinc-500">
 Reutilize imagens ja enviadas ou envie uma nova para usar novamente depois.
 </p>
 <label className="inline-flex cursor-pointer items-center gap-2 bg-[#2563eb] px-4 py-2 text-[10px] font-semibold uppercase text-white">
 {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
 Enviar nova
 <input type="file" accept="image/*" className="hidden" onChange={uploadImagem} />
 </label>
 </div>

 <div className="max-h-[58vh] overflow-y-auto p-4">
 {loading ? (
 <div className="flex items-center justify-center p-10 text-[10px] font-semibold uppercase text-zinc-500">
 <Loader2 className="mr-2 animate-spin" size={16} />
 Carregando galeria...
 </div>
 ) : !userId ? (
 <div className="border border-amber-200 bg-amber-50 p-4 text-[10px] font-semibold uppercase text-amber-800">
 Faça login para usar a galeria.
 </div>
 ) : items.length === 0 ? (
 <div className="border border-dashed border-zinc-300 p-8 text-center text-[10px] font-semibold uppercase text-zinc-500">
 Nenhuma imagem salva ainda.
 </div>
 ) : (
 <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
 {items.map((item) => {
 const selected = value === item.public_url
 return (
 <button
 key={item.id}
 type="button"
 onClick={() => {
 onSelect(item.public_url)
 setOpen(false)
 }}
 className={`group overflow-hidden border text-left ${selected ? 'border-[#2563eb]' : 'border-zinc-200'}`}
 >
 <div className="aspect-video bg-zinc-100">
 <img src={item.public_url} alt="" className="h-full w-full object-cover" />
 </div>
 <div className="truncate px-2 py-2 text-[9px] font-semibold uppercase text-zinc-600">
 {item.nome || item.path.split('/').pop()}
 </div>
 </button>
 )
 })}
 </div>
 )}
 </div>
 </div>
 </div>
 ) : null}
 </div>
 )
}
