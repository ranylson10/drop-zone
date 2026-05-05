'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
 CalendarClock,
 ChevronLeft,
 CircleDollarSign,
 Clock3,
 ImagePlus,
 LayoutGrid,
 Plus,
 Trash2,
 Trophy,
 Upload,
 Swords,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useSearchParams } from 'next/navigation'

type HorarioItem = {
 horario: string
}

const SERVIDORES = [
 { value: 'BR', label: 'Brasil (BR)' },
 { value: 'LATAM', label: 'Latam (LATAM)' },
 { value: 'NA', label: 'América do Norte (NA)' },
 { value: 'US', label: 'Estados Unidos (US)' },
 { value: 'SAC', label: 'América do Sul (SAC)' },
 { value: 'EU', label: 'Europa (EU)' },
 { value: 'MEA', label: 'Oriente Médio e África (MEA)' },
 { value: 'IND', label: 'Índia (IND)' },
 { value: 'PK', label: 'Paquistão (PK)' },
 { value: 'BD', label: 'Bangladesh (BD)' },
 { value: 'TH', label: 'Tailândia (TH)' },
 { value: 'VN', label: 'Vietnã (VN)' },
 { value: 'ID', label: 'Indonésia (ID)' },
 { value: 'TW', label: 'Taiwan (TW)' },
 { value: 'SG', label: 'Singapura (SG)' },
 { value: 'CIS', label: 'Comunidade dos Estados Independentes (CIS)' },
]

const PLATAFORMAS = ['Mobile', 'Emulador', 'Misto']
const CATEGORIAS = ['Squad', 'Duo', 'Solo']

function formatarMoeda(valor: number) {
 return valor.toLocaleString('pt-BR', {
 style: 'currency',
 currency: 'BRL',
 })
}

function nomeHorarioPorHora(horario: string, fallbackIndex: number) {
 if (!horario) return `Grupo ${fallbackIndex + 1}`
 return horario.replace(':', 'H')
}

export default function CriarDiarioPage() {
 const searchParams = useSearchParams()
 const isXtreino = searchParams.get('xtreino') === '1'
 const xtreinoModo = String(searchParams.get('modo') || 'jogo_unico').toLowerCase()
 const produtoraIdViaQuery = String(searchParams.get('produtoraId') || '').trim()
 const [nome, setNome] = useState('')
 const [servidor, setServidor] = useState('BR')
 const [plataforma, setPlataforma] = useState('Mobile')
 const [categoria, setCategoria] = useState('Squad')
 const [tipoRegra, setTipoRegra] = useState('trocacao_livre')
 const [tipoInscricao, setTipoInscricao] = useState<'gratuito' | 'pago'>('gratuito')
 const [temPremiacao, setTemPremiacao] = useState<'nao' | 'sim'>('nao')

 const [valorVaga, setValorVaga] = useState('0')
 const [valorPremiacao, setValorPremiacao] = useState('0')
 const [vagasPadrao, setVagasPadrao] = useState('12')
 const [qtdQuedas, setQtdQuedas] = useState('6')
 const [intervaloMinutos, setIntervaloMinutos] = useState('15')

 const [logoFile, setLogoFile] = useState<File | null>(null)
 const [bannerFile, setBannerFile] = useState<File | null>(null)
 const [logoPreview, setLogoPreview] = useState<string | null>(null)
 const [bannerPreview, setBannerPreview] = useState<string | null>(null)

 const [horarios, setHorarios] = useState<HorarioItem[]>([{ horario: '19:00' }])

 const [loading, setLoading] = useState(false)
 const [erro, setErro] = useState<string | null>(null)

 function addHorario() {
 setHorarios((prev) => [...prev, { horario: '' }])
 }

 function removeHorario(index: number) {
 setHorarios((prev) => prev.filter((_, i) => i !== index))
 }

 function updateHorario(index: number, value: string) {
 setHorarios((prev) => {
 const copy = [...prev]
 copy[index] = { horario: value }
 return copy
 })
 }

 function handleLogoChange(file: File | null) {
 setLogoFile(file)
 if (!file) {
 setLogoPreview(null)
 return
 }
 setLogoPreview(URL.createObjectURL(file))
 }

 function handleBannerChange(file: File | null) {
 setBannerFile(file)
 if (!file) {
 setBannerPreview(null)
 return
 }
 setBannerPreview(URL.createObjectURL(file))
 }

 async function validarDimensoesImagem(
 file: File,
 larguraEsperada: number,
 alturaEsperada: number,
 rotulo: string,
 ) {
 await new Promise<void>((resolve, reject) => {
 const url = URL.createObjectURL(file)
 const img = document.createElement('img')

 img.onload = () => {
 URL.revokeObjectURL(url)

 if (img.width === larguraEsperada && img.height === alturaEsperada) {
 resolve()
 return
 }

 reject(
 new Error(
 `${rotulo} deve ter exatamente ${larguraEsperada}x${alturaEsperada}px. A imagem enviada está em ${img.width}x${img.height}px.`,
 ),
 )
 }

 img.onerror = () => {
 URL.revokeObjectURL(url)
 reject(new Error(`Não foi possível ler a imagem de ${rotulo}.`))
 }

 img.src = url
 })
 }

 async function uploadImagem(file: File, pasta: 'logos' | 'banners') {
 const extensao = file.name.split('.').pop() || 'png'
 const nomeArquivo = `${Date.now()}-${Math.random().toString(36).slice(2)}.${extensao}`
 const caminho = `${pasta}/${nomeArquivo}`

 const { data, error } = await supabase.storage
 .from('imagem_campeonatos')
 .upload(caminho, file, { upsert: false })

 if (error) throw error

 const { data: publicData } = supabase.storage
 .from('imagem_campeonatos')
 .getPublicUrl(data.path)

 return publicData.publicUrl
 }

 const resumo = useMemo(() => {
 return {
 totalHorarios: horarios.filter((item) => item.horario.trim()).length,
 totalSlots: horarios.filter((item) => item.horario.trim()).length * Number(vagasPadrao || 0),
 premiacao: Number(valorPremiacao || 0),
 }
 }, [horarios, vagasPadrao, valorPremiacao])

 async function criar() {
 setLoading(true)
 setErro(null)

 try {
 if (!nome.trim()) {
 throw new Error('Informe o nome do diário.')
 }

 if (!logoFile) {
 throw new Error('Envie a logo do diário.')
 }

 if (!bannerFile) {
 throw new Error('Envie o banner do diário.')
 }

 const horariosValidos = horarios
 .map((item) => item.horario.trim())
 .filter(Boolean)

 if (horariosValidos.length === 0) {
 throw new Error('Adicione pelo menos um horário.')
 }

 const horariosDuplicados = new Set<string>()
 for (const horario of horariosValidos) {
 if (horariosDuplicados.has(horario)) {
 throw new Error(`O horário ${horario} está repetido.`)
 }
 horariosDuplicados.add(horario)
 }

 const {
 data: { session },
 } = await supabase.auth.getSession()

 if (!session?.access_token) {
 throw new Error('Sessão expirada. Faça login novamente.')
 }

 await validarDimensoesImagem(logoFile, 500, 500, 'A logo')
 await validarDimensoesImagem(bannerFile, 1080, 1440, 'O banner')

 const logoUrl = await uploadImagem(logoFile, 'logos')
 const bannerUrl = await uploadImagem(bannerFile, 'banners')

 const payload = {
 is_xtreino: isXtreino,
 xtreino_modo: xtreinoModo,
 xtreino_tipo_regra: tipoRegra,
 xtreino_tipo_inscricao: tipoInscricao,
 xtreino_tem_premiacao: temPremiacao === 'sim',
 nome: nome.trim(),
 valor_vaga: Number(valorVaga || 0),
 valor_premiacao: Number(valorPremiacao || 0),
 vagas: Number(vagasPadrao || 12),
 plataforma,
 categoria,
 servidor,
 banner_url: bannerUrl,
 logo_url: logoUrl,
 produtora_id: produtoraIdViaQuery || null,
 grupos: horariosValidos.map((horario, index) => ({
 nome: nomeHorarioPorHora(horario, index),
 horario_inicio: horario,
 horario_fim: null,
 premiacao: Number(valorPremiacao || 0),
 valor_inscricao: Number(valorVaga || 0),
 qtd_slots: Number(vagasPadrao || 12),
 qtd_quedas: Number(qtdQuedas || 6),
 ordem: index + 1,
 intervalo_minutos: Number(intervaloMinutos || 15),
 mapas: [],
 })),
 }

 const res = await fetch('/api/campeonatos/diarios/criar', {
 method: 'POST',
 headers: {
 'Content-Type': 'application/json',
 Authorization: `Bearer ${session.access_token}`,
 },
 body: JSON.stringify(payload),
 })

 const data = await res.json()

 if (!res.ok) {
 throw new Error(data?.error || 'Erro ao criar diário.')
 }

 window.location.href = isXtreino ? `/campeonatos/xtreinos/${data.campeonato_id}` : `/campeonatos/diarios/${data.campeonato_id}`
 } catch (e: any) {
 setErro(e?.message || 'Erro inesperado ao criar diário.')
 } finally {
 setLoading(false)
 }
 }

 return (
 <div className="relative min-h-screen overflow-hidden bg-white text-[#142340]">
 <div className="pointer-events-none absolute inset-0">
 <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(90,255,0,0.16),transparent_32%),linear-gradient(180deg,#071019_0%,#060b12_60%,#05080d_100%)]" />
 <div
 className="absolute inset-0 opacity-[0.08]"
 style={{
 backgroundImage: `
 linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px),
 linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)
 `,
 backgroundSize: '36px 36px',
 }}
 />
 </div>

 <div className="relative mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-12">
 <div className="mb-6">
 <Link
 href={isXtreino ? '/campeonatos/xtreinos' : '/campeonatos/diarios'}
 className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-600 transition hover:text-[#142340]"
 >
 <ChevronLeft size={16} />
 {isXtreino ? 'Voltar para xtreinos' : 'Voltar para diários'}
 </Link>
 </div>

 <section className="overflow-hidden rounded-[32px] border border-zinc-200 bg-white/[0.04] -[0_0_0_1px_rgba(255,255,255,0.03),0_20px_80px_rgba(0,0,0,0.45)] -xl">
 <div className="border-b border-zinc-200 bg-[linear-gradient(180deg,rgba(114,255,0,0.08),rgba(255,255,255,0.02))] p-6 md:p-8">
 <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
 <div>
 <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#2563eb]/25 bg-[#2563eb]/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-[#2563eb]">
 <CalendarClock size={12} />
 {isXtreino ? 'Xtreino • jogo único' : 'Diário por horários'}
 </div>

 <h1 className="text-3xl font-semibold uppercase md:text-5xl">{isXtreino ? 'Criar xtreino' : 'Criar diário'}</h1>
 <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-zinc-600">
 {isXtreino ? 'Usando o formulário real do diário para criar um xtreino em jogo único com vários horários.' : 'Define os dados gerais do diário uma vez e depois só escolhe os horários.'}
 </p>
 </div>

 <div className="grid w-full max-w-xl grid-cols-3 gap-3">
 <div className="rounded-[22px] border border-zinc-200 bg-zinc-50 p-4">
 <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
 Horários
 </div>
 <div className="mt-2 text-3xl font-semibold text-[#142340]">{resumo.totalHorarios}</div>
 </div>

 <div className="rounded-[22px] border border-zinc-200 bg-zinc-50 p-4">
 <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
 Slots totais
 </div>
 <div className="mt-2 text-3xl font-semibold text-[#142340]">{resumo.totalSlots}</div>
 </div>

 <div className="rounded-[22px] border border-zinc-200 bg-zinc-50 p-4">
 <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
 Premiação
 </div>
 <div className="mt-2 text-2xl font-semibold text-[#2563eb]">
 {formatarMoeda(resumo.premiacao)}
 </div>
 </div>
 </div>
 </div>
 </div>

 <div className="grid gap-6 p-4 md:p-6 xl:grid-cols-[1.15fr_0.85fr]">
 <div className="space-y-6">
 <div className="rounded-[28px] border border-zinc-200 bg-zinc-50 p-5 md:p-6">
 <div className="mb-5 flex items-center gap-3">
 <div className="flex h-11 w-11 items-center justify-center border border-zinc-200 bg-white/[0.04] text-[#2563eb]">
 <Trophy size={20} />
 </div>
 <div>
 <h2 className="text-lg font-semibold uppercase text-[#142340]">Dados principais</h2>
 <p className="text-sm text-zinc-500">Informações gerais do diário.</p>
 </div>
 </div>

 <div className="grid gap-4 md:grid-cols-2">
 <div className="md:col-span-2">
 <label className="mb-2 block text-sm font-semibold text-zinc-600">
 Nome do campeonato
 </label>
 <input
 value={nome}
 onChange={(e) => setNome(e.target.value)}
 placeholder="Ex: Diário Aloe League"
 className="h-12 w-full border border-zinc-200 bg-zinc-50 px-4 text-sm font-semibold text-[#142340] outline-none placeholder:text-zinc-500 focus:border-[#2563eb]/40"
 />
 </div>

 <div>
 <label className="mb-2 block text-sm font-semibold text-zinc-600">
 Logo 500x500
 </label>
 <label className="flex min-h-[210px] cursor-pointer flex-col items-center justify-center rounded-[24px] border border-dashed border-zinc-200 bg-zinc-50 p-4 transition hover:border-[#2563eb]/35 hover:bg-zinc-50">
 {logoPreview ? (
 <div className="relative h-[150px] w-[150px] overflow-hidden border border-zinc-200">
 <Image
 src={logoPreview}
 alt="Preview da logo"
 fill
 className="object-cover"
 unoptimized
 />
 </div>
 ) : (
 <>
 <div className="mb-3 flex h-12 w-12 items-center justify-center border border-zinc-200 bg-zinc-50 text-[#2563eb]">
 <Upload size={18} />
 </div>
 <div className="text-sm font-bold text-[#142340]">Enviar logo</div>
 <div className="mt-1 text-center text-xs font-medium text-zinc-500">
 PNG ou JPG com 500x500px
 </div>
 </>
 )}
 <input
 type="file"
 accept="image/png,image/jpeg,image/webp"
 className="hidden"
 onChange={(e) => handleLogoChange(e.target.files?.[0] || null)}
 />
 </label>
 </div>

 <div>
 <label className="mb-2 block text-sm font-semibold text-zinc-600">
 Banner 1080x1440
 </label>
 <label className="flex min-h-[210px] cursor-pointer flex-col items-center justify-center rounded-[24px] border border-dashed border-zinc-200 bg-zinc-50 p-4 transition hover:border-[#2563eb]/35 hover:bg-zinc-50">
 {bannerPreview ? (
 <div className="relative h-[170px] w-full overflow-hidden border border-zinc-200">
 <Image
 src={bannerPreview}
 alt="Preview do banner"
 fill
 className="object-cover"
 unoptimized
 />
 </div>
 ) : (
 <>
 <div className="mb-3 flex h-12 w-12 items-center justify-center border border-zinc-200 bg-zinc-50 text-[#2563eb]">
 <ImagePlus size={18} />
 </div>
 <div className="text-sm font-bold text-[#142340]">Enviar banner</div>
 <div className="mt-1 text-center text-xs font-medium text-zinc-500">
 PNG ou JPG com 1080x1440px
 </div>
 </>
 )}
 <input
 type="file"
 accept="image/png,image/jpeg,image/webp"
 className="hidden"
 onChange={(e) => handleBannerChange(e.target.files?.[0] || null)}
 />
 </label>
 </div>

 <div>
 <label className="mb-2 block text-sm font-semibold text-zinc-600">
 Servidor
 </label>
 <select
 value={servidor}
 onChange={(e) => setServidor(e.target.value)}
 className="h-12 w-full border border-zinc-200 bg-zinc-50 px-4 text-sm font-semibold text-[#142340] outline-none focus:border-[#2563eb]/40"
 >
 {SERVIDORES.map((item) => (
 <option key={item.value} value={item.value}>
 {item.label}
 </option>
 ))}
 </select>
 </div>

 <div>
 <label className="mb-2 block text-sm font-semibold text-zinc-600">
 Plataforma
 </label>
 <select
 value={plataforma}
 onChange={(e) => setPlataforma(e.target.value)}
 className="h-12 w-full border border-zinc-200 bg-zinc-50 px-4 text-sm font-semibold text-[#142340] outline-none focus:border-[#2563eb]/40"
 >
 {PLATAFORMAS.map((item) => (
 <option key={item} value={item}>
 {item}
 </option>
 ))}
 </select>
 </div>

 <div>
 <label className="mb-2 block text-sm font-semibold text-zinc-600">
 Categoria
 </label>
 <select
 value={categoria}
 onChange={(e) => setCategoria(e.target.value)}
 className="h-12 w-full border border-zinc-200 bg-zinc-50 px-4 text-sm font-semibold text-[#142340] outline-none focus:border-[#2563eb]/40"
 >
 {CATEGORIAS.map((item) => (
 <option key={item} value={item}>
 {item}
 </option>
 ))}
 </select>
 </div>

 <div>
 <label className="mb-2 block text-sm font-semibold text-zinc-600">
 Valor da inscrição
 </label>
 <input
 type="number"
 value={valorVaga}
 onChange={(e) => setValorVaga(e.target.value)}
 placeholder="0"
 className="h-12 w-full border border-zinc-200 bg-zinc-50 px-4 text-sm font-semibold text-[#142340] outline-none placeholder:text-zinc-500 focus:border-[#2563eb]/40"
 />
 </div>

 <div>
 <label className="mb-2 block text-sm font-semibold text-zinc-600">
 Premiação
 </label>
 <input
 type="number"
 value={valorPremiacao}
 onChange={(e) => setValorPremiacao(e.target.value)}
 placeholder="0"
 className="h-12 w-full border border-zinc-200 bg-zinc-50 px-4 text-sm font-semibold text-[#142340] outline-none placeholder:text-zinc-500 focus:border-[#2563eb]/40"
 />
 </div>

 <div>
 <label className="mb-2 block text-sm font-semibold text-zinc-600">
 Slots por horário
 </label>
 <input
 type="number"
 value={vagasPadrao}
 onChange={(e) => setVagasPadrao(e.target.value)}
 placeholder="12"
 className="h-12 w-full border border-zinc-200 bg-zinc-50 px-4 text-sm font-semibold text-[#142340] outline-none placeholder:text-zinc-500 focus:border-[#2563eb]/40"
 />
 </div>

 <div>
 <label className="mb-2 block text-sm font-semibold text-zinc-600">
 Quantidade de quedas
 </label>
 <input
 type="number"
 value={qtdQuedas}
 onChange={(e) => setQtdQuedas(e.target.value)}
 placeholder="6"
 className="h-12 w-full border border-zinc-200 bg-zinc-50 px-4 text-sm font-semibold text-[#142340] outline-none placeholder:text-zinc-500 focus:border-[#2563eb]/40"
 />
 </div>

 <div>
 <label className="mb-2 block text-sm font-semibold text-zinc-600">
 Intervalo entre quedas
 </label>
 <input
 type="number"
 value={intervaloMinutos}
 onChange={(e) => setIntervaloMinutos(e.target.value)}
 placeholder="15"
 className="h-12 w-full border border-zinc-200 bg-zinc-50 px-4 text-sm font-semibold text-[#142340] outline-none placeholder:text-zinc-500 focus:border-[#2563eb]/40"
 />
 </div>
 </div>
 </div>


 {isXtreino && (
 <div className="rounded-[28px] border border-zinc-200 bg-zinc-50 p-5 md:p-6">
 <div className="mb-5 flex items-center gap-3">
 <div className="flex h-11 w-11 items-center justify-center border border-zinc-200 bg-white/[0.04] text-[#2563eb]">
 <Swords size={20} />
 </div>
 <div>
 <h2 className="text-lg font-semibold uppercase text-[#142340]">Configuração do xtreino</h2>
 <p className="text-sm text-zinc-500">Regras específicas do treino em jogo único.</p>
 </div>
 </div>

 <div className="grid gap-4 md:grid-cols-2">
 <div>
 <label className="mb-2 block text-sm font-semibold text-zinc-600">Regra do treino</label>
 <select
 value={tipoRegra}
 onChange={(e) => setTipoRegra(e.target.value)}
 className="h-12 w-full border border-zinc-200 bg-zinc-50 px-4 text-sm font-semibold text-[#142340] outline-none focus:border-[#2563eb]/40"
 >
 <option value="trocacao_livre">Trocação Livre</option>
 <option value="primeira_safe">Primeira Safe</option>
 <option value="segunda_safe">Segunda Safe</option>
 <option value="terceira_safe">Terceira Safe</option>
 </select>
 </div>

 <div>
 <label className="mb-2 block text-sm font-semibold text-zinc-600">Inscrição</label>
 <select
 value={tipoInscricao}
 onChange={(e) => setTipoInscricao(e.target.value as 'gratuito' | 'pago')}
 className="h-12 w-full border border-zinc-200 bg-zinc-50 px-4 text-sm font-semibold text-[#142340] outline-none focus:border-[#2563eb]/40"
 >
 <option value="gratuito">Gratuito</option>
 <option value="pago">Pago</option>
 </select>
 </div>

 <div>
 <label className="mb-2 block text-sm font-semibold text-zinc-600">Tem premiação?</label>
 <select
 value={temPremiacao}
 onChange={(e) => setTemPremiacao(e.target.value as 'nao' | 'sim')}
 className="h-12 w-full border border-zinc-200 bg-zinc-50 px-4 text-sm font-semibold text-[#142340] outline-none focus:border-[#2563eb]/40"
 >
 <option value="nao">Não</option>
 <option value="sim">Sim</option>
 </select>
 </div>
 </div>
 </div>
 )}

 <div className="rounded-[28px] border border-zinc-200 bg-zinc-50 p-5 md:p-6">
 <div className="mb-5 flex items-center justify-between gap-4">
 <div>
 <h2 className="text-lg font-semibold uppercase text-[#142340]">Horários do diário</h2>
 <p className="text-sm text-zinc-500">
 Aqui tu só escolhe quais horários o diário vai ter.
 </p>
 </div>

 <button
 type="button"
 onClick={addHorario}
 className="inline-flex h-11 items-center justify-center gap-2 border border-zinc-200 bg-zinc-50 px-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#142340] transition hover:border-[#2563eb]/40 hover:text-[#2563eb]"
 >
 <Plus size={14} />
 Novo horário
 </button>
 </div>

 <div className="rounded-[24px] border border-zinc-200 bg-zinc-50 p-4 md:p-5">
 <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
 {horarios.map((item, index) => (
 <div
 key={index}
 className="rounded-[22px] border border-zinc-200 bg-zinc-50 p-4"
 >
 <div className="mb-3 flex items-center justify-between gap-3">
 <div>
 <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#2563eb]">
 Horário {index + 1}
 </div>
 <div className="mt-1 text-lg font-semibold uppercase text-[#142340]">
 {item.horario ? nomeHorarioPorHora(item.horario, index) : 'Novo horário'}
 </div>
 </div>

 {horarios.length > 1 ? (
 <button
 type="button"
 onClick={() => removeHorario(index)}
 className="inline-flex h-10 w-10 items-center justify-center border border-red-500/20 bg-red-500/10 text-red-300 transition hover:bg-red-500/20"
 >
 <Trash2 size={16} />
 </button>
 ) : null}
 </div>

 <label className="mb-2 block text-sm font-semibold text-zinc-600">
 Horário
 </label>
 <div className="relative">
 <Clock3
 size={16}
 className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500"
 />
 <input
 type="time"
 value={item.horario}
 onChange={(e) => updateHorario(index, e.target.value)}
 className="h-12 w-full border border-zinc-200 bg-white/30 pl-11 pr-4 text-sm font-semibold text-[#142340] outline-none focus:border-[#2563eb]/40"
 />
 </div>

 <div className="mt-3 text-xs font-medium text-zinc-500">
 Esse grupo começará exatamente às {item.horario || '--:--'}.
 </div>
 </div>
 ))}
 </div>
 </div>
 </div>
 </div>

 <aside className="space-y-6">
 <div className="rounded-[28px] border border-zinc-200 bg-zinc-50 p-5 md:p-6">
 <h3 className="text-lg font-semibold uppercase text-[#142340]">Resumo</h3>
 <p className="mt-1 text-sm text-zinc-500">Confira antes de criar o diário.</p>

 <div className="mt-5 space-y-3">
 <div className=" border border-zinc-200 bg-zinc-50 p-4">
 <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
 Nome
 </div>
 <div className="mt-2 text-base font-bold text-[#142340]">
 {nome || 'Não informado'}
 </div>
 </div>

 <div className="grid grid-cols-2 gap-3">
 <div className=" border border-zinc-200 bg-zinc-50 p-4">
 <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
 Servidor
 </div>
 <div className="mt-2 text-base font-bold text-[#142340]">
 {SERVIDORES.find((item) => item.value === servidor)?.label || servidor}
 </div>
 </div>

 <div className=" border border-zinc-200 bg-zinc-50 p-4">
 <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
 Plataforma
 </div>
 <div className="mt-2 text-base font-bold text-[#142340]">{plataforma}</div>
 </div>
 </div>

 <div className="grid grid-cols-2 gap-3">
 <div className=" border border-zinc-200 bg-zinc-50 p-4">
 <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
 Categoria
 </div>
 <div className="mt-2 text-base font-bold text-[#142340]">{categoria}</div>
 </div>

 <div className=" border border-zinc-200 bg-zinc-50 p-4">
 <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
 Horários
 </div>
 <div className="mt-2 text-base font-bold text-[#142340]">{resumo.totalHorarios}</div>
 </div>
 </div>

 <div className="grid grid-cols-2 gap-3">
 <div className=" border border-zinc-200 bg-zinc-50 p-4">
 <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
 Inscrição
 </div>
 <div className="mt-2 text-base font-bold text-[#142340]">
 {formatarMoeda(Number(valorVaga || 0))}
 </div>
 </div>

 <div className=" border border-zinc-200 bg-zinc-50 p-4">
 <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
 Premiação
 </div>
 <div className="mt-2 text-base font-bold text-[#2563eb]">
 {formatarMoeda(Number(valorPremiacao || 0))}
 </div>
 </div>
 </div>

 <div className="grid grid-cols-3 gap-3">
 <div className=" border border-zinc-200 bg-zinc-50 p-4">
 <div className="mb-2 text-zinc-500">
 <LayoutGrid size={16} />
 </div>
 <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
 Slots
 </div>
 <div className="mt-2 text-2xl font-semibold text-[#142340]">{vagasPadrao}</div>
 </div>

 <div className=" border border-zinc-200 bg-zinc-50 p-4">
 <div className="mb-2 text-zinc-500">
 <Trophy size={16} />
 </div>
 <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
 Quedas
 </div>
 <div className="mt-2 text-2xl font-semibold text-[#142340]">{qtdQuedas}</div>
 </div>

 <div className=" border border-zinc-200 bg-zinc-50 p-4">
 <div className="mb-2 text-zinc-500">
 <CircleDollarSign size={16} />
 </div>
 <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
 Intervalo
 </div>
 <div className="mt-2 text-xl font-semibold text-[#2563eb]">
 {intervaloMinutos}m
 </div>
 </div>
 </div>

 <div className=" border border-zinc-200 bg-zinc-50 p-4">
 <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
 Lista de horários
 </div>
 <div className="mt-3 flex flex-wrap gap-2">
 {horarios
 .map((item) => item.horario.trim())
 .filter(Boolean)
 .map((horario) => (
 <span
 key={horario}
 className="inline-flex items-center rounded-full border border-[#2563eb]/20 bg-[#2563eb]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#2563eb]"
 >
 {horario.replace(':', 'H')}
 </span>
 ))}
 </div>
 </div>
 </div>

 {erro ? (
 <div className="mt-5 border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-300">
 {erro}
 </div>
 ) : null}

 <button
 type="button"
 onClick={criar}
 disabled={loading}
 className="mt-6 inline-flex h-14 w-full items-center justify-center border border-[#2563eb]/25 bg-[#2563eb] text-[12px] font-semibold uppercase tracking-[0.22em] text-[#142340] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
 >
 {loading ? 'Criando diário...' : 'Criar diário'}
 </button>
 </div>
 </aside>
 </div>
 </section>
 </div>
 </div>
 )
}