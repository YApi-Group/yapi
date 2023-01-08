import * as commons from '../utils/commons.js'

import BaseModel from './base.js'

export default class AdvMockModel extends BaseModel {
  // eslint-disable-next-line class-methods-use-this
  getName() {
    return 'adv_mock'
  }

  // eslint-disable-next-line class-methods-use-this
  getSchema() {
    return {
      interface_id: { type: Number, required: true },
      project_id: { type: Number, required: true },
      enable: { type: Boolean, default: false },
      mock_script: String,
      uid: String,
      up_time: Number,
    }
  }

  get(interface_id: number) {
    return this.model.findOne({
      interface_id: interface_id,
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
    data.up_time = commons.time()
    return this.model.update(
      {
        interface_id: data.interface_id,
      },
      {
        uid: data.uid,
        up_time: data.up_time,
        mock_script: data.mock_script,
        enable: data.enable,
      },
      {
        upsert: true,
      }
    )
  }
}
