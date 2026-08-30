import mongoose from 'mongoose'

import BaseModel from './base.js'

class StorageModel extends BaseModel {
  constructor() {
    super()
    const storageCol = mongoose.connection.db.collection('storage')
    storageCol.createIndex(
      {
        key: 1,
      },
      {
        unique: true,
      },
    )
  }

  getName() {
    return 'storage'
  }

  getSchema() {
    return {
      key: { type: Number, required: true },
      data: {
        type: String,
        default: '',
      }, // 用于原始数据存储
    }
  }
  save(key, data = {}, isInsert = false) {
    const saveData = {
      key,
      data: JSON.stringify(data, null, 2),
    }
    if (isInsert) {
      const r = new this.model(saveData)
      return r.save()
    }
    return this.model.updateOne({
      key,
    }, saveData)
  }

  del(key) {
    return this.model.remove({
      key,
    })
  }

  get(key) {
    return this.model
      .findOne({
        key,
      })
      .exec().then(data => {
        this.save(key, {})
        if (!data) { return null }
        data = data.toObject().data
        try {
          return JSON.parse(data)
        } catch (e) {
          return {}
        }
      })
  }
}

export default StorageModel
