/**
 * Created by gxl.gao on 2017/10/24.
 */
import * as commons from '../utils/commons.js'

import BaseModel from './base.js'

class StatisticModel extends BaseModel {
  getName() { return 'statistic' }

  getSchema() {
    return {
      interface_id: { type: Number, required: true },
      project_id: { type: Number, required: true },
      group_id: { type: Number, required: true },
      time: Number, // '时间戳'
      ip: String,
      date: String,
    }
  }

  countByGroupId(id: any) {
    return this.model.countDocuments({
      group_id: id,
    })
  }

  save(data: any) {
    const m = new this.model(data)
    return m.save()
  }

  getTotalCount() {
    return this.model.countDocuments({})
  }

  async getDayCount(timeInterval: any) {
    const end = timeInterval[1]
    const start = timeInterval[0]
    const data: any[] = []
    const cursor = this.model.aggregate([
      {
        $match: {
          date: { $gt: start, $lte: end },
        },
      },
      {
        $group: {
          _id: '$date', // $region is the column name in collection
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]).cursor({}).exec()
    await cursor.eachAsync((doc: any) => data.push(doc))
    return data
  }

  list() {
    return this.model.find({}).select('date').exec()
  }

  up(id: any, data: any) {
    data.up_time = commons.time()
    return this.model.updateOne({
      _id: id,
    }, data, { runValidators: true })
  }
}

export default StatisticModel
