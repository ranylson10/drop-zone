import TabelaGeralOverlayEditor from './TabelaGeralOverlayEditor'
import TabelaGeralOverlayView from './TabelaGeralOverlayView'
import { tabelaGeralOverlayTemplate } from './config'
import type { StreamOverlayDefinition } from '../types'

export const tabelaGeralOverlayDefinition: StreamOverlayDefinition = {
  ...tabelaGeralOverlayTemplate,
  Render: TabelaGeralOverlayView,
  Editor: TabelaGeralOverlayEditor,
}

export { tabelaGeralOverlayTemplate }
