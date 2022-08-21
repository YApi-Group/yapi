import { Context } from 'koa'

import SyncModel from '../models/autoSync'
import ProjectModel from '../models/project'
import SyncUtils from '../utils/autoSync'
import * as commons from '../utils/commons'
import * as inst from '../utils/inst'

import BaseController from './base'

class SyncController extends BaseController {
  syncModelIns: any
  projectModelIns: any
  syncUtils: any

  constructor(ctx: Context) {
    super(ctx)
    this.syncModelIns = inst.getInst(SyncModel)
    this.projectModelIns = inst.getInst(ProjectModel)
    this.syncUtils = inst.getInst(SyncUtils)
  }

  /**
   * 保存定时任务
   * @param {*} ctx
   */
  async upSync(ctx: Context) {
    const requestBody = ctx.request.body
    const projectId = requestBody.project_id
    if (!projectId) {
      return (ctx.body = commons.resReturn(null, 408, '缺少项目Id'))
    }

    if ((await this.checkAuth(projectId, 'project', 'edit')) !== true) {
      return (ctx.body = commons.resReturn(null, 405, '没有权限'))
    }

    let result
    if (requestBody.id) {
      result = await this.syncModelIns.up(requestBody)
    } else {
      result = await this.syncModelIns.save(requestBody)
    }

    // 操作定时任务
    if (requestBody.is_sync_open) {
      this.syncUtils.addSyncJob(
        projectId,
        requestBody.sync_cron,
        requestBody.sync_json_url,
        requestBody.sync_mode,
        requestBody.uid,
      )
    } else {
      this.syncUtils.deleteSyncJob(projectId)
    }
    return (ctx.body = commons.resReturn(result))
  }

  /**
   * 查询定时任务
   * @param {*} ctx
   */
  async getSync(ctx: Context) {
    const projectId = ctx.query.project_id
    if (!projectId) {
      return (ctx.body = commons.resReturn(null, 408, '缺少项目Id'))
    }
    const result = await this.syncModelIns.getByProjectId(projectId)
    return (ctx.body = commons.resReturn(result))
  }
}

export default SyncController
