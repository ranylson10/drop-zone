import AgradecimentosOverlay from './agradecimentos/AgradecimentosOverlay'
import BooyahOverlay from './booyah/BooyahOverlay'
import CountdownOverlay from './countdown/CountdownOverlay'
import MvpDiaOverlayView from './mvp-dia/MvpDiaOverlayView'
import { mvpGeralOverlayDefinition } from './mvp-geral'
import { mvpquedaOverlayDefinition } from './mvp-queda'
import { tabelaGeralOverlayDefinition } from './tabela-geral'
import TabelaDiaOverlayView from './tabela-dia/TabelaDiaOverlayView'
import { tabelaquedaOverlayDefinition } from './tabela-queda'
import TelaEsperaOverlay from './tela-espera/TelaEsperaOverlay'
import { booyahsDiaOverlayDefinition } from './booyahs-dia'
import type { StreamOverlayDefinition } from './types'

function aliasDefinition(base: StreamOverlayDefinition, id: string, slug = id, nome = base.nome): StreamOverlayDefinition {
  return {
    ...base,
    id,
    slug,
    nome,
  }
}

const tabelaDiaOverlayDefinition: StreamOverlayDefinition = {
  ...aliasDefinition(tabelaGeralOverlayDefinition, 'tabela-dia', 'tabela-dia', 'Tabela do dia'),
  Render: TabelaDiaOverlayView,
}

const tabelaDoDiaOverlayDefinition: StreamOverlayDefinition = {
  ...aliasDefinition(tabelaDiaOverlayDefinition, 'tabela-do-dia', 'tabela-do-dia', 'Tabela do dia'),
  Render: TabelaDiaOverlayView,
}

const mvpDiaOverlayDefinition: StreamOverlayDefinition = {
  ...aliasDefinition(tabelaGeralOverlayDefinition, 'mvp-dia', 'mvp-dia', 'MVP do dia'),
  categoria: 'estatisticas',
  descricao: 'Ranking MVP do dia.',
  Render: MvpDiaOverlayView,
}

const mvpDoDiaOverlayDefinition: StreamOverlayDefinition = {
  ...aliasDefinition(mvpDiaOverlayDefinition, 'mvp-do-dia', 'mvp-do-dia', 'MVP do dia'),
  Render: MvpDiaOverlayView,
}

const countdownOverlayDefinition: StreamOverlayDefinition = {
  id: 'countdown',
  slug: 'countdown',
  nome: 'Countdown',
  categoria: 'transmissao',
  descricao: 'Contagem regressiva para a live.',
  config_padrao: tabelaGeralOverlayDefinition.config_padrao,
  Render: CountdownOverlay,
}

const agradecimentosOverlayDefinition: StreamOverlayDefinition = {
  id: 'agradecimentos',
  slug: 'agradecimentos',
  nome: 'Agradecimentos',
  categoria: 'transmissao',
  descricao: 'Tela final de agradecimentos.',
  config_padrao: tabelaGeralOverlayDefinition.config_padrao,
  Render: AgradecimentosOverlay,
}

const telaEsperaOverlayDefinition: StreamOverlayDefinition = {
  id: 'tela-espera',
  slug: 'tela-espera',
  nome: 'Tela de espera',
  categoria: 'transmissao',
  descricao: 'Tela de espera com equipes.',
  config_padrao: tabelaGeralOverlayDefinition.config_padrao,
  Render: TelaEsperaOverlay,
}

const booyahOverlayDefinition: StreamOverlayDefinition = {
  id: 'booyah',
  slug: 'booyah',
  nome: 'Booyah',
  categoria: 'transmissao',
  descricao: 'Chamada animada da equipe vencedora.',
  config_padrao: tabelaGeralOverlayDefinition.config_padrao,
  Render: BooyahOverlay,
}

const booyahsDiaDefinition = aliasDefinition(booyahsDiaOverlayDefinition, 'booyahs-dia', 'booyahs-dia', 'Booyahs do dia')
const booyahsDoDiaDefinition = aliasDefinition(booyahsDiaOverlayDefinition, 'booyahs-do-dia', 'booyahs-do-dia', 'Booyahs do dia')
const tabelaQuedaDefinition = aliasDefinition(tabelaquedaOverlayDefinition, 'tabela-queda', 'tabela-queda', 'Tabela da queda')
const tabelaDaQuedaOverlayDefinition = aliasDefinition(tabelaquedaOverlayDefinition, 'tabela-da-queda', 'tabela-da-queda', 'Tabela da queda')
const mvpQuedaDefinition = aliasDefinition(mvpquedaOverlayDefinition, 'mvp-queda', 'mvp-queda', 'MVP da queda')
const mvpDaQuedaOverlayDefinition = aliasDefinition(mvpquedaOverlayDefinition, 'mvp-da-queda', 'mvp-da-queda', 'MVP da queda')

export const streamOverlayRegistry: Record<string, StreamOverlayDefinition> = {
  'tabela-geral': tabelaGeralOverlayDefinition,
  'tabela-dia': tabelaDiaOverlayDefinition,
  'tabela-do-dia': tabelaDoDiaOverlayDefinition,
  'tabela-queda': tabelaQuedaDefinition,
  'tabela-da-queda': tabelaDaQuedaOverlayDefinition,

  'mvp-geral': mvpGeralOverlayDefinition,
  'mvp-dia': mvpDiaOverlayDefinition,
  'mvp-do-dia': mvpDoDiaOverlayDefinition,
  'mvp-queda': mvpQuedaDefinition,
  'mvp-da-queda': mvpDaQuedaOverlayDefinition,

  countdown: countdownOverlayDefinition,
  agradecimentos: agradecimentosOverlayDefinition,
  'tela-espera': telaEsperaOverlayDefinition,
  'tela-de-espera': telaEsperaOverlayDefinition,

  booyah: booyahOverlayDefinition,
  'booyahs-dia': booyahsDiaDefinition,
  'booyahs-do-dia': booyahsDoDiaDefinition,
}

export const streamOverlayDefinitions = Array.from(new Map(Object.values(streamOverlayRegistry).map((definition) => [definition.id, definition])).values())

export function getStreamOverlayDefinition(templateId?: string | null, config?: Record<string, any> | null) {
  const key = String(templateId || '').trim().toLowerCase()

  // Compatibilidade com overlays antigas: algumas foram salvas como "booyah",
  // mas usam a config nova de Booyahs do Dia.
  if (key === 'booyah' && config?.booyahsDia) return booyahsDiaDefinition

  return streamOverlayRegistry[key] || null
}
