'use client'

import {
 useState,
 useEffect,
 Suspense,
 useRef,
 useCallback,
 useMemo,
} from 'react'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'
import {
 Camera,
 Edit3,
 MapPin,
 Cake,
 User,
 Swords,
 Users as UsersIcon,
 Building2,
 Save,
 X,
 Check,
 Shield,
 Search,
 Globe,
 Gamepad2,
} from 'lucide-react'
import Cropper from 'react-easy-crop'

import TabGamer from './tabs/TabGamer'
import TabEquipes from './tabs/TabEquipes'
import TabProdutoras from './tabs/TabProdutoras'
import SocialActions from '../components/SocialActions'
import { resizeCroppedAreaToWebp } from '@/lib/imageOptimize'

type TipoCrop = 'avatar' | 'capa'

type ProfileRow = {
 id: string
 username: string | null
 nome_exibicao: string | null
 foto_url: string | null
 cover_url: string | null
 bio: string | null
 cidade: string | null
 estado: string | null
 pais: string | null
 instagram: string | null
 youtube: string | null
 tiktok: string | null
 data_nascimento: string | null
 created_at?: string | null
 updated_at?: string | null
}

type SugestaoLocal = {
 label: string
 cidade: string
 estado: string
 pais: string
}

const LOCALIDADES_BASE: SugestaoLocal[] = [
 { label: 'Abaetetuba, Pará, Brasil', cidade: 'Abaetetuba', estado: 'Pará', pais: 'Brasil' },
 { label: 'Belém, Pará, Brasil', cidade: 'Belém', estado: 'Pará', pais: 'Brasil' },
 { label: 'Ananindeua, Pará, Brasil', cidade: 'Ananindeua', estado: 'Pará', pais: 'Brasil' },
 { label: 'Castanhal, Pará, Brasil', cidade: 'Castanhal', estado: 'Pará', pais: 'Brasil' },
 { label: 'Santarém, Pará, Brasil', cidade: 'Santarém', estado: 'Pará', pais: 'Brasil' },
 { label: 'Marabá, Pará, Brasil', cidade: 'Marabá', estado: 'Pará', pais: 'Brasil' },
 { label: 'Macapá, Amapá, Brasil', cidade: 'Macapá', estado: 'Amapá', pais: 'Brasil' },
 { label: 'Manaus, Amazonas, Brasil', cidade: 'Manaus', estado: 'Amazonas', pais: 'Brasil' },
 { label: 'São Paulo, São Paulo, Brasil', cidade: 'São Paulo', estado: 'São Paulo', pais: 'Brasil' },
 { label: 'Campinas, São Paulo, Brasil', cidade: 'Campinas', estado: 'São Paulo', pais: 'Brasil' },
 { label: 'Rio de Janeiro, Rio de Janeiro, Brasil', cidade: 'Rio de Janeiro', estado: 'Rio de Janeiro', pais: 'Brasil' },
 { label: 'Belo Horizonte, Minas Gerais, Brasil', cidade: 'Belo Horizonte', estado: 'Minas Gerais', pais: 'Brasil' },
 { label: 'Curitiba, Paraná, Brasil', cidade: 'Curitiba', estado: 'Paraná', pais: 'Brasil' },
 { label: 'Porto Alegre, Rio Grande do Sul, Brasil', cidade: 'Porto Alegre', estado: 'Rio Grande do Sul', pais: 'Brasil' },
 { label: 'Salvador, Bahia, Brasil', cidade: 'Salvador', estado: 'Bahia', pais: 'Brasil' },
 { label: 'Recife, Pernambuco, Brasil', cidade: 'Recife', estado: 'Pernambuco', pais: 'Brasil' },
 { label: 'Fortaleza, Ceará, Brasil', cidade: 'Fortaleza', estado: 'Ceará', pais: 'Brasil' },
 { label: 'Goiânia, Goiás, Brasil', cidade: 'Goiânia', estado: 'Goiás', pais: 'Brasil' },
 { label: 'Brasília, Distrito Federal, Brasil', cidade: 'Brasília', estado: 'Distrito Federal', pais: 'Brasil' },
]

function calcularIdade(dataNascimento: string) {
 if (!dataNascimento) return null

 const hoje = new Date()
 const nascimento = new Date(dataNascimento)

 let idade = hoje.getFullYear() - nascimento.getFullYear()
 const m = hoje.getMonth() - nascimento.getMonth()

 if (m < 0 || (m === 0 && hoje.getDate() < nascimento.getDate())) {
 idade--
 }

 return idade
}

function montarLocalidade(cidade: string, estado: string, pais: string) {
 return [cidade, estado, pais].filter(Boolean).join(', ')
}

async function getCroppedImg(
 imageSrc: string,
 pixelCrop: { x: number; y: number; width: number; height: number }
): Promise<Blob> {
 const image = new Image()
 image.crossOrigin = 'anonymous'
 image.src = imageSrc

 await new Promise((resolve, reject) => {
 image.onload = resolve
 image.onerror = reject
 })

 const canvas = document.createElement('canvas')
 canvas.width = pixelCrop.width
 canvas.height = pixelCrop.height

 const ctx = canvas.getContext('2d')
 if (!ctx) {
 throw new Error('Erro no contexto 2D')
 }

 ctx.drawImage(
 image,
 pixelCrop.x,
 pixelCrop.y,
 pixelCrop.width,
 pixelCrop.height,
 0,
 0,
 pixelCrop.width,
 pixelCrop.height
 )

 return await new Promise((resolve, reject) => {
 canvas.toBlob((blob) => {
 if (!blob) {
 reject(new Error('Não foi possível gerar a imagem recortada'))
 return
 }
 resolve(blob)
 }, 'image/jpeg', 0.92)
 })
}

function PerfilContent() {
 const fileInputAvatar = useRef<HTMLInputElement>(null)
 const fileInputCapa = useRef<HTMLInputElement>(null)
 const localidadeBoxRef = useRef<HTMLDivElement>(null)

 const [activeTab, setActiveTab] = useState<'gamer' | 'equipes' | 'produtoras'>('gamer')
 const [loading, setLoading] = useState(false)
 const [uploading, setUploading] = useState(false)
 const [carregandoPerfil, setCarregandoPerfil] = useState(true)
 const [isEditing, setIsEditing] = useState(false)
 const [userId, setUserId] = useState<string | null>(null)

 const [username, setUsername] = useState('')
 const [nomeExibicao, setNomeExibicao] = useState('')
 const [urlAvatar, setUrlAvatar] = useState('')
 const [urlCapa, setUrlCapa] = useState('')
 const [bio, setBio] = useState('')
 const [cidade, setCidade] = useState('')
 const [estado, setEstado] = useState('')
 const [pais, setPais] = useState('')
 const [dataNascimento, setDataNascimento] = useState('')

 const [localBusca, setLocalBusca] = useState('')
 const [mostrarSugestoes, setMostrarSugestoes] = useState(false)

 const [imageToCrop, setImageToCrop] = useState<{ src: string; tipo: TipoCrop } | null>(null)
 const [crop, setCrop] = useState({ x: 0, y: 0 })
 const [zoom, setZoom] = useState(1)
 const [croppedAreaPixels, setCroppedAreaPixels] = useState<{
 x: number
 y: number
 width: number
 height: number
 } | null>(null)

 const localidadeFormatada = useMemo(
 () => montarLocalidade(cidade, estado, pais),
 [cidade, estado, pais]
 )

 const sugestoesLocalidade = useMemo(() => {
 const termo = localBusca.trim().toLowerCase()

 if (!termo) {
 return LOCALIDADES_BASE.slice(0, 8)
 }

 return LOCALIDADES_BASE.filter((item) =>
 [item.label, item.cidade, item.estado, item.pais]
 .filter(Boolean)
 .some((valor) => valor.toLowerCase().includes(termo))
 ).slice(0, 8)
 }, [localBusca])

 useEffect(() => {
 function handleClickOutside(event: MouseEvent) {
 if (
 localidadeBoxRef.current &&
 !localidadeBoxRef.current.contains(event.target as Node)
 ) {
 setMostrarSugestoes(false)
 }
 }

 document.addEventListener('mousedown', handleClickOutside)
 return () => {
 document.removeEventListener('mousedown', handleClickOutside)
 }
 }, [])

 useEffect(() => {
 if (imageToCrop) {
 document.body.style.overflow = 'hidden'
 } else {
 document.body.style.overflow = 'unset'
 }

 return () => {
 document.body.style.overflow = 'unset'
 }
 }, [imageToCrop])

 const carregarDadosPerfil = useCallback(async () => {
 try {
 setCarregandoPerfil(true)

 const {
 data: { session },
 error: sessionError,
 } = await supabase.auth.getSession()

 if (sessionError) {
 throw sessionError
 }

 const user = session?.user ?? null

 if (!user) {
 setUserId(null)
 setUsername('')
 setNomeExibicao('')
 setUrlAvatar('')
 setUrlCapa('')
 setBio('')
 setCidade('')
 setEstado('')
 setPais('')
 setDataNascimento('')
 setLocalBusca('')
 return
 }

 setUserId(user.id)

 const { data, error } = await supabase
 .from('profiles')
 .select(
 'id, username, nome_exibicao, foto_url, cover_url, bio, cidade, estado, pais, instagram, youtube, tiktok, data_nascimento, created_at, updated_at'
 )
 .eq('id', user.id)
 .maybeSingle<ProfileRow>()

 if (error) {
 throw error
 }

 if (!data) {
 setUsername('')
 setNomeExibicao('')
 setUrlAvatar('')
 setUrlCapa('')
 setBio('')
 setCidade('')
 setEstado('')
 setPais('')
 setDataNascimento('')
 setLocalBusca('')
 return
 }

 setUsername(data.username || '')
 setNomeExibicao(data.nome_exibicao || '')
 setUrlAvatar(data.foto_url || '')
 setUrlCapa(data.cover_url || '')
 setBio(data.bio || '')
 setCidade(data.cidade || '')
 setEstado(data.estado || '')
 setPais(data.pais || '')
 setDataNascimento(data.data_nascimento || '')
 setLocalBusca(montarLocalidade(data.cidade || '', data.estado || '', data.pais || ''))
 } catch (error) {
 console.error('Erro ao carregar perfil:', error)
 } finally {
 setCarregandoPerfil(false)
 }
 }, [])

 useEffect(() => {
 carregarDadosPerfil()
 }, [carregarDadosPerfil])

 const onSelectFile = (e: React.ChangeEvent<HTMLInputElement>, tipo: TipoCrop) => {
 const arquivo = e.target.files?.[0]
 if (!arquivo) return

 const reader = new FileReader()
 reader.onload = () => {
 setCrop({ x: 0, y: 0 })
 setZoom(1)
 setCroppedAreaPixels(null)
 setImageToCrop({
 src: reader.result?.toString() || '',
 tipo,
 })
 }
 reader.readAsDataURL(arquivo)

 e.target.value = ''
 }

 async function uploadImagem(bucket: string, path: string, file: Blob, contentType = 'image/jpeg') {
 const { error } = await supabase.storage.from(bucket).upload(path, file, {
 contentType,
 upsert: true,
 })

 if (error) throw error

 const { data } = supabase.storage.from(bucket).getPublicUrl(path)
 return `${data.publicUrl}?v=${Date.now()}`
 }

 const handleUploadFinal = async () => {
 if (!imageToCrop || !croppedAreaPixels || !userId) return

 try {
 setUploading(true)

 const isAvatar = imageToCrop.tipo === 'avatar'
 const blob = isAvatar
 ? await resizeCroppedAreaToWebp(imageToCrop.src, croppedAreaPixels, 500, 600, 0.82)
 : await getCroppedImg(imageToCrop.src, croppedAreaPixels)
 const extensao = isAvatar ? 'webp' : 'jpg'
 const contentType = isAvatar ? 'image/webp' : 'image/jpeg'
 const nomeArquivo = `${imageToCrop.tipo}_${Date.now()}.${extensao}`
 const path = `${userId}/${nomeArquivo}`

 if (imageToCrop.tipo === 'avatar') {
 const publicUrl = await uploadImagem('avatars', path, blob, contentType)

 const { error } = await supabase
 .from('profiles')
 .update({
 foto_url: publicUrl,
 updated_at: new Date().toISOString(),
 })
 .eq('id', userId)

 if (error) throw error
 setUrlAvatar(publicUrl)
 } else {
 const publicUrl = await uploadImagem('imagens_perfil', path, blob, contentType)

 const { error } = await supabase
 .from('profiles')
 .update({
 cover_url: publicUrl,
 updated_at: new Date().toISOString(),
 })
 .eq('id', userId)

 if (error) throw error
 setUrlCapa(publicUrl)
 }

 setImageToCrop(null)
 await carregarDadosPerfil()
 } catch (error: any) {
 console.error('Erro ao enviar imagem:', error)
 alert(error?.message || 'Erro ao enviar imagem')
 } finally {
 setUploading(false)
 }
 }

 async function salvarPerfil() {
 if (!userId) return

 try {
 setLoading(true)

 const payload = {
 username: username || null,
 nome_exibicao: nomeExibicao || null,
 bio: bio || null,
 cidade: cidade || null,
 estado: estado || null,
 pais: pais || null,
 data_nascimento: dataNascimento || null,
 updated_at: new Date().toISOString(),
 }

 const { error } = await supabase
 .from('profiles')
 .update(payload)
 .eq('id', userId)

 if (error) {
 throw error
 }

 setIsEditing(false)
 setLocalBusca(montarLocalidade(cidade, estado, pais))
 await carregarDadosPerfil()
 } catch (error: any) {
 console.error('Erro ao salvar perfil:', error)
 alert(error?.message || 'Erro ao salvar perfil')
 } finally {
 setLoading(false)
 }
 }

 const aplicarSugestaoLocalidade = (item: SugestaoLocal) => {
 setCidade(item.cidade)
 setEstado(item.estado)
 setPais(item.pais)
 setLocalBusca(item.label)
 setMostrarSugestoes(false)
 }

 const nomePrincipalExibido = nomeExibicao || username || 'AGENTE_IDENTIFICADO'

 return (
 <div className="min-h-screen bg-[#f7f7f7] px-4 py-5 text-[#142340] md:px-6">
 {imageToCrop ? (
 <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-white/60 p-4">
 <div className="relative h-[400px] w-full max-w-2xl overflow-hidden border border-zinc-200 bg-white">
 <Cropper
 image={imageToCrop.src}
 crop={crop}
 zoom={zoom}
 aspect={imageToCrop.tipo === 'avatar' ? 1 : 16 / 6}
 onCropChange={setCrop}
 onZoomChange={setZoom}
 onCropComplete={(_, pixels) => setCroppedAreaPixels(pixels)}
 />
 </div>

 <div className="mt-4 flex w-full max-w-2xl gap-2">
 <button
 onClick={() => setImageToCrop(null)}
 disabled={uploading}
 className="flex flex-1 items-center justify-center gap-2 border border-zinc-300 bg-white p-3 text-xs font-medium uppercase tracking-[0.16em] text-[#142340] disabled:opacity-60"
 >
 <X size={16} />
 Cancelar
 </button>

 <button
 onClick={handleUploadFinal}
 disabled={uploading}
 className="flex flex-1 items-center justify-center gap-2 border border-[#2563eb] bg-[#2563eb] p-3 text-xs font-medium uppercase tracking-[0.16em] text-[#142340] disabled:opacity-60"
 >
 <Check size={16} />
 {uploading ? 'Enviando...' : 'Confirmar upload'}
 </button>
 </div>
 </div>
 ) : null}

 <div className="mx-auto max-w-6xl space-y-3">
 <section className="overflow-hidden border border-zinc-200 bg-white">
 <div className="group relative h-[170px] overflow-hidden bg-zinc-100 md:h-[210px]">
 {urlCapa ? (
 <img
 src={urlCapa}
 className="h-full w-full object-cover opacity-90"
 alt="Capa"
 />
 ) : (
 <div className="h-full w-full bg-zinc-100" />
 )}

 {isEditing ? (
 <button
 onClick={() => fileInputCapa.current?.click()}
 className="absolute inset-0 flex items-center justify-center gap-2 bg-white/70 text-[11px] font-medium uppercase tracking-[0.18em] text-[#142340] opacity-0 transition group-hover:opacity-100"
 >
 <Camera size={18} />
 Alterar capa
 </button>
 ) : null}

 <input
 type="file"
 accept="image/*"
 ref={fileInputCapa}
 hidden
 onChange={(e) => onSelectFile(e, 'capa')}
 />
 </div>

 <div className="px-4 pb-4 pt-0 md:px-5">
 <div className="-mt-14 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
 <div className="flex flex-col gap-3 md:flex-row md:items-end">
 <div className="group relative h-[118px] w-[118px] overflow-hidden border border-zinc-300 bg-white">
 {urlAvatar ? (
 <img src={urlAvatar} className="h-full w-full object-cover" alt="Avatar" />
 ) : (
 <div className="flex h-full w-full items-center justify-center text-zinc-600">
 <User size={48} />
 </div>
 )}

 {isEditing ? (
 <button
 onClick={() => fileInputAvatar.current?.click()}
 className="absolute inset-0 flex items-center justify-center bg-white/70 text-[#142340] opacity-0 transition group-hover:opacity-100"
 >
 <Camera size={24} />
 </button>
 ) : null}

 <input
 type="file"
 accept="image/*"
 ref={fileInputAvatar}
 hidden
 onChange={(e) => onSelectFile(e, 'avatar')}
 />

 <div className="absolute bottom-1 right-1 border border-zinc-200 bg-white p-1">
 <Shield size={16} className="text-[#2563eb]" />
 </div>
 </div>

 <div className="w-full pb-2">
 {isEditing ? (
 <div className="space-y-3">
 <input
 value={nomeExibicao}
 onChange={(e) => setNomeExibicao(e.target.value)}
 placeholder="Nome de exibição"
 className="w-full max-w-xl border border-zinc-300 bg-white px-4 py-3 text-2xl font-medium uppercase text-[#142340] outline-none placeholder:text-zinc-500 focus:border-[#2563eb] md:text-3xl"
 />

 <input
 value={username}
 onChange={(e) => setUsername(e.target.value)}
 placeholder="Username"
 className="w-full max-w-xl border border-zinc-300 bg-white px-4 py-3 text-xs font-medium uppercase text-[#142340] outline-none placeholder:text-zinc-500 focus:border-[#2563eb]"
 />

 <div className="grid max-w-2xl grid-cols-1 gap-3 md:grid-cols-2">
 <input
 type="date"
 value={dataNascimento}
 onChange={(e) => setDataNascimento(e.target.value)}
 className="w-full border border-zinc-300 bg-white px-4 py-3 text-xs font-medium uppercase text-[#142340] outline-none focus:border-[#2563eb]"
 />

 <div className="relative" ref={localidadeBoxRef}>
 <div className="relative">
 <input
 value={localBusca}
 onChange={(e) => {
 setLocalBusca(e.target.value)
 setMostrarSugestoes(true)
 }}
 onFocus={() => setMostrarSugestoes(true)}
 placeholder="Digite cidade, estado ou país"
 className="w-full border border-zinc-300 bg-white px-4 py-3 pr-10 text-xs font-medium uppercase text-[#142340] outline-none placeholder:text-zinc-500 focus:border-[#2563eb]"
 />
 <Search
 size={16}
 className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500"
 />
 </div>

 {mostrarSugestoes && sugestoesLocalidade.length > 0 ? (
 <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 max-h-44 overflow-y-auto border border-zinc-200 bg-white">
 {sugestoesLocalidade.map((item) => (
 <button
 key={item.label}
 type="button"
 onClick={() => aplicarSugestaoLocalidade(item)}
 className="w-full border-b border-zinc-200 px-4 py-3 text-left hover:bg-zinc-50 last:border-b-0"
 >
 <div className="flex items-start gap-2">
 <Globe size={14} className="mt-0.5 shrink-0 text-[#2563eb]" />
 <div>
 <div className="text-[11px] font-medium uppercase text-[#142340]">
 {item.label}
 </div>
 <div className="mt-1 text-[9px] font-medium uppercase text-zinc-500">
 {montarLocalidade(item.cidade, item.estado, item.pais) || 'Local'}
 </div>
 </div>
 </div>
 </button>
 ))}
 </div>
 ) : null}
 </div>
 </div>

 <div className="grid max-w-3xl grid-cols-1 gap-3 md:grid-cols-3">
 <input
 value={cidade}
 onChange={(e) => setCidade(e.target.value)}
 placeholder="Cidade"
 className="w-full border border-zinc-300 bg-white px-4 py-3 text-xs font-medium uppercase text-[#142340] outline-none placeholder:text-zinc-500 focus:border-[#2563eb]"
 />
 <input
 value={estado}
 onChange={(e) => setEstado(e.target.value)}
 placeholder="Estado"
 className="w-full border border-zinc-300 bg-white px-4 py-3 text-xs font-medium uppercase text-[#142340] outline-none placeholder:text-zinc-500 focus:border-[#2563eb]"
 />
 <input
 value={pais}
 onChange={(e) => setPais(e.target.value)}
 placeholder="País"
 className="w-full border border-zinc-300 bg-white px-4 py-3 text-xs font-medium uppercase text-[#142340] outline-none placeholder:text-zinc-500 focus:border-[#2563eb]"
 />
 </div>
 </div>
 ) : (
 <>
 <div className="flex flex-wrap items-center gap-3">
 <h1 className="text-[24px] font-semibold uppercase tracking-tight text-[#142340] md:text-[30px]">
 {nomePrincipalExibido}
 </h1>
 <span className=" border border-zinc-200 bg-zinc-50 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-[#2563eb]">
 Pro player
 </span>
 </div>

 <div className="mt-2 flex flex-wrap gap-3 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
 <span className="flex items-center gap-1.5">
 <Cake size={14} className="text-[#2563eb]" />
 {dataNascimento ? `${calcularIdade(dataNascimento)} anos` : 'N/I'}
 </span>

 <span className="flex items-center gap-1.5">
 <MapPin size={14} className="text-[#2563eb]" />
 {localidadeFormatada || 'Local não informado'}
 </span>
 </div>
 </>
 )}
 </div>
 </div>

 <div className="flex gap-2">
 {!isEditing ? (
 <button
 onClick={() => setIsEditing(true)}
 className="inline-flex items-center gap-2 border border-zinc-300 bg-white px-6 py-3 text-[10px] font-medium uppercase tracking-[0.16em] text-[#142340] transition hover:bg-zinc-50"
 >
 <Edit3 size={14} className="text-[#2563eb]" />
 Editar perfil
 </button>
 ) : (
 <>
 <button
 onClick={() => {
 setIsEditing(false)
 setLocalBusca(montarLocalidade(cidade, estado, pais))
 carregarDadosPerfil()
 }}
 className="inline-flex items-center gap-2 border border-zinc-300 bg-white px-6 py-3 text-[10px] font-medium uppercase tracking-[0.16em] text-[#142340] transition hover:bg-zinc-50"
 >
 <X size={14} />
 Cancelar
 </button>

 <button
 onClick={salvarPerfil}
 disabled={loading}
 className="inline-flex h-10 items-center gap-2 border border-[#2563eb] bg-[#2563eb] px-4 text-[12px] font-medium uppercase tracking-wide text-[#142340] transition hover:bg-[#1d4ed8] disabled:opacity-60"
 >
 <Save size={14} />
 {loading ? 'Sincronizando...' : 'Salvar alterações'}
 </button>
 </>
 )}
 </div>
 </div>
 </div>
 </section>

 <section className="border border-zinc-200 bg-white p-3">
 <h2 className="mb-2 flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-500">
 <div className="h-2 w-2 bg-[#2563eb]" />
 Resumo do operador
 </h2>

 {isEditing ? (
 <textarea
 value={bio}
 onChange={(e) => setBio(e.target.value)}
 placeholder="Escreva sua biografia gamer..."
 className="h-24 w-full border border-zinc-300 bg-white p-4 text-xs font-medium uppercase text-[#142340] outline-none placeholder:text-zinc-500 focus:border-[#2563eb]"
 />
 ) : (
 <div className="text-[12px] font-medium leading-relaxed text-zinc-600">
 {bio || 'Nenhuma biografia cadastrada no protocolo atual.'}
 </div>
 )}
 </section>

 {userId ? (
 <SocialActions
 entityId={userId}
 entityType="perfil"
 variant="light"
 title="Ações sociais"
 />
 ) : null}


 <section className="border border-cyan-200 bg-cyan-50 p-3">
 <div className="flex flex-wrap items-center justify-between gap-3">
 <div>
 <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-cyan-700">Atuação profissional</div>
 <p className="mt-1 text-xs font-medium text-cyan-900">Configure seus selos, funções, agenda stream e disponibilidade para eventos.</p>
 </div>
 <Link href="/perfil/atuacao" className="inline-flex items-center gap-2 border border-cyan-500 bg-white px-4 py-3 text-[11px] font-black uppercase tracking-wide text-cyan-700 hover:bg-cyan-100">
 <Shield size={14} /> Gerenciar atuações
 </Link>
 </div>
 </section>

 <nav className="flex overflow-hidden border border-zinc-200 bg-white p-1">
 <button
 onClick={() => setActiveTab('gamer')}
 className={`flex-1 flex items-center justify-center gap-2 py-3 text-[11px] font-medium uppercase tracking-wide transition-all ${
 activeTab === 'gamer'
 ? 'bg-[#eaf6ff] text-[#2563eb]'
 : 'text-zinc-500 hover:text-[#142340]'
 }`}
 >
 <Swords size={16} />
 Perfil gamer
 </button>

 <button
 onClick={() => setActiveTab('equipes')}
 className={`flex-1 flex items-center justify-center gap-2 py-3 text-[11px] font-medium uppercase tracking-wide transition-all ${
 activeTab === 'equipes'
 ? 'bg-[#eaf6ff] text-[#2563eb]'
 : 'text-zinc-500 hover:text-[#142340]'
 }`}
 >
 <UsersIcon size={16} />
 Organizações
 </button>

 <button
 onClick={() => setActiveTab('produtoras')}
 className={`flex-1 flex items-center justify-center gap-2 py-3 text-[11px] font-medium uppercase tracking-wide transition-all ${
 activeTab === 'produtoras'
 ? 'bg-[#eaf6ff] text-[#2563eb]'
 : 'text-zinc-500 hover:text-[#142340]'
 }`}
 >
 <Building2 size={16} />
 Staff & mídia
 </button>
 </nav>

 <main className="overflow-hidden border border-zinc-200 bg-white ">
 {activeTab === 'gamer' && <TabGamer />}
 {activeTab === 'equipes' && <TabEquipes />}
 {activeTab === 'produtoras' && <TabProdutoras />}
 </main>

 {carregandoPerfil ? (
 <div className="py-2 text-center text-[10px] font-medium uppercase tracking-[0.3em] text-zinc-500">
 Carregando dados do perfil...
 </div>
 ) : null}
 </div>
 </div>
 )
}

export default function Perfil() {
 return (
 <Suspense
 fallback={
 <div className="flex h-screen flex-col items-center justify-center gap-4 bg-[#f7f7f7]">
 <Gamepad2 className="animate-spin text-[#2563eb]" size={40} />
 <span className="text-[10px] font-medium uppercase tracking-[0.3em] text-zinc-500">
 Carregando perfil...
 </span>
 </div>
 }
 >
 <PerfilContent />
 </Suspense>
 )
}
