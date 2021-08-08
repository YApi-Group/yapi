import http from 'http'
import path from 'path'

import Ajv from 'ajv'
import ejs from 'easy-json-schema'
import fs from 'fs-extra'
import jsf from 'json-schema-faker'
import json5 from 'json5'
import Mock from 'mockjs'
import sha1 from 'sha1'
import _ from 'underscore'

import cons from '../cons'

jsf.extend('mock', function () {
  return {
    mock: function (xx) {
      return Mock.mock(xx)
    },
  }
})

const defaultOptions = {
  failOnInvalidTypes: false,
  failOnInvalidFormat: false,
}

export function time() { 
  return Math.floor(new Date().getTime() / 1000) 
}

export function rand(min, max) {
  return Math.floor(Math.random() * (max - min) + min) 
}

// formats.forEach(item => {
//   item = item.name;
//   jsf.format(item, () => {
//     if (item === 'mobile') {
//       return jsf.random.randexp('^[1][34578][0-9]{9}$');
//     }
//     return Mock.mock('@' + item);
//   });
// });

export function schemaToJson(schema, options = {}) {
  Object.assign(options, defaultOptions)

  jsf.option(options)
  let result
  try {
    result = jsf(schema)
  } catch (err) {
    result = err.message
  }
  jsf.option(defaultOptions)
  return result
}

export const resReturn = (data, num, errmsg) => {
  num = num || 0

  return {
    errcode: num,
    errmsg: errmsg || '成功！',
    data: data,
  }
}

export const log = (msg, type) => {
  if (!msg) {
    return
  }

  type = type || 'log'

  let f

  switch (type) {
    case 'log':
      f = console.log; // eslint-disable-line
      break
    case 'warn':
      f = console.warn; // eslint-disable-line
      break
    case 'error':
      f = console.error; // eslint-disable-line
      break
    default:
      f = console.log; // eslint-disable-line
      break
  }

  f(type + ':', msg)

  const date = new Date()
  const year = date.getFullYear()
  const month = date.getMonth() + 1

  if (typeof msg === 'object') {
    msg = msg instanceof Error ? msg.message : JSON.stringify(msg)
  }

  // let data = (new Date).toLocaleString() + '\t|\t' + type + '\t|\t' + msg + '\n';
  const data = `[ ${new Date().toLocaleString()} ] [ ${type} ] ${msg}\n`

  const logPath = path.join(cons.WEB_LOG_DIR, year + '-' + month + '.log')
  fs.writeFileSync(logPath, data, {
    flag: 'a',
  })
}

export const fileExist = filePath => {
  try {
    return fs.statSync(filePath).isFile()
  } catch (err) {
    return false
  }
}

export const fieldSelect = (data, field) => {
  if (!data || !field || !Array.isArray(field)) {
    return null
  }

  const arr = {}

  field.forEach(f => {
    typeof data[f] !== 'undefined' && (arr[f] = data[f])
  })

  return arr
}

export const json_parse = json => {
  try {
    return json5.parse(json)
  } catch (e) {
    return json
  }
}

export const randStr = () => Math.random()
  .toString(36)
  .substr(2)
export const getIp = ctx => {
  let ip
  try {
    ip = ctx.ip.match(/\d+.\d+.\d+.\d+/) ? ctx.ip.match(/\d+.\d+.\d+.\d+/)[0] : 'localhost'
  } catch (e) {
    ip = null
  }
  return ip
}

export const generatePassword = (password, passsalt) => sha1(password + sha1(passsalt))

export const expireDate = day => {
  const date = new Date()
  date.setTime(date.getTime() + day * 86400000)
  return date
}

export const sendMail = (options, cb) => {
  if (!cons.mail) { return false }
  options.subject = options.subject ? options.subject + '-YApi 平台' : 'YApi 平台'

  cb = cb || function (err) {
    if (err) {
      log('send mail ' + options.to + ' error,' + err.message, 'error')
    } else {
      log('send mail ' + options.to + ' success')
    }
  }

  try {
    cons.mail.sendMail(
      {
        from: cons.WEB_CONFIG.mail.from,
        to: options.to,
        subject: options.subject,
        html: options.contents,
      },
      cb,
    )
  } catch (e) {
    log(e.message, 'error')
    console.error(e.message); // eslint-disable-line
  }
}

export const validateSearchKeyword = keyword => {
  if (/^\*|\?|\+|\$|\^|\\|\.$/.test(keyword)) {
    return false
  }

  return true
}

export const filterRes = (list, rules) => list.map(item => {
  const filteredRes = {}

  rules.forEach(rule => {
    if (typeof rule == 'string') {
      filteredRes[rule] = item[rule]
    } else if (typeof rule == 'object') {
      filteredRes[rule.alias] = item[rule.key]
    }
  })

  return filteredRes
})

export const handleVarPath = (pathname, params) => {
  function insertParams(name) {
    if (!_.find(params, { name: name })) {
      params.push({
        name: name,
        desc: '',
      })
    }
  }

  if (!pathname) { return }

  if (pathname.indexOf(':') !== -1) {
    const paths = pathname.split('/')

    for (let i = 1; i < paths.length; i++) {
      if (paths[i] && paths[i][0] === ':') {
        const name = paths[i].substr(1)
        insertParams(name)
      }
    }
  }

  pathname.replace(/\{(.+?)\}/g, function (str, match) {
    insertParams(match)
  })
}

/**
 * 验证一个 path 是否合法
 * path第一位必需为 /, path 只允许由 字母数字-/_:.{}= 组成
 */
export const verifyPath = path => /^\/[a-zA-Z0-9\-/_:!.{}=]*$/.test(path)
// if (/^\/[a-zA-Z0-9\-\/_:!\.\{\}\=]*$/.test(path)) {
//   return true;
// } else {
//   return false;
// }

/**
 * 沙盒执行 js 代码
 * @sandbox Object context
 * @script String script
 * @return sandbox
 *
 * @example let a = sandbox({a: 1}, 'a=2')
 * a = {a: 2}
 */
export const sandbox = (sandbox, script) => {
  // try {
  const vm = require('vm')
  sandbox = sandbox || {}
  script = new vm.Script(script)
  const context = new vm.createContext(sandbox)
  script.runInContext(context, { timeout: 3000 })
  return sandbox
  // } catch (err) {
  // throw err
  // }
}

export function trim(str) {
  if (!str) {
    return str
  }

  str = String(str)

  return str.replace(/(^\s*)|(\s*$)/g, '')
}

export function ltrim(str) {
  if (!str) {
    return str
  }

  str = String(str)

  return str.replace(/(^\s*)/g, '')
}

export function rtrim(str) {
  if (!str) {
    return str
  }

  str = String(str)

  return str.replace(/(\s*$)/g, '')
}

/**
 * 处理请求参数类型，String 字符串去除两边空格，Number 使用parseInt 转换为数字
 * @params Object {a: ' ab ', b: ' 123 '}
 * @keys Object {a: 'string', b: 'number'}
 * @return Object {a: 'ab', b: 123}
 */
export const handleParams = (params, keys) => {
  if (!params || typeof params !== 'object' || !keys || typeof keys !== 'object') {
    return false
  }

  for (const key in keys) {
    const filter = keys[key]
    if (params[key]) {
      switch (filter) {
        case 'string':
          params[key] = trim(String(params[key]))
          break
        case 'number':
          params[key] = !isNaN(params[key]) ? parseInt(params[key], 10) : 0
          break
        default:
          params[key] = trim(String(params))
      }
    }
  }

  return params
}

export const validateParams = (schema2, params) => {
  const flag = schema2.closeRemoveAdditional
  const ajv = new Ajv({
    allErrors: true,
    coerceTypes: true,
    useDefaults: true,
    removeAdditional: !flag,
  })

  const localize = require('ajv-i18n')
  delete schema2.closeRemoveAdditional

  const schema = ejs(schema2)

  schema.additionalProperties = !!flag
  const validate = ajv.compile(schema)
  const valid = validate(params)

  let message = '请求参数 '
  if (!valid) {
    localize.zh(validate.errors)
    message += ajv.errorsText(validate.errors, { separator: '\n' })
  }

  return {
    valid: valid,
    message: message,
  }
}

/**
 *
 * @param {*} router router
 * @param {*} baseurl base_url_path
 * @param {*} routerController controller
 * @param {*} path  routerPath
 * @param {*} method request_method , post get put delete ...
 * @param {*} action controller action_name
 * @param {*} ws enable ws
 */
export const createAction = (router, baseurl, routerController, action, path, method, ws) => {
  router[method](baseurl + path, async ctx => {
    // eslint-disable-next-line new-cap
    const inst = new routerController(ctx)
    try {
      await inst.init(ctx)
      ctx.params = { ...ctx.request.query, ...ctx.request.body, ...ctx.params }
      if (inst.schemaMap && typeof inst.schemaMap === 'object' && inst.schemaMap[action]) {

        const validResult = validateParams(inst.schemaMap[action], ctx.params)

        if (!validResult.valid) {
          return (ctx.body = resReturn(null, 400, validResult.message))
        }
      }
      if (inst.$auth === true) {
        await inst[action](ctx)
      } else if (ws === true) {
        ctx.ws.send('请登录...')
      } else {
        ctx.body = resReturn(null, 40011, '请登录...')
      }
    } catch (err) {
      ctx.body = resReturn(null, 40011, '服务器出错...')
      log(err, 'error')
    }
  })
}

/**
 *
 * @param {*} params 接口定义的参数
 * @param {*} val  接口case 定义的参数值
 */
export function handleParamsValue(params, val) {
  const value = {}
  try { params = params.toObject() } catch (e) { /* TODO noop */ }

  if (params.length === 0 || val.length === 0) { return params }

  val.forEach(item => {
    value[item.name] = item
  })
  params.forEach((item, index) => {
    if (!value[item.name] || typeof value[item.name] !== 'object') { return null }
    params[index].value = value[item.name].value
    if (!_.isUndefined(value[item.name].enable)) {
      params[index].enable = value[item.name].enable
    }
  })
  return params
}

// 处理mockJs脚本
export function handleMockScript(script, context) {
  let sandbox = {
    header: context.ctx.header,
    query: context.ctx.query,
    body: context.ctx.request.body,
    mockJson: context.mockJson,
    params: { ...context.ctx.query, ...context.ctx.request.body },
    resHeader: context.resHeader,
    httpCode: context.httpCode,
    delay: context.httpCode,
    Random: Mock.Random,
  }
  sandbox.cookie = {}

  context.ctx.header.cookie
    && context.ctx.header.cookie.split(';').forEach(function (Cookie) {
      const parts = Cookie.split('=')
      sandbox.cookie[parts[0].trim()] = (parts[1] || '').trim()
    })
  sandbox = sandbox(sandbox, script)
  sandbox.delay = isNaN(sandbox.delay) ? 0 : Number(sandbox.delay)

  context.mockJson = sandbox.mockJson
  context.resHeader = sandbox.resHeader
  context.httpCode = sandbox.httpCode
  context.delay = sandbox.delay
}

export function createWebAPIRequest(ops) {
  return new Promise(function (resolve, reject) {
    let req = ''
    const http_client = http.request(
      {
        host: ops.hostname,
        method: 'GET',
        port: ops.port,
        path: ops.path,
      },
      function (res) {
        res.on('error', function (err) {
          reject(err)
        })
        res.setEncoding('utf8')
        if (res.statusCode !== 200) {
          reject({ message: 'statusCode != 200' })
        } else {
          res.on('data', function (chunk) {
            req += chunk
          })
          res.on('end', function () {
            resolve(req)
          })
        }
      },
    )
    http_client.on('error', e => {
      reject({ message: `request error: ${e.message}` })
    })
    http_client.end()
  })
}
