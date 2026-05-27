'use client'

import { useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import {
 AlertCircle,
 ArrowLeft,
 ArrowRight,
 Check,
 ImageIcon,
 Loader2,
 Shield,
 Trophy,
 Upload,
 CalendarDays,
 LayoutTemplate,
 Radio,
} from 'lucide-react'
import { usePerfil } from '@/app/contexts/PerfilContext'

type FormCriarCampeonatoProps = {
 produtoraId?: string
 onSuccess?: () => void
}

type Etapa = 1 | 2 | 3 | 4 | 5
type WhatsContato = { nome: string; numero: string }

const OPCOES_PLATAFORMA = ['Mobile', 'Emulador', 'Misto']
const OPCOES_ABRANGENCIA = ['Nacional', 'Estadual', 'Regional', 'Internacional']
const OPCOES_REGIAO = [
 'Brasil',
 'América Latina (LATAM)',
 'América do Norte (NA / US)',
 'Sudeste Asiático (SEA)',
 'Bangladesh',
 'Paquistão',
 'Oriente Médio e África (MENA)',
 'Nepal',
]
const OPCOES_TIPO_CAMPEONATO = [
 'Amador',
 'Semi-profissional',
 'Profissional',
 'Comunitário',
]
const OPCOES_CATEGORIA = ['Squad', 'Duo', 'Solo']
const OPCOES_MODO_JOGO = ['CS', 'Battle Royale', 'Pontuação', 'Misto']
const OPCOES_FORMATO = ['Liga', 'Copa', 'Diário', 'Semanal', 'Showmatch']
const OPCOES_MAPAS = [
 'Bermuda',
 'Purgatório',
 'Kalahari',
 'Alpine',
 'Nova Terra',
 'Solara',
]
const OPCOES_DIAS = [
 'Segunda',
 'Terça',
 'Quarta',
 'Quinta',
 'Sexta',
 'Sábado',
 'Domingo',
]
const OPCOES_FORMA_PAGAMENTO = ['PIX', 'PicPay', 'Mercado Pago', 'Outros']
const OPCOES_TIPO_PREMIACAO = [
 'Dinheiro',
 'Gift Card',
 'Diamantes',
 'Troféu / Medalha',
]

function limparNumeroWhatsApp(numero: string) {
 return String(numero || '').replace(/\D/g, '')
}

function normalizarContatosWhatsApp(contatos: WhatsContato[]) {
 return contatos
 .slice(0, 3)
 .map((contato) => ({
 nome: String(contato.nome || '').trim(),
 numero: limparNumeroWhatsApp(contato.numero),
 }))
 .filter((contato) => contato.nome && contato.numero)
}
const OPCOES_PLATAFORMA_TRANSMISSAO = ['YouTube', 'Twitch', 'TikTok']
const OPCOES_TROCA_JOGADORES = ['Permitida', 'Proibida']

const ETAPAS = [
 { numero: 1, titulo: 'Básico', icon: Trophy },
 { numero: 2, titulo: 'Tipo', icon: LayoutTemplate },
 { numero: 3, titulo: 'Estrutura', icon: Shield },
 { numero: 4, titulo: 'Datas', icon: CalendarDays },
 { numero: 5, titulo: 'Regras & Mídia', icon: Radio },
]

function slugify(value: string) {
 return value
 .normalize('NFD')
 .replace(/[\u0300-\u036f]/g, '')
 .toLowerCase()
 .replace(/[^a-z0-9\s-]/g, '')
 .trim()
 .replace(/\s+/g, '-')
 .replace(/-+/g, '-')
}

function parseMoney(value: string) {
 const normalized = String(value || '')
 .replace(/\./g, '')
 .replace(',', '.')
 .replace(/[^\d.]/g, '')

 const parsed = Number(normalized)
 return Number.isFinite(parsed) ? parsed : 0
}

function parseNumber(value: string | number | null | undefined) {
 const num = Number(value)
 return Number.isFinite(num) ? num : 0
}

function toNullableNumber(value: string | number | null | undefined) {
 if (value === '' || value === null || value === undefined) return null
 const num = Number(value)
 return Number.isFinite(num) ? num : null
}

function toNullableText(value: string | null | undefined) {
 const finalValue = String(value || '').trim()
 return finalValue ? finalValue : null
}

function toNullableTime(value: string | null | undefined) {
 const finalValue = String(value || '').trim()
 return finalValue ? finalValue : null
}

function toNullableDateTime(value: string | null | undefined) {
 const finalValue = String(value || '').trim()
 return finalValue ? new Date(finalValue).toISOString() : null
}

function getErrorMessage(err: any) {
 return err?.message || 'Ocorreu um erro inesperado.'
}

function SectionTitle({
 title,
 subtitle,
}: {
 title: string
 subtitle?: string
}) {
 return (
 <div className="mb-6">
 <h3 className="text-lg font-semibold uppercase tracking-tight text-[#142340] md:text-xl">
 {title}
 </h3>
 {subtitle ? (
 <p className="mt-1 text-sm font-semibold text-zinc-500">{subtitle}</p>
 ) : null}
 </div>
 )
}

function ToggleCard({
 active,
 label,
 onClick,
}: {
 active: boolean
 label: string
 onClick: () => void
}) {
 return (
 <button
 type="button"
 onClick={onClick}
 className={`relative min-h-[56px] border px-4 py-3 text-left text-sm font-semibold uppercase tracking-wide transition-all ${
 active
 ? 'border-[#2563eb] bg-[#2563eb]/10 text-[#142340] -[0_0_0_1px_rgba(124,252,0,0.18)]'
 : 'border-zinc-200 bg-white text-zinc-600 hover:border-[#2563eb] hover:bg-white hover:text-[#142340]'
 }`}
 >
 <span className="pr-8">{label}</span>
 {active && (
 <span className="absolute right-3 top-3 rounded-full bg-[#2563eb] p-1 text-[#142340]">
 <Check size={12} />
 </span>
 )}
 </button>
 )
}

function MultiSelectGrid({
 options,
 values,
 onToggle,
}: {
 options: string[]
 values: string[]
 onToggle: (value: string) => void
}) {
 return (
 <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
 {options.map((item) => {
 const active = values.includes(item)
 return (
 <ToggleCard
 key={item}
 label={item}
 active={active}
 onClick={() => onToggle(item)}
 />
 )
 })}
 </div>
 )
}

function OptionGrid({
 options,
 value,
 onChange,
 cols = 'grid-cols-2 md:grid-cols-3',
}: {
 options: string[]
 value: string
 onChange: (value: string) => void
 cols?: string
}) {
 return (
 <div className={`grid gap-3 ${cols}`}>
 {options.map((item) => (
 <ToggleCard
 key={item}
 label={item}
 active={value === item}
 onClick={() => onChange(item)}
 />
 ))}
 </div>
 )
}

function InputLabel({ children }: { children: React.ReactNode }) {
 return (
 <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
 {children}
 </label>
 )
}

function TextInput({
 value,
 onChange,
 placeholder,
 type = 'text',
 required = false,
 min,
 max,
 step,
}: {
 value: string | number
 onChange: (value: string) => void
 placeholder?: string
 type?: string
 required?: boolean
 min?: number
 max?: number
 step?: string | number
}) {
 return (
 <input
 required={required}
 type={type}
 min={min}
 max={max}
 step={step}
 value={value}
 onChange={(e) => onChange(e.target.value)}
 placeholder={placeholder}
 className="w-full border border-zinc-200 bg-white px-4 py-3.5 text-sm font-bold text-[#142340] outline-none transition placeholder:text-zinc-600 focus:border-[#2563eb] focus:ring-1 focus:ring-[#7cfc00]"
 />
 )
}

function TextArea({
 value,
 onChange,
 placeholder,
 rows = 4,
}: {
 value: string
 onChange: (value: string) => void
 placeholder?: string
 rows?: number
}) {
 return (
 <textarea
 rows={rows}
 value={value}
 onChange={(e) => onChange(e.target.value)}
 placeholder={placeholder}
 className="w-full border border-zinc-200 bg-white px-4 py-3.5 text-sm font-bold text-[#142340] outline-none transition placeholder:text-zinc-600 focus:border-[#2563eb] focus:ring-1 focus:ring-[#7cfc00]"
 />
 )
}

function SwitchRow({
 label,
 value,
 onChange,
}: {
 label: string
 value: boolean
 onChange: (value: boolean) => void
}) {
 return (
 <button
 type="button"
 onClick={() => onChange(!value)}
 className={`flex w-full items-center justify-between border px-4 py-3.5 text-left transition-all ${
 value
 ? 'border-[#2563eb] bg-[#2563eb]/10 text-[#142340]'
 : 'border-zinc-200 bg-white text-zinc-600 hover:border-[#2563eb]'
 }`}
 >
 <span className="text-sm font-semibold uppercase tracking-wide">{label}</span>
 <span
 className={`inline-flex h-7 w-12 items-center rounded-full p-1 transition-all ${
 value ? 'bg-[#2563eb]' : 'bg-zinc-700'
 }`}
 >
 <span
 className={`h-5 w-5 rounded-full bg-white transition-all ${
 value ? 'translate-x-5' : 'translate-x-0'
 }`}
 />
 </span>
 </button>
 )
}

function UploadBox({
 title,
 subtitle,
 preview,
 ratioClass,
 maxWidthClass,
 icon,
 onSelect,
}: {
 title: string
 subtitle: string
 preview: string
 ratioClass: string
 maxWidthClass: string
 icon: React.ReactNode
 onSelect: (file: File) => void
}) {
 return (
 <div className="rounded-[26px] border border-zinc-200 bg-white p-4">
 <div className="mb-3">
 <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
 {title}
 </p>
 <p className="mt-1 text-xs font-semibold text-zinc-500">{subtitle}</p>
 </div>

 <label className={`block w-full ${maxWidthClass} cursor-pointer`}>
 <div
 className={`relative overflow-hidden rounded-[22px] border-2 border-dashed border-zinc-200 bg-white ${ratioClass}`}
 >
 {preview ? (
 <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_center,rgba(124,252,0,0.06),transparent_60%)] p-4">
 <img
 src={preview}
 alt={title}
 className="h-full w-full object-contain"
 />
 </div>
 ) : (
 <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
 <div className="mb-3 text-zinc-600">{icon}</div>
 <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
 {title}
 </p>
 <p className="mt-2 text-xs font-semibold text-zinc-500">
 Clique para enviar
 </p>
 </div>
 )}

 <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-zinc-200 bg-white/80 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#142340] ">
 <Upload size={12} className="mr-2 inline" />
 Selecionar arquivo
 </div>
 </div>

 <input
 type="file"
 className="hidden"
 accept="image/*"
 onChange={(e) => {
 const file = e.target.files?.[0]
 if (file) onSelect(file)
 }}
 />
 </label>
 </div>
 )
}

export default function FormCriarCampeonato({
 produtoraId,
 onSuccess,
}: FormCriarCampeonatoProps) {
 const router = useRouter()
 const { perfilAtivo } = usePerfil()

 const [step, setStep] = useState<Etapa>(1)
 const [loading, setLoading] = useState(false)
 const [erro, setErro] = useState('')
 const [logoFile, setLogoFile] = useState<File | null>(null)
 const [bannerFile, setBannerFile] = useState<File | null>(null)

 const [previews, setPreviews] = useState({
 logo: '',
 banner: '',
 })

 const [form, setForm] = useState({
 nome: '',
 edicao: '',
 descricao: '',
 jogo: 'Free Fire',

 valor_premiacao: '0',
 valor_vaga: '0',
 vagas: '48',
 moeda: 'BRL',

 plataforma: '',
 abrangencia: '',
 regiao: '',
 tipo_campeonato: '',
 categoria: '',
 modo_jogo: '',
 formato: '',

 quantidade_quedas: '',
 quedas_por_rodada: '',
 quantidade_rodadas: '',
 equipes_por_jogo: '',
 sistema_pontos_tipo: '',
 criterio_desempate: '',
 mapas: [] as string[],

 data_abertura_inscricoes: '',
 data_encerramento_inscricoes: '',
 data_inicio: '',
 data_fim: '',
 horario_inicio: '',
 fuso_horario: 'America/Belem',
 dias_jogo: [] as string[],

 forma_pagamento: '',
 limite_por_organizacao: '',
 substitutos_permitidos: false,
 checkin_obrigatorio: false,
 horario_checkin: '',

 jogadores_por_equipe: '',
 reservas_permitidos: '',
 idade_minima: '',
 nivel_minimo_conta: '',
 pro_players_proibidos: false,
 guildas_restritas: '',
 troca_jogadores: '',
 penalidade_wo: '',

 tipo_premiacao: '',
 premiacao_garantida: false,
 forma_pagamento_premiacao: '',
 prazo_pagamento_premiacao: '',

 transmissao_ao_vivo: false,
 plataforma_transmissao: '',
 narradores: '',
 delay_transmissao: '',
 replays_disponiveis: false,
 cobertura_redes_sociais: false,

 anti_cheat: false,
 organizacao_nome: '',
 comissao_nome: '',

 discord_oficial: false,
 discord_url: '',
 canal_oficial_url: '',
 whatsapp_suporte: '',
 whatsapp_contatos: [{ nome: '', numero: '' }] as WhatsContato[],
 email_suporte: '',
 responsavel_nome: '',

 distribuicao_premiacao_json: '',
 })

 const progresso = useMemo(() => (step / ETAPAS.length) * 100, [step])

 function updateField<K extends keyof typeof form>(field: K, value: (typeof form)[K]) {
 setForm((prev) => ({ ...prev, [field]: value }))
 }

 function toggleInArray(field: 'mapas' | 'dias_jogo', value: string) {
 setForm((prev) => {
 const arr = prev[field]
 const next = arr.includes(value)
 ? arr.filter((item) => item !== value)
 : [...arr, value]

 return {
 ...prev,
 [field]: next,
 }
 })
 }

 async function validarDimensoesImagem(
 file: File,
 larguraEsperada: number,
 alturaEsperada: number,
 rotulo: string
 ) {
 await new Promise<void>((resolve, reject) => {
 const url = URL.createObjectURL(file)
 const img = new Image()

 img.onload = () => {
 URL.revokeObjectURL(url)

 if (img.width === larguraEsperada && img.height === alturaEsperada) {
 resolve()
 return
 }

 reject(
 new Error(
 `${rotulo} deve ter exatamente ${larguraEsperada}x${alturaEsperada}px. A imagem enviada está em ${img.width}x${img.height}px.`
 )
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

 function validarEtapaAtual() {
 if (step === 1) {
 if (!form.nome.trim()) return 'Informe o nome do campeonato.'
 if (!form.edicao.trim()) return 'Informe a edição do campeonato.'
 if (!logoFile) return 'Envie a logo do campeonato.'
 if (!bannerFile) return 'Envie o banner do campeonato.'
 }

 if (step === 2) {
 if (!form.plataforma) return 'Selecione a plataforma.'
 if (!form.abrangencia) return 'Selecione a abrangência.'
 if (!form.regiao) return 'Selecione a região.'
 if (!form.tipo_campeonato) return 'Selecione o tipo do campeonato.'
 if (!form.categoria) return 'Selecione a categoria.'
 if (!form.modo_jogo) return 'Selecione o modo de jogo.'
 if (!form.formato) return 'Selecione o formato.'
 }

 if (step === 3) {
 if (!form.quedas_por_rodada) return 'Informe a quantidade de quedas por rodada.'
 if (!form.quantidade_rodadas) return 'Informe a quantidade de rodadas.'
 if (!form.equipes_por_jogo) return 'Informe o número de equipes por jogo.'
 if (!form.sistema_pontos_tipo.trim()) return 'Informe o sistema de pontos.'
 if (!form.criterio_desempate.trim()) return 'Informe o critério de desempate.'
 if (!form.mapas.length) return 'Selecione pelo menos um mapa.'
 }

 return ''
 }

 async function irParaProximaEtapa() {
 setErro('')
 const erroEtapa = validarEtapaAtual()

 if (erroEtapa) {
 setErro(erroEtapa)
 return
 }

 if (step < 5) {
 setStep((prev) => (prev + 1) as Etapa)
 }
 }

 function voltarEtapa() {
 setErro('')
 if (step > 1) {
 setStep((prev) => (prev - 1) as Etapa)
 }
 }

 function parseDistribuicaoPremiacao() {
 const raw = form.distribuicao_premiacao_json.trim()
 if (!raw) return []

 try {
 const parsed = JSON.parse(raw)
 return Array.isArray(parsed) ? parsed : []
 } catch {
 throw new Error('A distribuição da premiação precisa estar em JSON válido.')
 }
 }

 async function handleSubmit(e: React.FormEvent) {
 e.preventDefault()
 setErro('')

 const produtoraFinalId = produtoraId || perfilAtivo?.id

 if (!produtoraFinalId) {
 setErro('Nenhuma produtora selecionada para criar o campeonato.')
 return
 }

 if (!form.nome.trim()) {
 setErro('Informe o nome do campeonato.')
 setStep(1)
 return
 }

 if (!form.edicao.trim()) {
 setErro('Informe a edição do campeonato.')
 setStep(1)
 return
 }

 if (!logoFile || !bannerFile) {
 setErro('Envie a logo e o banner do campeonato.')
 setStep(1)
 return
 }

 setLoading(true)

 try {
 await validarDimensoesImagem(logoFile, 500, 500, 'A logo')
 await validarDimensoesImagem(bannerFile, 1080, 1440, 'O banner')

 const logo_url = await uploadImagem(logoFile, 'logos')
 const banner_url = await uploadImagem(bannerFile, 'banners')
 const distribuicaoPremiacao = parseDistribuicaoPremiacao()
 const contatosWhatsApp = normalizarContatosWhatsApp(form.whatsapp_contatos)

 const payload = {
 produtora_id: produtoraFinalId,
 nome: form.nome.trim(),
 slug: slugify(form.nome),
 descricao: toNullableText(form.descricao),
 edicao: form.edicao.trim(),
 logo_url,
 banner_url,
 status: 'rascunho',
 jogo: form.jogo || 'Free Fire',

 valor_premiacao: parseMoney(form.valor_premiacao),
 valor_vaga: parseMoney(form.valor_vaga),
 vagas: parseNumber(form.vagas),
 moeda: form.moeda || 'BRL',

 plataforma: toNullableText(form.plataforma),
 abrangencia: toNullableText(form.abrangencia),
 regiao: toNullableText(form.regiao),
 tipo_campeonato: toNullableText(form.tipo_campeonato),
 categoria: toNullableText(form.categoria),
 modo_jogo: toNullableText(form.modo_jogo),
 formato: toNullableText(form.formato),

 quantidade_quedas: toNullableNumber(form.quantidade_quedas),
 quedas_por_rodada: toNullableNumber(form.quedas_por_rodada),
 quantidade_rodadas: toNullableNumber(form.quantidade_rodadas),
 equipes_por_jogo: toNullableNumber(form.equipes_por_jogo),
 sistema_pontos_tipo: toNullableText(form.sistema_pontos_tipo),
 criterio_desempate: toNullableText(form.criterio_desempate),
 mapas: form.mapas,

 data_abertura_inscricoes: toNullableDateTime(form.data_abertura_inscricoes),
 data_encerramento_inscricoes: toNullableDateTime(form.data_encerramento_inscricoes),
 data_inicio: toNullableDateTime(form.data_inicio),
 data_fim: toNullableDateTime(form.data_fim),
 horario_inicio: toNullableTime(form.horario_inicio),
 fuso_horario: toNullableText(form.fuso_horario),
 dias_jogo: form.dias_jogo,

 forma_pagamento: toNullableText(form.forma_pagamento),
 limite_por_organizacao: toNullableNumber(form.limite_por_organizacao),
 substitutos_permitidos: form.substitutos_permitidos,
 checkin_obrigatorio: form.checkin_obrigatorio,
 horario_checkin: toNullableTime(form.horario_checkin),

 jogadores_por_equipe: toNullableNumber(form.jogadores_por_equipe),
 reservas_permitidos: toNullableNumber(form.reservas_permitidos),
 idade_minima: toNullableNumber(form.idade_minima),
 nivel_minimo_conta: toNullableNumber(form.nivel_minimo_conta),
 pro_players_proibidos: form.pro_players_proibidos,
 guildas_restritas: toNullableText(form.guildas_restritas),
 troca_jogadores: toNullableText(form.troca_jogadores),
 penalidade_wo: toNullableText(form.penalidade_wo),

 tipo_premiacao: toNullableText(form.tipo_premiacao),
 premiacao_garantida: form.premiacao_garantida,
 forma_pagamento_premiacao: toNullableText(form.forma_pagamento_premiacao),
 prazo_pagamento_premiacao: toNullableText(form.prazo_pagamento_premiacao),

 transmissao_ao_vivo: form.transmissao_ao_vivo,
 plataforma_transmissao: toNullableText(form.plataforma_transmissao),
 narradores: toNullableText(form.narradores),
 delay_transmissao: toNullableText(form.delay_transmissao),
 replays_disponiveis: form.replays_disponiveis,
 cobertura_redes_sociais: form.cobertura_redes_sociais,

 anti_cheat: form.anti_cheat,
 organizacao_nome: toNullableText(form.organizacao_nome),
 comissao_nome: toNullableText(form.comissao_nome),

 discord_oficial: form.discord_oficial,
 discord_url: toNullableText(form.discord_url),
 canal_oficial_url: toNullableText(form.canal_oficial_url),
 whatsapp_suporte: contatosWhatsApp[0]?.numero || toNullableText(form.whatsapp_suporte),
 whatsapp_contatos: contatosWhatsApp,
 email_suporte: toNullableText(form.email_suporte),
 responsavel_nome: toNullableText(form.responsavel_nome),

 distribuicao_premiacao_json: distribuicaoPremiacao,
 }

 const { data, error } = await supabase
 .from('campeonatos')
 .insert([payload])
 .select('id')
 .single()

 if (error) throw error

 if (onSuccess) {
 onSuccess()
 return
 }

 if (data?.id) {
 router.push(`/campeonatos/${data.id}`)
 return
 }

 router.push('/campeonatos')
 } catch (err: any) {
 console.error('Erro ao criar campeonato:', err)
 setErro(getErrorMessage(err))
 } finally {
 setLoading(false)
 }
 }

 return (
 <div className="w-full px-4 py-6 md:px-6 md:py-8">
 <form
 onSubmit={handleSubmit}
 className="overflow-hidden rounded-[30px] border border-zinc-200 bg-white"
 >
 <div className="border-b border-zinc-200 bg-[radial-gradient(circle_at_top_left,rgba(124,252,0,0.12),transparent_35%),linear-gradient(180deg,#0a0a0b_0%,#050506_100%)] p-5 md:p-6">
 <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
 <div>
 <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#2563eb]">
 Criador de Campeonato
 </p>
 <h2 className="text-2xl font-semibold uppercase tracking-tight text-[#142340] md:text-3xl">
 Cadastro profissional em etapas
 </h2>
 <p className="mt-2 max-w-2xl text-sm font-semibold text-zinc-500">
 Preenchimento rápido com previews fiéis e sem corte no topo e no rodapé.
 </p>
 </div>

 <div className=" border border-[#2563eb]/20 bg-[#2563eb]/10 px-4 py-3">
 <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#2563eb]">
 Padrão dos arquivos
 </p>
 <p className="mt-1 text-sm font-semibold text-[#142340]">Logo: 500x500 px</p>
 <p className="text-sm font-semibold text-[#142340]">Banner: 1080x1440 px</p>
 </div>
 </div>

 <div className="mb-5 h-3 overflow-hidden rounded-full bg-zinc-50">
 <div
 className="h-full rounded-full bg-[#2563eb] transition-all duration-300"
 style={{ width: `${progresso}%` }}
 />
 </div>

 <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
 {ETAPAS.map((item) => {
 const active = step === item.numero
 const done = step > item.numero
 const Icon = item.icon

 return (
 <button
 key={item.numero}
 type="button"
 onClick={() => setStep(item.numero as Etapa)}
 className={` border px-4 py-4 text-left transition-all ${
 active
 ? 'border-[#2563eb] bg-[#2563eb]/10'
 : done
 ? 'border-zinc-200 bg-zinc-50'
 : 'border-zinc-200 bg-white/40'
 }`}
 >
 <div className="mb-2 flex items-center gap-2">
 <Icon size={14} className={active ? 'text-[#2563eb]' : 'text-zinc-500'} />
 <p
 className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${
 active ? 'text-[#2563eb]' : 'text-zinc-500'
 }`}
 >
 Etapa {item.numero}
 </p>
 </div>
 <p className="text-sm font-semibold uppercase text-[#142340]">
 {item.titulo}
 </p>
 </button>
 )
 })}
 </div>
 </div>

 <div className="p-5 md:p-6">
 {erro && (
 <div className="mb-6 flex items-start gap-3 border border-red-500/20 bg-red-500/10 px-4 py-4 text-red-200">
 <AlertCircle className="mt-0.5 shrink-0" size={18} />
 <span className="text-sm font-bold">{erro}</span>
 </div>
 )}

 {step === 1 && (
 <div className="space-y-8">
 <SectionTitle
 title="Informações básicas"
 subtitle="Nome, edição, descrição, valores e artes principais."
 />

 <div className="space-y-5">
 <div>
 <InputLabel>Nome do Campeonato</InputLabel>
 <TextInput
 required
 value={form.nome}
 onChange={(value) => updateField('nome', value)}
 placeholder="Ex: Copa Aloe"
 />
 </div>

 <div>
 <InputLabel>Edição</InputLabel>
 <TextInput
 required
 value={form.edicao}
 onChange={(value) => updateField('edicao', value)}
 placeholder="Ex: 1ª edição ou #12"
 />
 </div>

 <div>
 <InputLabel>Descrição</InputLabel>
 <TextArea
 value={form.descricao}
 onChange={(value) => updateField('descricao', value)}
 placeholder="Resumo rápido do campeonato, estilo da competição e público-alvo."
 rows={5}
 />
 </div>

 <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
 <div>
 <InputLabel>Premiação (R$)</InputLabel>
 <TextInput
 type="number"
 min={0}
 value={form.valor_premiacao}
 onChange={(value) => updateField('valor_premiacao', value)}
 />
 </div>

 <div>
 <InputLabel>Valor da Vaga (R$)</InputLabel>
 <TextInput
 type="number"
 min={0}
 value={form.valor_vaga}
 onChange={(value) => updateField('valor_vaga', value)}
 />
 </div>

 <div>
 <InputLabel>Número de Vagas</InputLabel>
 <TextInput
 type="number"
 min={0}
 value={form.vagas}
 onChange={(value) => updateField('vagas', value)}
 />
 </div>
 </div>

 <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
 <UploadBox
 title="Logo do campeonato"
 subtitle="Preview quadrado 1:1."
 preview={previews.logo}
 ratioClass="aspect-square"
 maxWidthClass="max-w-[190px]"
 icon={<ImageIcon size={24} />}
 onSelect={(file) => {
 setLogoFile(file)
 setPreviews((prev) => ({
 ...prev,
 logo: URL.createObjectURL(file),
 }))
 }}
 />

 <UploadBox
 title="Banner do campeonato"
 subtitle="Preview vertical 3:4."
 preview={previews.banner}
 ratioClass="aspect-[3/4]"
 maxWidthClass="max-w-[190px]"
 icon={<Trophy size={24} />}
 onSelect={(file) => {
 setBannerFile(file)
 setPreviews((prev) => ({
 ...prev,
 banner: URL.createObjectURL(file),
 }))
 }}
 />
 </div>
 </div>
 </div>
 )}

 {step === 2 && (
 <div className="space-y-8">
 <SectionTitle
 title="Tipo do campeonato"
 subtitle="Esses dados alimentam filtros e organização da listagem."
 />

 <div>
 <InputLabel>Plataforma</InputLabel>
 <OptionGrid
 options={OPCOES_PLATAFORMA}
 value={form.plataforma}
 onChange={(value) => updateField('plataforma', value)}
 />
 </div>

 <div>
 <InputLabel>Abrangência</InputLabel>
 <OptionGrid
 options={OPCOES_ABRANGENCIA}
 value={form.abrangencia}
 onChange={(value) => updateField('abrangencia', value)}
 />
 </div>

 <div>
 <InputLabel>Região</InputLabel>
 <OptionGrid
 options={OPCOES_REGIAO}
 value={form.regiao}
 onChange={(value) => updateField('regiao', value)}
 cols="grid-cols-1 md:grid-cols-2 xl:grid-cols-3"
 />
 </div>

 <div>
 <InputLabel>Tipo de Campeonato</InputLabel>
 <OptionGrid
 options={OPCOES_TIPO_CAMPEONATO}
 value={form.tipo_campeonato}
 onChange={(value) => updateField('tipo_campeonato', value)}
 />
 </div>

 <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
 <div>
 <InputLabel>Categoria</InputLabel>
 <OptionGrid
 options={OPCOES_CATEGORIA}
 value={form.categoria}
 onChange={(value) => updateField('categoria', value)}
 cols="grid-cols-3"
 />
 </div>

 <div>
 <InputLabel>Modo de Jogo</InputLabel>
 <OptionGrid
 options={OPCOES_MODO_JOGO}
 value={form.modo_jogo}
 onChange={(value) => updateField('modo_jogo', value)}
 />
 </div>
 </div>

 <div>
 <InputLabel>Formato</InputLabel>
 <OptionGrid
 options={OPCOES_FORMATO}
 value={form.formato}
 onChange={(value) => updateField('formato', value)}
 />
 </div>
 </div>
 )}

 {step === 3 && (
 <div className="space-y-8">
 <SectionTitle
 title="Estrutura competitiva"
 subtitle="Rodadas, quedas, sistema de pontos e mapas."
 />

 <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
 <div>
 <InputLabel>Quedas por Rodada</InputLabel>
 <TextInput
 type="number"
 min={1}
 value={form.quedas_por_rodada}
 onChange={(value) => updateField('quedas_por_rodada', value)}
 />
 </div>

 <div>
 <InputLabel>Quantidade de Rodadas</InputLabel>
 <TextInput
 type="number"
 min={1}
 value={form.quantidade_rodadas}
 onChange={(value) => updateField('quantidade_rodadas', value)}
 />
 </div>

 <div>
 <InputLabel>Equipes por Jogo</InputLabel>
 <TextInput
 type="number"
 min={1}
 value={form.equipes_por_jogo}
 onChange={(value) => updateField('equipes_por_jogo', value)}
 />
 </div>

 <div>
 <InputLabel>Quantidade de Quedas</InputLabel>
 <TextInput
 type="number"
 min={1}
 value={form.quantidade_quedas}
 onChange={(value) => updateField('quantidade_quedas', value)}
 />
 </div>
 </div>

 <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
 <div>
 <InputLabel>Sistema de Pontos</InputLabel>
 <TextInput
 value={form.sistema_pontos_tipo}
 onChange={(value) => updateField('sistema_pontos_tipo', value)}
 placeholder="Ex: Pontos por colocação + pontos por abate"
 />
 </div>

 <div>
 <InputLabel>Critério de Desempate</InputLabel>
 <TextInput
 value={form.criterio_desempate}
 onChange={(value) => updateField('criterio_desempate', value)}
 placeholder="Ex: Booyahs, depois abates"
 />
 </div>
 </div>

 <div>
 <InputLabel>Mapas</InputLabel>
 <MultiSelectGrid
 options={OPCOES_MAPAS}
 values={form.mapas}
 onToggle={(value) => toggleInArray('mapas', value)}
 />
 </div>
 </div>
 )}

 {step === 4 && (
 <div className="space-y-8">
 <SectionTitle
 title="Datas e agenda"
 subtitle="Inscrição, início, término e dias oficiais de jogo."
 />

 <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
 <div>
 <InputLabel>Abertura das Inscrições</InputLabel>
 <TextInput
 type="datetime-local"
 value={form.data_abertura_inscricoes}
 onChange={(value) => updateField('data_abertura_inscricoes', value)}
 />
 </div>

 <div>
 <InputLabel>Encerramento das Inscrições</InputLabel>
 <TextInput
 type="datetime-local"
 value={form.data_encerramento_inscricoes}
 onChange={(value) => updateField('data_encerramento_inscricoes', value)}
 />
 </div>

 <div>
 <InputLabel>Início do Campeonato</InputLabel>
 <TextInput
 type="datetime-local"
 value={form.data_inicio}
 onChange={(value) => updateField('data_inicio', value)}
 />
 </div>

 <div>
 <InputLabel>Término do Campeonato</InputLabel>
 <TextInput
 type="datetime-local"
 value={form.data_fim}
 onChange={(value) => updateField('data_fim', value)}
 />
 </div>
 </div>

 <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
 <div>
 <InputLabel>Horário de Início</InputLabel>
 <TextInput
 type="time"
 value={form.horario_inicio}
 onChange={(value) => updateField('horario_inicio', value)}
 />
 </div>

 <div>
 <InputLabel>Horário do Check-in</InputLabel>
 <TextInput
 type="time"
 value={form.horario_checkin}
 onChange={(value) => updateField('horario_checkin', value)}
 />
 </div>

 <div>
 <InputLabel>Fuso Horário</InputLabel>
 <TextInput
 value={form.fuso_horario}
 onChange={(value) => updateField('fuso_horario', value)}
 placeholder="Ex: America/Belem"
 />
 </div>
 </div>

 <div>
 <InputLabel>Dias de Jogo</InputLabel>
 <MultiSelectGrid
 options={OPCOES_DIAS}
 values={form.dias_jogo}
 onToggle={(value) => toggleInArray('dias_jogo', value)}
 />
 </div>
 </div>
 )}

 {step === 5 && (
 <div className="space-y-8">
 <SectionTitle
 title="Regras, premiação e mídia"
 subtitle="Pagamentos, restrições, transmissão e canais de suporte."
 />

 <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
 <div className="space-y-5 rounded-[28px] border border-zinc-200 bg-zinc-500 p-5">
 <div className="flex items-center gap-3">
 <Shield className="text-[#2563eb]" size={18} />
 <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[#142340]">
 Inscrição e regras
 </h3>
 </div>

 <div>
 <InputLabel>Forma de Pagamento</InputLabel>
 <OptionGrid
 options={OPCOES_FORMA_PAGAMENTO}
 value={form.forma_pagamento}
 onChange={(value) => updateField('forma_pagamento', value)}
 cols="grid-cols-2"
 />
 </div>

 <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
 <div>
 <InputLabel>Limite por Organização</InputLabel>
 <TextInput
 type="number"
 min={0}
 value={form.limite_por_organizacao}
 onChange={(value) => updateField('limite_por_organizacao', value)}
 />
 </div>

 <div>
 <InputLabel>Jogadores por Equipe</InputLabel>
 <TextInput
 type="number"
 min={1}
 value={form.jogadores_por_equipe}
 onChange={(value) => updateField('jogadores_por_equipe', value)}
 />
 </div>

 <div>
 <InputLabel>Reservas Permitidos</InputLabel>
 <TextInput
 type="number"
 min={0}
 value={form.reservas_permitidos}
 onChange={(value) => updateField('reservas_permitidos', value)}
 />
 </div>

 <div>
 <InputLabel>Idade Mínima</InputLabel>
 <TextInput
 type="number"
 min={0}
 value={form.idade_minima}
 onChange={(value) => updateField('idade_minima', value)}
 />
 </div>

 <div>
 <InputLabel>Nível Mínimo da Conta</InputLabel>
 <TextInput
 type="number"
 min={0}
 value={form.nivel_minimo_conta}
 onChange={(value) => updateField('nivel_minimo_conta', value)}
 />
 </div>
 </div>

 <div>
 <InputLabel>Troca de Jogadores</InputLabel>
 <OptionGrid
 options={OPCOES_TROCA_JOGADORES}
 value={form.troca_jogadores}
 onChange={(value) => updateField('troca_jogadores', value)}
 cols="grid-cols-2"
 />
 </div>

 <TextArea
 value={form.guildas_restritas}
 onChange={(value) => updateField('guildas_restritas', value)}
 placeholder="Guildas restritas, exceções ou observações."
 rows={3}
 />

 <TextArea
 value={form.penalidade_wo}
 onChange={(value) => updateField('penalidade_wo', value)}
 placeholder="Penalidades por W.O."
 rows={3}
 />

 <div className="grid grid-cols-1 gap-3">
 <SwitchRow
 label="Substitutos permitidos"
 value={form.substitutos_permitidos}
 onChange={(value) => updateField('substitutos_permitidos', value)}
 />

 <SwitchRow
 label="Check-in obrigatório"
 value={form.checkin_obrigatorio}
 onChange={(value) => updateField('checkin_obrigatorio', value)}
 />

 <SwitchRow
 label="Pro players proibidos"
 value={form.pro_players_proibidos}
 onChange={(value) => updateField('pro_players_proibidos', value)}
 />

 <SwitchRow
 label="Anti-cheat"
 value={form.anti_cheat}
 onChange={(value) => updateField('anti_cheat', value)}
 />
 </div>
 </div>

 <div className="space-y-5 rounded-[28px] border border-zinc-200 bg-zinc-500 p-5">
 <div className="flex items-center gap-3">
 <Trophy className="text-[#2563eb]" size={18} />
 <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[#142340]">
 Premiação, mídia e suporte
 </h3>
 </div>

 <div>
 <InputLabel>Tipo de Premiação</InputLabel>
 <OptionGrid
 options={OPCOES_TIPO_PREMIACAO}
 value={form.tipo_premiacao}
 onChange={(value) => updateField('tipo_premiacao', value)}
 />
 </div>

 <div className="grid grid-cols-1 gap-3">
 <SwitchRow
 label="Premiação garantida"
 value={form.premiacao_garantida}
 onChange={(value) => updateField('premiacao_garantida', value)}
 />

 <SwitchRow
 label="Transmissão ao vivo"
 value={form.transmissao_ao_vivo}
 onChange={(value) => updateField('transmissao_ao_vivo', value)}
 />

 <SwitchRow
 label="Replays disponíveis"
 value={form.replays_disponiveis}
 onChange={(value) => updateField('replays_disponiveis', value)}
 />

 <SwitchRow
 label="Cobertura em redes sociais"
 value={form.cobertura_redes_sociais}
 onChange={(value) => updateField('cobertura_redes_sociais', value)}
 />

 <SwitchRow
 label="Discord oficial"
 value={form.discord_oficial}
 onChange={(value) => updateField('discord_oficial', value)}
 />
 </div>

 <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
 <div>
 <InputLabel>Forma de Pagamento da Premiação</InputLabel>
 <TextInput
 value={form.forma_pagamento_premiacao}
 onChange={(value) =>
 updateField('forma_pagamento_premiacao', value)
 }
 placeholder="Ex: PIX"
 />
 </div>

 <div>
 <InputLabel>Prazo de Pagamento</InputLabel>
 <TextInput
 value={form.prazo_pagamento_premiacao}
 onChange={(value) =>
 updateField('prazo_pagamento_premiacao', value)
 }
 placeholder="Ex: até 7 dias úteis"
 />
 </div>

 <div>
 <InputLabel>Plataforma de Transmissão</InputLabel>
 <OptionGrid
 options={OPCOES_PLATAFORMA_TRANSMISSAO}
 value={form.plataforma_transmissao}
 onChange={(value) => updateField('plataforma_transmissao', value)}
 cols="grid-cols-1"
 />
 </div>

 <div>
 <InputLabel>Delay da Transmissão</InputLabel>
 <TextInput
 value={form.delay_transmissao}
 onChange={(value) => updateField('delay_transmissao', value)}
 placeholder="Ex: 5 minutos"
 />
 </div>
 </div>

 <div className="grid grid-cols-1 gap-4">
 <TextInput
 value={form.narradores}
 onChange={(value) => updateField('narradores', value)}
 placeholder="Narradores / casters"
 />

 <TextInput
 value={form.organizacao_nome}
 onChange={(value) => updateField('organizacao_nome', value)}
 placeholder="Nome da organização"
 />

 <TextInput
 value={form.comissao_nome}
 onChange={(value) => updateField('comissao_nome', value)}
 placeholder="Comissão / arbitragem"
 />

 <TextInput
 value={form.discord_url}
 onChange={(value) => updateField('discord_url', value)}
 placeholder="Link do Discord"
 />

 <TextInput
 value={form.canal_oficial_url}
 onChange={(value) => updateField('canal_oficial_url', value)}
 placeholder="Canal oficial"
 />

 <div className="border border-zinc-200 bg-zinc-50 p-3">
 <div className="mb-2 flex items-center justify-between gap-2">
 <InputLabel>Contatos WhatsApp para venda de vagas</InputLabel>
 {form.whatsapp_contatos.length < 3 ? (
 <button
 type="button"
 onClick={() =>
 updateField('whatsapp_contatos', [
 ...form.whatsapp_contatos,
 { nome: '', numero: '' },
 ])
 }
 className="h-8 border border-zinc-300 bg-white px-3 text-[10px] font-black uppercase text-zinc-700"
 >
 + Contato
 </button>
 ) : null}
 </div>

 <div className="space-y-2">
 {form.whatsapp_contatos.map((contato, index) => (
 <div key={index} className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
 <TextInput
 value={contato.nome}
 onChange={(value) => {
 const proximos = [...form.whatsapp_contatos]
 proximos[index] = { ...proximos[index], nome: value }
 updateField('whatsapp_contatos', proximos)
 }}
 placeholder={`Nome do vendedor ${index + 1}`}
 />
 <TextInput
 value={contato.numero}
 onChange={(value) => {
 const proximos = [...form.whatsapp_contatos]
 proximos[index] = { ...proximos[index], numero: value }
 updateField('whatsapp_contatos', proximos)
 if (index === 0) updateField('whatsapp_suporte', value)
 }}
 placeholder="5591999999999"
 />
 <button
 type="button"
 onClick={() => {
 const proximos = form.whatsapp_contatos.filter((_, i) => i !== index)
 updateField('whatsapp_contatos', proximos.length ? proximos : [{ nome: '', numero: '' }])
 }}
 className="h-10 border border-red-200 bg-white px-3 text-[10px] font-black uppercase text-red-600"
 >
 Remover
 </button>
 </div>
 ))}
 </div>
 </div>

 <TextInput
 value={form.email_suporte}
 onChange={(value) => updateField('email_suporte', value)}
 placeholder="E-mail de suporte"
 />

 <TextInput
 value={form.responsavel_nome}
 onChange={(value) => updateField('responsavel_nome', value)}
 placeholder="Responsável pelo campeonato"
 />
 </div>

 <div>
 <InputLabel>Distribuição da Premiação (JSON opcional)</InputLabel>
 <TextArea
 value={form.distribuicao_premiacao_json}
 onChange={(value) => updateField('distribuicao_premiacao_json', value)}
 placeholder='Ex: [{"posicao":"1º lugar","valor":1000},{"posicao":"MVP","valor":200}]'
 rows={5}
 />
 </div>
 </div>
 </div>
 </div>
 )}

 <div className="mt-10 flex flex-col gap-3 border-t border-zinc-200 pt-6 md:flex-row md:items-center md:justify-between">
 <button
 type="button"
 onClick={voltarEtapa}
 disabled={step === 1 || loading}
 className="inline-flex items-center justify-center gap-2 border border-zinc-200 bg-white px-5 py-3.5 text-sm font-semibold uppercase tracking-wide text-[#142340] transition-all hover:border-[#2563eb] disabled:cursor-not-allowed disabled:opacity-40"
 >
 <ArrowLeft size={16} />
 Voltar
 </button>

 <div className="text-center">
 <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
 Etapa atual
 </p>
 <p className="mt-1 text-sm font-semibold uppercase text-[#142340]">
 {ETAPAS.find((item) => item.numero === step)?.titulo}
 </p>
 </div>

 {step < 5 ? (
 <button
 type="button"
 onClick={irParaProximaEtapa}
 disabled={loading}
 className="inline-flex items-center justify-center gap-2 bg-[#2563eb] px-6 py-3.5 text-sm font-semibold uppercase tracking-wide text-[#142340] transition-all hover:bg-white disabled:opacity-60"
 >
 Próxima etapa
 <ArrowRight size={16} />
 </button>
 ) : (
 <button
 type="submit"
 disabled={loading}
 className="inline-flex items-center justify-center gap-2 bg-[#2563eb] px-6 py-3.5 text-sm font-semibold uppercase tracking-wide text-[#142340] transition-all hover:bg-white disabled:opacity-60"
 >
 {loading ? (
 <>
 <Loader2 className="animate-spin" size={16} />
 Criando campeonato...
 </>
 ) : (
 <>
 <Check size={16} />
 Criar campeonato
 </>
 )}
 </button>
 )}
 </div>
 </div>
 </form>
 </div>
 )
}
