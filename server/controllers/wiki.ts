import path from 'path'

import { Context } from 'koa'
import fs from 'fs-extra'
// 0.7.x 起 formatters 拆分为子路径导出；with-text-diffs 入口内置 diff-match-patch（长文本 diff）
// @ts-ignore moduleResolution=node10 解析不了 package exports 子路径，运行时（node ESM）正常
import * as formattersHtml from 'jsondiffpatch/formatters/html'
// @ts-ignore 同上
import * as jsondiffpatch from 'jsondiffpatch/with-text-diffs'

import showDiffMsg from '../common/diff-view.js'
import cons from '../cons.js'
import ProjectModel from '../models/project.js'
import UserModel from '../models/user.js'
import WikiModel from '../models/wiki.js'
import * as commons from '../utils/commons.js'
import * as inst from '../utils/inst.js'
import * as modelUtils from '../utils/modelUtils.js'
import yapi from '../yapi.js'

import BaseController from './base.js'

/**
 * 项目 wiki（原 yapi-plugin-wiki 插件控制器内联）
 */
export default class WikiController extends BaseController {
  wikiModel: any
  projectModel: any

  constructor(ctx: Context) {
    super(ctx)
    this.wikiModel = inst.getInst(WikiModel)
    this.projectModel = inst.getInst(ProjectModel)
  }

  /**
   * 获取wiki信息
   * @interface plugin/wiki_desc/get
   * @method get
   */
  async getWikiDesc(ctx: Context) {
    try {
      const project_id = ctx.request.query.project_id
      if (!project_id) {
        return (ctx.body = commons.resReturn(null, 400, '项目id不能为空'))
      }
      const result = await this.wikiModel.get(project_id)
      return (ctx.body = commons.resReturn(result))
    } catch (err: any) {
      ctx.body = commons.resReturn(null, 400, err.message)
    }
  }

  /**
   * 保存wiki信息
   * @interface plugin/wiki_desc/up
   * @method post
   */
  async upWikiDesc(ctx: Context) {
    let params: any
    let result: any
    try {
      params = commons.handleParams(ctx.request.body, {
        project_id: 'number',
        desc: 'string',
        markdown: 'string',
      })

      if (!params.project_id) {
        return (ctx.body = commons.resReturn(null, 400, '项目id不能为空'))
      }
      if (!this.$tokenAuth) {
        const auth = await this.checkAuth(params.project_id, 'project', 'edit')
        if (!auth) {
          return (ctx.body = commons.resReturn(null, 400, '没有权限'))
        }
      }

      const notice = params.email_notice
      delete params.email_notice
      const username = this.getUsername()
      const uid = this.getUid()

      // 数据库中尚无该项目的 wiki 时新建，否则更新
      result = await this.wikiModel.get(params.project_id)
      if (!result) {
        const data = Object.assign(params, {
          username,
          uid,
          add_time: commons.time(),
          up_time: commons.time(),
        })
        const res = await this.wikiModel.save(data)
        ctx.body = commons.resReturn(res)
      } else {
        const data = Object.assign(params, {
          username,
          uid,
          up_time: commons.time(),
        })
        const upRes = await this.wikiModel.up(result._id, data)
        ctx.body = commons.resReturn(upRes)
      }

      const logData = {
        type: 'wiki',
        project_id: params.project_id,
        current: params.desc,
        old: result ? result.toObject().desc : '',
      }
      const wikiUrl = `${ctx.request.origin}/project/${params.project_id}/wiki`

      if (notice) {
        // 通知子系统（utils/notice.js 挂载 sendNotice）可能未启用；通知失败不影响保存结果
        try {
          const sendNotice = (yapi.commons as any).sendNotice
          if (typeof sendNotice === 'function') {
            const diffView = showDiffMsg(jsondiffpatch, formattersHtml, logData)
            const annotatedCss = fs.readFileSync(
              path.resolve(cons.WEB_ROOT, 'node_modules/jsondiffpatch/lib/formatters/styles/annotated.css'),
              'utf8'
            )
            const htmlCss = fs.readFileSync(
              path.resolve(cons.WEB_ROOT, 'node_modules/jsondiffpatch/lib/formatters/styles/html.css'),
              'utf8'
            )
            const project = await this.projectModel.getBaseInfo(params.project_id)

            sendNotice(params.project_id, {
              title: `${username} 更新了wiki说明`,
              content: `<html>
              <head>
              <meta charset="utf-8" />
              <style>
              ${annotatedCss}
              ${htmlCss}
              </style>
              </head>
              <body>
              <div><h3>${username}更新了wiki说明</h3>
              <p>修改用户: ${username}</p>
              <p>修改项目: <a href="${wikiUrl}">${project.name}</a></p>
              <p>详细改动日志: ${this.diffHTML(diffView)}</p></div>
              </body>
              </html>`,
            })
          } else {
            commons.log('通知功能未启用（utils/notice.js 未加载），跳过 wiki 更新通知', 'warn')
          }
        } catch (noticeErr) {
          commons.log(noticeErr, 'error')
        }
      }

      // 保存修改日志信息（项目动态，type: wiki）
      modelUtils.saveLog({
        content: `<a href="/user/profile/${uid}">${username}</a> 更新了 <a href="${wikiUrl}">wiki</a> 的信息`,
        type: 'project',
        uid,
        username: username,
        typeid: params.project_id,
        data: logData,
      })
      return 1
    } catch (err: any) {
      ctx.body = commons.resReturn(null, 400, err.message)
    }
  }

  diffHTML(html: any[]) {
    if (html.length === 0) {
      return '<span style="color: #555">没有改动，该操作未改动wiki数据</span>'
    }

    return html.map(
      item => `<div>
      <h4 class="title">${item.title}</h4>
      <div>${item.content}</div>
    </div>`
    )
  }

  // 处理编辑冲突（ws），消息协议：start / editor / end
  async wikiConflict(ctx: Context & { websocket: any }) {
    try {
      let result: any
      ctx.websocket.on('message', async (message: string) => {
        const id = parseInt(ctx.query.id as string, 10)
        if (!id) {
          return ctx.websocket.send('id 参数有误')
        }
        result = await this.wikiModel.get(id)
        const data = await this.websocketMsgMap(String(message), result)
        if (data) {
          ctx.websocket.send(JSON.stringify(data))
        }
      })
      ctx.websocket.on('close', async () => {})
    } catch (err) {
      commons.log(err, 'error')
    }
  }

  websocketMsgMap(msg: string, result: any) {
    const map: Record<string, (result: any) => Promise<any>> = {
      start: this.startFunc.bind(this),
      end: this.endFunc.bind(this),
      editor: this.editorFunc.bind(this),
    }

    return map[msg](result)
  }

  // socket 开始链接：清掉自己遗留的编辑锁
  async startFunc(result: any) {
    if (result && result.edit_uid === this.getUid()) {
      await this.wikiModel.upEditUid(result._id, 0)
    }
  }

  // socket 结束链接：释放编辑锁
  async endFunc(result: any) {
    if (result) {
      await this.wikiModel.upEditUid(result._id, 0)
    }
  }

  // 请求进入编辑：他人持锁则返回冲突信息，否则抢占编辑锁
  async editorFunc(result: any) {
    let data
    if (result && result.edit_uid !== 0 && result.edit_uid !== this.getUid()) {
      const userInst = inst.getInst(UserModel)
      const userinfo = await userInst.findById(result.edit_uid)
      data = {
        errno: result.edit_uid,
        data: { uid: result.edit_uid, username: userinfo.username },
      }
    } else {
      if (result) {
        await this.wikiModel.upEditUid(result._id, this.getUid())
      }
      data = {
        errno: 0,
        data: result,
      }
    }
    return data
  }
}
