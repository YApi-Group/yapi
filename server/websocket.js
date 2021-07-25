import koaRouter from 'koa-router'

import interfaceController from './controllers/interface.js'
import { createAction } from './utils/commons.js'
import yapi from './yapi.js'

const router = koaRouter()

const pluginsRouterPath = []

function addPluginRouter(config) {
  if (!config.path || !config.controller || !config.action) {
    throw new Error('Plugin Route config Error')
  }

  const routerPath = '/ws_plugin/' + config.path
  if (pluginsRouterPath.indexOf(routerPath) > -1) {
    throw new Error('Plugin Route path conflict, please try rename the path')
  }
  pluginsRouterPath.push(routerPath)

  const method = config.method || 'GET'
  createAction(router, '/api', config.controller, config.action, routerPath, method, true)
}

function websocket(app) {
  createAction(router, '/api', interfaceController, 'solveConflict', '/interface/solve_conflict', 'get')

  yapi.emitHook('add_ws_router', addPluginRouter)

  app.ws.use(router.routes())
  app.ws.use(router.allowedMethods())
  app.ws.use(function (ctx /* next */) {
    return ctx.websocket.send(JSON.stringify({
      errcode: 404,
      errmsg: 'No Fount.',
    }))
  })
}

export default websocket
