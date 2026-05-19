import { Users } from 'lucide-react'

export type StreamOverlayConfig = {
  title?: string
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
    shadow?: string
  }
  layout?: {
    x?: number
    y?: number
    w?: number
    rowHeight?: number
    rowGap?: number
    maxRows?: number
    radius?: number
    fontSize?: number
    headerHeight?: number
    logoSize?: number
    paddingX?: number
    opacity?: number
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
}

export const defaultTabelaGeralConfig: StreamOverlayConfig = {
  title: 'TABELA GERAL',
  theme: {
    primary: '#e60012',
    secondary: '#f6c453',
    background: 'rgba(5, 8, 18, 0.78)',
    rowBackground: 'rgba(248, 250, 252, 0.94)',
    rowAltBackground: 'rgba(226, 232, 240, 0.92)',
    text: '#09111f',
    headerText: '#ffffff',
    accent: '#f6c453',
    border: 'rgba(255, 255, 255, 0.18)',
    shadow: 'rgba(0, 0, 0, 0.42)',
  },
  layout: {
    x: 180,
    y: 140,
    w: 1560,
    rowHeight: 62,
    rowGap: 5,
    maxRows: 12,
    radius: 4,
    fontSize: 24,
    headerHeight: 72,
    logoSize: 44,
    paddingX: 18,
    opacity: 100,
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

const columnWidths: Record<string, string> = {
  rank: '76px',
  logo: '78px',
  nome: 'minmax(320px, 1fr)',
  tag: '112px',
  grupo: '96px',
  quedas: '92px',
  booyahs: '100px',
  kills: '104px',
  pontos: '126px',
}

export function mergeOverlayConfig(base?: StreamOverlayConfig | null, override?: StreamOverlayConfig | null): StreamOverlayConfig {
  return {
    ...(base || {}),
    ...(override || {}),
    theme: { ...(base?.theme || {}), ...(override?.theme || {}) },
    layout: { ...(base?.layout || {}), ...(override?.layout || {}) },
    columns: { ...(base?.columns || {}), ...(override?.columns || {}) },
    animation: { ...(base?.animation || {}), ...(override?.animation || {}) },
  }
}

export function getVisibleTabelaColumns(config: StreamOverlayConfig) {
  const columns = config.columns || defaultTabelaGeralConfig.columns || {}
  return Object.keys(tabelaGeralColumnLabels).filter((key) => columns[key] !== false)
}

export function buildTabelaGrid(columns: string[]) {
  return columns.map((key) => columnWidths[key] || '100px').join(' ')
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

export function TabelaGeralOverlay({
  config,
  rows,
  previewScale,
}: {
  config: StreamOverlayConfig
  rows: RankingRow[]
  previewScale?: number
}) {
  const merged = mergeOverlayConfig(defaultTabelaGeralConfig, config)
  const maxRows = Number(merged.layout?.maxRows || 12)
  const visibleColumns = getVisibleTabelaColumns(merged)
  const gridTemplateColumns = buildTabelaGrid(visibleColumns)
  const lista = (rows.length > 0 ? rows : sampleRankingRows(maxRows)).slice(0, maxRows)
  const opacity = Math.max(0, Math.min(100, Number(merged.layout?.opacity ?? 100))) / 100

  return (
    <div className="absolute left-0 top-0 h-[1080px] w-[1920px] origin-top-left bg-transparent" style={{ transform: previewScale ? `scale(${previewScale})` : undefined }}>
      <div
        className="absolute overflow-hidden uppercase"
        style={{
          left: Number(merged.layout?.x || 180),
          top: Number(merged.layout?.y || 140),
          width: Number(merged.layout?.w || 1560),
          color: merged.theme?.text || '#09111f',
          fontSize: Number(merged.layout?.fontSize || 24),
          opacity,
          filter: `drop-shadow(0 24px 32px ${merged.theme?.shadow || 'rgba(0,0,0,0.42)'})`,
        }}
      >
        <div
          className="grid items-center overflow-hidden font-black"
          style={{
            minHeight: Number(merged.layout?.headerHeight || 72),
            gridTemplateColumns,
            background: merged.theme?.primary || '#e60012',
            color: merged.theme?.headerText || '#ffffff',
            borderRadius: Number(merged.layout?.radius || 4),
            border: `1px solid ${merged.theme?.border || 'rgba(255,255,255,0.18)'}`,
            paddingLeft: Number(merged.layout?.paddingX || 18),
            paddingRight: Number(merged.layout?.paddingX || 18),
          }}
        >
          {visibleColumns.map((column) => (
            <div key={column} className={`${column === 'nome' ? 'text-left' : 'text-center'} text-[0.68em] tracking-[0.18em]`}>
              {column === 'nome' ? merged.title || 'TABELA GERAL' : tabelaGeralColumnLabels[column]}
            </div>
          ))}
        </div>

        <div className="mt-2" style={{ display: 'grid', gap: Number(merged.layout?.rowGap || 5) }}>
          {lista.map((row, index) => {
            const rowBackground = index % 2 === 0 ? merged.theme?.rowBackground : merged.theme?.rowAltBackground || merged.theme?.rowBackground

            return (
              <div
                key={row.id}
                className="grid items-center overflow-hidden font-black"
                style={{
                  gridTemplateColumns,
                  height: Number(merged.layout?.rowHeight || 62),
                  background: rowBackground || 'rgba(248,250,252,0.94)',
                  borderRadius: Number(merged.layout?.radius || 4),
                  border: `1px solid ${merged.theme?.border || 'rgba(255,255,255,0.18)'}`,
                  paddingLeft: Number(merged.layout?.paddingX || 18),
                  paddingRight: Number(merged.layout?.paddingX || 18),
                }}
              >
                {visibleColumns.map((column) => {
                  if (column === 'logo') {
                    return (
                      <div key={column} className="flex items-center justify-center">
                        <div
                          className="flex items-center justify-center overflow-hidden bg-white text-[0.78em] text-slate-900"
                          style={{
                            width: Number(merged.layout?.logoSize || 44),
                            height: Number(merged.layout?.logoSize || 44),
                            borderRadius: Math.max(2, Number(merged.layout?.radius || 4)),
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
                      style={{
                        color: column === 'pontos' ? merged.theme?.primary || '#e60012' : undefined,
                      }}
                    >
                      {displayValue(row, column, index + 1)}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
