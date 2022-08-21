/**
 * Created by gxl.gao on 2017/10/24.
 */
import os from 'os'

import { Context } from 'koa'

import cons from '../cons'
import GroupModel from '../models/group.js'
import InterfaceModel from '../models/interface.js'
import InterfaceCaseModel from '../models/interfaceCase.js'
import ProjectModel from '../models/project.js'
import StatisticModel from '../models/statistic'
import * as commons from '../utils/commons'
import * as inst from '../utils/inst'

import BaseController from './base'

class StatisticController extends BaseController {
  private statInst: any = null
  private groupInst: any = null
  private projectInst: any = null
  private interfaceInst: any = null
  private interfaceCaseInst: any = null

  constructor(ctx: Context) {
    super(ctx)

    this.statInst = inst.getInst(StatisticModel)
    this.groupInst = inst.getInst(GroupModel)
    this.projectInst = inst.getInst(ProjectModel)
    this.interfaceInst = inst.getInst(InterfaceModel)
    this.interfaceCaseInst = inst.getInst(InterfaceCaseModel)
  }

  /**
     * 获取所有统计总数
     * @interface statismock/count
     * @method get
     * @category statistics
     * @foldnumber 10
     * @returns {Object}
     */
  async getStatisCount(ctx: Context) {
    try {
      const groupCount = await this.groupInst.getGroupListCount()
      const projectCount = await this.projectInst.getProjectListCount()
      const interfaceCount = await this.interfaceInst.getInterfaceListCount()
      const interfaceCaseCount = await this.interfaceCaseInst.getInterfaceCaseListCount()

      return (ctx.body = commons.resReturn({
        groupCount,
        projectCount,
        interfaceCount,
        interfaceCaseCount,
      }))
    } catch (err) {
      ctx.body = commons.resReturn(null, 400, err.message)
    }
  }

  /**
     * 获取所有mock接口数据信息
     * @interface statismock/get
     * @method get
     * @category statistics
     * @foldnumber 10
     * @returns {Object}
     */
  async getMockDateList(ctx: Context) {
    try {
      const mockCount = await this.statInst.getTotalCount()
      let mockDateList = []

      if (!(this.getRole() === 'admin')) {
        return (ctx.body = commons.resReturn(null, 405, '没有权限'))
      }
      //  默认时间是30 天为一周期
      const dateInterval = commons.getDateRange()
      mockDateList = await this.statInst.getDayCount(dateInterval)
      return (ctx.body = commons.resReturn({ mockCount, mockDateList }))
    } catch (err) {
      ctx.body = commons.resReturn(null, 400, err.message)
    }
  }

  /**
     * 获取邮箱状态信息
     * @interface statismock/getSystemStatus
     * @method get
     * @category statistics
     * @foldnumber 10
     * @returns {Object}
     */
  async getSystemStatus(ctx: Context) {
    try {
      let mail = ''
      if (cons.WEB_CONFIG.mail && cons.WEB_CONFIG.mail.enable) {
        mail = await this.checkEmail()
        // return ctx.body = commons.resReturn(result);
      } else {
        mail = '未配置'
      }

      const load = (await this.cupLoad()) * 100

      const systemName = os.platform()
      const totalmem = commons.transformBytesToGB(os.totalmem())
      const freemem = commons.transformBytesToGB(os.freemem())
      const uptime = commons.transformSecondsToDay(os.uptime())

      const data = {
        mail,
        systemName,
        totalmem,
        freemem,
        uptime,
        load: load.toFixed(2),
      }
      return (ctx.body = commons.resReturn(data))
    } catch (err) {
      ctx.body = commons.resReturn(null, 400, err.message)
    }
  }

  checkEmail(): Promise<string> {
    return new Promise(resolve => {
      cons.mail.verify(error => {
        if (error) {
          resolve('不可用')
        } else {
          resolve('可用')
        }
      })
    })
  }

  async groupDataStatis(ctx: Context) {
    try {
      const groupData = await this.groupInst.list()
      const result = []
      for (let i = 0; i < groupData.length; i++) {
        const group = groupData[i]
        const groupId = group._id
        const data = {
          name: group.group_name,
          interface: 0,
          mock: 0,
          project: 0,
        }
        result.push(data)

        const projectCount = await this.projectInst.listCount(groupId)
        const projectData = await this.projectInst.list(groupId)
        let interfaceCount = 0
        for (let j = 0; j < projectData.length; j++) {
          const project = projectData[j]
          interfaceCount += await this.interfaceInst.listCount({
            project_id: project._id,
          })
        }
        const mockCount = await this.statInst.countByGroupId(groupId)
        data.interface = interfaceCount
        data.project = projectCount
        data.mock = mockCount
      }
      return (ctx.body = commons.resReturn(result))
    } catch (err) {
      ctx.body = commons.resReturn(null, 400, err.message)
    }
  }

  cupLoad(): Promise<number> {
    return new Promise(resolve => {
      const start = os.cpus()

      setTimeout(function avgCpuLoadCompare() {
        const totals = os.cpus().reduce(function (totals, end, i) {
          const busy = end.times.user + end.times.sys - start[i].times.user - start[i].times.sys
          totals.total += busy + end.times.idle - start[i].times.idle
          totals.busy += busy
          return totals
        }, { busy: 0, total: 0 })

        resolve(totals.busy / totals.total)
      }, 1000)
    })
  }
}

export default StatisticController
