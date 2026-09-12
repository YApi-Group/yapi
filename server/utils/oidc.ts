/**
 * OIDC（OpenID Connect）登录
 *
 * 基于 openid-client 实现授权码 + PKCE(S256) 流程，往返期间的
 * state / nonce / code_verifier / redirect_uri / back 用一枚短时效签名 cookie（JWT）承载，
 * 项目没有 session 中间件，不为此引入。
 *
 * 与 HTTP 无关的逻辑都放在这里，便于单测；控制器只做 cookie 读写与重定向。
 * 详见 design/oidc登录授权方式接入.md
 */
import jwt from 'jsonwebtoken'
import * as client from 'openid-client'

import cons from '../cons.js'

import { defaultSalt } from './token.js'

/** 回调路径（相对站点根） */
const CALLBACK_PATH = '/api/user/login_by_oidc/callback'
/** 事务 cookie 名 */
export const TXN_COOKIE = '_yapi_oidc'
/** 事务 cookie 作用路径：按前缀匹配同时覆盖发起与回调两个路径，不随其它请求发送 */
export const TXN_COOKIE_PATH = '/api/user/login_by_oidc'
/** 事务 cookie 有效期（毫秒），与 JWT 过期时间一致 */
export const TXN_MAX_AGE = 10 * 60 * 1000
const TXN_TTL = '10m'

const SCOPE = 'openid email profile'
const DEFAULT_BACK = '/group'
/** 对身份服务发起 HTTP 请求（discovery / token / userinfo）的超时，单位秒 */
const REQUEST_TIMEOUT = 15

type OidcConfig = {
  enable?: boolean
  issuer?: string
  id?: string
  secret?: string
  /** 可选；空则按请求 origin 推导 <origin>/api/user/login_by_oidc/callback */
  redirectUri?: string
  /** 可选；登录按钮展示名，缺省 OIDC */
  name?: string
}

/** 往返事务（写入签名 cookie 的载荷） */
type OidcTxn = {
  state: string
  nonce: string
  code_verifier: string
  redirect_uri: string
  back: string
}

/** 回调校验成功后得到的身份信息 */
type OidcIdentity = {
  email: string
  username: string
  sub: string
  back: string
}

/** 可以直接展示给用户的错误；其它错误一律给通用文案，细节只进日志 */
export class OidcUserError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'OidcUserError'
  }
}

function getConfig(): OidcConfig {
  // config.json 可能没有 oidc 块（如发布镜像按环境变量生成配置），用 any 绕开 JSON 推导类型
  const c = (cons.WEB_CONFIG as any).oidc
  return c && typeof c === 'object' ? (c as OidcConfig) : {}
}

/** 四项齐备才算启用，避免半配置状态下暴露登录按钮 */
export function isEnabled(): boolean {
  const c = getConfig()
  return !!(c.enable && c.issuer && c.id && c.secret)
}

export function getDisplayName(): string {
  return getConfig().name || 'OIDC'
}

/** 事务 cookie 签名密钥，与 utils/token.ts 同源 */
function getSecret(): string {
  return (cons.WEB_CONFIG as any).passsalt || defaultSalt
}

// discovery 结果进程内缓存；失败即清空，下次请求重试。
// 不在启动期发起：身份服务暂不可达不应拖垮进程，也不影响其它登录方式。
let configPromise: Promise<client.Configuration> | null = null

function getConfiguration(): Promise<client.Configuration> {
  if (!configPromise) {
    // 调用方已经过 isEnabled() 判定，这里的缺省值只为收窄类型
    const { issuer = '', id = '', secret = '' } = getConfig()
    configPromise = client
      // eslint-disable-next-line new-cap -- ClientSecretPost 是 openid-client 的工厂函数，命名由库决定
      .discovery(new URL(issuer), id, secret, client.ClientSecretPost(secret), {
        timeout: REQUEST_TIMEOUT,
      })
      .catch(err => {
        configPromise = null
        throw err
      })
  }
  return configPromise
}

function getRedirectUri(origin: string): string {
  return getConfig().redirectUri || origin + CALLBACK_PATH
}

/** 登录成功后的回跳地址只接受站内相对路径，防开放重定向与响应头注入 */
export function sanitizeBackPath(back: unknown): string {
  if (
    typeof back !== 'string' ||
    !back.startsWith('/') ||
    back.startsWith('//') ||
    back.includes('\\') ||
    /\s/.test(back)
  ) {
    return DEFAULT_BACK
  }
  return back
}

/** 用户名：name > preferred_username > 邮箱前缀 */
export function pickUsername(
  claims: { name?: unknown, preferred_username?: unknown },
  email: string
): string {
  if (typeof claims.name === 'string' && claims.name.trim()) {
    return claims.name.trim()
  }
  if (typeof claims.preferred_username === 'string' && claims.preferred_username.trim()) {
    return claims.preferred_username.trim()
  }
  return email.split('@')[0]
}

export function signTxn(txn: OidcTxn): string {
  return jwt.sign(txn, getSecret(), { expiresIn: TXN_TTL })
}

export function verifyTxn(token: string): OidcTxn {
  const invalid = () => new OidcUserError('登录会话已过期或无效，请重新登录')
  let payload: unknown
  try {
    payload = jwt.verify(token, getSecret())
  } catch (e) {
    throw invalid()
  }
  const txn = payload as Partial<OidcTxn> | null
  if (
    !txn ||
    typeof txn !== 'object' ||
    !txn.state ||
    !txn.nonce ||
    !txn.code_verifier ||
    !txn.redirect_uri
  ) {
    throw invalid()
  }
  return {
    state: txn.state,
    nonce: txn.nonce,
    code_verifier: txn.code_verifier,
    redirect_uri: txn.redirect_uri,
    back: sanitizeBackPath(txn.back),
  }
}

/** 构造授权请求：返回要重定向到的身份服务地址与待写入 cookie 的事务串 */
export async function createAuthorizationRequest(
  origin: string,
  back: unknown
): Promise<{ url: URL, txn: string }> {
  const config = await getConfiguration()
  const codeVerifier = client.randomPKCECodeVerifier()
  const codeChallenge = await client.calculatePKCECodeChallenge(codeVerifier)
  const state = client.randomState()
  const nonce = client.randomNonce()
  const redirectUri = getRedirectUri(origin)

  const url = client.buildAuthorizationUrl(config, {
    redirect_uri: redirectUri,
    scope: SCOPE,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    state,
    nonce,
  })
  const txn = signTxn({
    state,
    nonce,
    code_verifier: codeVerifier,
    redirect_uri: redirectUri,
    back: sanitizeBackPath(back),
  })
  return { url, txn }
}

/**
 * 处理身份服务回调：校验事务、换取 token、校验 id_token、取出邮箱与用户名
 * @param querystring 回调请求的原始查询串（不含 ?）
 * @param txnToken 事务 cookie 的值
 */
export async function handleCallback(querystring: string, txnToken: string): Promise<OidcIdentity> {
  const txn = verifyTxn(txnToken)
  const config = await getConfiguration()

  // 用事务里记录的 redirect_uri 重建"当前 URL"，不依赖反向代理透传的 Host
  const currentUrl = new URL(txn.redirect_uri)
  currentUrl.search = querystring

  // state / nonce / PKCE / id_token 签名与 iss、aud、exp 校验均由 openid-client 完成
  const tokens = await client.authorizationCodeGrant(config, currentUrl, {
    pkceCodeVerifier: txn.code_verifier,
    expectedState: txn.state,
    expectedNonce: txn.nonce,
    idTokenExpected: true,
  })

  const idClaims = tokens.claims()
  if (!idClaims) {
    throw new Error('token 响应缺少 id_token')
  }
  let claims: Record<string, unknown> = { ...idClaims }
  if (!claims.email) {
    // 部分连接器不把 email 放进 id_token，回退 userinfo（openid-client 会校验 sub 一致）
    const info = await client.fetchUserInfo(config, tokens.access_token, idClaims.sub)
    claims = { ...claims, ...info }
  }

  const email = typeof claims.email === 'string' ? claims.email.trim().toLowerCase() : ''
  if (!email || !email.includes('@')) {
    throw new OidcUserError('身份服务未返回邮箱，无法登录')
  }
  if (claims.email_verified === false) {
    throw new OidcUserError('邮箱未通过身份服务验证，无法登录')
  }

  return {
    email,
    username: pickUsername(claims, email),
    sub: idClaims.sub,
    back: txn.back,
  }
}

/** 面向用户的错误文案：只透出可展示的错误，其它给通用提示 */
export function publicMessage(err: unknown): string {
  if (err instanceof OidcUserError) {
    return err.message
  }
  if (err instanceof client.AuthorizationResponseError) {
    return err.error === 'access_denied' ? '已取消授权或被身份服务拒绝' : '身份服务返回错误，请稍后重试'
  }
  return 'OIDC 登录失败，请重试或联系管理员'
}

/** 登录页错误提示地址 */
export function loginErrorUrl(message: string): string {
  return '/login?oidc_error=' + encodeURIComponent(message)
}
