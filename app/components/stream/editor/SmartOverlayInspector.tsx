'use client'

import { useMemo, useState } from 'react'
import { ImageIcon, Layers, Palette, Rows3, Table2, Type } from 'lucide-react'
import type { StreamOverlayConfig } from '@/lib/streamOverlay'

type ControlKind = 'position' | 'size' | 'number' | 'color' | 'text' | 'select' | 'checkbox' | 'image'
type OverlayFamily = 'cards' | 'table' | 'card-table' | 'generic'

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

const tableTemplateIds = new Set(['tabela-geral', 'tabela-do-dia', 'tabela-da-queda', 'mvp-do-dia', 'mvp-da-queda', 'mvp-queda'])
const booyahsTemplateIds = new Set(['booyah', 'booyahs-do-dia'])
const mvpGeralTemplateIds = new Set(['mvp-geral'])

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
  if (templateId && mvpGeralTemplateIds.has(templateId)) return 'card-table'
  if (templateId && booyahsTemplateIds.has(templateId) && (config as any).booyahsDia) return 'cards'
  if (templateId && tableTemplateIds.has(templateId)) return 'table'
  if ((config as any).mvpGeral?.enabled) return 'card-table'
  if ((config as any).booyahsDia) return 'cards'
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

function buildTableLayers(config: StreamOverlayConfig): LayerDef[] {
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
        n('Coluna rank', 'columnWidths.rank', 0.52, { step: 0.05, min: 0, max: 5 }),
        n('Coluna logo', 'columnWidths.logo', 0.7, { step: 0.05, min: 0, max: 5 }),
        n('Coluna nome', 'columnWidths.nome', 2.6, { step: 0.05, min: 0, max: 8 }),
        n('Coluna variação', 'columnWidths.variacao', 0.72, { step: 0.05, min: 0, max: 5 }),
        n('Coluna quedas', 'columnWidths.quedas', 0.72, { step: 0.05, min: 0, max: 5 }),
        n('Coluna booyahs', 'columnWidths.booyahs', 0.72, { step: 0.05, min: 0, max: 5 }),
        n('Coluna abates', 'columnWidths.kills', 0.85, { step: 0.05, min: 0, max: 5 }),
        n('Coluna pontos', 'columnWidths.pontos', 0.92, { step: 0.05, min: 0, max: 5 }),
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
        n('Rank', 'columnWidths.rank', 0.52, { step: 0.05 }),
        n('Logo', 'columnWidths.logo', 0.7, { step: 0.05 }),
        n('Nome', 'columnWidths.nome', 2.6, { step: 0.05 }),
        n('Variação', 'columnWidths.variacao', 0.72, { step: 0.05 }),
        n('Quedas', 'columnWidths.quedas', 0.72, { step: 0.05 }),
        n('Abates', 'columnWidths.kills', 0.85, { step: 0.05 }),
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

function buildLayers(family: OverlayFamily, config: StreamOverlayConfig): LayerDef[] {
  if (family === 'cards') return buildBooyahsDiaLayers()
  if (family === 'card-table') return buildMvpGeralLayers()
  if (family === 'table') return buildTableLayers(config)
  return buildGenericLayers()
}

function familyLabel(family: OverlayFamily) {
  if (family === 'cards') return 'Cards'
  if (family === 'card-table') return 'Card + tabela'
  if (family === 'table') return 'Tabela'
  return 'Geral'
}

function ControlField({ control, config, onChange, onUploadImage }: { control: ControlDef; config: StreamOverlayConfig; onChange: (path: string, value: unknown) => void; onUploadImage?: (path: string, file: File) => Promise<void> }) {
  const value = getValue(config, control.path, control.fallback)

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
  const layers = useMemo(() => buildLayers(family, config), [family, config])
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
