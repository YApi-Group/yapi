import markdownIt from 'markdown-it'
import markdownItAnchor from 'markdown-it-anchor'
import markdownItTableOfContents from 'markdown-it-table-of-contents'
import request from 'request'
import _ from 'underscore'

import handleImportData from '../common/HandleImportData.js'
import createContext from '../common/createContext.js'
import md from '../common/markdown.js'
import {
  handleParams,
  crossRequest,
  handleCurrDomain,
  checkNameIsExistInArray,
} from '../common/postmanLib.js'
import { handleParamsValue, changeArrayToObject } from '../common/utils.js'
import cons from '../cons.js'
import FollowModel from '../models/follow.js'
import InterfaceModel from '../models/interface.js'
import interfaceCaseModel from '../models/interfaceCase.js'
import interfaceCatModel from '../models/interfaceCat.js'
import interfaceColModel from '../models/interfaceCol.js'
import projectModel from '../models/project.js'
import UserModel from '../models/user.js'
import * as commons from '../utils/commons.js'
import * as inst from '../utils/inst.js'
import * as modelUtils from '../utils/modelUtils.js'
import renderToHtml from '../utils/reportHtml/index.js'
import swaggerImport from '../utils/swaggerImport.js'
import yapi from '../yapi.js'

import baseController from './base.js'
import defaultTheme from './theme/defaultTheme.js'

/**
 * {
 *    postman: require('./m')
 * }
 */
const importDataModule = {
  swagger: async res => {
    try {
      return await swaggerImport(res)
    } catch (err) {
      commons.log(err, 'error')
      return false
    }
  },
}
yapi.emitHook('import_data', importDataModule)

class openController extends baseController {
  constructor(ctx) {
    super(ctx)
    this.projectModel = inst.getInst(projectModel)
    this.interfaceColModel = inst.getInst(interfaceColModel)
    this.interfaceCaseModel = inst.getInst(interfaceCaseModel)
    this.interModel = inst.getInst(InterfaceModel)
    this.catModel = inst.getInst(interfaceCatModel)
    this.FollowModel = inst.getInst(FollowModel)
    this.UserModel = inst.getInst(UserModel)
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
    } catch (e) {
      /* noop */
    }

    const token = ctx.params.token
    if (!type || !importDataModule[type]) {
      return (ctx.body = commons.resReturn(null, 40022, '不存在的导入方式'))
    }

    if (!content && !ctx.params.url) {
      return (ctx.body = commons.resReturn(null, 40022, 'json 或者 url 参数，不能都为空'))
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
      return (ctx.body = commons.resReturn(null, 40022, 'json 格式有误:' + e))
    }

    const menuList = await this.catModel.list(project_id)
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
      () => {
        /* noop */
      },
      token,
      cons.WEB_CONFIG.port
    )

    if (errorMessage.length > 0) {
      return (ctx.body = commons.resReturn(null, 404, errorMessage.join('\n')))
    }
    ctx.body = commons.resReturn(null, 0, successMessage + warnMessage)
  }

  // eslint-disable-next-line class-methods-use-this
  projectInterfaceData(ctx) {
    ctx.body = 'projectInterfaceData'
  }

  handleValue(val, global) {
    const globalValue = changeArrayToObject(global)
    const context = { global: globalValue, ...this.records }
    return handleParamsValue(val, context)
  }

  async runAutoTest(ctx) {
    if (!this.$tokenAuth) {
      return (ctx.body = commons.resReturn(null, 40022, 'token 验证失败'))
    }
    // console.log(1231312)
    const token = ctx.query.token

    this.records = {}
    this.reports = {}

    const projectId = ctx.params.project_id
    const startTime = new Date().getTime()
    const records = this.records
    const reports = this.reports
    const testList = []
    const id = ctx.params.id
    const curEnvList = handleEvnParams(ctx.params)

    const colData = await this.interfaceColModel.get(id)
    if (!colData) {
      return (ctx.body = commons.resReturn(null, 40022, 'id值不存在'))
    }

    const projectData = await this.projectModel.get(projectId)

    let caseList = await modelUtils.getCaseList(id)
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
      item.req_headers = handleReqHeader(item.req_headers, projectEvn.env, item.case_env)
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
      const autoTestUrl = `${ctx.request.origin}/api/open/run_auto_test?id=${id}&token=${token}&mode=${ctx.params.mode}`
      commons.sendNotice(projectId, {
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
      const data = await crossRequest(
        options,
        interfaceData.pre_script,
        interfaceData.after_script,
        createContext(this.getUid(), interfaceData.project_id, interfaceData.interface_id)
      )
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
      const test = await modelUtils.runCaseScript(
        {
          response: response,
          records: this.records,
          script: interfaceData.test_script,
          params: requestParams,
        },
        interfaceData.col_id,
        interfaceData.interface_id,
        this.getUid()
      )
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

  async handleListClass(pid, status) {
    const result = await this.catModel.list(pid),
      newResult = []
    for (let i = 0, item, list; i < result.length; i++) {
      item = result[i].toObject()
      list = await this.interModel.listByInterStatus(item._id, status)
      list = list.sort((a, b) => a.index - b.index)
      if (list.length > 0) {
        item.list = list
        newResult.push(item)
      }
    }

    return newResult
  }

  async exportFullData(ctx) {
    const pid = ctx.request.query.pid
    const type = ctx.request.query.type
    const status = ctx.request.query.status
    const isWiki = ctx.request.query.isWiki

    if (!pid) {
      return (ctx.body = yapi.commons.resReturn(null, 200, 'pid 不为空'))
    }
    let curProject, wikiData
    let tp = ''
    try {
      curProject = await this.projectModel.get(pid)
      const basepath = curProject.basepath
      if (isWiki === 'true') {
        const wikiModel = require('../yapi-plugin-wiki/wikiModel.js')
        wikiData = await yapi.getInst(wikiModel).get(pid)
      }
      ctx.set('Content-Type', 'application/octet-stream')
      const list = await this.handleListClass(pid, status)

      switch (type) {
        case 'markdown': {
          tp = createMarkdown(list, false)
          ctx.set('Content-Disposition', 'attachment; filename=api.md')
          return (ctx.body = tp)
        }
        case 'json': {
          const data = handleExistId(list)
          if (Array.isArray(data) && basepath) {
            data.forEach(function (cate) {
              if (Array.isArray(cate.list)) {
                cate.proBasepath = basepath
                cate.proName = curProject.name
                cate.proDescription = curProject.desc
                cate.list = cate.list.map(function (api) {
                  api.query_path.path = (basepath + '/' + api.path).replace(/[/]{2,}/g, '/')
                  api.path = api.query_path.path
                  return api
                })
              }
            })
          }
          tp = JSON.stringify(data, null, 2)
          ctx.set('Content-Disposition', 'attachment; filename=api.json')
          return (ctx.body = tp)
        }
        default: {
          // 默认为html
          tp = createHtml(list)
          ctx.set('Content-Disposition', 'attachment; filename=api.html')
          return (ctx.body = tp)
        }
      }
    } catch (error) {
      yapi.commons.log(error, 'error')
      ctx.body = yapi.commons.resReturn(null, 502, '下载出错')
    }

    function createHtml(list) {
      const md = createMarkdown(list, true)
      const markdown = markdownIt({ html: true, breaks: true })
      markdown.use(markdownItAnchor) // Optional, but makes sense as you really want to link to something
      markdown.use(markdownItTableOfContents, {
        markerPattern: /^\[toc\]/im,
      })

      // require('fs').writeFileSync('./a.markdown', md);
      const tp = unescape(markdown.render(md))
      // require('fs').writeFileSync('./a.html', tp);
      let left
      // console.log('tp',tp);
      const content = tp.replace(
        /<div\s+?class="table-of-contents"\s*>[\s\S]*?<\/ul>\s*<\/div>/gi,
        function (match) {
          left = match
          return ''
        }
      )

      return createHtml5(left || '', content)
    }

    function createHtml5(left, tp) {
      // html5模板
      const html = `<!DOCTYPE html>
      <html>
      <head>
      <title>${curProject.name}</title>
      <meta charset="utf-8" />
      ${defaultTheme}
      </head>
      <body>
        <div class="m-header">
          <a href="#" style="display: inherit;"><svg class="svg" width="32px" height="32px" viewBox="0 0 64 64" version="1.1"><title>Icon</title><desc>Created with Sketch.</desc><defs><linearGradient x1="50%" y1="0%" x2="50%" y2="100%" id="linearGradient-1"><stop stop-color="#FFFFFF" offset="0%"></stop><stop stop-color="#F2F2F2" offset="100%"></stop></linearGradient><circle id="path-2" cx="31.9988602" cy="31.9988602" r="2.92886048"></circle><filter x="-85.4%" y="-68.3%" width="270.7%" height="270.7%" filterUnits="objectBoundingBox" id="filter-3"><feOffset dx="0" dy="1" in="SourceAlpha" result="shadowOffsetOuter1"></feOffset><feGaussianBlur stdDeviation="1.5" in="shadowOffsetOuter1" result="shadowBlurOuter1"></feGaussianBlur><feColorMatrix values="0 0 0 0 0   0 0 0 0 0   0 0 0 0 0  0 0 0 0.159703351 0" type="matrix" in="shadowBlurOuter1"></feColorMatrix></filter></defs><g id="首页" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd"><g id="大屏幕"><g id="Icon"><circle id="Oval-1" fill="url(#linearGradient-1)" cx="32" cy="32" r="32"></circle><path d="M36.7078009,31.8054514 L36.7078009,51.7110548 C36.7078009,54.2844537 34.6258634,56.3695395 32.0579205,56.3695395 C29.4899777,56.3695395 27.4099998,54.0704461 27.4099998,51.7941246 L27.4099998,31.8061972 C27.4099998,29.528395 29.4909575,27.218453 32.0589004,27.230043 C34.6268432,27.241633 36.7078009,29.528395 36.7078009,31.8054514 Z" id="blue" fill="#2359F1" fill-rule="nonzero"></path><path d="M45.2586091,17.1026914 C45.2586091,17.1026914 45.5657231,34.0524383 45.2345291,37.01141 C44.9033351,39.9703817 43.1767091,41.6667796 40.6088126,41.6667796 C38.040916,41.6667796 35.9609757,39.3676862 35.9609757,37.0913646 L35.9609757,17.1034372 C35.9609757,14.825635 38.0418959,12.515693 40.6097924,12.527283 C43.177689,12.538873 45.2586091,14.825635 45.2586091,17.1026914 Z" id="green" fill="#57CF27" fill-rule="nonzero" transform="translate(40.674608, 27.097010) rotate(60.000000) translate(-40.674608, -27.097010) "></path><path d="M28.0410158,17.0465598 L28.0410158,36.9521632 C28.0410158,39.525562 25.9591158,41.6106479 23.3912193,41.6106479 C20.8233227,41.6106479 18.7433824,39.3115545 18.7433824,37.035233 L18.7433824,17.0473055 C18.7433824,14.7695034 20.8243026,12.4595614 23.3921991,12.4711513 C25.9600956,12.4827413 28.0410158,14.7695034 28.0410158,17.0465598 Z" id="red" fill="#FF561B" fill-rule="nonzero" transform="translate(23.392199, 27.040878) rotate(-60.000000) translate(-23.392199, -27.040878) "></path><g id="inner-round"><use fill="black" fill-opacity="1" filter="url(#filter-3)" xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#path-2"></use><use fill="#F7F7F7" fill-rule="evenodd" xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#path-2"></use></g></g></g></g></svg></a>
          <a href="#"><h1 class="title">YAPI 接口文档</h1></a>
          <div class="nav">
            <a href="https://hellosean1025.github.io/yapi/">YApi</a>
          </div>
        </div>
        <div class="g-doc">
          ${left}
          <div id="right" class="content-right">
          ${tp}
            <footer class="m-footer">
              <p>Build by <a href="https://ymfe.org/">YMFE</a>.</p>
            </footer>
          </div>
        </div>
      </body>
      </html>
      `
      return html
    }

    function createMarkdown(list, isToc) {
      // 拼接markdown
      // 模板
      let mdTemplate = ''
      try {
        // 项目名称信息
        mdTemplate += md.createProjectMarkdown(curProject, wikiData)
        // 分类信息
        mdTemplate += md.createClassMarkdown(curProject, list, isToc)
        return mdTemplate
      } catch (e) {
        yapi.commons.log(e, 'error')
        ctx.body = yapi.commons.resReturn(null, 502, '下载出错')
      }
    }
  }
}

function handleEvnParams(params) {
  const result = []
  Object.keys(params).map(item => {
    if (/env_/gi.test(item)) {
      const curEnv = commons.trim(params[item])
      const value = { curEnv, project_id: item.split('_')[1] }
      result.push(value)
    }
  })
  return result
}

function handleReqHeader(req_header, envData, curEnvName) {
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

function handleExistId(data) {
  function delArrId(arr, fn) {
    if (!Array.isArray(arr)) {
      return
    }
    arr.forEach(item => {
      delete item._id
      delete item.__v
      delete item.uid
      delete item.edit_uid
      delete item.catid
      delete item.project_id

      if (typeof fn === 'function') {
        fn(item)
      }
    })
  }

  delArrId(data, function (item) {
    delArrId(item.list, function (api) {
      delArrId(api.req_body_form)
      delArrId(api.req_params)
      delArrId(api.req_query)
      delArrId(api.req_headers)
      if (api.query_path && typeof api.query_path === 'object') {
        delArrId(api.query_path.params)
      }
    })
  })

  return data
}

export default openController
