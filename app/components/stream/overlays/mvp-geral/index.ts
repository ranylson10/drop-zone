import MvpGeralOverlayEditor from './MvpGeralOverlayEditor'
import MvpGeralOverlayView from './MvpGeralOverlayView'
import { mvpGeralOverlayTemplate } from './config'
import type { StreamOverlayDefinition } from '../types'

export const mvpgeralOverlayDefinition: StreamOverlayDefinition = {
  ...mvpGeralOverlayTemplate,
  Render: MvpGeralOverlayView,
  Editor: MvpGeralOverlayEditor,
}

export { mvpGeralOverlayTemplate }
