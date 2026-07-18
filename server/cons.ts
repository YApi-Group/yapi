import path from 'path'
import { fileURLToPath } from 'url'

import fs from 'fs-extra'
import nodemailer from 'nodemailer'

// 注意：需使用 import attributes 的 `with` 语法（Node 23+ 已移除旧的 `assert` 语法）
import config from '../config.json' with { type: 'json' }

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const WEB_ROOT = path.resolve(__dirname, '../') // 路径
const WEB_LOG_DIR = path.join(WEB_ROOT, 'log')

// 静态资源根：发布布局下前端构建产物被拷入 WEB_ROOT/static；
// 开发工作区无该目录，回退到 client/static 源码目录
const WEB_STATIC = fs.existsSync(path.join(WEB_ROOT, 'static'))
  ? path.join(WEB_ROOT, 'static')
  : path.join(WEB_ROOT, 'client/static')
const WEB_CONFIG = config

fs.ensureDirSync(WEB_LOG_DIR)

let mailObj = null
if (WEB_CONFIG.mail && WEB_CONFIG.mail.enable) {
  mailObj = nodemailer.createTransport(WEB_CONFIG.mail)
}

export default {
  WEB_ROOT: WEB_ROOT,
  WEB_LOG_DIR: WEB_LOG_DIR,
  WEB_STATIC: WEB_STATIC,
  WEB_CONFIG: WEB_CONFIG,

  mail: mailObj,
}
