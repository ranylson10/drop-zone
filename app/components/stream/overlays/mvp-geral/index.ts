import TabelaGeralOverlayEditor from '../tabela-geral/TabelaGeralOverlayEditor'
import MvpGeralOverlayView from './MvpGeralOverlayView'
import { mvpGeralOverlayTemplate } from './config'
import type { StreamOverlayDefinition } from '../types'

export const mvpGeralOverlayDefinition: StreamOverlayDefinition = {
  ...mvpGeralOverlayTemplate,
  Render: MvpGeralOverlayView,
  Editor: TabelaGeralOverlayEditor,
}

export { mvpGeralOverlayTemplate }
