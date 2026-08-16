import { combineReducers } from 'redux'

import { emitHook } from '../../plugin'

import addInterface from './addInterface'
import follow from './follow'
import group from './group'
import inter from './interface'
import interfaceCol from './interfaceCol'
import menu from './menu'
import mockCol from './mockCol'
import news from './news'
import project from './project'
import user from './user'

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
  mockCol,
}

export default combineReducers(reducerModules)
