import KoaRouter from '@koa/router'

import interfaceController from './controllers/interface.js'
import WikiController from './controllers/wiki.js'
import { createAction } from './utils/commons.js'
import yapi from './yapi.js'

const router = new KoaRouter()

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
  // 原 yapi-plugin-wiki 插件 ws 路由，路径保持不变（前端 Wiki 页硬编码）
  createAction(router, '/api', WikiController, 'wikiConflict', '/ws_plugin/wiki_desc/solve_conflict', 'get', true)

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
