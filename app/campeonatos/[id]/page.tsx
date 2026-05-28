'use client'

import { useEffect, useState, useCallback, useMemo, type ReactNode } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getTipoVisual } from '@/lib/getTipoVisual'
import {
  ChevronLeft,
  Loader2,
  Pencil,
  Youtube,
  Settings,
  FileText,
  List,
  Target,
  Trophy,
  Move,
  X,
  LayoutGrid,
  Users,
  Unlock,
  ShieldAlert,
  BadgeCheck,
  MessageSquareWarning,
  Clock3,
  Star,
  LockKeyhole,
  CheckCircle2,
  CircleDollarSign,
  PlusCircle,
  WalletCards,
  QrCode,
  MessageCircle,
  ExternalLink,
} from 'lucide-react'
import Draggable from 'react-draggable'

import { TableThemeProvider } from '@/app/contexts/TableThemeContext'

import AvaliacaoCampeonato from '@/app/components/AvaliacaoCampeonato'
import SocialActions from '@/app/components/SocialActions'
import RankingTierBadge from '@/app/components/RankingTierBadge'
import AbaJogadores from './components/AbaJogadores'
import GerenciarEquipes from './components/GerenciarEquipes'
import GerenciarGrupos from './components/GerenciarGrupos'
import GerenciarJogos from './components/GerenciarJogos'
import RegrasCampeonato from './components/RegrasCampeonato'
import GerenciarWatchParty from './components/GerenciarWatchParty'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const rotasListaPorSlug: Record<string, string> = {
  diario: '/campeonatos/diarios',
  diarios: '/campeonatos/diarios',
  copa: '/campeonatos/copas',
  copas: '/campeonatos/copas',
  liga: '/campeonatos/ligas',
  ligas: '/campeonatos/ligas',
  xtreino: '/campeonatos/xtreinos',
  xtreinos: '/campeonatos/xtreinos',
}

import TableEditor from './components/TableEditor'
import PointsTable from './components/PointsTable'
import MVPTable from './components/MVPTable'
import SumulaPartida from './components/SumulaPartida'

type AbaTipo =
  | 'informacoes'
  | 'reputacao'
  | 'denuncias'
  | 'equipes'
  | 'jogadores'
  | 'grupos'
  | 'jogos'
  | 'tabela'
  | 'watchparty'
  | 'regras'
  | 'configuracoes'

type SubAbaTabela = 'classificacao' | 'mvp' | 'sumula' | 'config'

type EquipeRelacionada = {
  id: string
  nome: string
  logo_url: string | null
  tag: string | null
}

type CampeonatoEquipeRow = {
  id: string
  equipe_id: string
  status: string | null
  seed?: number | null
  grupo_id?: string | null
  equipes: EquipeRelacionada | EquipeRelacionada[] | null
}

type ResultadoEquipeRow = {
  equipe_id: string
  colocacao: number | null
  abates: number | null
  pontos_colocacao: number | null
  pontos_abates: number | null
  pontos_total: number | null
}

type ResultadoMvpRow = {
  jogador_campeonato_id: string | null
  perfil_jogo_id: string | null
  equipe_id: string | null
  equipe_avulsa_id: string | null
  nick_snapshot: string | null
  uid_jogo_snapshot: string | null
  abates: number | null
  partida_id: string | null
}

type AvaliacaoResumo = {
  media: number
  total: number
}

type DenunciaMetrica = {
  campeonato_id: string
  total_denuncias: number | null
  denuncias_abertas: number | null
  denuncias_resolvidas: number | null
  denuncias_recusadas: number | null
  media_horas_primeira_resposta: number | null
  media_horas_resolucao: number | null
  taxa_resposta_percentual: number | null
  taxa_resolucao_percentual: number | null
}

type DenunciaResumo = {
  id: string
  campeonato_id: string
  denunciante_user_id: string | null
  tipo_alvo: string | null
  equipe_id: string | null
  jogador_id: string | null
  categoria: string | null
  titulo: string | null
  descricao: string | null
  status: string | null
  prioridade: string | null
  publica: boolean | null
  anonima_para_publico: boolean | null
  atribuida_user_id: string | null
  resolvida_por_user_id: string | null
  primeira_resposta_em: string | null
  resolvida_em: string | null
  arquivada_em: string | null
  created_at: string | null
  updated_at: string | null
  horas_ate_primeira_resposta: number | null
  horas_ate_resolucao: number | null
  total_provas: number | null
  total_respostas_publicas: number | null
}

type CompraEquipeOption = {
  id: string
  nome: string
  tag: string | null
  logo_url: string | null
}

type WhatsContato = {
  nome: string
  numero: string
}

type PaisWhatsApp = {
  nome: string
  codigo: string
  bandeira: string
}

type WhatsContatoForm = {
  nome: string
  codigoPais: string
  numero: string
}

type ComprovanteCompra = {
  campeonato: string
  equipe: string
  valor: number
  data: string
  referenciaId: string | null
}


const STATUS_CAMPEONATO_OPTIONS = [
  { value: 'rascunho', label: 'Rascunho', classes: 'border-zinc-200 bg-zinc-50 text-zinc-700' },
  { value: 'inscricoes', label: 'Inscrições', classes: 'border-blue-200 bg-blue-50 text-blue-700' },
  { value: 'em_andamento', label: 'Em andamento', classes: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  { value: 'finalizado', label: 'Finalizado', classes: 'border-red-200 bg-red-50 text-red-700' },
  { value: 'cancelado', label: 'Cancelado', classes: 'border-zinc-200 bg-zinc-50 text-zinc-700' },
]

const PAISES_WHATSAPP: PaisWhatsApp[] = [
  { nome: 'Brasil', codigo: '55', bandeira: '🇧🇷' },
  { nome: 'Estados Unidos', codigo: '1', bandeira: '🇺🇸' },
  { nome: 'Portugal', codigo: '351', bandeira: '🇵🇹' },
  { nome: 'Angola', codigo: '244', bandeira: '🇦🇴' },
  { nome: 'Mocambique', codigo: '258', bandeira: '🇲🇿' },
  { nome: 'Argentina', codigo: '54', bandeira: '🇦🇷' },
  { nome: 'Paraguai', codigo: '595', bandeira: '🇵🇾' },
  { nome: 'Uruguai', codigo: '598', bandeira: '🇺🇾' },
  { nome: 'Chile', codigo: '56', bandeira: '🇨🇱' },
  { nome: 'Colombia', codigo: '57', bandeira: '🇨🇴' },
  { nome: 'Mexico', codigo: '52', bandeira: '🇲🇽' },
]

function normalizarStatusCampeonato(status?: string | null) {
  const value = String(status || 'rascunho').trim().toLowerCase()
  return STATUS_CAMPEONATO_OPTIONS.find((item) => item.value === value) || STATUS_CAMPEONATO_OPTIONS[0]
}

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

function paisWhatsAppPorCodigo(codigo?: string) {
  return PAISES_WHATSAPP.find((pais) => pais.codigo === codigo) || PAISES_WHATSAPP[0]
}

function separarNumeroWhatsApp(numero: string): WhatsContatoForm {
  const limpo = limparNumeroWhatsApp(numero)
  const pais = [...PAISES_WHATSAPP]
    .sort((a, b) => b.codigo.length - a.codigo.length)
    .find((item) => limpo.startsWith(item.codigo))

  if (!pais) {
    return { nome: '', codigoPais: PAISES_WHATSAPP[0].codigo, numero: limpo }
  }

  return {
    nome: '',
    codigoPais: pais.codigo,
    numero: limpo.slice(pais.codigo.length),
  }
}

function contatoParaForm(contato: WhatsContato): WhatsContatoForm {
  const separado = separarNumeroWhatsApp(contato.numero)
  return {
    nome: contato.nome || '',
    codigoPais: separado.codigoPais,
    numero: separado.numero,
  }
}

function contatoFormParaContato(contato: WhatsContatoForm): WhatsContato {
  const codigoPais = paisWhatsAppPorCodigo(contato.codigoPais).codigo
  return {
    nome: contato.nome,
    numero: `${codigoPais}${limparNumeroWhatsApp(contato.numero)}`,
  }
}

function contatosWhatsAppIniciais(camp?: Record<string, unknown> | null): WhatsContato[] {
  const lista = Array.isArray(camp?.whatsapp_contatos) ? camp.whatsapp_contatos : []
  const normalizados = normalizarContatosWhatsApp(lista as WhatsContato[])
  if (normalizados.length) return normalizados

  const numeroLegado = limparNumeroWhatsApp(String(camp?.whatsapp_suporte || camp?.whatsapp_contato || ''))
  if (numeroLegado) return [{ nome: 'Vendas', numero: numeroLegado }]

  return [{ nome: '', numero: '' }]
}

function normalizarEquipeRelacionada(
  equipe: EquipeRelacionada | EquipeRelacionada[] | null
): EquipeRelacionada | null {
  if (!equipe) return null
  if (Array.isArray(equipe)) return equipe[0] || null
  return equipe
}

function formatarNumero(valor: any) {
  const numero = Number(valor)
  return Number.isFinite(numero) ? numero : 0
}

function textoSeguro(valor: any, fallback = '') {
  const texto = String(valor || '').trim()
  return texto || fallback
}

function formatarDataBanner(valor?: string | null) {
  if (!valor) return '---'
  const data = new Date(valor)
  if (Number.isNaN(data.getTime())) return '---'
  return data.toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

function formatarDataCurta(valor?: string | null) {
  if (!valor) return '---'
  const data = new Date(valor)
  if (Number.isNaN(data.getTime())) return '---'
  return data.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function formatarHoraCurta(valor?: string | null) {
  if (!valor) return '---'
  const data = new Date(valor)
  if (Number.isNaN(data.getTime())) return '---'
  return data.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatarMoeda(valor: any) {
  const numero = Number(valor || 0)
  return numero.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

function formatarDecimal(valor: number | null | undefined, casas = 1) {
  const numero = Number(valor)
  if (!Number.isFinite(numero)) return '0'
  return numero.toLocaleString('pt-BR', {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  })
}

function normalizarStatusDenuncia(status?: string | null) {
  const base = textoSeguro(status).toLowerCase()

  switch (base) {
    case 'aberta':
      return {
        label: 'Aberta',
        classes: 'bg-red-100 text-red-700 border-red-300',
      }
    case 'em_analise':
      return {
        label: 'Em análise',
        classes: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      }
    case 'aguardando_resposta_usuario':
      return {
        label: 'Aguardando usuário',
        classes: 'bg-orange-100 text-orange-800 border-orange-300',
      }
    case 'aguardando_resposta_organizacao':
      return {
        label: 'Aguardando organização',
        classes: 'bg-blue-100 text-blue-800 border-blue-300',
      }
    case 'resolvida':
      return {
        label: 'Resolvida',
        classes: 'bg-lime-100 text-lime-800 border-lime-300',
      }
    case 'recusada':
      return {
        label: 'Recusada',
        classes: 'bg-zinc-200 text-zinc-700 border-zinc-300',
      }
    case 'arquivada':
      return {
        label: 'Arquivada',
        classes: 'bg-zinc-100 text-zinc-600 border-zinc-300',
      }
    default:
      return {
        label: status || '---',
        classes: 'bg-zinc-100 text-zinc-700 border-zinc-300',
      }
  }
}

function normalizarPrioridadeDenuncia(prioridade?: string | null) {
  const base = textoSeguro(prioridade).toLowerCase()

  switch (base) {
    case 'critica':
      return {
        label: 'Crítica',
        classes: 'bg-red-600 text-white border-red-700',
      }
    case 'alta':
      return {
        label: 'Alta',
        classes: 'bg-orange-500 text-white border-orange-600',
      }
    case 'media':
      return {
        label: 'Média',
        classes: 'bg-yellow-300 text-black border-yellow-400',
      }
    case 'baixa':
      return {
        label: 'Baixa',
        classes: 'bg-zinc-200 text-zinc-800 border-zinc-300',
      }
    default:
      return {
        label: prioridade || '---',
        classes: 'bg-zinc-100 text-zinc-700 border-zinc-300',
      }
  }
}

function calcularScoreReputacao(args: {
  mediaAvaliacoes: number
  totalAvaliacoes: number
  denunciasAbertas: number
  totalDenuncias: number
  taxaResposta: number
  taxaResolucao: number
}) {
  const notaNormalizada = Math.max(0, Math.min(100, (args.mediaAvaliacoes / 5) * 100))

  const bonusVolumeAvaliacao =
    args.totalAvaliacoes >= 50
      ? 100
      : args.totalAvaliacoes >= 25
        ? 92
        : args.totalAvaliacoes >= 10
          ? 84
          : args.totalAvaliacoes >= 5
            ? 76
            : args.totalAvaliacoes > 0
              ? 68
              : 55

  const penalidadeAbertas = Math.min(40, args.denunciasAbertas * 8)
  const baseDenuncias = Math.max(
    0,
    Math.min(100, 100 - penalidadeAbertas + args.taxaResolucao * 0.2 - args.totalDenuncias * 1.25)
  )

  const scoreAvaliacoes = notaNormalizada * 0.55
  const scoreVolume = bonusVolumeAvaliacao * 0.1
  const scoreDenuncias = baseDenuncias * 0.2
  const scoreResposta = args.taxaResposta * 0.075
  const scoreResolucao = args.taxaResolucao * 0.075

  const final = Math.max(
    0,
    Math.min(100, scoreAvaliacoes + scoreVolume + scoreDenuncias + scoreResposta + scoreResolucao)
  )

  return Math.round(final * 10) / 10
}

function obterSeloReputacao(score: number) {
  if (score >= 90) {
    return {
      nome: 'Elite',
      descricao: 'Operação muito acima do padrão',
      classes: 'bg-lime-300 text-black border-lime-500',
    }
  }

  if (score >= 80) {
    return {
      nome: 'Excelente',
      descricao: 'Alta confiança e boa resposta',
      classes: 'bg-emerald-200 text-emerald-900 border-emerald-400',
    }
  }

  if (score >= 70) {
    return {
      nome: 'Boa',
      descricao: 'Boa reputação geral',
      classes: 'bg-blue-200 text-blue-900 border-blue-400',
    }
  }

  if (score >= 55) {
    return {
      nome: 'Regular',
      descricao: 'Precisa evoluir em consistência',
      classes: 'bg-yellow-200 text-yellow-900 border-yellow-400',
    }
  }

  return {
    nome: 'Em atenção',
    descricao: 'Necessita melhorar transparência e resposta',
    classes: 'bg-red-200 text-red-900 border-red-400',
  }
}

function HeaderStat({ label, value }: { label: string; value: any }) {
  return (
    <div className="border-l border-white/15 pl-4">
      <div className="text-[10px] font-black uppercase tracking-[0.24em] text-white/60">{label}</div>
      <div className="mt-1 truncate text-xl font-semibold text-white">{value || '---'}</div>
    </div>
  )
}

function LealtMiniInfo({ label, value }: { label: string; value: any }) {
  return (
    <div className="border border-zinc-200 bg-zinc-50 px-3 py-2">
      <div className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">{label}</div>
      <div className="mt-1 truncate text-xs font-bold text-[#142340]">{value || '---'}</div>
    </div>
  )
}

export default function CampeonatoDetalhePage({ tipoForcado }: { tipoForcado?: string } = {}) {
  const params = useParams()
  const id = String(params?.id || '')
  const router = useRouter()
  const idEhUuid = UUID_REGEX.test(id)

  const [camp, setCamp] = useState<any>(null)
  const [rankingCampeonato, setRankingCampeonato] = useState<any | null>(null)
  const [vagasPreenchidas, setVagasPreenchidas] = useState(0)
  const [loading, setLoading] = useState(true)
  const [abaAtiva, setAbaAtiva] = useState<AbaTipo>('informacoes')
  const [subAbaTabela, setSubAbaTabela] = useState<SubAbaTabela>('classificacao')
  const [showFloatingEditor, setShowFloatingEditor] = useState(false)

  const [equipesParticipantes, setEquipesParticipantes] = useState<any[]>([])
  const [rankingMvp, setRankingMvp] = useState<any[]>([])
  const [xtreinoConfig, setXtreinoConfig] = useState<any>(null)

  const tipoCompeticaoAtual = String(tipoForcado || camp?.tipo_competicao || camp?.modelo_competicao || camp?.tipo || '').toLowerCase()
  const tipoVisual = getTipoVisual(tipoCompeticaoAtual)
  const lealtHeaderGradient =
    tipoVisual.key === 'xtreino'
      ? 'border-l-emerald-500 bg-gradient-to-r from-emerald-700 via-emerald-600 to-emerald-900'
      : tipoVisual.key === 'copa'
        ? 'border-l-violet-500 bg-gradient-to-r from-violet-700 via-violet-600 to-violet-900'
        : tipoVisual.key === 'liga'
          ? 'border-l-amber-500 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-800'
          : tipoVisual.key === 'confronto'
            ? 'border-l-red-500 bg-gradient-to-r from-red-700 via-red-600 to-red-900'
            : 'border-l-sky-500 bg-gradient-to-r from-sky-700 via-blue-700 to-sky-900'
  const isXtreino = tipoCompeticaoAtual === 'xtreino'
  const xtreinoModo = String(xtreinoConfig?.modo_xtreino || '').toLowerCase()

  const isCopa = tipoCompeticaoAtual === 'copa'
  const isLiga = tipoCompeticaoAtual === 'liga'
  const isXtreinoMataMata = isXtreino && xtreinoModo === 'mata_mata'
  const isXtreinoPontosCorridos = isXtreino && xtreinoModo === 'pontos_corridos'
  const usaAbasCopa = isCopa || isXtreinoMataMata
  const usaAbasLiga = isLiga || isXtreinoPontosCorridos

  const [avaliacaoResumo, setAvaliacaoResumo] = useState<AvaliacaoResumo>({
    media: 0,
    total: 0,
  })

  const [denunciaMetricas, setDenunciaMetricas] = useState<DenunciaMetrica | null>(null)
  const [denunciasPublicas, setDenunciasPublicas] = useState<DenunciaResumo[]>([])
  const [loadingPainelTransparencia, setLoadingPainelTransparencia] = useState(false)

  const [usuarioAtual, setUsuarioAtual] = useState<any>(null)
  const [podeGerenciarCampeonato, setPodeGerenciarCampeonato] = useState(false)
  const [saldoCarteira, setSaldoCarteira] = useState<number>(0)
  const [minhasEquipesCompra, setMinhasEquipesCompra] = useState<CompraEquipeOption[]>([])
  const [minhasEquipesCriadasCompra, setMinhasEquipesCriadasCompra] = useState(0)
  const [equipeCompraId, setEquipeCompraId] = useState('')
  const [comprandoVaga, setComprandoVaga] = useState(false)
  const [mensagemCompraVaga, setMensagemCompraVaga] = useState('')
  const [modalConfirmacaoCompraAberto, setModalConfirmacaoCompraAberto] = useState(false)
  const [senhaCompra, setSenhaCompra] = useState('')
  const [comprovanteCompra, setComprovanteCompra] = useState<ComprovanteCompra | null>(null)

  const logErroSupabase = (titulo: string, err: any) => {
    console.error(titulo, err)
    console.error(`${titulo} | message:`, err?.message)
    console.error(`${titulo} | details:`, err?.details)
    console.error(`${titulo} | hint:`, err?.hint)
    console.error(`${titulo} | code:`, err?.code)

    try {
      console.error(`${titulo} | json:`, JSON.stringify(err, null, 2))
    } catch {
      console.error(`${titulo} | json: não foi possível serializar`)
    }
  }

  const mensagemErroSupabase = (err: any) => {
    const partes = [err?.message, err?.details, err?.hint, err?.code]
      .map((item) => String(item || '').trim())
      .filter(Boolean)

    if (partes.some((item) => item.includes('whatsapp_contatos') || item.includes('PGRST204'))) {
      return 'Erro ao salvar contatos. A coluna whatsapp_contatos ainda nao existe no banco de producao. Rode a migration do Supabase e tente novamente.'
    }

    return partes[0] || 'Erro ao salvar alteração.'
  }

  useEffect(() => {
    if (!id || idEhUuid) return

    const rotaDestino = rotasListaPorSlug[id.toLowerCase()] || '/campeonatos'
    router.replace(rotaDestino)
  }, [id, idEhUuid, router])

  const valorVagaCompra = Math.max(
    0,
    Number(camp?.valor_vaga ?? camp?.valor_criacao ?? 0) || 0
  )

  const vagasRestantesCompra = Math.max(
    0,
    Number(camp?.vagas || camp?.quantidade_equipes || 0) - vagasPreenchidas
  )

  const equipeSelecionadaCompra = useMemo(() => {
    return minhasEquipesCompra.find((equipe) => equipe.id === equipeCompraId) || null
  }, [minhasEquipesCompra, equipeCompraId])

  const redirectCompraAtual = typeof window !== 'undefined'
    ? `${window.location.pathname}${window.location.search}`
    : `/campeonatos/${id}`

  const linkCriarEquipeCompra = `/equipe/nova?redirect=${encodeURIComponent(redirectCompraAtual)}`
  const linkGerenciarEquipesCompra = `/equipe?redirect=${encodeURIComponent(redirectCompraAtual)}`
  const podeCriarEquipeCompra = Boolean(usuarioAtual?.id && minhasEquipesCriadasCompra < 2)
  const linkCriarLineCompra = equipeCompraId
    ? `/equipe/${equipeCompraId}?aba=lines&redirect=${encodeURIComponent(redirectCompraAtual)}`
    : linkGerenciarEquipesCompra
  const linkDepositoPixCompra = `/carteira/deposito?metodo=pix&redirect=${encodeURIComponent(redirectCompraAtual)}`
  const linkDepositoPaypalCompra = `/carteira/deposito?metodo=paypal&redirect=${encodeURIComponent(redirectCompraAtual)}`
  const whatsappCompraLimpo = String(camp?.whatsapp_suporte || camp?.whatsapp_contato || '').replace(/\D/g, '')
  const mensagemWhatsAppCompra = `Olá, vim pelo Drop Zone e quero comprar vaga no campeonato ${camp?.nome || ''}.`
  const linkWhatsAppCompra = whatsappCompraLimpo
    ? `https://wa.me/${whatsappCompraLimpo}?text=${encodeURIComponent(mensagemWhatsAppCompra)}`
    : ''

  const carregarPainelCompraVaga = useCallback(async () => {
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser()

      if (authError) {
        logErroSupabase('Erro ao buscar usuário para compra de vaga', authError)
      }

      const user = authData?.user || null
      setUsuarioAtual(user)

      if (!user) {
        setPodeGerenciarCampeonato(false)

        setSaldoCarteira(0)
        setMinhasEquipesCompra([])
        setMinhasEquipesCriadasCompra(0)
        setEquipeCompraId('')
        return
      }

      try {
        const { data: permissaoData, error: permissaoError } = await supabase.rpc('fn_usuario_admin_do_campeonato', {
          p_campeonato_id: id,
        })

        if (!permissaoError) {
          setPodeGerenciarCampeonato(Boolean(permissaoData))
        } else {
          setPodeGerenciarCampeonato(Boolean(camp?.criado_por && camp.criado_por === user.id))
        }
      } catch {
        setPodeGerenciarCampeonato(Boolean(camp?.criado_por && camp.criado_por === user.id))
      }

      const { data: saldoData, error: saldoError } = await supabase
        .from('wallet_saldo')
        .select('saldo')
        .eq('user_id', user.id)
        .maybeSingle()

      if (saldoError) {
        logErroSupabase('Erro ao buscar saldo da carteira', saldoError)
      }

      setSaldoCarteira(Number((saldoData as any)?.saldo || 0))

      const mapaEquipes = new Map<string, CompraEquipeOption>()

      const { data: equipesCriadas, error: equipesCriadasError } = await supabase
        .from('equipes')
        .select('id, nome, tag, logo_url')
        .eq('criado_por', user.id)
        .order('nome', { ascending: true })

      if (equipesCriadasError) {
        logErroSupabase('Erro ao buscar equipes criadas pelo usuário', equipesCriadasError)
      }

      setMinhasEquipesCriadasCompra((equipesCriadas || []).length)

      ;((equipesCriadas || []) as any[]).forEach((equipe) => {
        if (!equipe?.id) return
        mapaEquipes.set(equipe.id, {
          id: equipe.id,
          nome: equipe.nome || 'Equipe sem nome',
          tag: equipe.tag || null,
          logo_url: equipe.logo_url || null,
        })
      })

      const { data: membrosUsuarioData, error: membrosUsuarioError } = await supabase
        .from('membros_equipe')
        .select(
          `
          equipe_id,
          tipo,
          ativo,
          equipes (
            id,
            nome,
            tag,
            logo_url
          )
        `
        )
        .eq('ativo', true)
        .eq('user_id', user.id)

      if (membrosUsuarioError) {
        logErroSupabase('Erro ao buscar equipes vinculadas ao perfil do usuÃ¡rio', membrosUsuarioError)
      }

      ;((membrosUsuarioData || []) as any[]).forEach((membro) => {
        const equipe = normalizarEquipeRelacionada(membro?.equipes)
        if (!equipe?.id) return

        mapaEquipes.set(equipe.id, {
          id: equipe.id,
          nome: equipe.nome || 'Equipe sem nome',
          tag: equipe.tag || null,
          logo_url: equipe.logo_url || null,
        })
      })

      const { data: perfisData, error: perfisError } = await supabase
        .from('perfis_jogo')
        .select('id')
        .eq('user_id', user.id)

      if (perfisError) {
        logErroSupabase('Erro ao buscar perfis de jogo do usuário', perfisError)
      }

      const perfilIds = ((perfisData || []) as any[])
        .map((perfil) => perfil?.id)
        .filter(Boolean)

      if (perfilIds.length > 0) {
        const { data: membrosData, error: membrosError } = await supabase
          .from('membros_equipe')
          .select(
            `
            equipe_id,
            tipo,
            ativo,
            equipes (
              id,
              nome,
              tag,
              logo_url
            )
          `
          )
          .eq('ativo', true)
          .in('perfil_jogo_id', perfilIds)

        if (membrosError) {
          logErroSupabase('Erro ao buscar equipes vinculadas ao usuário', membrosError)
        }

        ;((membrosData || []) as any[]).forEach((membro) => {
          const equipe = normalizarEquipeRelacionada(membro?.equipes)
          if (!equipe?.id) return

          mapaEquipes.set(equipe.id, {
            id: equipe.id,
            nome: equipe.nome || 'Equipe sem nome',
            tag: equipe.tag || null,
            logo_url: equipe.logo_url || null,
          })
        })
      }

      const opcoes = Array.from(mapaEquipes.values()).sort((a, b) =>
        String(a.nome || '').localeCompare(String(b.nome || ''))
      )

      setMinhasEquipesCompra(opcoes)
      setEquipeCompraId((atual) => {
        if (atual && opcoes.some((equipe) => equipe.id === atual)) return atual
        return opcoes[0]?.id || ''
      })
    } catch (err) {
      logErroSupabase('Erro ao carregar painel de compra de vaga', err)
    }
  }, [id, camp?.criado_por])

  function abrirConfirmacaoCompra() {
    setMensagemCompraVaga('')
    setComprovanteCompra(null)

    if (!usuarioAtual) {
      setMensagemCompraVaga('Faça login para comprar uma vaga.')
      return
    }

    if (!equipeCompraId || !equipeSelecionadaCompra) {
      setMensagemCompraVaga('Você ainda não tem equipe ou line pronta. Use as opções abaixo para criar/vincular e depois finalize a compra.')
      setSenhaCompra('')
      setModalConfirmacaoCompraAberto(true)
      return
    }

    if (vagasRestantesCompra <= 0) {
      setMensagemCompraVaga('Não existem vagas disponíveis neste campeonato.')
      return
    }

    if (valorVagaCompra > 0 && saldoCarteira < valorVagaCompra) {
      setMensagemCompraVaga('Saldo insuficiente na carteira para comprar esta vaga.')
      return
    }

    setSenhaCompra('')
    setModalConfirmacaoCompraAberto(true)
  }

  async function comprarVagaComCarteira() {
    if (!id || !camp) return

    setMensagemCompraVaga('')

    if (!usuarioAtual) {
      setMensagemCompraVaga('Faça login para comprar uma vaga.')
      return
    }

    if (!equipeCompraId || !equipeSelecionadaCompra) {
      setMensagemCompraVaga('Selecione uma equipe para comprar a vaga.')
      return
    }

    if (!senhaCompra.trim()) {
      setMensagemCompraVaga('Digite sua senha para confirmar a compra.')
      return
    }

    if (!usuarioAtual.email) {
      setMensagemCompraVaga('Seu usuário não possui e-mail válido para validar a senha.')
      return
    }

    if (valorVagaCompra > 0 && saldoCarteira < valorVagaCompra) {
      setMensagemCompraVaga('Saldo insuficiente na carteira para comprar esta vaga.')
      return
    }

    setComprandoVaga(true)

    try {
      const { error: senhaError } = await supabase.auth.signInWithPassword({
        email: usuarioAtual.email,
        password: senhaCompra,
      })

      if (senhaError) {
        throw new Error('Senha incorreta. Confira sua senha e tente novamente.')
      }

      const rpcName = valorVagaCompra > 0
        ? 'fn_comprar_vaga_campeonato'
        : 'fn_inscrever_equipe_em_campeonato'

      const rpcPayload = valorVagaCompra > 0
        ? {
            p_campeonato_id: id,
            p_equipe_id: equipeCompraId,
            p_user_id: usuarioAtual.id,
            p_valor: valorVagaCompra,
          }
        : {
            p_campeonato_id: id,
            p_grupo_id: null,
            p_equipe_id: equipeCompraId,
            p_equipe_avulsa_id: null,
            p_seed: null,
            p_tipo_origem: 'oficial',
            p_status: 'ativa',
            p_observacoes: 'Inscrição gratuita pelo painel de compra',
            p_alocar_em_slot: true,
          }

      const { error } = await supabase.rpc(rpcName, rpcPayload as any)

      if (error) {
        logErroSupabase('Erro ao comprar vaga com carteira', error)
        throw error
      }

      const { data: inscricaoData } = await supabase
        .from('campeonato_equipes')
        .select('id, created_at, line_id, nome_exibicao')
        .eq('campeonato_id', id)
        .eq('equipe_id', equipeCompraId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      const referenciaId = (inscricaoData as any)?.id || null
      const dataCompra = (inscricaoData as any)?.created_at || new Date().toISOString()
      const descricaoDetalhada = `Compra de vaga - ${camp?.nome || 'Campeonato'} | ${equipeSelecionadaCompra.nome}`

      if (referenciaId && !(inscricaoData as any)?.line_id) {
        const { error: lineError } = await supabase.rpc('fn_garantir_line_para_vaga', {
          p_campeonato_equipe_id: referenciaId,
          p_nome: (inscricaoData as any)?.nome_exibicao || equipeSelecionadaCompra.nome,
          p_user_id: usuarioAtual.id,
          p_plataforma: camp?.plataforma || 'mobile',
        })
        if (lineError) console.warn('Não foi possível vincular line automática na vaga:', lineError)
      }

      if (referenciaId) {
        const { error: updateInscricaoError } = await supabase
          .from('campeonato_equipes')
          .update({
            origem_inscricao: 'site',
            status_pagamento: valorVagaCompra > 0 ? 'pago' : 'gratuito',
            valor_vaga_pago: valorVagaCompra,
            registrado_por: usuarioAtual.id,
            observacoes: descricaoDetalhada,
          })
          .eq('id', referenciaId)

        if (updateInscricaoError) {
          logErroSupabase('Erro ao marcar origem da vaga como compra pelo site', updateInscricaoError)
        }
      }

      if (valorVagaCompra > 0 && referenciaId) {
        const { error: updateTransacaoError } = await supabase
          .from('wallet_transacoes')
          .update({ descricao: descricaoDetalhada })
          .eq('user_id', usuarioAtual.id)
          .eq('referencia_id', referenciaId)

        if (updateTransacaoError) {
          logErroSupabase('Erro ao atualizar descrição do histórico da carteira', updateTransacaoError)
        }
      }

      setComprovanteCompra({
        campeonato: camp?.nome || 'Campeonato',
        equipe: equipeSelecionadaCompra.nome,
        valor: valorVagaCompra,
        data: dataCompra,
        referenciaId,
      })

      setMensagemCompraVaga(
        valorVagaCompra > 0
          ? 'Vaga comprada com sucesso usando saldo da carteira.'
          : 'Vaga gratuita registrada com sucesso.'
      )

      setModalConfirmacaoCompraAberto(false)
      setSenhaCompra('')

      await Promise.all([carregarDados(), carregarPainelCompraVaga()])
    } catch (err: any) {
      const mensagem =
        err?.message ||
        err?.details ||
        'Não foi possível concluir a compra da vaga agora.'

      setMensagemCompraVaga(mensagem)
    } finally {
      setComprandoVaga(false)
    }
  }

  const carregarRankingMvp = useCallback(async () => {
    if (!id || !idEhUuid) return

    const { data: resultadosRaw, error: resultadosError } = await supabase
      .from('resultados_mvp')
      .select(
        'jogador_campeonato_id, perfil_jogo_id, equipe_id, equipe_avulsa_id, nick_snapshot, uid_jogo_snapshot, abates, partida_id'
      )
      .eq('campeonato_id', id)

    if (resultadosError) {
      logErroSupabase('Erro ao carregar ranking MVP', resultadosError)
      setRankingMvp([])
      return
    }

    const resultados = (resultadosRaw || []) as ResultadoMvpRow[]

    const perfilIds = Array.from(
      new Set(resultados.map((row) => textoSeguro(row.perfil_jogo_id)).filter(Boolean))
    )

    const equipeIds = Array.from(
      new Set(resultados.map((row) => textoSeguro(row.equipe_id)).filter(Boolean))
    )

    const equipeAvulsaIds = Array.from(
      new Set(resultados.map((row) => textoSeguro(row.equipe_avulsa_id)).filter(Boolean))
    )

    const [
      { data: perfisRows, error: perfisError },
      { data: equipesRows, error: equipesError },
      { data: equipesAvulsasRows, error: equipesAvulsasError },
    ] = await Promise.all([
      perfilIds.length > 0
        ? supabase.from('perfis_jogo').select('id, nick, foto_capa').in('id', perfilIds)
        : Promise.resolve({ data: [], error: null }),
      equipeIds.length > 0
        ? supabase.from('equipes').select('id, nome, logo_url').in('id', equipeIds)
        : Promise.resolve({ data: [], error: null }),
      equipeAvulsaIds.length > 0
        ? supabase
            .from('equipes_avulsas_campeonato')
            .select('id, nome, logo_url')
            .in('id', equipeAvulsaIds)
        : Promise.resolve({ data: [], error: null }),
    ])

    if (perfisError) logErroSupabase('Erro ao carregar perfis do ranking MVP', perfisError)
    if (equipesError) logErroSupabase('Erro ao carregar equipes do ranking MVP', equipesError)
    if (equipesAvulsasError) {
      logErroSupabase('Erro ao carregar equipes avulsas do ranking MVP', equipesAvulsasError)
    }

    const perfisMap = new Map<string, any>(((perfisRows || []) as any[]).map((row) => [String(row.id), row]))
    const equipesMap = new Map<string, any>(((equipesRows || []) as any[]).map((row) => [String(row.id), row]))
    const equipesAvulsasMap = new Map<string, any>(
      ((equipesAvulsasRows || []) as any[]).map((row) => [String(row.id), row])
    )

    const acumuladoMap = new Map<
      string,
      {
        perfil_jogo_id: string | null
        equipe_id: string | null
        nick: string
        equipe_nome_display: string
        avatar_url: string | null
        equipe_avatar: string | null
        abates: number
        partidas: Set<string>
      }
    >()

    for (const row of resultados) {
      const perfilId = textoSeguro(row.perfil_jogo_id) || null
      const equipeId = textoSeguro(row.equipe_id || row.equipe_avulsa_id) || null

      const perfil = perfilId ? perfisMap.get(perfilId) : null
      const equipe = textoSeguro(row.equipe_id) ? equipesMap.get(String(row.equipe_id)) : null
      const equipeAvulsa = textoSeguro(row.equipe_avulsa_id)
        ? equipesAvulsasMap.get(String(row.equipe_avulsa_id))
        : null

      const nick = textoSeguro(row.nick_snapshot, textoSeguro(perfil?.nick, 'SEM NICK'))
      const equipeNome = textoSeguro(equipe?.nome || equipeAvulsa?.nome, 'SEM EQUIPE')
      const avatar = (perfil?.foto_capa as string | null) || null
      const equipeAvatar =
        (equipe?.logo_url as string | null) || (equipeAvulsa?.logo_url as string | null) || null

      const chaveBase =
        textoSeguro(row.jogador_campeonato_id) ||
        `${perfilId || textoSeguro(row.uid_jogo_snapshot) || nick}::${equipeId || 'sem-equipe'}`

      const atual = acumuladoMap.get(chaveBase) || {
        perfil_jogo_id: perfilId,
        equipe_id: equipeId,
        nick,
        equipe_nome_display: equipeNome,
        avatar_url: avatar,
        equipe_avatar: equipeAvatar,
        abates: 0,
        partidas: new Set<string>(),
      }

      atual.abates += formatarNumero(row.abates)

      const partidaId = textoSeguro(row.partida_id)
      if (partidaId) atual.partidas.add(partidaId)

      if (!atual.nick || atual.nick === 'SEM NICK') atual.nick = nick
      if (!atual.equipe_nome_display || atual.equipe_nome_display === 'SEM EQUIPE') {
        atual.equipe_nome_display = equipeNome
      }
      if (!atual.avatar_url && avatar) atual.avatar_url = avatar
      if (!atual.equipe_avatar && equipeAvatar) atual.equipe_avatar = equipeAvatar
      if (!atual.perfil_jogo_id && perfilId) atual.perfil_jogo_id = perfilId
      if (!atual.equipe_id && equipeId) atual.equipe_id = equipeId

      acumuladoMap.set(chaveBase, atual)
    }

    const ranking = Array.from(acumuladoMap.values())
      .map((item) => ({
        perfil_jogo_id: item.perfil_jogo_id,
        equipe_id: item.equipe_id,
        nick: item.nick,
        equipe_nome_display: item.equipe_nome_display,
        abates: item.abates,
        quedas: item.partidas.size,
        avatar_url: item.avatar_url,
        equipe_avatar: item.equipe_avatar,
      }))
      .sort((a, b) => {
        if (b.abates !== a.abates) return b.abates - a.abates
        if (b.quedas !== a.quedas) return b.quedas - a.quedas
        return textoSeguro(a.nick).localeCompare(textoSeguro(b.nick))
      })

    setRankingMvp(ranking)
  }, [id, idEhUuid])

  const carregarPainelTransparencia = useCallback(async () => {
    if (!id || !idEhUuid) return

    setLoadingPainelTransparencia(true)

    try {
      const [
        { data: avaliacoesRows, error: avaliacoesError },
        { data: metricasRows, error: metricasError },
        { data: denunciasRows, error: denunciasError },
      ] = await Promise.all([
        supabase.from('avaliacoes_campeonato').select('nota').eq('campeonato_id', id),
        supabase
          .from('v_denuncias_metricas_campeonato')
          .select('*')
          .eq('campeonato_id', id)
          .maybeSingle(),
        supabase
          .from('v_denuncias_campeonato_resumo')
          .select('*')
          .eq('campeonato_id', id)
          .eq('publica', true)
          .order('created_at', { ascending: false })
          .limit(20),
      ])

      if (avaliacoesError) {
        logErroSupabase('Erro ao carregar resumo de avaliações', avaliacoesError)
      }

      if (metricasError) {
        logErroSupabase('Erro ao carregar métricas de denúncias', metricasError)
      }

      if (denunciasError) {
        logErroSupabase('Erro ao carregar denúncias públicas', denunciasError)
      }

      const notas = ((avaliacoesRows || []) as any[])
        .map((row) => Number(row?.nota))
        .filter((nota) => Number.isFinite(nota))

      const media = notas.length > 0 ? notas.reduce((acc, atual) => acc + atual, 0) / notas.length : 0

      setAvaliacaoResumo({
        media,
        total: notas.length,
      })

      setDenunciaMetricas((metricasRows as DenunciaMetrica | null) || null)
      setDenunciasPublicas(((denunciasRows || []) as DenunciaResumo[]).filter((item) => item.publica))
    } catch (err) {
      logErroSupabase('Erro ao carregar painel de transparência', err)
    } finally {
      setLoadingPainelTransparencia(false)
    }
  }, [id, idEhUuid])

  const carregarDados = useCallback(async () => {
    if (!id || !idEhUuid) {
      setLoading(false)
      return
    }

    setLoading(true)

    try {
      const { data: campeonatoData, error: campeonatoError } = await supabase
        .from('campeonatos')
        .select(
          `
          *,
          produtoras!produtora_id (
            nome,
            logo_url
          )
        `
        )
        .eq('id', id)
        .maybeSingle()

      if (campeonatoError) {
        logErroSupabase('Erro ao buscar campeonato', campeonatoError)
        throw campeonatoError
      }

      setCamp(campeonatoData)

      const { data: rankingData } = await supabase
        .from('vw_lealt_ranking_campeonatos')
        .select('posicao, tier, score_total')
        .eq('campeonato_id', id)
        .maybeSingle()

      setRankingCampeonato(rankingData || null)

      if (String(campeonatoData?.tipo_competicao || '').toLowerCase() === 'xtreino') {
        const { data: xtreinoData, error: xtreinoError } = await supabase
          .from('campeonatos_xtreinos_config')
          .select('modo_xtreino')
          .eq('campeonato_id', id)
          .maybeSingle()

        if (xtreinoError) {
          logErroSupabase('Erro ao buscar configuração do xtreino', xtreinoError)
        }

        setXtreinoConfig(xtreinoData || null)
      } else {
        setXtreinoConfig(null)
      }

      const { data: equipesVinculadas, error: equipesError } = await supabase
        .from('campeonato_equipes')
        .select(
          `
          id,
          equipe_id,
          grupo_id,
          seed,
          status,
          equipes (
            id,
            nome,
            logo_url,
            tag
          )
        `
        )
        .eq('campeonato_id', id)

      if (equipesError) {
        logErroSupabase('Erro ao buscar equipes do campeonato', equipesError)
        throw equipesError
      }

      const { data: resultadosData, error: resultadosError } = await supabase
        .from('resultados_partidas_equipes')
        .select(
          `
          equipe_id,
          colocacao,
          abates,
          pontos_colocacao,
          pontos_abates,
          pontos_total
        `
        )
        .eq('campeonato_id', id)

      if (resultadosError) {
        logErroSupabase('Erro ao buscar resultados das equipes', resultadosError)
        throw resultadosError
      }

      const mapaResultados = new Map<
        string,
        {
          partidas: number
          booyahs: number
          abates: number
          pontos_colocacao: number
          pontos_abates: number
          pontos: number
        }
      >()

      for (const resultado of (resultadosData || []) as ResultadoEquipeRow[]) {
        const equipeId = resultado.equipe_id
        if (!equipeId) continue

        const atual = mapaResultados.get(equipeId) || {
          partidas: 0,
          booyahs: 0,
          abates: 0,
          pontos_colocacao: 0,
          pontos_abates: 0,
          pontos: 0,
        }

        atual.partidas += 1
        atual.abates += formatarNumero(resultado.abates)
        atual.pontos_colocacao += formatarNumero(resultado.pontos_colocacao)
        atual.pontos_abates += formatarNumero(resultado.pontos_abates)
        atual.pontos += formatarNumero(resultado.pontos_total)

        if (formatarNumero(resultado.colocacao) === 1) atual.booyahs += 1

        mapaResultados.set(equipeId, atual)
      }

      const equipesComRanking = ((equipesVinculadas || []) as CampeonatoEquipeRow[])
        .map((item) => {
          const equipe = normalizarEquipeRelacionada(item.equipes)
          const acumulado = mapaResultados.get(item.equipe_id) || {
            partidas: 0,
            booyahs: 0,
            abates: 0,
            pontos_colocacao: 0,
            pontos_abates: 0,
            pontos: 0,
          }

          return {
            id: item.id,
            equipe_id: item.equipe_id,
            grupo_id: item.grupo_id || null,
            seed: item.seed || null,
            status: item.status || null,
            partidas: acumulado.partidas,
            booyahs: acumulado.booyahs,
            abates: acumulado.abates,
            pontos_colocacao: acumulado.pontos_colocacao,
            pontos_abates: acumulado.pontos_abates,
            pontos: acumulado.pontos,
            equipes: equipe
              ? {
                  ...equipe,
                  tag: equipe.tag || null,
                }
              : null,
          }
        })
        .sort((a, b) => {
          if (b.pontos !== a.pontos) return b.pontos - a.pontos
          if (b.booyahs !== a.booyahs) return b.booyahs - a.booyahs
          if (b.abates !== a.abates) return b.abates - a.abates
          return 0
        })
        .map((item, index) => ({
          ...item,
          rank: index + 1,
        }))

      setEquipesParticipantes(equipesComRanking)
      setVagasPreenchidas(equipesComRanking.length)

      await Promise.all([carregarRankingMvp(), carregarPainelTransparencia(), carregarPainelCompraVaga()])
    } catch (err: any) {
      logErroSupabase('Erro ao carregar', err)
    } finally {
      setLoading(false)
    }
  }, [id, idEhUuid, carregarRankingMvp, carregarPainelTransparencia, carregarPainelCompraVaga])

  useEffect(() => {
    carregarDados()
  }, [carregarDados])

  async function salvarAlteracao(campo: string, valor: any) {
    if (!id) return

    try {
      let valorFinal = valor

      if (
        [
          'data_inicio',
          'data_fim',
          'data_abertura_inscricoes',
          'data_encerramento_inscricoes',
        ].includes(campo)
      ) {
        valorFinal = !valor || valor === '' || valor === '---' ? null : new Date(valor).toISOString()
      }

      const { error } = await supabase.from('campeonatos').update({ [campo]: valorFinal }).eq('id', id)

      if (error) {
        logErroSupabase('Erro ao salvar alteração', error)
        throw error
      }

      setCamp((prev: any) => ({ ...prev, [campo]: valorFinal }))
    } catch (err) {
      logErroSupabase('Erro ao salvar alteração', err)
      alert(mensagemErroSupabase(err))
      throw err
    }
  }

  async function salvarAlteracoes(campos: Record<string, any>) {
    if (!id) return

    try {
      const payload = { ...campos }
      const { error } = await supabase.from('campeonatos').update(payload).eq('id', id)

      if (error) {
        logErroSupabase('Erro ao salvar alterações', error)
        throw error
      }

      setCamp((prev: any) => ({ ...prev, ...payload }))
    } catch (err) {
      logErroSupabase('Erro ao salvar alterações', err)
      alert(mensagemErroSupabase(err))
      throw err
    }
  }

  const reputacaoCalculada = useMemo(() => {
    const totalDenuncias = formatarNumero(denunciaMetricas?.total_denuncias)
    const denunciasAbertas = formatarNumero(denunciaMetricas?.denuncias_abertas)
    const taxaResposta = formatarNumero(denunciaMetricas?.taxa_resposta_percentual)
    const taxaResolucao = formatarNumero(denunciaMetricas?.taxa_resolucao_percentual)

    const score = calcularScoreReputacao({
      mediaAvaliacoes: avaliacaoResumo.media,
      totalAvaliacoes: avaliacaoResumo.total,
      denunciasAbertas,
      totalDenuncias,
      taxaResposta,
      taxaResolucao,
    })

    return {
      score,
      selo: obterSeloReputacao(score),
    }
  }, [avaliacaoResumo, denunciaMetricas])

  useEffect(() => {
    if (usaAbasCopa && !['informacoes', 'equipes', 'jogadores', 'grupos', 'tabela', 'configuracoes'].includes(abaAtiva)) {
      setAbaAtiva('informacoes')
      return
    }

    if (usaAbasLiga && !['informacoes', 'equipes', 'jogadores', 'grupos', 'jogos', 'tabela', 'configuracoes'].includes(abaAtiva)) {
      setAbaAtiva('informacoes')
      return
    }
  }, [usaAbasCopa, usaAbasLiga, abaAtiva])

  const abasVisiveis = usaAbasCopa
    ? [
        { id: 'informacoes', label: 'Avaliações', icon: <Star size={14} /> },
        { id: 'equipes', label: 'Equipes' },
        { id: 'jogadores', label: 'Jogadores' },
        { id: 'grupos', label: 'Grupos', icon: <Users size={14} /> },
        { id: 'tabela', label: 'Tabela', icon: <List size={14} /> },
        ...(podeGerenciarCampeonato ? [{ id: 'configuracoes', label: 'Configurações', icon: <Settings size={14} /> }] : []),
      ]
    : usaAbasLiga
      ? [
          { id: 'informacoes', label: 'Avaliações', icon: <Star size={14} /> },
          { id: 'equipes', label: 'Equipes' },
          { id: 'jogadores', label: 'Jogadores' },
          { id: 'grupos', label: 'Grupos', icon: <Users size={14} /> },
          { id: 'jogos', label: 'Jogos', icon: <LayoutGrid size={14} /> },
          { id: 'tabela', label: 'Tabela', icon: <List size={14} /> },
          ...(podeGerenciarCampeonato ? [{ id: 'configuracoes', label: 'Configurações', icon: <Settings size={14} /> }] : []),
        ]
      : [
          { id: 'informacoes', label: 'Avaliações', icon: <Star size={14} /> },
          { id: 'reputacao', label: 'Reputação', icon: <BadgeCheck size={14} /> },
          { id: 'denuncias', label: 'Denúncias', icon: <ShieldAlert size={14} /> },
          { id: 'equipes', label: 'Equipes' },
          { id: 'jogadores', label: 'Jogadores' },
          { id: 'grupos', label: 'Grupos', icon: <Users size={14} /> },
          { id: 'jogos', label: 'Jogos', icon: <LayoutGrid size={14} /> },
          { id: 'tabela', label: 'Tabela & MVP', icon: <List size={14} /> },
          { id: 'watchparty', label: 'Watch Party', icon: <Youtube size={14} /> },
          { id: 'regras', label: 'Regras' },
          ...(podeGerenciarCampeonato ? [{ id: 'configuracoes', label: 'Configurações', icon: <Settings size={14} /> }] : []),
        ]

  async function copiarLinkPontuador() {
    if (!podeGerenciarCampeonato) return

    const { data: existente, error: buscaError } = await supabase
      .from('stream_projects')
      .select('id, stream_key')
      .eq('campeonato_id', id)
      .eq('ativo', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (buscaError) {
      alert(`Nao consegui buscar a chave do pontuador: ${buscaError.message}`)
      return
    }

    let streamKey = String((existente as any)?.stream_key || '').trim()

    if (!streamKey) {
      const { data: criado, error: criarError } = await supabase
        .from('stream_projects')
        .insert({
          campeonato_id: id,
          nome: `Transmissao - ${camp?.nome || 'Campeonato'}`,
          ativo: true,
        })
        .select('stream_key')
        .single()

      if (criarError) {
        alert(`Nao consegui criar a chave do pontuador: ${criarError.message}`)
        return
      }

      streamKey = String((criado as any)?.stream_key || '').trim()
    }

    if (!streamKey) {
      alert('Nao consegui gerar a chave do pontuador.')
      return
    }

    const origem = typeof window !== 'undefined' ? window.location.origin : ''
    const link = `${origem}/stream/pontuador?key=${encodeURIComponent(streamKey)}`
    await navigator.clipboard.writeText(link)
    alert('Link do pontuador copiado.')
  }

  if (!idEhUuid) {
    return (
      <div className="min-h-[55vh] dz-card flex flex-col items-center justify-center text-center p-6">
        <Loader2 className="animate-spin text-[#7cfc00] mb-4" size={40} />
        <span className="text-slate-700 font-extrabold uppercase tracking-[0.12em]">
          Redirecionando...
        </span>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-[55vh] dz-card flex flex-col items-center justify-center">
        <Loader2 className="animate-spin text-[#7cfc00] mb-4" size={48} />
        <span className="text-cyan-600 font-extrabold uppercase tracking-[0.12em]">
          Sincronizando Painel...
        </span>
      </div>
    )
  }

  return (
    <TableThemeProvider>
      <div className="dz-shell min-h-screen bg-transparent text-slate-950 py-3 px-2 md:px-4">
        {showFloatingEditor && (
          <Draggable handle=".handle-drag">
            <div className="fixed top-20 right-5 z-[100] w-[450px] dz-panel overflow-hidden">
              <div className="handle-drag bg-slate-950 text-white px-3 py-2 flex justify-between items-center cursor-move">
                <span className="text-[10px] font-black uppercase flex items-center gap-2">
                  <Move size={14} className="text-[#7cfc00]" /> Painel de Edição Rápida
                </span>
                <button onClick={() => setShowFloatingEditor(false)}>
                  <X size={18} className="hover:text-[#7cfc00] transition-colors" />
                </button>
              </div>

              <div className="max-h-[500px] overflow-y-auto p-3 bg-white">
                <TableEditor />
              </div>
            </div>
          </Draggable>
        )}

        {modalConfirmacaoCompraAberto && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 px-4">
            <div className="w-full max-w-xl dz-panel bg-white text-slate-950">
              <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center border border-cyan-200 bg-cyan-50 text-cyan-700"><LockKeyhole size={18} /></div>
                  <div><div className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500">Confirmação de compra</div><div className="text-xl font-black uppercase italic">Comprar vaga</div></div>
                </div>
                <button type="button" onClick={() => { if (comprandoVaga) return; setModalConfirmacaoCompraAberto(false); setSenhaCompra('') }} className="border border-slate-200 bg-white p-2 hover:bg-zinc-200"><X size={18} /></button>
              </div>
              <div className="space-y-4 p-5">
                <div className="border border-slate-200 bg-slate-50 p-4">
                  <div className="grid gap-3 text-sm font-bold">
                    <div className="flex items-center justify-between gap-4 border-b border-zinc-300 pb-2"><span className="text-zinc-500">Campeonato</span><span className="text-right font-black uppercase">{camp?.nome || '---'}</span></div>
                    <div className="flex items-center justify-between gap-4 border-b border-zinc-300 pb-2"><span className="text-zinc-500">Vagas restantes</span><span className="text-right font-black uppercase">{vagasRestantesCompra}</span></div>
                    <div className="flex items-center justify-between gap-4 border-b border-zinc-300 pb-2"><span className="text-zinc-500">Equipe / line</span><span className="text-right font-black uppercase">{equipeSelecionadaCompra ? `${equipeSelecionadaCompra.tag ? `[${equipeSelecionadaCompra.tag}] ` : ''}${equipeSelecionadaCompra.nome}` : 'Pendente'}</span></div>
                    <div className="flex items-center justify-between gap-4"><span className="text-zinc-500">Valor</span><span className="text-right text-2xl font-black text-[#18b54a]">{valorVagaCompra > 0 ? formatarMoeda(valorVagaCompra) : 'GRÁTIS'}</span></div>
                  </div>
                </div>

                {!equipeSelecionadaCompra ? (
                  <div className="border border-amber-200 bg-amber-50 p-4">
                    <div className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-800">Equipe ou line necessária</div>
                    <p className="mt-2 text-xs font-semibold leading-5 text-[#142340]/75">
                      Para finalizar a vaga, crie ou vincule uma equipe/line. Depois volte para esta mesma página e clique em comprar vaga novamente.
                    </p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                      {podeCriarEquipeCompra ? (
                        <a href={linkCriarEquipeCompra} className="inline-flex h-10 items-center justify-center gap-2 border border-blue-600 bg-blue-600 px-3 text-[10px] font-black uppercase tracking-wide text-white hover:bg-blue-500">
                          <PlusCircle size={14} /> Criar equipe
                        </a>
                      ) : null}
                      <a href={linkGerenciarEquipesCompra} className="inline-flex h-10 items-center justify-center gap-2 border border-zinc-200 bg-white px-3 text-[10px] font-black uppercase tracking-wide text-[#142340] hover:bg-zinc-50">
                        <Users size={14} /> Minhas equipes
                      </a>
                      <a href={linkCriarLineCompra} className="inline-flex h-10 items-center justify-center gap-2 border border-zinc-200 bg-white px-3 text-[10px] font-black uppercase tracking-wide text-[#142340] hover:bg-zinc-50">
                        <List size={14} /> Criar line
                      </a>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="grid gap-2 md:grid-cols-4">
                      <button type="button" onClick={() => {}} className="inline-flex h-10 items-center justify-center gap-2 border border-emerald-200 bg-emerald-50 px-3 text-[10px] font-black uppercase tracking-wide text-emerald-700">
                        <WalletCards size={14} /> Carteira
                      </button>
                      <a href={linkDepositoPixCompra} className="inline-flex h-10 items-center justify-center gap-2 border border-zinc-200 bg-white px-3 text-[10px] font-black uppercase tracking-wide text-[#142340] hover:bg-zinc-50">
                        <QrCode size={14} /> Pix
                      </a>
                      <a href={linkDepositoPaypalCompra} className="inline-flex h-10 items-center justify-center gap-2 border border-zinc-200 bg-white px-3 text-[10px] font-black uppercase tracking-wide text-[#142340] hover:bg-zinc-50">
                        <CircleDollarSign size={14} /> PayPal
                      </a>
                      {linkWhatsAppCompra ? (
                        <a href={linkWhatsAppCompra} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center justify-center gap-2 border border-green-200 bg-green-50 px-3 text-[10px] font-black uppercase tracking-wide text-green-700 hover:bg-green-100">
                          <MessageCircle size={14} /> WhatsApp <ExternalLink size={12} />
                        </a>
                      ) : null}
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-zinc-500">Digite sua senha para pagar com carteira</label>
                      <input type="password" value={senhaCompra} onChange={(event) => setSenhaCompra(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !comprandoVaga) comprarVagaComCarteira() }} className="w-full border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:bg-lime-50" placeholder="Sua senha do login" autoFocus />
                      <p className="mt-2 text-[11px] font-semibold text-zinc-500">A senha é conferida pelo Supabase Auth antes de debitar a carteira.</p>
                    </div>
                  </>
                )}

                {mensagemCompraVaga && <div className="border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">{mensagemCompraVaga}</div>}
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => { if (comprandoVaga) return; setModalConfirmacaoCompraAberto(false); setSenhaCompra('') }} disabled={comprandoVaga} className="border border-slate-200 bg-white px-4 py-3 text-xs font-black uppercase disabled:opacity-60">Fechar</button>
                  <button type="button" onClick={comprarVagaComCarteira} disabled={comprandoVaga || !equipeSelecionadaCompra || !senhaCompra.trim()} className="border border-cyan-200 bg-cyan-50 text-cyan-700 px-4 py-3 text-xs font-black uppercase shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-500">{comprandoVaga ? 'Confirmando...' : 'Confirmar carteira'}</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {comprovanteCompra && (
          <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/75 px-4">
            <div className="w-full max-w-lg dz-panel bg-white text-slate-950">
              <div className="border-b-2 border-black bg-[#7cfc00] p-5 text-center"><CheckCircle2 className="mx-auto mb-2" size={34} /><div className="text-[10px] font-black uppercase tracking-[0.25em]">Pagamento confirmado</div><div className="text-2xl font-black uppercase italic">Comprovante da vaga</div></div>
              <div className="space-y-3 p-5 text-sm font-bold">
                <LinhaComprovante label="Campeonato" value={comprovanteCompra.campeonato} />
                <LinhaComprovante label="Equipe" value={comprovanteCompra.equipe} />
                <LinhaComprovante label="Valor" value={comprovanteCompra.valor > 0 ? formatarMoeda(comprovanteCompra.valor) : 'Grátis'} />
                <LinhaComprovante label="Data" value={formatarDataBanner(comprovanteCompra.data)} />
                <LinhaComprovante label="ID da compra" value={comprovanteCompra.referenciaId || '---'} mono />
              </div>
              <div className="grid grid-cols-2 gap-3 border-t-2 border-black bg-zinc-50 p-5"><button type="button" onClick={() => setComprovanteCompra(null)} className="border border-slate-200 bg-white px-4 py-3 text-xs font-black uppercase">Fechar</button><button type="button" onClick={() => router.push('/carteira')} className="border-2 border-black bg-black px-4 py-3 text-xs font-black uppercase text-[#7cfc00]">Ver carteira</button></div>
            </div>
          </div>
        )}

        <div className="mx-auto w-full max-w-[1180px] overflow-hidden border border-zinc-200 bg-white shadow-[0_12px_35px_rgba(15,23,42,0.08)]">
          <div className="mb-3 flex items-center justify-between px-0 pt-0">
            <button
              onClick={() => router.back()}
              className="mb-3 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-[#142340] hover:text-slate-950"
            >
              <ChevronLeft size={14} /> Voltar
            </button>

            {podeGerenciarCampeonato && (
              <button
                type="button"
                onClick={() => setAbaAtiva('configuracoes')}
                className="mb-3 inline-flex h-9 items-center gap-2 border border-zinc-200 bg-white px-3 text-[11px] font-black uppercase tracking-wide text-[#142340] transition hover:border-[#2563eb] hover:text-[#2563eb]"
              >
                <Settings size={14} /> Configurações
              </button>
            )}
          </div>

          <div className={`border-l-4 ${lealtHeaderGradient} px-4 py-4 text-white md:px-6`}>
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_150px_150px_150px_150px] md:items-center">
              <div className="flex min-w-0 items-center gap-4">
                <div className="h-16 w-16 shrink-0 border border-white/20 bg-white p-1">
                  <img src={camp?.logo_url || '/placeholder.png'} className="h-full w-full object-contain" alt="" />
                </div>

                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className={`inline-flex h-6 items-center border border-white/20 bg-white/10 px-2 text-[10px] font-black uppercase tracking-[0.22em] text-white`}>
                      {tipoVisual.label}
                    </span>
                    <span className="inline-flex h-6 items-center border border-white/20 bg-white/10 px-2 text-[10px] font-black uppercase tracking-[0.22em] text-white/80">
                      {camp?.plataforma || camp?.modo_jogo || camp?.formato || 'Free Fire'}
                    </span>
                    {rankingCampeonato ? (
                      <RankingTierBadge tier={rankingCampeonato.tier} posicao={rankingCampeonato.posicao} score={rankingCampeonato.score_total} tipo="campeonato" compacto />
                    ) : null}
                  </div>
                  <h1 className="truncate text-3xl font-semibold uppercase tracking-tight md:text-4xl">
                    {camp?.nome}
                  </h1>
                </div>
              </div>

              <HeaderStat label={isCopa ? 'Formato' : isLiga ? 'Rodadas' : isXtreino ? 'Modo' : 'Formato'} value={isCopa ? (camp?.formato || 'Mata-mata') : isLiga ? String(camp?.quantidade_rodadas || xtreinoConfig?.quantidade_rodadas || 1) : isXtreino ? (xtreinoConfig?.modo_xtreino || 'Flexível') : (camp?.formato || '4x4')} />
              <HeaderStat label="Vagas" value={`${vagasPreenchidas} / ${camp?.vagas || camp?.quantidade_equipes || 0}`} />
              <HeaderStat label="Premiação" value={formatarMoeda(camp?.valor_premiacao)} />
              <HeaderStat label="Inscrição" value={valorVagaCompra > 0 ? formatarMoeda(valorVagaCompra) : 'Grátis'} />
            </div>
          </div>

          <div className="border-b border-zinc-200 bg-white px-4 py-3 md:px-6">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_300px_170px] lg:items-end">
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                <LealtMiniInfo label="Status" value={normalizarStatusCampeonato(camp?.status).label} />
                <LealtMiniInfo label="Início" value={formatarDataBanner(camp?.data_inicio)} />
                <LealtMiniInfo label="Saldo" value={formatarMoeda(saldoCarteira)} />
                <LealtMiniInfo label="Restantes" value={String(vagasRestantesCompra)} />
              </div>

              <div>
                <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Equipe / line do usuário</label>
                {minhasEquipesCompra.length > 0 ? (
                  <select
                    value={equipeCompraId}
                    onChange={(event) => setEquipeCompraId(event.target.value)}
                    className="h-10 w-full border border-zinc-200 bg-white px-3 text-xs font-bold uppercase text-[#142340] outline-none focus:border-slate-400"
                  >
                    {minhasEquipesCompra.map((equipe) => (
                      <option key={equipe.id} value={equipe.id}>
                        {equipe.tag ? `[${equipe.tag}] ` : ''}{equipe.nome}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="flex h-10 items-center border border-amber-200 bg-amber-50 px-3 text-[11px] font-black uppercase tracking-wide text-amber-800">
                    Nenhuma equipe ou line pronta
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={abrirConfirmacaoCompra}
                disabled={comprandoVaga || !usuarioAtual || vagasRestantesCompra <= 0}
                className={`h-10 border px-4 text-[11px] font-black uppercase tracking-wide transition disabled:cursor-not-allowed disabled:border-zinc-200 disabled:bg-zinc-200 disabled:text-zinc-500 ${tipoVisual.button}`}
              >
                {comprandoVaga ? 'Processando...' : 'Comprar vaga'}
              </button>
            </div>

          </div>

          <div className="sticky top-[60px] z-40 border-b border-zinc-200 bg-white/95 px-2 py-2 backdrop-blur-sm">
            <div className="no-scrollbar flex items-center gap-2 overflow-x-auto">
              {abasVisiveis.map((aba) => {
                const ativa = abaAtiva === aba.id

                return (
                  <button
                    key={aba.id}
                    type="button"
                    onClick={() => setAbaAtiva(aba.id as AbaTipo)}
                    className={`inline-flex h-9 shrink-0 items-center justify-center gap-1.5 border px-3 text-[11px] font-medium uppercase tracking-wide transition ${
                      ativa
                        ? `${tipoVisual.badge} border-current`
                        : 'border-zinc-200 bg-white text-[#142340] hover:bg-zinc-50'
                    }`}
                  >
                    {aba.icon ? <span className="flex h-4 w-4 items-center justify-center">{aba.icon}</span> : null}
                    <span className="whitespace-nowrap">{aba.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <main className="p-3 md:p-4 bg-white min-h-[50vh]">
            {abaAtiva === 'informacoes' && (
              <div className="space-y-6">
                <SocialActions
                  entityId={id}
                  entityType="campeonato"
                  variant="light"
                  compact
                  title="Torcida do campeonato"
                />
                <AvaliacaoCampeonato campeonatoId={id} />
              </div>
            )}

            {abaAtiva === 'reputacao' && (
              <PainelReputacaoCampeonato
                camp={camp}
                avaliacaoResumo={avaliacaoResumo}
                denunciaMetricas={denunciaMetricas}
                reputacaoScore={reputacaoCalculada.score}
                reputacaoSelo={reputacaoCalculada.selo}
                loading={loadingPainelTransparencia}
              />
            )}

            {abaAtiva === 'denuncias' && (
              <PainelDenunciasCampeonato
                metricas={denunciaMetricas}
                denuncias={denunciasPublicas}
                reputacaoScore={reputacaoCalculada.score}
                reputacaoSelo={reputacaoCalculada.selo}
                loading={loadingPainelTransparencia}
              />
            )}

            {abaAtiva === 'equipes' && <GerenciarEquipes campeonatoId={id} canEdit={podeGerenciarCampeonato} />}
            {abaAtiva === 'jogadores' && <AbaJogadores campeonatoId={id} canEdit={podeGerenciarCampeonato} />}
            {abaAtiva === 'grupos' && <GerenciarGrupos campeonatoId={id} />}
            {abaAtiva === 'jogos' && <GerenciarJogos campeonatoId={id} />}

            {abaAtiva === 'tabela' && (
              <div className="flex flex-col gap-6">
                <div className="sticky top-[108px] z-30 border border-zinc-200 bg-white p-2">
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                    {[
                      { id: 'classificacao', label: 'Classificação', icon: <Trophy size={14} /> },
                      { id: 'mvp', label: 'Ranking MVP', icon: <Target size={14} /> },
                      { id: 'sumula', label: 'Registrar Pontuador', icon: <FileText size={14} /> },
                      { id: 'config', label: 'Ajuste Manual', icon: <Settings size={14} /> },
                    ].map((sub) => (
                      <button
                        key={sub.id}
                        onClick={() => setSubAbaTabela(sub.id as SubAbaTabela)}
                        className={`flex h-10 items-center justify-center gap-2 border px-3 text-[10px] font-black uppercase tracking-[0.10em] transition ${
                          subAbaTabela === sub.id
                            ? 'border-[#2563eb] bg-[#2563eb] text-white'
                            : 'border-zinc-200 bg-white text-[#142340] hover:border-[#2563eb] hover:text-[#2563eb]'
                        }`}
                      >
                        {sub.icon}
                        <span className="truncate">{sub.label}</span>
                      </button>
                    ))}
                  </div>
                  {podeGerenciarCampeonato ? (
                    <button
                      type="button"
                      onClick={copiarLinkPontuador}
                      className="mt-2 flex h-9 w-full items-center justify-center gap-2 border border-emerald-600 bg-emerald-600 px-3 text-[10px] font-black uppercase tracking-[0.12em] text-white"
                    >
                      <FileText size={14} />
                      Copiar link do pontuador
                    </button>
                  ) : null}
                </div>

                <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                  {subAbaTabela === 'classificacao' && <PointsTable data={equipesParticipantes} />}
                  {subAbaTabela === 'mvp' && <MVPTable data={rankingMvp} />}
                  {subAbaTabela === 'sumula' && <SumulaPartida canEdit={podeGerenciarCampeonato} />}
                  {subAbaTabela === 'config' && (
                    <div className="max-w-4xl dz-card p-2">
                      <TableEditor />
                    </div>
                  )}
                </div>
              </div>
            )}

            {abaAtiva === 'watchparty' && <GerenciarWatchParty campeonatoId={id} />}
            {abaAtiva === 'regras' && <RegrasCampeonato campeonatoId={id} />}
            {abaAtiva === 'configuracoes' && podeGerenciarCampeonato && (
              <PainelConfiguracoesCampeonato
                camp={camp}
                campeonatoId={id}
                vagasPreenchidas={vagasPreenchidas}
                valorVagaCompra={valorVagaCompra}
                vagasRestantesCompra={vagasRestantesCompra}
                onSalvar={salvarAlteracao}
                onSalvarCampos={salvarAlteracoes}
              />
            )}
          </main>
        </div>
      </div>
    </TableThemeProvider>
  )
}


function PainelConfiguracoesCampeonato({
  camp,
  campeonatoId,
  vagasPreenchidas,
  valorVagaCompra,
  vagasRestantesCompra,
  onSalvar,
  onSalvarCampos,
}: {
  camp: any
  campeonatoId: string
  vagasPreenchidas: number
  valorVagaCompra: number
  vagasRestantesCompra: number
  onSalvar: (campo: string, valor: any) => Promise<void>
  onSalvarCampos: (campos: Record<string, any>) => Promise<void>
}) {
  const [salvandoCampo, setSalvandoCampo] = useState<string | null>(null)
  const [copiado, setCopiado] = useState(false)

  const origem = typeof window !== 'undefined' ? window.location.origin : ''
  const linkMobile = `${origem}/escala/${campeonatoId}`
  const limiteTitulares = Number(camp?.jogadores_por_equipe || 0)
  const limiteReservas = Number(camp?.reservas_permitidos || 0)
  const limiteTotalJogadores = Math.max(0, limiteTitulares + limiteReservas)
  const statusAtual = normalizarStatusCampeonato(camp?.status)

  async function salvar(campo: string, valor: any) {
    setSalvandoCampo(campo)
    try {
      await onSalvar(campo, valor)
    } finally {
      setSalvandoCampo(null)
    }
  }

  async function salvarContatosWhatsApp(contatos: WhatsContato[]) {
    const contatosNormalizados = normalizarContatosWhatsApp(contatos)

    setSalvandoCampo('whatsapp_contatos')
    try {
      await onSalvarCampos({
        whatsapp_contatos: contatosNormalizados,
        whatsapp_suporte: contatosNormalizados[0]?.numero || null,
      })
    } finally {
      setSalvandoCampo(null)
    }
  }

  async function copiarLink() {
    try {
      await navigator.clipboard.writeText(linkMobile)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 1800)
    } catch {
      alert('Não foi possível copiar o link. Copie manualmente pelo campo.')
    }
  }

  return (
    <div className="space-y-4">
      <div className="border border-zinc-200 bg-[#f8fafc] p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[#2563eb]">Central do organizador</div>
            <h2 className="mt-1 text-2xl font-black uppercase tracking-tight text-[#142340]">Configurações do campeonato</h2>
            <p className="mt-1 text-xs font-semibold text-zinc-500">Altere status, vagas, limite de jogadores, datas e link mobile sem mexer no banco.</p>
          </div>
          <div className={`inline-flex h-9 items-center border px-3 text-[10px] font-black uppercase tracking-wide ${statusAtual.classes}`}>
            {statusAtual.label}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <ConfigCard titulo="Status e inscrições" descricao="Controle se o campeonato está com vagas abertas, em andamento ou finalizado.">
            <div className="grid gap-3 md:grid-cols-3">
              <ConfigSelect
                label="Status público"
                value={statusAtual.value}
                options={STATUS_CAMPEONATO_OPTIONS.map((item) => ({ value: item.value, label: item.label }))}
                onChange={(valor) => salvar('status', valor)}
                loading={salvandoCampo === 'status'}
              />
              <ConfigDateTime
                label="Abertura inscrições"
                value={camp?.data_abertura_inscricoes}
                onChange={(valor) => salvar('data_abertura_inscricoes', valor)}
                loading={salvandoCampo === 'data_abertura_inscricoes'}
              />
              <ConfigDateTime
                label="Encerramento inscrições"
                value={camp?.data_encerramento_inscricoes}
                onChange={(valor) => salvar('data_encerramento_inscricoes', valor)}
                loading={salvandoCampo === 'data_encerramento_inscricoes'}
              />
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <ConfigNumber label="Vagas/equipes" value={camp?.vagas || camp?.quantidade_equipes || 0} min={0} onSave={(valor) => salvar('vagas', valor)} loading={salvandoCampo === 'vagas'} />
              <ConfigNumber label="Valor da vaga" value={valorVagaCompra} min={0} step="0.01" onSave={(valor) => salvar('valor_vaga', valor)} loading={salvandoCampo === 'valor_vaga'} />
              <ConfigNumber label="Premiação" value={camp?.valor_premiacao || 0} min={0} step="0.01" onSave={(valor) => salvar('valor_premiacao', valor)} loading={salvandoCampo === 'valor_premiacao'} />
            </div>
          </ConfigCard>

          <ConfigCard titulo="Contatos de venda" descricao="Cadastre os WhatsApps que aparecem para equipes comprarem vagas pelo link mobile.">
            <ConfigWhatsAppContatos
              key={JSON.stringify(contatosWhatsAppIniciais(camp))}
              value={contatosWhatsAppIniciais(camp)}
              onSave={salvarContatosWhatsApp}
              loading={salvandoCampo === 'whatsapp_contatos'}
            />
          </ConfigCard>

          <ConfigCard titulo="Limite de jogadores" descricao="Esses campos já existem na tabela campeonatos. Não foi criada tabela duplicada.">
            <div className="grid gap-3 md:grid-cols-3">
              <ConfigNumber label="Titulares por equipe" value={camp?.jogadores_por_equipe || 0} min={0} onSave={(valor) => salvar('jogadores_por_equipe', valor)} loading={salvandoCampo === 'jogadores_por_equipe'} />
              <ConfigNumber label="Reservas permitidos" value={camp?.reservas_permitidos || 0} min={0} onSave={(valor) => salvar('reservas_permitidos', valor)} loading={salvandoCampo === 'reservas_permitidos'} />
              <div className="border border-zinc-200 bg-white p-3">
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">Total por equipe</div>
                <div className="mt-2 text-2xl font-black text-[#142340]">{limiteTotalJogadores || '---'}</div>
                <p className="mt-1 text-[11px] font-semibold text-zinc-500">Titulares + reservas.</p>
              </div>
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <ConfigSelect
                label="Troca jogadores"
                value={camp?.troca_jogadores || ''}
                options={[{ value: '', label: 'Não definido' }, { value: 'livre', label: 'Livre' }, { value: 'com_aprovacao', label: 'Com aprovação' }, { value: 'bloqueada', label: 'Bloqueada' }]}
                onChange={(valor) => salvar('troca_jogadores', valor || null)}
                loading={salvandoCampo === 'troca_jogadores'}
              />
              <ConfigToggle label="Substitutos" checked={Boolean(camp?.substitutos_permitidos)} onChange={(valor) => salvar('substitutos_permitidos', valor)} loading={salvandoCampo === 'substitutos_permitidos'} />
              <ConfigToggle label="Check-in obrigatório" checked={Boolean(camp?.checkin_obrigatorio)} onChange={(valor) => salvar('checkin_obrigatorio', valor)} loading={salvandoCampo === 'checkin_obrigatorio'} />
            </div>
          </ConfigCard>

          <ConfigCard titulo="Dados principais" descricao="Ajustes rápidos que aparecem no topo e nas listas públicas.">
            <div className="grid gap-3 md:grid-cols-2">
              <ConfigText label="Nome do campeonato" value={camp?.nome || ''} onSave={(valor) => salvar('nome', valor)} loading={salvandoCampo === 'nome'} />
              <ConfigText label="Plataforma" value={camp?.plataforma || ''} onSave={(valor) => salvar('plataforma', valor || null)} loading={salvandoCampo === 'plataforma'} />
              <ConfigDateTime label="Início" value={camp?.data_inicio} onChange={(valor) => salvar('data_inicio', valor)} loading={salvandoCampo === 'data_inicio'} />
              <ConfigDateTime label="Fim" value={camp?.data_fim} onChange={(valor) => salvar('data_fim', valor)} loading={salvandoCampo === 'data_fim'} />
            </div>
          </ConfigCard>
        </div>

        <aside className="space-y-4">
          <div className="border border-zinc-200 bg-white p-4">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[#2563eb]">Link mobile</div>
            <div className="mt-1 text-lg font-black uppercase text-[#142340]">Inscrição e escalação</div>
            <p className="mt-1 text-xs font-semibold text-zinc-500">Use esse link na descrição dos grupos. Ele abre a página mobile do campeonato para WhatsApp usando o ID real do campeonato.</p>
            <input readOnly value={linkMobile} className="mt-3 h-10 w-full border border-zinc-200 bg-zinc-50 px-3 text-xs font-bold text-[#142340] outline-none" />
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button type="button" onClick={copiarLink} className="h-9 border border-[#2563eb] bg-[#2563eb] px-3 text-[10px] font-black uppercase tracking-wide text-white">
                {copiado ? 'Copiado' : 'Copiar link'}
              </button>
              <a href={linkMobile} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center justify-center border border-zinc-200 bg-white px-3 text-[10px] font-black uppercase tracking-wide text-[#142340]">
                Abrir
              </a>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <ConfigMetric label="Inscritas" value={String(vagasPreenchidas)} />
            <ConfigMetric label="Restantes" value={String(vagasRestantesCompra)} />
            <ConfigMetric label="Vagas" value={String(camp?.vagas || camp?.quantidade_equipes || 0)} />
            <ConfigMetric label="Jogadores" value={limiteTotalJogadores ? String(limiteTotalJogadores) : '---'} />
          </div>

          <div className="border border-amber-200 bg-amber-50 p-4 text-xs font-semibold text-amber-900">
            <div className="text-[10px] font-black uppercase tracking-[0.2em]">Importante</div>
            <p className="mt-2">Para pausar novas inscrições agora, altere o status para rascunho, em andamento, finalizado ou ajuste a data de encerramento. A trava manual separada só deve ser criada depois do SQL confirmar que não existe campo equivalente.</p>
          </div>
        </aside>
      </div>
    </div>
  )
}

function ConfigCard({ titulo, descricao, children }: { titulo: string; descricao?: string; children: ReactNode }) {
  return (
    <section className="border border-zinc-200 bg-white p-4">
      <div className="mb-3 border-b border-zinc-200 pb-3">
        <h3 className="text-sm font-black uppercase tracking-wide text-[#142340]">{titulo}</h3>
        {descricao ? <p className="mt-1 text-xs font-semibold text-zinc-500">{descricao}</p> : null}
      </div>
      {children}
    </section>
  )
}

function ConfigWhatsAppContatos({ value, onSave, loading = false }: {
  value: WhatsContato[]
  onSave: (contatos: WhatsContato[]) => Promise<void>
  loading?: boolean
}) {
  const [contatos, setContatos] = useState<WhatsContatoForm[]>(() =>
    (value.length ? value : [{ nome: '', numero: '' }]).map(contatoParaForm)
  )
  const contatosAtuais = contatos.length ? contatos : value.map(contatoParaForm)

  function atualizarContato(index: number, campo: keyof WhatsContatoForm, valor: string) {
    setContatos((prev) => {
      const proximos = [...prev]
      proximos[index] = { ...proximos[index], [campo]: valor }
      return proximos
    })
  }

  function adicionarContato() {
    setContatos((prev) => {
      const atuais = prev.length ? prev : value.map(contatoParaForm)
      return atuais.length >= 3 ? atuais : [...atuais, { nome: '', codigoPais: PAISES_WHATSAPP[0].codigo, numero: '' }]
    })
  }

  function removerContato(index: number) {
    setContatos((prev) => {
      const atuais = prev.length ? prev : value.map(contatoParaForm)
      const proximos = atuais.filter((_, itemIndex) => itemIndex !== index)
      return proximos.length ? proximos : [{ nome: '', codigoPais: PAISES_WHATSAPP[0].codigo, numero: '' }]
    })
  }

  const contatosParaSalvar = contatosAtuais.map(contatoFormParaContato)
  const contatosValidos = normalizarContatosWhatsApp(contatosParaSalvar)

  return (
    <div className="space-y-3">
      <div className="grid gap-2">
        {contatosAtuais.map((contato, index) => (
          <div key={index} className="grid gap-2 md:grid-cols-[1fr_150px_1fr_auto]">
            <label className="block">
              <span className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">Nome do vendedor</span>
              <input
                value={contato.nome}
                onChange={(event) => atualizarContato(index, 'nome', event.target.value)}
                placeholder={`Vendedor ${index + 1}`}
                className="mt-2 h-9 w-full border border-zinc-200 bg-zinc-50 px-2 text-sm font-bold text-[#142340] outline-none focus:border-[#2563eb]"
              />
            </label>
            <label className="block">
              <span className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">Pais</span>
              <select
                value={contato.codigoPais}
                onChange={(event) => atualizarContato(index, 'codigoPais', event.target.value)}
                className="mt-2 h-9 w-full border border-zinc-200 bg-zinc-50 px-2 text-xs font-black text-[#142340] outline-none focus:border-[#2563eb]"
              >
                {PAISES_WHATSAPP.map((pais) => (
                  <option key={pais.codigo} value={pais.codigo}>
                    {pais.bandeira} +{pais.codigo}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">WhatsApp</span>
              <input
                value={contato.numero}
                onChange={(event) => atualizarContato(index, 'numero', event.target.value)}
                placeholder="91999999999"
                className="mt-2 h-9 w-full border border-zinc-200 bg-zinc-50 px-2 text-sm font-bold text-[#142340] outline-none focus:border-[#2563eb]"
              />
            </label>
            <button
              type="button"
              onClick={() => removerContato(index)}
              className="mt-6 h-9 border border-red-200 bg-white px-3 text-[10px] font-black uppercase text-red-600 hover:bg-red-50"
            >
              Remover
            </button>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2 border-t border-zinc-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={adicionarContato}
          disabled={contatosAtuais.length >= 3}
          className="h-9 border border-zinc-300 bg-white px-3 text-[10px] font-black uppercase text-[#142340] disabled:opacity-50"
        >
          + Contato
        </button>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase text-zinc-500">
            {contatosValidos.length}/3 contato(s) valido(s)
          </span>
          <button
            type="button"
            disabled={loading}
            onClick={() => onSave(contatosParaSalvar)}
            className="h-9 border border-[#2563eb] bg-[#2563eb] px-4 text-[10px] font-black uppercase text-white disabled:opacity-60"
          >
            {loading ? 'Salvando...' : 'Salvar contatos'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ConfigMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-zinc-200 bg-white p-3">
      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">{label}</div>
      <div className="mt-2 text-2xl font-black text-[#142340]">{value}</div>
    </div>
  )
}

function ConfigNumber({ label, value, onSave, min = 0, step = '1', loading = false }: any) {
  const [local, setLocal] = useState(String(value ?? ''))

  useEffect(() => {
    setLocal(String(value ?? ''))
  }, [value])

  return (
    <label className="block border border-zinc-200 bg-white p-3">
      <span className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">{label}</span>
      <div className="mt-2 flex gap-2">
        <input type="number" min={min} step={step} value={local} onChange={(event) => setLocal(event.target.value)} className="h-9 min-w-0 flex-1 border border-zinc-200 bg-zinc-50 px-2 text-sm font-bold text-[#142340] outline-none focus:border-[#2563eb]" />
        <button type="button" disabled={loading} onClick={() => onSave(Number(local || 0))} className="h-9 border border-[#2563eb] bg-[#2563eb] px-3 text-[10px] font-black uppercase text-white disabled:opacity-60">
          {loading ? '...' : 'Salvar'}
        </button>
      </div>
    </label>
  )
}

function ConfigText({ label, value, onSave, loading = false }: any) {
  const [local, setLocal] = useState(String(value ?? ''))

  useEffect(() => {
    setLocal(String(value ?? ''))
  }, [value])

  return (
    <label className="block border border-zinc-200 bg-white p-3">
      <span className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">{label}</span>
      <div className="mt-2 flex gap-2">
        <input value={local} onChange={(event) => setLocal(event.target.value)} className="h-9 min-w-0 flex-1 border border-zinc-200 bg-zinc-50 px-2 text-sm font-bold text-[#142340] outline-none focus:border-[#2563eb]" />
        <button type="button" disabled={loading} onClick={() => onSave(local.trim())} className="h-9 border border-[#2563eb] bg-[#2563eb] px-3 text-[10px] font-black uppercase text-white disabled:opacity-60">
          {loading ? '...' : 'Salvar'}
        </button>
      </div>
    </label>
  )
}

function ConfigDateTime({ label, value, onChange, loading = false }: any) {
  const [local, setLocal] = useState('')

  useEffect(() => {
    if (!value) {
      setLocal('')
      return
    }
    const data = new Date(value)
    if (Number.isNaN(data.getTime())) {
      setLocal('')
      return
    }
    const offset = data.getTimezoneOffset() * 60000
    setLocal(new Date(data.getTime() - offset).toISOString().slice(0, 16))
  }, [value])

  return (
    <label className="block border border-zinc-200 bg-white p-3">
      <span className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">{label}</span>
      <div className="mt-2 flex gap-2">
        <input type="datetime-local" value={local} onChange={(event) => setLocal(event.target.value)} className="h-9 min-w-0 flex-1 border border-zinc-200 bg-zinc-50 px-2 text-xs font-bold text-[#142340] outline-none focus:border-[#2563eb]" />
        <button type="button" disabled={loading} onClick={() => onChange(local)} className="h-9 border border-[#2563eb] bg-[#2563eb] px-3 text-[10px] font-black uppercase text-white disabled:opacity-60">
          {loading ? '...' : 'Salvar'}
        </button>
      </div>
    </label>
  )
}

function ConfigSelect({ label, value, options, onChange, loading = false }: any) {
  return (
    <label className="block border border-zinc-200 bg-white p-3">
      <span className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">{label}</span>
      <select disabled={loading} value={value ?? ''} onChange={(event) => onChange(event.target.value)} className="mt-2 h-9 w-full border border-zinc-200 bg-zinc-50 px-2 text-xs font-bold uppercase text-[#142340] outline-none focus:border-[#2563eb] disabled:opacity-60">
        {options.map((item: any) => <option key={item.value} value={item.value}>{item.label}</option>)}
      </select>
    </label>
  )
}

function ConfigToggle({ label, checked, onChange, loading = false }: any) {
  return (
    <button type="button" disabled={loading} onClick={() => onChange(!checked)} className={`flex h-full min-h-[82px] items-center justify-between gap-3 border p-3 text-left transition disabled:opacity-60 ${checked ? 'border-[#2563eb] bg-blue-50' : 'border-zinc-200 bg-white'}`}>
      <span>
        <span className="block text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">{label}</span>
        <span className="mt-2 block text-sm font-black uppercase text-[#142340]">{checked ? 'Ativado' : 'Desativado'}</span>
      </span>
      <span className={`h-5 w-9 border p-0.5 ${checked ? 'border-[#2563eb] bg-[#2563eb]' : 'border-zinc-300 bg-zinc-100'}`}>
        <span className={`block h-full w-4 bg-white transition ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
      </span>
    </button>
  )
}


function PainelReputacaoCampeonato({
  camp,
  avaliacaoResumo,
  denunciaMetricas,
  reputacaoScore,
  reputacaoSelo,
  loading,
}: {
  camp: any
  avaliacaoResumo: AvaliacaoResumo
  denunciaMetricas: DenunciaMetrica | null
  reputacaoScore: number
  reputacaoSelo: {
    nome: string
    descricao: string
    classes: string
  }
  loading: boolean
}) {
  const taxaResposta = formatarNumero(denunciaMetricas?.taxa_resposta_percentual)
  const taxaResolucao = formatarNumero(denunciaMetricas?.taxa_resolucao_percentual)
  const abertas = formatarNumero(denunciaMetricas?.denuncias_abertas)
  const resolvidas = formatarNumero(denunciaMetricas?.denuncias_resolvidas)
  const totalDenuncias = formatarNumero(denunciaMetricas?.total_denuncias)
  const mediaPrimeiraResposta = formatarNumero(denunciaMetricas?.media_horas_primeira_resposta)

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-6">
        <div className="bg-white border-2 border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex items-center gap-3 mb-5">
            <BadgeCheck size={18} className="text-[#18b54a]" />
            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.25em] text-zinc-400">
                Reputação do campeonato
              </div>
              <div className="text-2xl font-black uppercase italic">{camp?.nome || 'Campeonato'}</div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <div className="text-[64px] leading-none font-black italic">{formatarDecimal(reputacaoScore, 1)}</div>
              <div className="text-[12px] uppercase font-black text-zinc-400 tracking-[0.25em]">
                Score de confiança
              </div>
            </div>

            <div
              className={`w-fit px-4 py-2 border-2 font-black uppercase text-[12px] tracking-[0.2em] ${reputacaoSelo.classes}`}
            >
              {reputacaoSelo.nome}
            </div>
          </div>

          <p className="mt-5 text-[14px] leading-7 text-zinc-600 font-semibold">
            {reputacaoSelo.descricao}. O score considera avaliações, volume de feedback, denúncias em aberto,
            taxa de resposta e taxa de resolução.
          </p>
        </div>

        <div className="bg-zinc-50 border-2 border-black p-6">
          <div className="text-[11px] font-black uppercase tracking-[0.25em] text-zinc-400 mb-4">
            Resumo rápido
          </div>

          <div className="space-y-3">
            <LinhaResumo titulo="Nota média das avaliações" valor={formatarDecimal(avaliacaoResumo.media, 1)} />
            <LinhaResumo titulo="Total de avaliações" valor={String(avaliacaoResumo.total)} />
            <LinhaResumo titulo="Denúncias totais" valor={String(totalDenuncias)} />
            <LinhaResumo titulo="Denúncias abertas" valor={String(abertas)} />
            <LinhaResumo titulo="Denúncias resolvidas" valor={String(resolvidas)} />
            <LinhaResumo titulo="Taxa de resposta" valor={`${formatarDecimal(taxaResposta, 1)}%`} />
            <LinhaResumo titulo="Taxa de resolução" valor={`${formatarDecimal(taxaResolucao, 1)}%`} />
            <LinhaResumo titulo="Tempo médio 1ª resposta" valor={`${formatarDecimal(mediaPrimeiraResposta, 1)}h`} />
          </div>

          {loading && (
            <div className="mt-5 text-[11px] font-black uppercase text-zinc-500">
              Atualizando transparência...
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={<Star size={16} />}
          label="Média avaliações"
          value={formatarDecimal(avaliacaoResumo.media, 1)}
        />
        <MetricCard
          icon={<MessageSquareWarning size={16} />}
          label="Denúncias abertas"
          value={String(abertas)}
        />
        <MetricCard icon={<BadgeCheck size={16} />} label="Taxa resposta" value={`${formatarDecimal(taxaResposta, 1)}%`} />
        <MetricCard icon={<Clock3 size={16} />} label="1ª resposta" value={`${formatarDecimal(mediaPrimeiraResposta, 1)}h`} />
      </div>

      <div className="bg-white border-2 border-black p-6">
        <div className="text-[11px] font-black uppercase tracking-[0.25em] text-zinc-400 mb-3">
          Leitura da reputação
        </div>

        <div className="grid md:grid-cols-3 gap-4 text-[13px] font-semibold text-zinc-700">
          <div className="border border-zinc-200 p-4 bg-zinc-50">
            <div className="font-black uppercase text-[11px] tracking-[0.2em] text-zinc-400 mb-2">
              Avaliações
            </div>
            A nota média e o volume de avaliações ajudam a mostrar consistência real do campeonato.
          </div>

          <div className="border border-zinc-200 p-4 bg-zinc-50">
            <div className="font-black uppercase text-[11px] tracking-[0.2em] text-zinc-400 mb-2">
              Transparência
            </div>
            Muitas denúncias abertas derrubam o score. Resolver rápido reduz o impacto negativo.
          </div>

          <div className="border border-zinc-200 p-4 bg-zinc-50">
            <div className="font-black uppercase text-[11px] tracking-[0.2em] text-zinc-400 mb-2">
              Atendimento
            </div>
            Taxa de resposta e tempo da primeira resposta influenciam diretamente na confiança da página.
          </div>
        </div>
      </div>
    </div>
  )
}

function PainelDenunciasCampeonato({
  metricas,
  denuncias,
  reputacaoScore,
  reputacaoSelo,
  loading,
}: {
  metricas: DenunciaMetrica | null
  denuncias: DenunciaResumo[]
  reputacaoScore: number
  reputacaoSelo: {
    nome: string
    descricao: string
    classes: string
  }
  loading: boolean
}) {
  const total = formatarNumero(metricas?.total_denuncias)
  const abertas = formatarNumero(metricas?.denuncias_abertas)
  const resolvidas = formatarNumero(metricas?.denuncias_resolvidas)
  const taxaResposta = formatarNumero(metricas?.taxa_resposta_percentual)
  const taxaResolucao = formatarNumero(metricas?.taxa_resolucao_percentual)
  const mediaPrimeiraResposta = formatarNumero(metricas?.media_horas_primeira_resposta)

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard icon={<ShieldAlert size={16} />} label="Total" value={String(total)} />
        <MetricCard icon={<MessageSquareWarning size={16} />} label="Abertas" value={String(abertas)} />
        <MetricCard icon={<BadgeCheck size={16} />} label="Resolvidas" value={String(resolvidas)} />
        <MetricCard icon={<Clock3 size={16} />} label="1ª resposta" value={`${formatarDecimal(mediaPrimeiraResposta, 1)}h`} />
        <MetricCard icon={<BadgeCheck size={16} />} label="Taxa resposta" value={`${formatarDecimal(taxaResposta, 1)}%`} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.3fr_0.7fr] gap-6">
        <div className="bg-white border-2 border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex items-center justify-between gap-4 mb-5">
            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.25em] text-zinc-400">
                Transparência pública
              </div>
              <div className="text-2xl font-black uppercase italic">Denúncias do campeonato</div>
            </div>

            <button className="px-4 py-2 border-2 border-black bg-black text-[#7cfc00] text-[11px] font-black uppercase tracking-[0.2em]">
              Abrir denúncia
            </button>
          </div>

          {loading && (
            <div className="mb-4 text-[11px] font-black uppercase text-zinc-500">
              Atualizando denúncias...
            </div>
          )}

          {denuncias.length === 0 ? (
            <div className="border-2 border-dashed border-zinc-300 bg-zinc-50 p-8 text-center">
              <div className="text-[12px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-2">
                Nenhuma denúncia pública
              </div>
              <p className="text-[14px] text-zinc-600 font-semibold">
                Quando houver registros públicos, eles aparecem aqui com status, prioridade, tempo de resposta e
                volume de interação.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {denuncias.map((item) => (
                <CardDenuncia key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-zinc-50 border-2 border-black p-6">
            <div className="text-[11px] font-black uppercase tracking-[0.25em] text-zinc-400 mb-4">
              Resumo da operação
            </div>

            <div className="space-y-3">
              <LinhaResumo titulo="Taxa de resposta" valor={`${formatarDecimal(taxaResposta, 1)}%`} />
              <LinhaResumo titulo="Taxa de resolução" valor={`${formatarDecimal(taxaResolucao, 1)}%`} />
              <LinhaResumo titulo="Denúncias resolvidas" valor={String(resolvidas)} />
              <LinhaResumo titulo="Denúncias abertas" valor={String(abertas)} />
              <LinhaResumo titulo="Tempo médio 1ª resposta" valor={`${formatarDecimal(mediaPrimeiraResposta, 1)}h`} />
            </div>
          </div>

          <div className="bg-white border-2 border-black p-6">
            <div className="text-[11px] font-black uppercase tracking-[0.25em] text-zinc-400 mb-3">
              Impacto na reputação
            </div>

            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="text-[52px] leading-none font-black italic">{formatarDecimal(reputacaoScore, 1)}</div>
                <div className="text-[11px] uppercase font-black tracking-[0.2em] text-zinc-400">
                  Score atual
                </div>
              </div>

              <div className={`px-3 py-2 border-2 font-black uppercase text-[11px] tracking-[0.2em] ${reputacaoSelo.classes}`}>
                {reputacaoSelo.nome}
              </div>
            </div>

            <p className="mt-4 text-[13px] leading-6 text-zinc-600 font-semibold">
              O histórico de denúncias ajuda a medir transparência real, capacidade de resposta e consistência da
              organização.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function CardDenuncia({ item }: { item: DenunciaResumo }) {
  const status = normalizarStatusDenuncia(item.status)
  const prioridade = normalizarPrioridadeDenuncia(item.prioridade)

  return (
    <div className="border border-slate-200 bg-slate-50 p-5">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400">
              {textoSeguro(item.categoria, 'Sem categoria')}
            </div>
            <h3 className="text-[20px] font-black uppercase italic leading-tight mt-1">
              {textoSeguro(item.titulo, 'Denúncia sem título')}
            </h3>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className={`px-3 py-1 border text-[10px] font-black uppercase tracking-[0.2em] ${status.classes}`}>
              {status.label}
            </span>
            <span
              className={`px-3 py-1 border text-[10px] font-black uppercase tracking-[0.2em] ${prioridade.classes}`}
            >
              {prioridade.label}
            </span>
          </div>
        </div>

        <p className="text-[14px] text-zinc-700 font-semibold leading-7">
          {textoSeguro(item.descricao, 'Sem descrição pública.')}
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[12px]">
          <MiniInfo titulo="Tipo alvo" valor={textoSeguro(item.tipo_alvo, '---')} />
          <MiniInfo titulo="Data" valor={formatarDataCurta(item.created_at)} />
          <MiniInfo titulo="Hora" valor={formatarHoraCurta(item.created_at)} />
          <MiniInfo titulo="Respostas" valor={String(formatarNumero(item.total_respostas_publicas))} />
          <MiniInfo titulo="Provas" valor={String(formatarNumero(item.total_provas))} />
          <MiniInfo
            titulo="1ª resposta"
            valor={`${formatarDecimal(formatarNumero(item.horas_ate_primeira_resposta), 1)}h`}
          />
          <MiniInfo titulo="Resolução" value={`${formatarDecimal(formatarNumero(item.horas_ate_resolucao), 1)}h`} />
          <MiniInfo
            titulo="Autor público"
            valor={item.anonima_para_publico ? 'Anônimo' : 'Identificado'}
          />
        </div>
      </div>
    </div>
  )
}

function MetricCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="bg-white border-2 border-black p-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
      <div className="flex items-center gap-2 text-zinc-500 text-[11px] font-black uppercase tracking-[0.2em]">
        {icon}
        {label}
      </div>
      <div className="mt-3 text-3xl font-black italic leading-none">{value}</div>
    </div>
  )
}

function LinhaResumo({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-zinc-200 pb-2">
      <span className="text-[12px] uppercase font-black tracking-[0.15em] text-zinc-400">{titulo}</span>
      <span className="text-[15px] font-black italic">{valor}</span>
    </div>
  )
}

function MiniInfo({
  titulo,
  valor,
  value,
}: {
  titulo: string
  valor?: string
  value?: string
}) {
  const texto = valor ?? value ?? '---'

  return (
    <div className="border border-zinc-200 bg-white p-3">
      <div className="text-[10px] uppercase font-black tracking-[0.15em] text-zinc-400 mb-1">{titulo}</div>
      <div className="text-[13px] font-black">{texto}</div>
    </div>
  )
}


function StatusCampeonatoSelect({
  label = 'Status',
  value,
  onChange,
  compact = false,
}: {
  label?: string
  value?: string | null
  onChange: (valor: string) => void
  compact?: boolean
}) {
  const statusAtual = normalizarStatusCampeonato(value)

  if (compact) {
    return (
      <label className={`inline-flex h-8 items-center gap-2 border px-2 text-[10px] font-medium uppercase tracking-wide ${statusAtual.classes}`}>
        <span className="hidden sm:inline">Status</span>
        <select
          value={statusAtual.value}
          onChange={(event) => onChange(event.target.value)}
          className="h-full bg-transparent text-[10px] font-medium uppercase outline-none"
        >
          {STATUS_CAMPEONATO_OPTIONS.map((item) => (
            <option key={item.value} value={item.value}>{item.label}</option>
          ))}
        </select>
      </label>
    )
  }

  return (
    <div className="flex flex-col">
      <span className="text-[9px] font-black uppercase text-zinc-400">{label}</span>
      <select
        value={statusAtual.value}
        onChange={(event) => onChange(event.target.value)}
        className={`mt-1 h-9 min-w-[150px] border bg-white px-2 text-[12px] font-semibold uppercase tracking-wide outline-none ${statusAtual.classes}`}
      >
        {STATUS_CAMPEONATO_OPTIONS.map((item) => (
          <option key={item.value} value={item.value}>{item.label}</option>
        ))}
      </select>
    </div>
  )
}

function StatEdit({
  label,
  value,
  onSave,
  prefix = '',
  highlight = false,
}: any) {
  const [isEditing, setIsEditing] = useState(false)
  const [tempValue, setTempValue] = useState(value)

  useEffect(() => {
    setTempValue(value)
  }, [value])

  const handleSave = () => {
    onSave(tempValue)
    setIsEditing(false)
  }

  return (
    <div className="flex flex-col cursor-pointer group" onClick={() => !isEditing && setIsEditing(true)}>
      <span className="text-[9px] font-black text-zinc-400 uppercase">{label}</span>

      {isEditing ? (
        <input
          autoFocus
          className="bg-transparent border-b-2 border-[#7cfc00] outline-none font-black italic w-32 text-2xl"
          value={tempValue || ''}
          onChange={(e) => setTempValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
        />
      ) : (
        <span
          className={`text-2xl font-black uppercase italic flex items-center gap-2 ${
            highlight ? 'text-[#7cfc00]' : ''
          }`}
        >
          {prefix}
          {value || '---'}
          <Pencil size={12} className="opacity-0 group-hover:opacity-100 text-zinc-300 transition-opacity" />
        </span>
      )}
    </div>
  )
}

function StatDisplay({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[9px] font-black text-zinc-400 uppercase">{label}</span>
      <span className="text-2xl font-black uppercase italic flex items-center gap-2">{value || '---'}</span>
    </div>
  )
}

function LinhaComprovante({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-zinc-200 pb-3 last:border-b-0 last:pb-0">
      <span className="text-zinc-500">{label}</span>
      <span className={`max-w-[65%] text-right font-black ${mono ? 'font-mono text-xs break-all' : 'uppercase'}`}>{value}</span>
    </div>
  )
}
