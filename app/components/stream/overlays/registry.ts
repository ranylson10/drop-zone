import { tabelaGeralOverlayDefinition } from './tabela-geral'
import { booyahsDiaOverlayDefinition } from './booyahs-dia'
import { mvpgeralOverlayDefinition } from './mvp-geral'
import { mvpquedaOverlayDefinition } from './mvp-queda'
import { tabelaquedaOverlayDefinition } from './tabela-queda'
import type { StreamOverlayDefinition } from './types'

export const streamOverlayRegistry: Record<string, StreamOverlayDefinition> = {
  'tabela-geral': tabelaGeralOverlayDefinition,
  booyah: booyahsDiaOverlayDefinition,
  'booyahs-do-dia': booyahsDiaOverlayDefinition,
  'mvp-geral': mvpgeralOverlayDefinition,
  'mvp-queda': mvpquedaOverlayDefinition,
  'mvp-partida': mvpquedaOverlayDefinition,
  'tabela-queda': tabelaquedaOverlayDefinition,
  'tabela-partida': tabelaquedaOverlayDefinition,
}

export const streamOverlayDefinitions = Array.from(
  new Map(Object.values(streamOverlayRegistry).map((definition) => [definition.id, definition])).values(),
)

export function getStreamOverlayDefinition(templateId?: string | null) {
  const key = String(templateId || '').trim().toLowerCase()
  return streamOverlayRegistry[key] || null
}
