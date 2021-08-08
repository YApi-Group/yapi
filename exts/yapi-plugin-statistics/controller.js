/**
 * Created by gxl.gao on 2017/10/24.
 */
const os = require('os')

const baseController = require('controllers/base.js')
const cpu = require('cpu-load')
const GroupModel = require('models/group.js')
const InterfaceModel = require('models/interface.js')
const interfaceCaseModel = require('models/interfaceCase.js')
const projectModel = require('models/project.js')
const yapi = require('yapi.js')

const statisMockModel = require('./statisMockModel.js')
const commons = require('./util.js')

const config = require('./index.js')

class statisMockController extends baseController {
  constructor(ctx) {
    super(ctx)
    this.Model = yapi.getInst(statisMockModel)
    this.GroupModel = yapi.getInst(GroupModel)
    this.projectModel = yapi.getInst(projectModel)
    this.InterfaceModel = yapi.getInst(InterfaceModel)
    this.interfaceCaseModel = yapi.getInst(interfaceCaseModel)
  }

  /**
   * 获取所有统计总数
   * @interface statismock/count
   * @method get
   * @category statistics
   * @foldnumber 10
   * @returns {Object}
   */
  async getStatisCount(ctx) {
    try {
      const groupCount = await this.GroupModel.getGroupListCount()
      const projectCount = await this.projectModel.getProjectListCount()
      const interfaceCount = await this.InterfaceModel.getInterfaceListCount()
      const interfaceCaseCount = await this.interfaceCaseModel.getInterfaceCaseListCount()

      return (ctx.body = yapi.commons.resReturn({
        groupCount,
        projectCount,
        interfaceCount,
        interfaceCaseCount,
      }))
    } catch (err) {
      ctx.body = yapi.commons.resReturn(null, 400, err.message)
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
  async getMockDateList(ctx) {
    try {
      const mockCount = await this.Model.getTotalCount()
      let mockDateList = []

      if (!this.getRole() === 'admin') {
        return (ctx.body = yapi.commons.resReturn(null, 405, '没有权限'))
      }
      //  默认时间是30 天为一周期
      const dateInterval = commons.getDateRange()
      mockDateList = await this.Model.getDayCount(dateInterval)
      return (ctx.body = yapi.commons.resReturn({ mockCount, mockDateList }))
    } catch (err) {
      ctx.body = yapi.commons.resReturn(null, 400, err.message)
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
  async getSystemStatus(ctx) {
    try {
      let mail = ''
      if (yapi.WEB_CONFIG.mail && yapi.WEB_CONFIG.mail.enable) {
        mail = await this.checkEmail()
        // return ctx.body = yapi.commons.resReturn(result);
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
      return (ctx.body = yapi.commons.resReturn(data))
    } catch (err) {
      ctx.body = yapi.commons.resReturn(null, 400, err.message)
    }
  }

  checkEmail() {
    return new Promise((resolve, reject) => {
      let result = {}
      yapi.mail.verify(error => {
        if (error) {
          result = '不可用'
          resolve(result)
        } else {
          result = '可用'
          resolve(result)
        }
      })
    })
  }

  async groupDataStatis(ctx) {
    try {
      const groupData = await this.GroupModel.list()
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

        const projectCount = await this.projectModel.listCount(groupId)
        const projectData = await this.projectModel.list(groupId)
        let interfaceCount = 0
        for (let j = 0; j < projectData.length; j++) {
          const project = projectData[j]
          interfaceCount += await this.InterfaceModel.listCount({
            project_id: project._id,
          })
        }
        const mockCount = await this.Model.countByGroupId(groupId)
        data.interface = interfaceCount
        data.project = projectCount
        data.mock = mockCount
      }
      return (ctx.body = yapi.commons.resReturn(result))
    } catch (err) {
      ctx.body = yapi.commons.resReturn(null, 400, err.message)
    }
  }

  cupLoad() {
    return new Promise((resolve, reject) => {
      cpu(1000, function (load) {
        resolve(load)
      })
    })
  }
}

module.exports = statisMockController
