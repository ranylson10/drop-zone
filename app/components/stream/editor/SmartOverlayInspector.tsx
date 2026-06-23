'use client'

import { useMemo, useState } from 'react'
import { ImageIcon, Layers, Palette, Rows3, Table2, Type } from 'lucide-react'
import type { StreamOverlayConfig } from '@/lib/streamOverlay'

type ControlKind = 'position' | 'size' | 'number' | 'color' | 'text' | 'select' | 'checkbox' | 'image' | 'columns'
type OverlayFamily = 'cards' | 'table' | 'card-table' | 'booyah' | 'countdown' | 'waiting' | 'screen' | 'generic'

type ColumnEditorDef = { key: string; label: string; widthFallback: number }

type ControlDef = {
  kind: ControlKind
  label: string
  path: string
  fallback?: unknown
  min?: number
  max?: number
  step?: number
  options?: Array<[string, string]>
  hint?: string
  columns?: ColumnEditorDef[]
}

type LayerDef = {
  id: string
  label: string
  description: string
  icon: 'layers' | 'image' | 'table' | 'text' | 'rows' | 'palette'
  controls: ControlDef[]
}

type SmartOverlayInspectorProps = {
  templateId?: string | null
  config: StreamOverlayConfig
  onChange: (path: string, value: unknown) => void
  onUploadImage?: (path: string, file: File) => Promise<void>
}

const tableTemplateIds = new Set(['tabela-geral', 'tabela-dia', 'tabela-do-dia', 'tabela-queda', 'tabela-da-queda', 'mvp-dia', 'mvp-do-dia', 'mvp-da-queda', 'mvp-queda'])
const booyahsTemplateIds = new Set(['booyahs-dia', 'booyahs-do-dia'])
const booyahTemplateIds = new Set(['booyah'])
const mvpGeralTemplateIds = new Set(['mvp-geral'])
const countdownTemplateIds = new Set(['countdown'])
const waitingTemplateIds = new Set(['tela-espera', 'tela-de-espera'])
const screenTemplateIds = new Set(['agradecimentos'])

const objectFitOptions: Array<[string, string]> = [
  ['contain', 'Conter'],
  ['cover', 'Cobrir'],
  ['fill', 'Esticar'],
]

const alignOptions: Array<[string, string]> = [
  ['left', 'Esquerda'],
  ['center', 'Centro'],
  ['right', 'Direita'],
]

const booleanOptions: Array<[string, string]> = [
  ['true', 'Sim'],
  ['false', 'Não'],
]


const allColumnLabels: Record<string, string> = {
  rank: 'Rank / posição',
  logo: 'Logo da equipe',
  nome: 'Nome / nick',
  tag: 'Tag',
  grupo: 'Grupo',
  variacao: 'Setas / variação',
  quedas: 'Quedas',
  booyahs: 'Booyahs',
  kills: 'Kill / abates',
  pontos: 'Pontos',
}

const tableColumnsByTemplate: Record<string, ColumnEditorDef[]> = {
  'tabela-geral': [
    { key: 'rank', label: 'Rank', widthFallback: 52 },
    { key: 'logo', label: 'Logos da equipe', widthFallback: 70 },
    { key: 'nome', label: 'Nome da equipe', widthFallback: 260 },
    { key: 'variacao', label: 'Setas', widthFallback: 72 },
    { key: 'grupo', label: 'Grupos', widthFallback: 72 },
    { key: 'quedas', label: 'Quedas', widthFallback: 72 },
    { key: 'booyahs', label: 'Booyahs', widthFallback: 78 },
    { key: 'kills', label: 'Kill', widthFallback: 90 },
    { key: 'pontos', label: 'Pontos', widthFallback: 100 },
  ],
  'mvp-geral': [
    { key: 'rank', label: 'Rank', widthFallback: 52 },
    { key: 'logo', label: 'Logos da equipe', widthFallback: 70 },
    { key: 'nome', label: 'Nick do jogador', widthFallback: 260 },
    { key: 'variacao', label: 'Setas', widthFallback: 72 },
    { key: 'quedas', label: 'Quedas', widthFallback: 72 },
    { key: 'pontos', label: 'K.D', widthFallback: 92 },
    { key: 'kills', label: 'Kill', widthFallback: 85 },
  ],
  'tabela-da-queda': [
    { key: 'rank', label: 'Rank', widthFallback: 62 },
    { key: 'logo', label: 'Logos da equipe', widthFallback: 66 },
    { key: 'nome', label: 'Nome da equipe', widthFallback: 235 },
    { key: 'booyahs', label: 'Posição', widthFallback: 78 },
    { key: 'kills', label: 'Kill', widthFallback: 90 },
    { key: 'pontos', label: 'Pontos', widthFallback: 100 },
  ],
  'mvp-da-queda': [
    { key: 'rank', label: 'Rank', widthFallback: 62 },
    { key: 'logo', label: 'Logos da equipe', widthFallback: 66 },
    { key: 'nome', label: 'Nick do jogador', widthFallback: 235 },
    { key: 'kills', label: 'Kill', widthFallback: 90 },
  ],
  'mvp-queda': [
    { key: 'rank', label: 'Rank', widthFallback: 62 },
    { key: 'logo', label: 'Logos da equipe', widthFallback: 66 },
    { key: 'nome', label: 'Nick do jogador', widthFallback: 235 },
    { key: 'kills', label: 'Kill', widthFallback: 90 },
  ],
}

tableColumnsByTemplate['tabela-dia'] = tableColumnsByTemplate['tabela-geral']
tableColumnsByTemplate['tabela-do-dia'] = tableColumnsByTemplate['tabela-geral']
tableColumnsByTemplate['tabela-queda'] = tableColumnsByTemplate['tabela-da-queda']
tableColumnsByTemplate['mvp-dia'] = tableColumnsByTemplate['mvp-geral']
tableColumnsByTemplate['mvp-do-dia'] = tableColumnsByTemplate['mvp-geral']

function getColumnDefinitions(templateId?: string | null): ColumnEditorDef[] {
  if (templateId && tableColumnsByTemplate[templateId]) return tableColumnsByTemplate[templateId]
  return tableColumnsByTemplate['tabela-geral']
}

function ratioToPixelWidth(config: any, columnKey: string, fallbackPx: number) {
  const explicit = Number(config?.columnPixelWidths?.[columnKey])
  if (Number.isFinite(explicit) && explicit > 0) return Math.round(explicit)

  const columns = getVisibleColumnKeys(config)
  const blockCount = Math.max(1, Math.min(4, Number(config?.layout?.blockCount || 1)))
  const blockGap = Number(config?.layout?.blockGap || 36)
  const blockDirection = config?.layout?.blockDirection || 'horizontal'
  const baseTableWidth = Number(config?.layout?.w || 1560)
  const blockWidth = blockDirection === 'horizontal'
    ? (baseTableWidth - blockGap * (blockCount - 1)) / blockCount
    : baseTableWidth
  const defaultRatios: Record<string, number> = {
    rank: 0.62,
    logo: 0.66,
    nome: 2.35,
    tag: 0.9,
    grupo: 0.72,
    variacao: 0.72,
    quedas: 0.72,
    booyahs: 0.78,
    kills: 0.9,
    pontos: 1,
  }
  const total = columns.reduce((sum, key) => sum + Number(config?.columnWidths?.[key] ?? defaultRatios[key] ?? 1), 0) || 1
  const unit = Math.max(1, blockWidth / total)
  const ratio = Number(config?.columnWidths?.[columnKey] ?? defaultRatios[columnKey] ?? 1)
  const px = Math.round(Math.max(0.2, ratio) * unit)
  return Number.isFinite(px) && px > 0 ? px : fallbackPx
}

function getVisibleColumnKeys(config: any) {
  const order = Array.isArray(config?.columnsOrder) && config.columnsOrder.length
    ? config.columnsOrder
    : ['rank', 'logo', 'nome', 'tag', 'grupo', 'variacao', 'quedas', 'booyahs', 'kills', 'pontos']
  return order.filter((key: string) => config?.columns?.[key] !== false)
}

function columnsControl(label: string, columns: ColumnEditorDef[], hint?: string): ControlDef {
  return { kind: 'columns', label, path: 'columns', columns, hint }
}

function getValue(config: any, path: string, fallback?: unknown) {
  const parts = path.split('.')
  let current = config
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return fallback
    current = current[part]
  }
  return current ?? fallback
}

function getFamily(templateId: string | null | undefined, config: StreamOverlayConfig): OverlayFamily {
  const key = String(templateId || '').trim().toLowerCase()
  if (mvpGeralTemplateIds.has(key)) return 'card-table'
  if (booyahsTemplateIds.has(key) || (key === 'booyah' && (config as any).booyahsDia)) return 'cards'
  if (booyahTemplateIds.has(key)) return 'booyah'
  if (tableTemplateIds.has(key)) return 'table'
  if (countdownTemplateIds.has(key)) return 'countdown'
  if (waitingTemplateIds.has(key)) return 'waiting'
  if (screenTemplateIds.has(key)) return 'screen'
  if ((config as any).mvpGeral?.enabled) return 'card-table'
  if ((config as any).booyahsDia) return 'cards'
  if ((config as any).countdown) return 'countdown'
  if ((config as any).booyah) return 'booyah'
  return 'generic'
}

function iconFor(icon: LayerDef['icon']) {
  if (icon === 'image') return ImageIcon
  if (icon === 'table') return Table2
  if (icon === 'text') return Type
  if (icon === 'rows') return Rows3
  if (icon === 'palette') return Palette
  return Layers
}

function n(label: string, path: string, fallback: number, extra: Partial<ControlDef> = {}): ControlDef {
  return { kind: 'number', label, path, fallback, step: 1, ...extra }
}

function c(label: string, path: string, fallback: string): ControlDef {
  return { kind: 'color', label, path, fallback }
}

function t(label: string, path: string, fallback = ''): ControlDef {
  return { kind: 'text', label, path, fallback }
}

function s(label: string, path: string, options: Array<[string, string]>, fallback: string): ControlDef {
  return { kind: 'select', label, path, options, fallback }
}

function img(label: string, path: string, hint?: string): ControlDef {
  return { kind: 'image', label, path, hint }
}

function buildTableLayers(config: StreamOverlayConfig, templateId?: string | null): LayerDef[] {
  const hasInfoImage = Boolean((config as any).tabelaGeral?.infoImage)

  return [
    {
      id: 'table-box',
      label: 'Tabela inteira',
      description: 'Posição, tamanho e escala do bloco principal.',
      icon: 'table',
      controls: [
        n('X', 'layout.x', 180),
        n('Y', 'layout.y', 140),
        n('Largura', 'layout.w', 1560),
        n('Escala', 'layout.scale', 100, { min: 10, max: 200 }),
        n('Opacidade', 'layout.opacity', 100, { min: 0, max: 100 }),
        n('Blocos', 'layout.blockCount', 1, { min: 1, max: 4 }),
        n('Linhas por bloco', 'layout.rowsPerBlock', 6, { min: 1, max: 24 }),
        n('Espaço entre blocos', 'layout.blockGap', 36),
      ],
    },
    {
      id: 'rows',
      label: 'Linhas',
      description: 'Altura, espaçamento e acabamento das linhas.',
      icon: 'rows',
      controls: [
        n('Altura da linha', 'layout.rowHeight', 62, { min: 24, max: 180 }),
        n('Espaço entre linhas', 'layout.rowGap', 5, { min: 0, max: 80 }),
        n('Padding X', 'layout.paddingX', 18, { min: 0, max: 80 }),
        n('Raio/cantos', 'layout.radius', 0, { min: 0, max: 80 }),
        c('Fundo da linha', 'theme.rowBackground', '#ef3340'),
        c('Fundo alternado', 'theme.rowAltBackground', '#ef3340'),
        c('Cor do texto', 'theme.text', '#ffffff'),
        c('Cor de destaque', 'theme.accent', '#d8ab4f'),
      ],
    },
    {
      id: 'columns',
      label: 'Colunas',
      description: 'Largura das colunas e tamanho dos elementos internos.',
      icon: 'table',
      controls: [
        columnsControl('Colunas da tabela', getColumnDefinitions(templateId), 'Marque para mostrar/remover. Ajuste a largura em pixels reais.'),
        n('Fonte base', 'layout.fontSize', 24, { min: 8, max: 80 }),
        n('Logo', 'layout.logoSize', 44, { min: 0, max: 160 }),
      ],
    },
    ...(hasInfoImage
      ? [
          {
            id: 'info-image',
            label: 'Imagem de apoio',
            description: 'Imagem superior ou lateral usada junto da tabela.',
            icon: 'image' as const,
            controls: [
              { kind: 'checkbox' as const, label: 'Mostrar imagem', path: 'tabelaGeral.infoImage.enabled', fallback: true },
              n('X', 'tabelaGeral.infoImage.x', 0),
              n('Y', 'tabelaGeral.infoImage.y', 8),
              n('Largura', 'tabelaGeral.infoImage.w', 1920),
              n('Altura', 'tabelaGeral.infoImage.h', 330),
              n('Opacidade', 'tabelaGeral.infoImage.opacity', 100, { min: 0, max: 100 }),
              s('Ajuste', 'tabelaGeral.infoImage.fit', objectFitOptions, 'contain'),
              img('Trocar imagem', 'tabelaGeral.infoImage.url'),
            ],
          },
        ]
      : []),
    {
      id: 'header-brand',
      label: 'Logo / título',
      description: 'Bloco de imagem e textos opcionais acima da overlay.',
      icon: 'text',
      controls: [
        { kind: 'checkbox', label: 'Mostrar bloco', path: 'brand.enabled', fallback: false },
        { kind: 'checkbox', label: 'Mostrar imagem', path: 'brand.imageEnabled', fallback: true },
        { kind: 'checkbox', label: 'Mostrar texto', path: 'brand.textEnabled', fallback: true },
        img('Logo/imagem', 'brand.logoDataUrl'),
        t('Nome', 'brand.name', ''),
        t('Título', 'brand.title', ''),
        n('Imagem X', 'brand.x', 180),
        n('Imagem Y', 'brand.y', 54),
        n('Imagem Largura', 'brand.w', 1560),
        n('Imagem Altura', 'brand.h', 120),
        n('Texto X', 'brand.textX', 420),
        n('Texto Y', 'brand.textY', 66),
        n('Nome tamanho', 'brand.nameSize', 54),
        n('Título tamanho', 'brand.titleSize', 24),
        c('Cor do texto', 'brand.textColor', '#ffffff'),
        s('Alinhamento', 'brand.align', alignOptions, 'left'),
      ],
    },
  ]
}

function buildMvpGeralLayers(): LayerDef[] {
  return [
    {
      id: 'top-card',
      label: 'Card TOP 1',
      description: 'Moldura do MVP, foto e bloco de informações.',
      icon: 'layers',
      controls: [
        n('Foto X', 'mvpGeral.photoX', 50),
        n('Foto Y', 'mvpGeral.photoY', 120),
        n('Foto largura', 'mvpGeral.photoW', 600),
        n('Foto altura', 'mvpGeral.photoH', 850),
        n('Info X', 'mvpGeral.infoX', 50),
        n('Info Y', 'mvpGeral.infoY', 842),
        n('Info largura', 'mvpGeral.infoW', 600),
        n('Info altura', 'mvpGeral.infoH', 128),
        c('Fundo do card', 'mvpGeral.cardBackground', '#8010c8'),
        c('Cor da linha/borda', 'mvpGeral.lineColor', '#d8ab4f'),
      ],
    },
    {
      id: 'mvp-photo',
      label: 'Foto MVP',
      description: 'Imagem principal do jogador TOP 1.',
      icon: 'image',
      controls: [
        img('Enviar foto fixa', 'mvpGeral.photoUrl'),
        s('Ajuste da foto', 'mvpGeral.photoFit', objectFitOptions, 'contain'),
        s('Posição da foto', 'brand.objectPosition', [
          ['center center', 'Centro'],
          ['center top', 'Centro cima'],
          ['center bottom', 'Centro baixo'],
          ['left center', 'Esquerda'],
          ['right center', 'Direita'],
        ], 'center center'),
        n('Opacidade', 'brand.opacity', 100, { min: 0, max: 100 }),
      ],
    },
    {
      id: 'mvp-info',
      label: 'Nome e stats',
      description: 'Nome, logo e estatísticas do jogador principal.',
      icon: 'text',
      controls: [
        n('Fonte nome', 'brand.nameSize', 54, { min: 12, max: 120 }),
        n('Fonte stats', 'brand.titleSize', 24, { min: 8, max: 80 }),
        c('Texto', 'brand.textColor', '#ffffff'),
        c('Destaque', 'theme.accent', '#d8ab4f'),
        s('Alinhamento', 'brand.align', alignOptions, 'left'),
        n('Opacidade texto', 'brand.textOpacity', 100, { min: 0, max: 100 }),
      ],
    },
    {
      id: 'ranking-table',
      label: 'Tabela TOP 2+',
      description: 'Ranking lateral depois do TOP 1.',
      icon: 'table',
      controls: [
        n('Tabela X', 'mvpGeral.tableX', 730),
        n('Tabela Y', 'mvpGeral.tableY', 260),
        n('Tabela largura', 'mvpGeral.tableW', 1140),
        n('Top total', 'mvpGeral.tableMaxRows', 8, { min: 2, max: 20 }),
        n('Altura linha', 'mvpGeral.tableRowHeight', 86, { min: 24, max: 180 }),
        n('Espaço linhas', 'mvpGeral.tableGap', 10, { min: 0, max: 80 }),
        n('Fonte base', 'layout.fontSize', 30, { min: 10, max: 80 }),
        n('Logo', 'layout.logoSize', 58, { min: 0, max: 140 }),
        c('Fundo da tabela', 'mvpGeral.tableBackground', '#8010c8'),
        c('Texto tabela', 'theme.text', '#ffffff'),
      ],
    },
    {
      id: 'mvp-columns',
      label: 'Colunas da tabela',
      description: 'Larguras da tabela do MVP geral.',
      icon: 'table',
      controls: [
        columnsControl('Colunas MVP', getColumnDefinitions('mvp-geral'), 'Marque para mostrar/remover. Ajuste a largura em pixels reais.'),
      ],
    },
  ]
}

function buildBooyahsDiaLayers(): LayerDef[] {
  return [
    {
      id: 'cards-layout',
      label: 'Grade de cards',
      description: 'Posição, quantidade e tamanho dos cards.',
      icon: 'layers',
      controls: [
        s('Modo', 'booyahsDia.mode', [
          ['cards', 'Cards'],
          ['vertical-list', 'Lista vertical'],
        ], 'cards'),
        { kind: 'checkbox', label: 'Auto centralizar', path: 'booyahsDia.autoFit', fallback: true },
        n('X manual', 'booyahsDia.x', 36),
        n('Y', 'booyahsDia.y', 360),
        n('Área total', 'booyahsDia.containerWidth', 1840),
        n('Colunas', 'booyahsDia.columns', 3, { min: 1, max: 8 }),
        n('Espaço', 'booyahsDia.gap', 18, { min: 0, max: 80 }),
        n('Largura card', 'booyahsDia.cardWidth', 390, { min: 120, max: 800 }),
        n('Altura card', 'booyahsDia.cardHeight', 470, { min: 160, max: 900 }),
        n('Raio/cantos card', 'booyahsDia.cardRadius', 0, { min: 0, max: 80 }),
        n('Borda card', 'booyahsDia.cardBorderWidth', 1, { min: 0, max: 20 }),
        c('Cor borda card', 'booyahsDia.cardBorderColor', '#000000'),
        c('Fundo card', 'booyahsDia.cardBackground', '#ffffff'),
      ],
    },
    {
      id: 'map-area',
      label: 'Imagem do mapa',
      description: 'Altura, máscara/fundo e filtro da imagem do mapa.',
      icon: 'image',
      controls: [
        img('Máscara/fundo do mapa', 'booyahsDia.mapBackgroundUrl'),
        n('Altura faixa nome', 'booyahsDia.titleHeight', 78, { min: 24, max: 160 }),
        n('Altura stats', 'booyahsDia.statsHeight', 77, { min: 24, max: 160 }),
        t('Filtro mapa finalizado', 'booyahsDia.mutedMapFilter', 'grayscale(1)'),
        t('Filtro mapa pendente', 'booyahsDia.pendingMapFilter', 'none'),
      ],
    },
    {
      id: 'team-logo',
      label: 'Logo da equipe',
      description: 'Tamanho e posição da logo dentro do card.',
      icon: 'image',
      controls: [
        n('Logo tamanho', 'booyahsDia.logoSize', 150, { min: 0, max: 320 }),
        n('Logo X no card', 'booyahsDia.logoX', 0, { hint: '0 = centralizado automaticamente' }),
        n('Logo Y no mapa', 'booyahsDia.logoY', 0, { hint: '0 = centralizado automaticamente' }),
      ],
    },
    {
      id: 'map-name',
      label: 'Nome do mapa',
      description: 'Faixa com nome do mapa e número da queda.',
      icon: 'text',
      controls: [
        img('Imagem da faixa', 'booyahsDia.nameBandBackgroundUrl'),
        c('Fundo da faixa', 'booyahsDia.accent', '#e7d573'),
        c('Cor do texto', 'booyahsDia.titleText', '#ef3340'),
        n('Fonte nome mapa', 'booyahsDia.titleFontSize', 34, { min: 10, max: 90 }),
        n('Padding X', 'booyahsDia.titlePaddingX', 16, { min: 0, max: 80 }),
      ],
    },
    {
      id: 'stats',
      label: 'Pontos e abates',
      description: 'Faixa inferior com PTS e ABT.',
      icon: 'text',
      controls: [
        img('Imagem do rodapé', 'booyahsDia.statsBackgroundUrl'),
        c('Fundo stats', 'booyahsDia.statsBackground', '#ef3340'),
        c('Cor stats', 'booyahsDia.statsText', '#111827'),
        n('Fonte stats', 'booyahsDia.statsFontSize', 26, { min: 8, max: 70 }),
        n('Padding stats', 'booyahsDia.statsPaddingX', 20, { min: 0, max: 80 }),
      ],
    },
    {
      id: 'side-art',
      label: 'Arte lateral/topo',
      description: 'Imagem extra usada acima ou ao lado dos cards.',
      icon: 'image',
      controls: [
        img('Imagem da arte', 'booyahsDia.artImageUrl'),
        n('X', 'booyahsDia.artX', 0),
        n('Y', 'booyahsDia.artY', 20),
        n('Largura', 'booyahsDia.artW', 1920),
        n('Altura', 'booyahsDia.artH', 260),
        s('Ajuste', 'booyahsDia.artFit', objectFitOptions, 'contain'),
      ],
    },
  ]
}


function buildBooyahLayers(): LayerDef[] {
  return [
    {
      id: 'booyah-text',
      label: 'Texto BOOYAH',
      description: 'Texto principal da chamada animada.',
      icon: 'text',
      controls: [
        t('Texto', 'booyah.texto', 'BOOYAH'),
        n('X', 'booyah.textoBlock.x', 630),
        n('Y', 'booyah.textoBlock.y', 330),
        n('Largura', 'booyah.textoBlock.w', 880),
        n('Altura', 'booyah.textoBlock.h', 190),
        n('Escala', 'booyah.textoBlock.scale', 100, { min: 10, max: 200 }),
        n('Fonte', 'booyah.textoBlock.fontSize', 132, { min: 20, max: 260 }),
        c('Cor texto', 'booyah.textoBlock.color', '#f6c453'),
        c('Sombra', 'booyah.textoBlock.shadowColor', 'rgba(0,0,0,0.35)'),
      ],
    },
    {
      id: 'booyah-logo',
      label: 'Logo vencedora',
      description: 'Bloco da logo da equipe vencedora.',
      icon: 'image',
      controls: [
        n('X', 'booyah.logoBlock.x', 300),
        n('Y', 'booyah.logoBlock.y', 360),
        n('Largura', 'booyah.logoBlock.w', 230),
        n('Altura', 'booyah.logoBlock.h', 230),
        n('Escala', 'booyah.logoBlock.scale', 100, { min: 10, max: 200 }),
        n('Delay entrada ms', 'booyah.logoBlock.delay', 2000, { min: 0, max: 10000 }),
        s('Ajuste logo', 'booyah.logoBlock.fit', objectFitOptions, 'contain'),
        s('Posição logo', 'booyah.logoBlock.position', [
          ['center center', 'Centro'],
          ['center top', 'Centro cima'],
          ['center bottom', 'Centro baixo'],
          ['left center', 'Esquerda'],
          ['right center', 'Direita'],
        ], 'center center'),
        t('Fundo', 'booyah.logoBlock.background', 'transparent'),
        n('Cantos', 'booyah.logoBlock.radius', 0, { min: 0, max: 120 }),
      ],
    },
    {
      id: 'booyah-team',
      label: 'Nome da equipe',
      description: 'Nome da equipe vencedora.',
      icon: 'text',
      controls: [
        n('X', 'booyah.equipeBlock.x', 620),
        n('Y', 'booyah.equipeBlock.y', 530),
        n('Largura', 'booyah.equipeBlock.w', 760),
        n('Altura', 'booyah.equipeBlock.h', 80),
        n('Escala', 'booyah.equipeBlock.scale', 100, { min: 10, max: 200 }),
        n('Delay entrada ms', 'booyah.equipeBlock.delay', 2200, { min: 0, max: 10000 }),
        n('Fonte', 'booyah.equipeBlock.fontSize', 42, { min: 10, max: 140 }),
        c('Cor nome', 'booyah.equipeBlock.color', '#ffffff'),
        c('Sombra', 'booyah.equipeBlock.shadowColor', 'rgba(0,0,0,0.35)'),
        s('Alinhamento', 'booyah.equipeBlock.align', alignOptions, 'left'),
      ],
    },
  ]
}

function buildCountdownLayers(): LayerDef[] {
  return [
    {
      id: 'timer',
      label: 'Timer',
      description: 'Relógio, título e subtítulo da contagem.',
      icon: 'text',
      controls: [
        t('Título', 'countdown.titulo', 'A LIVE COMEÇA EM'),
        t('Subtítulo', 'countdown.subtitulo', ''),
        n('Tempo segundos', 'countdown.seconds', 900, { min: 0, max: 86400 }),
        n('X', 'countdown.timerBlock.x', 585),
        n('Y', 'countdown.timerBlock.y', 110),
        n('Largura', 'countdown.timerBlock.w', 750),
        n('Escala', 'countdown.timerBlock.scale', 100, { min: 10, max: 200 }),
        n('Tamanho relógio', 'countdown.timerBlock.clockSize', 160, { min: 24, max: 260 }),
        c('Cor relógio', 'countdown.timerBlock.clockColor', '#ffffff'),
        c('Fundo', 'countdown.timerBlock.background', 'rgba(0,0,0,0.55)'),
      ],
    },
    {
      id: 'teams',
      label: 'Equipes',
      description: 'Grade/lista de equipes no countdown.',
      icon: 'layers',
      controls: [
        n('X', 'countdown.equipesBlock.x', 95),
        n('Y', 'countdown.equipesBlock.y', 380),
        n('Largura', 'countdown.equipesBlock.w', 760),
        n('Colunas', 'countdown.equipesBlock.columns', 3, { min: 1, max: 24 }),
        n('Largura card', 'countdown.equipesBlock.cardWidth', 190, { min: 40, max: 400 }),
        n('Altura card', 'countdown.equipesBlock.cardHeight', 142, { min: 40, max: 400 }),
        n('Logo', 'countdown.equipesBlock.logoSize', 155, { min: 0, max: 260 }),
        n('Espaço colunas', 'countdown.equipesBlock.columnGap', 20, { min: 0, max: 120 }),
        n('Espaço linhas', 'countdown.equipesBlock.rowGap', 20, { min: 0, max: 120 }),
        c('Fundo card', 'countdown.equipesBlock.cardStyle.background', '#f6c453'),
      ],
    },
    {
      id: 'maps',
      label: 'Mapas / quedas',
      description: 'Bloco de mapas/quedas do countdown.',
      icon: 'rows',
      controls: [
        n('X', 'countdown.mapasBlock.x', 1120),
        n('Y', 'countdown.mapasBlock.y', 405),
        n('Largura', 'countdown.mapasBlock.w', 620),
        n('Altura', 'countdown.mapasBlock.h', 701),
        n('Altura linha', 'countdown.mapasBlock.rowHeight', 118, { min: 20, max: 220 }),
        n('Fonte', 'countdown.mapasBlock.fontSize', 28, { min: 8, max: 90 }),
        c('Fundo', 'countdown.mapasBlock.background', '#f6c453'),
        c('Fundo linha', 'countdown.mapasBlock.rowBackground', '#101827'),
        c('Texto linha', 'countdown.mapasBlock.rowTextColor', 'rgba(255,255,255,0.88)'),
      ],
    },
    {
      id: 'image',
      label: 'Imagem extra',
      description: 'Imagem opcional do countdown.',
      icon: 'image',
      controls: [
        img('Imagem', 'countdown.imagemUrl'),
        n('X', 'countdown.imagemBlock.x', 80),
        n('Y', 'countdown.imagemBlock.y', 60),
        n('Largura', 'countdown.imagemBlock.w', 260),
        n('Altura', 'countdown.imagemBlock.h', 180),
        n('Opacidade', 'countdown.imagemBlock.opacity', 100, { min: 0, max: 100 }),
      ],
    },
  ]
}

function buildWaitingLayers(): LayerDef[] {
  return [
    {
      id: 'waiting-main',
      label: 'Tela de espera',
      description: 'Título e grade de equipes da espera.',
      icon: 'layers',
      controls: [
        t('Título', 'title', 'TELA DE ESPERA'),
        n('Máximo de equipes', 'layout.maxRows', 18, { min: 1, max: 48 }),
        n('Fonte título', 'layout.titleSize', 58, { min: 20, max: 140 }),
        n('Largura bloco', 'layout.w', 1500, { min: 400, max: 1920 }),
        n('Colunas', 'layout.columns', 6, { min: 1, max: 12 }),
        n('Logo', 'layout.logoSize', 96, { min: 20, max: 220 }),
        c('Fundo', 'theme.background', 'rgba(0,0,0,0.55)'),
        c('Texto', 'theme.text', '#ffffff'),
      ],
    },
  ]
}

function buildScreenLayers(): LayerDef[] {
  return [
    {
      id: 'screen-main',
      label: 'Tela final',
      description: 'Ajustes gerais da tela de transmissão.',
      icon: 'layers',
      controls: [
        t('Título', 'title', 'AGRADECIMENTOS'),
        n('X', 'layout.x', 180),
        n('Y', 'layout.y', 140),
        n('Largura', 'layout.w', 1560),
        n('Altura bloco', 'layout.rowHeight', 90),
        n('Fonte', 'layout.fontSize', 24),
        n('Opacidade', 'layout.opacity', 100, { min: 0, max: 100 }),
        c('Fundo', 'theme.background', 'rgba(5, 8, 18, 0.78)'),
        c('Texto', 'theme.text', '#ffffff'),
        c('Destaque', 'theme.accent', '#f6c453'),
      ],
    },
    {
      id: 'screen-brand',
      label: 'Logo / título',
      description: 'Imagem e textos da tela final.',
      icon: 'text',
      controls: [
        { kind: 'checkbox', label: 'Mostrar bloco', path: 'brand.enabled', fallback: true },
        img('Logo/imagem', 'brand.logoDataUrl'),
        t('Nome', 'brand.name', 'AGRADECIMENTOS'),
        t('Título', 'brand.title', 'AGRADECIMENTOS'),
        n('Imagem X', 'brand.x', 180),
        n('Imagem Y', 'brand.y', 54),
        n('Imagem Largura', 'brand.w', 1560),
        n('Imagem Altura', 'brand.h', 120),
        c('Cor texto', 'brand.textColor', '#ffffff'),
      ],
    },
  ]
}

function buildGenericLayers(): LayerDef[] {
  return [
    {
      id: 'generic-table',
      label: 'Overlay',
      description: 'Ajustes básicos do bloco.',
      icon: 'layers',
      controls: [
        n('X', 'layout.x', 180),
        n('Y', 'layout.y', 140),
        n('Largura', 'layout.w', 1560),
        n('Altura linha', 'layout.rowHeight', 62),
        n('Fonte', 'layout.fontSize', 24),
        c('Fundo', 'theme.background', '#101827'),
        c('Texto', 'theme.text', '#ffffff'),
      ],
    },
  ]
}

function buildLayers(family: OverlayFamily, config: StreamOverlayConfig, templateId?: string | null): LayerDef[] {
  if (family === 'cards') return buildBooyahsDiaLayers()
  if (family === 'card-table') return buildMvpGeralLayers()
  if (family === 'table') return buildTableLayers(config, templateId)
  if (family === 'booyah') return buildBooyahLayers()
  if (family === 'countdown') return buildCountdownLayers()
  if (family === 'waiting') return buildWaitingLayers()
  if (family === 'screen') return buildScreenLayers()
  return buildGenericLayers()
}

function familyLabel(family: OverlayFamily) {
  if (family === 'cards') return 'Cards'
  if (family === 'card-table') return 'Card + tabela'
  if (family === 'table') return 'Tabela'
  if (family === 'booyah') return 'Booyah'
  if (family === 'countdown') return 'Countdown'
  if (family === 'waiting') return 'Tela de espera'
  if (family === 'screen') return 'Tela final'
  return 'Geral'
}


function ColumnsControl({ control, config, onChange }: { control: ControlDef; config: StreamOverlayConfig; onChange: (path: string, value: unknown) => void }) {
  const columns = control.columns || []
  return (
    <div className="col-span-2 space-y-2 border border-white/10 bg-white/[0.03] p-3">
      <div>
        <div className="text-[10px] font-black uppercase tracking-[0.14em] text-zinc-400">{control.label}</div>
        {control.hint ? <div className="mt-1 text-[10px] font-semibold leading-4 text-zinc-500">{control.hint}</div> : null}
      </div>
      <div className="space-y-2">
        {columns.map((column) => {
          const enabled = getValue(config, `columns.${column.key}`, true) !== false
          const px = ratioToPixelWidth(config, column.key, column.widthFallback)
          return (
            <div key={column.key} className={`grid grid-cols-[1fr_92px] items-center gap-2 border px-2 py-2 ${enabled ? 'border-white/10 bg-[#0b1220]' : 'border-white/5 bg-black/20 opacity-60'}`}>
              <label className="flex min-w-0 items-center gap-2 text-[10px] font-black uppercase tracking-[0.10em] text-zinc-200">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(event) => onChange(`columns.${column.key}`, event.target.checked)}
                  className="h-4 w-4 accent-red-600"
                />
                <span className="truncate">{column.label || allColumnLabels[column.key] || column.key}</span>
              </label>
              <label className="flex items-center gap-1">
                <input
                  type="number"
                  min={12}
                  max={900}
                  step={1}
                  value={px}
                  disabled={!enabled}
                  onChange={(event) => onChange(`columnPixelWidths.${column.key}`, Number(event.target.value))}
                  className="h-9 min-w-0 flex-1 border border-white/10 bg-white px-2 text-xs font-black text-[#101827] outline-none disabled:opacity-50"
                />
                <span className="text-[10px] font-black uppercase text-zinc-500">px</span>
              </label>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ControlField({ control, config, onChange, onUploadImage }: { control: ControlDef; config: StreamOverlayConfig; onChange: (path: string, value: unknown) => void; onUploadImage?: (path: string, file: File) => Promise<void> }) {
  const value = getValue(config, control.path, control.fallback)

  if (control.kind === 'columns') {
    return <ColumnsControl control={control} config={config} onChange={onChange} />
  }

  if (control.kind === 'checkbox') {
    return (
      <label className="flex items-center justify-between gap-3 border border-white/10 bg-white/[0.03] px-3 py-2 text-[11px] font-bold uppercase tracking-[0.08em] text-zinc-200">
        <span>{control.label}</span>
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(event) => onChange(control.path, event.target.checked)}
          className="h-4 w-4 accent-red-600"
        />
      </label>
    )
  }

  if (control.kind === 'select') {
    return (
      <label className="block space-y-1">
        <span className="text-[10px] font-black uppercase tracking-[0.14em] text-zinc-500">{control.label}</span>
        <select
          value={String(value ?? '')}
          onChange={(event) => onChange(control.path, event.target.value)}
          className="h-10 w-full border border-white/10 bg-white px-2 text-xs font-bold text-[#101827] outline-none"
        >
          {(control.options || []).map(([optionValue, optionLabel]) => (
            <option key={optionValue} value={optionValue}>{optionLabel}</option>
          ))}
        </select>
      </label>
    )
  }

  if (control.kind === 'image') {
    return (
      <label className="block space-y-2 border border-white/10 bg-white/[0.03] p-3">
        <span className="text-[10px] font-black uppercase tracking-[0.14em] text-zinc-500">{control.label}</span>
        <input
          type="file"
          accept="image/*"
          className="w-full text-[11px] font-semibold text-zinc-300 file:mr-3 file:border-0 file:bg-red-600 file:px-3 file:py-2 file:text-[10px] file:font-black file:uppercase file:tracking-[0.12em] file:text-white"
          onChange={async (event) => {
            const file = event.target.files?.[0]
            if (!file || !onUploadImage) return
            await onUploadImage(control.path, file)
            event.currentTarget.value = ''
          }}
        />
        <input
          value={String(value || '')}
          onChange={(event) => onChange(control.path, event.target.value)}
          placeholder="URL da imagem"
          className="h-9 w-full border border-white/10 bg-[#0b1220] px-2 text-xs font-semibold text-zinc-200 outline-none"
        />
        {control.hint ? <p className="text-[10px] font-semibold leading-4 text-zinc-500">{control.hint}</p> : null}
      </label>
    )
  }

  if (control.kind === 'color') {
    return (
      <label className="block space-y-1">
        <span className="text-[10px] font-black uppercase tracking-[0.14em] text-zinc-500">{control.label}</span>
        <div className="flex h-10 overflow-hidden border border-white/10 bg-white">
          <input
            type="color"
            value={String(value || control.fallback || '#ffffff').startsWith('#') ? String(value || control.fallback) : '#ffffff'}
            onChange={(event) => onChange(control.path, event.target.value)}
            className="h-10 w-12 border-0 bg-transparent p-1"
          />
          <input
            value={String(value || '')}
            onChange={(event) => onChange(control.path, event.target.value)}
            className="min-w-0 flex-1 px-2 text-xs font-bold text-[#101827] outline-none"
          />
        </div>
      </label>
    )
  }

  if (control.kind === 'text') {
    return (
      <label className="block space-y-1">
        <span className="text-[10px] font-black uppercase tracking-[0.14em] text-zinc-500">{control.label}</span>
        <input
          value={String(value || '')}
          onChange={(event) => onChange(control.path, event.target.value)}
          className="h-10 w-full border border-white/10 bg-white px-2 text-xs font-bold text-[#101827] outline-none"
        />
        {control.hint ? <span className="text-[10px] text-zinc-500">{control.hint}</span> : null}
      </label>
    )
  }

  const numberValue = Number(value ?? control.fallback ?? 0)
  return (
    <label className="block space-y-1">
      <span className="text-[10px] font-black uppercase tracking-[0.14em] text-zinc-500">{control.label}</span>
      <input
        type="number"
        value={Number.isFinite(numberValue) ? numberValue : 0}
        min={control.min}
        max={control.max}
        step={control.step ?? 1}
        onChange={(event) => onChange(control.path, Number(event.target.value))}
        className="h-10 w-full border border-white/10 bg-white px-2 text-xs font-black text-[#101827] outline-none"
      />
      {control.hint ? <span className="text-[10px] text-zinc-500">{control.hint}</span> : null}
    </label>
  )
}

export default function SmartOverlayInspector({ templateId, config, onChange, onUploadImage }: SmartOverlayInspectorProps) {
  const family = getFamily(templateId, config)
  const layers = useMemo(() => buildLayers(family, config, templateId), [family, config, templateId])
  const [selectedLayerId, setSelectedLayerId] = useState(layers[0]?.id || '')
  const selectedLayer = layers.find((layer) => layer.id === selectedLayerId) || layers[0]

  if (!selectedLayer) return null

  return (
    <section className="border border-red-500/30 bg-[#080d16] p-3 shadow-[0_0_0_1px_rgba(255,255,255,0.03)]">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.22em] text-red-500">Editor por camadas</div>
          <div className="mt-1 text-xs font-semibold leading-5 text-zinc-400">
            Tipo: <b className="text-zinc-100">{familyLabel(family)}</b>. Selecione a parte visual e edite só o que pertence a ela.
          </div>
        </div>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2">
        {layers.map((layer) => {
          const Icon = iconFor(layer.icon)
          const active = layer.id === selectedLayer.id
          return (
            <button
              key={layer.id}
              type="button"
              onClick={() => setSelectedLayerId(layer.id)}
              className={`min-h-14 border px-2 py-2 text-left ${active ? 'border-red-600 bg-red-600 text-white' : 'border-white/10 bg-white/5 text-zinc-300 hover:border-white/25'}`}
            >
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.11em]">
                <Icon size={14} />
                {layer.label}
              </div>
              <div className={`mt-1 line-clamp-2 text-[9px] font-semibold leading-3 ${active ? 'text-white/75' : 'text-zinc-500'}`}>{layer.description}</div>
            </button>
          )
        })}
      </div>

      <div className="border border-white/10 bg-[#0b1220] p-3">
        <div className="mb-3">
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">{selectedLayer.label}</div>
          <div className="mt-1 text-[11px] font-semibold leading-4 text-zinc-500">{selectedLayer.description}</div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {selectedLayer.controls.map((control) => (
            <ControlField key={`${selectedLayer.id}-${control.path}-${control.label}`} control={control} config={config} onChange={onChange} onUploadImage={onUploadImage} />
          ))}
        </div>
      </div>
    </section>
  )
}
