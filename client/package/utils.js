export const JSONPATH_JOIN_CHAR = '.'
export const lang = 'en_US'
export const format = [
  { name: 'date-time' },
  { name: 'date' },
  { name: 'email' },
  { name: 'hostname' },
  { name: 'ipv4' },
  { name: 'ipv6' },
  { name: 'uri' },
]
export const SCHEMA_TYPE = ['string', 'number', 'array', 'object', 'boolean', 'integer']
export const defaultSchema = {
  string: {
    type: 'string',
  },
  number: {
    type: 'number',
  },
  array: {
    type: 'array',
    items: {
      type: 'string',
    },
  },
  object: {
    type: 'object',
    properties: {},
  },
  boolean: {
    type: 'boolean',
  },
  integer: {
    type: 'integer',
  },
}

// 防抖函数，减少高频触发的函数执行的频率
// 请在 constructor 里使用:

// this.func = debounce(this.func, 400);
export const debounce = (func, wait) => {
  let timeout
  return function () {
    clearTimeout(timeout)
    timeout = setTimeout(func, wait)
  }
}

export function getData(state, keys) {
  let curState = state
  for (let i = 0; i < keys.length; i++) {
    curState = curState[keys[i]]
  }
  return curState
}

export function setData(state, keys, value) {
  let curState = state
  for (let i = 0; i < keys.length - 1; i++) {
    curState = curState[keys[i]]
  }
  curState[keys[keys.length - 1]] = value
}

export const deleteData = function (state, keys) {
  let curState = state
  for (let i = 0; i < keys.length - 1; i++) {
    curState = curState[keys[i]]
  }

  delete curState[keys[keys.length - 1]]
}

export const getParentKeys = function (keys) {
  if (keys.length === 1) { return [] }
  const arr = [].concat(keys)
  arr.splice(keys.length - 1, 1)
  return arr
}

export const clearSomeFields = function (keys, data) {
  const newData = { ...data }
  keys.forEach(key => {
    delete newData[key]
  })
  return newData
}

function getFieldstitle(data) {
  const requiredtitle = []
  Object.keys(data).map(title => {
    requiredtitle.push(title)
  })

  return requiredtitle
}

export function handleSchemaRequired(schema, checked) {
  // console.log(schema)
  if (schema.type === 'object') {
    const requiredtitle = getFieldstitle(schema.properties)

    // schema.required = checked ? [].concat(requiredtitle) : [];
    if (checked) {
      schema.required = [].concat(requiredtitle)
    } else {
      delete schema.required
    }

    handleObject(schema.properties, checked)
  } else if (schema.type === 'array') {
    handleSchemaRequired(schema.items, checked)
  } else {
    return schema
  }
}

function handleObject(properties, checked) {
  for (const key in properties) {
    if (properties[key].type === 'array' || properties[key].type === 'object') { handleSchemaRequired(properties[key], checked) }
  }
}

export function cloneObject(obj) {
  if (typeof obj === 'object') {
    if (Array.isArray(obj)) {
      const newArr = []
      obj.forEach(function (item, index) {
        newArr[index] = cloneObject(item)
      })
      return newArr
    }

    const newObj = {}
    for (const key in obj) {
      newObj[key] = cloneObject(obj[key])
    }
    return newObj
  }

  return obj
}
