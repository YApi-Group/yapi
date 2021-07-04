import path from 'path'

import Koa from 'koa'
import koaBody from 'koa-body'
import koaStatic from 'koa-static'
import websockify from 'koa-websocket'

import mockServer from './middleware/mockServer.js'
import router from './router.js'
import * as commons from './utils/commons.js'
import dbModule from './utils/db.js'
import storageCreator from './utils/storage.js'
import websocket from './websocket.js'
import yapi from './yapi.js'

// import  bodyParser from 'koa-bodyparser'
// TODO 重新设计 plugin 机制 ，不使用 dynamic-require
import './plugin.js'
// require('./utils/notice')

yapi.commons = commons
yapi.connect = dbModule.connect()

// TODO 优化及 remove?
global.storageCreator = storageCreator
// TODO remove
const indexFile = process.argv[2] === 'dev' ? 'dev.html' : 'index.html'

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
    if (yapi.commons.fileExist(path.join(yapi.WEBROOT, 'static', ctx.path + '.gz'))) {
      ctx.set('Content-Encoding', 'gzip')
      ctx.path = ctx.path + '.gz'
    }
  }
  await next()
})

app.use(koaStatic(path.join(yapi.WEBROOT, 'static'), { index: indexFile, gzip: true }))

const server = app.listen(yapi.WEBCONFIG.port)

server.setTimeout(yapi.WEBCONFIG.timeout)

commons.log(`服务已启动，请打开下面链接访问: \nhttp://127.0.0.1${yapi.WEBCONFIG.port === '80' ? '' : ':' + yapi.WEBCONFIG.port
}/`)
