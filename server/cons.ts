import path from 'path'

import fs from 'fs-extra'
import nodemailer from 'nodemailer'

import config from '../config.json'

const WEB_ROOT = path.resolve(__dirname, '../') // 路径
const WEB_LOG_DIR = path.join(WEB_ROOT, 'log')
const WEB_CONFIG = config

fs.ensureDirSync(WEB_LOG_DIR)

let mailObj = null
if (WEB_CONFIG.mail && WEB_CONFIG.mail.enable) {
  mailObj = nodemailer.createTransport(WEB_CONFIG.mail)
}

export default {
  WEB_ROOT: WEB_ROOT,
  WEB_LOG_DIR: WEB_LOG_DIR,
  WEB_CONFIG: WEB_CONFIG,

  mail: mailObj,
}
