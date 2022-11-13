import URL from 'url'

import { message } from 'antd'
// @ts-ignore
import generateSchema from 'generate-schema/src/schemas/json.js'

import { json_parse, unbase64 } from '@common/utils.js'

import { RunFuncReturn } from './type'

function transformJsonToSchema(json: any) {
  json = json || {}
  let jsonData = json_parse(json)

  jsonData = generateSchema(jsonData)

  const schemaData = JSON.stringify(jsonData)
  return schemaData
}

function checkInterRepeat(interData: Record<string, any>) {
  const obj: Record<string, any> = {}
  const arr: any[] = []
  for (const item of Object.keys(interData)) {
    // console.log(interData[item].url + "-" + interData[item].method);
    const key = interData[item].request.url + '|' + interData[item].request.method
    if (!obj[key]) {
      arr.push(interData[item])
      obj[key] = true
    }
  }
  return arr
}

function handleReqQuery(query: Record<string, any>) {
  const res = []
  if (query && query.length) {
    for (const item of Object.keys(query)) {
      res.push({
        name: query[item].name,
        value: query[item].value,
      })
    }
  }
  return res
}
// function handleReq_headers(headers){
//   let res = [];
//   if(headers&&headers.length){
//     for(let item in headers){
//       res.push({
//         name: headers[item].key,
//         desc: headers[item].description,
//         value: headers[item].value,
//         required: headers[item].enable
//       });
//     }
//   }
//   return res;
// }

function handleReqBodyForm(formObj: Record<string, any>) {
  const res = []
  if (formObj && typeof formObj === 'object') {
    for (const item of Object.keys(formObj)) {
      res.push({
        name: formObj[item].name,
        value: formObj[item].value,
        type: 'text',
      })
    }
  }
  return res
}

function handlePath(path: string) {
  path = URL.parse(path).pathname
  path = decodeURIComponent(path)
  if (!path) {
    return ''
  }

  path = path.replace(/{{\w*}}/g, '')

  if (path[0] !== '/') {
    path = '/' + path
  }
  return path
}

function run(res: any) {
  try {
    res = JSON.parse(res)
    res = res.log.entries

    res = res.filter((item: any) => {
      if (!item) {
        return false
      }
      return item.response.content.mimeType.indexOf('application/json') === 0
    })

    const interfaceData: RunFuncReturn = { apis: [], cats: [] }
    res = checkInterRepeat(res)
    if (res && res.length) {
      for (const item of Object.keys(res)) {
        const data = importHar(res[item])
        interfaceData.apis.push(data)
      }
    }

    return interfaceData
  } catch (e) {
    console.error(e)
    message.error('数据格式有误')
  }
}

function importHar(data: any, key?: string[]) {
  const reflect = {
    // 数据字段映射关系
    title: 'url',
    path: 'url',
    method: 'method',
    desc: 'description',
    req_query: 'queryString',
    req_body_form: 'params',
    req_body_other: 'text',
  }
  const allKey = [
    'title',
    'path',
    'method',
    'req_query',
    'req_body_type',
    'req_body_form',
    'req_body_other',
    'res_body_type',
    'res_body',
    'req_headers',
  ]
  key = key || allKey
  const res: Record<string, any> = {}

  let reqType = 'json'
  let header = ''
  data.request.headers.forEach((item: any): void => {
    if (!item || !item.name || !item.value) {
      return null
    }
    if (/content-type/i.test(item.name) && item.value.indexOf('application/json') === 0) {
      reqType = 'json'
      header = 'application/json'
    } else if (
      /content-type/i.test(item.name)
      && item.value.indexOf('application/x-www-form-urlencoded') === 0
    ) {
      header = 'application/x-www-form-urlencoded'
      reqType = 'form'
    } else if (/content-type/i.test(item.name) && item.value.indexOf('multipart/form-data') === 0) {
      header = 'multipart/form-data'
      reqType = 'form'
    }
  })

  for (const item of key) {
    if (item === 'req_query') {
      res[item] = handleReqQuery(data.request[reflect[item]])
    } else if (item === 'req_body_form' && reqType === 'form' && data.request.postData) {
      if (header === 'application/x-www-form-urlencoded') {
        res[item] = handleReqBodyForm(data.request.postData[reflect[item]])
      } else if (header === 'multipart/form-data') {
        res[item] = []
      }
    } else if (item === 'req_body_other' && reqType === 'json' && data.request.postData) {
      res.req_body_is_json_schema = true
      res[item] = transformJsonToSchema(data.request.postData.text)
    } else if (item === 'req_headers') {
      res[item] = [
        {
          name: 'Content-Type',
          value: header,
        },
      ]
    } else if (item === 'req_body_type') {
      res[item] = reqType
    } else if (item === 'path') {
      res[item] = handlePath(data.request[reflect[item]])
    } else if (item === 'title') {
      const path = handlePath(data.request[reflect.path])
      if (data.request[reflect[item]].indexOf(path) > -1) {
        res[item] = path
        if (res[item] && res[item].indexOf('/:') > -1) {
          res[item] = res[item].substr(0, res[item].indexOf('/:'))
        }
      } else {
        res[item] = data.request[reflect[item]]
      }
    } else if (item === 'res_body_type') {
      res[item] = 'json'
    } else if (item === 'res_body') {
      res.res_body_is_json_schema = true
      if (data.response.content.encoding && data.response.content.encoding === 'base64') {
        // base64
        res[item] = transformJsonToSchema(unbase64(data.response.content.text))
      } else {
        res[item] = transformJsonToSchema(data.response.content.text)
      }
    } else {
      res[item] = data.request[reflect[item as (keyof typeof reflect)]]
    }
  }
  return res
}

export default {
  name: 'HAR',
  desc: '使用chrome录制请求功能，具体使用请查看文档',
  run: run,
}
