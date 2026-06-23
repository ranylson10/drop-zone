import { tabelaGeralOverlayTemplate } from './tabela-geral/config'
import { booyahsDiaOverlayTemplate } from './booyahs-dia/config'
import { mvpGeralOverlayTemplate } from './mvp-geral/config'
import { tabelaQuedaOverlayTemplate } from './tabela-queda/config'
import { mvpQuedaOverlayTemplate } from './mvp-queda/config'
import type { FixedStreamOverlayTemplate } from '@/lib/streamOverlay'

function templateAlias(base: FixedStreamOverlayTemplate, id: string, slug = id, nome = base.nome, descricao = base.descricao): FixedStreamOverlayTemplate {
  return {
    ...base,
    id,
    slug,
    nome,
    descricao,
  }
}

const tabelaDiaTemplate = templateAlias(tabelaGeralOverlayTemplate, 'tabela-dia', 'tabela-dia', 'Tabela do dia', 'Tabela consolidada do dia.')
const tabelaDoDiaTemplate = templateAlias(tabelaDiaTemplate, 'tabela-do-dia', 'tabela-do-dia', 'Tabela do dia', 'Tabela consolidada do dia.')
const tabelaQuedaTemplate = templateAlias(tabelaQuedaOverlayTemplate, 'tabela-queda', 'tabela-queda', 'Tabela da queda', 'Tabela de pontuacao da queda selecionada.')
const tabelaDaQuedaTemplate = templateAlias(tabelaQuedaOverlayTemplate, 'tabela-da-queda', 'tabela-da-queda', 'Tabela da queda', 'Tabela de pontuacao da queda selecionada.')
const mvpDiaTemplate = templateAlias(mvpQuedaOverlayTemplate, 'mvp-dia', 'mvp-dia', 'MVP do dia', 'Ranking MVP do dia.')
const mvpDoDiaTemplate = templateAlias(mvpDiaTemplate, 'mvp-do-dia', 'mvp-do-dia', 'MVP do dia', 'Ranking MVP do dia.')
const mvpDaQuedaTemplate = templateAlias(mvpQuedaOverlayTemplate, 'mvp-da-queda', 'mvp-da-queda', 'MVP da queda', 'MVP da queda atual.')
const countdownTemplate = templateAlias(tabelaGeralOverlayTemplate, 'countdown', 'countdown', 'Countdown', 'Contagem regressiva para a live.')
const agradecimentosTemplate = templateAlias(tabelaGeralOverlayTemplate, 'agradecimentos', 'agradecimentos', 'Agradecimentos', 'Tela final de agradecimentos.')
const telaEsperaTemplate = templateAlias(tabelaGeralOverlayTemplate, 'tela-espera', 'tela-espera', 'Tela de espera', 'Tela de espera com equipes.')
const booyahTemplate = templateAlias(tabelaGeralOverlayTemplate, 'booyah', 'booyah', 'Booyah', 'Chamada animada da equipe vencedora.')
const booyahsDiaTemplate = templateAlias(booyahsDiaOverlayTemplate, 'booyahs-dia', 'booyahs-dia', 'Booyahs do dia', 'Cards com vencedores por queda.')
const booyahsDoDiaTemplate = templateAlias(booyahsDiaOverlayTemplate, 'booyahs-do-dia', 'booyahs-do-dia', 'Booyahs do dia', 'Cards com vencedores por queda.')

const modularTemplates: FixedStreamOverlayTemplate[] = [
  agradecimentosTemplate,
  booyahTemplate,
  booyahsDiaTemplate,
  booyahsDoDiaTemplate,
  countdownTemplate,
  mvpDiaTemplate,
  mvpDoDiaTemplate,
  mvpGeralOverlayTemplate,
  mvpQuedaOverlayTemplate,
  mvpDaQuedaTemplate,
  tabelaDiaTemplate,
  tabelaDoDiaTemplate,
  tabelaGeralOverlayTemplate,
  tabelaQuedaTemplate,
  tabelaDaQuedaTemplate,
  telaEsperaTemplate,
]

export const streamOverlayTemplateCatalog = Array.from(new Map(modularTemplates.map((template) => [template.id, template])).values())

export const streamOverlayTemplateSlugs = streamOverlayTemplateCatalog.map((template) => template.slug)

export function getStreamOverlayTemplate(slugOrId?: string | null) {
  const value = String(slugOrId || '').trim().toLowerCase()
  return streamOverlayTemplateCatalog.find((template) => template.slug === value || template.id === value) || null
}
