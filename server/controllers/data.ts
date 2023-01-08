import { Context } from 'koa'
import markdownIt from 'markdown-it'
import markdownItAnchor from 'markdown-it-anchor'
// @ts-ignore 考虑替换为 https://www.npmjs.com/package/@mdit-vue/plugin-toc
import markdownItTableOfContents from 'markdown-it-table-of-contents'

import md from '../../common/markdown.js'
import InterfaceModel from '../models/interface.js'
import InterfaceCatModel from '../models/interfaceCat.js'
import ProjectModel from '../models/project.js'
import * as commons from '../utils/commons.js'
import * as inst from '../utils/inst.js'

import BaseController from './base.js'
import defaultTheme from './defaultTheme.js'

// const wikiModel = require('../yapi-plugin-wiki/wikiModel.js');

// const htmlToPdf = require("html-pdf");
export default class ExportController extends BaseController {
  catModel: any
  interModel: any
  projectModel: any

  constructor(ctx: Context) {
    super(ctx)
    this.catModel = inst.getInst(InterfaceCatModel)
    this.interModel = inst.getInst(InterfaceModel)
    this.projectModel = inst.getInst(ProjectModel)
  }

  async handleListClass(pid: string, status: string) {
    const result = await this.catModel.list(pid)

    const newResult: any[] = []
    for (let i = 0, item: any, list: any[]; i < result.length; i++) {
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

  async exportData(ctx: Context) {
    const pid = ctx.request.query.pid as string
    const type = ctx.request.query.type as 'markdown' | 'json' | 'html' | 'swagger'
    const status = ctx.request.query.status as string
    const isWiki = ctx.request.query.isWiki

    if (!pid) {
      ctx.body = commons.resReturn(null, 200, 'pid 不为空')
    }
    let curProject: any, wikiData: any
    try {
      curProject = await this.projectModel.get(pid)

      // TODO 完善它吧 - ZS - 20221023
      // if (isWiki === 'true') {
      //   const wikiModel = require('../yapi-plugin-wiki/wikiModel.js')
      //   wikiData = await inst.getInst(wikiModel).get(pid)
      // }

      ctx.set('Content-Type', 'application/octet-stream')
      const list = await this.handleListClass(pid, status)

      switch (type) {
        case 'markdown': {
          ctx.set('Content-Disposition', 'attachment; filename=api.md')
          ctx.body = await createMarkdown(list, false)
          return
        }
        case 'json': {
          ctx.set('Content-Disposition', 'attachment; filename=api.json')
          const data = handleExistId(list)
          ctx.body = JSON.stringify(data, null, 2)
          return
        }
        case 'html': {
          // 默认为html
          ctx.set('Content-Disposition', 'attachment; filename=api.html')
          ctx.body = await createHtml.bind(this)(list)
          return
        }
        case 'swagger': {
          // in this time, only implemented OpenAPI V2.0
          ctx.set('Content-Disposition', 'attachment; filename=swaggerApi.json')
          const data = handleExistId(list)
          const model = convertToSwaggerV2Model(data)
          ctx.body = JSON.stringify(model, null, 2)
          return
        }
        default: {
          ctx.body = commons.resReturn(null, 400, 'type 无效参数')
        }
      }
    } catch (error) {
      commons.log(error, 'error')
      ctx.body = commons.resReturn(null, 502, '下载出错')
    }

    async function createHtml(list: any) {
      const md = await createMarkdown(list, true)
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

    function createHtml5(left: string, tp: string) {
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

    function createMarkdown(list: any, isToc: boolean) {
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
        commons.log(e, 'error')
        ctx.body = commons.resReturn(null, 502, '下载出错')
      }
    }

    // Convert to SwaggerV2.0 (OpenAPI 2.0)
    function convertToSwaggerV2Model(list: any[]) {
      const swaggerObj = {
        swagger: '2.0',
        info: {
          title: curProject.name,
          version: 'last', // last version
          description: curProject.desc,
        },
        // host: "",             // No find any info of host in this point :-)
        basePath: curProject.basepath ? curProject.basepath : '/', // default base path is '/'(root)
        tags: list.map(t => ({
          name: t.name,
          description: t.desc,
          /* externalDocs:{ description:"", url:"" } */
        })),
        schemes: [
          'http', // Only http
        ],
        paths: (() => {
          const apisObj: Record<string, any> = {}
          for (const aptTag of list) {
            // list of category
            for (const api of aptTag.list) {
              // list of api
              if (apisObj[api.path] == null) {
                apisObj[api.path] = {}
              }
              apisObj[api.path][api.method.toLowerCase()] = (() => {
                const apiItem: Record<string, any> = {}
                apiItem.tags = [aptTag.name]
                apiItem.summary = api.title
                apiItem.description = api.markdown
                switch (api.req_body_type) {
                  case 'form':
                  case 'file':
                    apiItem.consumes = ['multipart/form-data'] // form data required
                    break
                  case 'json':
                    apiItem.consumes = ['application/json']
                    break
                  case 'raw':
                    apiItem.consumes = ['text/plain']
                    break
                  default:
                    break
                }
                apiItem.parameters = (() => {
                  const paramArray = []
                  for (const p of api.req_headers) {
                    // Headers parameters
                    // swagger has consumes property, so skip property "Content-Type"
                    if (p.name === 'Content-Type') {
                      continue
                    }
                    paramArray.push({
                      name: p.name,
                      in: 'header',
                      description: `${p.name} (Only:${p.value})`,
                      required: Number(p.required) === 1,
                      type: 'string', // always be type string
                      default: p.value,
                    })
                  }
                  for (const p of api.req_params) {
                    // Path parameters
                    paramArray.push({
                      name: p.name,
                      in: 'path',
                      description: p.desc,
                      required: true, // swagger path parameters required property must be always true,
                      type: 'string', // always be type string
                    })
                  }
                  for (const p of api.req_query) {
                    // Query parameters
                    paramArray.push({
                      name: p.name,
                      in: 'query',
                      required: Number(p.required) === 1,
                      description: p.desc,
                      type: 'string', // always be type string
                    })
                  }
                  switch (
                    api.req_body_type // Body parameters
                  ) {
                    case 'form': {
                      for (const p of api.req_body_form) {
                        paramArray.push({
                          name: p.name,
                          in: 'formData',
                          required: Number(p.required) === 1,
                          description: p.desc,
                          type: p.type === 'text' ? 'string' : 'file', // in this time .formData type have only text or file
                        })
                      }
                      break
                    }
                    case 'json': {
                      if (api.req_body_other) {
                        const jsonParam = JSON.parse(api.req_body_other)
                        if (jsonParam) {
                          paramArray.push({
                            name: 'root',
                            in: 'body',
                            description: jsonParam.description,
                            schema: jsonParam, // as same as swagger's format
                          })
                        }
                      }
                      break
                    }
                    case 'file': {
                      paramArray.push({
                        name: 'upfile',
                        in: 'formData', // use formData
                        description: api.req_body_other,
                        type: 'file',
                      })
                      break
                    }
                    case 'raw': {
                      paramArray.push({
                        name: 'raw',
                        in: 'body',
                        description: 'raw parameter',
                        schema: {
                          type: 'string',
                          format: 'binary',
                          default: api.req_body_other,
                        },
                      })
                      break
                    }
                    default:
                      break
                  }
                  return paramArray
                })()
                apiItem.responses = {
                  200: {
                    description: 'successful operation',
                    schema: (() => {
                      let schemaObj: Record<string, any> = {}
                      if (api.res_body_type === 'raw') {
                        schemaObj.type = 'string'
                        schemaObj.format = 'binary'
                        schemaObj.default = api.res_body
                      } else if (api.res_body_type === 'json') {
                        if (api.res_body) {
                          const resBody = JSON.parse(api.res_body)
                          if (resBody !== null) {
                            // schemaObj['type']=resBody.type;
                            schemaObj = resBody // as the parameters,
                          }
                        }
                      }
                      return schemaObj
                    })(),
                  },
                }
                return apiItem
              })()
            }
          }
          return apisObj
        })(),
      }
      return swaggerObj
    }
  }
}

function delArrId(arr: any, fn?: any) {
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

function handleExistId(data: any) {
  delArrId(data, function (item: any) {
    delArrId(item.list, function (api: any) {
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
