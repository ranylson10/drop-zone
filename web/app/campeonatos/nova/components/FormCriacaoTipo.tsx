'use client'

import { useEffect, useMemo, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import FormProdutora from '@/app/components/FormProdutora'
import { ArrowLeft, ChevronDown, Loader2, Plus, Trash2, Swords, Trophy } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { usePerfil } from '@/app/contexts/PerfilContext'
import {
  TipoCompeticao,
  TIPOS_COMPETICAO,
} from '@/app/campeonatos/components/tiposCompeticao'

type Props = { tipo: TipoCompeticao }

type GrupoEstrutura = {
  nome: string
  quantidade_equipes: string
  numero_partidas: string
  classificam: string
  dia_jogo: string
  hora_jogo: string
  intervalo_minutos: string
  mapas: string[]
}

type FaseEstrutura = {
  nome: string
  grupos: GrupoEstrutura[]
}

type WhatsContato = { nome: string; numero: string }

type ImagemCropTipo = 'logo' | 'banner' | 'foto'

type ImagemCropConfig = {
  tipo: ImagemCropTipo
  titulo: string
  ajuda: string
  largura: number
  altura: number
  pasta: 'logos' | 'banners' | 'fotos'
}

type ImagemCropState = ImagemCropConfig & {
  file: File
  preview: string
  zoom: number
  offsetX: number
  offsetY: number
}

const IMAGEM_CROP_CONFIGS: Record<ImagemCropTipo, ImagemCropConfig> = {
  logo: {
    tipo: 'logo',
    titulo: 'Ajustar logo',
    ajuda: 'A logo será salva em 500 x 500 pixels.',
    largura: 500,
    altura: 500,
    pasta: 'logos',
  },
  banner: {
    tipo: 'banner',
    titulo: 'Ajustar banner do campeonato',
    ajuda: 'O banner será salvo em 1080 x 1440 pixels.',
    largura: 1080,
    altura: 1440,
    pasta: 'banners',
  },
  foto: {
    tipo: 'foto',
    titulo: 'Ajustar foto',
    ajuda: 'Fotos de jogadores/perfis serão salvas em 500 x 600 pixels.',
    largura: 500,
    altura: 600,
    pasta: 'fotos',
  },
}


const LETRAS_GRUPO = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

function extrairLetraGrupo(nome?: string | null) {
  return String(nome || '').trim().toUpperCase().replace(/^GRUPO\s+/, '').slice(0, 2) || 'A'
}

function montarNomeGrupo(letra: string) {
  return `Grupo ${String(letra || 'A').trim().toUpperCase()}`
}

const OPCOES_SERVIDOR = [
  'Brasil (BR)',
  'Latam (LATAM)',
  'América do Norte (NA)',
  'Estados Unidos (US)',
  'América do Sul (SAC)',
  'Europa (EU)',
  'Oriente Médio e África (MEA)',
  'Índia (IND)',
  'Paquistão (PK)',
  'Bangladesh (BD)',
  'Tailândia (TH)',
  'Vietnã (VN)',
  'Indonésia (ID)',
  'Taiwan (TW)',
  'Singapura (SG)',
  'Comunidade dos Estados Independentes (CIS)',
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


function formatarMoeda(valor: number) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function numeroSeguro(value: unknown) {
  const n = Number(value || 0)
  return Number.isFinite(n) ? n : 0
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

function toIsoOrNull(value: string) {
  if (!value) return null
  const data = new Date(value)
  if (Number.isNaN(data.getTime())) return null
  return data.toISOString()
}

function toTimeOrNull(value: string) {
  return String(value || '').trim() || null
}

function toNullableText(value: string) {
  const texto = String(value || '').trim()
  return texto ? texto : null
}

function toNullableNumber(value: string) {
  if (String(value ?? '').trim() === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}



function carregarImagem(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Não foi possível carregar a imagem.'))
    img.src = src
  })
}

async function recortarImagemParaArquivo(params: {
  file: File
  largura: number
  altura: number
  zoom: number
  offsetX: number
  offsetY: number
}) {
  const url = URL.createObjectURL(params.file)

  try {
    const img = await carregarImagem(url)
    const canvas = document.createElement('canvas')
    canvas.width = params.largura
    canvas.height = params.altura

    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Não foi possível preparar a imagem.')

    ctx.clearRect(0, 0, params.largura, params.altura)
    const escalaBase = Math.max(params.largura / img.naturalWidth, params.altura / img.naturalHeight)
    const escala = escalaBase * params.zoom
    const larguraDesenho = img.naturalWidth * escala
    const alturaDesenho = img.naturalHeight * escala
    const limiteX = Math.max(0, (larguraDesenho - params.largura) / 2)
    const limiteY = Math.max(0, (alturaDesenho - params.altura) / 2)
    const x = (params.largura - larguraDesenho) / 2 + (params.offsetX / 100) * limiteX
    const y = (params.altura - alturaDesenho) / 2 + (params.offsetY / 100) * limiteY

    ctx.drawImage(img, x, y, larguraDesenho, alturaDesenho)

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((resultado) => {
        if (resultado) resolve(resultado)
        else reject(new Error('Não foi possível salvar a imagem recortada.'))
      }, 'image/png')
    })

    const nomeBase = params.file.name.replace(/\.[^.]+$/, '') || 'imagem'
    return new File([blob], `${nomeBase}-${params.largura}x${params.altura}.png`, {
      type: 'image/png',
    })
  } finally {
    URL.revokeObjectURL(url)
  }
}

type StatusAutomaticoCampeonato = {
  banco: string
  label: string
  descricao: string
}

function calcularStatusAutomaticoCampeonato(params: {
  abertura?: string
  encerramento?: string
  vagas?: string
  inscritos?: number
}): StatusAutomaticoCampeonato {
  const agora = new Date()
  const abertura = params.abertura ? new Date(params.abertura) : null
  const encerramento = params.encerramento ? new Date(params.encerramento) : null
  const vagas = Number(params.vagas || 0)
  const inscritos = Number(params.inscritos || 0)

  const aberturaValida = abertura && !Number.isNaN(abertura.getTime())
  const encerramentoValido = encerramento && !Number.isNaN(encerramento.getTime())
  const lotouVagas = vagas > 0 && inscritos >= vagas

  if (lotouVagas) {
    return {
      banco: 'inscricoes',
      label: 'Vagas encerradas',
      descricao: 'As inscrições ficam fechadas automaticamente porque todas as vagas foram preenchidas.',
    }
  }

  if (aberturaValida && agora < abertura) {
    return {
      banco: 'rascunho',
      label: 'Previsto',
      descricao: 'As inscrições ainda não abriram.',
    }
  }

  if (aberturaValida && encerramentoValido && agora >= abertura && agora <= encerramento) {
    return {
      banco: 'inscricoes',
      label: 'Vagas abertas',
      descricao: 'As inscrições estão dentro do período configurado.',
    }
  }

  if (encerramentoValido && agora > encerramento) {
    return {
      banco: 'rascunho',
      label: 'Vagas encerradas',
      descricao: 'As inscrições ficam fechadas automaticamente porque a data de encerramento já passou.',
    }
  }

  return {
    banco: 'rascunho',
    label: 'Previsto',
    descricao: 'Informe a abertura e o encerramento das inscrições para o status abrir automaticamente.',
  }
}

function FormCriacaoTipoInner({ tipo }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { perfilAtivo, tipoPerfil, produtoras } = usePerfil()

  const xtreinoViaQuery = searchParams.get('xtreino') === '1'
  const xtreinoModoViaQuery = String(searchParams.get('modo') || '').trim().toLowerCase()
  const produtoraIdViaQuery = String(searchParams.get('produtoraId') || '').trim()
  const isXtreinoContext = tipo === 'xtreino' || xtreinoViaQuery

  const meta = useMemo(
    () => TIPOS_COMPETICAO.find((item) => item.slug === tipo),
    [tipo]
  )

  const tipoRuntime = String(tipo)
  const isPartida = false
  const isCopa = tipo === 'copa'
  const isLiga = tipo === 'liga'
  const isXtreino = tipo === 'xtreino'
  const isDiario = tipo === 'diario'
  const mostrarBlocoConfiguracoes = tipo !== 'copa'
  const tituloTela = isXtreinoContext ? 'XTREINO' : meta?.titulo
  const subtituloTela = isXtreinoContext
    ? xtreinoModoViaQuery === 'mata_mata'
      ? 'Criação de xtreino no formato mata-mata usando o formulário da copa.'
      : xtreinoModoViaQuery === 'pontos_corridos'
        ? 'Criação de xtreino no formato pontos corridos usando o formulário da liga.'
        : meta?.subtitulo
    : meta?.subtitulo

  const [produtoraCriada, setProdutoraCriada] = useState<any>(null)
  const [produtoraModalAberto, setProdutoraModalAberto] = useState(false)

  const produtoraResolvida = useMemo(() => {
    if (produtoraCriada?.id) return produtoraCriada

    if (produtoraIdViaQuery && produtoras?.length) {
      const encontrada = produtoras.find((item) => item.id === produtoraIdViaQuery)
      if (encontrada) return encontrada
    }

    if (tipoPerfil === 'produtora' && perfilAtivo?.id) {
      return perfilAtivo
    }

    if (produtoras?.length) {
      return produtoras[0]
    }

    return null
  }, [tipoPerfil, perfilAtivo, produtoras, produtoraIdViaQuery, produtoraCriada])

  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [taxaCriacao, setTaxaCriacao] = useState(0)
  const [openServidor, setOpenServidor] = useState(false)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState('')
  const [bannerFile, setBannerFile] = useState<File | null>(null)
  const [bannerPreview, setBannerPreview] = useState('')
  const [cropAberto, setCropAberto] = useState<ImagemCropState | null>(null)

  useEffect(() => {
    let ativo = true

    async function carregarTaxaCriacao() {
      const tipoTaxa = isXtreinoContext ? 'xtreino' : String(tipo || '')
      const { data } = await supabase
        .from('campeonato_taxas_criacao')
        .select('valor, ativo')
        .eq('tipo', tipoTaxa)
        .eq('ativo', true)
        .maybeSingle()

      if (ativo) setTaxaCriacao(numeroSeguro((data as { valor?: number | null } | null)?.valor))
    }

    carregarTaxaCriacao()

    return () => {
      ativo = false
    }
  }, [tipo, isXtreinoContext])

  const [form, setForm] = useState({
    nome: '',
    edicao: '1',
    status: 'rascunho',
    descricao: '',
    valor_vaga: '0',
    valor_premiacao: '0',
    vagas: isPartida ? '16' : '12',
    plataforma: 'Mobile',
    categoria: isPartida ? 'Squad' : 'Squad',
    regiao: 'Brasil (BR)',
    data_abertura_inscricoes: '',
    data_encerramento_inscricoes: '',
    horario_inicio: '',
    fuso_horario: 'America/Belem',
    modo_jogo: isPartida ? 'CS' : 'Battle Royale',
    quantidade_quedas: isPartida ? '1' : '6',
    equipes_por_jogo: isPartida ? '2' : '12',
    quantidade_rodadas: tipo === 'liga' ? '5' : '1',
    criterio_desempate: 'abates',
    melhor_de: '1',
    rounds_por_lado: isPartida ? '6' : '0',
    troca_de_lado: 'sim',
    sala_aberta: 'nao',
    vale_ranking: 'nao',
    terceiro_lugar: 'nao',
    pontos_por_abate: '1',
    formato_chave: 'mata_mata_simples',
    sistema_pontos_tipo: 'padrao',
    forma_pagamento: 'pix',
    limite_por_organizacao: '1',
    checkin_obrigatorio: false,
    horario_checkin: '',
    jogadores_por_equipe: isPartida ? '4' : '4',
    reservas_permitidos: '1',
    substitutos_permitidos: false,
    idade_minima: '',
    nivel_minimo_conta: '',
    pro_players_proibidos: false,
    guildas_restritas: '',
    troca_jogadores: 'bloqueada_apos_checkin',
    penalidade_wo: 'derrota_simples',
    tipo_premiacao: 'dinheiro',
    premiacao_garantida: false,
    forma_pagamento_premiacao: 'pix',
    prazo_pagamento_premiacao: 'ate_48h',
    whatsapp_suporte: '',
    whatsapp_contatos: [{ nome: '', numero: '' }] as WhatsContato[],

    modo_partida: '4x4',
    estilo_partida: 'ump',
    formato_evento: isPartida ? 'mata_mata' : 'mata_mata',
    tem_prorrogacao: 'nao',
    tipo_mapa: 'fixo',
    mapa_padrao: 'BERMUDA',
    ida_e_volta: 'nao',
    pontuacao_vitoria: '3',
    pontuacao_derrota: '0',
    usa_upper_lower: 'sim',
    reset_final: 'nao',
    numero_grupos: '2',
    classificados_por_grupo: '2',
    admin_mode: 'manual',
    regra_wo: 'derrota_simples',

    xtreino_modo: xtreinoModoViaQuery || 'jogo_unico',
    xtreino_regra: 'trocacao_livre',
    xtreino_tipo_inscricao: 'gratuito',
    xtreino_tem_premiacao: 'nao',
  })

  const statusAutomatico = useMemo(
    () =>
      calcularStatusAutomaticoCampeonato({
        abertura: form.data_abertura_inscricoes,
        encerramento: form.data_encerramento_inscricoes,
        vagas: isCopa ? '0' : form.vagas,
        inscritos: 0,
      }),
    [form.data_abertura_inscricoes, form.data_encerramento_inscricoes, form.vagas, isCopa]
  )

  const [fasesEstrutura, setFasesEstrutura] = useState<FaseEstrutura[]>([
    {
      nome: 'Fase 1',
      grupos: [
        {
          nome: 'Grupo A',
          quantidade_equipes: form.vagas || '12',
          numero_partidas: '4',
          classificam: '1',
          dia_jogo: '',
          hora_jogo: '',
          intervalo_minutos: '15',
          mapas: ['BERMUDA', 'PURGATÓRIO', 'ALPINE', 'KALAHARI'],
        },
      ],
    },
  ])

  const xtreinoEhJogoUnico = isXtreinoContext && form.xtreino_modo === 'jogo_unico'
  const xtreinoEhMataMata = isXtreinoContext && form.xtreino_modo === 'mata_mata'
  const xtreinoEhPontosCorridos =
    isXtreinoContext && form.xtreino_modo === 'pontos_corridos'
  const exibirEstruturaCompetitiva = xtreinoEhMataMata || xtreinoEhPontosCorridos

  function update<K extends keyof typeof form>(
    field: K,
    value: (typeof form)[K]
  ) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function adicionarFaseEstrutura() {
    setFasesEstrutura((prev) => [
      ...prev,
      {
        nome: `Fase ${prev.length + 1}`,
        grupos: [
          {
            nome: 'Grupo A',
            quantidade_equipes: form.vagas || '12',
            numero_partidas: '4',
            classificam: '1',
            dia_jogo: '',
            hora_jogo: '',
            intervalo_minutos: '15',
            mapas: ['BERMUDA', 'PURGATÓRIO', 'ALPINE', 'KALAHARI'],
          },
        ],
      },
    ])
  }

  function removerFaseEstrutura(index: number) {
    setFasesEstrutura((prev) => prev.filter((_, i) => i !== index))
  }

  function atualizarNomeFase(index: number, value: string) {
    setFasesEstrutura((prev) =>
      prev.map((fase, i) => (i === index ? { ...fase, nome: value } : fase))
    )
  }

  function adicionarGrupoEstrutura(faseIndex: number) {
    setFasesEstrutura((prev) =>
      prev.map((fase, i) => {
        if (i !== faseIndex) return fase
        const letrasUsadas = new Set(fase.grupos.map((grupo) => extrairLetraGrupo(grupo.nome)))
        const letra = LETRAS_GRUPO.find((item) => !letrasUsadas.has(item)) || LETRAS_GRUPO[0]
        return {
          ...fase,
          grupos: [
            ...fase.grupos,
            {
              nome: montarNomeGrupo(letra),
              quantidade_equipes: form.vagas || '12',
              numero_partidas: '4',
              classificam: '1',
              dia_jogo: '',
              hora_jogo: '',
              intervalo_minutos: '15',
              mapas: ['BERMUDA', 'PURGATÓRIO', 'ALPINE', 'KALAHARI'],
            },
          ],
        }
      })
    )
  }

  function removerGrupoEstrutura(faseIndex: number, grupoIndex: number) {
    setFasesEstrutura((prev) =>
      prev.map((fase, i) => {
        if (i !== faseIndex) return fase
        return { ...fase, grupos: fase.grupos.filter((_, gi) => gi !== grupoIndex) }
      })
    )
  }

  function atualizarGrupoEstrutura(
    faseIndex: number,
    grupoIndex: number,
    field: keyof GrupoEstrutura,
    value: string | string[]
  ) {
    setFasesEstrutura((prev) =>
      prev.map((fase, i) => {
        if (i !== faseIndex) return fase
        return {
          ...fase,
          grupos: fase.grupos.map((grupo, gi) =>
            gi === grupoIndex ? { ...grupo, [field]: value } : grupo
          ),
        }
      })
    )
  }

  function abrirRecorteImagem(tipoImagem: ImagemCropTipo, file: File | null) {
    if (!file) return
    const config = IMAGEM_CROP_CONFIGS[tipoImagem]
    setCropAberto({
      ...config,
      file,
      preview: URL.createObjectURL(file),
      zoom: 1,
      offsetX: 0,
      offsetY: 0,
    })
  }

  function fecharRecorteImagem() {
    if (cropAberto?.preview) URL.revokeObjectURL(cropAberto.preview)
    setCropAberto(null)
  }

  async function aplicarRecorteImagem() {
    if (!cropAberto) return

    try {
      const arquivoRecortado = await recortarImagemParaArquivo({
        file: cropAberto.file,
        largura: cropAberto.largura,
        altura: cropAberto.altura,
        zoom: cropAberto.zoom,
        offsetX: cropAberto.offsetX,
        offsetY: cropAberto.offsetY,
      })

      const preview = URL.createObjectURL(arquivoRecortado)

      if (cropAberto.tipo === 'logo') {
        if (logoPreview) URL.revokeObjectURL(logoPreview)
        setLogoFile(arquivoRecortado)
        setLogoPreview(preview)
      }

      if (cropAberto.tipo === 'banner') {
        if (bannerPreview) URL.revokeObjectURL(bannerPreview)
        setBannerFile(arquivoRecortado)
        setBannerPreview(preview)
      }

      fecharRecorteImagem()
    } catch (err) {
      setErro(extrairMensagemErro(err))
    }
  }

  async function uploadImagemCampeonato(file: File, pasta: 'logos' | 'banners' | 'fotos') {
    const extensao = file.name.split('.').pop()?.toLowerCase() || 'png'
    const nomeArquivo = `${tipo}/${pasta}/${Date.now()}-${Math.random().toString(36).slice(2)}.${extensao}`

    const { error: uploadError } = await supabase.storage
      .from('imagem_campeonatos')
      .upload(nomeArquivo, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) throw uploadError

    const { data } = supabase.storage
      .from('imagem_campeonatos')
      .getPublicUrl(nomeArquivo)

    return data.publicUrl
  }

  function extrairMensagemErro(err: unknown) {
    if (!err) return 'Erro ao criar campeonato.'
    if (typeof err === 'string') return err
    if (typeof err === 'object') {
      const erro = err as { message?: string; error_description?: string; details?: string; hint?: string }
      if (erro.message) return erro.message
      if (erro.error_description) return erro.error_description
      if (erro.details) return erro.details
      if (erro.hint) return erro.hint
    }
    try {
      return JSON.stringify(err)
    } catch {
      return 'Erro ao criar campeonato.'
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')

    if (!form.nome.trim()) {
      setErro('Informe o nome do campeonato.')
      return
    }

    if (!produtoraResolvida?.id) {
      setErro('Você precisa criar ou selecionar uma produtora antes de criar campeonato.')
      setProdutoraModalAberto(true)
      return
    }

    if (exibirEstruturaCompetitiva) {
      if (fasesEstrutura.length === 0) {
        setErro('Adicione pelo menos uma fase.')
        return
      }

      const estruturaInvalida = fasesEstrutura.some(
        (fase) =>
          !String(fase.nome || '').trim() ||
          fase.grupos.length === 0 ||
          fase.grupos.some(
            (grupo) =>
              !String(grupo.nome || '').trim() ||
              !String(grupo.quantidade_equipes || '').trim() ||
              !String(grupo.numero_partidas || '').trim()
          )
      )

      if (estruturaInvalida) {
        setErro('Preencha corretamente as fases e grupos antes de criar o xtreino.')
        return
      }
    }

    setLoading(true)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user?.id) {
        throw new Error('Usuário não autenticado para criar campeonato.')
      }

      let logoUrl: string | null = null
      let bannerUrl: string | null = null

      if (logoFile) {
        logoUrl = await uploadImagemCampeonato(logoFile, 'logos')
      }

      if (bannerFile) {
        bannerUrl = await uploadImagemCampeonato(bannerFile, 'banners')
      }

      const quantidadeQuedasPayload =
        isPartida
          ? 1
          : isCopa
            ? 0
            : isXtreino && xtreinoEhMataMata
              ? 0
              : Number(form.quantidade_quedas || 0)

      const equipesPorJogoPayload =
        isCopa || (isXtreino && xtreinoEhMataMata)
          ? 0
          : Number(form.equipes_por_jogo || 0)

      const valorVaga =
        isXtreino && form.xtreino_tipo_inscricao === 'gratuito'
          ? 0
          : Number(form.valor_vaga || 0)

      const valorPremiacao =
        isXtreino && form.xtreino_tem_premiacao !== 'sim'
          ? 0
          : Number(form.valor_premiacao || 0)

      const modeloCompeticao =
        isCopa ? 'copa' :
        isLiga ? 'liga' :
        isDiario ? 'diario' :
        isXtreino ? 'xtreino' :
        meta?.modelo

      const modoXtreinoFinal = isXtreinoContext
        ? (xtreinoModoViaQuery || form.xtreino_modo || (isCopa ? 'mata_mata' : isLiga ? 'pontos_corridos' : 'jogo_unico'))
        : form.xtreino_modo

      const tipoCompeticaoFinal = isXtreinoContext ? 'xtreino' : meta?.slug
      const modeloCompeticaoFinal = isXtreinoContext ? 'xtreino' : modeloCompeticao
      const formatoFinal = isXtreinoContext ? 'Xtreino' : meta?.formatoBanco

      const contatosWhatsApp = normalizarContatosWhatsApp(form.whatsapp_contatos)

      const payload: Record<string, unknown> = {
        produtora_id: produtoraResolvida.id,
        criado_por: user.id,
        nome: form.nome.trim(),
        slug: slugify(`${form.nome}-${meta?.slug}-${Date.now()}`),
        descricao: toNullableText(form.descricao),
        edicao: String(form.edicao || '1'),
        status: statusAutomatico.banco,
        jogo: 'Free Fire',
        logo_url: logoUrl,
        banner_url: bannerUrl,
        valor_premiacao: valorPremiacao,
        valor_vaga: valorVaga,
        vagas: isCopa ? 0 : Number(form.vagas || 0),
        moeda: 'BRL',
        plataforma: form.plataforma,
        abrangencia: 'Brasil',
        regiao: form.regiao,
        categoria: form.categoria,
        modo_jogo: form.modo_jogo,
        formato: formatoFinal,
        tipo_competicao: tipoCompeticaoFinal,
        modelo_competicao: modeloCompeticaoFinal,
        data_abertura_inscricoes: toIsoOrNull(form.data_abertura_inscricoes),
        data_encerramento_inscricoes: toIsoOrNull(form.data_encerramento_inscricoes),
        data_inicio: null,
        data_fim: null,
        horario_inicio: toTimeOrNull(form.horario_inicio),
        fuso_horario: toNullableText(form.fuso_horario),
        quantidade_quedas: quantidadeQuedasPayload,
        equipes_por_jogo: equipesPorJogoPayload,
        quantidade_rodadas: Number(form.quantidade_rodadas || 0),
        criterio_desempate:
          isLiga || (isXtreino && xtreinoEhPontosCorridos)
            ? null
            : form.criterio_desempate,
        sistema_pontos_tipo:
          tipo === 'liga' || (isXtreino && xtreinoEhPontosCorridos)
            ? form.sistema_pontos_tipo
            : null,
        forma_pagamento: toNullableText(form.forma_pagamento),
        limite_por_organizacao: toNullableNumber(form.limite_por_organizacao),
        checkin_obrigatorio: form.checkin_obrigatorio,
        horario_checkin: form.checkin_obrigatorio ? toTimeOrNull(form.horario_checkin) : null,
        jogadores_por_equipe: toNullableNumber(form.jogadores_por_equipe),
        reservas_permitidos: toNullableNumber(form.reservas_permitidos),
        substitutos_permitidos: form.substitutos_permitidos,
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
        whatsapp_suporte: contatosWhatsApp[0]?.numero || toNullableText(form.whatsapp_suporte),
        whatsapp_contatos: contatosWhatsApp,
      }

      const { data, error } = await supabase
        .from('campeonatos')
        .insert([payload])
        .select('id')
        .single()

      if (error) {
        throw new Error(`Erro ao salvar campeonato: ${extrairMensagemErro(error)}`)
      }

      if (!data?.id) {
        throw new Error('Não foi possível criar o campeonato.')
      }

      if (isPartida) {
        const { error: configError } = await supabase
          .from('campeonatos_4x4_config')
          .upsert({
            campeonato_id: data.id,
            modo_partida: form.modo_partida,
            estilo_partida: form.estilo_partida,
            formato_evento: form.formato_evento,
            melhor_de: Number(form.melhor_de || 1),
            rounds_por_lado: Number(form.rounds_por_lado || 6),
            troca_de_lado: form.troca_de_lado === 'sim',
            admin_mode: form.admin_mode,
            regra_wo: form.regra_wo,
            tem_prorrogacao: form.tem_prorrogacao === 'sim',
            tipo_mapa: form.tipo_mapa,
            mapa_padrao: form.tipo_mapa === 'fixo' ? form.mapa_padrao : null,
            ida_e_volta: form.ida_e_volta === 'sim',
            pontuacao_vitoria: Number(form.pontuacao_vitoria || 3),
            pontuacao_derrota: Number(form.pontuacao_derrota || 0),
            usa_upper_lower:
              form.formato_evento === 'dupla_eliminacao'
                ? form.usa_upper_lower === 'sim'
                : false,
            reset_final:
              form.formato_evento === 'dupla_eliminacao'
                ? form.reset_final === 'sim'
                : false,
            numero_grupos:
              form.formato_evento === 'grupos_playoff'
                ? Number(form.numero_grupos || 0)
                : null,
            classificados_por_grupo:
              form.formato_evento === 'grupos_playoff'
                ? Number(form.classificados_por_grupo || 0)
                : null,
          })

        if (configError) {
          throw new Error(
            `Erro ao salvar configuração do modo: ${extrairMensagemErro(configError)}`
          )
        }
      }

      if (tipo === 'diario') {
        const { error: configError } = await supabase
          .from('campeonatos_diarios_config')
          .upsert({
            campeonato_id: data.id,
            quantidade_quedas: Number(form.quantidade_quedas || 6),
            equipes_por_jogo: Number(form.equipes_por_jogo || 12),
            grupo_unico: false,
            criterio_desempate: form.criterio_desempate,
          })

        if (configError) {
          throw new Error(
            `Erro ao salvar configuração do modo: ${extrairMensagemErro(configError)}`
          )
        }
      }

      if (isXtreinoContext) {
        const { error: configError } = await supabase
          .from('campeonatos_xtreinos_config')
          .upsert({
            campeonato_id: data.id,
            quantidade_quedas: Number(form.quantidade_quedas || 4),
            sala_aberta: form.sala_aberta === 'sim',
            vale_ranking: form.vale_ranking === 'sim',
            pontua: xtreinoEhJogoUnico || xtreinoEhPontosCorridos,
            permite_convidado: true,
            modo_xtreino: modoXtreinoFinal,
            tipo_regra: form.xtreino_regra,
            tipo_inscricao: form.xtreino_tipo_inscricao,
            tem_premiacao: form.xtreino_tem_premiacao === 'sim',
          })

        if (configError) {
          throw new Error(
            `Erro ao salvar configuração do modo: ${extrairMensagemErro(configError)}`
          )
        }

        if (exibirEstruturaCompetitiva) {
          for (let faseIndex = 0; faseIndex < fasesEstrutura.length; faseIndex += 1) {
            const fase = fasesEstrutura[faseIndex]

            const faseSlug = slugify(String(fase.nome || `Fase ${faseIndex + 1}`))

            const { data: faseData, error: faseError } = await supabase
              .from('campeonato_fases')
              .insert({
                campeonato_id: data.id,
                nome: String(fase.nome || `Fase ${faseIndex + 1}`).trim(),
                slug: faseSlug || `fase-${faseIndex + 1}`,
              })
              .select('id')
              .single()

            if (faseError || !faseData?.id) {
              throw new Error(
                `Erro ao salvar fase ${faseIndex + 1}: ${extrairMensagemErro(faseError)}`
              )
            }

            for (let grupoIndex = 0; grupoIndex < fase.grupos.length; grupoIndex += 1) {
              const grupo = fase.grupos[grupoIndex]

              const mapasJson = (grupo.mapas || []).filter(Boolean)
              const dataBase = grupo.dia_jogo && grupo.hora_jogo
                ? new Date(`${grupo.dia_jogo}T${grupo.hora_jogo}:00`).toISOString()
                : null

              const { data: grupoData, error: grupoError } = await supabase
                .from('campeonato_grupos')
                .insert({
                  campeonato_id: data.id,
                  fase_id: faseData.id,
                  nome: String(grupo.nome || `Grupo ${grupoIndex + 1}`).trim(),
                  slug: slugify(String(grupo.nome || `Grupo ${grupoIndex + 1}`)),
                  quantidade_equipes: Number(grupo.quantidade_equipes || 0),
                  qtd_slots: Number(grupo.quantidade_equipes || 0),
                  qtd_quedas: Number(grupo.numero_partidas || 0),
                  classificam: Number(grupo.classificam || 0),
                  horario_inicio: grupo.hora_jogo || null,
                  intervalo_minutos: undefined,
                  mapas: mapasJson,
                  ordem: grupoIndex + 1,
                  configuracao: {
                    dia_jogo: grupo.dia_jogo || null,
                    hora_jogo: grupo.hora_jogo || null,
                    intervalo_minutos: Number(grupo.intervalo_minutos || 15),
                    numero_partidas: Number(grupo.numero_partidas || 0),
                  },
                  status: 'rascunho',
                } as Record<string, unknown>)
                .select('id')
                .single()

              if (grupoError || !grupoData?.id) {
                throw new Error(
                  `Erro ao salvar grupo ${grupo.nome || grupoIndex + 1}: ${extrairMensagemErro(grupoError)}`
                )
              }

              const qtdSlots = Number(grupo.quantidade_equipes || 0)
              if (qtdSlots > 0) {
                const { error: slotsError } = await supabase.rpc('criar_slots_do_grupo', {
                  p_grupo_id: grupoData.id,
                  p_campeonato_id: data.id,
                  p_fase_id: faseData.id,
                  p_quantidade: qtdSlots,
                })

                if (slotsError) {
                  throw new Error(
                    `Erro ao criar slots do grupo ${grupo.nome}: ${extrairMensagemErro(slotsError)}`
                  )
                }
              }

              const qtdJogos = Number(grupo.numero_partidas || 0)
              if (qtdJogos > 0 && dataBase) {
                const { error: jogosError } = await supabase.rpc('fn_criar_jogos_do_grupo', {
                  p_campeonato_id: data.id,
                  p_grupo_id: grupoData.id,
                  p_qtd_quedas: qtdJogos,
                  p_mapas: mapasJson,
                  p_data_base: dataBase,
                  p_intervalo_minutos: Number(grupo.intervalo_minutos || 15),
                })

                if (jogosError) {
                  throw new Error(
                    `Erro ao criar jogos do grupo ${grupo.nome}: ${extrairMensagemErro(jogosError)}`
                  )
                }
              }
            }
          }
        }
      }

      if (tipo === 'copa') {
        const { error: configError } = await supabase
          .from('campeonatos_copas_config')
          .upsert({
            campeonato_id: data.id,
            melhor_de: 1,
            formato_chave: 'mata_mata_simples',
            quantidade_fases: 0,
            terceiro_lugar: false,
            criterio_desempate: 'abates',
          })

        if (configError) {
          throw new Error(
            `Erro ao salvar configuração do modo: ${extrairMensagemErro(configError)}`
          )
        }
      }

      if (tipo === 'liga') {
        const { error: configError } = await supabase
          .from('campeonatos_ligas_config')
          .upsert({
            campeonato_id: data.id,
            quantidade_rodadas: Number(form.quantidade_rodadas || 1),
            quantidade_quedas: Number(form.quantidade_quedas || 6),
            pontos_por_abate: Number(form.pontos_por_abate || 1),
            sistema_pontos_tipo: form.sistema_pontos_tipo,
          })

        if (configError) {
          throw new Error(
            `Erro ao salvar configuração do modo: ${extrairMensagemErro(configError)}`
          )
        }
      }

      const destino =
        isXtreinoContext
          ? `/campeonatos/xtreinos/${data.id}`
          : tipo === 'copa'
            ? `/campeonatos/copas/${data.id}`
            : tipo === 'liga'
              ? `/campeonatos/ligas/${data.id}`
              : isPartida
                  ? `/campeonatos/${data.id}`
                  : `/campeonatos/${data.id}`

      router.push(destino)
    } catch (err: unknown) {
      console.error('Erro ao criar campeonato:', {
        bruto: err,
        mensagem: extrairMensagemErro(err),
        logoSelecionada: !!logoFile,
        tipo,
        tipoPerfil,
        produtoraId: produtoraResolvida?.id || null,
      })
      setErro(extrairMensagemErro(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[90] overflow-y-auto bg-slate-950/45 px-3 py-4 text-[#142340] backdrop-blur-md sm:px-5 sm:py-7">
      <div className="mx-auto max-w-[960px]">
        <div className="mb-3 flex items-center justify-between gap-3">
          <Link
            href="/campeonatos/nova"
            className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-white/60 bg-white/90 px-4 text-[12px] font-black uppercase tracking-wide text-[#142340] shadow-sm transition hover:border-[#2563eb] hover:text-[#2563eb]"
          >
            <ArrowLeft size={14} /> Voltar
          </Link>

          <div className="border border-zinc-200 bg-white px-3 py-2 text-[10px] font-medium uppercase tracking-[0.16em] text-zinc-500">
            Perfil ativo: {tipoPerfil}
          </div>
        </div>

        <div className="mb-3 rounded-2xl border border-zinc-200 bg-white/95 p-4 text-sm text-[#142340] shadow-[0_20px_70px_rgba(15,23,42,0.14)]">
          <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#2563eb]">Taxa de criação</div>
          <div className="mt-2 text-2xl font-semibold">{formatarMoeda(taxaCriacao)}</div>
          <p className="mt-2 text-xs font-medium text-zinc-500">
            Esse valor será cobrado por PIX direto. A validação final é feita no banco e no webhook de pagamento.
          </p>
        </div>

        <div className="overflow-hidden rounded-[28px] border border-zinc-200 bg-white/95 shadow-[0_28px_90px_rgba(15,23,42,0.18)]">
          <div className="border-b border-zinc-200 bg-white px-4 py-3 md:px-5">
            <div className="mb-2 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#2563eb]">
              <Swords size={12} /> {isXtreinoContext ? 'Flexível' : meta?.badge}
            </div>

            <h1 className="text-[20px] font-semibold tracking-tight text-[#142340] md:text-[22px]">
              Criar {tituloTela}
            </h1>

            <p className="mt-1 max-w-3xl text-xs font-medium text-zinc-500">
              {subtituloTela}
            </p>

            <div className="mt-4 border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-medium text-zinc-600">
              {produtoraResolvida ? (
                <>
                  Campeonato será criado automaticamente na produtora:{' '}
                  <span className="font-semibold text-[#142340]">
                    {produtoraResolvida.nome || 'Produtora'}
                  </span>
                </>
              ) : (
                <>
                  Você ainda não está vinculado a nenhuma produtora. Crie ou entre
                  em uma produtora para poder criar campeonatos.
                </>
              )}
            </div>
          </div>


          {!produtoraResolvida?.id ? (
            <div className="m-4 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm font-semibold text-amber-900 md:m-5">
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-700">Produtora obrigatória</div>
              <p className="mt-2 leading-6">Para criar campeonato, primeiro crie ou selecione uma produtora. O campeonato precisa ser vinculado a uma produtora no banco.</p>
              <button
                type="button"
                onClick={() => setProdutoraModalAberto(true)}
                className="mt-3 inline-flex h-10 items-center justify-center rounded-xl bg-[#2563eb] px-4 text-[11px] font-black uppercase tracking-[0.14em] text-white hover:bg-blue-500"
              >
                Criar produtora
              </button>
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="p-4 md:p-5">
            <>
            <div className="mb-6 grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
              <div className="space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                  Logo do {String(tituloTela || 'campeonato').toLowerCase()}
                </span>

                <input
                  id="logo-campeonato"
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null
                    abrirRecorteImagem('logo', file)
                    e.currentTarget.value = ''
                  }}
                />

                <label
                  htmlFor="logo-campeonato"
                  className="group flex aspect-square w-[170px] cursor-pointer items-center justify-center overflow-hidden border border-zinc-200 bg-zinc-50 shadow-sm transition hover:border-[#2563eb] hover:bg-[#2563eb]/5"
                >
                  {logoPreview ? (
                    <img
                      src={logoPreview}
                      alt="Preview da logo"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center px-4 text-center">
                      <Plus size={26} className="mb-2 text-[#2563eb]" />
                      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#142340]">
                        Adicionar logo
                      </span>
                      <span className="mt-1 text-[10px] font-medium text-zinc-500">
                        500 x 500 px
                      </span>
                    </div>
                  )}
                </label>

                {logoFile ? (
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => abrirRecorteImagem('logo', logoFile)}
                      className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#2563eb] transition hover:text-blue-500"
                    >
                      Ajustar recorte
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setLogoFile(null)
                        setLogoPreview('')
                      }}
                      className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500 transition hover:text-red-500"
                    >
                      Remover
                    </button>
                  </div>
                ) : null}
              </div>

              <div className="space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                  Banner do campeonato
                </span>

                <input
                  id="banner-campeonato"
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null
                    abrirRecorteImagem('banner', file)
                    e.currentTarget.value = ''
                  }}
                />

                <label
                  htmlFor="banner-campeonato"
                  className="group flex aspect-[3/4] min-h-[220px] w-full cursor-pointer items-center justify-center overflow-hidden border border-zinc-200 bg-zinc-50 shadow-sm transition hover:border-[#2563eb] hover:bg-[#2563eb]/5"
                >
                  {bannerPreview ? (
                    <img
                      src={bannerPreview}
                      alt="Preview do banner"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center px-4 text-center">
                      <Plus size={30} className="mb-2 text-[#2563eb]" />
                      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#142340]">
                        Adicionar banner
                      </span>
                      <span className="mt-1 text-[10px] font-medium text-zinc-500">
                        1080 x 1440 px
                      </span>
                    </div>
                  )}
                </label>

                {bannerFile ? (
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => abrirRecorteImagem('banner', bannerFile)}
                      className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#2563eb] transition hover:text-blue-500"
                    >
                      Ajustar recorte
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setBannerFile(null)
                        setBannerPreview('')
                      }}
                      className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500 transition hover:text-red-500"
                    >
                      Remover
                    </button>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                  Nome
                </span>
                <input
                  value={form.nome}
                  onChange={(e) => update('nome', e.target.value)}
                  className="w-full border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-[#142340] outline-none focus:border-[#2563eb]"
                />
              </label>

              <label className="space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                  Edição
                </span>
                <input
                  value={form.edicao}
                  onChange={(e) => update('edicao', e.target.value)}
                  className="w-full border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-[#142340] outline-none focus:border-[#2563eb]"
                />
              </label>

              <div className="space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                  Status público
                </span>
                <div className="border border-zinc-200 bg-zinc-50 px-3 py-2">
                  <div className="text-sm font-black uppercase tracking-[0.12em] text-[#142340]">
                    {statusAutomatico.label}
                  </div>
                  <div className="mt-1 text-[11px] font-medium leading-4 text-zinc-500">
                    {statusAutomatico.descricao}
                  </div>
                </div>
              </div>

              <label className="space-y-2 md:col-span-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                  Descrição
                </span>
                <textarea
                  value={form.descricao}
                  onChange={(e) => update('descricao', e.target.value)}
                  rows={3}
                  placeholder="Informações principais que aparecem nas listas públicas e no link de inscrição."
                  className="w-full border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-[#142340] outline-none focus:border-[#2563eb]"
                />
              </label>

              <label className="space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                  Abertura inscrições
                </span>
                <input
                  type="datetime-local"
                  value={form.data_abertura_inscricoes}
                  onChange={(e) => update('data_abertura_inscricoes', e.target.value)}
                  className="w-full border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-[#142340] outline-none focus:border-[#2563eb]"
                />
              </label>

              <label className="space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                  Encerramento inscrições
                </span>
                <input
                  type="datetime-local"
                  value={form.data_encerramento_inscricoes}
                  onChange={(e) => update('data_encerramento_inscricoes', e.target.value)}
                  className="w-full border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-[#142340] outline-none focus:border-[#2563eb]"
                />
              </label>

              <label className="space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                  Plataforma
                </span>
                <select
                  value={form.plataforma}
                  onChange={(e) => update('plataforma', e.target.value)}
                  className="w-full border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-[#142340] outline-none focus:border-[#2563eb]"
                >
                  <option>Mobile</option>
                  <option>Emulador</option>
                  <option>Misto</option>
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                  Categoria
                </span>
                <select
                  value={form.categoria}
                  onChange={(e) => update('categoria', e.target.value)}
                  className="w-full border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-[#142340] outline-none focus:border-[#2563eb]"
                >
                  <option>Squad</option>
                  <option>Duo</option>
                  <option>Solo</option>
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                  Servidor
                </span>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setOpenServidor((prev) => !prev)}
                    className="flex w-full items-center justify-between border border-zinc-200 bg-white px-3 py-2 text-left text-sm font-medium text-[#142340] outline-none focus:border-[#2563eb]"
                  >
                    <span>{form.regiao}</span>
                    <ChevronDown
                      size={16}
                      className={`transition-transform ${openServidor ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {openServidor && (
                    <>
                      <button
                        type="button"
                        className="fixed inset-0 z-10 cursor-default"
                        onClick={() => setOpenServidor(false)}
                      />
                      <div className="absolute z-20 mt-2 max-h-72 w-full overflow-y-auto border border-zinc-200 bg-white p-1 shadow-2xl">
                        {OPCOES_SERVIDOR.map((opcao) => (
                          <button
                            key={opcao}
                            type="button"
                            onClick={() => {
                              update('regiao', opcao)
                              setOpenServidor(false)
                            }}
                            className={`block w-full rounded-xl px-3 py-2 text-left text-sm transition-colors ${
                              form.regiao === opcao
                                ? 'bg-[#2563eb] text-white'
                                : 'text-[#142340] hover:bg-zinc-100'
                            }`}
                          >
                            {opcao}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </label>

              {isXtreinoContext ? (
                <>
                  <label className="space-y-2">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                      Formato do xtreino
                    </span>
                    <select
                      value={form.xtreino_modo}
                      onChange={(e) => update('xtreino_modo', e.target.value)}
                      className="w-full border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-[#142340] outline-none focus:border-[#2563eb]"
                    >
                      <option value="jogo_unico">Jogo Único</option>
                      <option value="mata_mata">Mata-Mata</option>
                      <option value="pontos_corridos">Pontos Corridos</option>
                    </select>
                  </label>

                  <label className="space-y-2">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                      Regra do treino
                    </span>
                    <select
                      value={form.xtreino_regra}
                      onChange={(e) => update('xtreino_regra', e.target.value)}
                      className="w-full border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-[#142340] outline-none focus:border-[#2563eb]"
                    >
                      <option value="trocacao_livre">Trocação Livre</option>
                      <option value="primeira_safe">Primeira Safe</option>
                      <option value="segunda_safe">Segunda Safe</option>
                      <option value="terceira_safe">Terceira Safe</option>
                    </select>
                  </label>

                  <label className="space-y-2">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                      Inscrição
                    </span>
                    <select
                      value={form.xtreino_tipo_inscricao}
                      onChange={(e) => update('xtreino_tipo_inscricao', e.target.value)}
                      className="w-full border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-[#142340] outline-none focus:border-[#2563eb]"
                    >
                      <option value="gratuito">Gratuito</option>
                      <option value="pago">Pago</option>
                    </select>
                  </label>

                  <label className="space-y-2">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                      Premiação
                    </span>
                    <select
                      value={form.xtreino_tem_premiacao}
                      onChange={(e) => update('xtreino_tem_premiacao', e.target.value)}
                      className="w-full border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-[#142340] outline-none focus:border-[#2563eb]"
                    >
                      <option value="nao">Não</option>
                      <option value="sim">Sim</option>
                    </select>
                  </label>
                </>
              ) : (
                <>
                  <label className="space-y-2">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                      Valor por vaga
                    </span>
                    <input
                      type="number"
                      value={form.valor_vaga}
                      onChange={(e) => update('valor_vaga', e.target.value)}
                      className="w-full border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-[#142340] outline-none focus:border-[#2563eb]"
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                      Premiação
                    </span>
                    <input
                      type="number"
                      value={form.valor_premiacao}
                      onChange={(e) => update('valor_premiacao', e.target.value)}
                      className="w-full border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-[#142340] outline-none focus:border-[#2563eb]"
                    />
                  </label>
                </>
              )}

              {isXtreinoContext && form.xtreino_tipo_inscricao === 'pago' && (
                <label className="space-y-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                    Valor por vaga
                  </span>
                  <input
                    type="number"
                    value={form.valor_vaga}
                    onChange={(e) => update('valor_vaga', e.target.value)}
                    className="w-full border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-[#142340] outline-none focus:border-[#2563eb]"
                  />
                </label>
              )}

              {isXtreinoContext && form.xtreino_tem_premiacao === 'sim' && (
                <label className="space-y-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                    Valor da premiação
                  </span>
                  <input
                    type="number"
                    value={form.valor_premiacao}
                    onChange={(e) => update('valor_premiacao', e.target.value)}
                    className="w-full border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-[#142340] outline-none focus:border-[#2563eb]"
                  />
                </label>
              )}
            </div>

            <div className="mt-6 border border-zinc-200 bg-white p-4">
              <div className="mb-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#2563eb]">
                  Contatos
                </p>
                <p className="mt-1 text-sm font-semibold text-zinc-500">
                  WhatsApps que aparecem para equipes comprarem vagas pelo link mobile.
                </p>
              </div>

              <div className="space-y-3">
                {form.whatsapp_contatos.map((contato, index) => (
                  <div key={`whatsapp-${index}`} className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                    <label className="space-y-2">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                        Nome do vendedor
                      </span>
                      <input
                        value={contato.nome}
                        onChange={(event) => {
                          const proximos = [...form.whatsapp_contatos]
                          proximos[index] = { ...proximos[index], nome: event.target.value }
                          update('whatsapp_contatos', proximos)
                        }}
                        className="w-full border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-[#142340] outline-none focus:border-[#2563eb]"
                      />
                    </label>

                    <label className="space-y-2">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                        WhatsApp
                      </span>
                      <input
                        value={contato.numero}
                        onChange={(event) => {
                          const proximos = [...form.whatsapp_contatos]
                          proximos[index] = { ...proximos[index], numero: event.target.value }
                          update('whatsapp_contatos', proximos)
                          if (index === 0) update('whatsapp_suporte', event.target.value)
                        }}
                        placeholder="91999999999"
                        className="w-full border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-[#142340] outline-none focus:border-[#2563eb]"
                      />
                    </label>

                    <button
                      type="button"
                      onClick={() => {
                        const proximos = form.whatsapp_contatos.filter((_, i) => i !== index)
                        update('whatsapp_contatos', proximos.length ? proximos : [{ nome: '', numero: '' }])
                      }}
                      className="mt-7 h-10 border border-red-200 px-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-red-500 hover:bg-red-50"
                    >
                      Remover
                    </button>
                  </div>
                ))}
              </div>

              {form.whatsapp_contatos.length < 3 ? (
                <button
                  type="button"
                  onClick={() => update('whatsapp_contatos', [...form.whatsapp_contatos, { nome: '', numero: '' }])}
                  className="mt-4 h-10 border border-zinc-200 bg-white px-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#142340] hover:border-[#2563eb] hover:text-[#2563eb]"
                >
                  + Contato
                </button>
              ) : null}
            </div>

            <div className="mt-6 border border-zinc-200 bg-white p-4">
              <div className="mb-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#2563eb]">
                  Regras e premiação
                </p>
                <p className="mt-1 text-sm font-semibold text-zinc-500">
                  Campos iguais aos usados na edição do campeonato. Datas de início/fim, fases, grupos e número real de equipes ficam para a criação dos jogos/grupos.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Tipo de premiação</span>
                  <select value={form.tipo_premiacao} onChange={(e) => update('tipo_premiacao', e.target.value)} className="w-full border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-[#142340] outline-none focus:border-[#2563eb]">
                    <option value="dinheiro">Dinheiro</option>
                    <option value="pix">PIX</option>
                    <option value="produto">Produto</option>
                    <option value="mista">Mista</option>
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Premiação garantida</span>
                  <select value={form.premiacao_garantida ? 'sim' : 'nao'} onChange={(e) => update('premiacao_garantida', e.target.value === 'sim')} className="w-full border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-[#142340] outline-none focus:border-[#2563eb]">
                    <option value="nao">Não</option>
                    <option value="sim">Sim</option>
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Pagamento da vaga</span>
                  <select value={form.forma_pagamento} onChange={(e) => update('forma_pagamento', e.target.value)} className="w-full border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-[#142340] outline-none focus:border-[#2563eb]">
                    <option value="pix">PIX</option>
                    <option value="pix">PIX direto</option>
                    
                    <option value="gratis">Grátis</option>
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Pagamento da premiação</span>
                  <select value={form.forma_pagamento_premiacao} onChange={(e) => update('forma_pagamento_premiacao', e.target.value)} className="w-full border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-[#142340] outline-none focus:border-[#2563eb]">
                    <option value="pix">PIX</option>
                    <option value="pix">PIX direto</option>
                    <option value="manual">Manual</option>
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Prazo pagamento premiação</span>
                  <input value={form.prazo_pagamento_premiacao} onChange={(e) => update('prazo_pagamento_premiacao', e.target.value)} className="w-full border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-[#142340] outline-none focus:border-[#2563eb]" />
                </label>

                <label className="space-y-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Check-in obrigatório</span>
                  <select value={form.checkin_obrigatorio ? 'sim' : 'nao'} onChange={(e) => update('checkin_obrigatorio', e.target.value === 'sim')} className="w-full border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-[#142340] outline-none focus:border-[#2563eb]">
                    <option value="nao">Não</option>
                    <option value="sim">Sim</option>
                  </select>
                </label>

                {form.checkin_obrigatorio ? (
                  <label className="space-y-2">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Horário do check-in</span>
                    <input type="time" value={form.horario_checkin} onChange={(e) => update('horario_checkin', e.target.value)} className="w-full border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-[#142340] outline-none focus:border-[#2563eb]" />
                  </label>
                ) : null}

                <label className="space-y-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Jogadores por equipe</span>
                  <input type="number" value={form.jogadores_por_equipe} onChange={(e) => update('jogadores_por_equipe', e.target.value)} className="w-full border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-[#142340] outline-none focus:border-[#2563eb]" />
                </label>

                <label className="space-y-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Reservas permitidos</span>
                  <input type="number" value={form.reservas_permitidos} onChange={(e) => update('reservas_permitidos', e.target.value)} className="w-full border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-[#142340] outline-none focus:border-[#2563eb]" />
                </label>

                <label className="space-y-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Substitutos permitidos</span>
                  <select value={form.substitutos_permitidos ? 'sim' : 'nao'} onChange={(e) => update('substitutos_permitidos', e.target.value === 'sim')} className="w-full border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-[#142340] outline-none focus:border-[#2563eb]">
                    <option value="nao">Não</option>
                    <option value="sim">Sim</option>
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Idade mínima</span>
                  <input type="number" value={form.idade_minima} onChange={(e) => update('idade_minima', e.target.value)} className="w-full border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-[#142340] outline-none focus:border-[#2563eb]" />
                </label>

                <label className="space-y-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Nível mínimo da conta</span>
                  <input type="number" value={form.nivel_minimo_conta} onChange={(e) => update('nivel_minimo_conta', e.target.value)} className="w-full border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-[#142340] outline-none focus:border-[#2563eb]" />
                </label>

                <label className="space-y-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Pro players proibidos</span>
                  <select value={form.pro_players_proibidos ? 'sim' : 'nao'} onChange={(e) => update('pro_players_proibidos', e.target.value === 'sim')} className="w-full border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-[#142340] outline-none focus:border-[#2563eb]">
                    <option value="nao">Não</option>
                    <option value="sim">Sim</option>
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Troca de jogadores</span>
                  <select value={form.troca_jogadores} onChange={(e) => update('troca_jogadores', e.target.value)} className="w-full border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-[#142340] outline-none focus:border-[#2563eb]">
                    <option value="livre">Livre</option>
                    <option value="bloqueada_apos_checkin">Bloqueada após check-in</option>
                    <option value="bloqueada_apos_inicio">Bloqueada após início</option>
                    <option value="manual">Manual</option>
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Penalidade WO</span>
                  <input value={form.penalidade_wo} onChange={(e) => update('penalidade_wo', e.target.value)} className="w-full border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-[#142340] outline-none focus:border-[#2563eb]" />
                </label>

                <label className="space-y-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Limite por organização</span>
                  <input type="number" value={form.limite_por_organizacao} onChange={(e) => update('limite_por_organizacao', e.target.value)} className="w-full border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-[#142340] outline-none focus:border-[#2563eb]" />
                </label>

                <label className="space-y-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Fuso horário</span>
                  <input value={form.fuso_horario} onChange={(e) => update('fuso_horario', e.target.value)} className="w-full border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-[#142340] outline-none focus:border-[#2563eb]" />
                </label>

                <label className="space-y-2 md:col-span-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Guildas restritas</span>
                  <textarea value={form.guildas_restritas} onChange={(e) => update('guildas_restritas', e.target.value)} rows={2} className="w-full border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-[#142340] outline-none focus:border-[#2563eb]" />
                </label>
              </div>
            </div>

            </>

            {isPartida && (
              <div className="mt-8 border border-zinc-200 bg-white p-4">
                <div className="mb-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#2563eb]">
                    Configuração avançada
                  </p>
                  <p className="mt-1 text-sm font-semibold text-zinc-500">
                    Defina o modo 1x1 até 4x4, quantidade de equipes, mata-mata, pontos corridos ou grupos + playoff.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                      Modo da partida
                    </span>
                    <select
                      value={form.modo_partida}
                      onChange={(e) => update('modo_partida', e.target.value)}
                      className="w-full border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-[#142340] outline-none focus:border-[#2563eb]"
                    >
                      <option value="1x1">1x1</option>
                      <option value="2x2">2x2</option>
                      <option value="2x3">2x3</option>
                      <option value="4x4">4x4</option>
                    </select>
                  </label>

                  <label className="space-y-2">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                      Estilo
                    </span>
                    <select
                      value={form.estilo_partida}
                      onChange={(e) => update('estilo_partida', e.target.value)}
                      className="w-full border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-[#142340] outline-none focus:border-[#2563eb]"
                    >
                      <option value="ump">UMP</option>
                      <option value="tatico">Tático</option>
                    </select>
                  </label>

                  <label className="space-y-2">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                      Formato do evento
                    </span>
                    <select
                      value={form.formato_evento}
                      onChange={(e) => update('formato_evento', e.target.value)}
                      className="w-full border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-[#142340] outline-none focus:border-[#2563eb]"
                    >
                      <option value="mata_mata">Mata-mata</option>
                      <option value="dupla_eliminacao">Dupla eliminação</option>
                      <option value="pontos_corridos">Pontos corridos</option>
                      <option value="grupos_playoff">Grupos + playoff</option>
                    </select>
                  </label>

                  <label className="space-y-2">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                      Melhor de
                    </span>
                    <select
                      value={form.melhor_de}
                      onChange={(e) => update('melhor_de', e.target.value)}
                      className="w-full border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-[#142340] outline-none focus:border-[#2563eb]"
                    >
                      <option value="1">BO1</option>
                      <option value="3">BO3</option>
                      <option value="5">BO5</option>
                    </select>
                  </label>

                  <label className="space-y-2">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                      Rounds por lado
                    </span>
                    <input
                      type="number"
                      value={form.rounds_por_lado}
                      onChange={(e) => update('rounds_por_lado', e.target.value)}
                      className="w-full border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-[#142340] outline-none focus:border-[#2563eb]"
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                      Troca de lado
                    </span>
                    <select
                      value={form.troca_de_lado}
                      onChange={(e) => update('troca_de_lado', e.target.value)}
                      className="w-full border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-[#142340] outline-none focus:border-[#2563eb]"
                    >
                      <option value="sim">Sim</option>
                      <option value="nao">Não</option>
                    </select>
                  </label>

                  <label className="space-y-2">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                      Prorrogação
                    </span>
                    <select
                      value={form.tem_prorrogacao}
                      onChange={(e) => update('tem_prorrogacao', e.target.value)}
                      className="w-full border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-[#142340] outline-none focus:border-[#2563eb]"
                    >
                      <option value="nao">Não</option>
                      <option value="sim">Sim</option>
                    </select>
                  </label>

                  <label className="space-y-2">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                      Admin mode
                    </span>
                    <select
                      value={form.admin_mode}
                      onChange={(e) => update('admin_mode', e.target.value)}
                      className="w-full border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-[#142340] outline-none focus:border-[#2563eb]"
                    >
                      <option value="manual">Manual</option>
                      <option value="automatico">Automático</option>
                    </select>
                  </label>

                  <label className="space-y-2 md:col-span-2">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                      Regra de WO
                    </span>
                    <select
                      value={form.regra_wo}
                      onChange={(e) => update('regra_wo', e.target.value)}
                      className="w-full border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-[#142340] outline-none focus:border-[#2563eb]"
                    >
                      <option value="derrota_simples">Derrota simples</option>
                      <option value="eliminacao">Eliminação</option>
                      <option value="reagendar">Permitir reagendamento</option>
                    </select>
                  </label>

                  <label className="space-y-2">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                      Tipo de mapa
                    </span>
                    <select
                      value={form.tipo_mapa}
                      onChange={(e) => update('tipo_mapa', e.target.value)}
                      className="w-full border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-[#142340] outline-none focus:border-[#2563eb]"
                    >
                      <option value="fixo">Mapa fixo</option>
                      <option value="veto">Veto de mapas</option>
                    </select>
                  </label>

                  {form.tipo_mapa === 'fixo' && (
                    <label className="space-y-2">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                        Mapa padrão
                      </span>
                      <select
                        value={form.mapa_padrao}
                        onChange={(e) => update('mapa_padrao', e.target.value)}
                        className="w-full border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-[#142340] outline-none focus:border-[#2563eb]"
                      >
                        <option value="BERMUDA">BERMUDA</option>
                        <option value="PURGATÓRIO">PURGATÓRIO</option>
                        <option value="ALPINE">ALPINE</option>
                        <option value="KALAHARI">KALAHARI</option>
                        <option value="NEXUS">NEXUS</option>
                      </select>
                    </label>
                  )}

                  {form.formato_evento === 'dupla_eliminacao' && (
                    <>
                      <label className="space-y-2">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                          Upper / Lower
                        </span>
                        <select
                          value={form.usa_upper_lower}
                          onChange={(e) => update('usa_upper_lower', e.target.value)}
                          className="w-full border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-[#142340] outline-none focus:border-[#2563eb]"
                        >
                          <option value="sim">Sim</option>
                          <option value="nao">Não</option>
                        </select>
                      </label>

                      <label className="space-y-2">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                          Reset na final
                        </span>
                        <select
                          value={form.reset_final}
                          onChange={(e) => update('reset_final', e.target.value)}
                          className="w-full border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-[#142340] outline-none focus:border-[#2563eb]"
                        >
                          <option value="nao">Não</option>
                          <option value="sim">Sim</option>
                        </select>
                      </label>
                    </>
                  )}

                  {form.formato_evento === 'pontos_corridos' && (
                    <>
                      <label className="space-y-2">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                          Ida e volta
                        </span>
                        <select
                          value={form.ida_e_volta}
                          onChange={(e) => update('ida_e_volta', e.target.value)}
                          className="w-full border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-[#142340] outline-none focus:border-[#2563eb]"
                        >
                          <option value="nao">Não</option>
                          <option value="sim">Sim</option>
                        </select>
                      </label>

                      <label className="space-y-2">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                          Pontuação por vitória
                        </span>
                        <input
                          type="number"
                          value={form.pontuacao_vitoria}
                          onChange={(e) => update('pontuacao_vitoria', e.target.value)}
                          className="w-full border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-[#142340] outline-none focus:border-[#2563eb]"
                        />
                      </label>

                      <label className="space-y-2">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                          Pontuação por derrota
                        </span>
                        <input
                          type="number"
                          value={form.pontuacao_derrota}
                          onChange={(e) => update('pontuacao_derrota', e.target.value)}
                          className="w-full border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-[#142340] outline-none focus:border-[#2563eb]"
                        />
                      </label>
                    </>
                  )}

                  {form.formato_evento === 'grupos_playoff' && (
                    <>
                      <label className="space-y-2">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                          Número de grupos
                        </span>
                        <input
                          type="number"
                          value={form.numero_grupos}
                          onChange={(e) => update('numero_grupos', e.target.value)}
                          className="w-full border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-[#142340] outline-none focus:border-[#2563eb]"
                        />
                      </label>

                      <label className="space-y-2">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                          Classificados por grupo
                        </span>
                        <input
                          type="number"
                          value={form.classificados_por_grupo}
                          onChange={(e) => update('classificados_por_grupo', e.target.value)}
                          className="w-full border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-[#142340] outline-none focus:border-[#2563eb]"
                        />
                      </label>
                    </>
                  )}
                </div>
              </div>
            )}

            {exibirEstruturaCompetitiva && (
              <div className="space-y-6">
                <div className="border border-zinc-200 bg-white p-4">
                  <div className="mb-4 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#2563eb]">
                        Estrutura competitiva
                      </p>
                      <p className="mt-1 text-sm font-semibold text-zinc-500">
                        Monte as fases e grupos abaixo. A criação agora é feita em tela única, sem etapas separadas.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={adicionarFaseEstrutura}
                      className="inline-flex h-11 items-center justify-center gap-2 border border-zinc-200 bg-white px-5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#142340] transition-colors hover:border-[#2563eb] hover:text-[#2563eb]"
                    >
                      <Plus size={15} />
                      Adicionar fase
                    </button>
                  </div>

                  <div className="space-y-5">
                    {fasesEstrutura.map((fase, faseIndex) => (
                      <div key={`fase-${faseIndex}`} className="border border-zinc-200 bg-white p-4">
                        <div className="mb-4 flex items-center justify-between gap-3">
                          <div className="flex-1">
                            <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                              Nome da fase
                            </label>
                            <input
                              value={fase.nome}
                              onChange={(e) => atualizarNomeFase(faseIndex, e.target.value)}
                              className="w-full border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-[#142340] outline-none focus:border-[#2563eb]"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() => removerFaseEstrutura(faseIndex)}
                            disabled={fasesEstrutura.length <= 1}
                            className="mt-7 inline-flex h-11 w-11 items-center justify-center border border-zinc-200 bg-zinc-50 text-zinc-500 transition-colors hover:border-red-500 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>

                        <div className="mb-4 flex justify-end">
                          <button
                            type="button"
                            onClick={() => adicionarGrupoEstrutura(faseIndex)}
                            className="inline-flex h-10 items-center justify-center gap-2 border border-zinc-200 bg-zinc-50 px-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#142340] transition-colors hover:border-[#2563eb] hover:text-[#2563eb]"
                          >
                            <Plus size={14} />
                            Adicionar grupo
                          </button>
                        </div>

                        <div className="space-y-4">
                          {fase.grupos.map((grupo, grupoIndex) => (
                            <div key={`fase-${faseIndex}-grupo-${grupoIndex}`} className="border border-zinc-200 bg-zinc-50 p-4">
                              <div className="mb-4 flex items-center justify-between gap-3">
                                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#2563eb]">
                                  Grupo {grupoIndex + 1}
                                </div>

                                <button
                                  type="button"
                                  onClick={() => removerGrupoEstrutura(faseIndex, grupoIndex)}
                                  disabled={fase.grupos.length <= 1}
                                  className="inline-flex h-10 w-10 items-center justify-center border border-zinc-200 bg-zinc-50 text-zinc-500 transition-colors hover:border-red-500 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>

                              <div className="grid gap-3 sm:grid-cols-2">
                                <label className="space-y-2">
                                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                                    Letra do grupo
                                  </span>
                                  <select
                                    value={extrairLetraGrupo(grupo.nome)}
                                    onChange={(e) => atualizarGrupoEstrutura(faseIndex, grupoIndex, 'nome', montarNomeGrupo(e.target.value))}
                                    className="w-full border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-[#142340] outline-none focus:border-[#2563eb]"
                                  >
                                    {LETRAS_GRUPO.map((letra) => {
                                      const usada = fase.grupos.some((item, itemIndex) => itemIndex !== grupoIndex && extrairLetraGrupo(item.nome) === letra)
                                      return (
                                        <option key={letra} value={letra} disabled={usada}>
                                          {montarNomeGrupo(letra)}{usada ? ' - JA EXISTE' : ''}
                                        </option>
                                      )
                                    })}
                                  </select>
                                </label>

                                <label className="space-y-2">
                                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                                    Quantidade de equipes
                                  </span>
                                  <input
                                    type="number"
                                    value={grupo.quantidade_equipes}
                                    onChange={(e) => atualizarGrupoEstrutura(faseIndex, grupoIndex, 'quantidade_equipes', e.target.value)}
                                    className="w-full border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-[#142340] outline-none focus:border-[#2563eb]"
                                  />
                                </label>

                                <label className="space-y-2">
                                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                                    Número de partidas
                                  </span>
                                  <input
                                    type="number"
                                    value={grupo.numero_partidas}
                                    onChange={(e) => atualizarGrupoEstrutura(faseIndex, grupoIndex, 'numero_partidas', e.target.value)}
                                    className="w-full border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-[#142340] outline-none focus:border-[#2563eb]"
                                  />
                                </label>

                                <label className="space-y-2">
                                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                                    Classificam
                                  </span>
                                  <input
                                    type="number"
                                    value={grupo.classificam}
                                    onChange={(e) => atualizarGrupoEstrutura(faseIndex, grupoIndex, 'classificam', e.target.value)}
                                    className="w-full border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-[#142340] outline-none focus:border-[#2563eb]"
                                  />
                                </label>

                                <label className="space-y-2">
                                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                                    Dia do jogo
                                  </span>
                                  <input
                                    type="date"
                                    value={grupo.dia_jogo}
                                    onChange={(e) => atualizarGrupoEstrutura(faseIndex, grupoIndex, 'dia_jogo', e.target.value)}
                                    className="w-full border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-[#142340] outline-none focus:border-[#2563eb]"
                                  />
                                </label>

                                <label className="space-y-2">
                                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                                    Hora do jogo
                                  </span>
                                  <input
                                    type="time"
                                    value={grupo.hora_jogo}
                                    onChange={(e) => atualizarGrupoEstrutura(faseIndex, grupoIndex, 'hora_jogo', e.target.value)}
                                    className="w-full border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-[#142340] outline-none focus:border-[#2563eb]"
                                  />
                                </label>

                                <label className="space-y-2 md:col-span-2">
                                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                                    Intervalo entre partidas (min)
                                  </span>
                                  <input
                                    type="number"
                                    value={grupo.intervalo_minutos}
                                    onChange={(e) => atualizarGrupoEstrutura(faseIndex, grupoIndex, 'intervalo_minutos', e.target.value)}
                                    className="w-full border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-[#142340] outline-none focus:border-[#2563eb]"
                                  />
                                </label>

                                {Array.from({ length: Number(grupo.numero_partidas || 0) || 0 }).map((_, mapaIndex) => (
                                  <label key={`mapa-${mapaIndex}`} className="space-y-2">
                                    <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                                      Mapa da partida {mapaIndex + 1}
                                    </span>
                                    <select
                                      value={grupo.mapas[mapaIndex] || 'BERMUDA'}
                                      onChange={(e) => {
                                        const mapasAtualizados = [...grupo.mapas]
                                        mapasAtualizados[mapaIndex] = e.target.value
                                        atualizarGrupoEstrutura(faseIndex, grupoIndex, 'mapas', mapasAtualizados)
                                      }}
                                      className="w-full border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-[#142340] outline-none focus:border-[#2563eb]"
                                    >
                                      <option value="BERMUDA">BERMUDA</option>
                                      <option value="PURGATÓRIO">PURGATÓRIO</option>
                                      <option value="ALPINE">ALPINE</option>
                                      <option value="KALAHARI">KALAHARI</option>
                                      <option value="NEXUS">NEXUS</option>
                                    </select>
                                  </label>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {erro ? (
              <div className="mt-6 border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
                {erro}
              </div>
            ) : null}

            <div className="mt-8 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <p className="text-xs font-semibold text-zinc-500">
                {isXtreinoContext
                  ? exibirEstruturaCompetitiva
                    ? 'Preencha os dados e revise as fases e grupos antes de criar o xtreino.'
                    : 'No xtreino, você escolhe o formato primeiro. Jogo único reaproveita a lógica do diário.'
                  : isPartida
                    ? 'Esse formulário cria um campeonato com várias equipes.'
                    : 'Esse formulário já salva os dados base do campeonato e a config inicial do modo.'}
              </p>

              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <button
                  type="submit"
                  disabled={loading || !produtoraResolvida?.id}
                  className="inline-flex h-12 items-center justify-center gap-2 bg-[#2563eb] px-6 text-sm font-semibold uppercase tracking-[0.18em] text-white transition-transform hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? <Loader2 className="animate-spin" size={16} /> : <Trophy size={16} />}
                  {`Criar ${tituloTela}`}
                </button>
              </div>
            </div>
          </form>
        </div>


        {cropAberto ? (
          <div className="fixed inset-0 z-[120] grid place-items-center bg-slate-950/70 px-4 py-6 backdrop-blur-md">
            <div className="w-full max-w-4xl border border-zinc-200 bg-white shadow-[0_28px_90px_rgba(0,0,0,0.35)]">
              <div className="border-b border-zinc-200 px-5 py-4">
                <h3 className="text-sm font-black uppercase tracking-[0.18em] text-[#142340]">
                  {cropAberto.titulo}
                </h3>
                <p className="mt-1 text-xs font-semibold text-zinc-500">{cropAberto.ajuda}</p>
              </div>

              <div className="grid gap-5 p-5 md:grid-cols-[minmax(0,1fr)_260px]">
                <div className="flex min-h-[360px] items-center justify-center bg-zinc-100 p-4">
                  <div
                    className="relative max-h-[70vh] w-full max-w-[420px] overflow-hidden bg-black/5 shadow-inner"
                    style={{ aspectRatio: `${cropAberto.largura} / ${cropAberto.altura}` }}
                  >
                    <img
                      src={cropAberto.preview}
                      alt="Imagem para recorte"
                      className="absolute left-1/2 top-1/2 h-full w-full select-none object-cover"
                      style={{
                        transform: `translate(-50%, -50%) translate(${cropAberto.offsetX}%, ${cropAberto.offsetY}%) scale(${cropAberto.zoom})`,
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-5">
                  <div>
                    <label className="text-[11px] font-black uppercase tracking-[0.16em] text-zinc-500">
                      Zoom
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="3"
                      step="0.01"
                      value={cropAberto.zoom}
                      onChange={(e) => setCropAberto((prev) => prev ? { ...prev, zoom: Number(e.target.value) } : prev)}
                      className="mt-2 w-full"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-black uppercase tracking-[0.16em] text-zinc-500">
                      Mover horizontal
                    </label>
                    <input
                      type="range"
                      min="-100"
                      max="100"
                      step="1"
                      value={cropAberto.offsetX}
                      onChange={(e) => setCropAberto((prev) => prev ? { ...prev, offsetX: Number(e.target.value) } : prev)}
                      className="mt-2 w-full"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-black uppercase tracking-[0.16em] text-zinc-500">
                      Mover vertical
                    </label>
                    <input
                      type="range"
                      min="-100"
                      max="100"
                      step="1"
                      value={cropAberto.offsetY}
                      onChange={(e) => setCropAberto((prev) => prev ? { ...prev, offsetY: Number(e.target.value) } : prev)}
                      className="mt-2 w-full"
                    />
                  </div>

                  <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-xs font-semibold leading-5 text-zinc-600">
                    Saída final: {cropAberto.largura} x {cropAberto.altura} pixels em PNG.
                  </div>

                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={aplicarRecorteImagem}
                      className="h-11 bg-[#2563eb] px-4 text-xs font-black uppercase tracking-[0.16em] text-white hover:bg-blue-500"
                    >
                      Usar imagem ajustada
                    </button>
                    <button
                      type="button"
                      onClick={fecharRecorteImagem}
                      className="h-11 border border-zinc-200 bg-white px-4 text-xs font-black uppercase tracking-[0.16em] text-zinc-600 hover:bg-zinc-50"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {produtoraModalAberto ? (
          <div className="fixed inset-0 z-[110] grid place-items-center bg-slate-950/60 px-4 py-6 backdrop-blur-md">
            <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[28px] border border-zinc-200 bg-white shadow-[0_28px_90px_rgba(0,0,0,0.30)]">
              <FormProdutora
                mode="create"
                embedded
                onCancel={() => setProdutoraModalAberto(false)}
                onSuccess={(produtora) => {
                  setProdutoraCriada(produtora)
                  setProdutoraModalAberto(false)
                  setErro('')
                }}
              />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default function FormCriacaoTipo(props: Props) {
  return (
    <Suspense fallback={null}>
      <FormCriacaoTipoInner {...props} />
    </Suspense>
  )
}
