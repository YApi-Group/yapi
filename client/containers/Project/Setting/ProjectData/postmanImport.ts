import URL from 'url'

import { message } from 'antd'
// @ts-ignore
import generateSchema from 'generate-schema/src/schemas/json'
import _ from 'underscore'

import { RunFuncReturn } from './type'

let folders: any[] = []

function jsonParse(json: any) {
  try {
    return JSON.parse(json)
  } catch (err) {
    return json
  }
}

function parseUrl(url: string) {
  return URL.parse(url)
}

function checkInterRepeat(interData: any) {
  const obj: any = {}
  const arr: any[] = []
  for (const item in interData) {
    // console.log(interData[item].url + "-" + interData[item].method);
    if (!obj[interData[item].url + '-' + interData[item].method + '-' + interData[item].method]) {
      arr.push(interData[item])
      obj[interData[item].url + '-' + interData[item].method + '-' + interData[item].method] = true
    }
  }
  return arr
}

function handleReqQuery(query: any) {
  const res = []
  if (query && query.length) {
    for (const item of Object.values(query) as any) {
      res.push({
        name: item.key,
        desc: item.description,
        // example: item.value,
        value: item.value,
        required: item.enabled ? '1' : '0',
      })
    }
  }
  return res
}

function handleReqHeaders(headers: any) {
  const res = []
  if (headers && headers.length) {
    for (const item of Object.values(headers) as any) {
      res.push({
        name: item.key,
        desc: item.description,
        value: item.value,
        required: item.enabled ? '1' : '0',
      })
    }
  }
  return res
}

function handleReqBodyForm(form: any) {
  const res = []
  if (form && form.length) {
    for (const item of Object.values(form) as any) {
      res.push({
        name: item.key,
        // example: item.value,
        value: item.value,
        type: item.type,
        required: item.enabled ? '1' : '0',
        desc: item.description,
      })
    }
  }
  return res
}

function handlePath(path: string) {
  path = parseUrl(path).pathname
  path = decodeURIComponent(path)
  if (!path) {
    return ''
  }

  path = path.replace(/\{\{.*\}\}/g, '')

  if (path[0] !== '/') {
    path = '/' + path
  }
  return path
}

function run(res: any) {
  try {
    res = JSON.parse(res)
    let interData = res.requests
    const interfaceData: RunFuncReturn = { apis: [], cats: [] }
    interData = checkInterRepeat(interData)

    if (res.folders && Array.isArray(res.folders)) {
      res.folders.forEach((tag: any) => {
        interfaceData.cats.push({
          name: tag.name,
          desc: tag.description,
        })
      })
    }

    if (_.find(res.folders, item => item.collectionId === res.id)) {
      folders = res.folders
    }

    if (interData && interData.length) {
      for (const item of Object.values(interData)) {
        const data = importPostman(item)
        interfaceData.apis.push(data)
      }
    }

    return interfaceData
  } catch (e) {
    message.error('文件格式必须为JSON')
  }
}

const reflect = {
  // 数据字段映射关系
  title: 'name',
  path: 'url',
  method: 'method',
  desc: 'description',
  req_query: 'queryParams',
  req_headers: 'headerData',
  req_params: '',
  req_body_type: 'dataMode',
  req_body_form: 'data',
  req_body_other: 'rawModeData',
  res_body: 'text',
  res_body_type: 'language',
}

const allKey = [
  'title',
  'path',
  'catname',
  'method',
  'desc',
  'req_query',
  'req_headers',
  'req_body_type',
  'req_body_form',
  'req_body_other',
  'res',
] as const

function importPostman(data: any, key = allKey) {
  const res: { [k: string]: any } = {}
  try {
    for (const item of key) {
      if (item === 'req_query') {
        res[item] = handleReqQuery(data[reflect[item]])
      } else if (item === 'req_headers') {
        res[item] = handleReqHeaders(data[reflect[item]])
      } else if (item === 'req_body_form') {
        res[item] = handleReqBodyForm(data[reflect[item]])
      } else if (item === 'req_body_type') {
        if (data[reflect[item]] === 'urlencoded' || data[reflect[item]] === 'params') {
          res[item] = 'form'
        } else if (_.isString(data.headers) && data.headers.indexOf('application/json') > -1) {
          res[item] = 'json'
        } else {
          res[item] = 'raw'
        }
      } else if (item === 'req_body_other') {
        if (_.isString(data.headers) && data.headers.indexOf('application/json') > -1) {
          res.req_body_is_json_schema = true
          res[item] = transformJsonToSchema(data[reflect[item]])
        } else {
          res[item] = data[reflect[item]]
        }
      } else if (item === 'path') {
        res[item] = handlePath(data[reflect[item]])
        if (res[item] && res[item].indexOf('/:') > -1) {
          const params: string[] = res[item].substr(res[item].indexOf('/:') + 2).split('/:')
          // res[item] = res[item].substr(0,res[item].indexOf("/:"));
          const arr = []
          for (const str of params) {
            arr.push({
              name: str,
              desc: '',
            })
          }
          res.req_params = arr
        }
      } else if (item === 'title') {
        const path = handlePath(data[reflect.path])
        if (data[reflect[item]].indexOf(path) > -1) {
          res[item] = path
          if (res[item] && res[item].indexOf('/:') > -1) {
            res[item] = res[item].substr(0, res[item].indexOf('/:'))
          }
        } else {
          res[item] = data[reflect[item]]
        }
      } else if (item === 'catname') {
        const found = folders.filter(item => item.id === data.folder)
        res[item] = found && Array.isArray(found) && found.length > 0 ? found[0].name : null
      } else if (item === 'res') {
        const response = handleResponses(data.responses)
        if (response) {
          res.res_body = response.res_body
          res.res_body_type = response.res_body_type
        }
      } else {
        res[item] = data[reflect[item]]
      }
    }
  } catch (err) {
    console.log(err.message)
    message.error(`${err.message}, 导入的postman格式有误`)
  }
  return res
}

function handleResponses(data: any) {
  if (data && data.length) {
    const res = data[0]
    const response: any = {}
    response.res_body_type = res.language === 'json' ? 'json' : 'raw'
    // response['res_body'] = res.language === 'json' ? transformJsonToSchema(res.text): res.text;
    if (res.language === 'json') {
      response.res_body_is_json_schema = true
      response.res_body = transformJsonToSchema(res.text)
    } else {
      response.res_body = res.text
    }
    return response
  }

  return null
}

function transformJsonToSchema(json: any) {
  json = json || {}
  let jsonData = jsonParse(json)

  jsonData = generateSchema(jsonData)

  const schemaData = JSON.stringify(jsonData)
  return schemaData
}

export default {
  name: 'Postman',
  run: run,
  desc: '注意：只支持json格式数据',
}
