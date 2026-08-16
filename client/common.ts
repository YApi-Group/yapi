import json5 from 'json5'
import Mock from 'mockjs'
import moment from 'moment'

import constants from '@/cons'

import MockExtra from '../common/mock-extra.js'

const Roles = {
  0: 'admin',
  10: 'owner',
  20: 'dev',
  30: 'guest',
  40: 'member',
}

const roleAction = {
  manageUserlist: 'admin',
  changeMemberRole: 'owner',
  editInterface: 'dev',
  viewPrivateInterface: 'guest',
  viewGroup: 'guest',
}

export function isJson(json) {
  if (!json) {
    return false
  }
  try {
    json = JSON.parse(json)
    return json
  } catch (e) {
    return false
  }
}

export function isJson5(json) {
  if (!json) {
    return false
  }
  try {
    json = json5.parse(json)
    return json
  } catch (e) {
    return false
  }
}
export const safeArray = function (arr) {
  return Array.isArray(arr) ? arr : []
}

export const json5_parse = function (json) {
  try {
    return json5.parse(json)
  } catch (err) {
    return json
  }
}

export const json_parse = function (json) {
  try {
    return JSON.parse(json)
  } catch (err) {
    return json
  }
}

export function deepCopyJson(json) {
  return JSON.parse(JSON.stringify(json))
}

export const checkAuth = (action, role) => Roles[roleAction[action]] <= Roles[role]

export const formatTime = timestamp => moment.unix(timestamp).format('YYYY-MM-DD HH:mm:ss')

// 防抖函数，减少高频触发的函数执行的频率
// 请在 constructor 里使用:
// import { debounce } from '$/common';
// this.func = debounce(this.func, 400);
export const debounce = (func, wait) => {
  let timeout
  return function () {
    clearTimeout(timeout)
    timeout = setTimeout(func, wait)
  }
}

// 从 Javascript 对象中选取随机属性
export const pickRandomProperty = obj => {
  let result
  let count = 0
  for (const prop in obj) {
    count += 1
    if (Math.random() < 1 / count) {
      result = prop
    }
  }
  return result
}

export const getImgPath = (path, type) => {
  const rate = window.devicePixelRatio >= 2 ? 2 : 1
  return `${path}@${rate}x.${type}`
}

export function trim(str) {
  if (!str) {
    return str
  }

  str = String(str)

  return str.replace(/(^\s*)|(\s*$)/g, '')
}

export const handlePath = path => {
  path = trim(path)
  if (!path) {
    return path
  }
  if (path === '/') {
    return ''
  }
  path = path[0] !== '/' ? '/' + path : path
  path = path[path.length - 1] === '/' ? path.substr(0, path.length - 1) : path
  return path
}

export const handleApiPath = path => {
  if (!path) {
    return ''
  }
  path = trim(path)
  path = path[0] !== '/' ? '/' + path : path
  return path
}

// 返回字符串长度，汉字计数为2
function strLength(str) {
  let length = 0
  for (let i = 0; i < str.length; i++) {
    length = str.charCodeAt(i) > 255 ? length + 2 : length + 1
  }
  return length
}

// 名称限制 constants.NAME_LIMIT 字符，返回 form中的 rules 校验规则
export const nameLengthLimit = type => [
  {
    required: true,
    validator(rule, value) {
      const len = value ? strLength(value) : 0
      if (len <= constants.NAME_LIMIT && len !== 0) {
        return Promise.resolve()
      }

      const err = `请输入${type}名称，长度不超过 ${constants.NAME_LIMIT} 字符(中文算作 2 字符)!`
      return Promise.reject(new Error(err))
    },
  },
]

// 去除所有html标签只保留文字

export const htmlFilter = html => {
  const reg = /<\/?.+?\/?>/g
  return html.replace(reg, '') || '新项目'
}

// 实现 Object.entries() 方法
// TODO remove
export const entries = obj => Object.entries(obj)

export const getMockText = mockTpl => {
  try {
    return JSON.stringify(Mock.mock(MockExtra(json5.parse(mockTpl), {})), null, '  ')
  } catch (err) {
    return ''
  }
}

// 交换数组的位置
export const arrayChangeIndex = (arr, start, end) => {
  const newArr = [].concat(arr)
  // newArr[start] = arr[end];
  // newArr[end] = arr[start];
  const startItem = newArr[start]
  newArr.splice(start, 1)
  // end自动加1
  newArr.splice(end, 0, startItem)
  const changes = []
  newArr.forEach((item, index) => {
    changes.push({
      id: item._id,
      index: index,
    })
  })

  return changes
}
