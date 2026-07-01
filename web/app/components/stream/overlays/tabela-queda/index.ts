import TabelaQuedaOverlayEditor from './TabelaQuedaOverlayEditor'
import TabelaQuedaOverlayView from './TabelaQuedaOverlayView'
import { tabelaQuedaOverlayTemplate } from './config'
import type { StreamOverlayDefinition } from '../types'

export const tabelaquedaOverlayDefinition: StreamOverlayDefinition = {
  ...tabelaQuedaOverlayTemplate,
  Render: TabelaQuedaOverlayView,
  Editor: TabelaQuedaOverlayEditor,
}

export { tabelaQuedaOverlayTemplate }
