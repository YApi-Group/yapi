import cons from './cons'
import { bindHook, emitHook } from './hook.js'
import * as commons from './utils/commons'
import * as modelUtils from './utils/modelUtils'

export default {
  ...cons,

  commons: {
    ...commons,
    ...modelUtils,
  },
  bindHook,
  emitHook,
}
