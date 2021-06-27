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

import { schemaValidator } from '../../common/utils'
import interfaceModel from '../models/interface.js'
import interfaceCaseModel from '../models/interfaceCase.js'
import interfaceColModel from '../models/interfaceCol.js'
import logModel from '../models/log.js'
import projectModel from '../models/project.js'
import userModel from '../models/user.js'
import yapi from '../yapi.js'

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

  const logfile = path.join(yapi.WEBROOT_LOG, year + '-' + month + '.log')

  if (typeof msg === 'object') {
    msg = msg instanceof Error ? msg.message : JSON.stringify(msg)
  }

  // let data = (new Date).toLocaleString() + '\t|\t' + type + '\t|\t' + msg + '\n';
  const data = `[ ${new Date().toLocaleString()} ] [ ${type} ] ${msg}\n`

  fs.writeFileSync(logfile, data, {
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

export const time = () => Date.parse(new Date()) / 1000

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

export const rand = (min, max) => Math.floor(Math.random() * (max - min) + min)

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
  if (!yapi.mail) { return false }
  options.subject = options.subject ? options.subject + '-YApi 平台' : 'YApi 平台'

  cb
    = cb
    || function (err) {
      if (err) {
        yapi.commons.log('send mail ' + options.to + ' error,' + err.message, 'error')
      } else {
        yapi.commons.log('send mail ' + options.to + ' success')
      }
    }

  try {
    yapi.mail.sendMail(
      {
        from: yapi.WEBCONFIG.mail.from,
        to: options.to,
        subject: options.subject,
        html: options.contents,
      },
      cb,
    )
  } catch (e) {
    yapi.commons.log(e.message, 'error')
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

export const saveLog = logData => {
  try {
    const logInst = yapi.getInst(logModel)
    const data = {
      content: logData.content,
      type: logData.type,
      uid: logData.uid,
      username: logData.username,
      typeid: logData.typeid,
      data: logData.data,
    }

    logInst.save(data).then()
  } catch (e) {
    yapi.commons.log(e, 'error'); // eslint-disable-line
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

        const validResult = yapi.commons.validateParams(inst.schemaMap[action], ctx.params)

        if (!validResult.valid) {
          return (ctx.body = yapi.commons.resReturn(null, 400, validResult.message))
        }
      }
      if (inst.$auth === true) {
        await inst[action](ctx)
      } else if (ws === true) {
        ctx.ws.send('请登录...')
      } else {
        ctx.body = yapi.commons.resReturn(null, 40011, '请登录...')
      }
    } catch (err) {
      ctx.body = yapi.commons.resReturn(null, 40011, '服务器出错...')
      yapi.commons.log(err, 'error')
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

export async function getCaseList(id) {
  const caseInst = yapi.getInst(interfaceCaseModel)
  const colInst = yapi.getInst(interfaceColModel)
  const projectInst = yapi.getInst(projectModel)
  const interfaceInst = yapi.getInst(interfaceModel)

  let resultList = await caseInst.list(id, 'all')
  const colData = await colInst.get(id)
  for (let index = 0; index < resultList.length; index++) {
    const result = resultList[index].toObject()
    const data = await interfaceInst.get(result.interface_id)
    if (!data) {
      await caseInst.del(result._id)
      continue
    }
    const projectData = await projectInst.getBaseInfo(data.project_id)
    result.path = projectData.basepath + data.path
    result.method = data.method
    result.title = data.title
    result.req_body_type = data.req_body_type
    result.req_headers = handleParamsValue(data.req_headers, result.req_headers)
    result.res_body_type = data.res_body_type
    result.req_body_form = handleParamsValue(data.req_body_form, result.req_body_form)
    result.req_query = handleParamsValue(data.req_query, result.req_query)
    result.req_params = handleParamsValue(data.req_params, result.req_params)
    resultList[index] = result
  }
  resultList = resultList.sort((a, b) => a.index - b.index)
  const ctxBody = yapi.commons.resReturn(resultList)
  ctxBody.colData = colData
  return ctxBody
}

function convertString(variable) {
  if (variable instanceof Error) {
    return variable.name + ': ' + variable.message
  }
  try {
    if (variable && typeof variable === 'string') {
      return variable
    }
    return JSON.stringify(variable, null, '   ')
  } catch (err) {
    return variable || ''
  }
}

export const runCaseScript = async function runCaseScript(params, colId, interfaceId) {
  const colInst = yapi.getInst(interfaceColModel)
  const colData = await colInst.get(colId)
  const logs = []
  const context = {
    assert: require('assert'),
    status: params.response.status,
    body: params.response.body,
    header: params.response.header,
    records: params.records,
    params: params.params,
    log: msg => {
      logs.push('log: ' + convertString(msg))
    },
  }

  let result = {}
  try {

    if (colData.checkHttpCodeIs200) {
      const status = Number(params.response.status)
      if (status !== 200) {
        throw ('Http status code 不是 200，请检查(该规则来源于于 [测试集->通用规则配置] )')
      }
    }

    if (colData.checkResponseField.enable) {
      if (params.response.body[colData.checkResponseField.name] !== colData.checkResponseField.value) {
        throw (`返回json ${colData.checkResponseField.name} 值不是${colData.checkResponseField.value}，请检查(该规则来源于于 [测试集->通用规则配置] )`)
      }
    }

    if (colData.checkResponseSchema) {
      const interfaceInst = yapi.getInst(interfaceModel)
      const interfaceData = await interfaceInst.get(interfaceId)
      if (interfaceData.res_body_is_json_schema && interfaceData.res_body) {
        const schema = JSON.parse(interfaceData.res_body)
        const result = schemaValidator(schema, context.body)
        if (!result.valid) {
          throw (`返回Json 不符合 response 定义的数据结构,原因: ${result.message}
数据结构如下：
${JSON.stringify(schema, null, 2)}`)
        }
      }
    }

    if (colData.checkScript.enable) {
      const globalScript = colData.checkScript.content
      // script 是断言
      if (globalScript) {
        logs.push('执行脚本：' + globalScript)
        result = yapi.commons.sandbox(context, globalScript)
      }
    }

    const script = params.script
    // script 是断言
    if (script) {
      logs.push('执行脚本:' + script)
      result = yapi.commons.sandbox(context, script)
    }
    result.logs = logs
    return yapi.commons.resReturn(result)
  } catch (err) {
    logs.push(convertString(err))
    result.logs = logs
    logs.push(err.name + ': ' + err.message)
    return yapi.commons.resReturn(result, 400, err.name + ': ' + err.message)
  }
}

export async function getUserdata(uid, role) {
  role = role || 'dev'
  const userInst = yapi.getInst(userModel)
  const userData = await userInst.findById(uid)
  if (!userData) {
    return null
  }
  return {
    role: role,
    uid: userData._id,
    username: userData.username,
    email: userData.email,
  }
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
  sandbox = yapi.commons.sandbox(sandbox, script)
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

