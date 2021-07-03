import storageModel from '../models/storage.js'
import yapi from '../yapi.js'

export default function storageCreator(id) {
  const defaultData = {}

  return {
    getItem: async (name = '') => {
      const inst = yapi.getInst(storageModel)
      let data = await inst.get(id)
      data = data || defaultData
      if (name) { return data[name] }
      return data
    },

    setItem: async (name, value) => {
      const inst = yapi.getInst(storageModel)
      const curData = await inst.get(id)
      const data = curData || defaultData
      let result
      data[name] = value
      if (!curData) {
        result = await inst.save(id, data, true)
      } else {
        result = await inst.save(id, data, false)
      }

      return result
    },
  }
}
