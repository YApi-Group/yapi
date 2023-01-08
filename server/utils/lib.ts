function isObj(object: any) {
  return (
    object &&
    typeof object == 'object' &&
    Object.prototype.toString.call(object).toLowerCase() == '[object object]'
  )
}

function isArray(object: any) {
  return object && typeof object == 'object' && object.constructor == Array
}

function getLength(object: any) {
  return Object.keys(object).length
}

function Compare(objA: any, objB: any) {
  if (!isObj(objA) && !isObj(objB)) {
    if (isArray(objA) && isArray(objB)) {
      return CompareArray(objA, objB, true)
    }
    return objA == objB
  }
  if (!isObj(objA) || !isObj(objB)) {
    return false
  }
  if (getLength(objA) != getLength(objB)) {
    return false
  }
  return CompareObj(objA, objB, true)
}

function CompareArray(objA: any, objB: any, flag: any) {
  if (objA.length != objB.length) {
    return false
  }
  for (const i in objB) {
    if (!Compare(objA[i], objB[i])) {
      flag = false
      break
    }
  }

  return flag
}

function CompareObj(objA: any, objB: any, flag: any) {
  for (const key in objA) {
    if (!flag) {
      break
    }
    if (!objB.hasOwnProperty(key)) {
      flag = false
      break
    }
    if (!isArray(objA[key])) {
      if (objB[key] != objA[key]) {
        flag = false
        break
      }
    } else {
      if (!isArray(objB[key])) {
        flag = false
        break
      }
      const oA = objA[key],
        oB = objB[key]
      if (oA.length != oB.length) {
        flag = false
        break
      }
      for (const k in oA) {
        if (!flag) {
          break
        }
        flag = CompareObj(oA[k], oB[k], flag)
      }
    }
  }
  return flag
}

export const jsonEqual = Compare

export function isDeepMatch(obj: any, properties: any) {
  if (!properties || typeof properties !== 'object' || Object.keys(properties).length === 0) {
    return true
  }

  if (!obj || typeof obj !== 'object' || Object.keys(obj).length === 0) {
    return false
  }

  let match = true
  const keys = Object.keys(properties)
  for (let index = 0; index < keys.length; index++) {
    const i = keys[index]
    if (!Compare(obj[i], properties[i])) {
      match = false
      break
    }
  }
  return match
}
