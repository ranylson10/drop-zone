import { tabelaGeralOverlayDefinition } from './tabela-geral'
import { booyahsDiaOverlayDefinition } from './booyahs-dia'
import { mvpGeralOverlayDefinition } from './mvp-geral'
import type { StreamOverlayDefinition } from './types'

export const streamOverlayRegistry: Record<string, StreamOverlayDefinition> = {
  'tabela-geral': tabelaGeralOverlayDefinition,
  'mvp-geral': mvpGeralOverlayDefinition,
  booyah: booyahsDiaOverlayDefinition,
  'booyahs-do-dia': booyahsDiaOverlayDefinition,
}

export const streamOverlayDefinitions = Object.values(streamOverlayRegistry)

export function getStreamOverlayDefinition(templateId?: string | null) {
  const key = String(templateId || '').trim().toLowerCase()
  return streamOverlayRegistry[key] || null
}
