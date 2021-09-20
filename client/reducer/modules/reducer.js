import { combineReducers } from 'redux'

import { emitHook } from '../../plugin.js'

import addInterface from './addInterface.js'
import follow from './follow.js'
import group from './group.js'
import inter from './interface.js'
import interfaceCol from './interfaceCol.js'
import menu from './menu.js'
import news from './news.js'
import project from './project.js'
import user from './user.js'

const reducerModules = {
  group,
  user,
  inter,
  interfaceCol,
  project,
  news,
  addInterface,
  menu,
  follow,
}
emitHook('add_reducer', reducerModules)

export default combineReducers(reducerModules)
