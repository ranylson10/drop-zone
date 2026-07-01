import BooyahsDiaOverlayEditor from './BooyahsDiaOverlayEditor'
import BooyahsDiaOverlayView from './BooyahsDiaOverlayView'
import { booyahsDiaOverlayTemplate } from './config'
import type { StreamOverlayDefinition } from '../types'

export const booyahsDiaOverlayDefinition: StreamOverlayDefinition = {
  ...booyahsDiaOverlayTemplate,
  Render: BooyahsDiaOverlayView,
  Editor: BooyahsDiaOverlayEditor,
}

export { booyahsDiaOverlayTemplate }
