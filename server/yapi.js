import cons from './cons'
import { bindHook, emitHook } from './hook.js'
import * as commons from './utils/commons'

export default {
  ...cons,

  commons,
  bindHook,
  emitHook,
}
