import { schemaValidator } from '../../common/utils.js'
import InterfaceModel from '../models/interface.js'
import interfaceCaseModel from '../models/interfaceCase.js'
import interfaceColModel from '../models/interfaceCol.js'
import LogModel from '../models/log.js'
import projectModel from '../models/project.js'
import UserModel from '../models/user.js'
import * as inst from '../utils/inst.js'

import * as commons from './commons.js'

function convertString(variable: any) {
  if (variable instanceof Error) {
    return variable.name + ': ' + variable.message
  }
  try {
    if (variable && typeof variable === 'string') {
      return variable
    }
    return JSON.stringify(variable, null, '   ')
  } catch (err) {
    return variable || ''
  }
}

export async function getCaseList(id: any) {
  const caseInst = inst.getInst(interfaceCaseModel)
  const colInst = inst.getInst(interfaceColModel)
  const projectInst = inst.getInst(projectModel)
  const interfaceInst = inst.getInst(InterfaceModel)

  let resultList = await caseInst.list(id, 'all')
  const colData = await colInst.get(id)
  for (let index = 0; index < resultList.length; index++) {
    const result = resultList[index].toObject()
    const data = await interfaceInst.get(result.interface_id)
    if (!data) {
      await caseInst.del(result._id)
      continue
    }
    const projectData = await projectInst.getBaseInfo(data.project_id)
    result.path = projectData.basepath + data.path
    result.method = data.method
    result.title = data.title
    result.req_body_type = data.req_body_type
    result.req_headers = commons.handleParamsValue(data.req_headers, result.req_headers)
    result.res_body_type = data.res_body_type
    result.req_body_form = commons.handleParamsValue(data.req_body_form, result.req_body_form)
    result.req_query = commons.handleParamsValue(data.req_query, result.req_query)
    result.req_params = commons.handleParamsValue(data.req_params, result.req_params)
    resultList[index] = result
  }
  resultList = resultList.sort((a: any, b: any) => a.index - b.index)
  const ctxBody: any = commons.resReturn(resultList)
  ctxBody.colData = colData
  return ctxBody
}

export async function runCaseScript(params: any, colId: any, interfaceId: any) {
  const colInst = inst.getInst(interfaceColModel)
  const colData = await colInst.get(colId)
  const logs = []
  const context = {
    assert: require('assert'),
    status: params.response.status,
    body: params.response.body,
    header: params.response.header,
    records: params.records,
    params: params.params,
    log: (msg: any) => {
      logs.push('log: ' + convertString(msg))
    },
  }

  let result: any = {}
  try {
    if (colData.checkHttpCodeIs200) {
      const status = Number(params.response.status)
      if (status !== 200) {
        throw new Error('Http status code 不是 200，请检查(该规则来源于于 [测试集->通用规则配置] )')
      }
    }

    if (colData.checkResponseField.enable) {
      if (params.response.body[colData.checkResponseField.name] !== colData.checkResponseField.value) {
        throw new Error(
          `返回json ${colData.checkResponseField.name} 值不是${colData.checkResponseField.value}，请检查(该规则来源于于 [测试集->通用规则配置] )`
        )
      }
    }

    if (colData.checkResponseSchema) {
      const interfaceInst = inst.getInst(InterfaceModel)
      const interfaceData = await interfaceInst.get(interfaceId)
      if (interfaceData.res_body_is_json_schema && interfaceData.res_body) {
        const schema = JSON.parse(interfaceData.res_body)
        const result = schemaValidator(schema, context.body)
        if (!result.valid) {
          throw new Error(`返回Json 不符合 response 定义的数据结构,原因: ${result.message}
                  数据结构如下：
                  ${JSON.stringify(schema, null, 2)}`)
        }
      }
    }

    if (colData.checkScript.enable) {
      const globalScript = colData.checkScript.content
      // script 是断言
      if (globalScript) {
        logs.push('执行脚本：' + globalScript)
        result = commons.sandbox(context, globalScript)
      }
    }

    const script = params.script
    // script 是断言
    if (script) {
      logs.push('执行脚本:' + script)
      result = commons.sandbox(context, script)
    }
    result.logs = logs
    return commons.resReturn(result)
  } catch (err) {
    logs.push(convertString(err))
    result.logs = logs
    logs.push(err.name + ': ' + err.message)
    return commons.resReturn(result, 400, err.name + ': ' + err.message)
  }
}

export function saveLog(logData: any) {
  try {
    const logInst = inst.getInst(LogModel)
    const data = {
      content: logData.content,
      type: logData.type,
      uid: logData.uid,
      username: logData.username,
      typeid: logData.typeid,
      data: logData.data,
    }

    logInst.save(data).then()
  } catch (e) {
    commons.log(e, 'error'); // eslint-disable-line
  }
}

export async function getUserData(uid: any, role: any) {
  role = role || 'dev'
  const userInst = inst.getInst(UserModel)
  const userData = await userInst.findById(uid)
  if (!userData) {
    return null
  }
  return {
    role: role,
    uid: userData._id,
    username: userData.username,
    email: userData.email,
  }
}
