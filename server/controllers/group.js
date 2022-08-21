import _ from 'underscore'

import GroupModel from '../models/group.js'
import InterfaceModel from '../models/interface.js'
import interfaceCaseModel from '../models/interfaceCase.js'
import interfaceColModel from '../models/interfaceCol.js'
import projectModel from '../models/project.js'
import UserModel from '../models/user.js'
import * as commons from '../utils/commons'
import * as inst from '../utils/inst'
import * as modelUtils from '../utils/modelUtils'

import baseController from './base'

const rolename = {
  owner: '组长',
  dev: '开发者',
  guest: '访客',
}

class groupController extends baseController {
  constructor(ctx) {
    super(ctx)

    const id = 'number'
    const group_name = {
      type: 'string',
      minLength: 1,
    }

    const group_desc = 'string'
    const role = {
      type: 'string',
      enum: ['owner', 'dev', 'guest'],
    }

    const member_uids = {
      type: 'array',
      items: 'number',
      minItems: 1,
    }

    this.schemaMap = {
      get: {
        '*id': id,
      },
      add: {
        '*group_name': group_name,
        'group_desc': group_desc,
        'owner_uids': ['number'],
      },
      addMember: {
        '*id': id,
        'role': role,
        '*member_uids': member_uids,
      },
      changeMemberRole: {
        '*member_uid': 'number',
        '*id': id,
        'role': role,
      },
      getMemberList: {
        '*id': id,
      },
      delMember: {
        '*id': id,
        '*member_uid': 'number',
      },
      del: {
        '*id': id,
      },
      up: {
        '*id': id,
        '*group_name': group_name,
        'group_desc': group_desc,
        'custom_field1': {
          name: 'string',
          enable: 'boolen',
        },
        'custom_field2': {
          name: 'string',
          enable: 'boolen',
        },
        'custom_field3': {
          name: 'string',
          enable: 'boolen',
        },
      },
    }
  }

  /**
   * 查询项目分组
   * @interface /group/get
   * @method GET
   * @category group
   * @foldnumber 10
   * @param {String} id 项目分组ID
   * @returns {Object}
   * @example
   */
  async get(ctx) {
    const params = ctx.params

    const groupInst = inst.getInst(GroupModel)
    let result = await groupInst.getGroupById(params.id)
    if (result) {
      result = result.toObject()
      const role = await this.getProjectRole(params.id, 'group')
      result.role = role
      if (result.type === 'private') {
        result.group_name = '个人空间'
      }
      ctx.body = commons.resReturn(result)
    }
  }

  /**
   * 添加项目分组
   * @interface /group/add
   * @method POST
   * @category group
   * @foldnumber 10
   * @param {String} group_name 项目分组名称，不能为空
   * @param {String} [group_desc] 项目分组描述
   * @param {String} [owner_uids]  组长[uid]
   * @returns {Object}
   * @example ./api/group/add.json
   */
  async add(ctx) {
    const params = ctx.params

    // 新版每个人都有权限添加分组

    // if (this.getRole() !== 'admin') {
    //   return (ctx.body = commons.resReturn(null, 401, '没有权限'));
    // }

    const owners = []

    if (params.owner_uids.length === 0) {
      params.owner_uids.push(this.getUid())
    }

    if (params.owner_uids) {
      for (let i = 0, len = params.owner_uids.length; i < len; i++) {
        const id = params.owner_uids[i]
        const groupUserdata = await this.getUserData(id, 'owner')
        if (groupUserdata) {
          owners.push(groupUserdata)
        }
      }
    }

    const groupInst = inst.getInst(GroupModel)

    const checkRepeat = await groupInst.checkRepeat(params.group_name)

    if (checkRepeat > 0) {
      return (ctx.body = commons.resReturn(null, 401, '项目分组名已存在'))
    }

    const data = {
      group_name: params.group_name,
      group_desc: params.group_desc,
      uid: this.getUid(),
      add_time: commons.time(),
      up_time: commons.time(),
      members: owners,
    }

    let result = await groupInst.save(data)
    result = commons.fieldSelect(result, [
      '_id',
      'group_name',
      'group_desc',
      'uid',
      'members',
      'type',
    ])
    const username = this.getUsername()
    modelUtils.saveLog({
      content: `<a href="/user/profile/${this.getUid()}">${username}</a> 新增了分组 <a href="/group/${result._id
      }">${params.group_name}</a>`,
      type: 'group',
      uid: this.getUid(),
      username: username,
      typeid: result._id,
    })
    ctx.body = commons.resReturn(result)
  }

  /**
   * 获取用户数据
   * @param uid
   * @param role
   * @returns {Promise.<*>}
   */

  async getUserData(uid, role) {
    role = role || 'dev'
    const userInst = inst.getInst(UserModel)
    const userData = await userInst.findById(uid)
    if (!userData) {
      return null
    }
    return {
      _role: userData.role,
      role: role,
      uid: userData._id,
      username: userData.username,
      email: userData.email,
    }
  }

  async getMyGroup(ctx) {
    const groupInst = inst.getInst(GroupModel)
    let privateGroup = await groupInst.getByPrivateUid(this.getUid())
    if (!privateGroup) {
      privateGroup = await groupInst.save({
        uid: this.getUid(),
        group_name: 'User-' + this.getUid(),
        add_time: commons.time(),
        up_time: commons.time(),
        type: 'private',
      })
    }
    if (privateGroup) {
      ctx.body = commons.resReturn(privateGroup)
    } else {
      ctx.body = commons.resReturn(null)
    }
  }

  /**
   * 添加项目分组成员
   * @interface /group/add_member
   * @method POST
   * @category group
   * @foldnumber 10
   * @param {String} id 项目分组id
   * @param {String} member_uids 项目分组成员[uid]
   * @param {String} role 成员角色，owner or dev or guest
   * @returns {Object}
   * @example
   */
  async addMember(ctx) {
    const params = ctx.params
    const groupInst = inst.getInst(GroupModel)

    params.role = ['owner', 'dev', 'guest'].find(v => v === params.role) || 'dev'
    const add_members = []
    const exist_members = []
    const no_members = []
    for (let i = 0, len = params.member_uids.length; i < len; i++) {
      const id = params.member_uids[i]
      const check = await groupInst.checkMemberRepeat(params.id, id)
      const userdata = await this.getUserData(id, params.role)
      if (check > 0) {
        exist_members.push(userdata)
      } else if (!userdata) {
        no_members.push(id)
      } else {
        userdata.role !== 'admin' && add_members.push(userdata)
        delete userdata._role
      }
    }

    const result = await groupInst.addMember(params.id, add_members)
    const username = this.getUsername()
    if (add_members.length) {
      let members = add_members.map(item => `<a href = "/user/profile/${item.uid}">${item.username}</a>`)
      members = members.join('、')
      modelUtils.saveLog({
        content: `<a href="/user/profile/${this.getUid()}">${username}</a> 新增了分组成员 ${members} 为 ${rolename[params.role]
        }`,
        type: 'group',
        uid: this.getUid(),
        username: username,
        typeid: params.id,
      })
    }
    ctx.body = commons.resReturn({
      result,
      add_members,
      exist_members,
      no_members,
    })
  }

  /**
   * 修改项目分组成员角色
   * @interface /group/change_member_role
   * @method POST
   * @category group
   * @foldnumber 10
   * @param {String} id 项目分组id
   * @param {String} member_uid 项目分组成员uid
   * @param {String} role 权限 ['owner'|'dev']
   * @returns {Object}
   * @example
   */
  async changeMemberRole(ctx) {
    const params = ctx.request.body
    const groupInst = inst.getInst(GroupModel)

    const check = await groupInst.checkMemberRepeat(params.id, params.member_uid)
    if (check === 0) {
      return (ctx.body = commons.resReturn(null, 400, '分组成员不存在'))
    }
    if ((await this.checkAuth(params.id, 'group', 'danger')) !== true) {
      return (ctx.body = commons.resReturn(null, 405, '没有权限'))
    }

    params.role = ['owner', 'dev', 'guest'].find(v => v === params.role) || 'dev'

    const result = await groupInst.changeMemberRole(params.id, params.member_uid, params.role)
    const username = this.getUsername()

    const groupUserdata = await this.getUserData(params.member_uid, params.role)
    modelUtils.saveLog({
      content: `<a href="/user/profile/${this.getUid()}">${username}</a> 更改了分组成员 <a href="/user/profile/${params.member_uid
      }">${groupUserdata ? groupUserdata.username : ''}</a> 的权限为 "${rolename[params.role]}"`,
      type: 'group',
      uid: this.getUid(),
      username: username,
      typeid: params.id,
    })
    ctx.body = commons.resReturn(result)
  }

  /**
   * 获取所有项目成员
   * @interface /group/get_member_list
   * @method GET
   * @category group
   * @foldnumber 10
   * @param {String} id 项目分组id
   * @returns {Object}
   * @example
   */

  async getMemberList(ctx) {
    const params = ctx.params
    const groupInst = inst.getInst(GroupModel)
    const group = await groupInst.get(params.id)
    ctx.body = commons.resReturn(group.members)
  }

  /**
   * 删除项目成员
   * @interface /group/del_member
   * @method POST
   * @category group
   * @foldnumber 10
   * @param {String} id 项目分组id
   * @param {String} member_uid 项目分组成员uid
   * @returns {Object}
   * @example
   */

  async delMember(ctx) {
    const params = ctx.params
    const groupInst = inst.getInst(GroupModel)
    const check = await groupInst.checkMemberRepeat(params.id, params.member_uid)
    if (check === 0) {
      return (ctx.body = commons.resReturn(null, 400, '分组成员不存在'))
    }
    if ((await this.checkAuth(params.id, 'group', 'danger')) !== true) {
      return (ctx.body = commons.resReturn(null, 405, '没有权限'))
    }

    const result = await groupInst.delMember(params.id, params.member_uid)
    const username = this.getUsername()

    const groupUserdata = await this.getUserData(params.member_uid, params.role)
    modelUtils.saveLog({
      content: `<a href="/user/profile/${this.getUid()}">${username}</a> 删除了分组成员 <a href="/user/profile/${params.member_uid
      }">${groupUserdata ? groupUserdata.username : ''}</a>`,
      type: 'group',
      uid: this.getUid(),
      username: username,
      typeid: params.id,
    })
    ctx.body = commons.resReturn(result)
  }

  /**
   * 获取项目分组列表
   * @interface /group/list
   * @method get
   * @category group
   * @foldnumber 10
   * @returns {Object}
   * @example ./api/group/list.json
   */
  async list(ctx) {
    const groupInst = inst.getInst(GroupModel)
    const projectInst = inst.getInst(projectModel)

    let privateGroup = await groupInst.getByPrivateUid(this.getUid())
    const newResult = []

    if (!privateGroup) {
      privateGroup = await groupInst.save({
        uid: this.getUid(),
        group_name: 'User-' + this.getUid(),
        add_time: commons.time(),
        up_time: commons.time(),
        type: 'private',
      })
    }

    if (this.getRole() === 'admin') {
      const result = await groupInst.list()
      if (result && result.length > 0) {
        for (let i = 0; i < result.length; i++) {
          result[i] = result[i].toObject()
          newResult.unshift(result[i])
        }
      }
    } else {
      const result = await groupInst.getAuthList(this.getUid())
      if (result && result.length > 0) {
        for (let i = 0; i < result.length; i++) {
          result[i] = result[i].toObject()
          newResult.unshift(result[i])
        }
      }

      const groupIds = newResult.map(item => item._id)
      const newGroupIds = []

      const groupByProject = await projectInst.getAuthList(this.getUid())
      if (groupByProject && groupByProject.length > 0) {
        groupByProject.forEach(_data => {
          const _temp = [...groupIds, ...newGroupIds]
          if (!_.find(_temp, id => id === _data.group_id)) {
            newGroupIds.push(_data.group_id)
          }
        })
      }
      const newData = await groupInst.findByGroups(newGroupIds)
      newData.forEach(_data => {
        _data = _data.toObject()
        newResult.push(_data)
      })
    }
    if (privateGroup) {
      privateGroup = privateGroup.toObject()
      privateGroup.group_name = '个人空间'
      privateGroup.role = 'owner'
      newResult.unshift(privateGroup)
    }

    ctx.body = commons.resReturn(newResult)
  }

  /**
   * 删除项目分组
   * @interface /group/del
   * @method post
   * @param {String} id 项目分组id
   * @category group
   * @foldnumber 10
   * @returns {Object}
   * @example ./api/group/del.json
   */
  async del(ctx) {
    if (this.getRole() !== 'admin') {
      return (ctx.body = commons.resReturn(null, 401, '没有权限'))
    }

    const groupInst = inst.getInst(GroupModel)
    const projectInst = inst.getInst(projectModel)
    const interfaceInst = inst.getInst(InterfaceModel)
    const interfaceColInst = inst.getInst(interfaceColModel)
    const interfaceCaseInst = inst.getInst(interfaceCaseModel)
    const id = ctx.params.id

    const projectList = await projectInst.list(id, true)
    projectList.forEach(async p => {
      await interfaceInst.delByProjectId(p._id)
      await interfaceCaseInst.delByProjectId(p._id)
      await interfaceColInst.delByProjectId(p._id)
    })
    if (projectList.length > 0) {
      await projectInst.delByGroupid(id)
    }

    const result = await groupInst.del(id)
    ctx.body = commons.resReturn(result)
  }

  /**
   * 更新项目分组
   * @interface /group/up
   * @method post
   * @param {String} id 项目分组id
   * @param {String} group_name 项目分组名称
   * @param {String} group_desc 项目分组描述
   * @category group
   * @foldnumber 10
   * @returns {Object}
   * @example ./api/group/up.json
   */
  async up(ctx) {
    const groupInst = inst.getInst(GroupModel)
    const params = ctx.params

    if ((await this.checkAuth(params.id, 'group', 'danger')) !== true) {
      return (ctx.body = commons.resReturn(null, 405, '没有权限'))
    }

    const result = await groupInst.up(params.id, params)
    const username = this.getUsername()
    modelUtils.saveLog({
      content: `<a href="/user/profile/${this.getUid()}">${username}</a> 更新了 <a href="/group/${params.id
      }">${params.group_name}</a> 分组`,
      type: 'group',
      uid: this.getUid(),
      username: username,
      typeid: params.id,
    })
    ctx.body = commons.resReturn(result)
  }
}

export default groupController
