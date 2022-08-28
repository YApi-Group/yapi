import path from 'path'

import Koa from 'koa'
import koaBody from 'koa-body'
import koaStatic from 'koa-static'
import websockify from 'koa-websocket'

import cons from './cons'
import mockServer from './middleware/mockServer.js'
import router from './router'
import * as commons from './utils/commons.js'
import dbModule from './utils/db.js'
import storageCreator from './utils/storage.js'
import websocket from './websocket.js'
import yapi from './yapi'

// import  bodyParser from 'koa-bodyparser'
// TODO 重新设计 plugin 机制 ，不使用 dynamic-require
import './plugin.js'
// require('./utils/notice')

yapi.connect = dbModule.connect()

// TODO 优化及 remove?
global.storageCreator = storageCreator

const app = websockify(new Koa())
app.proxy = true
yapi.app = app

// app.use(bodyParser({multipart: true}));
app.use(koaBody({ multipart: true, jsonLimit: '2mb', formLimit: '1mb', textLimit: '1mb' }))
app.use(mockServer)
app.use(router.routes())
app.use(router.allowedMethods())

websocket(app)

app.use(async (ctx, next) => {
  if (/^\/(?!api)[a-zA-Z0-9/\-_]*$/.test(ctx.path)) {
    ctx.path = '/'
    await next()
  } else {
    await next()
  }
})

app.use(async (ctx, next) => {
  if (ctx.path.indexOf('/prd') === 0) {
    ctx.set('Cache-Control', 'max-age=8640000000')
    if (commons.fileExist(path.join(cons.WEB_ROOT, 'static', ctx.path + '.gz'))) {
      ctx.set('Content-Encoding', 'gzip')
      ctx.path = ctx.path + '.gz'
    }
  }
  await next()
})

app.use(koaStatic(path.join(cons.WEB_ROOT, 'static'), { index: 'index.html', gzip: true }))

const server = app.listen(cons.WEB_CONFIG.port)

server.setTimeout(cons.WEB_CONFIG.timeout)

commons.log(`
服务已启动，请打开下面链接访问:
http://127.0.0.1${cons.WEB_CONFIG.port === '80' ? '' : ':' + cons.WEB_CONFIG.port}/
`)
