import yapi from '../yapi.js'

import BaseModel from './base.js'

class tokenModel extends BaseModel {
  getName() {
    return 'token'
  }

  getSchema() {
    return {
      project_id: { type: Number, required: true },
      token: String,
    }
  }

  save(data) {
    const m = new this.model(data)
    return m.save()
  }

  get(project_id) {
    return this.model.findOne({
      project_id: project_id,
    })
  }

  findId(token) {
    return this.model
      .findOne({
        token: token,
      })
      .select('project_id')
      .exec()
  }

  up(project_id, token) {
    return this.model.update(
      {
        project_id: project_id,
      },
      {
        token: token,
      },
    )
  }
}

export default tokenModel
