import cons from './cons.js'
import { bindHook, emitHook } from './hook.js'
import * as commons from './utils/commons.js'
import * as inst from './utils/inst.js'
import * as modelUtils from './utils/modelUtils.js'

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
