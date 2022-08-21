const insts = new Map()

/**
 * 获取一个model实例，如果不存在则创建一个新的返回
 * @param {*} m class
 * @example
 * yapi.getInst(GroupModel, arg1, arg2)
 */
export function getInst(m: any, ...args: any[]) {
  if (!insts.get(m)) {
    // eslint-disable-next-line new-cap
    insts.set(m, new m(args))
  }
  return insts.get(m)
}

export function delInst(m: any) {
  try {
    insts.delete(m)
  } catch (err) {
    console.error(err)
  }
}

export function listInst() {
  return insts
}
