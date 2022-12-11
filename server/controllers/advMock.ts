import { Context } from 'koa'

import AdvModel from '../models/advMockModel.js'
import CaseModel from '../models/caseModel.js'
import UserModel from '../models/user.js'
import * as commons from '../utils/commons'
import * as inst from '../utils/inst'

import BaseController from './base'

const HTTP_CODES = [
  100, 101, 102, 200, 201, 202, 203, 204, 205, 206, 207, 208, 226, 300, 301, 302, 303, 304, 305, 307, 308,
  400, 401, 402, 403, 404, 405, 406, 407, 408, 409, 410, 411, 412, 413, 414, 415, 416, 417, 418, 422, 423,
  424, 426, 428, 429, 431, 500, 501, 502, 503, 504, 505, 506, 507, 508, 510, 511,
]

export default class AdvMockController extends BaseController {
  advModel: any
  caseModel: any
  userModel: any

  constructor(ctx: Context) {
    super(ctx)
    this.advModel = inst.getInst(AdvModel)
    this.caseModel = inst.getInst(CaseModel)
    this.userModel = inst.getInst(UserModel)
  }

  async getMock(ctx: Context) {
    const id = ctx.query.interface_id
    const mockData = await this.advModel.get(id)
    if (!mockData) {
      return (ctx.body = commons.resReturn(null, 408, 'mock脚本不存在'))
    }
    return (ctx.body = commons.resReturn(mockData))
  }

  async upMock(ctx: Context) {
    const params = ctx.request.body
    try {
      const auth = await this.checkAuth(params.project_id, 'project', 'edit')

      if (!auth) {
        return (ctx.body = commons.resReturn(null, 40033, '没有权限'))
      }

      if (!params.interface_id) {
        return (ctx.body = commons.resReturn(null, 408, '缺少interface_id'))
      }
      if (!params.project_id) {
        return (ctx.body = commons.resReturn(null, 408, '缺少project_id'))
      }

      const data = {
        interface_id: params.interface_id,
        mock_script: params.mock_script || '',
        project_id: params.project_id,
        uid: this.getUid(),
        enable: params.enable === true,
      }
      let result
      const mockData = await this.advModel.get(data.interface_id)
      if (mockData) {
        result = await this.advModel.up(data)
      } else {
        result = await this.advModel.save(data)
      }
      return (ctx.body = commons.resReturn(result))
    } catch (e) {
      return (ctx.body = commons.resReturn(null, 400, e.message))
    }
  }

  async list(ctx: Context) {
    try {
      const id = ctx.query.interface_id
      if (!id) {
        return (ctx.body = commons.resReturn(null, 400, '缺少 interface_id'))
      }
      const result = await this.caseModel.list(id)
      for (let i = 0, len = result.length; i < len; i++) {
        const userinfo = await this.userModel.findById(result[i].uid)
        result[i] = result[i].toObject()
        // if (userinfo) {
        result[i].username = userinfo.username
        // }
      }

      ctx.body = commons.resReturn(result)
    } catch (err) {
      ctx.body = commons.resReturn(null, 400, err.message)
    }
  }

  async getCase(ctx: Context) {
    const id = ctx.query.id
    if (!id) {
      return (ctx.body = commons.resReturn(null, 400, '缺少 id'))
    }
    const result = await this.caseModel.get({
      _id: id,
    })

    ctx.body = commons.resReturn(result)
  }

  async saveCase(ctx: Context) {
    const params = ctx.request.body

    if (!params.interface_id) {
      return (ctx.body = commons.resReturn(null, 408, '缺少interface_id'))
    }
    if (!params.project_id) {
      return (ctx.body = commons.resReturn(null, 408, '缺少project_id'))
    }

    if (!params.res_body) {
      return (ctx.body = commons.resReturn(null, 408, '请输入 Response Body'))
    }

    const data = {
      interface_id: params.interface_id,
      project_id: params.project_id,
      ip_enable: params.ip_enable,
      name: params.name,
      params: params.params || [],
      uid: this.getUid(),
      code: params.code || 200,
      delay: params.delay || 0,
      headers: params.headers || [],
      up_time: commons.time(),
      res_body: params.res_body,
      ip: params.ip,
    }

    data.code = isNaN(data.code) ? 200 : Number(data.code)
    data.delay = isNaN(data.delay) ? 0 : Number(data.delay)
    if (HTTP_CODES.indexOf(data.code) === -1) {
      return (ctx.body = commons.resReturn(null, 408, '非法的 httpCode'))
    }

    const findRepeatParams: Record<string, any> = {
      project_id: data.project_id,
      interface_id: data.interface_id,
      ip_enable: data.ip_enable,
    }

    if (data.params && typeof data.params === 'object' && Object.keys(data.params).length > 0) {
      for (const [k, v] of Object.entries(data.params)) {
        findRepeatParams['params.' + k] = v
      }
    }

    if (data.ip_enable) {
      findRepeatParams.ip = data.ip
    }

    const findRepeat = await this.caseModel.get(findRepeatParams)
    if (findRepeat && findRepeat._id !== params.id) {
      return (ctx.body = commons.resReturn(null, 400, '已存在的期望'))
    }

    let result
    if (params.id && !isNaN(params.id)) {
      ;(data as any).id = Number(params.id)
      result = await this.caseModel.up(data)
    } else {
      result = await this.caseModel.save(data)
    }
    return (ctx.body = commons.resReturn(result))
  }

  async delCase(ctx: Context) {
    const id = ctx.request.body.id
    if (!id) {
      return (ctx.body = commons.resReturn(null, 408, '缺少 id'))
    }
    const result = await this.caseModel.del(id)
    return (ctx.body = commons.resReturn(result))
  }

  async hideCase(ctx: Context) {
    const id = ctx.request.body.id
    const enable = ctx.request.body.enable
    if (!id) {
      return (ctx.body = commons.resReturn(null, 408, '缺少 id'))
    }
    const data = {
      id,
      case_enable: enable,
    }
    const result = await this.caseModel.up(data)
    return (ctx.body = commons.resReturn(result))
  }
}
