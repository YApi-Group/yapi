/**
 * OIDC 纯函数单测（不触网）
 * 运行：cd server && node --import tsx --test utils/oidc.test.ts
 * 注：根目录 ava 0.22 无法解析 .js -> .ts 的 ESM 导入，故用 Node 内置 test runner。
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  OidcUserError,
  pickUsername,
  publicMessage,
  sanitizeBackPath,
  signTxn,
  verifyTxn,
} from './oidc.js'

test('sanitizeBackPath 只接受站内相对路径', () => {
  assert.equal(sanitizeBackPath('/project/1'), '/project/1')
  assert.equal(sanitizeBackPath('/group'), '/group')
  assert.equal(sanitizeBackPath(undefined), '/group')
  assert.equal(sanitizeBackPath(''), '/group')
  assert.equal(sanitizeBackPath(123), '/group')
  assert.equal(sanitizeBackPath(['/a', '/b']), '/group')
  assert.equal(sanitizeBackPath('//evil.com/x'), '/group')
  assert.equal(sanitizeBackPath('http://evil.com'), '/group')
  assert.equal(sanitizeBackPath('/\\evil.com'), '/group')
  assert.equal(sanitizeBackPath('/a b'), '/group')
  assert.equal(sanitizeBackPath('/a\r\nSet-Cookie: x'), '/group')
})

test('pickUsername 按 name > preferred_username > 邮箱前缀 回退', () => {
  assert.equal(pickUsername({ name: '张三', preferred_username: 'zs' }, 'zs@x.com'), '张三')
  assert.equal(pickUsername({ name: '  ', preferred_username: 'zs' }, 'zs@x.com'), 'zs')
  assert.equal(pickUsername({}, 'zs@x.com'), 'zs')
  assert.equal(pickUsername({ name: 42 }, 'zs@x.com'), 'zs')
})

test('signTxn / verifyTxn 往返一致，并对 back 做净化', () => {
  const txn = {
    state: 's1',
    nonce: 'n1',
    code_verifier: 'v1',
    redirect_uri: 'http://localhost:8080/api/user/login_by_oidc/callback',
    back: '//evil.com',
  }
  const out = verifyTxn(signTxn(txn))
  assert.equal(out.state, 's1')
  assert.equal(out.nonce, 'n1')
  assert.equal(out.code_verifier, 'v1')
  assert.equal(out.redirect_uri, txn.redirect_uri)
  assert.equal(out.back, '/group')
})

test('verifyTxn 拒绝篡改、伪造与字段缺失', () => {
  const token = signTxn({ state: 's', nonce: 'n', code_verifier: 'v', redirect_uri: 'http://a/b', back: '/group' })
  const tampered = token.slice(0, -2) + (token.endsWith('aa') ? 'bb' : 'aa')
  assert.throws(() => verifyTxn(tampered), OidcUserError)
  assert.throws(() => verifyTxn('not-a-jwt'), OidcUserError)
  assert.throws(() => verifyTxn(''), OidcUserError)

  // 签名合法但缺少必要字段
  const partial = signTxn({ state: 's' } as any)
  assert.throws(() => verifyTxn(partial), OidcUserError)
})

test('publicMessage 只透出用户可见错误', () => {
  assert.equal(publicMessage(new OidcUserError('自定义提示')), '自定义提示')
  assert.equal(publicMessage(new Error('ECONNREFUSED 10.0.0.1:443')), 'OIDC 登录失败，请重试或联系管理员')
  assert.equal(publicMessage('whatever'), 'OIDC 登录失败，请重试或联系管理员')
})
