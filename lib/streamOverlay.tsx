import { Users } from 'lucide-react'
import type { CSSProperties, PointerEvent } from 'react'

export type StreamOverlayBlock = 'image' | 'text' | 'table'

export type StreamOverlayConfig = {
  title?: string
  tabelaGeral?: {
    mode?: 'lateral' | 'duplo-inferior'
    backgroundImage?: string
    backgroundOpacity?: number
    infoImage?: {
      enabled?: boolean
      url?: string
      x?: number
      y?: number
      w?: number
      h?: number
      opacity?: number
      fit?: 'contain' | 'cover'
    }
  }
  brand?: {
    enabled?: boolean
    imageEnabled?: boolean
    textEnabled?: boolean
    logoDataUrl?: string | null
    name?: string
    title?: string
    x?: number
    y?: number
    w?: number
    h?: number
    scale?: number
    opacity?: number
    objectFit?: 'contain' | 'cover'
    objectPosition?: string
    align?: 'left' | 'center' | 'right'
    nameSize?: number
    titleSize?: number
    textColor?: string
    textX?: number
    textY?: number
    textW?: number
    textH?: number
    textScale?: number
    textOpacity?: number
    fontWeight?: number
    italic?: boolean
  }
  theme?: {
    primary?: string
    secondary?: string
    background?: string
    rowBackground?: string
    rowAltBackground?: string
    text?: string
    headerText?: string
    accent?: string
    border?: string
    borderColor?: string
    borderWidth?: number
    shadow?: string
  }
  columnStyles?: Record<string, { background?: string; text?: string }>
  rowStyles?: Record<string, { background?: string; text?: string }>
  columnWidths?: Record<string, number>
  columnsOrder?: string[]
  layout?: {
    x?: number
    y?: number
    w?: number
    rowHeight?: number
    rowGap?: number
    columnGap?: number
    maxRows?: number
    radius?: number
    fontSize?: number
    headerHeight?: number
    logoSize?: number
    paddingX?: number
    opacity?: number
    scale?: number
    blockCount?: number
    rowsPerBlock?: number
    blockGap?: number
    blockDirection?: 'horizontal' | 'vertical'
  }
  columns?: Record<string, boolean>
  animation?: {
    enter?: string
    duration?: number
  }
}

export type RankingRow = {
  id: string
  nome: string
  tag: string | null
  logo: string | null
  grupo: string | null
  quedas: number
  booyahs: number
  kills: number
  pontos: number
  empty?: boolean
}

export type FixedStreamOverlayTemplate = {
  id: string
  slug: string
  nome: string
  categoria: string
  descricao: string
  config_padrao: StreamOverlayConfig
}

function fixedTemplateConfig(title: string, overrides: StreamOverlayConfig = {}): StreamOverlayConfig {
  return mergeOverlayConfig(defaultTabelaGeralConfig, mergeOverlayConfig({
    title,
    brand: {
      name: title,
      title,
      textEnabled: true,
      imageEnabled: false,
    },
  }, overrides))
}

export const defaultTabelaGeralConfig: StreamOverlayConfig = {
  title: 'TABELA GERAL',
  brand: {
    enabled: true,
    imageEnabled: true,
    textEnabled: true,
    logoDataUrl: null,
    name: 'NOME DO CAMPEONATO',
    title: 'TABELA GERAL',
    x: 180,
    y: 54,
    w: 1560,
    h: 120,
    scale: 100,
    opacity: 100,
    objectFit: 'contain',
    objectPosition: 'center center',
    align: 'left',
    nameSize: 54,
    titleSize: 24,
    textColor: '#ffffff',
    textX: 420,
    textY: 66,
    textW: 1180,
    textH: 116,
    textScale: 100,
    textOpacity: 100,
    fontWeight: 900,
    italic: false,
  },
  theme: {
    primary: '#e60012',
    secondary: '#f6c453',
    background: 'rgba(5, 8, 18, 0.78)',
    rowBackground: 'linear-gradient(90deg, #d8ab4f 0%, #d8ab4f 18%, #8010c8 18%, #8010c8 100%)',
    rowAltBackground: 'linear-gradient(90deg, #d8ab4f 0%, #d8ab4f 18%, #8010c8 18%, #8010c8 100%)',
    text: '#ffffff',
    headerText: '#101827',
    accent: '#f6c453',
    border: 'rgba(255, 255, 255, 0.18)',
    borderColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: 0,
    shadow: 'transparent',
  },
  columnStyles: {},
  rowStyles: {},
  columnWidths: {},
  columnsOrder: ['rank', 'logo', 'nome', 'tag', 'grupo', 'quedas', 'booyahs', 'kills', 'pontos'],
  layout: {
    x: 180,
    y: 140,
    w: 1560,
    rowHeight: 62,
    rowGap: 12,
    columnGap: 0,
    maxRows: 12,
    radius: 0,
    fontSize: 24,
    headerHeight: 72,
    logoSize: 44,
    paddingX: 18,
    opacity: 100,
    scale: 100,
    blockCount: 2,
    rowsPerBlock: 6,
    blockGap: 70,
    blockDirection: 'horizontal',
  },
  columns: {
    rank: true,
    logo: true,
    nome: true,
    tag: true,
    grupo: true,
    quedas: true,
    booyahs: true,
    kills: true,
    pontos: true,
  },
  animation: {
    enter: 'slide',
    duration: 650,
  },
}

export const fixedStreamOverlayTemplates: FixedStreamOverlayTemplate[] = [
  {
    id: 'booyah',
    slug: 'booyah',
    nome: 'Booyah',
    categoria: 'transmissao',
    descricao: 'Chamada de Booyah da queda.',
    config_padrao: fixedTemplateConfig('BOOYAH', {
      layout: { maxRows: 1, rowsPerBlock: 1, headerHeight: 96, rowHeight: 90 },
      booyah: {
        texto: 'BOOYAH',
        textoBlock: { x: 630, y: 330, w: 880, h: 190, scale: 100, opacity: 100, fontSize: 132, color: '#f6c453', shadowColor: 'rgba(0,0,0,0.35)' },
        logoBlock: { x: 300, y: 360, w: 230, h: 230, scale: 100, opacity: 100, delay: 2000 },
        equipeBlock: { x: 620, y: 530, w: 760, h: 80, scale: 100, opacity: 100, fontSize: 42, color: '#ffffff' },
      },
    } as StreamOverlayConfig),
  },
  {
    id: 'countdown',
    slug: 'countdown',
    nome: 'Countdown',
    categoria: 'transmissao',
    descricao: 'Contagem regressiva com equipes do jogo, mapas/quedas e blocos moveis.',
    config_padrao: fixedTemplateConfig('COUNTDOWN', {
      title: 'A LIVE COMEÇA EM',
      layout: { maxRows: 18, rowsPerBlock: 18, headerHeight: 96, rowHeight: 90 },
      countdown: {
        seconds: 900,
        titulo: 'A LIVE COMEÇA EM',
        subtitulo: '',
        texto: '',
        imagemUrl: '',
        maxEquipes: 18,
        timerBlock: { x: 585, y: 110, w: 750, scale: 100, opacity: 100 },
        equipesBlock: { x: 95, y: 380, w: 760, h: 390, scale: 100, opacity: 100, columns: 3, columnGap: 20, rowGap: 20, cardWidth: 190, cardHeight: 150, logoBackground: 'transparent' },
        mapasBlock: { x: 1120, y: 405, w: 620, h: 380, scale: 100, opacity: 100, rowHeight: 62, rowGap: 12 },
        imagemBlock: { x: 80, y: 60, w: 260, h: 180, scale: 100, opacity: 100 },
        textoBlock: { x: 500, y: 925, w: 920, scale: 100, opacity: 100 },
      },
    } as StreamOverlayConfig),
  },
  {
    id: 'tabela-da-queda',
    slug: 'tabela-da-queda',
    nome: 'Tabela da queda',
    categoria: 'estatisticas',
    descricao: 'Tabela de pontuacao da queda atual.',
    config_padrao: fixedTemplateConfig('TABELA DA QUEDA'),
  },
  {
    id: 'mvp-da-queda',
    slug: 'mvp-da-queda',
    nome: 'MVP da queda',
    categoria: 'estatisticas',
    descricao: 'MVP da queda atual.',
    config_padrao: fixedTemplateConfig('MVP DA QUEDA', { layout: { maxRows: 6, rowsPerBlock: 6 } }),
  },
  {
    id: 'tabela-geral',
    slug: 'tabela-geral',
    nome: 'Tabela geral',
    categoria: 'estatisticas',
    descricao: 'Classificacao geral acumulada.',
    config_padrao: fixedTemplateConfig('TABELA GERAL'),
  },
  {
    id: 'mvp-geral',
    slug: 'mvp-geral',
    nome: 'MVP geral',
    categoria: 'estatisticas',
    descricao: 'Ranking MVP geral.',
    config_padrao: fixedTemplateConfig('MVP GERAL', { layout: { maxRows: 8, rowsPerBlock: 8 } }),
  },
  {
    id: 'tabela-do-dia',
    slug: 'tabela-do-dia',
    nome: 'Tabela do dia',
    categoria: 'estatisticas',
    descricao: 'Classificacao do dia.',
    config_padrao: fixedTemplateConfig('TABELA DO DIA'),
  },
  {
    id: 'mvp-do-dia',
    slug: 'mvp-do-dia',
    nome: 'MVP do dia',
    categoria: 'estatisticas',
    descricao: 'Ranking MVP do dia.',
    config_padrao: fixedTemplateConfig('MVP DO DIA', { layout: { maxRows: 8, rowsPerBlock: 8 } }),
  },
  {
    id: 'agradecimentos',
    slug: 'agradecimentos',
    nome: 'Agradecimentos',
    categoria: 'transmissao',
    descricao: 'Tela final de agradecimentos.',
    config_padrao: fixedTemplateConfig('AGRADECIMENTOS', { layout: { maxRows: 1, rowsPerBlock: 1, headerHeight: 110, rowHeight: 90 } }),
  },
]

export const fixedStreamOverlaySlugs = fixedStreamOverlayTemplates.map((template) => template.slug)

export function getFixedStreamOverlayTemplate(slugOrId?: string | null) {
  const value = String(slugOrId || '').trim().toLowerCase()
  return fixedStreamOverlayTemplates.find((template) => template.slug === value || template.id === value) || null
}

export const tabelaGeralColumnLabels: Record<string, string> = {
  rank: 'POS',
  logo: '',
  nome: 'EQUIPE',
  tag: 'TAG',
  grupo: 'GR',
  quedas: 'QD',
  booyahs: 'B!',
  kills: 'KILL',
  pontos: 'PTS',
}

export const defaultTabelaGeralColumnWidths: Record<string, number> = {
  rank: 0.62,
  logo: 0.66,
  nome: 2.35,
  tag: 0.9,
  grupo: 0.72,
  quedas: 0.72,
  booyahs: 0.78,
  kills: 0.9,
  pontos: 1,
}

export function mergeOverlayConfig(base?: StreamOverlayConfig | null, override?: StreamOverlayConfig | null): StreamOverlayConfig {
  return {
    ...(base || {}),
    ...(override || {}),
    brand: { ...(base?.brand || {}), ...(override?.brand || {}) },
    theme: { ...(base?.theme || {}), ...(override?.theme || {}) },
    columnStyles: { ...(base?.columnStyles || {}), ...(override?.columnStyles || {}) },
    rowStyles: { ...(base?.rowStyles || {}), ...(override?.rowStyles || {}) },
    columnWidths: { ...(base?.columnWidths || {}), ...(override?.columnWidths || {}) },
    columnsOrder: override?.columnsOrder || base?.columnsOrder,
    layout: { ...(base?.layout || {}), ...(override?.layout || {}) },
    columns: { ...(base?.columns || {}), ...(override?.columns || {}) },
    animation: { ...(base?.animation || {}), ...(override?.animation || {}) },
    tabelaGeral: {
      ...(base?.tabelaGeral || {}),
      ...(override?.tabelaGeral || {}),
      infoImage: {
        ...(base?.tabelaGeral?.infoImage || {}),
        ...(override?.tabelaGeral?.infoImage || {}),
      },
    },
  }
}

export function getVisibleTabelaColumns(config: StreamOverlayConfig) {
  const columns = config.columns || defaultTabelaGeralConfig.columns || {}
  const defaultOrder = Object.keys(tabelaGeralColumnLabels)
  const savedOrder = (config.columnsOrder || []).filter((key) => defaultOrder.includes(key))
  const orderedColumns = [...savedOrder, ...defaultOrder.filter((key) => !savedOrder.includes(key))]
  return orderedColumns.filter((key) => columns[key] !== false)
}

export function getTabelaBorder(config: StreamOverlayConfig) {
  const width = Math.max(0, Number(config.theme?.borderWidth ?? 0))
  const color = config.theme?.borderColor || config.theme?.border || 'transparent'
  return width > 0 ? `${width}px solid ${color}` : '0 solid transparent'
}

export function buildTabelaGrid(columns: string[], config?: StreamOverlayConfig) {
  return columns
    .map((key) => {
      const width = Number(config?.columnWidths?.[key] ?? defaultTabelaGeralColumnWidths[key] ?? 1)
      return `${Math.max(0.2, width)}fr`
    })
    .join(' ')
}

export function sampleRankingRows(maxRows = 12): RankingRow[] {
  const teams = [
    ['RED WAVE', 'RW', 'A'],
    ['ALOE', 'ALOE', 'A'],
    ['BRAVUS BR', 'BRA', 'B'],
    ['TEAM ODIO', 'ODIO', 'B'],
    ['MANDELA GAMING', 'MDL', 'C'],
    ['EXCALIBUR', 'EXC', 'C'],
    ['BLACKOUT', 'BLK', 'D'],
    ['NOVA ERA', 'NVE', 'D'],
  ]

  return Array.from({ length: maxRows }, (_, index) => {
    const team = teams[index % teams.length]
    const kills = Math.max(2, 36 - index * 3)
    const booyahs = index < 3 ? 2 - Math.min(index, 1) : index % 4 === 0 ? 1 : 0
    return {
      id: `sample-${index}`,
      nome: team[0],
      tag: team[1],
      logo: null,
      grupo: team[2],
      quedas: 4,
      booyahs,
      kills,
      pontos: kills + booyahs * 12 + Math.max(0, 38 - index * 4),
    }
  }).sort((a, b) => b.pontos - a.pontos || b.booyahs - a.booyahs || b.kills - a.kills)
}

function displayValue(row: RankingRow, column: string, rank: number) {
  if (row.empty) return ''
  if (column === 'rank') return `${rank}`
  if (column === 'nome') return row.nome
  if (column === 'tag') return row.tag || '-'
  if (column === 'grupo') return row.grupo || '-'
  if (column === 'quedas') return row.quedas
  if (column === 'booyahs') return row.booyahs
  if (column === 'kills') return row.kills
  if (column === 'pontos') return row.pontos
  return ''
}

function fillRows(rows: RankingRow[], maxRows: number) {
  const trimmed = rows.slice(0, maxRows)
  const missing = Math.max(0, maxRows - trimmed.length)

  return [
    ...trimmed,
    ...Array.from({ length: missing }, (_, index) => ({
      id: `empty-${index}`,
      nome: '',
      tag: null,
      logo: null,
      grupo: null,
      quedas: 0,
      booyahs: 0,
      kills: 0,
      pontos: 0,
      empty: true,
    })),
  ]
}

function chunkRows(rows: RankingRow[], rowsPerBlock: number, blockCount: number) {
  const chunks: RankingRow[][] = []
  const safeRows = Math.max(1, rowsPerBlock)
  const safeCount = Math.max(1, blockCount)

  for (let index = 0; index < safeCount; index += 1) {
    chunks.push(rows.slice(index * safeRows, index * safeRows + safeRows))
  }

  return chunks.filter((chunk) => chunk.length > 0)
}

export function TabelaGeralOverlay({
  config,
  rows,
  previewScale,
  editable,
  selectedBlock,
  selectedColumn,
  onSelectBlock,
  onSelectColumn,
  onStartDrag,
}: {
  config: StreamOverlayConfig
  rows: RankingRow[]
  previewScale?: number
  editable?: boolean
  selectedBlock?: StreamOverlayBlock
  selectedColumn?: string
  onSelectBlock?: (block: StreamOverlayBlock) => void
  onSelectColumn?: (column: string) => void
  onStartDrag?: (block: StreamOverlayBlock, event: PointerEvent) => void
}) {
  const merged = mergeOverlayConfig(defaultTabelaGeralConfig, config)
  const maxRows = Number(merged.layout?.maxRows || 12)
  const visibleColumns = getVisibleTabelaColumns(merged)
  const gridTemplateColumns = buildTabelaGrid(visibleColumns, merged)
  const lista = fillRows(rows, maxRows)
  const opacity = Math.max(0, Math.min(100, Number(merged.layout?.opacity ?? 100))) / 100
  const tableScale = Math.max(10, Number(merged.layout?.scale || 100)) / 100
  const brandScale = Math.max(10, Number(merged.brand?.scale || 100)) / 100
  const brandOpacity = Math.max(0, Math.min(100, Number(merged.brand?.opacity ?? 100))) / 100
  const textScale = Math.max(10, Number(merged.brand?.textScale || 100)) / 100
  const textOpacity = Math.max(0, Math.min(100, Number(merged.brand?.textOpacity ?? 100))) / 100
  const blockCount = Math.max(1, Math.min(4, Number(merged.layout?.blockCount || 1)))
  const rowsPerBlock = Math.max(1, Math.ceil(maxRows / blockCount))
  const blocks = blockCount > 1 ? chunkRows(lista, rowsPerBlock, blockCount) : [lista]
  const blockDirection = merged.layout?.blockDirection || 'horizontal'
  const blockGap = Number(merged.layout?.blockGap || 36)
  const columnGap = Number(merged.layout?.columnGap || 0)
  const cellPaddingX = Number(merged.layout?.paddingX || 18)
  const tableBorder = getTabelaBorder(merged)
  const backgroundOpacity = Math.max(0, Math.min(100, Number(merged.tabelaGeral?.backgroundOpacity ?? 100))) / 100
  const infoImage = merged.tabelaGeral?.infoImage
  const infoImageOpacity = Math.max(0, Math.min(100, Number(infoImage?.opacity ?? 100))) / 100
  const blockWidth = blockDirection === 'horizontal'
    ? (Number(merged.layout?.w || 1560) - blockGap * (blocks.length - 1)) / Math.max(1, blocks.length)
    : Number(merged.layout?.w || 1560)
  const selectedStyle = (block: StreamOverlayBlock): CSSProperties => editable
    ? {
        cursor: 'pointer',
        outline: selectedBlock === block ? '4px solid #ef4444' : '2px dashed rgba(239, 68, 68, 0.55)',
        outlineOffset: 4,
      }
    : {}
  const blockLabel = (label: string) => editable ? (
    <span className="absolute left-0 top-0 z-10 bg-red-600 px-2 py-1 text-[18px] font-black leading-none tracking-[0.08em] text-white">
      {label}
    </span>
  ) : null
  const selectBlock = (block: StreamOverlayBlock) => (event: PointerEvent) => {
    if (!editable) return
    event.preventDefault()
    event.stopPropagation()
    onSelectBlock?.(block)
    onStartDrag?.(block, event)
  }
  const selectColumn = (column: string) => (event: PointerEvent) => {
    if (!editable) return
    event.preventDefault()
    event.stopPropagation()
    onSelectBlock?.('table')
    onSelectColumn?.(column)
  }
  const selectedColumnStyle = (column: string): CSSProperties => editable && selectedColumn === column
    ? {
        outline: '3px solid rgba(250, 204, 21, 0.9)',
        outlineOffset: -3,
      }
    : {}

  return (
    <div className="absolute left-0 top-0 h-[1080px] w-[1920px] origin-top-left bg-transparent" style={{ transform: previewScale ? `scale(${previewScale})` : undefined }}>
      {merged.tabelaGeral?.backgroundImage ? (
        <img
          src={merged.tabelaGeral.backgroundImage}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          style={{ opacity: backgroundOpacity }}
        />
      ) : null}

      {infoImage?.enabled !== false && infoImage?.url ? (
        <div
          className="absolute overflow-hidden"
          style={{
            left: Number(infoImage.x ?? 0),
            top: Number(infoImage.y ?? 0),
            width: Number(infoImage.w ?? 1920),
            height: Number(infoImage.h ?? 260),
            opacity: infoImageOpacity,
          }}
        >
          <img
            src={infoImage.url}
            alt=""
            className="h-full w-full"
            style={{ objectFit: infoImage.fit || 'contain' }}
          />
        </div>
      ) : null}

      {merged.brand?.enabled ? (
        <>
          {merged.brand?.imageEnabled !== false ? (
            <div
              className="absolute overflow-hidden uppercase"
              onPointerDown={selectBlock('image')}
              style={{
                left: Number(merged.brand?.x || 180),
                top: Number(merged.brand?.y || 54),
                width: Number(merged.brand?.w || 1560),
                height: Number(merged.brand?.h || 120),
                opacity: brandOpacity,
                transform: `scale(${brandScale})`,
                transformOrigin: 'top left',
                ...selectedStyle('image'),
              }}
            >
              {blockLabel('LOGO')}
              {merged.brand?.logoDataUrl ? (
              <img
                src={merged.brand.logoDataUrl}
                alt={merged.brand.name || 'Logo do campeonato'}
                className="absolute inset-0 h-full w-full"
                style={{ objectFit: merged.brand.objectFit || 'contain', objectPosition: merged.brand.objectPosition || 'center center' }}
              />
              ) : editable ? (
                <div className="flex h-full w-full items-center justify-center border border-white/20 bg-black/10 text-[24px] font-black tracking-[0.14em] text-white/70">
                  IMAGEM
                </div>
              ) : null}
            </div>
          ) : null}

          {merged.brand?.textEnabled !== false ? (
            <div
              className="absolute flex flex-col justify-center overflow-hidden uppercase"
              onPointerDown={selectBlock('text')}
              style={{
                left: Number(merged.brand?.textX ?? 420),
                top: Number(merged.brand?.textY ?? 66),
                width: Number(merged.brand?.textW ?? 1180),
                height: Number(merged.brand?.textH ?? 116),
                opacity: textOpacity,
                transform: `scale(${textScale})`,
                transformOrigin: 'top left',
                color: merged.brand?.textColor || '#ffffff',
                textAlign: merged.brand?.align || 'left',
                paddingLeft: 18,
                paddingRight: 18,
                textShadow: 'none',
                fontWeight: Number(merged.brand?.fontWeight || 900),
                fontStyle: merged.brand?.italic ? 'italic' : 'normal',
                ...selectedStyle('text'),
              }}
            >
              {blockLabel('TEXTO')}
              <div style={{ fontSize: Number(merged.brand?.nameSize || 54), lineHeight: 1 }}>{merged.brand?.name || ''}</div>
              <div className="mt-2 tracking-[0.28em]" style={{ fontSize: Number(merged.brand?.titleSize || 24), color: merged.theme?.accent || '#f6c453' }}>
                {merged.brand?.title || merged.title || 'TABELA GERAL'}
              </div>
            </div>
          ) : null}
        </>
      ) : null}

      <div
        className="absolute overflow-hidden uppercase"
        onPointerDown={selectBlock('table')}
        style={{
          left: Number(merged.layout?.x || 180),
          top: Number(merged.layout?.y || 140),
          width: Number(merged.layout?.w || 1560),
          color: merged.theme?.text || '#ffffff',
          fontSize: Number(merged.layout?.fontSize || 24),
          opacity,
          transform: `scale(${tableScale})`,
          transformOrigin: 'top left',
          filter: 'none',
          ...selectedStyle('table'),
        }}
      >
        {blockLabel('TABELA')}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: blockDirection === 'horizontal' ? `repeat(${blocks.length}, minmax(0, 1fr))` : '1fr',
            gap: blockGap,
          }}
        >
          {blocks.map((blockRows, blockIndex) => (
            <div key={blockIndex} style={{ width: blockWidth }}>
        <div
          className="grid items-center overflow-hidden font-black"
          style={{
            minHeight: Number(merged.layout?.headerHeight || 72),
            gridTemplateColumns,
            background: merged.theme?.primary || '#e60012',
            color: merged.theme?.headerText || '#101827',
            borderRadius: Number(merged.layout?.radius ?? 0),
            border: tableBorder,
            columnGap,
          }}
        >
          {visibleColumns.map((column) => (
            <div
              key={column}
              onPointerDown={selectColumn(column)}
              className={`${column === 'nome' ? 'text-left' : 'text-center'} text-[0.68em] tracking-[0.18em]`}
              style={{
                color: merged.columnStyles?.[column]?.text || undefined,
                background: merged.columnStyles?.[column]?.background || undefined,
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: column === 'nome' ? 'flex-start' : 'center',
                paddingLeft: cellPaddingX,
                paddingRight: cellPaddingX,
                ...selectedColumnStyle(column),
              }}
            >
              {column === 'nome' ? merged.title || 'TABELA GERAL' : tabelaGeralColumnLabels[column]}
            </div>
          ))}
        </div>

        <div className="mt-2" style={{ display: 'grid', gap: Number(merged.layout?.rowGap || 5) }}>
          {blockRows.map((row, rowIndex) => {
            const globalIndex = blockIndex * rowsPerBlock + rowIndex
            const rowStyle = merged.rowStyles?.[String(globalIndex + 1)] || {}
            const rowBackground = rowStyle.background || (globalIndex % 2 === 0 ? merged.theme?.rowBackground : merged.theme?.rowAltBackground || merged.theme?.rowBackground)
            const rowText = rowStyle.text || merged.theme?.text

            return (
              <div
                key={row.id}
                className="grid items-center overflow-hidden font-black"
                style={{
                  gridTemplateColumns,
                  height: Number(merged.layout?.rowHeight || 62),
                  background: rowBackground || 'rgba(248,250,252,0.94)',
                  backgroundSize: '100% 100%',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat',
                  borderRadius: Number(merged.layout?.radius ?? 0),
                  border: tableBorder,
                  columnGap,
                }}
              >
                {visibleColumns.map((column) => {
                  if (column === 'logo') {
                    if (row.empty) {
                      return (
                        <div
                          key={column}
                          onPointerDown={selectColumn(column)}
                          style={{
                            background: merged.columnStyles?.[column]?.background || undefined,
                            height: '100%',
                            paddingLeft: cellPaddingX,
                            paddingRight: cellPaddingX,
                            ...selectedColumnStyle(column),
                          }}
                        />
                      )
                    }

                    return (
                      <div
                        key={column}
                        onPointerDown={selectColumn(column)}
                        className="flex items-center justify-center"
                        style={{
                          background: merged.columnStyles?.[column]?.background || undefined,
                          color: merged.columnStyles?.[column]?.text || rowText || undefined,
                          height: '100%',
                          paddingLeft: cellPaddingX,
                          paddingRight: cellPaddingX,
                          ...selectedColumnStyle(column),
                        }}
                      >
                        <div
                          className="flex items-center justify-center overflow-hidden bg-white text-[0.78em] text-slate-900"
                          style={{
                            width: Number(merged.layout?.logoSize || 44),
                            height: Number(merged.layout?.logoSize || 44),
                            borderRadius: Math.max(0, Number(merged.layout?.radius ?? 0)),
                          }}
                        >
                          {row.logo ? (
                            <img src={row.logo} alt={row.nome} className="h-full w-full object-contain" />
                          ) : (
                            <Users size={Math.max(16, Number(merged.layout?.logoSize || 44) * 0.5)} />
                          )}
                        </div>
                      </div>
                    )
                  }

                  return (
                    <div
                      key={column}
                      className={`${column === 'nome' ? 'truncate text-left' : 'text-center'} ${column === 'pontos' ? 'font-black' : ''}`}
                      onPointerDown={selectColumn(column)}
                      style={{
                        color: merged.columnStyles?.[column]?.text || (column === 'pontos' && !row.empty ? merged.theme?.primary || '#e60012' : rowText || undefined),
                        background: merged.columnStyles?.[column]?.background || undefined,
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: column === 'nome' ? 'flex-start' : 'center',
                        paddingLeft: cellPaddingX,
                        paddingRight: cellPaddingX,
                        minWidth: 0,
                        ...selectedColumnStyle(column),
                      }}
                    >
                      {displayValue(row, column, globalIndex + 1)}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
