import fs from 'fs'
import path from 'path'

import cons from '../cons'
import * as commons from '../utils/commons'

import baseController from './base.js'

class interfaceColController extends baseController {
  /**
   * 测试 get
   * @interface /test/get
   * @method GET
   * @returns {Object}
   * @example
   */
  async testGet(ctx) {
    try {
      const query = ctx.query
      // cookie 检测
      ctx.cookies.set('_uid', 12, {
        expires: commons.expireDate(7),
        httpOnly: true,
      })
      ctx.body = commons.resReturn(query)
    } catch (e) {
      ctx.body = commons.resReturn(null, 402, e.message)
    }
  }

  /**
   * 测试 code
   * @interface /http/code
   * @method GET
   * @returns {Object}
   * @example
   */

  async testHttpCode(ctx) {
    try {
      const params = ctx.request.body
      ctx.status = Number(ctx.query.code) || 200
      ctx.body = commons.resReturn(params)
    } catch (e) {
      ctx.body = commons.resReturn(null, 402, e.message)
    }
  }

  /**
   * 测试 post
   * @interface /test/post
   * @method POST
   * @returns {Object}
   * @example
   */
  async testPost(ctx) {
    try {
      const params = ctx.request.body
      ctx.body = commons.resReturn(params)
    } catch (e) {
      ctx.body = commons.resReturn(null, 402, e.message)
    }
  }

  /**
   * 测试 单文件上传
   * @interface /test/single/upload
   * @method POST
   * @returns {Object}
   * @example
   */
  async testSingleUpload(ctx) {
    try {
      // let params = ctx.request.body;
      const req = ctx.req

      let chunks = [],
        size = 0
      req.on('data', function (chunk) {
        chunks.push(chunk)
        size += chunk.length
      })

      req.on('finish', function () {
        console.log(34343)
      })

      req.on('end', function () {
        const data = new Buffer(size)
        for (let i = 0, pos = 0, l = chunks.length; i < l; i++) {
          const chunk = chunks[i]
          chunk.copy(data, pos)
          pos += chunk.length
        }
        fs.writeFileSync(path.join(cons.WEBROOT_RUNTIME, 'test.text'), data, function (err) {
          return (ctx.body = commons.resReturn(null, 402, '写入失败'))
        })
      })

      ctx.body = commons.resReturn({ res: '上传成功' })
    } catch (e) {
      ctx.body = commons.resReturn(null, 402, e.message)
    }
  }

  /**
   * 测试 文件上传
   * @interface /test/files/upload
   * @method POST
   * @returns {Object}
   * @example
   */
  async testFilesUpload(ctx) {
    try {
      const file = ctx.request.body.files.file
      const newPath = path.join(cons.WEBROOT_RUNTIME, 'test.text')
      fs.renameSync(file.path, newPath)
      ctx.body = commons.resReturn({ res: '上传成功' })
    } catch (e) {
      ctx.body = commons.resReturn(null, 402, e.message)
    }
  }

  /**
   * 测试 put
   * @interface /test/put
   * @method PUT
   * @returns {Object}
   * @example
   */
  async testPut(ctx) {
    try {
      const params = ctx.request.body
      ctx.body = commons.resReturn(params)
    } catch (e) {
      ctx.body = commons.resReturn(null, 402, e.message)
    }
  }

  /**
   * 测试 delete
   * @interface /test/delete
   * @method DELETE
   * @returns {Object}
   * @example
   */
  async testDelete(ctx) {
    try {
      const body = ctx.request.body
      ctx.body = commons.resReturn(body)
    } catch (e) {
      ctx.body = commons.resReturn(null, 402, e.message)
    }
  }

  /**
   * 测试 head
   * @interface /test/head
   * @method HEAD
   * @returns {Object}
   * @example
   */
  async testHead(ctx) {
    try {
      const query = ctx.query
      ctx.body = commons.resReturn(query)
    } catch (e) {
      ctx.body = commons.resReturn(null, 402, e.message)
    }
  }

  /**
   * 测试 options
   * @interface /test/options
   * @method OPTIONS
   * @returns {Object}
   * @example
   */
  async testOptions(ctx) {
    try {
      const query = ctx.query
      ctx.body = commons.resReturn(query)
    } catch (e) {
      ctx.body = commons.resReturn(null, 402, e.message)
    }
  }

  /**
   * 测试 patch
   * @interface /test/patch
   * @method PATCH
   * @returns {Object}
   * @example
   */
  async testPatch(ctx) {
    try {
      const params = ctx.request.body
      ctx.body = commons.resReturn(params)
    } catch (e) {
      ctx.body = commons.resReturn(null, 402, e.message)
    }
  }
  /**
   * 测试 raw
   * @interface /test/raw
   * @method POST
   * @return {Object}
   * @example
   */
  async testRaw(ctx) {
    try {
      const params = ctx.request.body
      ctx.body = commons.resReturn(params)
    } catch (e) {
      ctx.body = commons.resReturn(null, 402, e.message)
    }
  }

  /**
   * 测试返回值
   * @interface /test/response
   * @method get
   * @return {Object}
   * @example
   */
  async testResponse(ctx) {
    try {
      // let result = `<div><h2>12222222</h2></div>`;
      // let result = `wieieieieiieieie`
      const result = { b: '12', c: '23' }
      ctx.set('Access-Control-Allow-Origin', '*')
      ctx.set('Content-Type', 'text')
      console.log(ctx.response)
      ctx.body = result
    } catch (e) {
      ctx.body = commons.resReturn(null, 402, e.message)
    }
  }
}

export default interfaceColController
