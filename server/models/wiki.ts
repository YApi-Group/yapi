import BaseModel from './base.js'

/**
 * 项目 wiki 数据，每个项目一条记录（原 yapi-plugin-wiki 插件模型内联）
 */
class WikiModel extends BaseModel {
  getName() { return 'wiki' }

  getSchema() {
    return {
      project_id: { type: Number, required: true, index: true },
      username: String,
      uid: { type: Number, required: true },
      // 编辑锁：当前正在编辑的用户 uid，0 表示无人编辑
      edit_uid: { type: Number, default: 0 },
      desc: String,
      markdown: String,
      add_time: Number,
      up_time: Number,
    }
  }

  save(data: any) {
    const m = new this.model(data)
    return m.save()
  }

  get(project_id: any) {
    return this.model
      .findOne({
        project_id: project_id,
      })
      .exec()
  }

  up(id: any, data: any) {
    return this.model.updateOne(
      {
        _id: id,
      },
      data,
      { runValidators: true }
    )
  }

  upEditUid(id: any, uid: any) {
    return this.model.updateOne(
      {
        _id: id,
      },
      { edit_uid: uid },
      { runValidators: true }
    )
  }
}

export default WikiModel
