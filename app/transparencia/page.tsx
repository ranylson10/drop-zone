'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import {
  Search,
  ShieldAlert,
  BadgeCheck,
  Star,
  Loader2,
  AlertTriangle,
  Clock3,
  MessageSquarePlus,
  X,
  ClipboardList,
  ChevronRight,
  Building2,
  MessageCircleMore,
  TimerReset,
  CircleDot,
  Lock,
  Globe2,
  Eye,
  Trophy,
  Upload,
  Paperclip,
} from 'lucide-react'

type CampeonatoBuscaRow = {
  id: string
  nome: string | null
  logo_url: string | null
  produtoras?:
    | {
        nome?: string | null
      }
    | {
        nome?: string | null
      }[]
    | null
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

type ReputacaoInfo = {
  score: number | null
  selo: {
    nome: string
    descricao: string
    cor: string
    barra: string
  }
}

type ResultadoBusca = {
  id: string
  nome: string
  logo_url: string | null
  produtora_nome: string
  tipo_alvo: 'campeonato' | 'equipe' | 'perfil_jogo' | 'usuario' | 'produtora'
  alvo_id: string
  campeonato_id: string | null
  media_avaliacoes: number | null
  total_avaliacoes: number
  total_denuncias: number
  denuncias_abertas: number
  denuncias_resolvidas: number
  taxa_resposta: number | null
  taxa_resolucao: number | null
  media_primeira_resposta: number | null
  reputacao: ReputacaoInfo
}

type FormDenuncia = {
  tipo_alvo: 'campeonato' | 'equipe' | 'perfil_jogo' | 'usuario' | 'produtora'
  alvo_id: string
  alvo_nome: string
  campeonato_id: string
  categoria: string
  titulo: string
  descricao: string
  publica: boolean
  anonima_para_publico: boolean
}

type MinhaDenunciaRow = {
  id: string
  campeonato_id: string
  titulo: string | null
  categoria: string | null
  status: string | null
  publica: boolean | null
  anonima_para_publico: boolean | null
  created_at: string | null
  primeira_resposta_em: string | null
  resolvida_em: string | null
  tipo_alvo?: string | null
  equipe_id?: string | null
  jogador_id?: string | null
  alvo_user_id?: string | null
  produtora_id?: string | null
  perfil_jogo_id?: string | null
  campeonatos?:
    | {
        id?: string
        nome?: string | null
        logo_url?: string | null
      }
    | {
        id?: string
        nome?: string | null
        logo_url?: string | null
      }[]
    | null
}

type EstatisticasTransparencia = {
  total: number
  abertas: number
  emAnalise: number
  respondidas: number
  aguardando: number
  resolvidas: number
  recusadas: number
  publicas: number
  privadas: number
}

function formatarNumero(valor: any) {
  const numero = Number(valor)
  return Number.isFinite(numero) ? numero : 0
}

function textoSeguro(valor: any, fallback = '') {
  const texto = String(valor || '').trim()
  return texto || fallback
}

function formatarDecimal(valor: number | null | undefined, casas = 1) {
  const numero = Number(valor)
  if (!Number.isFinite(numero)) return '—'
  return numero.toLocaleString('pt-BR', {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  })
}

function formatarDataCurta(valor?: string | null) {
  if (!valor) return '—'
  const data = new Date(valor)
  if (Number.isNaN(data.getTime())) return '—'
  return data.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function formatarDataHora(valor?: string | null) {
  if (!valor) return '—'
  const data = new Date(valor)
  if (Number.isNaN(data.getTime())) return '—'
  return data.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function normalizarProdutora(produtoras: CampeonatoBuscaRow['produtoras']) {
  if (!produtoras) return 'Sem produtora'
  if (Array.isArray(produtoras)) return textoSeguro(produtoras[0]?.nome, 'Sem produtora')
  return textoSeguro(produtoras?.nome, 'Sem produtora')
}

function normalizarCampeonatoRelacionado(
  campeonatos: MinhaDenunciaRow['campeonatos']
): { id: string | null; nome: string; logo_url: string | null } {
  if (!campeonatos) return { id: null, nome: 'Campeonato', logo_url: null }

  if (Array.isArray(campeonatos)) {
    return {
      id: campeonatos[0]?.id || null,
      nome: textoSeguro(campeonatos[0]?.nome, 'Campeonato'),
      logo_url: campeonatos[0]?.logo_url || null,
    }
  }

  return {
    id: campeonatos?.id || null,
    nome: textoSeguro(campeonatos?.nome, 'Campeonato'),
    logo_url: campeonatos?.logo_url || null,
  }
}

function calcularReputacaoReal(args: {
  mediaAvaliacoes: number | null
  totalAvaliacoes: number
  totalDenuncias: number
  denunciasAbertas: number
  denunciasResolvidas: number
  taxaResposta: number | null
  taxaResolucao: number | null
}): ReputacaoInfo {
  const {
    mediaAvaliacoes,
    totalAvaliacoes,
    totalDenuncias,
    denunciasAbertas,
    denunciasResolvidas,
    taxaResposta,
    taxaResolucao,
  } = args

  const semAvaliacoes = totalAvaliacoes === 0
  const semDenuncias = totalDenuncias === 0

  if (semAvaliacoes && semDenuncias) {
    return {
      score: null,
      selo: {
        nome: 'Sem dados',
        descricao: 'Ainda não há avaliações ou denúncias suficientes para reputação.',
        cor: 'bg-zinc-100 text-zinc-600 border-zinc-300',
        barra: 'bg-zinc-400',
      },
    }
  }

  let scoreBase: number | null = null

  if (!semAvaliacoes && mediaAvaliacoes !== null) {
    scoreBase = (mediaAvaliacoes / 5) * 100
  }

  if (scoreBase === null && totalDenuncias > 0) {
    scoreBase = 70
  }

  let ajusteDenuncias = 0

  if (totalDenuncias > 0) {
    ajusteDenuncias -= denunciasAbertas * 12
    ajusteDenuncias += denunciasResolvidas * 3

    if (taxaResposta !== null) {
      ajusteDenuncias += (taxaResposta - 50) * 0.08
    }

    if (taxaResolucao !== null) {
      ajusteDenuncias += (taxaResolucao - 50) * 0.08
    }
  }

  const scoreFinal = Math.max(0, Math.min(100, (scoreBase ?? 0) + ajusteDenuncias))
  const score = Math.round(scoreFinal * 10) / 10

  if (score >= 90) {
    return {
      score,
      selo: {
        nome: 'Elite',
        descricao: 'Avaliação alta e operação consistente.',
        cor: 'bg-lime-50 text-lime-700 border-lime-200',
        barra: 'bg-lime-500',
      },
    }
  }

  if (score >= 80) {
    return {
      score,
      selo: {
        nome: 'Excelente',
        descricao: 'Alta confiança com bom histórico real.',
        cor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        barra: 'bg-emerald-500',
      },
    }
  }

  if (score >= 70) {
    return {
      score,
      selo: {
        nome: 'Boa',
        descricao: 'Boa reputação com base nos dados reais disponíveis.',
        cor: 'bg-blue-50 text-blue-700 border-blue-200',
        barra: 'bg-blue-500',
      },
    }
  }

  if (score >= 55) {
    return {
      score,
      selo: {
        nome: 'Regular',
        descricao: 'Os dados reais mostram espaço para evolução.',
        cor: 'bg-yellow-50 text-yellow-700 border-yellow-200',
        barra: 'bg-yellow-400',
      },
    }
  }

  return {
    score,
    selo: {
      nome: 'Em atenção',
      descricao: 'Os dados reais pedem atenção em avaliação ou atendimento.',
      cor: 'bg-red-50 text-red-700 border-red-200',
      barra: 'bg-red-500',
    },
  }
}

function getStatusStyle(status?: string | null) {
  const valor = String(status || '').toLowerCase()

  switch (valor) {
    case 'aberta':
      return {
        label: 'Aberta',
        className: 'bg-red-50 text-red-700 border-red-200',
      }
    case 'em_analise':
    case 'em análise':
    case 'analise':
      return {
        label: 'Em análise',
        className: 'bg-yellow-50 text-yellow-700 border-yellow-200',
      }
    case 'respondida':
      return {
        label: 'Respondida',
        className: 'bg-blue-50 text-blue-700 border-blue-200',
      }
    case 'resolvida':
      return {
        label: 'Resolvida',
        className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      }
    case 'recusada':
      return {
        label: 'Recusada',
        className: 'bg-zinc-100 text-zinc-600 border-zinc-300',
      }
    case 'arquivada':
      return {
        label: 'Arquivada',
        className: 'bg-zinc-100 text-zinc-600 border-zinc-300',
      }
    default:
      return {
        label: textoSeguro(status, 'Sem status'),
        className: 'bg-zinc-100 text-zinc-600 border-zinc-300',
      }
  }
}

export default function ReputacaoPage() {
  const [busca, setBusca] = useState('')
  const [resultados, setResultados] = useState<ResultadoBusca[]>([])
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [modalAberto, setModalAberto] = useState(false)
  const [campeonatoSelecionado, setCampeonatoSelecionado] = useState<ResultadoBusca | null>(null)

  const [loadingMinhas, setLoadingMinhas] = useState(true)
  const [minhasDenuncias, setMinhasDenuncias] = useState<MinhaDenunciaRow[]>([])
  const [erroMinhas, setErroMinhas] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  const [estatisticasGerais, setEstatisticasGerais] = useState<EstatisticasTransparencia>({
    total: 0,
    abertas: 0,
    emAnalise: 0,
    respondidas: 0,
    aguardando: 0,
    resolvidas: 0,
    recusadas: 0,
    publicas: 0,
    privadas: 0,
  })

  const termoBusca = busca.trim()


  async function carregarEstatisticasGerais() {
    try {
      const { data, error } = await supabase
        .from('denuncias_campeonato')
        .select('status, publica, primeira_resposta_em, resolvida_em')
        .limit(5000)

      if (error) throw error

      const lista = (data || []) as Array<{
        status: string | null
        publica: boolean | null
        primeira_resposta_em: string | null
        resolvida_em: string | null
      }>

      const abertas = lista.filter((item) => String(item.status || '').toLowerCase() === 'aberta').length
      const emAnalise = lista.filter((item) =>
        ['em_analise', 'em análise', 'analise'].includes(String(item.status || '').toLowerCase())
      ).length
      const respondidas = lista.filter((item) => item.primeira_resposta_em).length
      const aguardando = lista.filter((item) => !item.primeira_resposta_em && !item.resolvida_em).length
      const resolvidas = lista.filter((item) => item.resolvida_em || String(item.status || '').toLowerCase() === 'resolvida').length
      const recusadas = lista.filter((item) => String(item.status || '').toLowerCase() === 'recusada').length
      const publicas = lista.filter((item) => item.publica).length

      setEstatisticasGerais({
        total: lista.length,
        abertas,
        emAnalise,
        respondidas,
        aguardando,
        resolvidas,
        recusadas,
        publicas,
        privadas: lista.length - publicas,
      })
    } catch (err) {
      console.error('Erro ao carregar estatísticas da transparência:', err)
      setEstatisticasGerais({
        total: 0,
        abertas: 0,
        emAnalise: 0,
        respondidas: 0,
        aguardando: 0,
        resolvidas: 0,
        recusadas: 0,
        publicas: 0,
        privadas: 0,
      })
    }
  }

  async function carregarUsuarioAtual() {
    try {
      const { data } = await supabase.auth.getUser()
      const id = data?.user?.id || null
      setUserId(id)
      return id
    } catch {
      setUserId(null)
      return null
    }
  }

  async function carregarMinhasDenuncias(forcedUserId?: string | null) {
    setLoadingMinhas(true)
    setErroMinhas('')

    try {
      const uid = forcedUserId ?? userId ?? (await carregarUsuarioAtual())

      if (!uid) {
        setMinhasDenuncias([])
        return
      }

      const { data, error } = await supabase
        .from('denuncias_campeonato')
        .select(
          `
            id,
            campeonato_id,
            titulo,
            categoria,
            status,
            publica,
            anonima_para_publico,
            created_at,
            primeira_resposta_em,
            resolvida_em,
            campeonatos (
              id,
              nome,
              logo_url
            )
          `
        )
        .eq('denunciante_user_id', uid)
        .order('created_at', { ascending: false })
        .limit(6)

      if (error) throw error

      setMinhasDenuncias((data || []) as MinhaDenunciaRow[])
    } catch (err) {
      console.error(err)
      setErroMinhas('Não foi possível carregar suas denúncias agora.')
      setMinhasDenuncias([])
    } finally {
      setLoadingMinhas(false)
    }
  }

  async function buscar() {
    if (!termoBusca) {
      setResultados([])
      setErro('')
      return
    }

    setLoading(true)
    setErro('')

    try {
      const { data: campeonatosData, error: campeonatosError } = await supabase
        .from('campeonatos')
        .select(
          `
            id,
            nome,
            logo_url,
            produtoras (
              nome
            )
          `
        )
        .ilike('nome', `%${termoBusca}%`)
        .limit(20)

      if (campeonatosError) throw campeonatosError

      const campeonatos = ((campeonatosData || []) as CampeonatoBuscaRow[]).filter((item) => item?.id)

      if (campeonatos.length === 0) {
        setResultados([])
        return
      }

      const ids = campeonatos.map((item) => item.id)

      const [
        { data: avaliacoesData, error: avaliacoesError },
        { data: metricasData, error: metricasError },
      ] = await Promise.all([
        supabase
          .from('avaliacoes_campeonato')
          .select('campeonato_id, nota')
          .in('campeonato_id', ids),
        supabase
          .from('v_denuncias_metricas_campeonato')
          .select('*')
          .in('campeonato_id', ids),
      ])

      if (avaliacoesError) throw avaliacoesError
      if (metricasError) {
        console.error('Erro ao carregar métricas de denúncias', metricasError)
      }

      const avaliacoesMap = new Map<string, { total: number; soma: number }>()
      for (const row of (avaliacoesData || []) as any[]) {
        const campeonatoId = String(row?.campeonato_id || '')
        if (!campeonatoId) continue

        const atual = avaliacoesMap.get(campeonatoId) || { total: 0, soma: 0 }
        const nota = Number(row?.nota)

        if (Number.isFinite(nota)) {
          atual.total += 1
          atual.soma += nota
        }

        avaliacoesMap.set(campeonatoId, atual)
      }

      const metricasMap = new Map<string, DenunciaMetrica>()
      for (const row of (metricasData || []) as DenunciaMetrica[]) {
        if (!row?.campeonato_id) continue
        metricasMap.set(String(row.campeonato_id), row)
      }

      const listaFinal: ResultadoBusca[] = campeonatos.map((item) => {
        const resumoAvaliacao = avaliacoesMap.get(item.id) || { total: 0, soma: 0 }
        const metricas = metricasMap.get(item.id)

        const mediaAvaliacoes =
          resumoAvaliacao.total > 0 ? resumoAvaliacao.soma / resumoAvaliacao.total : null

        const totalAvaliacoes = resumoAvaliacao.total
        const totalDenuncias = formatarNumero(metricas?.total_denuncias)
        const denunciasAbertas = formatarNumero(metricas?.denuncias_abertas)
        const denunciasResolvidas = formatarNumero(metricas?.denuncias_resolvidas)
        const taxaResposta =
          metricas?.taxa_resposta_percentual === null ||
          metricas?.taxa_resposta_percentual === undefined
            ? null
            : Number(metricas.taxa_resposta_percentual)
        const taxaResolucao =
          metricas?.taxa_resolucao_percentual === null ||
          metricas?.taxa_resolucao_percentual === undefined
            ? null
            : Number(metricas.taxa_resolucao_percentual)
        const mediaPrimeiraResposta =
          metricas?.media_horas_primeira_resposta === null ||
          metricas?.media_horas_primeira_resposta === undefined
            ? null
            : Number(metricas.media_horas_primeira_resposta)

        const reputacao = calcularReputacaoReal({
          mediaAvaliacoes,
          totalAvaliacoes,
          totalDenuncias,
          denunciasAbertas,
          denunciasResolvidas,
          taxaResposta,
          taxaResolucao,
        })

        return {
          id: item.id,
          nome: textoSeguro(item.nome, 'Campeonato'),
          logo_url: item.logo_url,
          produtora_nome: normalizarProdutora(item.produtoras),
          tipo_alvo: 'campeonato',
          alvo_id: item.id,
          campeonato_id: item.id,
          media_avaliacoes: mediaAvaliacoes === null ? null : Number(mediaAvaliacoes.toFixed(1)),
          total_avaliacoes: totalAvaliacoes,
          total_denuncias: totalDenuncias,
          denuncias_abertas: denunciasAbertas,
          denuncias_resolvidas: denunciasResolvidas,
          taxa_resposta: taxaResposta === null ? null : Number(taxaResposta.toFixed(1)),
          taxa_resolucao: taxaResolucao === null ? null : Number(taxaResolucao.toFixed(1)),
          media_primeira_resposta:
            mediaPrimeiraResposta === null ? null : Number(mediaPrimeiraResposta.toFixed(1)),
          reputacao,
        }
      })

      listaFinal.sort((a, b) => {
        const scoreA = a.reputacao.score ?? -1
        const scoreB = b.reputacao.score ?? -1

        if (scoreB !== scoreA) return scoreB - scoreA
        return a.nome.localeCompare(b.nome)
      })

      setResultados(listaFinal)
    } catch (err: any) {
      console.error(err)
      setErro('Não foi possível carregar os dados reais dessa busca agora.')
      setResultados([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timeout = setTimeout(() => {
      buscar()
    }, 400)

    return () => clearTimeout(timeout)
  }, [busca])

  useEffect(() => {
    let ativo = true

    carregarEstatisticasGerais()

    ;(async () => {
      const uid = await carregarUsuarioAtual()
      if (!ativo) return
      await carregarMinhasDenuncias(uid)
    })()

    return () => {
      ativo = false
    }
  }, [])

  const resumoTopo = useMemo(() => {
    if (resultados.length === 0) {
      return {
        total: 0,
        comScore: 0,
        semScore: 0,
        totalDenuncias: 0,
        abertas: 0,
        resolvidas: 0,
        taxaRespostaMedia: null as number | null,
        taxaResolucaoMedia: null as number | null,
      }
    }

    const taxasResposta = resultados
      .map((item) => item.taxa_resposta)
      .filter((valor): valor is number => Number.isFinite(Number(valor)))

    const taxasResolucao = resultados
      .map((item) => item.taxa_resolucao)
      .filter((valor): valor is number => Number.isFinite(Number(valor)))

    return {
      total: resultados.length,
      comScore: resultados.filter((item) => item.reputacao.score !== null).length,
      semScore: resultados.filter((item) => item.reputacao.score === null).length,
      totalDenuncias: resultados.reduce((acc, item) => acc + item.total_denuncias, 0),
      abertas: resultados.reduce((acc, item) => acc + item.denuncias_abertas, 0),
      resolvidas: resultados.reduce((acc, item) => acc + item.denuncias_resolvidas, 0),
      taxaRespostaMedia:
        taxasResposta.length > 0
          ? taxasResposta.reduce((acc, valor) => acc + valor, 0) / taxasResposta.length
          : null,
      taxaResolucaoMedia:
        taxasResolucao.length > 0
          ? taxasResolucao.reduce((acc, valor) => acc + valor, 0) / taxasResolucao.length
          : null,
    }
  }, [resultados])

  const resumoMinhas = useMemo(() => {
    return {
      total: minhasDenuncias.length,
      abertas: minhasDenuncias.filter((item) => String(item.status) === 'aberta').length,
      emAnalise: minhasDenuncias.filter((item) =>
        ['em_analise', 'em análise', 'analise'].includes(String(item.status || '').toLowerCase())
      ).length,
      respondidas: minhasDenuncias.filter((item) => item.primeira_resposta_em).length,
      aguardando: minhasDenuncias.filter((item) => !item.primeira_resposta_em && !item.resolvida_em).length,
      resolvidas: minhasDenuncias.filter((item) => item.resolvida_em || String(item.status || '').toLowerCase() === 'resolvida').length,
    }
  }, [minhasDenuncias])

  function abrirModal(item?: ResultadoBusca | null) {
    setCampeonatoSelecionado(item || null)
    setModalAberto(true)
  }

  function fecharModal() {
    setModalAberto(false)
    setCampeonatoSelecionado(null)
  }

  async function onDenunciaEnviada() {
    await carregarMinhasDenuncias()
    await carregarEstatisticasGerais()
    fecharModal()
  }

  return (
    <div className="min-h-screen bg-[#f7f7f7] text-[#142340]">
      <div className="border-b border-zinc-200 bg-[#f7f7f7]">
        <div className="mx-auto max-w-[1520px] px-4 pb-4 pt-5 flex flex-col gap-3">
          <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9  bg-[#2563eb] text-white flex items-center justify-center ">
                <ShieldAlert size={22} />
              </div>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-[#2563eb]">
                  TRANSPARÊNCIA
                </p>
                <h1 className="text-[20px] md:text-[22px] font-medium uppercase  leading-none text-[#142340]">
                  CENTRAL DE DENÚNCIAS
                </h1>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => abrirModal()}
                className="h-10 px-4  bg-[#2563eb] text-white font-medium text-[11px] uppercase tracking-[0.12em] inline-flex items-center justify-center gap-2 hover:bg-[#1d4ed8] transition-colors"
              >
                <MessageSquarePlus size={18} />
                Fazer denúncia
              </button>

              <Link
                href="/transparencia/minhas"
                className="h-10 px-4  border border-zinc-300 bg-white text-[#142340] font-medium text-[11px] uppercase tracking-[0.12em] inline-flex items-center justify-center gap-2 hover:bg-zinc-50 transition-colors"
              >
                <ClipboardList size={18} />
                Acompanhar denúncias
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[1.6fr_1fr] gap-3 md:gap-3">
            <div className="border border-zinc-200 bg-white p-3">
              <div className="max-w-3xl">
                <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                  RECLAMAÇÃO, ACOMPANHAMENTO E REPUTAÇÃO
                </p>

                <h2 className="text-[20px] font-semibold leading-tight text-[#111827] md:text-[22px]">
                  Denuncie campeonatos, acompanhe respostas e consulte reputação real.
                </h2>

                <p className="mt-2 text-[13px] leading-6 text-zinc-500">
                  A ideia aqui é ficar na pegada de uma central tipo Reclame Aqui:
                  denúncia visível, acompanhamento do caso, histórico de atendimento e indicadores
                  reais do campeonato.
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => abrirModal()}
                    className="inline-flex h-9 items-center gap-2 bg-[#2563eb] px-4 text-[11px] font-medium uppercase tracking-wide text-white inline-flex items-center gap-2 hover:bg-[#1d4ed8] transition-colors"
                  >
                    <MessageSquarePlus size={16} />
                    Fazer denúncia agora
                  </button>

                  <Link
                    href="/transparencia/minhas"
                    className="inline-flex h-9 items-center gap-2 border border-zinc-300 bg-white px-4 text-[11px] font-medium uppercase tracking-wide text-[#142340] inline-flex items-center gap-2 hover:bg-zinc-50 transition-colors"
                  >
                    <Eye size={16} />
                    Minhas denúncias
                  </Link>
                </div>
              </div>
            </div>

            <div className="border border-zinc-200 bg-white p-3">
              <p className="text-[11px] font-medium uppercase tracking-[0.25em] text-zinc-500 mb-4">
                RESUMO RÁPIDO
              </p>

              <div className="grid grid-cols-2 gap-2">
                <MiniResumo titulo="Total denúncias" valor={String(estatisticasGerais.total)} />
                <MiniResumo titulo="Abertas" valor={String(estatisticasGerais.abertas)} />
                <MiniResumo titulo="Aguardando" valor={String(estatisticasGerais.aguardando)} />
                <MiniResumo titulo="Respondidas" valor={String(estatisticasGerais.respondidas)} />
                <MiniResumo titulo="Em análise" valor={String(estatisticasGerais.emAnalise)} />
                <MiniResumo titulo="Resolvidas" valor={String(estatisticasGerais.resolvidas)} />
              </div>

              <div className="mt-3 border border-zinc-200 bg-zinc-50 p-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center border border-zinc-200 bg-white text-[#2563eb]">
                    <TimerReset size={18} />
                  </div>
                  <div>
                    <div className="text-[12px] font-medium uppercase tracking-wide text-[#111827]">
                      Atendimento e histórico
                    </div>
                    <p className="mt-1 text-[12px] leading-5 text-zinc-500">
                      Busca mostra score, resposta, resolução e tempo médio com base nos dados reais.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className=" border border-zinc-200 bg-white p-3 md:p-3 flex items-center gap-3">
            <div className="w-9 h-9  bg-zinc-50 border border-zinc-200 flex items-center justify-center shrink-0">
              <Search size={18} className="text-zinc-600" />
            </div>

            <input
              placeholder="O que você procura? Busque um campeonato pelo nome..."
              className="w-full outline-none bg-transparent font-medium text-[#142340] placeholder:text-zinc-500"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1520px] px-4 pb-6 pt-4">
        <div className="grid grid-cols-1 xl:grid-cols-[1.35fr_0.9fr] gap-3 xl:gap-8">
          <div className="space-y-3">
            {!termoBusca && (
              <div className="bg-white border border-zinc-200  p-3 text-center">
                <p className="text-[11px] font-medium uppercase tracking-[0.25em] text-zinc-500 mb-2">
                  PESQUISA
                </p>
                <h2 className="text-[20px] font-semibold leading-tight text-[#111827] md:text-[22px]">
                  Busque um campeonato para consultar a reputação
                </h2>
                <p className="text-zinc-500 font-medium mt-3 max-w-2xl mx-auto leading-7">
                  Digite o nome do campeonato para ver score, denúncias, taxa de resposta,
                  resolução e acessar o botão de denúncia logo no card.
                </p>
              </div>
            )}

            {loading && (
              <div className="bg-white border border-zinc-200  p-3 flex items-center justify-center gap-3">
                <Loader2 size={20} className="animate-spin" />
                <span className="font-medium uppercase text-sm tracking-[0.2em]">Buscando...</span>
              </div>
            )}

            {!loading && erro && (
              <div className="bg-red-50 border border-red-200  p-3 flex items-start gap-3">
                <AlertTriangle className="text-red-600 shrink-0 mt-0.5" size={18} />
                <div>
                  <p className="font-medium uppercase text-red-700 text-sm">Erro ao carregar</p>
                  <p className="text-red-600 font-medium text-[13px] mt-1">{erro}</p>
                </div>
              </div>
            )}

            {!loading && termoBusca && !erro && resultados.length === 0 && (
              <div className="bg-white border border-zinc-200  p-3 text-center">
                <p className="text-[11px] font-medium uppercase tracking-[0.25em] text-zinc-500 mb-2">
                  SEM RESULTADOS
                </p>
                <h2 className="text-[20px] font-semibold leading-tight text-[#142340]">
                  Nenhum campeonato encontrado
                </h2>
                <p className="text-zinc-500 font-medium mt-3">
                  Tenta outro nome ou uma parte do nome do campeonato.
                </p>
              </div>
            )}

            <div className="space-y-3">
              {resultados.map((item) => (
                <CardCampeonato
                  key={item.id}
                  item={item}
                  onDenunciar={() => abrirModal(item)}
                />
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className="bg-white border border-zinc-200  overflow-hidden">
              <div className="px-5 md:px-6 py-3 border-b border-zinc-200 bg-zinc-50">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-[0.25em] text-zinc-500">
                      ACOMPANHAMENTO
                    </p>
                    <h3 className="text-[18px] font-medium text-[#142340] mt-1">Minhas denúncias</h3>
                  </div>

                  <Link
                    href="/transparencia/minhas"
                    className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#2563eb] inline-flex items-center gap-1"
                  >
                    Ver tudo
                    <ChevronRight size={15} />
                  </Link>
                </div>
              </div>

              <div className="p-3">
                <div className="mb-3 grid grid-cols-2 gap-2">
                  <MiniResumo titulo="Total" valor={String(resumoMinhas.total)} />
                  <MiniResumo titulo="Abertas" valor={String(resumoMinhas.abertas)} />
                  <MiniResumo titulo="Aguardando" valor={String(resumoMinhas.aguardando)} />
                  <MiniResumo titulo="Respondidas" valor={String(resumoMinhas.respondidas)} />
                  <MiniResumo titulo="Em análise" valor={String(resumoMinhas.emAnalise)} />
                  <MiniResumo titulo="Resolvidas" valor={String(resumoMinhas.resolvidas)} />
                </div>

                {loadingMinhas && (
                  <div className="border border-zinc-200  p-3 flex items-center justify-center gap-3">
                    <Loader2 size={18} className="animate-spin" />
                    <span className="font-medium text-[13px] text-zinc-500">Carregando suas denúncias...</span>
                  </div>
                )}

                {!loadingMinhas && erroMinhas && (
                  <div className="border border-red-200 bg-red-50  p-3 text-sm font-medium text-red-700">
                    {erroMinhas}
                  </div>
                )}

                {!loadingMinhas && !erroMinhas && !userId && (
                  <div className="border border-zinc-200  p-3 bg-zinc-50">
                    <div className="flex items-start gap-3">
                      <Lock size={18} className="text-zinc-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="font-medium uppercase text-sm text-[#142340]">
                          Faça login para acompanhar
                        </p>
                        <p className="text-sm text-zinc-500 mt-1 leading-6">
                          Você precisa estar logado para visualizar e acompanhar suas denúncias.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {!loadingMinhas && !erroMinhas && userId && minhasDenuncias.length === 0 && (
                  <div className="border border-zinc-200  p-3 bg-zinc-50">
                    <p className="font-medium uppercase text-sm text-[#142340]">
                      Nenhuma denúncia enviada ainda
                    </p>
                    <p className="text-sm text-zinc-500 mt-1 leading-6">
                      Quando você abrir uma denúncia, ela vai aparecer aqui para acompanhamento.
                    </p>

                    <button
                      type="button"
                      onClick={() => abrirModal()}
                      className="mt-4 inline-flex h-9 items-center gap-2 bg-[#2563eb] px-4 text-[11px] font-medium uppercase tracking-wide text-white inline-flex items-center gap-2 hover:bg-[#1d4ed8] transition-colors"
                    >
                      <MessageSquarePlus size={16} />
                      Fazer primeira denúncia
                    </button>
                  </div>
                )}

                {!loadingMinhas && !erroMinhas && userId && minhasDenuncias.length > 0 && (
                  <div className="space-y-3">
                    {minhasDenuncias.map((item) => (
                      <CardMinhaDenuncia key={item.id} item={item} />
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="border border-zinc-200 bg-white p-3">
              <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                COMO FUNCIONA
              </p>

              <div className="space-y-3">
                <InfoPasso
                  icon={<MessageSquarePlus size={18} />}
                  titulo="1. Abra a denúncia"
                  texto="Escolha o campeonato, escreva o título do problema e descreva o caso com o máximo de detalhe."
                />
                <InfoPasso
                  icon={<MessageCircleMore size={18} />}
                  titulo="2. Acompanhe as respostas"
                  texto="Quando houver retorno, sua denúncia muda de status e aparece no acompanhamento."
                />
                <InfoPasso
                  icon={<Trophy size={18} />}
                  titulo="3. Reputação é baseada em dados"
                  texto="O score leva em conta avaliações, denúncias abertas, resolvidas, taxa de resposta e taxa de resolução."
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {modalAberto && (
        <ModalDenuncia
          campeonato={campeonatoSelecionado}
          onClose={fecharModal}
          onSuccess={onDenunciaEnviada}
        />
      )}
    </div>
  )
}

function CardCampeonato({
  item,
  onDenunciar,
}: {
  item: ResultadoBusca
  onDenunciar: () => void
}) {
  return (
    <div className="border border-zinc-200 bg-white p-3">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-start gap-3 min-w-0">
          <img
            src={item.logo_url || '/placeholder.png'}
            className="h-12 w-12 object-contain  border border-zinc-200 bg-zinc-50 p-1 shrink-0"
            alt={item.nome}
          />

          <div className="min-w-0">
            <div className="text-[16px] font-semibold leading-tight break-words text-[#111827]">
              {item.nome}
            </div>

            <div className="mt-1 text-[10px] font-medium uppercase tracking-wide text-zinc-500 inline-flex items-center gap-2">
              <Building2 size={13} />
              {item.produtora_nome}
            </div>

            <p className="mt-2 text-[12px] leading-5 text-zinc-500">
              {item.reputacao.selo.descricao}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 xl:min-w-[560px]">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
            <div>
              <div className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                Score de reputação
              </div>
              <div className="mt-1 text-[28px] font-semibold leading-none text-[#111827]">
                {item.reputacao.score === null ? '—' : formatarDecimal(item.reputacao.score, 1)}
              </div>
            </div>

            <div
              className={`w-fit px-4 py-2  border text-[11px] font-medium uppercase tracking-[0.2em] ${item.reputacao.selo.cor}`}
            >
              {item.reputacao.selo.nome}
            </div>
          </div>

          <BarraReputacao score={item.reputacao.score} cor={item.reputacao.selo.barra} />

          <div className="flex flex-wrap items-center gap-2 md:gap-3">
            <Badge
              icon={<Star size={14} />}
              label={
                item.media_avaliacoes === null
                  ? 'Sem avaliações'
                  : `${formatarDecimal(item.media_avaliacoes, 1)} (${item.total_avaliacoes})`
              }
            />
            <Badge icon={<ShieldAlert size={14} />} label={`${item.total_denuncias} denúncias`} />
            <Badge icon={<AlertTriangle size={14} />} label={`${item.denuncias_abertas} abertas`} />
            <Badge
              icon={<BadgeCheck size={14} />}
              label={
                item.taxa_resposta === null
                  ? 'Sem taxa resposta'
                  : `${formatarDecimal(item.taxa_resposta, 1)}% resposta`
              }
            />
            <Badge
              icon={<BadgeCheck size={14} />}
              label={
                item.taxa_resolucao === null
                  ? 'Sem taxa resolução'
                  : `${formatarDecimal(item.taxa_resolucao, 1)}% resolução`
              }
            />
            <Badge
              icon={<Clock3 size={14} />}
              label={
                item.media_primeira_resposta === null
                  ? 'Sem tempo resposta'
                  : `${formatarDecimal(item.media_primeira_resposta, 1)}h 1ª resposta`
              }
            />
          </div>

          <div className="flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={onDenunciar}
              className="inline-flex h-9 items-center gap-2 bg-red-500 px-4 text-[11px] font-medium uppercase tracking-wide text-white hover:bg-red-600 transition-colors inline-flex items-center gap-2"
            >
              <MessageSquarePlus size={14} />
              Denunciar
            </button>

            <Link
              href={`/transparencia/campeonato/${item.id}`}
              className="inline-flex h-9 items-center gap-2 border border-zinc-300 bg-white px-4 text-[11px] font-medium uppercase tracking-wide text-[#142340] hover:bg-[#2563eb] transition-colors inline-flex items-center gap-2"
            >
              Ver detalhes
              <ChevronRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

function CardMinhaDenuncia({ item }: { item: MinhaDenunciaRow }) {
  const status = getStatusStyle(item.status)
  const campeonato = normalizarCampeonatoRelacionado(item.campeonatos)

  return (
    <Link
      href={`/transparencia/denuncia/${item.id}`}
      className="block border border-zinc-200 bg-white transition-colors hover:bg-zinc-50"
    >
      <div className="p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <img
              src={campeonato.logo_url || '/placeholder.png'}
              alt={campeonato.nome}
              className="h-10 w-10  object-contain border border-zinc-200 bg-zinc-50 p-1 shrink-0"
            />

            <div className="min-w-0">
              <div className="text-[13px] font-medium leading-5 text-[#111827] break-words">
                {textoSeguro(item.titulo, 'Denúncia')}
              </div>

              <div className="mt-1 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                {campeonato.nome}
              </div>

              <div className="flex flex-wrap items-center gap-2 mt-3">
                <span
                  className={`border px-2 py-1 text-[10px] font-medium uppercase tracking-wide ${status.className}`}
                >
                  {status.label}
                </span>

                <span className="px-2.5 py-1  border border-zinc-200 bg-zinc-50 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                  {textoSeguro(item.categoria, 'Outro')}
                </span>

                <span className="px-2.5 py-1  border border-zinc-200 bg-zinc-50 text-[10px] font-medium uppercase tracking-wide text-zinc-500 inline-flex items-center gap-1.5">
                  {item.publica ? <Globe2 size={12} /> : <Lock size={12} />}
                  {item.publica ? 'Pública' : 'Privada'}
                </span>
              </div>
            </div>
          </div>

          <ChevronRight size={16} className="text-zinc-500 shrink-0 mt-1" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
          <IndicadorMinhaDenuncia label="Criada em" valor={formatarDataCurta(item.created_at)} />
          <IndicadorMinhaDenuncia
            label="1ª resposta"
            valor={item.primeira_resposta_em ? formatarDataCurta(item.primeira_resposta_em) : 'Aguardando'}
          />
          <IndicadorMinhaDenuncia
            label="Resolução"
            valor={item.resolvida_em ? formatarDataCurta(item.resolvida_em) : 'Em andamento'}
          />
        </div>
      </div>
    </Link>
  )
}

function ModalDenuncia({
  campeonato,
  onClose,
  onSuccess,
}: {
  campeonato: ResultadoBusca | null
  onClose: () => void
  onSuccess?: () => void | Promise<void>
}) {
  const [form, setForm] = useState<FormDenuncia>({
    tipo_alvo: campeonato?.tipo_alvo || 'campeonato',
    alvo_id: campeonato?.alvo_id || campeonato?.id || '',
    alvo_nome: campeonato?.nome || '',
    campeonato_id: campeonato?.campeonato_id || campeonato?.id || '',
    categoria: 'organizacao',
    titulo: '',
    descricao: '',
    publica: true,
    anonima_para_publico: false,
  })
  const [buscaAlvo, setBuscaAlvo] = useState(campeonato?.nome || '')
  const [opcoesAlvo, setOpcoesAlvo] = useState<Array<{ id: string; nome: string; logo_url?: string | null }>>([])
  const [buscandoAlvo, setBuscandoAlvo] = useState(false)
  const [arquivos, setArquivos] = useState<File[]>([])
  const [enviando, setEnviando] = useState(false)
  const [mensagem, setMensagem] = useState('')

  const LIMITE_PROVAS = 8
  const LIMITE_MB_POR_ARQUIVO = 20
  const LIMITE_BYTES_POR_ARQUIVO = LIMITE_MB_POR_ARQUIVO * 1024 * 1024

  const previewsArquivos = useMemo(() => {
    return arquivos.map((arquivo) => ({
      key: `${arquivo.name}-${arquivo.size}-${arquivo.lastModified}`,
      arquivo,
      previewUrl: arquivo.type?.startsWith('image/') ? URL.createObjectURL(arquivo) : '',
    }))
  }, [arquivos])

  useEffect(() => {
    return () => {
      previewsArquivos.forEach((item) => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl)
      })
    }
  }, [previewsArquivos])

  function formatarTamanhoArquivo(bytes: number) {
    if (!bytes) return '0 KB'
    if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
    return `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB`
  }

  function adicionarArquivos(lista: FileList | File[]) {
    const recebidos = Array.from(lista || [])
    if (recebidos.length === 0) return

    setArquivos((atuais) => {
      const proximos = [...atuais]
      const rejeitados: string[] = []

      for (const arquivo of recebidos) {
        if (arquivo.size > LIMITE_BYTES_POR_ARQUIVO) {
          rejeitados.push(`${arquivo.name} passou de ${LIMITE_MB_POR_ARQUIVO} MB`)
          continue
        }

        const chave = `${arquivo.name}-${arquivo.size}-${arquivo.lastModified}`
        const jaExiste = proximos.some((item) => `${item.name}-${item.size}-${item.lastModified}` === chave)
        if (jaExiste) continue

        if (proximos.length >= LIMITE_PROVAS) {
          rejeitados.push(`limite de ${LIMITE_PROVAS} provas por denúncia`)
          break
        }

        proximos.push(arquivo)
      }

      if (rejeitados.length > 0) {
        setMensagem(`Alguns arquivos não foram adicionados: ${Array.from(new Set(rejeitados)).join(', ')}.`)
      } else {
        setMensagem('')
      }

      return proximos
    })
  }

  function removerArquivo(chave: string) {
    setArquivos((atuais) => atuais.filter((arquivo) => `${arquivo.name}-${arquivo.size}-${arquivo.lastModified}` !== chave))
  }

  async function comprimirImagemSePreciso(arquivo: File): Promise<File> {
    const tipo = arquivo.type || ''
    const naoComprime = !tipo.startsWith('image/') || tipo.includes('gif') || tipo.includes('svg') || arquivo.size < 700 * 1024
    if (naoComprime) return arquivo

    return new Promise((resolve) => {
      const img = new Image()
      const objectUrl = URL.createObjectURL(arquivo)

      img.onload = () => {
        URL.revokeObjectURL(objectUrl)

        const maxLado = 1600
        const escala = Math.min(1, maxLado / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.max(1, Math.round(img.width * escala))
        canvas.height = Math.max(1, Math.round(img.height * escala))

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve(arquivo)
          return
        }

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        canvas.toBlob(
          (blob) => {
            if (!blob || blob.size >= arquivo.size) {
              resolve(arquivo)
              return
            }

            const nomeBase = arquivo.name.replace(/\.[^.]+$/, '') || 'prova'
            resolve(new File([blob], `${nomeBase}.jpg`, { type: 'image/jpeg', lastModified: Date.now() }))
          },
          'image/jpeg',
          0.82,
        )
      }

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl)
        resolve(arquivo)
      }

      img.src = objectUrl
    })
  }

  const alvoSelecionado = form.alvo_id && form.alvo_nome

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      tipo_alvo: campeonato?.tipo_alvo || 'campeonato',
      alvo_id: campeonato?.alvo_id || campeonato?.id || '',
      alvo_nome: campeonato?.nome || '',
      campeonato_id: campeonato?.campeonato_id || campeonato?.id || '',
    }))
    setBuscaAlvo(campeonato?.nome || '')
  }, [campeonato])

  async function buscarAlvos() {
    const termo = buscaAlvo.trim()
    if (!termo) {
      setOpcoesAlvo([])
      return
    }

    setBuscandoAlvo(true)

    try {
      let query: any
      if (form.tipo_alvo === 'campeonato') {
        query = supabase.from('campeonatos').select('id, nome, logo_url').ilike('nome', `%${termo}%`).limit(10)
      } else if (form.tipo_alvo === 'equipe') {
        query = supabase.from('equipes').select('id, nome, logo_url').ilike('nome', `%${termo}%`).limit(10)
      } else if (form.tipo_alvo === 'perfil_jogo') {
        query = supabase.from('perfis_jogo').select('id, nick, foto_capa').ilike('nick', `%${termo}%`).limit(10)
      } else if (form.tipo_alvo === 'produtora') {
        query = supabase.from('produtoras').select('id, nome, logo_url').ilike('nome', `%${termo}%`).limit(10)
      } else {
        query = supabase.from('perfis').select('id, nome, avatar_url').ilike('nome', `%${termo}%`).limit(10)
      }

      const { data, error } = await query
      if (error) throw error

      const lista = (data || []).map((item: any) => ({
        id: item.id,
        nome: textoSeguro(item.nome || item.nick, 'Sem nome'),
        logo_url: item.logo_url || item.foto_capa || item.avatar_url || null,
      }))

      setOpcoesAlvo(lista)
    } catch (err) {
      console.error(err)
      setOpcoesAlvo([])
      setMensagem('Não consegui buscar esse tipo de alvo agora.')
    } finally {
      setBuscandoAlvo(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(buscarAlvos, 350)
    return () => clearTimeout(timer)
  }, [buscaAlvo, form.tipo_alvo])

  function selecionarAlvo(item: { id: string; nome: string }) {
    setForm((prev) => ({
      ...prev,
      alvo_id: item.id,
      alvo_nome: item.nome,
      campeonato_id: prev.tipo_alvo === 'campeonato' ? item.id : prev.campeonato_id,
    }))
    setBuscaAlvo(item.nome)
    setOpcoesAlvo([])
  }

  function trocarTipoAlvo(tipo: FormDenuncia['tipo_alvo']) {
    setForm((prev) => ({
      ...prev,
      tipo_alvo: tipo,
      alvo_id: '',
      alvo_nome: '',
      campeonato_id: tipo === 'campeonato' ? '' : prev.campeonato_id,
    }))
    setBuscaAlvo('')
    setOpcoesAlvo([])
  }

  async function enviarDenuncia(e: React.FormEvent) {
    e.preventDefault()
    setMensagem('')

    if (!form.alvo_id || !form.alvo_nome) {
      setMensagem('Escolhe quem você quer denunciar.')
      return
    }

    if (!form.titulo.trim() || !form.descricao.trim()) {
      setMensagem('Preenche título e descrição.')
      return
    }

    setEnviando(true)

    try {
      const { data: authData } = await supabase.auth.getUser()
      const user = authData?.user

      if (!user) {
        setMensagem('Você precisa estar logado para denunciar.')
        return
      }

      const payload: any = {
        denunciante_user_id: user.id,
        tipo_alvo: form.tipo_alvo,
        categoria: form.categoria,
        titulo: form.titulo.trim(),
        descricao: form.descricao.trim(),
        status: 'aberta',
        prioridade: 'media',
        publica: form.publica,
        anonima_para_publico: form.anonima_para_publico,
      }

      // campeonato_id pode ser nulo para denúncias gerais (usuário, produtora, perfil etc.),
      // mas quando vier preenchido mantemos para vincular a denúncia ao contexto do campeonato.
      if (form.tipo_alvo === 'campeonato') {
        payload.campeonato_id = form.alvo_id
      } else if (form.campeonato_id) {
        payload.campeonato_id = form.campeonato_id
      }

      if (form.tipo_alvo === 'equipe') {
        // ATENÇÃO: denuncias_campeonato.equipe_id NÃO aponta para public.equipes.
        // A FK correta aponta para public.campeonato_equipes(id).
        // Por isso aceitamos tanto um id já vindo de campeonato_equipes quanto um id vindo de equipes
        // e convertemos para campeonato_equipes.id antes do insert.
        let campeonatoEquipeIdFinal: string | null = null

        const { data: vinculoDireto, error: vinculoDiretoError } = await supabase
          .from('campeonato_equipes')
          .select('id, campeonato_id, equipe_id')
          .eq('id', form.alvo_id)
          .maybeSingle()

        if (vinculoDiretoError) throw vinculoDiretoError

        if (vinculoDireto?.id) {
          campeonatoEquipeIdFinal = vinculoDireto.id
          if (!payload.campeonato_id && vinculoDireto.campeonato_id) {
            payload.campeonato_id = vinculoDireto.campeonato_id
          }
        }

        if (!campeonatoEquipeIdFinal && form.campeonato_id) {
          const { data: vinculoPorCampeonato, error: vinculoPorCampeonatoError } = await supabase
            .from('campeonato_equipes')
            .select('id, campeonato_id, equipe_id')
            .eq('campeonato_id', form.campeonato_id)
            .eq('equipe_id', form.alvo_id)
            .maybeSingle()

          if (vinculoPorCampeonatoError) throw vinculoPorCampeonatoError

          if (vinculoPorCampeonato?.id) {
            campeonatoEquipeIdFinal = vinculoPorCampeonato.id
            if (!payload.campeonato_id && vinculoPorCampeonato.campeonato_id) {
              payload.campeonato_id = vinculoPorCampeonato.campeonato_id
            }
          }
        }

        if (!campeonatoEquipeIdFinal) {
          const { data: vinculosPorEquipe, error: vinculosPorEquipeError } = await supabase
            .from('campeonato_equipes')
            .select('id, campeonato_id, equipe_id')
            .eq('equipe_id', form.alvo_id)
            .order('created_at', { ascending: false })
            .limit(1)

          if (vinculosPorEquipeError) throw vinculosPorEquipeError

          const primeiroVinculo = vinculosPorEquipe?.[0]
          if (primeiroVinculo?.id) {
            campeonatoEquipeIdFinal = primeiroVinculo.id
            if (!payload.campeonato_id && primeiroVinculo.campeonato_id) {
              payload.campeonato_id = primeiroVinculo.campeonato_id
            }
          }
        }

        if (!campeonatoEquipeIdFinal) {
          setMensagem('Essa equipe ainda não está vinculada a um campeonato. Não dá para abrir denúncia de equipe sem vínculo em campeonato_equipes.')
          setEnviando(false)
          return
        }

        payload.equipe_id = campeonatoEquipeIdFinal
      }

      if (form.tipo_alvo === 'jogador') payload.jogador_id = form.alvo_id
      if (form.tipo_alvo === 'perfil_jogo') payload.perfil_jogo_id = form.alvo_id
      if (form.tipo_alvo === 'usuario') payload.alvo_user_id = form.alvo_id
      if (form.tipo_alvo === 'produtora') payload.produtora_id = form.alvo_id

      const { data: denunciaCriada, error } = await supabase
        .from('denuncias_campeonato')
        .insert(payload)
        .select('id')
        .single()

      if (error) throw error

      if (arquivos.length > 0 && denunciaCriada?.id) {
        const provasParaSalvar: any[] = []

        for (const arquivoOriginal of arquivos) {
          const arquivo = await comprimirImagemSePreciso(arquivoOriginal)
          const nomeLimpo = arquivo.name.replace(/[^a-zA-Z0-9._-]/g, '_')
          const ext = nomeLimpo.split('.').pop() || 'bin'
          const caminho = `${user.id}/${denunciaCriada.id}/${Date.now()}-${Math.random()
            .toString(36)
            .slice(2)}.${ext}`

          const { error: uploadError } = await supabase.storage
            .from('denuncias')
            .upload(caminho, arquivo, { upsert: false, contentType: arquivo.type || undefined })

          if (uploadError) throw uploadError

          const { data: publicData } = supabase.storage.from('denuncias').getPublicUrl(caminho)

          provasParaSalvar.push({
            denuncia_id: denunciaCriada.id,
            nome_arquivo: arquivoOriginal.name,
            url_arquivo: publicData.publicUrl,
            mime_type: arquivo.type || arquivoOriginal.type || null,
            tamanho_bytes: arquivo.size,
            visibilidade: 'publica',
            uploaded_by_user_id: user.id,
          })
        }

        if (provasParaSalvar.length > 0) {
          const { error: provasError } = await supabase.from('denuncias_provas').insert(provasParaSalvar)
          if (provasError) throw provasError
        }
      }

      setForm({
        tipo_alvo: 'campeonato',
        alvo_id: '',
        alvo_nome: '',
        campeonato_id: '',
        categoria: 'organizacao',
        titulo: '',
        descricao: '',
        publica: true,
        anonima_para_publico: false,
      })
      setArquivos([])

      if (onSuccess) {
        await onSuccess()
      } else {
        setMensagem('Denúncia enviada com sucesso.')
      }
    } catch (err: any) {
      const detalhesErro = { message: err?.message || null, details: err?.details || null, hint: err?.hint || null, code: err?.code || null, name: err?.name || null }
      console.error('Erro ao enviar denúncia:', detalhesErro, err)
      setMensagem(err?.message || err?.details || 'Não foi possível enviar a denúncia agora. Abra o console e veja Erro ao enviar denúncia.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-3">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative z-[201] max-h-[92vh] w-full max-w-4xl overflow-y-auto border border-zinc-200 bg-white">
        <div className="flex items-start justify-between gap-3 border-b border-zinc-200 bg-zinc-50 p-3">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide text-[#2563eb]">
              Fazer denúncia
            </p>
            <h2 className="mt-1 text-[18px] font-medium text-[#111827]">Abrir reclamação pública</h2>

            <p className="mt-1 text-[12px] leading-5 text-zinc-500 max-w-2xl">
              Modelo Reclame Aqui: escolha o denunciado, descreva o problema, anexe provas e acompanhe
              a resposta do outro lado.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center border border-zinc-200 bg-white hover:bg-zinc-50 transition-colors shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={enviarDenuncia} className="p-3 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Campo>
              <label className="block mb-2 block text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                Quem será denunciado
              </label>
              <select
                value={form.tipo_alvo}
                onChange={(e) => trocarTipoAlvo(e.target.value as FormDenuncia['tipo_alvo'])}
                className="h-10 w-full border border-zinc-300 bg-white px-3 text-[13px] font-medium text-[#142340] outline-none focus:border-[#2563eb]"
              >
                <option value="campeonato">Campeonato</option>
                <option value="equipe">Equipe</option>
                <option value="perfil_jogo">Perfil de jogo</option>
                <option value="usuario">Usuário</option>
                <option value="produtora">Produtora</option>
              </select>
            </Campo>

            <Campo>
              <label className="block mb-2 block text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                Buscar alvo
              </label>
              <div className="relative">
                <input
                  value={buscaAlvo}
                  onChange={(e) => {
                    setBuscaAlvo(e.target.value)
                    setForm((prev) => ({ ...prev, alvo_id: '', alvo_nome: '' }))
                  }}
                  className="h-10 w-full border border-zinc-300 bg-white px-3 text-[13px] font-medium text-[#142340] outline-none focus:border-[#2563eb]"
                  placeholder="Digite o nome..."
                />

                {(opcoesAlvo.length > 0 || buscandoAlvo) && (
                  <div className="absolute left-0 right-0 top-11 z-20 border border-zinc-200 bg-white ">
                    {buscandoAlvo && (
                      <div className="px-3 py-3 text-sm text-zinc-400 flex items-center gap-2">
                        <Loader2 size={14} className="animate-spin" />
                        Buscando...
                      </div>
                    )}

                    {!buscandoAlvo &&
                      opcoesAlvo.map((item) => (
                        <button
                          type="button"
                          key={item.id}
                          onClick={() => selecionarAlvo(item)}
                          className="w-full px-3 py-3 text-left flex items-center gap-3 hover:bg-white border-b border-zinc-200 last:border-b-0"
                        >
                          <div className="w-8 h-8 border border-zinc-200 bg-white flex items-center justify-center overflow-hidden">
                            {item.logo_url ? (
                              <img src={item.logo_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <ShieldAlert size={15} className="text-zinc-500" />
                            )}
                          </div>
                          <span className="text-sm font-medium text-[#142340]">{item.nome}</span>
                        </button>
                      ))}
                  </div>
                )}
              </div>
            </Campo>

            <Campo>
              <label className="block mb-2 block text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                Selecionado
              </label>
              <div className="h-10 border border-zinc-200 bg-white px-3 flex items-center text-sm font-medium text-[#142340]">
                {alvoSelecionado ? form.alvo_nome : 'Nenhum alvo selecionado'}
              </div>
            </Campo>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Campo>
              <label className="block mb-2 block text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                Categoria
              </label>
              <select
                value={form.categoria}
                onChange={(e) => setForm((prev) => ({ ...prev, categoria: e.target.value }))}
                className="h-10 w-full border border-zinc-300 bg-white px-3 text-[13px] font-medium text-[#142340] outline-none focus:border-[#2563eb]"
              >
                <option value="organizacao">Organização</option>
                <option value="premiacao">Premiação</option>
                <option value="resultado">Resultado</option>
                <option value="regra">Regra</option>
                <option value="suporte">Suporte</option>
                <option value="conduta">Conduta</option>
                <option value="fraude">Fraude</option>
                <option value="outro">Outro</option>
              </select>
            </Campo>

            <Campo>
              <label className="block mb-2 block text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                Visibilidade
              </label>
              <div className="h-10 border border-zinc-300 bg-white px-4 flex items-center gap-3">
                {form.publica ? <Globe2 size={16} /> : <Lock size={16} />}
                <span className="text-[13px] font-medium text-zinc-600">
                  {form.publica ? 'Denúncia pública' : 'Denúncia privada'}
                </span>
              </div>
            </Campo>
          </div>

          <Campo>
            <label className="block mb-2 block text-[10px] font-medium uppercase tracking-wide text-zinc-500">
              Título
            </label>
            <input
              value={form.titulo}
              onChange={(e) => setForm((prev) => ({ ...prev, titulo: e.target.value }))}
              className="h-10 w-full border border-zinc-300 bg-white px-3 text-[13px] font-medium text-[#142340] outline-none focus:border-[#2563eb]"
              placeholder="Resumo curto da denúncia"
            />
          </Campo>

          <Campo>
            <label className="block mb-2 block text-[10px] font-medium uppercase tracking-wide text-zinc-500">
              Descrição
            </label>
            <textarea
              value={form.descricao}
              onChange={(e) => setForm((prev) => ({ ...prev, descricao: e.target.value }))}
              className="min-h-[120px] w-full resize-y border border-zinc-300 bg-white px-3 py-3 text-[13px] font-medium text-[#142340] outline-none focus:border-[#2563eb]"
              placeholder="Descreva com detalhes o problema, datas, contexto, prints, ID da partida e o que você espera como solução."
            />
          </Campo>

          <Campo>
            <label className="block mb-2 block text-[10px] font-medium uppercase tracking-wide text-zinc-500">
              Provas da denúncia
            </label>
            <label
              className="border border-dashed border-zinc-300 bg-zinc-50 px-4 py-3 flex flex-col md:flex-row md:items-center gap-3 cursor-pointer hover:border-[#2563eb] transition-colors"
              onDragOver={(e) => {
                e.preventDefault()
                e.currentTarget.classList.add('border-[#2563eb]')
              }}
              onDragLeave={(e) => {
                e.preventDefault()
                e.currentTarget.classList.remove('border-[#2563eb]')
              }}
              onDrop={(e) => {
                e.preventDefault()
                e.currentTarget.classList.remove('border-[#2563eb]')
                adicionarArquivos(e.dataTransfer.files)
              }}
            >
              <div className="flex h-10 w-10 items-center justify-center border border-zinc-300 bg-white flex items-center justify-center">
                <Upload size={18} className="text-[#2563eb]" />
              </div>
              <div className="flex-1">
                <div className="text-[13px] font-medium uppercase text-[#111827]">Arraste provas aqui ou clique para selecionar</div>
                <div className="mt-1 text-[12px] text-zinc-500">
                  Até {LIMITE_PROVAS} arquivos, {LIMITE_MB_POR_ARQUIVO} MB cada. Imagens grandes são comprimidas automaticamente antes do envio.
                </div>
              </div>
              <input
                type="file"
                multiple
                accept="image/*,video/*,.pdf,.txt,.doc,.docx"
                className="hidden"
                onChange={(e) => {
                  adicionarArquivos(e.target.files || [])
                  e.currentTarget.value = ''
                }}
              />
            </label>

            {arquivos.length > 0 && (
              <div className="mt-3">
                <div className="mb-2 flex items-center justify-between gap-3 text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-500">
                  <span>{arquivos.length}/{LIMITE_PROVAS} provas selecionadas</span>
                  <button
                    type="button"
                    onClick={() => setArquivos([])}
                    className="text-zinc-400 hover:text-red-400"
                  >
                    Limpar tudo
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {previewsArquivos.map(({ arquivo, key, previewUrl }) => (
                    <div key={key} className="border border-zinc-200 bg-white p-2 flex items-center gap-3 text-[13px] font-medium text-zinc-600">
                      {previewUrl ? (
                        <img src={previewUrl} alt={arquivo.name} className="h-10 w-10 object-cover border border-zinc-200 bg-zinc-100" />
                      ) : (
                        <div className="h-10 w-10 border border-zinc-200 bg-white flex items-center justify-center">
                          <Paperclip size={18} className="text-[#2563eb]" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[#142340]">{arquivo.name}</div>
                        <div className="text-xs text-zinc-500 mt-1">{arquivo.type || 'arquivo'} • {formatarTamanhoArquivo(arquivo.size)}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removerArquivo(key)}
                        className="h-8 w-8 border border-zinc-200 bg-white flex items-center justify-center text-zinc-400 hover:text-red-400 hover:border-red-500/50"
                        title="Remover prova"
                      >
                        <X size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Campo>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="border border-zinc-200 bg-zinc-50 px-4 py-3 flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.publica}
                onChange={(e) => setForm((prev) => ({ ...prev, publica: e.target.checked }))}
                className="mt-1"
              />
              <div>
                <div className="text-[13px] font-medium uppercase text-[#111827]">Tornar pública</div>
                <div className="text-sm text-zinc-500 mt-1 leading-6">
                  A denúncia entra na página pública de reputação, igual Reclame Aqui.
                </div>
              </div>
            </label>

            <label className="border border-zinc-200 bg-zinc-50 px-4 py-3 flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.anonima_para_publico}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, anonima_para_publico: e.target.checked }))
                }
                className="mt-1"
              />
              <div>
                <div className="text-[13px] font-medium uppercase text-[#111827]">Ocultar seu nome</div>
                <div className="text-sm text-zinc-500 mt-1 leading-6">
                  Mantém pública, mas sem mostrar seu nome para visitantes.
                </div>
              </div>
            </label>
          </div>

          {mensagem && (
            <div className="border border-zinc-300 bg-zinc-50 px-4 py-3 text-[13px] font-medium text-zinc-600">
              {mensagem}
            </div>
          )}

          <div className="flex flex-wrap justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-4 border border-zinc-300 bg-white text-[11px] font-medium uppercase tracking-[0.2em]"
            >
              Fechar
            </button>

            <button
              type="submit"
              disabled={enviando}
              className="h-10 px-4 bg-[#ef4444] text-[#142340] text-[11px] font-medium uppercase tracking-[0.2em] hover:bg-red-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-2"
            >
              {enviando ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <MessageSquarePlus size={15} />
                  Enviar denúncia
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function MiniResumo({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className=" border border-zinc-200 bg-zinc-50 p-3 min-w-0">
      <div className="text-[10px] font-medium uppercase tracking-[0.15em] text-zinc-500">
        {titulo}
      </div>
      <div className="text-[20px] md:text-[22px] font-medium mt-2 leading-none text-[#142340]">
        {valor}
      </div>
    </div>
  )
}

function BarraReputacao({ score, cor }: { score: number | null; cor: string }) {
  const largura = score === null ? 0 : Math.max(0, Math.min(100, score))

  return (
    <div className="w-full">
      <div className="w-full h-3 rounded-full bg-zinc-200 overflow-hidden">
        <div
          className={`h-full transition-all duration-500 ${cor}`}
          style={{ width: `${largura}%` }}
        />
      </div>
    </div>
  )
}

function Badge({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 text-[11px] font-medium uppercase bg-zinc-100 px-3 py-2  border border-zinc-200 text-zinc-600">
      {icon}
      <span>{label}</span>
    </div>
  )
}

function InfoPasso({
  icon,
  titulo,
  texto,
}: {
  icon: React.ReactNode
  titulo: string
  texto: string
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-9 h-9  bg-zinc-50 border border-zinc-200 flex items-center justify-center shrink-0 text-zinc-600">
        {icon}
      </div>
      <div>
        <div className="text-sm font-medium uppercase tracking-[0.14em] text-[#142340]">
          {titulo}
        </div>
        <p className="text-sm text-zinc-500 mt-1 leading-6">{texto}</p>
      </div>
    </div>
  )
}

function IndicadorMinhaDenuncia({ label, valor }: { label: string; valor: string }) {
  return (
    <div className=" border border-zinc-200 bg-zinc-50 px-3 py-3">
      <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-500">
        {label}
      </div>
      <div className="text-sm font-medium text-[#142340] mt-1 flex items-center gap-2">
        <CircleDot size={12} className="text-[#2563eb]" />
        {valor}
      </div>
    </div>
  )
}

function Campo({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>
}