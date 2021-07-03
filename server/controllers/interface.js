import path from 'path'
import url from 'url'

import fs from 'fs-extra'
import jsondiffpatch from 'jsondiffpatch'
import _ from 'underscore'

import showDiffMsg from '../../common/diff-view.js'
import mergeJsonSchema from '../../common/mergeJsonSchema'
import followModel from '../models/follow.js'
import groupModel from '../models/group.js'
import interfaceModel from '../models/interface.js'
import interfaceCaseModel from '../models/interfaceCase.js'
import interfaceCatModel from '../models/interfaceCat.js'
import projectModel from '../models/project.js'
import userModel from '../models/user.js'
import yapi from '../yapi.js'

import baseController from './base.js'

const formattersHtml = jsondiffpatch.formatters.html

// const annotatedCss = require("jsondiffpatch/public/formatters-styles/annotated.css");
// const htmlCss = require("jsondiffpatch/public/formatters-styles/html.css");

function handleHeaders(values) {
  let isfile = false,
    isHaveContentType = false
  if (values.req_body_type === 'form') {
    values.req_body_form.forEach(item => {
      if (item.type === 'file') {
        isfile = true
      }
    })

    values.req_headers.map(item => {
      if (item.name === 'Content-Type') {
        item.value = isfile ? 'multipart/form-data' : 'application/x-www-form-urlencoded'
        isHaveContentType = true
      }
    })
    if (isHaveContentType === false) {
      values.req_headers.unshift({
        name: 'Content-Type',
        value: isfile ? 'multipart/form-data' : 'application/x-www-form-urlencoded',
      })
    }
  } else if (values.req_body_type === 'json') {
    values.req_headers
      ? values.req_headers.map(item => {
        if (item.name === 'Content-Type') {
          item.value = 'application/json'
          isHaveContentType = true
        }
      })
      : []
    if (isHaveContentType === false) {
      values.req_headers = values.req_headers || []
      values.req_headers.unshift({
        name: 'Content-Type',
        value: 'application/json',
      })
    }
  }
}

class interfaceController extends baseController {
  constructor(ctx) {
    super(ctx)
    this.Model = yapi.getInst(interfaceModel)
    this.catModel = yapi.getInst(interfaceCatModel)
    this.projectModel = yapi.getInst(projectModel)
    this.caseModel = yapi.getInst(interfaceCaseModel)
    this.followModel = yapi.getInst(followModel)
    this.userModel = yapi.getInst(userModel)
    this.groupModel = yapi.getInst(groupModel)

    const minLengthStringField = {
      type: 'string',
      minLength: 1,
    }

    const addAndUpCommonField = {
      desc: 'string',
      status: 'string',
      req_query: [
        {
          name: 'string',
          value: 'string',
          example: 'string',
          desc: 'string',
          required: 'string',
        },
      ],
      req_headers: [
        {
          name: 'string',
          value: 'string',
          example: 'string',
          desc: 'string',
          required: 'string',
        },
      ],
      req_body_type: 'string',
      req_params: [
        {
          name: 'string',
          example: 'string',
          desc: 'string',
        },
      ],
      req_body_form: [
        {
          name: 'string',
          type: {
            type: 'string',
          },
          example: 'string',
          desc: 'string',
          required: 'string',
        },
      ],
      req_body_other: 'string',
      res_body_type: 'string',
      res_body: 'string',
      custom_field_value: 'string',
      api_opened: 'boolean',
      req_body_is_json_schema: 'string',
      res_body_is_json_schema: 'string',
      markdown: 'string',
      tag: 'array',
    }

    this.schemaMap = {
      add: {
        '*project_id': 'number',
        '*path': minLengthStringField,
        '*title': minLengthStringField,
        '*method': minLengthStringField,
        '*catid': 'number',
        ...addAndUpCommonField,
      },
      up: {
        '*id': 'number',
        'project_id': 'number',
        'path': minLengthStringField,
        'title': minLengthStringField,
        'method': minLengthStringField,
        'catid': 'number',
        'switch_notice': 'boolean',
        'message': minLengthStringField,
        ...addAndUpCommonField,
      },
      save: {
        project_id: 'number',
        catid: 'number',
        title: minLengthStringField,
        path: minLengthStringField,
        method: minLengthStringField,
        message: minLengthStringField,
        switch_notice: 'boolean',
        dataSync: 'string',
        ...addAndUpCommonField,
      },
    }
  }

  /**
   * 添加项目分组
   * @interface /interface/add
   * @method POST
   * @category interface
   * @foldnumber 10
   * @param {Number}   project_id 项目id，不能为空
   * @param {String}   title 接口标题，不能为空
   * @param {String}   path 接口请求路径，不能为空
   * @param {String}   method 请求方式
   * @param {Array}  [req_headers] 请求的header信息
   * @param {String}  [req_headers[].name] 请求的header信息名
   * @param {String}  [req_headers[].value] 请求的header信息值
   * @param {Boolean}  [req_headers[].required] 是否是必须，默认为否
   * @param {String}  [req_headers[].desc] header描述
   * @param {String}  [req_body_type] 请求参数方式，有["form", "json", "text", "xml"]四种
   * @param {Array} [req_params] name, desc两个参数
   * @param {Mixed}  [req_body_form] 请求参数,如果请求方式是form，参数是Array数组，其他格式请求参数是字符串
   * @param {String} [req_body_form[].name] 请求参数名
   * @param {String} [req_body_form[].value] 请求参数值，可填写生成规则（mock）。如@email，随机生成一条email
   * @param {String} [req_body_form[].type] 请求参数类型，有["text", "file"]两种
   * @param {String} [req_body_other]  非form类型的请求参数可保存到此字段
   * @param {String}  [res_body_type] 相应信息的数据格式，有["json", "text", "xml"]三种
   * @param {String} [res_body] 响应信息，可填写任意字符串，如果res_body_type是json,则会调用mock功能
   * @param  {String} [desc] 接口描述
   * @returns {Object}
   * @example ./api/interface/add.json
   */
  async add(ctx) {
    const params = ctx.params

    if (!this.$tokenAuth) {
      const auth = await this.checkAuth(params.project_id, 'project', 'edit')

      if (!auth) {
        return (ctx.body = yapi.commons.resReturn(null, 40033, '没有权限'))
      }
    }
    params.method = params.method || 'GET'
    params.res_body_is_json_schema = _.isUndefined(params.res_body_is_json_schema)
      ? false
      : params.res_body_is_json_schema
    params.req_body_is_json_schema = _.isUndefined(params.req_body_is_json_schema)
      ? false
      : params.req_body_is_json_schema
    params.method = params.method.toUpperCase()
    params.req_params = params.req_params || []
    params.res_body_type = params.res_body_type ? params.res_body_type.toLowerCase() : 'json'
    const http_path = url.parse(params.path, true)

    if (!yapi.commons.verifyPath(http_path.pathname)) {
      return (ctx.body = yapi.commons.resReturn(
        null,
        400,
        'path第一位必需为 /, 只允许由 字母数字-/_:.! 组成',
      ))
    }

    handleHeaders(params)

    params.query_path = {}
    params.query_path.path = http_path.pathname
    params.query_path.params = []
    Object.keys(http_path.query).forEach(item => {
      params.query_path.params.push({
        name: item,
        value: http_path.query[item],
      })
    })

    const checkRepeat = await this.Model.checkRepeat(params.project_id, params.path, params.method)

    if (checkRepeat > 0) {
      return (ctx.body = yapi.commons.resReturn(
        null,
        40022,
        '已存在的接口:' + params.path + '[' + params.method + ']',
      ))
    }

    const data = Object.assign(params, {
      uid: this.getUid(),
      add_time: yapi.commons.time(),
      up_time: yapi.commons.time(),
    })

    yapi.commons.handleVarPath(params.path, params.req_params)

    if (params.req_params.length > 0) {
      data.type = 'var'
      data.req_params = params.req_params
    } else {
      data.type = 'static'
    }

    // 新建接口的人成为项目dev  如果不存在的话
    // 命令行导入时无法获知导入接口人的信息，其uid 为 999999
    const uid = this.getUid()

    if (this.getRole() !== 'admin' && uid !== 999999) {
      const userdata = await yapi.commons.getUserdata(uid, 'dev')
      // 检查一下是否有这个人
      const check = await this.projectModel.checkMemberRepeat(params.project_id, uid)
      if (check === 0 && userdata) {
        await this.projectModel.addMember(params.project_id, [userdata])
      }
    }

    const result = await this.Model.save(data)
    yapi.emitHook('interface_add', result).then()
    this.catModel.get(params.catid).then(cate => {
      const username = this.getUsername()
      const title = `<a href="/user/profile/${this.getUid()}">${username}</a> 为分类 <a href="/project/${
        params.project_id
      }/interface/api/cat_${params.catid}">${cate.name}</a> 添加了接口 <a href="/project/${
        params.project_id
      }/interface/api/${result._id}">${data.title}</a> `

      yapi.commons.saveLog({
        content: title,
        type: 'project',
        uid: this.getUid(),
        username: username,
        typeid: params.project_id,
      })
      this.projectModel.up(params.project_id, { up_time: new Date().getTime() }).then()
    })

    ctx.body = yapi.commons.resReturn(result)
  }

  /**
   * 保存接口数据，如果接口存在则更新数据，如果接口不存在则添加数据
   * @interface /interface/save
   * @method  post
   * @category interface
   * @foldnumber 10
   * @param {Number}   project_id 项目id，不能为空
   * @param {String}   title 接口标题，不能为空
   * @param {String}   path 接口请求路径，不能为空
   * @param {String}   method 请求方式
   * @param {Array}  [req_headers] 请求的header信息
   * @param {String}  [req_headers[].name] 请求的header信息名
   * @param {String}  [req_headers[].value] 请求的header信息值
   * @param {Boolean}  [req_headers[].required] 是否是必须，默认为否
   * @param {String}  [req_headers[].desc] header描述
   * @param {String}  [req_body_type] 请求参数方式，有["form", "json", "text", "xml"]四种
   * @param {Array} [req_params] name, desc两个参数
   * @param {Mixed}  [req_body_form] 请求参数,如果请求方式是form，参数是Array数组，其他格式请求参数是字符串
   * @param {String} [req_body_form[].name] 请求参数名
   * @param {String} [req_body_form[].value] 请求参数值，可填写生成规则（mock）。如@email，随机生成一条email
   * @param {String} [req_body_form[].type] 请求参数类型，有["text", "file"]两种
   * @param {String} [req_body_other]  非form类型的请求参数可保存到此字段
   * @param {String}  [res_body_type] 相应信息的数据格式，有["json", "text", "xml"]三种
   * @param {String} [res_body] 响应信息，可填写任意字符串，如果res_body_type是json,则会调用mock功能
   * @param  {String} [desc] 接口描述
   * @returns {Object}
   */
  async save(ctx) {
    const params = ctx.params

    if (!this.$tokenAuth) {
      const auth = await this.checkAuth(params.project_id, 'project', 'edit')
      if (!auth) {
        return (ctx.body = yapi.commons.resReturn(null, 40033, '没有权限'))
      }
    }
    params.method = params.method || 'GET'
    params.method = params.method.toUpperCase()

    const http_path = url.parse(params.path, true)

    if (!yapi.commons.verifyPath(http_path.pathname)) {
      return (ctx.body = yapi.commons.resReturn(
        null,
        400,
        'path第一位必需为 /, 只允许由 字母数字-/_:.! 组成',
      ))
    }

    const result = await this.Model.getByPath(params.project_id, params.path, params.method, '_id res_body')

    if (result.length > 0) {
      result.forEach(async item => {
        params.id = item._id
        // console.log(this.schemaMap['up'])
        const validParams = { ...params }
        const validResult = yapi.commons.validateParams(this.schemaMap.up, validParams)
        if (validResult.valid) {
          const data = { ...ctx }
          data.params = validParams

          if (params.res_body_is_json_schema && params.dataSync === 'good') {
            try {
              const new_res_body = yapi.commons.json_parse(params.res_body)
              const old_res_body = yapi.commons.json_parse(item.res_body)
              data.params.res_body = JSON.stringify(mergeJsonSchema(old_res_body, new_res_body), null, 2)
            } catch (err) { /* noop */ }
          }
          await this.up(data)
        } else {
          return (ctx.body = yapi.commons.resReturn(null, 400, validResult.message))
        }
      })
    } else {
      const validResult = yapi.commons.validateParams(this.schemaMap.add, params)
      if (validResult.valid) {
        const data = {}
        data.params = params
        await this.add(data)
      } else {
        return (ctx.body = yapi.commons.resReturn(null, 400, validResult.message))
      }
    }
    ctx.body = yapi.commons.resReturn(result)
    // return ctx.body = yapi.commons.resReturn(null, 400, 'path第一位必需为 /, 只允许由 字母数字-/_:.! 组成');
  }

  /**
   * 获取项目分组
   * @interface /interface/get
   * @method GET
   * @category interface
   * @foldnumber 10
   * @param {Number}   id 接口id，不能为空
   * @returns {Object}
   * @example ./api/interface/get.json
   */
  async get(ctx) {
    const params = ctx.params
    if (!params.id) {
      return (ctx.body = yapi.commons.resReturn(null, 400, '接口id不能为空'))
    }

    try {
      let result = await this.Model.get(params.id)
      if (this.$tokenAuth) {
        if (params.project_id !== result.project_id) {
          ctx.body = yapi.commons.resReturn(null, 400, 'token有误')
          return
        }
      }
      // console.log('result', result);
      if (!result) {
        return (ctx.body = yapi.commons.resReturn(null, 490, '不存在的'))
      }
      const userinfo = await this.userModel.findById(result.uid)
      const project = await this.projectModel.getBaseInfo(result.project_id)
      if (project.project_type === 'private') {
        if ((await this.checkAuth(project._id, 'project', 'view')) !== true) {
          return (ctx.body = yapi.commons.resReturn(null, 406, '没有权限'))
        }
      }
      yapi.emitHook('interface_get', result).then()
      result = result.toObject()
      if (userinfo) {
        result.username = userinfo.username
      }
      ctx.body = yapi.commons.resReturn(result)
    } catch (e) {
      ctx.body = yapi.commons.resReturn(null, 402, e.message)
    }
  }

  /**
   * 接口列表
   * @interface /interface/list
   * @method GET
   * @category interface
   * @foldnumber 10
   * @param {Number}   project_id 项目id，不能为空
   * @param {Number}   page 当前页
   * @param {Number}   limit 每一页限制条数
   * @returns {Object}
   * @example ./api/interface/list.json
   */
  async list(ctx) {
    const project_id = ctx.params.project_id
    const page = ctx.request.query.page || 1,
      limit = ctx.request.query.limit || 10
    const status = ctx.request.query.status,
      tag = ctx.request.query.tag
    const project = await this.projectModel.getBaseInfo(project_id)
    if (!project) {
      return (ctx.body = yapi.commons.resReturn(null, 407, '不存在的项目'))
    }
    if (project.project_type === 'private') {
      if ((await this.checkAuth(project._id, 'project', 'view')) !== true) {
        return (ctx.body = yapi.commons.resReturn(null, 406, '没有权限'))
      }
    }
    if (!project_id) {
      return (ctx.body = yapi.commons.resReturn(null, 400, '项目id不能为空'))
    }

    try {
      let result, count
      if (limit === 'all') {
        result = await this.Model.list(project_id)
        count = await this.Model.listCount({ project_id })
      } else {
        const option = { project_id }
        if (status) {
          if (Array.isArray(status)) {
            option.status = { $in: status }
          } else {
            option.status = status
          }
        }
        if (tag) {
          if (Array.isArray(tag)) {
            option.tag = { $in: tag }
          } else {
            option.tag = tag
          }
        }

        result = await this.Model.listByOptionWithPage(option, page, limit)
        count = await this.Model.listCount(option)
      }

      ctx.body = yapi.commons.resReturn({
        count: count,
        total: Math.ceil(count / limit),
        list: result,
      })
      yapi.emitHook('interface_list', result).then()
    } catch (err) {
      ctx.body = yapi.commons.resReturn(null, 402, err.message)
    }
  }

  downloadCrx(ctx) {
    const filename = 'crossRequest.zip'
    const dataBuffer = fs.readFileSync(path.join(yapi.WEBROOT, 'static/attachment/cross-request.zip'))
    ctx.set('Content-disposition', 'attachment; filename=' + filename)
    ctx.set('Content-Type', 'application/zip')
    ctx.body = dataBuffer
  }

  async listByCat(ctx) {
    const catid = ctx.request.query.catid
    const page = ctx.request.query.page || 1,
      limit = ctx.request.query.limit || 10
    const status = ctx.request.query.status,
      tag = ctx.request.query.tag

    if (!catid) {
      return (ctx.body = yapi.commons.resReturn(null, 400, 'catid不能为空'))
    }
    try {
      const catdata = await this.catModel.get(catid)

      const project = await this.projectModel.getBaseInfo(catdata.project_id)
      if (project.project_type === 'private') {
        if ((await this.checkAuth(project._id, 'project', 'view')) !== true) {
          return (ctx.body = yapi.commons.resReturn(null, 406, '没有权限'))
        }
      }

      const option = { catid }
      if (status) {
        if (Array.isArray(status)) {
          option.status = { $in: status }
        } else {
          option.status = status
        }
      }
      if (tag) {
        if (Array.isArray(tag)) {
          option.tag = { $in: tag }
        } else {
          option.tag = tag
        }
      }

      const result = await this.Model.listByOptionWithPage(option, page, limit)

      const count = await this.Model.listCount(option)

      ctx.body = yapi.commons.resReturn({
        count: count,
        total: Math.ceil(count / limit),
        list: result,
      })
    } catch (err) {
      ctx.body = yapi.commons.resReturn(null, 402, err.message + '1')
    }
  }

  async listByMenu(ctx) {
    const project_id = ctx.params.project_id
    if (!project_id) {
      return (ctx.body = yapi.commons.resReturn(null, 400, '项目id不能为空'))
    }

    const project = await this.projectModel.getBaseInfo(project_id)
    if (!project) {
      return (ctx.body = yapi.commons.resReturn(null, 406, '不存在的项目'))
    }
    if (project.project_type === 'private') {
      if ((await this.checkAuth(project._id, 'project', 'view')) !== true) {
        return (ctx.body = yapi.commons.resReturn(null, 406, '没有权限'))
      }
    }

    try {
      const result = await this.catModel.list(project_id),
        newResult = []
      for (let i = 0, item, list; i < result.length; i++) {
        item = result[i].toObject()
        list = await this.Model.listByCatid(item._id)
        for (let j = 0; j < list.length; j++) {
          list[j] = list[j].toObject()
        }

        item.list = list
        newResult[i] = item
      }
      ctx.body = yapi.commons.resReturn(newResult)
    } catch (err) {
      ctx.body = yapi.commons.resReturn(null, 402, err.message)
    }
  }

  /**
   * 编辑接口
   * @interface /interface/up
   * @method POST
   * @category interface
   * @foldnumber 10
   * @param {Number}   id 接口id，不能为空
   * @param {String}   [path] 接口请求路径
   * @param {String}   [method] 请求方式
   * @param {Array}  [req_headers] 请求的header信息
   * @param {String}  [req_headers[].name] 请求的header信息名
   * @param {String}  [req_headers[].value] 请求的header信息值
   * @param {Boolean}  [req_headers[].required] 是否是必须，默认为否
   * @param {String}  [req_headers[].desc] header描述
   * @param {String}  [req_body_type] 请求参数方式，有["form", "json", "text", "xml"]四种
   * @param {Mixed}  [req_body_form] 请求参数,如果请求方式是form，参数是Array数组，其他格式请求参数是字符串
   * @param {String} [req_body_form[].name] 请求参数名
   * @param {String} [req_body_form[].value] 请求参数值，可填写生成规则（mock）。如@email，随机生成一条email
   * @param {String} [req_body_form[].type] 请求参数类型，有["text", "file"]两种
   * @param {String} [req_body_other]  非form类型的请求参数可保存到此字段
   * @param {String}  [res_body_type] 相应信息的数据格式，有["json", "text", "xml"]三种
   * @param {String} [res_body] 响应信息，可填写任意字符串，如果res_body_type是json,则会调用mock功能
   * @param  {String} [desc] 接口描述
   * @returns {Object}
   * @example ./api/interface/up.json
   */
  async up(ctx) {
    const params = ctx.params

    if (!_.isUndefined(params.method)) {
      params.method = params.method || 'GET'
      params.method = params.method.toUpperCase()
    }

    const id = params.id
    params.message = params.message || ''
    params.message = params.message.replace(/\n/g, '<br>')
    // params.res_body_is_json_schema = _.isUndefined (params.res_body_is_json_schema) ?
    //  true : params.res_body_is_json_schema;
    // params.req_body_is_json_schema = _.isUndefined(params.req_body_is_json_schema) ?
    // true : params.req_body_is_json_schema;

    handleHeaders(params)

    const interfaceData = await this.Model.get(id)
    if (!interfaceData) {
      return (ctx.body = yapi.commons.resReturn(null, 400, '不存在的接口'))
    }
    if (!this.$tokenAuth) {
      const auth = await this.checkAuth(interfaceData.project_id, 'project', 'edit')
      if (!auth) {
        return (ctx.body = yapi.commons.resReturn(null, 400, '没有权限'))
      }
    }

    const data = {
      up_time: yapi.commons.time(),
      ...params,
    }

    if (params.path) {
      const http_path = url.parse(params.path, true)

      if (!yapi.commons.verifyPath(http_path.pathname)) {
        return (ctx.body = yapi.commons.resReturn(
          null,
          400,
          'path第一位必需为 /, 只允许由 字母数字-/_:.! 组成',
        ))
      }
      params.query_path = {}
      params.query_path.path = http_path.pathname
      params.query_path.params = []
      Object.keys(http_path.query).forEach(item => {
        params.query_path.params.push({
          name: item,
          value: http_path.query[item],
        })
      })
      data.query_path = params.query_path
    }

    if (
      params.path
      && (params.path !== interfaceData.path || params.method !== interfaceData.method)
    ) {
      const checkRepeat = await this.Model.checkRepeat(
        interfaceData.project_id,
        params.path,
        params.method,
      )
      if (checkRepeat > 0) {
        return (ctx.body = yapi.commons.resReturn(
          null,
          401,
          '已存在的接口:' + params.path + '[' + params.method + ']',
        ))
      }
    }

    if (!_.isUndefined(data.req_params)) {
      if (Array.isArray(data.req_params) && data.req_params.length > 0) {
        data.type = 'var'
      } else {
        data.type = 'static'
        data.req_params = []
      }
    }
    const result = await this.Model.up(id, data)
    const username = this.getUsername()
    const CurrentInterfaceData = await this.Model.get(id)
    const logData = {
      interface_id: id,
      cat_id: data.catid,
      current: CurrentInterfaceData.toObject(),
      old: interfaceData.toObject(),
    }

    this.catModel.get(interfaceData.catid).then(cate => {
      const diffView2 = showDiffMsg(jsondiffpatch, formattersHtml, logData)
      if (diffView2.length <= 0) {
        return // 没有变化时，不写日志
      }
      yapi.commons.saveLog({
        content: `<a href="/user/profile/${this.getUid()}">${username}</a> 
                    更新了分类 <a href="/project/${cate.project_id}/interface/api/cat_${
  data.catid
}">${cate.name}</a> 
                    下的接口 <a href="/project/${cate.project_id}/interface/api/${id}">${
  interfaceData.title
}</a><p>${params.message}</p>`,
        type: 'project',
        uid: this.getUid(),
        username: username,
        typeid: cate.project_id,
        data: logData,
      })
    })

    this.projectModel.up(interfaceData.project_id, { up_time: new Date().getTime() }).then()
    if (params.switch_notice === true) {
      const diffView = showDiffMsg(jsondiffpatch, formattersHtml, logData)
      const annotatedCss = fs.readFileSync(
        path.resolve(
          yapi.WEBROOT,
          'node_modules/jsondiffpatch/dist/formatters-styles/annotated.css',
        ),
        'utf8',
      )
      const htmlCss = fs.readFileSync(
        path.resolve(yapi.WEBROOT, 'node_modules/jsondiffpatch/dist/formatters-styles/html.css'),
        'utf8',
      )

      const project = await this.projectModel.getBaseInfo(interfaceData.project_id)

      const interfaceUrl = `${ctx.request.origin}/project/${
        interfaceData.project_id
      }/interface/api/${id}`

      yapi.commons.sendNotice(interfaceData.project_id, {
        title: `${username} 更新了接口`,
        content: `<html>
        <head>
        <style>
        ${annotatedCss}
        ${htmlCss}
        </style>
        </head>
        <body>
        <div><h3>${username}更新了接口(${data.title})</h3>
        <p>项目名：${project.name} </p>
        <p>修改用户: ${username}</p>
        <p>接口名: <a href="${interfaceUrl}">${data.title}</a></p>
        <p>接口路径: [${data.method}]${data.path}</p>
        <p>详细改动日志: ${this.diffHTML(diffView)}</p></div>
        </body>
        </html>`,
      })
    }

    yapi.emitHook('interface_update', id).then()
    ctx.body = yapi.commons.resReturn(result)
    return 1
  }

  diffHTML(html) {
    if (html.length === 0) {
      return '<span style="color: #555">没有改动，该操作未改动Api数据</span>'
    }

    return html.map(item => `<div>
      <h4 class="title">${item.title}</h4>
      <div>${item.content}</div>
    </div>`)
  }

  /**
   * 删除接口
   * @interface /interface/del
   * @method GET
   * @category interface
   * @foldnumber 10
   * @param {Number}   id 接口id，不能为空
   * @returns {Object}
   * @example ./api/interface/del.json
   */

  async del(ctx) {
    try {
      const id = ctx.request.body.id

      if (!id) {
        return (ctx.body = yapi.commons.resReturn(null, 400, '接口id不能为空'))
      }

      const data = await this.Model.get(id)

      // eslint-disable-next-line eqeqeq
      if (data.uid != this.getUid()) {
        const auth = await this.checkAuth(data.project_id, 'project', 'danger')
        if (!auth) {
          return (ctx.body = yapi.commons.resReturn(null, 400, '没有权限'))
        }
      }

      // let inter = await this.Model.get(id);
      const result = await this.Model.del(id)
      yapi.emitHook('interface_del', id).then()
      await this.caseModel.delByInterfaceId(id)
      const username = this.getUsername()
      this.catModel.get(data.catid).then(cate => {
        yapi.commons.saveLog({
          content: `<a href="/user/profile/${this.getUid()}">${username}</a> 删除了分类 <a href="/project/${
            cate.project_id
          }/interface/api/cat_${data.catid}">${cate.name}</a> 下的接口 "${data.title}"`,
          type: 'project',
          uid: this.getUid(),
          username: username,
          typeid: cate.project_id,
        })
      })
      this.projectModel.up(data.project_id, { up_time: new Date().getTime() }).then()
      ctx.body = yapi.commons.resReturn(result)
    } catch (err) {
      ctx.body = yapi.commons.resReturn(null, 402, err.message)
    }
  }
  // 处理编辑冲突
  async solveConflict(ctx) {
    try {
      const id = parseInt(ctx.query.id, 10)
      let userInst, userinfo, data
      if (!id) {
        return ctx.websocket.send('id 参数有误')
      }

      const result = await this.Model.get(id)
      if (result.edit_uid !== 0 && result.edit_uid !== this.getUid()) {
        userInst = yapi.getInst(userModel)
        userinfo = await userInst.findById(result.edit_uid)
        data = {
          errno: result.edit_uid,
          data: { uid: result.edit_uid, username: userinfo.username },
        }
      } else {
        this.Model.upEditUid(id, this.getUid()).then()
        data = {
          errno: 0,
          data: result,
        }
      }
      ctx.websocket.send(JSON.stringify(data))
      ctx.websocket.on('close', () => {
        this.Model.upEditUid(id, 0).then()
      })
    } catch (err) {
      yapi.commons.log(err, 'error')
    }
  }

  async addCat(ctx) {
    try {
      let params = ctx.request.body
      params = yapi.commons.handleParams(params, {
        name: 'string',
        project_id: 'number',
        desc: 'string',
      })

      if (!params.project_id) {
        return (ctx.body = yapi.commons.resReturn(null, 400, '项目id不能为空'))
      }
      if (!this.$tokenAuth) {
        const auth = await this.checkAuth(params.project_id, 'project', 'edit')
        if (!auth) {
          return (ctx.body = yapi.commons.resReturn(null, 400, '没有权限'))
        }
      }

      if (!params.name) {
        return (ctx.body = yapi.commons.resReturn(null, 400, '名称不能为空'))
      }

      const result = await this.catModel.save({
        name: params.name,
        project_id: params.project_id,
        desc: params.desc,
        uid: this.getUid(),
        add_time: yapi.commons.time(),
        up_time: yapi.commons.time(),
      })

      const username = this.getUsername()
      yapi.commons.saveLog({
        content: `<a href="/user/profile/${this.getUid()}">${username}</a> 添加了分类  <a href="/project/${
          params.project_id
        }/interface/api/cat_${result._id}">${params.name}</a>`,
        type: 'project',
        uid: this.getUid(),
        username: username,
        typeid: params.project_id,
      })

      ctx.body = yapi.commons.resReturn(result)
    } catch (e) {
      ctx.body = yapi.commons.resReturn(null, 402, e.message)
    }
  }

  async upCat(ctx) {
    try {
      const params = ctx.request.body

      const username = this.getUsername()
      const cate = await this.catModel.get(params.catid)

      const auth = await this.checkAuth(cate.project_id, 'project', 'edit')
      if (!auth) {
        return (ctx.body = yapi.commons.resReturn(null, 400, '没有权限'))
      }

      const result = await this.catModel.up(params.catid, {
        name: params.name,
        desc: params.desc,
        up_time: yapi.commons.time(),
      })

      yapi.commons.saveLog({
        content: `<a href="/user/profile/${this.getUid()}">${username}</a> 更新了分类 <a href="/project/${
          cate.project_id
        }/interface/api/cat_${params.catid}">${cate.name}</a>`,
        type: 'project',
        uid: this.getUid(),
        username: username,
        typeid: cate.project_id,
      })

      ctx.body = yapi.commons.resReturn(result)
    } catch (e) {
      ctx.body = yapi.commons.resReturn(null, 400, e.message)
    }
  }

  async delCat(ctx) {
    try {
      const id = ctx.request.body.catid
      const catData = await this.catModel.get(id)
      if (!catData) {
        ctx.body = yapi.commons.resReturn(null, 400, '不存在的分类')
      }

      if (catData.uid !== this.getUid()) {
        const auth = await this.checkAuth(catData.project_id, 'project', 'danger')
        if (!auth) {
          return (ctx.body = yapi.commons.resReturn(null, 400, '没有权限'))
        }
      }

      const username = this.getUsername()
      yapi.commons.saveLog({
        content: `<a href="/user/profile/${this.getUid()}">${username}</a> 删除了分类 "${
          catData.name
        }" 及该分类下的接口`,
        type: 'project',
        uid: this.getUid(),
        username: username,
        typeid: catData.project_id,
      })

      const interfaceData = await this.Model.listByCatid(id)

      interfaceData.forEach(async item => {
        try {
          yapi.emitHook('interface_del', item._id).then()
          await this.caseModel.delByInterfaceId(item._id)
        } catch (e) {
          yapi.commons.log(e.message, 'error')
        }
      })
      await this.catModel.del(id)
      const r = await this.Model.delByCatid(id)
      return (ctx.body = yapi.commons.resReturn(r))
    } catch (e) {
      yapi.commons.resReturn(null, 400, e.message)
    }
  }

  /**
   * 获取分类列表
   * @interface /interface/getCatMenu
   * @method GET
   * @category interface
   * @foldnumber 10
   * @param {Number}   project_id 项目id，不能为空
   * @returns {Object}
   * @example ./api/interface/getCatMenu
   */
  async getCatMenu(ctx) {
    const project_id = ctx.params.project_id

    if (!project_id || isNaN(project_id)) {
      return (ctx.body = yapi.commons.resReturn(null, 400, '项目id不能为空'))
    }

    try {
      const project = await this.projectModel.getBaseInfo(project_id)
      if (project.project_type === 'private') {
        if ((await this.checkAuth(project._id, 'project', 'edit')) !== true) {
          return (ctx.body = yapi.commons.resReturn(null, 406, '没有权限'))
        }
      }
      const res = await this.catModel.list(project_id)
      return (ctx.body = yapi.commons.resReturn(res))
    } catch (e) {
      yapi.commons.resReturn(null, 400, e.message)
    }
  }

  /**
   * 获取自定义接口字段数据
   * @interface /interface/get_custom_field
   * @method GET
   * @category interface
   * @foldnumber 10
   * @param {String}   app_code = '111'
   * @returns {Object}
   *
   */
  async getCustomField(ctx) {
    const params = ctx.request.query

    if (Object.keys(params).length !== 1) {
      return (ctx.body = yapi.commons.resReturn(null, 400, '参数数量错误'))
    }
    const customFieldName = Object.keys(params)[0]
    const customFieldValue = params[customFieldName]

    try {
      //  查找有customFieldName的分组（group）
      const groups = await this.groupModel.getcustomFieldName(customFieldName)
      if (groups.length === 0) {
        return (ctx.body = yapi.commons.resReturn(null, 404, '没有找到对应自定义接口'))
      }

      // 在每个分组（group）下查找对应project的id值
      const interfaces = []
      for (let i = 0; i < groups.length; i++) {
        const projects = await this.projectModel.list(groups[i]._id)

        // 在每个项目（project）中查找interface下的custom_field_value
        for (let j = 0; j < projects.length; j++) {
          const data = {}
          let inter = await this.Model.getcustomFieldValue(projects[j]._id, customFieldValue)
          if (inter.length > 0) {
            data.project_name = projects[j].name
            data.project_id = projects[j]._id
            inter = inter.map((item, i) => {
              inter[i] = inter[i].toObject()
              item = inter[i]
              item.res_body = yapi.commons.json_parse(item.res_body)
              item.req_body_other = yapi.commons.json_parse(item.req_body_other)

              return item
            })

            data.list = inter
            interfaces.push(data)
          }
        }
      }
      return (ctx.body = yapi.commons.resReturn(interfaces))
    } catch (e) {
      yapi.commons.resReturn(null, 400, e.message)
    }
  }

  requiredSort(params) {
    return params.sort((item1, item2) => item2.required - item1.required)
  }

  /**
   * 更新多个接口case index
   * @interface /interface/up_index
   * @method POST
   * @category col
   * @foldnumber 10
   * @param {Array}  [id, index]
   * @returns {Object}
   * @example
   */
  async upIndex(ctx) {
    try {
      const params = ctx.request.body
      if (!params || !Array.isArray(params)) {
        ctx.body = yapi.commons.resReturn(null, 400, '请求参数必须是数组')
      }
      params.forEach(item => {
        if (item.id) {
          this.Model.upIndex(item.id, item.index).then(
            () => { /* noop */ },
            err => {
              yapi.commons.log(err.message, 'error')
            },
          )
        }
      })

      return (ctx.body = yapi.commons.resReturn('成功！'))
    } catch (e) {
      ctx.body = yapi.commons.resReturn(null, 400, e.message)
    }
  }

  /**
   * 更新多个接口cat index
   * @interface /interface/up_cat_index
   * @method POST
   * @category col
   * @foldnumber 10
   * @param {Array}  [id, index]
   * @returns {Object}
   * @example
   */
  async upCatIndex(ctx) {
    try {
      const params = ctx.request.body
      if (!params || !Array.isArray(params)) {
        ctx.body = yapi.commons.resReturn(null, 400, '请求参数必须是数组')
      }
      params.forEach(item => {
        if (item.id) {
          this.catModel.upCatIndex(item.id, item.index).then(
            () => { /* noop */ },
            err => {
              yapi.commons.log(err.message, 'error')
            },
          )
        }
      })

      return (ctx.body = yapi.commons.resReturn('成功！'))
    } catch (e) {
      ctx.body = yapi.commons.resReturn(null, 400, e.message)
    }
  }

  schema2json(ctx) {
    const schema = ctx.request.body.schema
    const required = ctx.request.body.required

    const res = yapi.commons.schemaToJson(schema, {
      alwaysFakeOptionals: _.isUndefined(required) ? true : required,
    })
    // console.log('res',res)
    return (ctx.body = res)
  }

  // 获取开放接口数据
  async listByOpen(ctx) {
    const project_id = ctx.request.query.project_id

    if (!project_id) {
      return (ctx.body = yapi.commons.resReturn(null, 400, '项目id不能为空'))
    }

    const project = await this.projectModel.getBaseInfo(project_id)
    if (!project) {
      return (ctx.body = yapi.commons.resReturn(null, 406, '不存在的项目'))
    }
    if (project.project_type === 'private') {
      if ((await this.checkAuth(project._id, 'project', 'view')) !== true) {
        return (ctx.body = yapi.commons.resReturn(null, 406, '没有权限'))
      }
    }

    const basepath = project.basepath
    try {
      const result = await this.catModel.list(project_id)
      let newResult = []

      for (let i = 0, item, list; i < result.length; i++) {
        item = result[i].toObject()
        list = await this.Model.listByInterStatus(item._id, 'open')
        for (let j = 0; j < list.length; j++) {
          list[j] = list[j].toObject()
          list[j].basepath = basepath
        }

        newResult = [].concat(newResult, list)
      }

      ctx.body = yapi.commons.resReturn(newResult)
    } catch (err) {
      ctx.body = yapi.commons.resReturn(null, 402, err.message)
    }
  }
}

export default interfaceController
