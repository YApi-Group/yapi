import cons from '../cons'
import storageModel from '../models/storage.js'

export default function storageCreator(id) {
  const defaultData = {}

  return {
    getItem: async (name = '') => {
      const inst = cons.getInst(storageModel)
      let data = await inst.get(id)
      data = data || defaultData
      if (name) { return data[name] }
      return data
    },

    setItem: async (name, value) => {
      const inst = cons.getInst(storageModel)
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
