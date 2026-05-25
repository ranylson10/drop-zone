import { tabelaGeralOverlayTemplate } from './tabela-geral/config'
import { booyahsDiaOverlayTemplate } from './booyahs-dia/config'
import { mvpGeralOverlayTemplate } from './mvp-geral/config'

const modularTemplates = [
  tabelaGeralOverlayTemplate,
  mvpGeralOverlayTemplate,
  booyahsDiaOverlayTemplate,
]

export const streamOverlayTemplateCatalog = modularTemplates

export const streamOverlayTemplateSlugs = streamOverlayTemplateCatalog.map((template) => template.slug)

export function getStreamOverlayTemplate(slugOrId?: string | null) {
  const value = String(slugOrId || '').trim().toLowerCase()
  return streamOverlayTemplateCatalog.find((template) => template.slug === value || template.id === value) || null
}
