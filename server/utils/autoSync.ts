import axios from 'axios'
import { Context } from 'koa'
import md5 from 'md5'
import schedule from 'node-schedule'
import sha from 'sha.js'

import openController from '../controllers/open.js'
import syncModel from '../models/autoSync.js'
import projectModel from '../models/project.js'
import tokenModel from '../models/token.js'

import * as commons from './commons.js'
import * as inst from './inst.js'
import * as modelUtils from './modelUtils.js'
import * as time from './time.js'
import { getToken } from './token.js'

const jobMap = new Map()

type SyncModeType = 'good' | 'normal' | 'merge'

class SyncUtils {
  ctx: any
  openController: any
  syncModel: any
  tokenModel: any
  projectModel: any

  constructor(ctx: Context) {
    commons.log('----------swaggerSyncUtils constructor----------')
    this.ctx = ctx
    this.openController = inst.getInst(openController)
    this.syncModel = inst.getInst(syncModel)
    this.tokenModel = inst.getInst(tokenModel)
    this.projectModel = inst.getInst(projectModel)
    this.init()
  }

  // 初始化定时任务
  async init() {
    const allSyncJob = await this.syncModel.listAll()
    for (let i = 0, len = allSyncJob.length; i < len; i++) {
      const syncItem = allSyncJob[i]
      if (syncItem.is_sync_open) {
        this.addSyncJob(
          syncItem.project_id,
          syncItem.sync_cron,
          syncItem.sync_json_url,
          syncItem.sync_mode,
          syncItem.uid
        )
      }
    }
  }

  /**
   * 新增同步任务.
   * @param {*} projectId 项目id
   * @param {*} cronExpression cron表达式,针对定时任务
   * @param {*} swaggerUrl 获取swagger的地址
   * @param {*} syncMode 同步模式
   * @param {*} uid 用户id
   */
  async addSyncJob(
    projectId: number,
    cronExpression: string,
    swaggerUrl: string,
    syncMode: SyncModeType,
    uid: string
  ) {
    if (!swaggerUrl) {
      return
    }
    const projectToken = await this.getProjectToken(projectId, uid)
    // 立即执行一次
    this.syncInterface(projectId, swaggerUrl, syncMode, uid, projectToken)
    const scheduleItem = schedule.scheduleJob(cronExpression, () => {
      this.syncInterface(projectId, swaggerUrl, syncMode, uid, projectToken)
    })

    // 判断是否已经存在这个任务
    const jobItem = jobMap.get(projectId)
    if (jobItem) {
      jobItem.cancel()
    }
    jobMap.set(projectId, scheduleItem)
  }

  // 同步接口
  async syncInterface(
    projectId: number,
    swaggerUrl: string,
    syncMode: SyncModeType,
    uid: string,
    projectToken: string
  ) {
    commons.log('定时器触发, syncJsonUrl:' + swaggerUrl + ',合并模式:' + syncMode)
    let oldPorjectData
    try {
      oldPorjectData = await this.projectModel.get(projectId)
    } catch (e) {
      commons.log('获取项目:' + projectId + '失败')
      this.deleteSyncJob(projectId)
      // 删除数据库定时任务
      await this.syncModel.delByProjectId(projectId)
      return
    }
    // 如果项目已经删除了
    if (!oldPorjectData) {
      commons.log('项目:' + projectId + '不存在')
      this.deleteSyncJob(projectId)
      // 删除数据库定时任务
      await this.syncModel.delByProjectId(projectId)
      return
    }
    let newSwaggerJsonData
    try {
      newSwaggerJsonData = await this.getSwaggerContent(swaggerUrl)
      if (!newSwaggerJsonData || typeof newSwaggerJsonData !== 'object') {
        commons.log('数据格式出错，请检查')
        this.saveSyncLog(0, syncMode, '数据格式出错，请检查', uid, projectId)
      }
      newSwaggerJsonData = JSON.stringify(newSwaggerJsonData)
    } catch (e) {
      this.saveSyncLog(0, syncMode, '获取数据失败，请检查', uid, projectId)
      commons.log('获取数据失败' + e.message)
    }

    const oldSyncJob = await this.syncModel.getByProjectId(projectId)

    // 更新之前判断本次swagger json数据是否跟上次的相同,相同则不更新
    if (
      newSwaggerJsonData &&
      oldSyncJob.old_swagger_content &&
      oldSyncJob.old_swagger_content === md5(newSwaggerJsonData)
    ) {
      // 记录日志
      // this.saveSyncLog(0, syncMode, "接口无更新", uid, projectId);
      oldSyncJob.last_sync_time = time.time()
      await this.syncModel.upById(oldSyncJob._id, oldSyncJob)
      return
    }

    const _params = {
      type: 'swagger',
      json: newSwaggerJsonData,
      project_id: projectId,
      merge: syncMode,
      token: projectToken,
    }
    const requestObj: any = {
      params: _params,
    }
    await this.openController.importData(requestObj)

    // 同步成功就更新同步表的数据
    if (requestObj.body.errcode === 0) {
      // 修改sync_model的属性
      oldSyncJob.last_sync_time = time.time()
      oldSyncJob.old_swagger_content = md5(newSwaggerJsonData)
      await this.syncModel.upById(oldSyncJob._id, oldSyncJob)
    }
    // 记录日志
    this.saveSyncLog(requestObj.body.errcode, syncMode, requestObj.body.errmsg, uid, projectId)
  }

  getSyncJob(projectId: number) {
    return jobMap.get(projectId)
  }

  deleteSyncJob(projectId: number) {
    const jobItem = jobMap.get(projectId)
    if (jobItem) {
      jobItem.cancel()
    }
  }

  /** 记录同步日志 */
  saveSyncLog(errcode: number, syncMode: SyncModeType, moremsg: string, uid: string, projectId: number) {
    modelUtils.saveLog({
      content:
        '自动同步接口状态:' +
        (errcode === 0 ? '成功,' : '失败,') +
        '合并模式:' +
        this.getSyncModeName(syncMode) +
        ',更多信息:' +
        moremsg,
      type: 'project',
      uid: uid,
      username: '自动同步用户',
      typeid: projectId,
    })
  }

  /**
   * 获取项目token,因为导入接口需要鉴权.
   * @param {*} projectId 项目id
   * @param {*} uid 用户id
   */
  async getProjectToken(projectId: number, uid: string) {
    try {
      const data = await this.tokenModel.get(projectId)
      let token
      if (!data) {
        const passsalt = commons.randStr()
        token = sha('sha1').update(passsalt).digest('hex').substr(0, 20)

        await this.tokenModel.save({ projectId, token })
      } else {
        token = data.token
      }

      token = getToken(token, uid)

      return token
    } catch (err) {
      return ''
    }
  }

  getUid(uid: string) {
    return parseInt(uid, 10)
  }

  /**
   * 转换合并模式的值为中文.
   * @param {*} syncMode 合并模式
   */
  getSyncModeName(syncMode: SyncModeType) {
    if (syncMode === 'good') {
      return '智能合并'
    } else if (syncMode === 'normal') {
      return '普通模式'
    } else if (syncMode === 'merge') {
      return '完全覆盖'
    }
    return ''
  }

  async getSwaggerContent(swaggerUrl: string) {
    try {
      const response = await axios.get(swaggerUrl)
      if (response.status > 400) {
        throw new Error(`http status "${response.status}" 获取数据失败，请确认 swaggerUrl 是否正确`)
      }
      return response.data
    } catch (e) {
      const response = e.response || { status: e.message || 'error' }
      throw new Error(`http status "${response.status}" 获取数据失败，请确认 swaggerUrl 是否正确`)
    }
  }
}

export default SyncUtils
