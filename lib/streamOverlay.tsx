import { ArrowDown, ArrowUp, Minus, Users } from 'lucide-react'
import type { CSSProperties, PointerEvent } from 'react'

export type StreamOverlayBlock = 'image' | 'text' | 'table' | 'infoImage'

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
  booyahsDia?: {
    mode?: 'cards' | 'vertical-list'
    title?: string
    subtitle?: string
    artImageUrl?: string
    artX?: number
    artY?: number
    artW?: number
    artH?: number
    artSideX?: number
    artSideY?: number
    artSideW?: number
    artSideH?: number
    artFit?: 'contain' | 'cover' | 'fill'
    autoFit?: boolean
    columns?: number
    containerWidth?: number
    cardWidth?: number
    cardHeight?: number
    gap?: number
    x?: number
    y?: number
    logoSize?: number
    background?: string
    accent?: string
    text?: string
    mutedMapFilter?: string
    pendingMapFilter?: string
    mapBackgroundUrl?: string
    nameBandBackgroundUrl?: string
    statsBackground?: string
    statsBackgroundUrl?: string
    statsText?: string
    sideX?: number
    sideY?: number
    sideW?: number
    sideImageUrl?: string
    sideImageSize?: number
    sideTitleSmall?: string
    sideTitleMain?: string
    sideTitleSize?: number
    sideSmallSize?: number
    listX?: number
    listY?: number
    listW?: number
    listH?: number
    listRowHeight?: number
    listLogoSize?: number
  }
  mvpGeral?: {
    enabled?: boolean
    backgroundImage?: string
    backgroundOpacity?: number
    photoFit?: 'contain' | 'cover'
    tableTitle?: string
    tableMaxRows?: number
  }
  columns?: Record<string, boolean>
  animation?: {
    enter?: string
    duration?: number
    transition?: string
    lineByLine?: boolean
    lineDelay?: number
    testKey?: number
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
  variacao?: number | null
  mapa?: string | null
  mapaImagem?: string | null
  quedaNumero?: number | null
  concluida?: boolean
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
  columnsOrder: ['rank', 'logo', 'nome', 'tag', 'grupo', 'variacao', 'quedas', 'booyahs', 'kills', 'pontos'],
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
    variacao: true,
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
    id: 'tabela-geral',
    slug: 'tabela-geral',
    nome: 'Tabela geral',
    categoria: 'estatisticas',
    descricao: 'Classificacao geral acumulada.',
    config_padrao: defaultTabelaGeralConfig,
  },
  {
    id: 'mvp-geral',
    slug: 'mvp-geral',
    nome: 'MVP geral',
    categoria: 'estatisticas',
    descricao: 'Ranking geral de MVP/lideres de abates com foto do top 1 e tabela do top 2 ao 8.',
    config_padrao: mergeOverlayConfig(defaultTabelaGeralConfig, {
      title: 'LÍDERES DE ABATES',
      mvpGeral: {
        enabled: true,
        backgroundImage: '',
        backgroundOpacity: 100,
        photoFit: 'cover',
        tableTitle: 'LÍDERES DE ABATES',
        tableMaxRows: 8,
      },
      tabelaGeral: {
        mode: 'lateral',
        backgroundImage: '',
        backgroundOpacity: 100,
        infoImage: { enabled: true, url: '', x: 210, y: 86, w: 590, h: 650, opacity: 100, fit: 'cover' },
      },
      brand: { enabled: true, imageEnabled: false, textEnabled: true, textX: 210, textY: 734, textW: 590, textH: 190 },
      theme: { primary: '#ff5b00', rowBackground: '#82a51d', rowAltBackground: '#82a51d', text: '#ffffff', headerText: '#2a2a2a' },
      layout: { x: 900, y: 130, w: 800, maxRows: 8, blockCount: 1, rowsPerBlock: 7, rowHeight: 74, rowGap: 12, fontSize: 27, logoSize: 58 },
    }),
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
  variacao: 'VAR',
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
  variacao: 0.72,
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
    mvpGeral: { ...(base?.mvpGeral || {}), ...(override?.mvpGeral || {}) },
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
  const orderedColumns = [...savedOrder]
  defaultOrder.forEach((key) => {
    if (orderedColumns.includes(key)) return
    const defaultIndex = defaultOrder.indexOf(key)
    const insertAt = orderedColumns.findIndex((existingKey) => defaultOrder.indexOf(existingKey) > defaultIndex)
    if (insertAt === -1) orderedColumns.push(key)
    else orderedColumns.splice(insertAt, 0, key)
  })
  return orderedColumns.filter((key) => columns[key] !== false)
}

export function getTabelaBorder(config: StreamOverlayConfig) {
  const width = Math.max(0, Number(config.theme?.borderWidth ?? 0))
  const color = config.theme?.borderColor || config.theme?.border || 'transparent'
  return width > 0 ? `${width}px solid ${color}` : '0 solid transparent'
}

export function buildTabelaGrid(columns: string[], config?: StreamOverlayConfig) {
  const layout = config?.layout || {}
  const blockCount = Math.max(1, Math.min(4, Number(layout.blockCount || 1)))
  const blockGap = Number(layout.blockGap || 36)
  const blockDirection = layout.blockDirection || 'horizontal'
  const baseTableWidth = Number(layout.w || 1560)
  const blockWidth = blockDirection === 'horizontal'
    ? (baseTableWidth - blockGap * (blockCount - 1)) / blockCount
    : baseTableWidth
  const defaultTotal = columns.reduce((sum, key) => sum + Number(defaultTabelaGeralColumnWidths[key] ?? 1), 0) || 1
  const unit = Math.max(1, blockWidth / defaultTotal)

  return columns
    .map((key) => {
      const width = Number(config?.columnWidths?.[key] ?? defaultTabelaGeralColumnWidths[key] ?? 1)
      return `${Math.max(12, Math.round(Math.max(0.2, width) * unit))}px`
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
      variacao: index % 3 === 0 ? 2 : index % 3 === 1 ? -1 : 0,
    }
  }).sort((a, b) => b.pontos - a.pontos || b.booyahs - a.booyahs || b.kills - a.kills)
}

function displayValue(row: RankingRow, column: string, rank: number) {
  if (row.empty) return ''
  if (column === 'rank') return `${rank}`
  if (column === 'nome') return row.nome
  if (column === 'tag') return row.tag || '-'
  if (column === 'grupo') return row.grupo || '-'
  if (column === 'variacao') return row.variacao == null ? 0 : row.variacao
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
      variacao: null,
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


function formatKd(kills: number, quedas: number) {
  if (!quedas) return '0,0'
  return (kills / Math.max(1, quedas)).toFixed(1).replace('.', ',')
}

function variationMeta(value?: number | null) {
  const variation = Number(value || 0)
  const color = variation > 0 ? '#18a63f' : variation < 0 ? '#b91c1c' : '#f97316'
  const label = variation > 0 ? `+${variation}` : `${variation}`
  const Icon = variation > 0 ? ArrowUp : variation < 0 ? ArrowDown : Minus
  return { variation, color, label, Icon }
}

export function MvpGeralOverlay({
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
  const baseRows = rows.length > 0 ? rows : sampleRankingRows(8)
  const ranking = [...baseRows]
    .filter((row) => !row.empty)
    .sort((a, b) => b.kills - a.kills || b.pontos - a.pontos || b.quedas - a.quedas)
  const top = ranking[0] || sampleRankingRows(1)[0]
  const tableRows = fillRows(ranking.slice(1, Number(config.mvpGeral?.tableMaxRows || 8)), 7)
  const photo = config.tabelaGeral?.infoImage
  const photoOpacity = Math.max(0, Math.min(100, Number(photo?.opacity ?? 100))) / 100
  const statsOpacity = Math.max(0, Math.min(100, Number(config.brand?.textOpacity ?? 100))) / 100
  const tableOpacity = Math.max(0, Math.min(100, Number(config.layout?.opacity ?? 100))) / 100
  const tableScale = Math.max(10, Number(config.layout?.scale || 100)) / 100
  const statsScale = Math.max(10, Number(config.brand?.textScale || 100)) / 100
  const topKills = Number(top.kills || 0)
  const topQuedas = Number(top.quedas || 0)
  const transitionName = config.animation?.transition || config.animation?.enter || 'fade'
  const transitionDuration = Math.max(100, Number(config.animation?.duration || 650))
  const animationClassName = `stream-transition-${transitionName}`
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
    ? { outline: '3px solid rgba(250, 204, 21, 0.9)', outlineOffset: -3 }
    : {}
  const backgroundOpacity = Math.max(0, Math.min(100, Number(config.mvpGeral?.backgroundOpacity ?? config.tabelaGeral?.backgroundOpacity ?? 100))) / 100
  const tableColumns = ['rank', 'logo', 'nome', 'quedashort', 'kd', 'kills', 'variacao']
  const gridTemplateColumns = '82px 80px 1.75fr 72px 90px 94px 90px'
  const themePrimary = config.theme?.primary || '#f97316'
  const green = config.theme?.rowBackground || '#83a51d'
  const textColor = config.theme?.text || '#ffffff'

  return (
    <div className="absolute left-0 top-0 h-[1080px] w-[1920px] origin-top-left overflow-hidden bg-transparent" style={{ transform: previewScale ? `scale(${previewScale})` : undefined }}>
      <style>{`
        @keyframes stream-transition-fade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes stream-transition-slide-up { from { opacity: 0; transform: translateY(1080px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes stream-transition-slide-down { from { opacity: 0; transform: translateY(-1080px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes stream-transition-slide-left { from { opacity: 0; transform: translateX(1920px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes stream-transition-slide-right { from { opacity: 0; transform: translateX(-1920px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes stream-transition-zoom { from { opacity: 0; transform: scale(.72); } to { opacity: 1; transform: scale(1); } }
        @keyframes stream-transition-flip { from { opacity: 0; transform: rotateX(72deg); } to { opacity: 1; transform: rotateX(0); } }
        @keyframes stream-transition-wipe { from { opacity: 0; clip-path: inset(0 100% 0 0); } to { opacity: 1; clip-path: inset(0 0 0 0); } }
        @keyframes stream-transition-blur { from { opacity: 0; filter: blur(14px); } to { opacity: 1; filter: blur(0); } }
        @keyframes stream-transition-elastic { 0% { opacity: 0; transform: scale(.78); } 68% { opacity: 1; transform: scale(1.05); } 100% { opacity: 1; transform: scale(1); } }
      `}</style>
      {config.mvpGeral?.backgroundImage || config.tabelaGeral?.backgroundImage ? (
        <img
          src={config.mvpGeral?.backgroundImage || config.tabelaGeral?.backgroundImage}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          style={{ opacity: backgroundOpacity }}
        />
      ) : (
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(135deg, #f4f1df 0%, #e9ecd9 46%, #dfe8d4 100%)',
          }}
        />
      )}
      <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle at 20% 10%, rgba(255,255,255,.75), transparent 26%), radial-gradient(circle at 85% 80%, rgba(132,165,31,.25), transparent 30%)' }} />
      <div className="absolute inset-3 border-[10px]" style={{ borderColor: themePrimary }} />
      <div className="absolute left-0 top-0 h-[250px] w-[270px] opacity-30" style={{ background: `repeating-linear-gradient(135deg, ${themePrimary} 0 12px, transparent 12px 28px)` }} />
      <div className="absolute bottom-0 right-0 h-[240px] w-[340px] opacity-25" style={{ background: `repeating-linear-gradient(135deg, transparent 0 16px, ${green} 16px 32px)` }} />

      <div
        className="absolute overflow-hidden bg-white"
        onPointerDown={selectBlock('infoImage')}
        style={{
          left: Number(photo?.x ?? 210),
          top: Number(photo?.y ?? 86),
          width: Number(photo?.w ?? 590),
          height: Number(photo?.h ?? 650),
          opacity: photoOpacity,
          border: `4px solid ${themePrimary}`,
          animation: `${animationClassName} ${transitionDuration}ms ease both`,
          ...selectedStyle('infoImage'),
        }}
      >
        {blockLabel('FOTO MVP')}
        {photo?.url ? (
          <img src={photo.url} alt={top.nome} className="h-full w-full" style={{ objectFit: config.mvpGeral?.photoFit || photo.fit || 'cover' }} />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-zinc-200 text-[34px] font-black uppercase tracking-[0.18em] text-zinc-500">Foto MVP</div>
        )}
      </div>

      <div
        className="absolute overflow-hidden uppercase"
        onPointerDown={selectBlock('text')}
        style={{
          left: Number(config.brand?.textX ?? 210),
          top: Number(config.brand?.textY ?? 734),
          width: Number(config.brand?.textW ?? 590),
          height: Number(config.brand?.textH ?? 190),
          opacity: statsOpacity,
          transform: `scale(${statsScale})`,
          transformOrigin: 'top left',
          animation: `${animationClassName} ${transitionDuration}ms ease both`,
          ...selectedStyle('text'),
        }}
      >
        {blockLabel('INFO MVP')}
        <div className="flex h-full flex-col" style={{ background: green, color: textColor }}>
          <div className="flex flex-1 items-center gap-5 px-8">
            <div className="flex h-88 w-110 items-center justify-center bg-white p-2" style={{ width: 110, height: 88 }}>
              {top.logo ? <img src={top.logo} alt={top.nome} className="h-full w-full object-contain" /> : <Users size={46} className="text-zinc-900" />}
            </div>
            <div className="min-w-0 flex-1 truncate text-[34px] font-black leading-none">{top.nome}</div>
          </div>
          <div className="grid h-[68px] grid-cols-3 items-center px-8 text-center text-[28px] font-black">
            <div>{topKills} ABT</div>
            <div>{formatKd(topKills, topQuedas)} K.D</div>
            <div>{topQuedas} QD</div>
          </div>
        </div>
      </div>

      <div
        className="absolute uppercase"
        onPointerDown={selectBlock('table')}
        style={{
          left: Number(config.layout?.x ?? 900),
          top: Number(config.layout?.y ?? 130),
          width: Number(config.layout?.w ?? 800),
          opacity: tableOpacity,
          transform: `scale(${tableScale})`,
          transformOrigin: 'top left',
          animation: `${animationClassName} ${transitionDuration}ms ease both`,
          ...selectedStyle('table'),
        }}
      >
        <div className="mb-10 text-[74px] font-black leading-none tracking-[-0.04em] text-zinc-800">
          {config.mvpGeral?.tableTitle || config.title || 'LÍDERES DE ABATES'}
        </div>
        <div className="mb-5 grid items-center pr-[90px] text-center text-[25px] font-black text-zinc-800" style={{ gridTemplateColumns }}>
          <div />
          <div />
          <div />
          <div>QD</div>
          <div>K.D</div>
          <div>ABT</div>
          <div />
        </div>
        <div className="grid gap-3">
          {tableRows.map((row, index) => {
            const rank = index + 2
            const kills = Number(row.kills || 0)
            const quedas = Number(row.quedas || 0)
            const { color, label, Icon } = variationMeta(row.variacao)
            return (
              <div
                key={row.id}
                className="grid h-[74px] items-center overflow-hidden border-2 bg-white text-[27px] font-black"
                style={{ gridTemplateColumns, borderColor: themePrimary }}
              >
                {tableColumns.map((column) => {
                  if (column === 'rank') {
                    return <div key={column} onPointerDown={selectColumn(column)} className="text-center text-zinc-900" style={selectedColumnStyle(column)}>{row.empty ? '' : String(rank).padStart(2, '0')}</div>
                  }
                  if (column === 'logo') {
                    return <div key={column} onPointerDown={selectColumn(column)} className="flex h-full items-center justify-center bg-white p-2" style={selectedColumnStyle(column)}>{!row.empty && row.logo ? <img src={row.logo} alt={row.nome} className="h-full w-full object-contain" /> : !row.empty ? <Users size={34} className="text-zinc-900" /> : null}</div>
                  }
                  if (column === 'nome') {
                    return <div key={column} onPointerDown={selectColumn(column)} className="flex h-full min-w-0 items-center truncate px-5 text-white" style={{ background: green, ...selectedColumnStyle(column) }}>{row.empty ? '' : row.nome}</div>
                  }
                  if (column === 'quedashort') {
                    return <div key={column} onPointerDown={selectColumn('quedas')} className="flex h-full items-center justify-center text-white" style={{ background: green, ...selectedColumnStyle('quedas') }}>{row.empty ? '' : quedas}</div>
                  }
                  if (column === 'kd') {
                    return <div key={column} onPointerDown={selectColumn(column)} className="flex h-full items-center justify-center border-l border-white/70 text-white" style={{ background: green, ...selectedColumnStyle(column) }}>{row.empty ? '' : formatKd(kills, quedas)}</div>
                  }
                  if (column === 'kills') {
                    return <div key={column} onPointerDown={selectColumn(column)} className="flex h-full items-center justify-center border-l border-white/70 text-white" style={{ background: green, ...selectedColumnStyle(column) }}>{row.empty ? '' : kills}</div>
                  }
                  return <div key={column} onPointerDown={selectColumn('variacao')} className="flex h-full items-center justify-center gap-3 bg-white text-[22px] text-zinc-700" style={selectedColumnStyle('variacao')}>{!row.empty ? <><span>{label}</span><Icon size={24} fill={color} color={color} strokeWidth={4} /></> : null}</div>
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
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
  if (config.mvpGeral?.enabled) {
    return (
      <MvpGeralOverlay
        config={config}
        rows={rows}
        previewScale={previewScale}
        editable={editable}
        selectedBlock={selectedBlock}
        selectedColumn={selectedColumn}
        onSelectBlock={onSelectBlock}
        onSelectColumn={onSelectColumn}
        onStartDrag={onStartDrag}
      />
    )
  }

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
  const transitionName = merged.animation?.transition || merged.animation?.enter || 'fade'
  const transitionDuration = Math.max(100, Number(merged.animation?.duration || 650))
  const lineByLine = Boolean(merged.animation?.lineByLine)
  const lineDelay = Math.max(0, Number(merged.animation?.lineDelay || 70))
  const animationClassName = `stream-transition-${transitionName}`
  const containerAnimationStyle: CSSProperties = !lineByLine
    ? { animation: `${animationClassName} ${transitionDuration}ms ease both` }
    : {}
  const rowAnimationStyle = (index: number): CSSProperties => lineByLine
    ? { animation: `${animationClassName} ${transitionDuration}ms cubic-bezier(0.22, 1, 0.36, 1) both`, animationDelay: `${index * lineDelay}ms` }
    : {}
  const topImageAnimationStyle: CSSProperties = {
    animation: `${animationClassName} ${transitionDuration}ms cubic-bezier(0.22, 1, 0.36, 1) both`,
  }
  const headerAnimationStyle: CSSProperties = lineByLine
    ? { animation: `${animationClassName} ${transitionDuration}ms cubic-bezier(0.22, 1, 0.36, 1) both`, animationDelay: `${lineDelay}ms` }
    : {}
  const headerLabel = (column: string) => {
    if (!['variacao', 'quedas', 'booyahs', 'kills', 'pontos'].includes(column)) return ''
    return tabelaGeralColumnLabels[column]
  }

  return (
    <div className="absolute left-0 top-0 h-[1080px] w-[1920px] origin-top-left bg-transparent" style={{ transform: previewScale ? `scale(${previewScale})` : undefined }}>
      <style>{`
        @keyframes stream-transition-fade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes stream-transition-slide-up { from { opacity: 0; transform: translateY(1080px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes stream-transition-slide-down { from { opacity: 0; transform: translateY(-1080px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes stream-transition-slide-left { from { opacity: 0; transform: translateX(1920px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes stream-transition-slide-right { from { opacity: 0; transform: translateX(-1920px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes stream-transition-zoom { from { opacity: 0; transform: scale(.72); } to { opacity: 1; transform: scale(1); } }
        @keyframes stream-transition-flip { from { opacity: 0; transform: rotateX(72deg); } to { opacity: 1; transform: rotateX(0); } }
        @keyframes stream-transition-wipe { from { opacity: 0; clip-path: inset(0 100% 0 0); } to { opacity: 1; clip-path: inset(0 0 0 0); } }
        @keyframes stream-transition-blur { from { opacity: 0; filter: blur(14px); } to { opacity: 1; filter: blur(0); } }
        @keyframes stream-transition-elastic { 0% { opacity: 0; transform: scale(.78); } 68% { opacity: 1; transform: scale(1.05); } 100% { opacity: 1; transform: scale(1); } }
      `}</style>
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
          key={`info-${merged.animation?.testKey || 0}`}
          className="absolute overflow-hidden"
          onPointerDown={selectBlock('infoImage')}
          style={{
            left: Number(infoImage.x ?? 0),
            top: Number(infoImage.y ?? 0),
            width: Number(infoImage.w ?? 1920),
            height: Number(infoImage.h ?? 260),
            opacity: infoImageOpacity,
            ...topImageAnimationStyle,
            ...selectedStyle('infoImage'),
          }}
        >
          {blockLabel('IMAGEM')}
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
        key={`table-${merged.animation?.testKey || 0}`}
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
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: blockDirection === 'horizontal' ? `repeat(${blocks.length}, minmax(0, 1fr))` : '1fr',
            gap: blockGap,
            ...containerAnimationStyle,
          }}
        >
          {blocks.map((blockRows, blockIndex) => (
            <div key={blockIndex} style={{ width: blockWidth, minWidth: blockWidth }}>
        <div
          className="grid items-center overflow-hidden font-black"
          style={{
            width: blockWidth,
            minWidth: blockWidth,
            minHeight: Number(merged.layout?.headerHeight || 72),
            gridTemplateColumns,
            background: merged.theme?.primary || '#e60012',
            color: merged.theme?.headerText || '#101827',
            borderRadius: Number(merged.layout?.radius ?? 0),
            border: tableBorder,
            columnGap,
            ...headerAnimationStyle,
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
              {headerLabel(column)}
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
                  width: blockWidth,
                  minWidth: blockWidth,
                  gridTemplateColumns,
                  height: Number(merged.layout?.rowHeight || 62),
                  overflow: 'visible',
                  background: rowBackground || 'rgba(248,250,252,0.94)',
                  backgroundSize: `${blockWidth}px 100%`,
                  backgroundPosition: 'left center',
                  backgroundRepeat: 'no-repeat',
                  borderRadius: Number(merged.layout?.radius ?? 0),
                  border: tableBorder,
                  columnGap,
                  ...rowAnimationStyle(globalIndex),
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
                        className="relative flex items-center justify-center"
                        style={{
                          background: merged.columnStyles?.[column]?.background || undefined,
                          color: merged.columnStyles?.[column]?.text || rowText || undefined,
                          height: '100%',
                          minHeight: 0,
                          paddingLeft: cellPaddingX,
                          paddingRight: cellPaddingX,
                          overflow: 'visible',
                          ...selectedColumnStyle(column),
                        }}
                      >
                        <div
                          className="absolute flex items-center justify-center overflow-hidden text-[0.78em] text-slate-900"
                          style={{
                            left: '50%',
                            top: '50%',
                            width: Number(merged.layout?.logoSize || 44),
                            height: Number(merged.layout?.logoSize || 44),
                            transform: 'translate(-50%, -50%)',
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

                  if (column === 'variacao') {
                    const variation = Number(row.variacao || 0)
                    const color = variation > 0 ? '#22c55e' : variation < 0 ? '#ef4444' : '#facc15'
                    const label = variation > 0 ? `+${variation}` : `${variation}`
                    const VariationIcon = variation > 0 ? ArrowUp : variation < 0 ? ArrowDown : Minus

                    return (
                      <div
                        key={column}
                        className="text-center"
                        onPointerDown={selectColumn(column)}
                        style={{
                          color: merged.columnStyles?.[column]?.text || color,
                          background: merged.columnStyles?.[column]?.background || undefined,
                          height: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 8,
                          paddingLeft: cellPaddingX,
                          paddingRight: cellPaddingX,
                          minWidth: 0,
                          ...selectedColumnStyle(column),
                        }}
                      >
                        {!row.empty ? (
                          <>
                            <VariationIcon size={Math.max(12, Number(merged.layout?.fontSize || 24) * 0.72)} strokeWidth={4} />
                            <span>{label}</span>
                          </>
                        ) : null}
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
