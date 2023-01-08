import BaseModel from './base.js'

class TokenModel extends BaseModel {
  getName() {
    return 'token'
  }

  getSchema() {
    return {
      project_id: { type: Number, required: true },
      token: String,
    }
  }

  save(data: any) {
    const m = new this.model(data)
    return m.save()
  }

  get(project_id: number) {
    return this.model.findOne({
      project_id: project_id,
    })
  }

  findId(token: string) {
    return this.model
      .findOne({
        token: token,
      })
      .select('project_id')
      .exec()
  }

  up(project_id: number, token: string) {
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

export default TokenModel
