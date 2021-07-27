import path from 'path'

import fs from 'fs-extra'
import nodemailer from 'nodemailer'

import config from '../config.json'

const insts = new Map()

const WEBROOT = path.resolve(__dirname, '../') // 路径
const WEBROOT_SERVER = __dirname
const WEBROOT_RUNTIME = path.resolve(__dirname, '../')
const WEBROOT_LOG = path.join(WEBROOT_RUNTIME, 'log')
const WEBCONFIG = config

fs.ensureDirSync(WEBROOT_LOG)

let mailObj = null
if (WEBCONFIG.mail && WEBCONFIG.mail.enable) {
  mailObj = nodemailer.createTransport(WEBCONFIG.mail)
}

/**
 * 获取一个model实例，如果不存在则创建一个新的返回
 * @param {*} m class
 * @example
 * yapi.getInst(groupModel, arg1, arg2)
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
  WEBROOT: WEBROOT,
  WEBROOT_SERVER: WEBROOT_SERVER,
  WEBROOT_RUNTIME: WEBROOT_RUNTIME,
  WEBROOT_LOG: WEBROOT_LOG,
  WEBCONFIG: WEBCONFIG,

  mail: mailObj,

  getInst: getInst,
  delInst: delInst,
  listInst: () => insts,
  getInsts: insts,
}
