import { createStore as _createStore, applyMiddleware } from 'redux'
import promiseMiddleware from 'redux-promise'

import messageMiddleware from './middleware/messageMiddleware'
import reducer from './modules/reducer'

export default function createStore(initialState = {}) {
  const middleware = [promiseMiddleware, messageMiddleware]
  
  const finalCreateStore = applyMiddleware(...middleware)(_createStore)
  const store = finalCreateStore(reducer, initialState)

  return store
}
