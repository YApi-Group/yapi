import request from 'request'
import _ from 'underscore'

import handleImportData from '../../common/HandleImportData'
import createContext from '../../common/createContext'
import { handleParams, crossRequest, handleCurrDomain, checkNameIsExistInArray } from '../../common/postmanLib'
import { handleParamsValue, ArrayToObject } from '../../common/utils.js'
import followModel from '../models/follow.js'
import interfaceModel from '../models/interface.js'
import interfaceCaseModel from '../models/interfaceCase.js'
import interfaceCatModel from '../models/interfaceCat.js'
import interfaceColModel from '../models/interfaceCol.js'
import projectModel from '../models/project.js'
import userModel from '../models/user.js'
import renderToHtml from '../utils/reportHtml'
import yapi from '../yapi.js'

import baseController from './base.js'

/**
 * {
 *    postman: require('./m')
 * }
 */
const importDataModule = {}
yapi.emitHook('import_data', importDataModule)

class openController extends baseController {
  constructor(ctx) {
    super(ctx)
    this.projectModel = yapi.getInst(projectModel)
    this.interfaceColModel = yapi.getInst(interfaceColModel)
    this.interfaceCaseModel = yapi.getInst(interfaceCaseModel)
    this.interfaceModel = yapi.getInst(interfaceModel)
    this.interfaceCatModel = yapi.getInst(interfaceCatModel)
    this.followModel = yapi.getInst(followModel)
    this.userModel = yapi.getInst(userModel)
    this.handleValue = this.handleValue.bind(this)
    this.schemaMap = {
      runAutoTest: {
        '*id': 'number',
        'project_id': 'string',
        'token': 'string',
        'mode': {
          type: 'string',
          default: 'html',
        },
        'email': {
          type: 'boolean',
          default: false,
        },
        'download': {
          type: 'boolean',
          default: false,
        },
        'closeRemoveAdditional': true,
      },
      importData: {
        '*type': 'string',
        'url': 'string',
        '*token': 'string',
        'json': 'string',
        'project_id': 'string',
        'merge': {
          type: 'string',
          default: 'normal',
        },
      },
    }
  }

  async importData(ctx) {
    const type = ctx.params.type
    let content = ctx.params.json
    const project_id = ctx.params.project_id
    let dataSync = ctx.params.merge

    let warnMessage = ''

    /**
     * 因为以前接口文档写错了，做下兼容
     */
    try {
      if (!dataSync && ctx.params.dataSync) {
        warnMessage = 'importData Api 已废弃 dataSync 传参，请联系管理员将 dataSync 改为 merge.'
        dataSync = ctx.params.dataSync
      }
    } catch (e) { /* noop */ }

    const token = ctx.params.token
    if (!type || !importDataModule[type]) {
      return (ctx.body = yapi.commons.resReturn(null, 40022, '不存在的导入方式'))
    }

    if (!content && !ctx.params.url) {
      return (ctx.body = yapi.commons.resReturn(null, 40022, 'json 或者 url 参数，不能都为空'))
    }
    try {
      const syncGet = function (url) {
        return new Promise(function (resolve, reject) {
          request.get({ url: url }, function (error, response, body) {
            if (error) {
              reject(error)
            } else {
              resolve(body)
            }
          })
        })
      } 
      if (ctx.params.url) {
        content = await syncGet(ctx.params.url)
      } else if (content.indexOf('http://') === 0 || content.indexOf('https://') === 0) {
        content = await syncGet(content)
      }
      content = JSON.parse(content)
    } catch (e) {
      return (ctx.body = yapi.commons.resReturn(null, 40022, 'json 格式有误:' + e))
    }

    const menuList = await this.interfaceCatModel.list(project_id)
    const selectCatid = menuList[0]._id
    const projectData = await this.projectModel.get(project_id)
    const res = await importDataModule[type](content)

    let successMessage
    const errorMessage = []
    await handleImportData(
      res,
      project_id,
      selectCatid,
      menuList,
      projectData.basePath,
      dataSync,
      err => {
        errorMessage.push(err)
      },
      msg => {
        successMessage = msg
      },
      () => { /* noop */ },
      token,
      yapi.WEBCONFIG.port,
    )

    if (errorMessage.length > 0) {
      return (ctx.body = yapi.commons.resReturn(null, 404, errorMessage.join('\n')))
    }
    ctx.body = yapi.commons.resReturn(null, 0, successMessage + warnMessage)
  }

  projectInterfaceData(ctx) {
    ctx.body = 'projectInterfaceData'
  }

  handleValue(val, global) {
    const globalValue = ArrayToObject(global)
    const context = { global: globalValue, ...this.records }
    return handleParamsValue(val, context)
  }

  handleEvnParams(params) {
    const result = []
    Object.keys(params).map(item => {
      if (/env_/gi.test(item)) {
        const curEnv = yapi.commons.trim(params[item])
        const value = { curEnv, project_id: item.split('_')[1] }
        result.push(value)
      }
    })
    return result
  }
  async runAutoTest(ctx) {
    if (!this.$tokenAuth) {
      return (ctx.body = yapi.commons.resReturn(null, 40022, 'token 验证失败'))
    }
    // console.log(1231312)
    const token = ctx.query.token

    const projectId = ctx.params.project_id
    const startTime = new Date().getTime()
    const records = (this.records = {})
    const reports = (this.reports = {})
    const testList = []
    const id = ctx.params.id
    const curEnvList = this.handleEvnParams(ctx.params)

    const colData = await this.interfaceColModel.get(id)
    if (!colData) {
      return (ctx.body = yapi.commons.resReturn(null, 40022, 'id值不存在'))
    }

    const projectData = await this.projectModel.get(projectId)

    let caseList = await yapi.commons.getCaseList(id)
    if (caseList.errcode !== 0) {
      ctx.body = caseList
    }
    caseList = caseList.data
    for (let i = 0, l = caseList.length; i < l; i++) {
      const item = caseList[i]
      const projectEvn = await this.projectModel.getByEnv(item.project_id)

      item.id = item._id
      const curEnvItem = _.find(curEnvList, key => key.project_id === item.project_id)

      item.case_env = curEnvItem ? curEnvItem.curEnv || item.case_env : item.case_env
      item.req_headers = this.handleReqHeader(item.req_headers, projectEvn.env, item.case_env)
      item.pre_script = projectData.pre_script
      item.after_script = projectData.after_script
      item.env = projectEvn.env
      let result
      // console.log('item',item.case_env)
      try {
        result = await this.handleTest(item)
      } catch (err) {
        result = err
      }

      reports[item.id] = result
      records[item.id] = {
        params: result.params,
        body: result.res_body,
      }
      testList.push(result)
    }

    function getMessage(testList) {
      let successNum = 0,
        failedNum = 0,
        len = 0,
        msg = ''
      testList.forEach(item => {
        len += 1
        if (item.code === 0) {
          successNum += 1
        } else {
          failedNum += 1
        }
      })
      if (failedNum === 0) {
        msg = `一共 ${len} 测试用例，全部验证通过`
      } else {
        msg = `一共 ${len} 测试用例，${successNum} 个验证通过， ${failedNum} 个未通过。`
      }

      return { msg, len, successNum, failedNum }
    }

    const endTime = new Date().getTime()
    const executionTime = (endTime - startTime) / 1000

    const reportsResult = {
      message: getMessage(testList),
      runTime: executionTime + 's',
      numbs: testList.length,
      list: testList,
    }

    if (ctx.params.email === true && reportsResult.message.failedNum !== 0) {
      const autoTestUrl = `${
        ctx.request.origin
      }/api/open/run_auto_test?id=${id}&token=${token}&mode=${ctx.params.mode}`
      yapi.commons.sendNotice(projectId, {
        title: 'YApi自动化测试报告',
        content: `
        <html>
        <head>
        <title>测试报告</title>
        <meta charset="utf-8" />
        <body>
        <div>
        <h3>测试结果：</h3>
        <p>${reportsResult.message.msg}</p>
        <h3>测试结果详情如下：</h3>
        <p>${autoTestUrl}</p>
        </div>
        </body>
        </html>`,
      })
    }
    const mode = ctx.params.mode || 'html'
    if (ctx.params.download === true) {
      ctx.set('Content-Disposition', `attachment; filename=test.${mode}`)
    }
    if (ctx.params.mode === 'json') {
      return (ctx.body = reportsResult)
    } 
    return (ctx.body = renderToHtml(reportsResult))
    
  }

  async handleTest(interfaceData) {
    let requestParams = {}
    const options = handleParams(interfaceData, this.handleValue, requestParams)
    let result = {
      id: interfaceData.id,
      name: interfaceData.casename,
      path: interfaceData.path,
      code: 400,
      validRes: [],
    }
    try {
      options.taskId = this.getUid()
      const data = await crossRequest(options, interfaceData.pre_script, interfaceData.after_script, createContext(
        this.getUid(),
        interfaceData.project_id,
        interfaceData.interface_id,
      ))
      const res = data.res

      result = Object.assign(result, {
        status: res.status,
        statusText: res.statusText,
        url: data.req.url,
        method: data.req.method,
        data: data.req.data,
        headers: data.req.headers,
        res_header: res.header,
        res_body: res.body,
      })
      if (options.data && typeof options.data === 'object') {
        requestParams = Object.assign(requestParams, options.data)
      }

      const validRes = []

      const responseData = {
        
        status: res.status,
        body: res.body,
        header: res.header,
        statusText: res.statusText,
      }

      await this.handleScriptTest(interfaceData, responseData, validRes, requestParams)
      result.params = requestParams
      if (validRes.length === 0) {
        result.code = 0
        result.validRes = [{ message: '验证通过' }]
      } else if (validRes.length > 0) {
        result.code = 1
        result.validRes = validRes
      }
    } catch (data) {
      result = Object.assign(options, result, {
        res_header: data.header,
        res_body: data.body || data.message,
        status: null,
        statusText: data.message,
        code: 400,
      })
    }

    return result
  }

  async handleScriptTest(interfaceData, response, validRes, requestParams) {
    
    try {
      const test = await yapi.commons.runCaseScript({
        response: response,
        records: this.records,
        script: interfaceData.test_script,
        params: requestParams,
      }, interfaceData.col_id, interfaceData.interface_id, this.getUid())
      if (test.errcode !== 0) {
        test.data.logs.forEach(item => {
          validRes.push({
            message: item,
          })
        })
      }
    } catch (err) {
      validRes.push({
        message: 'Error: ' + err.message,
      })
    }
  }

  handleReqHeader(req_header, envData, curEnvName) {
    const currDomain = handleCurrDomain(envData, curEnvName)

    const header = currDomain.header
    header.forEach(item => {
      if (!checkNameIsExistInArray(item.name, req_header)) {
        item.abled = true
        req_header.push(item)
      }
    })
    req_header = req_header.filter(item => item && typeof item === 'object')
    return req_header
  }
}

export default openController
