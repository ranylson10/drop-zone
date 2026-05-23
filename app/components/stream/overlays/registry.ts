import BooyahOverlay from './booyah/BooyahOverlay'
import CountdownOverlay from './countdown/CountdownOverlay'
import TabelaDiaOverlayView from './tabela-dia/TabelaDiaOverlayView'
import TabelaQuedaOverlayView from './tabela-queda/TabelaQuedaOverlayView'
import MvpGeralOverlayView from './mvp-geral/MvpGeralOverlayView'
import MvpDiaOverlayView from './mvp-dia/MvpDiaOverlayView'
import MvpQuedaOverlayView from './mvp-queda/MvpQuedaOverlayView'
import AgradecimentosOverlay from './agradecimentos/AgradecimentosOverlay'
import { streamOverlayTemplateCatalog } from './catalog'
import { tabelaGeralOverlayDefinition } from './tabela-geral'
import type { StreamOverlayDefinition } from './types'

const fixedTemplatesById = new Map(streamOverlayTemplateCatalog.map((template) => [template.id, template]))

function withTemplateMeta(definition: Omit<StreamOverlayDefinition, 'descricao' | 'config_padrao'>): StreamOverlayDefinition {
  const template = fixedTemplatesById.get(definition.id)

  return {
    ...definition,
    descricao: template?.descricao,
    config_padrao: template?.config_padrao,
  }
}

export const streamOverlayRegistry: Record<string, StreamOverlayDefinition> = {
  booyah: withTemplateMeta({
    id: 'booyah',
    slug: 'booyah',
    nome: 'Booyah',
    categoria: 'transmissao',
    Render: BooyahOverlay,
  }),
  countdown: withTemplateMeta({
    id: 'countdown',
    slug: 'countdown',
    nome: 'Countdown',
    categoria: 'transmissao',
    Render: CountdownOverlay,
  }),
  'tabela-da-queda': withTemplateMeta({
    id: 'tabela-da-queda',
    slug: 'tabela-da-queda',
    nome: 'Tabela da Queda',
    categoria: 'estatisticas',
    Render: TabelaQuedaOverlayView,
  }),
  'mvp-da-queda': withTemplateMeta({
    id: 'mvp-da-queda',
    slug: 'mvp-da-queda',
    nome: 'MVP da Queda',
    categoria: 'estatisticas',
    Render: MvpQuedaOverlayView,
  }),
  'tabela-geral': tabelaGeralOverlayDefinition,
  'mvp-geral': withTemplateMeta({
    id: 'mvp-geral',
    slug: 'mvp-geral',
    nome: 'MVP Geral',
    categoria: 'estatisticas',
    Render: MvpGeralOverlayView,
  }),
  'tabela-do-dia': withTemplateMeta({
    id: 'tabela-do-dia',
    slug: 'tabela-do-dia',
    nome: 'Tabela do Dia',
    categoria: 'estatisticas',
    Render: TabelaDiaOverlayView,
  }),
  'mvp-do-dia': withTemplateMeta({
    id: 'mvp-do-dia',
    slug: 'mvp-do-dia',
    nome: 'MVP do Dia',
    categoria: 'estatisticas',
    Render: MvpDiaOverlayView,
  }),
  agradecimentos: withTemplateMeta({
    id: 'agradecimentos',
    slug: 'agradecimentos',
    nome: 'Agradecimentos',
    categoria: 'transmissao',
    Render: AgradecimentosOverlay,
  }),
}

export const streamOverlayDefinitions = Object.values(streamOverlayRegistry)

export function getStreamOverlayDefinition(templateId?: string | null) {
  const key = String(templateId || '').trim().toLowerCase()
  return streamOverlayRegistry[key] || null
}
