'use client'

import { useCallback, useEffect, useMemo, useState, type PointerEvent } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Columns3, Copy, Eye, EyeOff, ImageIcon, Loader2, MonitorUp, Move, Palette, Plus, RefreshCw, Save, SlidersHorizontal, Table2, Trash2, Type } from 'lucide-react'
import { getStreamOverlayDefinition } from '@/app/components/stream/overlays/registry'
import {
  RankingRow,
  StreamOverlayBlock,
  TabelaGeralOverlay,
  defaultTabelaGeralColumnWidths,
  defaultTabelaGeralConfig,
  fixedStreamOverlayTemplates,
  getFixedStreamOverlayTemplate,
  mergeOverlayConfig,
  sampleRankingRows,
  tabelaGeralColumnLabels,
} from '@/lib/streamOverlay'

type Template = {
  id: string
  nome: string
  categoria: string
  descricao: string | null
  config_padrao: any
  fixed?: boolean
}

type Overlay = {
  id: string
  project_id: string
  template_id: string
  nome: string
  config: any
  visivel: boolean
  ordem: number
}

type Projeto = {
  id: string
  nome: string
  stream_key: string
  campeonato_id: string | null
}

type EditorAction = 'move' | 'content' | 'style' | 'table'

const blockLabels: Record<StreamOverlayBlock, string> = {
  image: 'Imagem',
  text: 'Texto',
  table: 'Overlay',
}

const checkerboardStyle = {
  backgroundColor: '#ffffff',
  backgroundImage:
    'linear-gradient(45deg, #d7d7d7 25%, transparent 25%), linear-gradient(-45deg, #d7d7d7 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #d7d7d7 75%), linear-gradient(-45deg, transparent 75%, #d7d7d7 75%)',
  backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
  backgroundSize: '20px 20px',
}

const colorSwatches = [
  '#e60012',
  '#f6c453',
  '#101827',
  '#d8ab4f',
  '#ffffff',
  '#0ea5e9',
  '#22c55e',
  '#8b5cf6',
  '#f97316',
  '#020617',
  'rgba(255,255,255,0.88)',
  'rgba(8,13,22,0.92)',
]

const STREAM_ASSET_BUCKET = 'imagem_campeonatos'
const DATA_IMAGE_REGEX = /data:image\/[a-zA-Z0-9.+-]+;base64,[^"')\s]+/g
const tabelaGeralColumnKeys = Object.keys(tabelaGeralColumnLabels)

function extractColor(value?: string) {
  const text = String(value || '').trim()
  const hex = text.match(/#[0-9a-fA-F]{6}/)?.[0]
  return hex || '#ffffff'
}

function gradientValue(start: string, end: string, direction = '90deg') {
  return `linear-gradient(${direction}, ${start || '#ffffff'}, ${end || '#101827'})`
}

function imageBackgroundValue(url: string) {
  return `url("${url}")`
}

function assetExtensao(fileName: string, mime?: string) {
  const fromName = fileName.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '')
  if (fromName) return fromName
  if (mime?.includes('jpeg')) return 'jpg'
  if (mime?.includes('webp')) return 'webp'
  if (mime?.includes('gif')) return 'gif'
  return 'png'
}

function pastaSegura(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'asset'
}

function dataUrlToFile(dataUrl: string, fileName: string) {
  const [header, base64] = dataUrl.split(',')
  const mime = header.match(/data:([^;]+);/)?.[1] || 'image/png'
  const binary = atob(base64 || '')
  const bytes = new Uint8Array(binary.length)

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }

  return new File([bytes], fileName, { type: mime })
}

type CampeonatoEquipeRow = {
  id: string
  equipe_id: string | null
  equipe_avulsa_id: string | null
  nome_exibicao?: string | null
  grupo_id: string | null
  equipes?: { nome?: string | null; tag?: string | null; logo_url?: string | null } | null
  equipe_avulsa?: { nome?: string | null; tag?: string | null; logo_url?: string | null } | null
}

type ResultadoRow = {
  equipe_id: string | null
  grupo_id?: string | null
  colocacao?: number | null
  posicao?: number | null
  abates?: number | null
  pontos_total?: number | null
  total_pontos?: number | null
}

function textoSeguro(valor: unknown, fallback = '') {
  const texto = String(valor || '').trim()
  return texto || fallback
}

function numero(valor: unknown) {
  return Number(valor || 0)
}

function getEquipeNome(item: CampeonatoEquipeRow) {
  return item.equipes?.nome || item.equipe_avulsa?.nome || item.nome_exibicao || `Equipe ${String(item.id || '').slice(0, 6)}`
}

function getEquipeTag(item: CampeonatoEquipeRow) {
  return item.equipes?.tag || item.equipe_avulsa?.tag || null
}

function getEquipeLogo(item: CampeonatoEquipeRow) {
  return item.equipes?.logo_url || item.equipe_avulsa?.logo_url || null
}

function normalizarTemplateNome(value: unknown) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/gi, ' ')
    .trim()
    .toLowerCase()
}

async function sincronizarTemplatesFixos() {
  const { error } = await supabase
    .from('stream_overlay_templates')
    .upsert(fixedStreamOverlayTemplates.map((template) => ({
      id: template.id,
      nome: template.nome,
      categoria: template.categoria,
      descricao: template.descricao,
      config_padrao: template.config_padrao,
      ativo: true,
    })), { onConflict: 'id' })

  if (error) throw error
}

async function carregarRankingTabelaGeral(campeonatoId: string): Promise<RankingRow[]> {
  const [{ data: equipes }, { data: grupos }, partidasRes, jogosRes] = await Promise.all([
    supabase
      .from('campeonato_equipes')
      .select(`
        id,
        equipe_id,
        equipe_avulsa_id,
        nome_exibicao,
        grupo_id,
        equipes ( nome, tag, logo_url ),
        equipe_avulsa:equipes_avulsas_campeonato ( nome, tag, logo_url )
      `)
      .eq('campeonato_id', campeonatoId)
      .order('created_at', { ascending: true }),
    supabase.from('campeonato_grupos').select('id, nome').eq('campeonato_id', campeonatoId),
    supabase.from('resultados_partidas_equipes').select('equipe_id, grupo_id, colocacao, abates, pontos_total').eq('campeonato_id', campeonatoId),
    supabase.from('resultados_jogos').select('equipe_id, grupo_id, posicao, abates, total_pontos').eq('campeonato_id', campeonatoId),
  ])

  const equipesLista = (equipes || []) as CampeonatoEquipeRow[]
  const gruposMap = new Map(((grupos || []) as any[]).map((grupo) => [textoSeguro(grupo.id), textoSeguro(grupo.nome, '-')]))
  const resultadosPartidas = ((partidasRes.data || []) as ResultadoRow[]).map((row) => ({
    equipe_id: row.equipe_id,
    grupo_id: row.grupo_id,
    colocacao: row.colocacao,
    abates: row.abates,
    pontos: row.pontos_total,
  }))
  const resultadosJogos = ((jogosRes.data || []) as ResultadoRow[]).map((row) => ({
    equipe_id: row.equipe_id,
    grupo_id: row.grupo_id,
    colocacao: row.posicao,
    abates: row.abates,
    pontos: row.total_pontos,
  }))
  const resultados = resultadosPartidas.length > 0 ? resultadosPartidas : resultadosJogos
  const statsMap = new Map<string, { quedas: number; booyahs: number; kills: number; pontos: number; grupoId: string | null }>()
  const publicToCampeonato = new Map<string, string>()

  equipesLista.forEach((equipe) => {
    ;[equipe.id, equipe.equipe_id, equipe.equipe_avulsa_id].map((item) => textoSeguro(item)).filter(Boolean).forEach((ref) => publicToCampeonato.set(ref, equipe.id))
  })

  resultados.forEach((resultado) => {
    const ref = textoSeguro(resultado.equipe_id)
    const campeonatoEquipeId = publicToCampeonato.get(ref) || ref
    if (!campeonatoEquipeId) return
    const atual = statsMap.get(campeonatoEquipeId) || { quedas: 0, booyahs: 0, kills: 0, pontos: 0, grupoId: null as string | null }

    atual.quedas += 1
    atual.kills += numero(resultado.abates)
    atual.pontos += numero(resultado.pontos)
    if (numero(resultado.colocacao) === 1) atual.booyahs += 1
    if (!atual.grupoId && resultado.grupo_id) atual.grupoId = textoSeguro(resultado.grupo_id)

    statsMap.set(campeonatoEquipeId, atual)
  })

  return equipesLista
    .map((equipe) => {
      const stats = statsMap.get(equipe.id) || { quedas: 0, booyahs: 0, kills: 0, pontos: 0, grupoId: null }
      const grupoId = textoSeguro(stats.grupoId || equipe.grupo_id)
      return {
        id: equipe.id,
        nome: getEquipeNome(equipe),
        tag: getEquipeTag(equipe),
        logo: getEquipeLogo(equipe),
        grupo: grupoId ? gruposMap.get(grupoId) || '-' : '-',
        quedas: stats.quedas,
        booyahs: stats.booyahs,
        kills: stats.kills,
        pontos: stats.pontos,
      }
    })
    .sort((a, b) => b.pontos - a.pontos || b.booyahs - a.booyahs || b.kills - a.kills || a.nome.localeCompare(b.nome, 'pt-BR'))
}

export default function StreamOverlayEditorPage() {
  const params = useParams<{ projectId: string }>()
  const projectId = params?.projectId

  const [projeto, setProjeto] = useState<Projeto | null>(null)
  const [templates, setTemplates] = useState<Template[]>([])
  const [overlays, setOverlays] = useState<Overlay[]>([])
  const [rankingRows, setRankingRows] = useState<RankingRow[]>([])
  const [isSiteAdmin, setIsSiteAdmin] = useState(false)
  const [overlayId, setOverlayId] = useState('')
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [selectedBlock, setSelectedBlock] = useState<StreamOverlayBlock>('table')
  const [activeAction, setActiveAction] = useState<EditorAction>('move')
  const [selectedColumn, setSelectedColumn] = useState('nome')
  const [selectedRow, setSelectedRow] = useState(1)
  const [draftConfig, setDraftConfig] = useState<any | null>(null)
  const [temAlteracoesPendentes, setTemAlteracoesPendentes] = useState(false)

  const origem = typeof window !== 'undefined' ? window.location.origin : ''

  const overlayAtual = useMemo(() => overlays.find((item) => item.id === overlayId) || overlays[0] || null, [overlays, overlayId])
  const templateAtual = useMemo(() => templates.find((item) => item.id === overlayAtual?.template_id) || null, [templates, overlayAtual])
  const configSalva = useMemo(() => mergeOverlayConfig(defaultTabelaGeralConfig, mergeOverlayConfig(templateAtual?.config_padrao || {}, overlayAtual?.config || {})), [templateAtual, overlayAtual])
  const config = draftConfig || configSalva
  const fixedOverlayAtual = getFixedStreamOverlayTemplate(overlayAtual?.template_id)
  const previewOverlayDefinition = getStreamOverlayDefinition(overlayAtual?.template_id)
  const renderUrl = overlayAtual
    ? fixedOverlayAtual && projeto?.stream_key
      ? `${origem}/stream/overlay/${projeto.stream_key}/${fixedOverlayAtual.slug}`
      : `${origem}/stream/render/${overlayAtual.id}`
    : ''
  const previewRows = rankingRows.length > 0 ? rankingRows : sampleRankingRows(Number(config.layout?.maxRows || 12))
  const previewScale = 0.5
  const orderedColumnKeys = useMemo(() => {
    const savedOrder = ((config.columnsOrder || []) as string[]).filter((key) => tabelaGeralColumnKeys.includes(key))
    return [...savedOrder, ...tabelaGeralColumnKeys.filter((key) => !savedOrder.includes(key))]
  }, [config.columnsOrder])
  const selectedColumnIndex = Math.max(0, orderedColumnKeys.indexOf(selectedColumn))
  const selectedColumnWidth = Number(config.columnWidths?.[selectedColumn] ?? defaultTabelaGeralColumnWidths[selectedColumn] ?? 1)

  useEffect(() => {
    setDraftConfig(configSalva)
    setTemAlteracoesPendentes(false)
  }, [overlayAtual?.id, configSalva])

  const carregar = useCallback(async () => {
    if (!projectId) return
    setLoading(true)

    try {
      await sincronizarTemplatesFixos()
    } catch (error) {
      console.warn('Nao foi possivel sincronizar templates oficiais.', error)
    }

    const [projRes, tplRes, overlayRes, authRes] = await Promise.all([
      supabase.from('stream_projects').select('id, nome, stream_key, campeonato_id').eq('id', projectId).maybeSingle(),
      supabase.from('stream_overlay_templates').select('id, nome, categoria, descricao, config_padrao').eq('ativo', true).order('nome'),
      supabase.from('stream_project_overlays').select('id, project_id, template_id, nome, config, visivel, ordem').eq('project_id', projectId).order('ordem'),
      supabase.auth.getUser(),
    ])

    if (projRes.data) setProjeto(projRes.data as Projeto)
    const fixedTemplates = fixedStreamOverlayTemplates.map((template) => ({ ...template, fixed: true }))
    let adminAtivo = false

    if (authRes.data.user?.id) {
      const { data: adminData } = await supabase
        .from('site_administradores')
        .select('id')
        .eq('user_id', authRes.data.user.id)
        .eq('ativo', true)
        .limit(1)

      adminAtivo = Boolean(adminData?.length)
      setIsSiteAdmin(adminAtivo)
    }

    const fixedTemplateNames = new Set(fixedStreamOverlayTemplates.map((fixed) => normalizarTemplateNome(fixed.nome)))
    const dbTemplates = ((tplRes.data || []) as Template[]).filter((template) => {
      if (fixedStreamOverlayTemplates.some((fixed) => fixed.id === template.id)) return false
      return !fixedTemplateNames.has(normalizarTemplateNome(template.nome))
    })
    setTemplates(adminAtivo ? [...fixedTemplates, ...dbTemplates] : fixedTemplates)

    let lista = (overlayRes.data || []) as Overlay[]

    // Nao cria overlays automaticamente ao abrir o editor.
    // O projeto deve começar vazio e o dono adiciona apenas as overlays que quiser usar.

    setOverlays(lista)
    if (!overlayId && lista[0]) setOverlayId(lista[0].id)
    setLoading(false)
  }, [projectId, overlayId])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    carregar()
  }, [carregar])

  useEffect(() => {
    if (!projeto?.campeonato_id) return

    async function carregarRanking() {
      if (!projeto?.campeonato_id) return
      setRankingRows(await carregarRankingTabelaGeral(projeto.campeonato_id))
    }

    carregarRanking()
  }, [projeto?.campeonato_id])

  async function criarOverlay(template: Template) {
    if (!projectId) return
    const existente = overlays.find((overlay) => overlay.template_id === template.id)
    if (existente) {
      setOverlayId(existente.id)
      alert('Esse template ja foi adicionado neste projeto.')
      return
    }

    setSalvando(true)
    try {
      if (fixedStreamOverlayTemplates.some((fixed) => fixed.id === template.id)) {
        await sincronizarTemplatesFixos()
      } else {
        const { error: templateError } = await supabase
          .from('stream_overlay_templates')
          .upsert({
            id: template.id,
            nome: template.nome,
            categoria: template.categoria,
            descricao: template.descricao,
            config_padrao: template.config_padrao,
            ativo: true,
          }, { onConflict: 'id' })

        if (templateError) throw templateError
      }
    } catch (error: any) {
      setSalvando(false)
      alert(`Erro ao preparar template: ${error?.message || 'template nao sincronizado'}`)
      return
    }

    const { data, error } = await supabase
      .from('stream_project_overlays')
      .insert({
        project_id: projectId,
        template_id: template.id,
        nome: template.nome,
        config: mergeOverlayConfig(defaultTabelaGeralConfig, template.config_padrao || {}),
        visivel: true,
        ordem: overlays.length + 1,
      })
      .select('id')
      .single()

    setSalvando(false)

    if (error) {
      alert(`Erro ao criar overlay: ${error.message}`)
      return
    }

    setOverlayId(data.id)
    await carregar()
  }

  async function removerOverlay(overlay: Overlay) {
    if (!confirm(`Remover overlay "${overlay.nome}" deste projeto?`)) return

    setSalvando(true)
    const { error } = await supabase
      .from('stream_project_overlays')
      .delete()
      .eq('id', overlay.id)

    setSalvando(false)

    if (error) {
      alert(`Erro ao remover overlay: ${error.message}`)
      return
    }

    setOverlays((prev) => {
      const novaLista = prev.filter((item) => item.id !== overlay.id)
      if (overlayId === overlay.id) setOverlayId(novaLista[0]?.id || '')
      return novaLista
    })
  }

  async function uploadStreamAsset(file: File, pasta: string) {
    if (!overlayAtual) throw new Error('Selecione uma overlay antes de enviar imagem.')

    const extensao = assetExtensao(file.name, file.type)
    const pastaAsset = pastaSegura(pasta)
    const nomeArquivo = `${Date.now()}-${Math.random().toString(36).slice(2)}.${extensao}`
    const caminho = `stream-overlays/${overlayAtual.id}/${pastaAsset}/${nomeArquivo}`

    const { data, error } = await supabase.storage
      .from(STREAM_ASSET_BUCKET)
      .upload(caminho, file, { upsert: false, contentType: file.type || undefined })

    if (error) throw error

    const { data: publicData } = supabase.storage
      .from(STREAM_ASSET_BUCKET)
      .getPublicUrl(data.path)

    return publicData.publicUrl
  }

  async function migrarInlineAssetsParaStorage(valor: any, caminho = 'asset'): Promise<any> {
    if (typeof valor === 'string') {
      const matches = Array.from(new Set(valor.match(DATA_IMAGE_REGEX) || []))
      if (!matches.length) return valor

      let texto = valor

      for (const dataUrl of matches) {
        const mime = dataUrl.match(/data:([^;]+);/)?.[1] || 'image/png'
        const extensao = assetExtensao('', mime)
        const file = dataUrlToFile(dataUrl, `${pastaSegura(caminho)}.${extensao}`)
        const publicUrl = await uploadStreamAsset(file, caminho)
        texto = texto.split(dataUrl).join(publicUrl)
      }

      return texto
    }

    if (Array.isArray(valor)) {
      return Promise.all(valor.map((item, index) => migrarInlineAssetsParaStorage(item, `${caminho}-${index}`)))
    }

    if (valor && typeof valor === 'object') {
      const novo: any = {}
      for (const [chave, item] of Object.entries(valor)) {
        novo[chave] = await migrarInlineAssetsParaStorage(item, `${caminho}-${chave}`)
      }
      return novo
    }

    return valor
  }

  async function salvarConfig(novoConfig: any) {
    if (!overlayAtual) return

    setSalvando(true)
    try {
      const configLeve = await migrarInlineAssetsParaStorage(novoConfig, 'config')
      const { error } = await supabase
        .from('stream_project_overlays')
        .update({
          config: configLeve,
          updated_at: new Date().toISOString(),
        })
        .eq('id', overlayAtual.id)

      if (error) {
        alert(`Erro ao salvar: ${error.message}`)
        return
      }

      setOverlays((prev) => prev.map((item) => item.id === overlayAtual.id ? { ...item, config: configLeve } : item))
      setDraftConfig(configLeve)
      setTemAlteracoesPendentes(false)
    } catch (error) {
      alert(`Erro ao salvar: ${error instanceof Error ? error.message : 'falha ao enviar imagem'}`)
    } finally {
      setSalvando(false)
    }
  }

  async function validarDimensoesImagem(file: File) {
    const objectUrl = URL.createObjectURL(file)

    try {
      return await new Promise<{ width: number; height: number }>((resolve, reject) => {
        const image = new Image()
        image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight })
        image.onerror = reject
        image.src = objectUrl
      })
    } finally {
      URL.revokeObjectURL(objectUrl)
    }
  }

  async function salvarImagemNoCampo(path: string, file: File, pasta: string, formatarUrl: (url: string) => string = (url) => url) {
    try {
      setSalvando(true)
      const publicUrl = await uploadStreamAsset(file, pasta)
      await atualizarCampo(path, formatarUrl(publicUrl))
    } catch (error) {
      alert(`Erro ao enviar imagem: ${error instanceof Error ? error.message : 'tente novamente'}`)
    } finally {
      setSalvando(false)
    }
  }

  function atualizarCampo(path: string, valor: any) {
    const partes = path.split('.')
    const base = draftConfig || configSalva || {}
    const novo = JSON.parse(JSON.stringify(base))
    let alvo = novo

    for (let i = 0; i < partes.length - 1; i += 1) {
      alvo[partes[i]] = alvo[partes[i]] || {}
      alvo = alvo[partes[i]]
    }

    alvo[partes[partes.length - 1]] = valor
    setDraftConfig(novo)
    setTemAlteracoesPendentes(true)
  }


  async function moverColuna(direcao: -1 | 1) {
    if (!overlayAtual) return

    const atual = orderedColumnKeys.indexOf(selectedColumn)
    const destino = atual + direcao
    if (atual < 0 || destino < 0 || destino >= orderedColumnKeys.length) return

    const novaOrdem = [...orderedColumnKeys]
    const [coluna] = novaOrdem.splice(atual, 1)
    novaOrdem.splice(destino, 0, coluna)
    await atualizarCampo('columnsOrder', novaOrdem)
  }

  async function alternarVisivel() {
    if (!overlayAtual) return

    const novo = !overlayAtual.visivel

    const { error } = await supabase
      .from('stream_project_overlays')
      .update({ visivel: novo, updated_at: new Date().toISOString() })
      .eq('id', overlayAtual.id)

    if (error) {
      alert(`Erro: ${error.message}`)
      return
    }

    setOverlays((prev) => prev.map((item) => item.id === overlayAtual.id ? { ...item, visivel: novo } : item))
  }

  async function copiar(texto: string) {
    await navigator.clipboard.writeText(texto)
    alert('Link copiado')
  }

  async function uploadLogoCampeonato(file: File | null) {
    if (!file) return

    try {
      const dimensoes = await validarDimensoesImagem(file)
      if (dimensoes.width > 1920 || dimensoes.height > 1080) {
        alert('A imagem precisa ter no maximo 1920x1080.')
        return
      }
    } catch {
      alert('Nao foi possivel ler essa imagem.')
      return
    }

    await salvarImagemNoCampo('brand.logoDataUrl', file, 'brand')
  }

  async function uploadBackgroundImage(path: string, file: File | null) {
    if (!file) return

    await salvarImagemNoCampo(path, file, 'background', imageBackgroundValue)
  }

  function configComPosicao(baseConfig: any, block: StreamOverlayBlock, x: number, y: number) {
    const novo = JSON.parse(JSON.stringify(baseConfig || {}))
    novo.brand = novo.brand || {}
    novo.layout = novo.layout || {}

    if (block === 'image') {
      novo.brand.x = Math.round(x)
      novo.brand.y = Math.round(y)
    } else if (block === 'text') {
      novo.brand.textX = Math.round(x)
      novo.brand.textY = Math.round(y)
    } else {
      novo.layout.x = Math.round(x)
      novo.layout.y = Math.round(y)
    }

    return novo
  }

  function lerPosicaoBloco(block: StreamOverlayBlock) {
    if (block === 'image') return { x: Number(config.brand?.x || 0), y: Number(config.brand?.y || 0) }
    if (block === 'text') return { x: Number(config.brand?.textX || 0), y: Number(config.brand?.textY || 0) }
    return { x: Number(config.layout?.x || 0), y: Number(config.layout?.y || 0) }
  }

  function atualizarPreviewConfig(novoConfig: any) {
    if (!overlayAtual) return
    setOverlays((prev) => prev.map((item) => item.id === overlayAtual.id ? { ...item, config: novoConfig } : item))
  }

  function iniciarArrasto(block: StreamOverlayBlock, event: PointerEvent) {
    if (!overlayAtual) return

    setSelectedBlock(block)
    setActiveAction('move')

    const inicioMouse = { x: event.clientX, y: event.clientY }
    const inicioBloco = lerPosicaoBloco(block)
    let ultimoConfig = config

    const mover = (moveEvent: globalThis.PointerEvent) => {
      const deltaX = (moveEvent.clientX - inicioMouse.x) / previewScale
      const deltaY = (moveEvent.clientY - inicioMouse.y) / previewScale
      ultimoConfig = configComPosicao(config, block, inicioBloco.x + deltaX, inicioBloco.y + deltaY)
      atualizarPreviewConfig(ultimoConfig)
    }

    const soltar = () => {
      window.removeEventListener('pointermove', mover)
      window.removeEventListener('pointerup', soltar)
      salvarConfig(ultimoConfig)
    }

    window.addEventListener('pointermove', mover)
    window.addEventListener('pointerup', soltar)
  }

  if (loading) {
    return <main className="flex min-h-screen items-center justify-center bg-[#080d16] text-white"><Loader2 className="animate-spin" /></main>
  }

  return (
    <main className="h-screen overflow-hidden bg-[#080d16] p-5 text-white">
      <section className="mx-auto flex h-full max-w-[1700px] flex-col">
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-[11px] font-black uppercase tracking-[0.24em] text-red-500">Overlay Editor</div>
            <h1 className="mt-2 text-2xl font-black uppercase">{projeto?.nome || 'Projeto de transmissão'}</h1>
            <p className="mt-1 text-xs font-semibold text-zinc-400">Preview com dados reais do campeonato e visual salvo direto no link OBS.</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button onClick={carregar} className="inline-flex h-10 items-center gap-2 border border-white/10 bg-white/5 px-3 text-[10px] font-black uppercase tracking-[0.14em]"><RefreshCw size={14} /> Atualizar</button>
            {overlayAtual ? (
              <>
                <button onClick={alternarVisivel} className="inline-flex h-10 items-center gap-2 border border-white/10 bg-white/5 px-3 text-[10px] font-black uppercase tracking-[0.14em]">
                  {overlayAtual.visivel ? <EyeOff size={14} /> : <Eye size={14} />}
                  {overlayAtual.visivel ? 'Ocultar' : 'Mostrar'}
                </button>
                <Link href={`/stream/render/${overlayAtual.id}`} target="_blank" className="inline-flex h-10 items-center gap-2 border border-red-600 bg-red-600 px-3 text-[10px] font-black uppercase tracking-[0.14em]"><MonitorUp size={14} /> OBS</Link>
              </>
            ) : null}
          </div>
        </div>

        <div className="grid min-h-0 flex-1 gap-5 xl:grid-cols-[280px_minmax(620px,1fr)_360px]">
          <aside className="min-h-0 overflow-y-auto border border-white/10 bg-[#111827] p-4">
            <div className="mb-3 text-[11px] font-black uppercase tracking-[0.18em] text-zinc-400">Overlays do projeto</div>

            <div className="space-y-2">
              {overlays.map((overlay) => (
                <div key={overlay.id} className={`flex border ${overlayAtual?.id === overlay.id ? 'border-red-600 bg-red-600 text-white' : 'border-white/10 bg-white/5 text-zinc-200'}`}>
                  <button onClick={() => setOverlayId(overlay.id)} className="min-w-0 flex-1 px-3 py-3 text-left text-sm font-black uppercase">
                    {overlay.nome}
                    <div className="mt-1 truncate text-[10px] font-semibold text-zinc-300">{overlay.template_id}</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => removerOverlay(overlay)}
                    disabled={salvando || Boolean(getFixedStreamOverlayTemplate(overlay.template_id))}
                    className="flex w-10 items-center justify-center border-l border-white/10 text-white/80 hover:bg-black/20 disabled:opacity-50"
                    title={getFixedStreamOverlayTemplate(overlay.template_id) ? 'Overlay fixa' : 'Remover overlay'}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-6 border-t border-white/10 pt-4">
              <div className="mb-3 text-[11px] font-black uppercase tracking-[0.18em] text-zinc-400">Adicionar template</div>
              {!isSiteAdmin ? (
                <div className="mb-3 border border-white/10 bg-[#0b1220] p-3 text-[11px] font-semibold leading-5 text-zinc-400">
                  As overlays oficiais sao fixas. Apenas administradores do site podem adicionar novos modelos.
                </div>
              ) : null}
              <div className="space-y-2">
                {templates.map((tpl) => {
                  const jaAdicionado = overlays.some((overlay) => overlay.template_id === tpl.id)
                  const isExtraTemplate = !tpl.fixed
                  if (isExtraTemplate && !isSiteAdmin) return null
                  return (
                    <button
                      key={tpl.id}
                      onClick={() => criarOverlay(tpl)}
                      disabled={salvando || jaAdicionado}
                      className={`flex w-full items-center justify-between border px-3 py-3 text-left text-xs font-black uppercase ${jaAdicionado ? 'border-white/5 bg-white/[0.03] text-zinc-500' : 'border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10'} disabled:cursor-not-allowed`}
                    >
                      <span>{tpl.nome}</span>
                      {jaAdicionado ? <span className="text-[9px] tracking-[0.14em]">Adicionado</span> : <Plus size={14} />}
                    </button>
                  )
                })}
              </div>
            </div>
          </aside>

          <section className="flex min-h-0 flex-col border border-white/10 bg-[#111827] p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <div className="text-[11px] font-black uppercase tracking-[0.18em] text-zinc-400">Preview 1920x1080</div>
                <div className="mt-1 text-xl font-black uppercase">{overlayAtual?.nome || 'Nenhuma overlay'}</div>
              </div>
              {renderUrl ? (
                <button onClick={() => copiar(renderUrl)} className="inline-flex h-9 items-center gap-2 border border-white/10 bg-white/5 px-3 text-[10px] font-black uppercase tracking-[0.14em]">
                  <Copy size={13} />
                  Copiar link
                </button>
              ) : null}
            </div>

            <div className="min-h-0 flex-1">
              <div
                className="relative aspect-video max-h-full overflow-hidden border border-white/10 shadow-[0_18px_42px_rgba(0,0,0,0.35)]"
                style={checkerboardStyle}
                onMouseDown={() => setSelectedBlock('table')}
              >
                {overlayAtual?.template_id === 'countdown' && previewOverlayDefinition ? (
                  <div className="absolute left-0 top-0 h-[1080px] w-[1920px] origin-top-left scale-50">
                    <previewOverlayDefinition.Render
                      config={config}
                      rows={previewRows}
                      templateId={overlayAtual.template_id}
                      overlayName={overlayAtual.nome}
                      context={{
                        jogo: { nome: 'JOGO PRINCIPAL', nome_bloco: 'GRUPO A', quantidade_partidas: 4 },
                        mapas: ['Bermuda', 'Purgatório', 'Alpine', 'Kalahari'],
                        quantidadePartidas: 4,
                      }}
                    />
                  </div>
                ) : (
                  <TabelaGeralOverlay
                    config={config}
                    rows={previewRows}
                    previewScale={previewScale}
                    editable
                    selectedBlock={selectedBlock}
                    selectedColumn={selectedColumn}
                    onSelectBlock={setSelectedBlock}
                    onSelectColumn={(column) => {
                      setSelectedColumn(column)
                      setActiveAction('table')
                    }}
                    onStartDrag={iniciarArrasto}
                  />
                )}
              </div>
            </div>

            {renderUrl ? (
              <div className="mt-3 break-all border border-white/10 bg-[#0b1220] p-3 text-xs font-semibold text-zinc-300">{renderUrl}</div>
            ) : null}
          </section>

          <aside className="min-h-0 overflow-y-auto border border-white/10 bg-[#111827] p-4">
            <div className="mb-4 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-zinc-400">
              <SlidersHorizontal size={15} />
              Editor visual
            </div>

            {!overlayAtual ? (
              <div className="text-sm font-semibold text-zinc-400">Crie ou selecione uma overlay.</div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  {(['image', 'text', 'table'] as StreamOverlayBlock[]).map((block) => (
                    <button
                      key={block}
                      type="button"
                      onClick={() => {
                        setSelectedBlock(block)
                        if (block === 'image') {
                          atualizarCampo('brand.imageEnabled', true)
                        } else if (block === 'text') {
                          atualizarCampo('brand.textEnabled', true)
                        }
                      }}
                      className={`flex h-16 flex-col items-center justify-center gap-1 border text-[10px] font-black uppercase tracking-[0.12em] ${selectedBlock === block ? 'border-red-600 bg-red-600 text-white' : 'border-white/10 bg-white/5 text-zinc-300'}`}
                    >
                      {block === 'image' ? <ImageIcon size={17} /> : block === 'text' ? <Type size={17} /> : <Table2 size={17} />}
                      {blockLabels[block]}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {([
                    ['move', Move],
                    ['content', Type],
                    ['style', Palette],
                    ['table', Columns3],
                  ] as const).map(([action, Icon]) => (
                    <button
                      key={action}
                      type="button"
                      onClick={() => setActiveAction(action)}
                      className={`flex h-11 items-center justify-center border text-[10px] font-black uppercase tracking-[0.12em] ${activeAction === action ? 'border-white bg-white text-[#101827]' : 'border-white/10 bg-[#0b1220] text-zinc-300'}`}
                    >
                      <Icon size={15} />
                    </button>
                  ))}
                </div>

                <div className="border border-white/10 bg-[#0b1220] p-3">
                  <div className="mb-3 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">
                    {blockLabels[selectedBlock]} / {activeAction === 'move' ? 'Mover bloco' : activeAction === 'content' ? 'Conteudo' : activeAction === 'style' ? 'Visual' : 'Tabela'}
                  </div>

                  {activeAction === 'move' ? (
                    <div className="grid grid-cols-2 gap-3">
                      {selectedBlock === 'image' ? (
                        <>
                          <EditorNumber label="X" value={config.brand?.x || 0} onChange={(v) => atualizarCampo('brand.x', v)} />
                          <EditorNumber label="Y" value={config.brand?.y || 0} onChange={(v) => atualizarCampo('brand.y', v)} />
                          <EditorNumber label="Largura" value={config.brand?.w || 0} onChange={(v) => atualizarCampo('brand.w', v)} />
                          <EditorNumber label="Altura" value={config.brand?.h || 0} onChange={(v) => atualizarCampo('brand.h', v)} />
                          <EditorNumber label="Escala" value={config.brand?.scale || 100} onChange={(v) => atualizarCampo('brand.scale', v)} />
                          <EditorNumber label="Opacidade" value={config.brand?.opacity || 100} onChange={(v) => atualizarCampo('brand.opacity', v)} />
                        </>
                      ) : selectedBlock === 'text' ? (
                        <>
                          <EditorNumber label="X" value={config.brand?.textX || 0} onChange={(v) => atualizarCampo('brand.textX', v)} />
                          <EditorNumber label="Y" value={config.brand?.textY || 0} onChange={(v) => atualizarCampo('brand.textY', v)} />
                          <EditorNumber label="Largura" value={config.brand?.textW || 0} onChange={(v) => atualizarCampo('brand.textW', v)} />
                          <EditorNumber label="Altura" value={config.brand?.textH || 0} onChange={(v) => atualizarCampo('brand.textH', v)} />
                          <EditorNumber label="Escala" value={config.brand?.textScale || 100} onChange={(v) => atualizarCampo('brand.textScale', v)} />
                          <EditorNumber label="Opacidade" value={config.brand?.textOpacity || 100} onChange={(v) => atualizarCampo('brand.textOpacity', v)} />
                        </>
                      ) : (
                        <>
                          <EditorNumber label="X" value={config.layout.x || 0} onChange={(v) => atualizarCampo('layout.x', v)} />
                          <EditorNumber label="Y" value={config.layout.y || 0} onChange={(v) => atualizarCampo('layout.y', v)} />
                          <EditorNumber label="Largura" value={config.layout.w || 0} onChange={(v) => atualizarCampo('layout.w', v)} />
                          <EditorNumber label="Escala" value={config.layout.scale || 100} onChange={(v) => atualizarCampo('layout.scale', v)} />
                          <EditorNumber label="Opacidade" value={config.layout.opacity || 100} onChange={(v) => atualizarCampo('layout.opacity', v)} />
                        </>
                      )}
                    </div>
                  ) : null}

                  {activeAction === 'content' ? (
                    <div className="space-y-3">
                      {selectedBlock === 'image' ? (
                        <>
                          <label className="flex items-center gap-2 border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold uppercase text-zinc-200">
                            <input type="checkbox" checked={config.brand?.imageEnabled !== false} onChange={(e) => atualizarCampo('brand.imageEnabled', e.target.checked)} />
                            Mostrar imagem
                          </label>
                          <label className="block">
                            <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">Imagem ate 1920x1080</span>
                            <input type="file" accept="image/*" onChange={(e) => uploadLogoCampeonato(e.target.files?.[0] || null)} className="w-full text-xs font-bold text-zinc-300 file:mr-3 file:border-0 file:bg-red-600 file:px-3 file:py-2 file:text-xs file:font-black file:uppercase file:text-white" />
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            <button type="button" onClick={() => atualizarCampo('brand.imageEnabled', false)} className="h-9 border border-white/10 bg-white/5 text-[10px] font-black uppercase tracking-[0.14em]">
                              Ocultar imagem
                            </button>
                            <button type="button" onClick={() => atualizarCampo('brand.logoDataUrl', null)} className="h-9 border border-white/10 bg-white/5 text-[10px] font-black uppercase tracking-[0.14em]">
                              Limpar arquivo
                            </button>
                          </div>
                        </>
                      ) : selectedBlock === 'text' ? (
                        <>
                          <label className="flex items-center gap-2 border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold uppercase text-zinc-200">
                            <input type="checkbox" checked={config.brand?.textEnabled !== false} onChange={(e) => atualizarCampo('brand.textEnabled', e.target.checked)} />
                            Mostrar texto
                          </label>
                          <EditorInput label="Nome grande" value={config.brand?.name || ''} onChange={(v) => atualizarCampo('brand.name', v)} />
                          <EditorInput label="Titulo" value={config.brand?.title || ''} onChange={(v) => atualizarCampo('brand.title', v)} />
                          <div className="grid grid-cols-2 gap-2">
                            <button type="button" onClick={() => atualizarCampo('brand.textEnabled', false)} className="h-9 border border-white/10 bg-white/5 text-[10px] font-black uppercase tracking-[0.14em]">
                              Ocultar texto
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                const novo = JSON.parse(JSON.stringify(config || {}))
                                novo.brand = novo.brand || {}
                                novo.brand.name = ''
                                novo.brand.title = ''
                                await salvarConfig(novo)
                              }}
                              className="h-9 border border-white/10 bg-white/5 text-[10px] font-black uppercase tracking-[0.14em]"
                            >
                              Limpar texto
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <EditorInput label="Titulo da tabela" value={config.title || ''} onChange={(v) => atualizarCampo('title', v)} />
                          <EditorSelect label="Entrada" value={config.animation.enter || 'slide'} onChange={(v) => atualizarCampo('animation.enter', v)} options={[['slide', 'Slide'], ['fade', 'Fade'], ['zoom', 'Zoom'], ['none', 'Sem animacao']]} />
                        </>
                      )}
                    </div>
                  ) : null}

                  {activeAction === 'style' ? (
                    <div className="space-y-3">
                      {selectedBlock === 'image' ? (
                        <EditorSelect label="Ajuste imagem" value={config.brand?.objectFit || 'contain'} onChange={(v) => atualizarCampo('brand.objectFit', v)} options={[['contain', 'Conter'], ['cover', 'Cobrir']]} />
                      ) : selectedBlock === 'text' ? (
                        <>
                          <EditorColor label="Cor fonte" value={config.brand?.textColor || '#ffffff'} onChange={(v) => atualizarCampo('brand.textColor', v)} />
                          <EditorSelect label="Alinhamento" value={config.brand?.align || 'left'} onChange={(v) => atualizarCampo('brand.align', v)} options={[['left', 'Esquerda'], ['center', 'Centro'], ['right', 'Direita']]} />
                          <div className="grid grid-cols-2 gap-3">
                            <EditorNumber label="Fonte nome" value={config.brand?.nameSize || 54} onChange={(v) => atualizarCampo('brand.nameSize', v)} />
                            <EditorNumber label="Fonte titulo" value={config.brand?.titleSize || 24} onChange={(v) => atualizarCampo('brand.titleSize', v)} />
                            <EditorNumber label="Peso" value={config.brand?.fontWeight || 900} onChange={(v) => atualizarCampo('brand.fontWeight', v)} />
                            <label className="flex items-end gap-2 pb-2 text-xs font-bold uppercase text-zinc-200">
                              <input type="checkbox" checked={Boolean(config.brand?.italic)} onChange={(e) => atualizarCampo('brand.italic', e.target.checked)} />
                              Italico
                            </label>
                          </div>
                        </>
                      ) : (
                        <>
                          <EditorColor label="Cor principal" value={config.theme.primary} onChange={(v) => atualizarCampo('theme.primary', v)} />
                          <EditorColor label="Cor destaque" value={config.theme.accent} onChange={(v) => atualizarCampo('theme.accent', v)} />
                          <EditorColor label="Cor fundo" value={config.theme.background} onChange={(v) => atualizarCampo('theme.background', v)} />
                          <EditorBackground label="Fundo linha" value={config.theme.rowBackground || ''} onChange={(v) => atualizarCampo('theme.rowBackground', v)} onImage={(file) => uploadBackgroundImage('theme.rowBackground', file)} />
                          <EditorBackground label="Fundo alternado" value={config.theme.rowAltBackground || ''} onChange={(v) => atualizarCampo('theme.rowAltBackground', v)} onImage={(file) => uploadBackgroundImage('theme.rowAltBackground', file)} />
                          <EditorColor label="Cor texto" value={config.theme.text} onChange={(v) => atualizarCampo('theme.text', v)} />
                          <EditorColor label="Cor cabecalho" value={config.theme.headerText} onChange={(v) => atualizarCampo('theme.headerText', v)} />
                          <EditorInput label="Borda" value={config.theme.border || ''} onChange={(v) => atualizarCampo('theme.border', v)} />
                        </>
                      )}
                    </div>
                  ) : null}

                  {activeAction === 'table' ? (
                    <div className="space-y-3">
                      {selectedBlock !== 'table' ? (
                        <div className="text-xs font-semibold text-zinc-400">Selecione o bloco Overlay para editar linhas, blocos e colunas.</div>
                      ) : (
                        <>
                          <div className="grid grid-cols-2 gap-3">
                            <EditorNumber label="Limite linhas" value={config.layout.maxRows || 12} onChange={(v) => atualizarCampo('layout.maxRows', v)} />
                            <EditorNumber label="Blocos" value={config.layout.blockCount || 1} onChange={(v) => atualizarCampo('layout.blockCount', v)} />
                            <EditorNumber label="Linhas/bloco" value={config.layout.rowsPerBlock || 6} onChange={(v) => atualizarCampo('layout.rowsPerBlock', v)} />
                            <EditorNumber label="Espaco blocos" value={config.layout.blockGap || 36} onChange={(v) => atualizarCampo('layout.blockGap', v)} />
                            <EditorNumber label="Altura linha" value={config.layout.rowHeight || 62} onChange={(v) => atualizarCampo('layout.rowHeight', v)} />
                            <EditorNumber label="Altura topo" value={config.layout.headerHeight || 72} onChange={(v) => atualizarCampo('layout.headerHeight', v)} />
                            <EditorNumber label="Fonte" value={config.layout.fontSize || 24} onChange={(v) => atualizarCampo('layout.fontSize', v)} />
                            <EditorNumber label="Logo" value={config.layout.logoSize || 44} onChange={(v) => atualizarCampo('layout.logoSize', v)} />
                            <EditorNumber label="Espaco" value={config.layout.rowGap || 5} onChange={(v) => atualizarCampo('layout.rowGap', v)} />
                            <EditorNumber label="Raio" value={config.layout.radius || 4} onChange={(v) => atualizarCampo('layout.radius', v)} />
                          </div>

                          <EditorSelect label="Direcao dos blocos" value={config.layout.blockDirection || 'horizontal'} onChange={(v) => atualizarCampo('layout.blockDirection', v)} options={[['horizontal', 'Horizontal'], ['vertical', 'Vertical']]} />

                          <div>
                            <div className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">Colunas</div>
                            <div className="grid grid-cols-2 gap-2">
                              {orderedColumnKeys.map((key) => (
                                <label key={key} className={`flex items-center gap-2 border px-3 py-2 text-xs font-bold uppercase ${selectedColumn === key ? 'border-yellow-400 bg-yellow-400/10 text-yellow-100' : 'border-white/10 bg-[#111827]'}`}>
                                  <input type="checkbox" checked={Boolean(config.columns[key])} onChange={(e) => atualizarCampo(`columns.${key}`, e.target.checked)} />
                                  <button type="button" onClick={() => setSelectedColumn(key)} className="min-w-0 flex-1 text-left uppercase">
                                    {tabelaGeralColumnLabels[key] || key}
                                  </button>
                                </label>
                              ))}
                            </div>
                          </div>

                          <div className="border-t border-white/10 pt-3">
                            <div className="mb-3 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">Ajuste da coluna</div>
                            <EditorSelect
                              label="Selecionar coluna"
                              value={selectedColumn}
                              onChange={setSelectedColumn}
                              options={orderedColumnKeys.map((key) => [key, tabelaGeralColumnLabels[key] || key])}
                            />
                            <div className="mt-3 grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() => moverColuna(-1)}
                                disabled={selectedColumnIndex <= 0}
                                className="h-9 border border-white/10 bg-white/5 text-[10px] font-black uppercase tracking-[0.14em] disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                Mover esquerda
                              </button>
                              <button
                                type="button"
                                onClick={() => moverColuna(1)}
                                disabled={selectedColumnIndex >= orderedColumnKeys.length - 1}
                                className="h-9 border border-white/10 bg-white/5 text-[10px] font-black uppercase tracking-[0.14em] disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                Mover direita
                              </button>
                            </div>
                            <div className="mt-3 grid grid-cols-[1fr_88px] items-end gap-3">
                              <label className="block">
                                <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">Largura</span>
                                <input
                                  type="range"
                                  min={0.2}
                                  max={4}
                                  step={0.05}
                                  value={selectedColumnWidth}
                                  onChange={(e) => atualizarCampo(`columnWidths.${selectedColumn}`, Number(e.target.value))}
                                  className="h-10 w-full accent-red-600"
                                />
                              </label>
                              <EditorNumber label="Peso" value={selectedColumnWidth} onChange={(v) => atualizarCampo(`columnWidths.${selectedColumn}`, Math.max(0.2, v))} />
                            </div>
                            <div className="mt-3 grid grid-cols-2 gap-3">
                              <EditorColor label="Fundo coluna" value={config.columnStyles?.[selectedColumn]?.background || ''} onChange={(v) => atualizarCampo(`columnStyles.${selectedColumn}.background`, v)} />
                              <EditorColor label="Texto coluna" value={config.columnStyles?.[selectedColumn]?.text || ''} onChange={(v) => atualizarCampo(`columnStyles.${selectedColumn}.text`, v)} />
                            </div>
                            <div className="mt-3 grid grid-cols-2 gap-2">
                              <button type="button" onClick={() => atualizarCampo(`columnStyles.${selectedColumn}`, {})} className="h-9 border border-white/10 bg-white/5 text-[10px] font-black uppercase tracking-[0.14em]">
                                Limpar visual
                              </button>
                              <button type="button" onClick={() => atualizarCampo(`columnWidths.${selectedColumn}`, defaultTabelaGeralColumnWidths[selectedColumn] ?? 1)} className="h-9 border border-white/10 bg-white/5 text-[10px] font-black uppercase tracking-[0.14em]">
                                Reset largura
                              </button>
                            </div>
                          </div>

                          <div className="border-t border-white/10 pt-3">
                            <div className="mb-3 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">Destaque por linha</div>
                            <EditorNumber label="Linha" value={selectedRow} onChange={(v) => setSelectedRow(Math.max(1, v))} />
                            <div className="mt-3 grid grid-cols-2 gap-3">
                              <EditorBackground label="Fundo linha" value={config.rowStyles?.[String(selectedRow)]?.background || ''} onChange={(v) => atualizarCampo(`rowStyles.${selectedRow}.background`, v)} onImage={(file) => uploadBackgroundImage(`rowStyles.${selectedRow}.background`, file)} />
                              <EditorColor label="Texto linha" value={config.rowStyles?.[String(selectedRow)]?.text || ''} onChange={(v) => atualizarCampo(`rowStyles.${selectedRow}.text`, v)} />
                            </div>
                            <button type="button" onClick={() => atualizarCampo(`rowStyles.${selectedRow}`, {})} className="mt-3 h-9 w-full border border-white/10 bg-white/5 text-[10px] font-black uppercase tracking-[0.14em]">
                              Limpar linha
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ) : null}
                </div>

                <div className="hidden">
                <div className="border border-white/10 bg-[#0b1220] p-3">
                  <div className="mb-3 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">Area do campeonato</div>
                  <div className="space-y-3">
                    <label className="flex items-center gap-2 text-xs font-bold uppercase text-zinc-200">
                      <input type="checkbox" checked={config.brand?.enabled !== false} onChange={(e) => atualizarCampo('brand.enabled', e.target.checked)} />
                      Exibir area superior
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">Logo/arte ate 1920x1080</span>
                      <input type="file" accept="image/*" onChange={(e) => uploadLogoCampeonato(e.target.files?.[0] || null)} className="w-full text-xs font-bold text-zinc-300 file:mr-3 file:border-0 file:bg-red-600 file:px-3 file:py-2 file:text-xs file:font-black file:uppercase file:text-white" />
                    </label>

                    {config.brand?.logoDataUrl ? (
                      <button type="button" onClick={() => atualizarCampo('brand.logoDataUrl', null)} className="h-9 w-full border border-white/10 bg-white/5 text-[10px] font-black uppercase tracking-[0.14em]">
                        Remover logo
                      </button>
                    ) : null}

                    <EditorInput label="Nome grande" value={config.brand?.name || ''} onChange={(v) => atualizarCampo('brand.name', v)} />
                    <EditorInput label="Titulo superior" value={config.brand?.title || ''} onChange={(v) => atualizarCampo('brand.title', v)} />
                    <EditorColor label="Cor texto superior" value={config.brand?.textColor || '#ffffff'} onChange={(v) => atualizarCampo('brand.textColor', v)} />

                    <div className="grid grid-cols-2 gap-3">
                      <EditorNumber label="Logo X" value={config.brand?.x || 0} onChange={(v) => atualizarCampo('brand.x', v)} />
                      <EditorNumber label="Logo Y" value={config.brand?.y || 0} onChange={(v) => atualizarCampo('brand.y', v)} />
                      <EditorNumber label="Logo largura" value={config.brand?.w || 0} onChange={(v) => atualizarCampo('brand.w', v)} />
                      <EditorNumber label="Logo altura" value={config.brand?.h || 0} onChange={(v) => atualizarCampo('brand.h', v)} />
                      <EditorNumber label="Escala logo" value={config.brand?.scale || 100} onChange={(v) => atualizarCampo('brand.scale', v)} />
                      <EditorNumber label="Opacidade logo" value={config.brand?.opacity || 100} onChange={(v) => atualizarCampo('brand.opacity', v)} />
                      <EditorNumber label="Nome fonte" value={config.brand?.nameSize || 54} onChange={(v) => atualizarCampo('brand.nameSize', v)} />
                      <EditorNumber label="Titulo fonte" value={config.brand?.titleSize || 24} onChange={(v) => atualizarCampo('brand.titleSize', v)} />
                    </div>

                    <EditorSelect label="Ajuste imagem" value={config.brand?.objectFit || 'contain'} onChange={(v) => atualizarCampo('brand.objectFit', v)} options={[['contain', 'Conter'], ['cover', 'Cobrir']]} />
                    <EditorSelect label="Alinhamento texto" value={config.brand?.align || 'left'} onChange={(v) => atualizarCampo('brand.align', v)} options={[['left', 'Esquerda'], ['center', 'Centro'], ['right', 'Direita']]} />
                  </div>
                </div>

                <EditorInput label="Titulo" value={config.title || ''} onChange={(v) => atualizarCampo('title', v)} />
                <EditorColor label="Cor principal" value={config.theme.primary} onChange={(v) => atualizarCampo('theme.primary', v)} />
                <EditorColor label="Cor destaque" value={config.theme.accent} onChange={(v) => atualizarCampo('theme.accent', v)} />
                <EditorColor label="Cor fundo" value={config.theme.background} onChange={(v) => atualizarCampo('theme.background', v)} />
                <EditorColor label="Cor linha" value={config.theme.rowBackground} onChange={(v) => atualizarCampo('theme.rowBackground', v)} />
                <EditorColor label="Cor linha alternada" value={config.theme.rowAltBackground} onChange={(v) => atualizarCampo('theme.rowAltBackground', v)} />
                <EditorColor label="Cor texto" value={config.theme.text} onChange={(v) => atualizarCampo('theme.text', v)} />
                <EditorColor label="Cor cabecalho" value={config.theme.headerText} onChange={(v) => atualizarCampo('theme.headerText', v)} />
                <EditorInput label="Borda" value={config.theme.border || ''} onChange={(v) => atualizarCampo('theme.border', v)} />

                <div className="grid grid-cols-2 gap-3">
                  <EditorNumber label="X" value={config.layout.x} onChange={(v) => atualizarCampo('layout.x', v)} />
                  <EditorNumber label="Y" value={config.layout.y} onChange={(v) => atualizarCampo('layout.y', v)} />
                  <EditorNumber label="Largura" value={config.layout.w} onChange={(v) => atualizarCampo('layout.w', v)} />
                  <EditorNumber label="Escala tabela" value={config.layout.scale} onChange={(v) => atualizarCampo('layout.scale', v)} />
                  <EditorNumber label="Linhas" value={config.layout.maxRows} onChange={(v) => atualizarCampo('layout.maxRows', v)} />
                  <EditorNumber label="Blocos" value={config.layout.blockCount} onChange={(v) => atualizarCampo('layout.blockCount', v)} />
                  <EditorNumber label="Linhas/bloco" value={config.layout.rowsPerBlock} onChange={(v) => atualizarCampo('layout.rowsPerBlock', v)} />
                  <EditorNumber label="Espaco blocos" value={config.layout.blockGap} onChange={(v) => atualizarCampo('layout.blockGap', v)} />
                  <EditorNumber label="Altura linha" value={config.layout.rowHeight} onChange={(v) => atualizarCampo('layout.rowHeight', v)} />
                  <EditorNumber label="Altura topo" value={config.layout.headerHeight} onChange={(v) => atualizarCampo('layout.headerHeight', v)} />
                  <EditorNumber label="Fonte" value={config.layout.fontSize} onChange={(v) => atualizarCampo('layout.fontSize', v)} />
                  <EditorNumber label="Logo" value={config.layout.logoSize} onChange={(v) => atualizarCampo('layout.logoSize', v)} />
                  <EditorNumber label="Espaco" value={config.layout.rowGap} onChange={(v) => atualizarCampo('layout.rowGap', v)} />
                  <EditorNumber label="Raio" value={config.layout.radius} onChange={(v) => atualizarCampo('layout.radius', v)} />
                  <EditorNumber label="Opacidade" value={config.layout.opacity} onChange={(v) => atualizarCampo('layout.opacity', v)} />
                </div>

                <EditorSelect label="Direcao dos blocos" value={config.layout.blockDirection || 'horizontal'} onChange={(v) => atualizarCampo('layout.blockDirection', v)} options={[['horizontal', 'Horizontal'], ['vertical', 'Vertical']]} />

                <div>
                  <div className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">Colunas</div>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.keys(tabelaGeralColumnLabels).map((key) => (
                      <label key={key} className="flex items-center gap-2 border border-white/10 bg-[#0b1220] px-3 py-2 text-xs font-bold uppercase">
                        <input type="checkbox" checked={Boolean(config.columns[key])} onChange={(e) => atualizarCampo(`columns.${key}`, e.target.checked)} />
                        {tabelaGeralColumnLabels[key] || key}
                      </label>
                    ))}
                  </div>
                </div>

                <label className="block">
                  <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">Entrada</span>
                  <select value={config.animation.enter || 'slide'} onChange={(e) => atualizarCampo('animation.enter', e.target.value)} className="h-10 w-full border border-white/10 bg-[#0b1220] px-3 text-sm font-bold outline-none">
                    <option value="slide">Slide</option>
                    <option value="fade">Fade</option>
                    <option value="zoom">Zoom</option>
                    <option value="none">Sem animação</option>
                  </select>
                </label>

                <button disabled={salvando || !temAlteracoesPendentes} onClick={() => salvarConfig(config)} className="inline-flex h-11 w-full items-center justify-center gap-2 border border-red-600 bg-red-600 px-4 text-[11px] font-black uppercase tracking-[0.16em] disabled:opacity-60">
                  {salvando ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  {temAlteracoesPendentes ? 'Salvar alterações' : 'Tudo salvo'}
                </button>
                </div>

                <button disabled={salvando || !temAlteracoesPendentes} onClick={() => salvarConfig(config)} className="inline-flex h-11 w-full items-center justify-center gap-2 border border-red-600 bg-red-600 px-4 text-[11px] font-black uppercase tracking-[0.16em] disabled:opacity-60">
                  {salvando ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  {temAlteracoesPendentes ? 'Salvar alterações' : 'Tudo salvo'}
                </button>
              </div>
            )}
          </aside>
        </div>
      </section>
    </main>
  )
}

function EditorInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} className="h-10 w-full border border-white/10 bg-[#0b1220] px-3 text-sm font-bold outline-none" />
    </label>
  )
}

function EditorColor({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">{label}</span>
      <div className="flex overflow-hidden border border-white/10 bg-[#0b1220]">
        <input
          type="color"
          value={extractColor(value)}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-12 cursor-pointer border-0 bg-transparent p-1"
        />
        <input
          value={value ?? ''}
          placeholder="#ffffff ou rgba(...)"
          onChange={(e) => onChange(e.target.value)}
          className="h-10 min-w-0 flex-1 bg-transparent px-3 text-sm font-bold outline-none"
        />
      </div>
      <div className="mt-2 grid grid-cols-6 gap-1">
        {colorSwatches.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => onChange(color)}
            className="h-6 border border-white/10"
            style={{ background: color }}
            title={color}
          />
        ))}
      </div>
    </label>
  )
}

function EditorBackground({
  label,
  value,
  onChange,
  onImage,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  onImage: (file: File | null) => void
}) {
  return (
    <div className="block">
      <div className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">{label}</div>
      <div className="space-y-3 border border-white/10 bg-[#0b1220] p-3">
        <div className="h-8 border border-white/10" style={{ background: value || 'transparent' }} />

        <EditorColor label="Cor solida" value={value?.startsWith('linear-gradient') || value?.startsWith('url(') ? '' : value} onChange={onChange} />

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onChange(gradientValue('#ffffff', '#101827', '90deg'))}
            className="h-9 border border-white/10 bg-white/5 text-[10px] font-black uppercase tracking-[0.12em]"
          >
            Degrade H
          </button>
          <button
            type="button"
            onClick={() => onChange(gradientValue('#ffffff', '#101827', '180deg'))}
            className="h-9 border border-white/10 bg-white/5 text-[10px] font-black uppercase tracking-[0.12em]"
          >
            Degrade V
          </button>
        </div>

        <EditorInput label="CSS do fundo" value={value || ''} onChange={onChange} />

        <label className="block">
          <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">Imagem</span>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => onImage(e.target.files?.[0] || null)}
            className="w-full text-xs font-bold text-zinc-300 file:mr-3 file:border-0 file:bg-red-600 file:px-3 file:py-2 file:text-xs file:font-black file:uppercase file:text-white"
          />
        </label>
      </div>
    </div>
  )
}

function EditorNumber({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">{label}</span>
      <input type="number" value={Number(value || 0)} onChange={(e) => onChange(Number(e.target.value))} className="h-10 w-full border border-white/10 bg-[#0b1220] px-3 text-sm font-bold outline-none" />
    </label>
  )
}

function EditorSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: Array<[string, string]> }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="h-10 w-full border border-white/10 bg-[#0b1220] px-3 text-sm font-bold outline-none">
        {options.map(([optionValue, labelText]) => (
          <option key={optionValue} value={optionValue}>{labelText}</option>
        ))}
      </select>
    </label>
  )
}
