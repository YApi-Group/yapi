import cons from '../cons.js'
import storageModel from '../models/storage.js'
import * as inst from '../utils/inst.js'

export default function storageCreator(id) {
  const defaultData = {}

  return {
    getItem: async (name = '') => {
      const storageInst = inst.getInst(storageModel)
      let data = await storageInst.get(id)
      data = data || defaultData
      if (name) { return data[name] }
      return data
    },

    setItem: async (name, value) => {
      const storageInst = inst.getInst(storageModel)
      const curData = await storageInst.get(id)
      const data = curData || defaultData
      let result
      data[name] = value
      if (!curData) {
        result = await storageInst.save(id, data, true)
      } else {
        result = await storageInst.save(id, data, false)
      }

      return result
    },
  }
}
