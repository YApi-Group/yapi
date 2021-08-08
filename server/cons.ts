import path from 'path'

import fs from 'fs-extra'
import nodemailer from 'nodemailer'

import config from '../config.json'

const insts = new Map()

const WEB_ROOT = path.resolve(__dirname, '../') // 路径
const WEB_LOG_DIR = path.join(WEB_ROOT, 'log')
const WEB_CONFIG = config

fs.ensureDirSync(WEB_LOG_DIR)

let mailObj = null
if (WEB_CONFIG.mail && WEB_CONFIG.mail.enable) {
  mailObj = nodemailer.createTransport(WEB_CONFIG.mail)
}

/**
 * 获取一个model实例，如果不存在则创建一个新的返回
 * @param {*} m class
 * @example
 * yapi.getInst(GroupModel, arg1, arg2)
 */
function getInst(m: any, ...args: any[]) {
  if (!insts.get(m)) {
    // eslint-disable-next-line new-cap
    insts.set(m, new m(args))
  }
  return insts.get(m)
}

function delInst(m: any) {
  try {
    insts.delete(m)
  } catch (err) {
    console.error(err)
  }
}

export default {
  WEB_ROOT: WEB_ROOT,
  WEB_LOG_DIR: WEB_LOG_DIR,
  WEB_CONFIG: WEB_CONFIG,

  mail: mailObj,

  getInst: getInst,
  delInst: delInst,
  listInst: () => insts,
  getInsts: insts,
}
