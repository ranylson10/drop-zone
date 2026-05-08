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
 BadgeCheck,
 Crown,
 BriefcaseBusiness,
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

type SeloCargoKey =
 | 'jogador'
 | 'coach'
 | 'analista'
 | 'manager'
 | 'lider_equipe'
 | 'narrador'
 | 'comentarista'
 | 'produtor'
 | 'moderador'
 | 'organizador'
 | 'designer'
 | 'editor'
 | 'streamer'

type SeloAtuacao = {
 id: string
 cargo: SeloCargoKey
 origem?: string | null
 verificado?: boolean | null
 origem_tipo?: string | null
 origem_id?: string | null
}

const SELOS_ATUACAO: Record<SeloCargoKey, { label: string; desc: string; tone: string }> = {
 jogador: { label: 'Jogador', desc: 'Possui perfil gamer ativo no site.', tone: 'border-blue-200 bg-blue-50 text-blue-700' },
 coach: { label: 'Coach', desc: 'Atua como coach em line ou equipe.', tone: 'border-cyan-200 bg-cyan-50 text-cyan-700' },
 analista: { label: 'Analista', desc: 'Atua como analista de desempenho ou estratégia.', tone: 'border-indigo-200 bg-indigo-50 text-indigo-700' },
 manager: { label: 'Manager', desc: 'Gerencia uma ou mais equipes no LEALT.', tone: 'border-violet-200 bg-violet-50 text-violet-700' },
 lider_equipe: { label: 'Líder', desc: 'Dono ou responsável por equipe cadastrada.', tone: 'border-amber-200 bg-amber-50 text-amber-700' },
 narrador: { label: 'Narrador', desc: 'Atua em narração de eventos e transmissões.', tone: 'border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700' },
 comentarista: { label: 'Comentarista', desc: 'Atua com comentários, análises e pré-jogo.', tone: 'border-pink-200 bg-pink-50 text-pink-700' },
 produtor: { label: 'Produtor', desc: 'Opera transmissão, GC, OBS/vMix ou produção.', tone: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
 moderador: { label: 'Moderador', desc: 'Modera eventos, apostados, resultados ou disputas.', tone: 'border-red-200 bg-red-50 text-red-700' },
 organizador: { label: 'Organizador', desc: 'Cria campeonatos, copas, ligas e eventos.', tone: 'border-orange-200 bg-orange-50 text-orange-700' },
 designer: { label: 'Designer', desc: 'Cria banners, artes e identidade visual.', tone: 'border-purple-200 bg-purple-50 text-purple-700' },
 editor: { label: 'Editor', desc: 'Edita vídeos, cortes e materiais de mídia.', tone: 'border-zinc-200 bg-zinc-50 text-zinc-700' },
 streamer: { label: 'Streamer', desc: 'Cria conteúdo e transmite jogos/eventos.', tone: 'border-teal-200 bg-teal-50 text-teal-700' },
}


function adicionarSeloUnico(lista: SeloAtuacao[], cargo: SeloCargoKey, origem_tipo: string, origem_id: string, verificado = false) {
 const key = `${cargo}-${origem_tipo}-${origem_id}`
 if (lista.some((item) => `${item.cargo}-${item.origem_tipo}-${item.origem_id}` === key)) return
 lista.push({
  id: key,
  cargo,
  origem: 'automatico',
  origem_tipo,
  origem_id,
  verificado,
 })
}

async function carregarSelosFallback(userId: string): Promise<SeloAtuacao[]> {
 const selos: SeloAtuacao[] = []

 const { data: perfis } = await supabase
  .from('perfis_jogo')
  .select('id')
  .eq('user_id', userId)

 const perfilIds = (perfis || []).map((p: any) => p.id).filter(Boolean)
 perfilIds.forEach((id: string) => adicionarSeloUnico(selos, 'jogador', 'perfil_jogo', id, false))

 const { data: equipesCriadas } = await supabase
  .from('equipes')
  .select('id')
  .eq('criado_por', userId)
 ;
 (equipesCriadas || []).forEach((equipe: any) => adicionarSeloUnico(selos, 'lider_equipe', 'equipe', equipe.id, true))

 const vinculosDono: any[] = []
 const vinculosManager: any[] = []

 const { data: membrosPorUser } = await supabase
  .from('membros_equipe')
  .select('id, tipo, equipe_id')
  .eq('user_id', userId)
  .eq('ativo', true)

 ;(membrosPorUser || []).forEach((membro: any) => {
  if (String(membro.tipo) === 'manager') vinculosManager.push(membro)
  if (['dono', 'admin'].includes(String(membro.tipo))) vinculosDono.push(membro)
 })

 if (perfilIds.length > 0) {
  const { data: membrosPorPerfil } = await supabase
   .from('membros_equipe')
   .select('id, tipo, equipe_id, perfil_jogo_id')
   .in('perfil_jogo_id', perfilIds)
   .eq('ativo', true)

  ;(membrosPorPerfil || []).forEach((membro: any) => {
   if (String(membro.tipo) === 'manager') vinculosManager.push(membro)
   if (['dono', 'admin'].includes(String(membro.tipo))) vinculosDono.push(membro)
  })
 }

 vinculosDono.forEach((membro: any) => adicionarSeloUnico(selos, 'lider_equipe', 'membro_equipe', membro.id, true))
 vinculosManager.forEach((membro: any) => adicionarSeloUnico(selos, 'manager', 'membro_equipe', membro.id, true))

 if (perfilIds.length > 0) {
  const { data: slots } = await supabase
   .from('equipes_lines_jogadores')
   .select('id, tipo_slot, perfil_jogo_id')
   .in('perfil_jogo_id', perfilIds)

  ;(slots || []).forEach((slot: any) => {
   const cargo = String(slot.tipo_slot || '').toLowerCase()
   if (cargo === 'coach' || cargo === 'analista') {
    adicionarSeloUnico(selos, cargo as SeloCargoKey, 'line_slot', slot.id, true)
   }
  })
 }

 return selos
}


function compactarSelosPorCargo(selos: SeloAtuacao[]) {
 const ordem: SeloCargoKey[] = [
  'jogador',
  'lider_equipe',
  'manager',
  'coach',
  'analista',
  'narrador',
  'comentarista',
  'produtor',
  'moderador',
  'organizador',
  'designer',
  'editor',
  'streamer',
 ]
 const map = new Map<SeloCargoKey, SeloAtuacao>()
 selos.forEach((selo) => {
  if (!(selo.cargo in SELOS_ATUACAO)) return
  const atual = map.get(selo.cargo)
  if (!atual || selo.verificado) map.set(selo.cargo, selo)
 })
 return ordem.map((cargo) => map.get(cargo)).filter(Boolean) as SeloAtuacao[]
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
 const [selosAtuacao, setSelosAtuacao] = useState<SeloAtuacao[]>([])

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
 setSelosAtuacao([])
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
 setSelosAtuacao([])
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

 try {
 await supabase.rpc('fn_lealt_sincronizar_selos_usuario', { p_user_id: user.id })
 } catch (rpcError) {
 console.warn('Não foi possível sincronizar selos automaticamente:', rpcError)
 }

 const { data: atuacoesData, error: atuacoesError } = await supabase
 .from('lealt_usuario_atuacoes')
 .select('id, cargo, origem, verificado, origem_tipo, origem_id')
 .eq('user_id', user.id)
 .eq('status', 'ativo')
 .order('created_at', { ascending: true })

 let selos = ((atuacoesData || []) as SeloAtuacao[]).filter((item) => item.cargo in SELOS_ATUACAO)

 if (atuacoesError || selos.length === 0) {
  selos = await carregarSelosFallback(user.id)
 }

 setSelosAtuacao(compactarSelosPorCargo(selos))
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
 <div className="group relative h-[122px] overflow-hidden bg-[#f5f9ff] md:h-[150px]">
 {urlCapa ? (
 <img src={urlCapa} className="absolute inset-0 h-full w-full object-cover" alt="Capa do perfil" />
 ) : (
 <>
 <div className="absolute inset-0 bg-[linear-gradient(135deg,#eef6ff_0%,#ffffff_45%,#eef2ff_100%)]" />
 <div className="absolute inset-0 opacity-70 [background-image:radial-gradient(#2563eb_0.6px,transparent_0.6px)] [background-size:14px_14px]" />
 <div className="absolute left-4 top-4 h-8 w-28 border-l-4 border-[#2563eb] bg-white/60" />
 <div className="absolute bottom-3 right-4 h-8 w-40 border-r-4 border-violet-500 bg-white/50" />
 </>
 )}
 <div className="absolute inset-0 bg-gradient-to-t from-white/85 via-white/15 to-transparent" />

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

 <div className="grid gap-3 px-3 py-3 md:grid-cols-[auto_1fr_auto] md:items-center md:px-4">
 <div className="group relative h-[76px] w-[76px] overflow-hidden border border-zinc-300 bg-white md:h-[84px] md:w-[84px]">
 {urlAvatar ? (
 <img src={urlAvatar} className="h-full w-full object-cover" alt="Avatar" />
 ) : (
 <div className="flex h-full w-full items-center justify-center text-zinc-600">
 <User size={42} />
 </div>
 )}

 {isEditing ? (
 <button
 onClick={() => fileInputAvatar.current?.click()}
 className="absolute inset-0 flex items-center justify-center bg-white/70 text-[#142340] opacity-0 transition group-hover:opacity-100"
 >
 <Camera size={22} />
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
 <Shield size={14} className="text-[#2563eb]" />
 </div>
 </div>

 <div className="min-w-0">
 {isEditing ? (
 <div className="grid gap-2 md:grid-cols-2">
 <input
 value={nomeExibicao}
 onChange={(e) => setNomeExibicao(e.target.value)}
 placeholder="Nome de exibição"
 className="w-full border border-zinc-300 bg-white px-3 py-2 text-lg font-medium uppercase text-[#142340] outline-none placeholder:text-zinc-500 focus:border-[#2563eb]"
 />

 <input
 value={username}
 onChange={(e) => setUsername(e.target.value)}
 placeholder="Username"
 className="w-full border border-zinc-300 bg-white px-3 py-2 text-xs font-medium uppercase text-[#142340] outline-none placeholder:text-zinc-500 focus:border-[#2563eb]"
 />

 <input
 type="date"
 value={dataNascimento}
 onChange={(e) => setDataNascimento(e.target.value)}
 className="w-full border border-zinc-300 bg-white px-3 py-2 text-xs font-medium uppercase text-[#142340] outline-none focus:border-[#2563eb]"
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
 className="w-full border border-zinc-300 bg-white px-3 py-2 pr-10 text-xs font-medium uppercase text-[#142340] outline-none placeholder:text-zinc-500 focus:border-[#2563eb]"
 />
 <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500" />
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
 <div className="text-[11px] font-medium uppercase text-[#142340]">{item.label}</div>
 <div className="mt-1 text-[9px] font-medium uppercase text-zinc-500">{montarLocalidade(item.cidade, item.estado, item.pais) || 'Local'}</div>
 </div>
 </div>
 </button>
 ))}
 </div>
 ) : null}
 </div>

 <input
 value={cidade}
 onChange={(e) => setCidade(e.target.value)}
 placeholder="Cidade"
 className="w-full border border-zinc-300 bg-white px-3 py-2 text-xs font-medium uppercase text-[#142340] outline-none placeholder:text-zinc-500 focus:border-[#2563eb]"
 />
 <input
 value={estado}
 onChange={(e) => setEstado(e.target.value)}
 placeholder="Estado"
 className="w-full border border-zinc-300 bg-white px-3 py-2 text-xs font-medium uppercase text-[#142340] outline-none placeholder:text-zinc-500 focus:border-[#2563eb]"
 />
 <input
 value={pais}
 onChange={(e) => setPais(e.target.value)}
 placeholder="País"
 className="w-full border border-zinc-300 bg-white px-3 py-2 text-xs font-medium uppercase text-[#142340] outline-none placeholder:text-zinc-500 focus:border-[#2563eb]"
 />
 </div>
 ) : (
 <>
 <div className="flex flex-wrap items-center gap-2">
 <h1 className="text-[22px] font-semibold uppercase leading-none tracking-tight text-[#142340] md:text-[26px]">{nomePrincipalExibido}</h1>
 {selosAtuacao.length > 0 ? (
 <div className="flex flex-wrap items-center gap-1">
 {selosAtuacao.map((selo) => {
 const meta = SELOS_ATUACAO[selo.cargo]
 return (
 <span
 key={selo.cargo}
 title={meta.desc}
 className={`inline-flex h-6 items-center gap-1 border px-2 text-[8px] font-black uppercase tracking-[0.11em] ${meta.tone}`}
 >
 {selo.cargo === 'lider_equipe' ? <Crown size={10} /> : selo.cargo === 'manager' ? <BriefcaseBusiness size={10} /> : <BadgeCheck size={10} />}
 {meta.label}
 </span>
 )
 })}
 </div>
 ) : null}
 </div>

 <div className="mt-2 flex flex-wrap gap-3 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
 <span className="flex items-center gap-1.5"><Cake size={13} className="text-[#2563eb]" />{dataNascimento ? `${calcularIdade(dataNascimento)} anos` : 'N/I'}</span>
 <span className="flex items-center gap-1.5"><MapPin size={13} className="text-[#2563eb]" />{localidadeFormatada || 'Local não informado'}</span>
 </div>
 </>
 )}
 </div>

 <div className="flex w-full flex-col gap-2 md:w-[390px]">
 {userId && !isEditing ? (
 <SocialActions entityId={userId} entityType="perfil" variant="light" compact title="Social" />
 ) : null}

 <div className="flex justify-end gap-2">
 {!isEditing ? (
 <button
 onClick={() => setIsEditing(true)}
 className="inline-flex items-center gap-2 border border-zinc-300 bg-white px-4 py-2 text-[10px] font-medium uppercase tracking-[0.16em] text-[#142340] transition hover:bg-zinc-50"
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
 className="inline-flex items-center gap-2 border border-zinc-300 bg-white px-4 py-2 text-[10px] font-medium uppercase tracking-[0.16em] text-[#142340] transition hover:bg-zinc-50"
 >
 <X size={14} /> Cancelar
 </button>

 <button
 onClick={salvarPerfil}
 disabled={loading}
 className="inline-flex h-9 items-center gap-2 border border-[#2563eb] bg-[#2563eb] px-4 text-[11px] font-medium uppercase tracking-wide text-white transition hover:bg-[#1d4ed8] disabled:opacity-60"
 >
 <Save size={14} /> {loading ? 'Sincronizando...' : 'Salvar'}
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
