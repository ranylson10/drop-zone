import MvpQuedaOverlayEditor from './MvpQuedaOverlayEditor'
import MvpQuedaOverlayView from './MvpQuedaOverlayView'
import { mvpQuedaOverlayTemplate } from './config'
import type { StreamOverlayDefinition } from '../types'

export const mvpquedaOverlayDefinition: StreamOverlayDefinition = {
  ...mvpQuedaOverlayTemplate,
  Render: MvpQuedaOverlayView,
  Editor: MvpQuedaOverlayEditor,
}

export { mvpQuedaOverlayTemplate }
