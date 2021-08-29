import path from 'path'

import fs from 'fs-extra'
import mongoose from 'mongoose'

import cons from './cons'
import UserModel from './models/user.js'
import * as commons from './utils/commons.js'
import dbModule from './utils/db.js'
import yapi from './yapi.js'

const connect = dbModule.connect()

yapi.connect = connect

function install() {
  const exist = commons.fileExist(path.join(cons.WEB_ROOT, 'init.lock'))

  if (exist) {
    throw new Error('init.lock文件已存在，请确认您是否已安装。如果需要重新安装，请删掉init.lock文件')
  }

  //   setupSql()
  // }
  // function setupSql() {

  const userInst = cons.getInst(UserModel)
  const passsalt = commons.randStr()
  const result = userInst.save({
    username: cons.WEB_CONFIG.adminAccount.substr(0, cons.WEB_CONFIG.adminAccount.indexOf('@')),
    email: cons.WEB_CONFIG.adminAccount,
    password: commons.generatePassword(cons.WEB_CONFIG.adminPassword, passsalt),
    passsalt: passsalt,
    role: 'admin',
    add_time: commons.time(),
    up_time: commons.time(),
  })

  connect
    .then(function () {
      const userCol = mongoose.connection.db.collection('user')
      userCol.createIndex({ username: 1 })
      userCol.createIndex({ email: 1 }, { unique: true })

      const projectCol = mongoose.connection.db.collection('project')
      projectCol.createIndex({ uid: 1 })
      projectCol.createIndex({ name: 1 })
      projectCol.createIndex({ group_id: 1 })

      const logCol = mongoose.connection.db.collection('log')
      logCol.createIndex({ uid: 1 })

      logCol.createIndex({ typeid: 1, type: 1 })

      const interfaceColCol = mongoose.connection.db.collection('interface_col')
      interfaceColCol.createIndex({ uid: 1 })
      interfaceColCol.createIndex({ project_id: 1 })

      const interfaceCatCol = mongoose.connection.db.collection('interface_cat')
      interfaceCatCol.createIndex({ uid: 1 })
      interfaceCatCol.createIndex({ project_id: 1 })

      const interfaceCaseCol = mongoose.connection.db.collection('interface_case')
      interfaceCaseCol.createIndex({ uid: 1 })
      interfaceCaseCol.createIndex({ col_id: 1 })
      interfaceCaseCol.createIndex({ project_id: 1 })

      const interfaceCol = mongoose.connection.db.collection('interface')
      interfaceCol.createIndex({ uid: 1 })
      interfaceCol.createIndex({ path: 1, method: 1 })
      interfaceCol.createIndex({ project_id: 1 })

      const groupCol = mongoose.connection.db.collection('group')
      groupCol.createIndex({ uid: 1 })
      groupCol.createIndex({ group_name: 1 })

      const avatarCol = mongoose.connection.db.collection('avatar')
      avatarCol.createIndex({ uid: 1 })

      const tokenCol = mongoose.connection.db.collection('token')
      tokenCol.createIndex({ project_id: 1 })

      const followCol = mongoose.connection.db.collection('follow')
      followCol.createIndex({ uid: 1 })
      followCol.createIndex({ project_id: 1 })

      const statCol = mongoose.connection.db.collection('statistic')
      statCol.createIndex({ interface_id: 1 })
      statCol.createIndex({ project_id: 1 })
      statCol.createIndex({ group_id: 1 })
      statCol.createIndex({ time: 1 })
      statCol.createIndex({ date: 1 })

      result.then(
        function () {
          fs.ensureFileSync(path.join(cons.WEB_ROOT, 'init.lock'))
          console.log(`初始化管理员账号成功,账号名："${cons.WEB_CONFIG.adminAccount}"，密码："${cons.WEB_CONFIG.adminPassword}"`)
          process.exit(0)
        },
        function (err) {
          throw new Error(`初始化管理员账号 "${cons.WEB_CONFIG.adminAccount}" 失败, ${err.message}`); // eslint-disable-line
        },
      )
    })
    .catch(function (err) {
      throw new Error(err.message)
    })
}

install()
