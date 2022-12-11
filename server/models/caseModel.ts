import mongoose from 'mongoose'

import * as commons from '../utils/commons'

import BaseModel from './base'

export default class CaseModel extends BaseModel {
  // eslint-disable-next-line class-methods-use-this
  getName() {
    return 'adv_mock_case'
  }

  // eslint-disable-next-line class-methods-use-this
  getSchema() {
    return {
      interface_id: { type: Number, required: true },
      project_id: { type: Number, required: true },
      ip: { type: String },
      ip_enable: { type: Boolean, default: false },
      name: { type: String, required: true },
      code: { type: Number, default: 200 },
      delay: { type: Number, default: 0 },
      headers: [
        {
          name: { type: String, required: true },
          value: { type: String },
        },
      ],
      params: mongoose.Schema.Types.Mixed,
      uid: String,
      up_time: Number,
      res_body: { type: String, required: true },
      case_enable: { type: Boolean, default: true },
    }
  }

  get(data: any) {
    return this.model.findOne(data)
  }

  list(id: number) {
    return this.model.find({
      interface_id: id,
    })
  }

  delByInterfaceId(interface_id: number) {
    return this.model.remove({
      interface_id: interface_id,
    })
  }

  delByProjectId(project_id: number) {
    return this.model.remove({
      project_id: project_id,
    })
  }

  save(data: any) {
    data.up_time = commons.time()
    // eslint-disable-next-line new-cap
    const m = new this.model(data)
    return m.save()
  }

  up(data: any) {
    const id = data.id
    delete data.id
    data.up_time = commons.time()
    return this.model.update(
      {
        _id: id,
      },
      data
    )
  }

  del(id: number) {
    return this.model.remove({
      _id: id,
    })
  }
}
