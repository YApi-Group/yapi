import cons from './cons'
import { bindHook, emitHook } from './hook.js'
import * as commons from './utils/commons'
import * as inst from './utils/inst'
import * as modelUtils from './utils/modelUtils'

export default {
  ...cons,
  ...inst,

  commons: {
    ...commons,
    ...modelUtils,
  },
  bindHook,
  emitHook,
}
