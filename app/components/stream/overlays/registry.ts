import BooyahOverlay from './booyah/BooyahOverlay'
import CountdownOverlay from './countdown/CountdownOverlay'
import TabelaGeralOverlayView from './tabela-geral/TabelaGeralOverlayView'
import TabelaDiaOverlayView from './tabela-dia/TabelaDiaOverlayView'
import TabelaQuedaOverlayView from './tabela-queda/TabelaQuedaOverlayView'
import MvpGeralOverlayView from './mvp-geral/MvpGeralOverlayView'
import MvpDiaOverlayView from './mvp-dia/MvpDiaOverlayView'
import MvpQuedaOverlayView from './mvp-queda/MvpQuedaOverlayView'
import TelaEsperaOverlay from './tela-espera/TelaEsperaOverlay'
import AgradecimentosOverlay from './agradecimentos/AgradecimentosOverlay'
import type { StreamOverlayDefinition } from './types'

export const streamOverlayRegistry: Record<string, StreamOverlayDefinition> = {
  'tela-de-espera': {
    id: 'tela-de-espera',
    slug: 'tela-de-espera',
    nome: 'Tela de Espera',
    categoria: 'transmissao',
    Render: TelaEsperaOverlay,
  },
  booyah: {
    id: 'booyah',
    slug: 'booyah',
    nome: 'Booyah',
    categoria: 'transmissao',
    Render: BooyahOverlay,
  },
  countdown: {
    id: 'countdown',
    slug: 'countdown',
    nome: 'Countdown',
    categoria: 'transmissao',
    Render: CountdownOverlay,
  },
  'tabela-da-queda': {
    id: 'tabela-da-queda',
    slug: 'tabela-da-queda',
    nome: 'Tabela da Queda',
    categoria: 'estatisticas',
    Render: TabelaQuedaOverlayView,
  },
  'mvp-da-queda': {
    id: 'mvp-da-queda',
    slug: 'mvp-da-queda',
    nome: 'MVP da Queda',
    categoria: 'estatisticas',
    Render: MvpQuedaOverlayView,
  },
  'tabela-geral': {
    id: 'tabela-geral',
    slug: 'tabela-geral',
    nome: 'Tabela Geral',
    categoria: 'estatisticas',
    Render: TabelaGeralOverlayView,
  },
  'mvp-geral': {
    id: 'mvp-geral',
    slug: 'mvp-geral',
    nome: 'MVP Geral',
    categoria: 'estatisticas',
    Render: MvpGeralOverlayView,
  },
  'tabela-do-dia': {
    id: 'tabela-do-dia',
    slug: 'tabela-do-dia',
    nome: 'Tabela do Dia',
    categoria: 'estatisticas',
    Render: TabelaDiaOverlayView,
  },
  'mvp-do-dia': {
    id: 'mvp-do-dia',
    slug: 'mvp-do-dia',
    nome: 'MVP do Dia',
    categoria: 'estatisticas',
    Render: MvpDiaOverlayView,
  },
  agradecimentos: {
    id: 'agradecimentos',
    slug: 'agradecimentos',
    nome: 'Agradecimentos',
    categoria: 'transmissao',
    Render: AgradecimentosOverlay,
  },
}

export function getStreamOverlayDefinition(templateId?: string | null) {
  const key = String(templateId || '').trim().toLowerCase()
  return streamOverlayRegistry[key] || null
}
