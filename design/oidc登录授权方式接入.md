# OIDC 登录授权方式接入方案

> 2026-09-04 · 以 OpenID Connect 授权码 + PKCE 流程接入公司 Dex 身份服务，登录成功后复用现有"第三方登录"用户体系（`type: 'third'`）。本文为实施前方案，实施记录与验证结果在文末章节同步更新。

## 一、背景与现状

1. **现有登录方式**只有两种：
   - 本地账号：`POST /api/user/login`、`POST /api/user/reg`（`closeRegister` 可关闭注册）；
   - LDAP：`POST /api/user/login_by_ldap`（`server/utils/ldap.ts`，ldapjs），由 `config.json` 的 `ldapLogin.enable` 开关，`base.ts#getLoginStatus` 通过 `ladp` 字段下发给前端，`LoginForm.tsx` 据此渲染 LDAP 单选。
2. **第三方 SSO 钩子只剩骨架**：`server/hook.ts` 定义了单监听器的 `third_login`，由 `user.ts#loginByToken`（`/api/user/login_by_token`）调用，监听器应 resolve `{ username, email }`，随后 `handleThirdLogin()` 按邮箱找/建用户并写登录 cookie。但插件加载在 `app.ts` 中被注释（TODO 重新设计），仓库内无任何地方绑定该钩子，客户端 `plugin.ts` 的插件列表也为空。`server/package.json` 里残留的 `yapi-plugin-qsso` 依赖即当年走这条钩子的 QSSO 插件，现已无引用。
3. **`config.json` 已有 `oidc` 配置块**（`enable / issuer / id / secret`），但没有任何代码读取它。该文件受版本控制，其中的真实 secret **不得提交**。
4. **有现成内联先例**：wiki 插件去插件化时采取"直接作为模型 + 控制器 + routerConfig 分组融入主项目"的做法（见 `design/wiki插件去插件化融入主项目.md`），OIDC 照同样模式办理，不等待插件机制重设计。

## 二、身份服务（Dex）探测结果

2026-09-04 对 issuer 的公开发现文档 `/.well-known/openid-configuration` 与授权端点做只读探测，结论如下：

| 项目 | 结果 | 对方案的影响 |
|---|---|---|
| 服务类型 | Dex（端点 `/auth`、`/token`、`/userinfo`、`/keys`，支持 token-exchange / device_code 授权类型，登录页显示 "Log in with Yotta" 上游连接器） | 标准 OIDC，openid-client 可直接对接 |
| `response_types_supported` | 仅 `code` | 必须走授权码流程 |
| `code_challenge_methods_supported` | `S256`、`plain` | 启用 PKCE S256 |
| `token_endpoint_auth_methods_supported` | `client_secret_basic`、`client_secret_post` | 机密客户端，用 `client_secret_post` |
| `scopes_supported` | `openid email groups profile offline_access` | 本期申请 `openid email profile`；`groups` 留作后续角色映射 |
| `claims_supported` | `sub email email_verified name preferred_username locale …` | 邮箱作为 YApi 账号主键，`name`/`preferred_username` 作用户名 |
| `end_session_endpoint` | **无** | Dex 不支持 RP 发起登出，YApi 登出只清本站 cookie |
| TLS 证书 | 不带 `-k` 的 curl 返回 200，证书链可信 | Node fetch 无需额外 CA 配置 |
| `redirect_uri` 校验 | 对 client `local8080` 探测 8 个不同回调地址（localhost 各端口/路径、`127.0.0.1`、`https://yapi.yottastudios.com/...`、内网 IP），**全部 302 进入登录页** | 当前该 client 对回调地址不设白名单；生产域名上线前仍需与 Dex 管理员确认是否需要登记 |

运行环境：本机 Node 24.16，发布镜像 `node:24-alpine`，服务端为 ESM + tsx，满足 openid-client 6 的 Node ≥ 20 与纯 ESM 要求。

## 三、方案选择

### 3.1 接入位置：直接内联，不走 `third_login` 钩子

- 钩子依赖的插件加载机制已停摆，且钩子为单监听器、只做"拿到 email/username 后建用户"这一步，对 OIDC 的重定向往返毫无帮助；
- 内联后 `loginByToken` 与 `third_login` 钩子原样保留，不影响将来重设计插件机制。

### 3.2 依赖库：`openid-client@6.8.7`

| 候选 | 评价 |
|---|---|
| **openid-client 6**（选用） | 纯 ESM、基于全局 fetch、依赖仅 `jose` + `oauth4webapi`；内置 discovery、PKCE、state/nonce 校验、id_token 签名（JWKS）与 iss/aud/exp/nonce 校验、userinfo 的 sub 校验。`package.json` 顶层带 `types`，与 server 当前 `moduleResolution: Node` 兼容 |
| passport + passport-openidconnect | 需引入 session 中间件与 passport 生态，Koa 下适配成本高，收益为零 |
| 手写 fetch + jose | 需自行实现 discovery 缓存、JWKS 轮换、全部 token 校验，等于重写 openid-client 的核心，风险高 |

### 3.3 授权流程

Authorization Code + PKCE(S256) + `state` + `nonce`，机密客户端（`client_secret_post`）。往返期间的 `state / nonce / code_verifier / redirect_uri / back` 用一枚**短时效签名 cookie** 承载（项目无 session 中间件，`koa-session-minimal` 等依赖均未启用，不为此引入 session）。

## 四、登录时序

```
浏览器                         YApi 服务端                                  Dex
  │ GET /api/user/login_by_oidc?back=/project/1                             │
  │──────────────────────────────►│                                          │
  │                               │ discovery（首次，后缓存）                 │
  │                               │ 生成 code_verifier / state / nonce       │
  │                               │ Set-Cookie: _yapi_oidc=<JWT,10min>       │
  │◄──302 Dex/auth?...&code_challenge&state&nonce────────────────────────────│
  │─────────────────────────── 用户在 Dex（Yotta 连接器）完成认证 ─────────────►│
  │◄──302 {redirect_uri}?code=…&state=…──────────────────────────────────────│
  │ GET /api/user/login_by_oidc/callback?code&state  (携带 _yapi_oidc)        │
  │──────────────────────────────►│ 校验 cookie JWT → 取出 txn                │
  │                               │ authorizationCodeGrant(pkce,state,nonce) │
  │                               │─────────────── POST /token ─────────────►│
  │                               │◄───────── id_token + access_token ───────│
  │                               │ claims 无 email 时 → GET /userinfo        │
  │                               │ handleThirdLogin(email, username)        │
  │                               │ 清 _yapi_oidc；写 _yapi_token/_yapi_uid   │
  │◄──302 back（默认 /group）──────│                                          │
  │ App 挂载 → GET /api/user/status → 已登录                                  │
```

任一环节失败（Dex 拒绝、用户取消、cookie 缺失/过期/篡改、state/nonce 不符、无邮箱等）：服务端记日志，`302 /login?oidc_error=<面向用户的简短文案>`，登录页读取该参数弹 `message.error` 后清掉查询串。

## 五、服务端改动

### 5.1 配置项（`config.json` / `config_example.json`）

```jsonc
"oidc": {
  "enable": true,
  "issuer": "https://xapitable-test.yottastudios.com:15556",
  "id": "local8080",
  "secret": "***",                       // 真实值只放本地，不进 git
  "redirectUri": "",                      // 可选；空则按请求 origin 推导 <origin>/api/user/login_by_oidc/callback
  "name": "Yotta"                          // 可选；登录按钮文案"使用 Yotta 账号登录"，缺省 "OIDC"
}
```

- `config_example.json` 补同结构示例（secret 用 `***`），并顺带补上示例里缺失的 `passsalt`、`closeRegister`、`ldapLogin` 字段说明。
- `isEnabled()` 判定为 `enable && issuer && id && secret` 四者齐备，缺一视为未启用，避免半配置状态下暴露登录按钮。
- 生产环境**建议显式配置 `redirectUri`**，理由见 7.2。

### 5.2 新建 `server/utils/oidc.ts`

职责：封装 openid-client，暴露与 HTTP 无关的纯函数便于单测。风格对齐 `utils/ldap.ts`（ESM、无分号、单引号）。

```ts
import jwt from 'jsonwebtoken'
import * as client from 'openid-client'

import cons from '../cons.js'

export const CALLBACK_PATH = '/api/user/login_by_oidc/callback'
export const TXN_COOKIE = '_yapi_oidc'
const TXN_TTL = '10m'
const SCOPE = 'openid email profile'

export function isEnabled(): boolean {
  const c = cons.WEB_CONFIG.oidc
  return !!(c && c.enable && c.issuer && c.id && c.secret)
}

// discovery 结果进程内缓存；失败即清空，下次请求重试（Dex 暂不可达不应拖垮进程，也不在启动期阻塞）
let configPromise: Promise<client.Configuration> | null = null
export function getConfiguration() {
  if (!configPromise) {
    const c = cons.WEB_CONFIG.oidc
    configPromise = client
      .discovery(new URL(c.issuer), c.id, c.secret, client.ClientSecretPost(c.secret), { timeout: 10 })
      .catch(err => { configPromise = null; throw err })
  }
  return configPromise
}

export function getRedirectUri(origin: string) {
  return cons.WEB_CONFIG.oidc.redirectUri || origin + CALLBACK_PATH
}

// 只允许站内相对路径，防开放重定向
export function sanitizeBackPath(back: unknown) {
  if (typeof back !== 'string' || !back.startsWith('/') || back.startsWith('//') || back.includes('\\')) {
    return '/group'
  }
  return back
}

export function pickUsername(claims: { name?: string, preferred_username?: string }, email: string) {
  return claims.name || claims.preferred_username || email.split('@')[0]
}

// 事务 cookie：HS256 JWT，密钥与 utils/token.ts 同源（WEB_CONFIG.passsalt）
export function signTxn(txn: object) {
  return jwt.sign(txn, cons.WEB_CONFIG.passsalt, { expiresIn: TXN_TTL })
}
export function verifyTxn(token: string) {
  return jwt.verify(token, cons.WEB_CONFIG.passsalt) as Txn   // 过期 / 篡改直接抛错
}

export async function createAuthorizationRequest(origin: string, back: unknown) {
  const config = await getConfiguration()
  const code_verifier = client.randomPKCECodeVerifier()
  const code_challenge = await client.calculatePKCECodeChallenge(code_verifier)
  const state = client.randomState()
  const nonce = client.randomNonce()
  const redirect_uri = getRedirectUri(origin)
  const url = client.buildAuthorizationUrl(config, {
    redirect_uri, scope: SCOPE, code_challenge, code_challenge_method: 'S256', state, nonce,
  })
  const txn = signTxn({ state, nonce, code_verifier, redirect_uri, back: sanitizeBackPath(back) })
  return { url, txn }
}

export async function handleCallback(querystring: string, txnToken: string) {
  const txn = verifyTxn(txnToken)
  const config = await getConfiguration()
  // 用事务里记录的 redirect_uri 重建"当前 URL"，不依赖反向代理透传的 Host
  const currentUrl = new URL(txn.redirect_uri)
  currentUrl.search = querystring
  const tokens = await client.authorizationCodeGrant(config, currentUrl, {
    pkceCodeVerifier: txn.code_verifier,
    expectedState: txn.state,
    expectedNonce: txn.nonce,
    idTokenExpected: true,
  })
  let claims: Record<string, any> = tokens.claims()
  if (!claims.email) {
    // 部分连接器不把 email 放进 id_token，回退 userinfo（openid-client 会校验 sub 一致）
    claims = { ...claims, ...(await client.fetchUserInfo(config, tokens.access_token, claims.sub)) }
  }
  if (!claims.email) throw new OidcUserError('身份服务未返回邮箱，无法登录')
  if (claims.email_verified === false) throw new OidcUserError('邮箱未通过身份服务验证')
  return { email: String(claims.email).toLowerCase(), username: pickUsername(claims, claims.email), back: txn.back }
}
```

补充：

- `OidcUserError` 为可直接展示给用户的错误；其它错误（网络、Dex 返回 `error=access_denied` 等 openid-client 抛出的 `AuthorizationResponseError`/`ResponseBodyError`）统一映射为"OIDC 登录失败，请重试或联系管理员"，细节只进服务端日志，**日志中不得输出 token / code / secret**。
- 邮箱统一小写后再交给 `handleThirdLogin`，避免大小写差异生成重复账号（本地注册路径未做此处理，属既有行为，不在本次范围）。

### 5.3 `server/controllers/user.ts` 新增两个 action

```ts
import * as oidc from '../utils/oidc.js'

async loginByOidc(ctx) {
  if (!oidc.isEnabled()) return (ctx.body = commons.resReturn(null, 404, '未启用 OIDC 登录'))
  try {
    const { url, txn } = await oidc.createAuthorizationRequest(ctx.origin, ctx.query.back)
    ctx.cookies.set(oidc.TXN_COOKIE, txn, {
      httpOnly: true, sameSite: 'lax', maxAge: 10 * 60 * 1000, path: '/api/user/login_by_oidc',
    })
    ctx.redirect(url.href)
  } catch (e) {
    commons.log(`oidc login: ${e.message}`, 'error')
    ctx.redirect('/login?oidc_error=' + encodeURIComponent('身份服务暂不可用，请稍后重试'))
  }
}

async oidcCallback(ctx) {
  const txn = ctx.cookies.get(oidc.TXN_COOKIE)
  ctx.cookies.set(oidc.TXN_COOKIE, null, { path: '/api/user/login_by_oidc' })   // 一次性，用完即删
  try {
    if (!oidc.isEnabled()) throw new oidc.OidcUserError('未启用 OIDC 登录')
    if (!txn) throw new oidc.OidcUserError('登录会话不存在或已过期，请重新登录')
    const { email, username, back } = await oidc.handleCallback(ctx.querystring, txn)
    await this.handleThirdLogin(email, username)   // 既有逻辑：按邮箱找/建用户（type third + 私有分组）、写登录 cookie
    ctx.redirect(back)
  } catch (e) {
    commons.log(`oidc callback: ${e.message}`, 'error')
    ctx.redirect('/login?oidc_error=' + encodeURIComponent(oidc.publicMessage(e)))
  }
}
```

- 两个 action 内部自行 try/catch 并重定向，**不能**让异常冒到 `createAction` 的兜底（那里会把响应改写成 JSON `40011 服务器出错`，浏览器会停在一页 JSON 上）。
- cookie `path` 设为 `/api/user/login_by_oidc`，按 RFC 6265 前缀匹配同时覆盖发起与回调两个路径，不会随其它请求发送。
- `sameSite: 'lax'` 是必需的：回调是从 Dex 域发起的顶级 GET 导航，`strict` 会导致 cookie 不随回调请求发送。
- 沿用 `handleThirdLogin` 意味着：同邮箱已存在的本地账号会被直接登录（与 LDAP 一致的"按邮箱关联"策略），新用户自动建 `User-<uid>` 私有分组并发欢迎邮件（mail 启用时）。

### 5.4 `server/controllers/base.ts`

- `ignoreRouter` 增加 `/api/user/login_by_oidc`、`/api/user/login_by_oidc/callback`（精确匹配，两条都要）。
- `getLoginStatus` 在 `ladp`、`canRegister` 旁增加：
  ```ts
  body.oidc = oidc.isEnabled()
  body.oidcName = (cons.WEB_CONFIG.oidc && cons.WEB_CONFIG.oidc.name) || 'OIDC'
  ```
  只下发开关与展示名，issuer / id / secret 一律不出服务端。

### 5.5 `server/router.ts`

`user` 分组追加（前缀 `/user/`）：

```ts
{ action: 'loginByOidc', path: 'login_by_oidc', method: 'get' },
{ action: 'oidcCallback', path: 'login_by_oidc/callback', method: 'get' },
```

### 5.6 依赖

- `server/package.json` 新增 `"openid-client": "^6.8.7"`（传递依赖 `jose`、`oauth4webapi`，共 3 个包）。
- 顺带移除无引用的 `yapi-plugin-qsso`（旧 QSSO 第三方登录插件，随插件机制停摆已成死依赖）。

## 六、客户端改动

### 6.1 `client/reducer/modules/user.ts`

`initialState` 增加 `isOIDC: false, oidcName: 'OIDC'`；`GET_LOGIN_STATE` 分支增加：

```ts
isOIDC: !!action.payload.data.oidc,
oidcName: action.payload.data.oidcName || 'OIDC',
```

### 6.2 `client/containers/Login/LoginForm.tsx`

- 从 store 取 `isOIDC`、`oidcName`；在登录按钮下方渲染分隔线 + 幽灵按钮：
  ```tsx
  {isOIDC && (
    <>
      <div className="login-breakline"><span className="login-breakword">或</span></div>
      <Button style={changeHeight} type="primary" ghost className="login-form-button"
        onClick={() => window.location.assign('/api/user/login_by_oidc')}>
        使用 {oidcName} 账号登录
      </Button>
    </>
  )}
  ```
  这是整页跳转的重定向流程，不能走 axios。`Login.scss` 里注释代码遗留的 `.qsso-breakline / .qsso-breakword` 样式直接复用，类名改为 `login-breakline / login-breakword`。
- `componentDidMount` 读取 `location.search` 的 `oidc_error`：有值则 `message.error(值)` 并 `history.replace('/login')` 清掉查询串。
- 清理遗留：删除 QSSO 注释块与 `console.log('isLDAP', ...)`。
- 首页游客区 `Home.tsx` 的 `ThirdLogin` 钩子渲染保持原样，不在首页额外加按钮（登录页一处入口足够；如需要可作为可选项后补）。

### 6.3 `client/webpack.dev.ts` 开发代理透传原始 Host

现有代理 `changeOrigin: true` 会把转给 Koa 的 `Host` 改写为 `127.0.0.1:3000`。Koa 已开 `app.proxy = true`，`ctx.origin` 优先读 `X-Forwarded-Host / X-Forwarded-Proto`，因此只需给代理加一项：

```ts
{ context: '/api/', target: 'http://127.0.0.1:3000', changeOrigin: true, ws: true, xfwd: true }
```

否则开发态推导出的回调地址是 `http://127.0.0.1:3000/...`，Dex 会把浏览器送回 3000 端口，而事务 cookie 落在 `localhost`（8080 开发服务器所在 host），回调拿不到 cookie，登录必然失败。dev server 未显式设 `port`，即 webpack-dev-server 默认 8080，也正是 Dex client 名 `local8080` 的来历。

## 七、部署与配置

### 7.1 发布镜像 `docker/release/start.ts`

`configShape` 增加：

```ts
oidc: {
  enable: Boolean,
  issuer: String,
  id: String,
  secret: String,
  redirectUri: String,
  name: String,
},
```

按既有规则自动映射环境变量：`YAPI_OIDC_ENABLE`、`YAPI_OIDC_ISSUER`、`YAPI_OIDC_ID`、`YAPI_OIDC_SECRET`、`YAPI_OIDC_REDIRECT_URI`、`YAPI_OIDC_NAME`。`defaultConfig` 不加 oidc（缺省即未启用）。

### 7.2 反向代理与回调地址

- 不配置 `redirectUri` 时由 `ctx.origin` 推导，要求 nginx 等代理透传 `X-Forwarded-Host` 与 `X-Forwarded-Proto`。
- 生产环境建议**显式配置 `redirectUri`**：一是与 Dex 侧登记值逐字一致（含协议、端口、末尾无斜杠），二是不再信任任何请求头，消除 `app.proxy = true` 下伪造 `X-Forwarded-Host` 的隐患。
- Dex 侧：当前 `local8080` 对回调地址不设限（见第二章），但生产域名上线前应与 Dex 管理员确认是否需要正式登记，以及是否应为生产单独建 client。

## 八、安全要点

1. **协议层**：PKCE S256 防授权码拦截；`state` 防 CSRF；`nonce` 防 id_token 重放；id_token 签名经 JWKS 校验，iss/aud/exp/nonce 由 openid-client 校验；userinfo 的 `sub` 与 id_token 比对。
2. **事务 cookie**：HS256 JWT，密钥 `WEB_CONFIG.passsalt`（与 `utils/token.ts` 同源；`config.json` 已配置，缺省回退同一 defaultSalt，生产必须显式配置），10 分钟过期，`httpOnly` + `SameSite=Lax` + 限定 path，回调时无论成败立即删除。
3. **账号关联策略**：以邮箱为主键，沿用 LDAP 既有策略；邮箱缺失拒绝登录，`email_verified === false` 拒绝登录（未返回该 claim 视为通过）。前提是 Dex 及其上游 Yotta 连接器的邮箱由组织管控，用户不能自行填写任意邮箱。
4. **开放重定向**：`back` 只接受以单个 `/` 开头的站内路径。
5. **信息暴露**：`/api/user/status` 只下发 `oidc` 布尔值与 `oidcName`；错误页文案不含 Dex 原始错误；日志不含 token / code / secret。
6. **登出语义**：Dex 无 `end_session_endpoint`，YApi 登出只清本站 cookie；用户再点 OIDC 登录会因 Dex 会话仍在而直接免密进入，属预期行为，需在使用说明中告知。

## 九、实施步骤

- [x] `server`：`npm i openid-client@^6.8.7`，移除 `yapi-plugin-qsso`
- [x] `server/utils/oidc.ts` 新建（含 `OidcUserError`、`publicMessage`、`isEnabled`、`getConfiguration`、`sanitizeBackPath`、`pickUsername`、`signTxn/verifyTxn`、`createAuthorizationRequest`、`handleCallback`）
- [x] `server/controllers/user.ts` 新增 `loginByOidc`、`oidcCallback`
- [x] `server/controllers/base.ts`：`ignoreRouter` 两条路径；`getLoginStatus` 下发 `oidc` / `oidcName`
- [x] `server/router.ts` 注册两条路由
- [x] `config_example.json` 补 `oidc` 示例（及 `passsalt` / `closeRegister` / `ldapLogin`）
- [x] `client/reducer/modules/user.ts`：`isOIDC` / `oidcName`
- [x] `client/containers/Login/LoginForm.tsx`：按钮、错误提示、清理注释；`Login.scss` 类名改名
- [x] `client/webpack.dev.ts`：代理加 `xfwd: true`
- [x] `docker/release/start.ts`：`configShape.oidc`
- [x] `server/utils/oidc.test.ts`（实际用 Node 内置 test runner，见十二节差异 1）：`sanitizeBackPath`（正常路径 / 空 / `//evil` / 反斜杠 / 非字符串）、`pickUsername` 三级回退、`signTxn → verifyTxn` 往返与篡改拒绝（纯函数，不触网）
- [ ] 提交前确认 `config.json` 中的真实 secret 未被纳入提交

## 十、验证清单

1. **静态检查**：`server` 下 `npx tsc --noEmit --ignoreDeprecations "6.0"` 与基线对比无新增错误（2026-09-04 基线：1503 个既有错误）；`client` 下 `npm run prod` 通过；根目录 `npm test` 通过。
2. **开发态全链路**（浏览器访问 `http://localhost:8080`，经代理到 3000）：
   - 未登录访问登录页可见"使用 Yotta 账号登录"按钮；`oidc.enable=false` 时按钮消失且 `/api/user/login_by_oidc` 返回 404 JSON；
   - 首次用 Yotta 账号登录：自动创建 `type: 'third'` 用户与 `User-<uid>` 私有分组，落在 `/group`，Header 显示用户名；
   - 用与既有本地账号相同邮箱的 Yotta 账号登录：直接进入该账号，不新建；
   - 在 Dex 取消 / 拒绝授权：回到 `/login` 并弹出错误提示，URL 查询串被清理；
   - 删除或篡改 `_yapi_oidc` cookie 后访问回调地址：拒绝并提示会话过期；
   - `?back=/project/1` 生效；`?back=//evil.com`、`?back=http://evil.com` 回落 `/group`；
   - 登出后再点 OIDC 登录：Dex 免密直进（预期）。
3. **用户资料页**：OIDC 用户在 `Profile.tsx` 显示"第三方登陆"，修改密码入口隐藏（既有 `type === 'third'` 逻辑）。
4. **发布镜像**：以 `YAPI_OIDC_*` 环境变量启动，`/api/user/status` 返回 `oidc: true`，登录往返成功。

## 十一、风险与待确认

| 风险 | 说明 | 应对 |
|---|---|---|
| 生产回调地址未登记 | 当前 Dex client 对回调不设限，可能是测试期配置 | 上线前与 Dex 管理员确认；显式配置 `redirectUri` |
| 上游用户无邮箱 | Yotta 连接器若对部分用户不下发 `email`，这些用户无法登录 | 已回退 userinfo；仍无邮箱则明确报错，属预期 |
| 邮箱变更导致账号分裂 | 关联主键是邮箱而非 `sub`，用户在 IdP 改邮箱会生成新 YApi 账号 | 本期接受；后续可在 user 模型加 `oidc_sub` 做稳定关联 |
| Dex 不可达 | 首次登录时才做 discovery，失败会提示"身份服务暂不可用"，不影响进程与其它登录方式 | discovery 失败即清缓存，下次自动重试 |
| `passsalt` 未配置 | 事务 cookie 会退回公开的 defaultSalt | 生产配置强制要求 `passsalt`（与既有 token 机制同样的要求） |
| 真实 secret 误提交 | `config.json` 受版本控制 | 提交前 diff 复核；发布环境走环境变量 |

## 十二、实施记录

2026-09-04 实施完成，尚未提交。

### 12.1 改动文件

| 范围 | 文件 | 说明 |
|---|---|---|
| server | `package.json` / `package-lock.json` | +`openid-client@^6.8.7`（传递依赖 jose、oauth4webapi），−`yapi-plugin-qsso` |
| server | `utils/oidc.ts`（新） | 全部 OIDC 逻辑与纯函数 |
| server | `utils/token.ts` | `defaultSalt` 增加 `export`，供事务 cookie 密钥回退复用 |
| server | `controllers/user.ts` | `loginByOidc`、`oidcCallback` |
| server | `controllers/base.ts` | `ignoreRouter` 两条路径；`checkOIDC()`；`getLoginStatus` 下发 `oidc` / `oidcName` |
| server | `router.ts` | `user` 分组两条 GET 路由 |
| server | `tsconfig.json` | 增加 `skipLibCheck: true`（见 12.2 差异 2） |
| client | `reducer/modules/user.ts` | `isOIDC` / `oidcName` |
| client | `containers/Login/LoginForm.tsx` | OIDC 按钮、`oidc_error` 提示、清理 QSSO 注释与 `console.log` |
| client | `containers/Login/Login.scss` | `.qsso-*` → `.login-breakline / .login-breakword`，新增 `.login-oidc-button` |
| client | `webpack.dev.ts` | 代理加 `xfwd: true` |
| 其它 | `config_example.json` | `oidc` 块补 `redirectUri`、`name` |
| 其它 | `config.json`（本地） | `oidc.name = "Yotta"`（不提交） |
| 其它 | `docker/release/start.ts` | `configShape.oidc` 六个字段 |
| 其它 | `server/utils/oidc.test.ts`（新） | 5 个用例 |

### 12.2 与方案的差异

1. **单测改用 Node 内置 test runner**：`cd server && node --import tsx --test utils/oidc.test.ts`。根目录 ava 0.22 + babel-register 无法解析 `.js → .ts` 的 ESM 导入，既有的 `test/server/commons.test.js` 同样跑不起来（`ERR_MODULE_NOT_FOUND server/utils/commons.js`），属既有问题。
2. **`server/tsconfig.json` 加 `skipLibCheck: true`**：openid-client / oauth4webapi 的 `.d.ts` 引用 fetch 全局类型（`Request` / `Response` / `Headers` / `ReadableStream`），而 server 安装的 `@types/node` 仍是 17.0.33，没有这些全局声明，产生 52 个第三方声明错误。`skipLibCheck` 同时消掉了既有的 22 个第三方 `.d.ts` 错误。根治是升级 `@types/node`，见十三节。
3. **OIDC 按钮用默认样式**（`.login-oidc-button`，宽 100%）而非方案中的 ghost：`.login-form-button` 带 `!important` 渐变背景，ghost 会被覆盖成与主按钮一样的外观。
4. **事务 cookie 密钥回退值复用 `utils/token.ts` 的 `defaultSalt`**（新增 export），不重复定义常量。
5. **控制器新方法显式标注 `ctx: Context`、`catch (e: any)`**，并给 `commons.log` 传满两个参数：TypeScript 6.0 默认 `strict`，不这样写会新增与文件内既有模式相同的类型错误。
6. `getConfiguration()` 内用解构缺省值收窄可选字段类型（`const { issuer = '', id = '', secret = '' } = getConfig()`），调用方仍以 `isEnabled()` 为准。

### 12.3 验证结果

1. **单测**：5/5 通过。
2. **server 类型检查**：`npx tsc --noEmit --ignoreDeprecations "6.0"` 共 1481 个错误 = 基线 1503 − 22 个被 `skipLibCheck` 消掉的第三方 `.d.ts` 错误；业务代码零新增（`utils/oidc.ts` 0 个，`user.ts` 新增代码段 0 个，`base.ts` 的 1 个为既有错误随行号下移）。
3. **client 生产构建**：`npm run prod` 通过（37s，3 个既有体积告警）。**发布镜像脚本**：`docker/release` 下 `tsc --noEmit` 通过。
4. **eslint**：server / client 改动文件 0 error；剩余 warning 均为既有模式（`class-methods-use-this`、既有行的 prettier 格式）。
5. **接口冒烟**（本地 Mongo，`node --import tsx app.ts`，curl）：
   - `GET /api/user/status` 下发 `oidc: true, oidcName: "Yotta"`；
   - `GET /api/user/login_by_oidc?back=/project/1`（带 `X-Forwarded-Host: localhost:8080`）302 到 Dex `/auth`，参数含 `redirect_uri=http://localhost:8080/api/user/login_by_oidc/callback`、`scope=openid email profile`、`code_challenge` + `S256`、`state`、`nonce`、`client_id`；`Set-Cookie: _yapi_oidc` 带 `path=/api/user/login_by_oidc; samesite=lax; httponly`，10 分钟过期；解码载荷 `back = /project/1`；
   - 不带 `X-Forwarded` 头时 `redirect_uri` 推导为 `http://127.0.0.1:3000/...`（符合预期；生产请显式配置 `redirectUri`）；
   - `back=//evil.com` → 载荷 `back = /group`；
   - 回调无 cookie → 302 `/login?oidc_error=登录会话不存在或已过期…`；
   - 回调有 cookie 但 `state` 不符 → 302 通用错误文案，cookie 被删除（`expires=1970`）；
   - 回调 `state` 一致但 `code` 伪造 → 真实请求 Dex token 端点被拒（日志 `server responded with an error in the response body`），302 通用错误文案；
   - 未登录访问 `/api/user/list` 仍返回 40011，白名单未误放行。
6. **未验证（需人工）**：需要真实 Yotta 账号在浏览器完成的完整登录链路（新用户自动建号与私有分组、同邮箱关联既有账号、Dex 侧取消授权、登出后免密直进）、登录页按钮与错误提示的实际展示、Profile 页"第三方登陆"展示。

## 十三、待决策事项（实施后发现的缺陷与风险）

| # | 事项 | 现状 / 影响 | 可选方案 |
|---|---|---|---|
| 1 | 完整登录链路未经真人验证 | 冒烟只覆盖到 Dex token 端点拒绝伪造 code；id_token 校验、userinfo 回退、建号入库未在真实回调中跑过 | 由开发者用 Yotta 账号在 `http://localhost:8080` 走一遍第十节第 2 项清单 |
| 2 | `config.json` 含真实 secret 且受版本控制 | 提交时极易带入 | a) 提交前手工把 secret 改回占位符；b) `git update-index --skip-worktree config.json`；c) 把 `config.json` 移出版本控制，只保留 `config_example.json` |
| 3 | 发布镜像无法通过环境变量设置 `passsalt` | `docker/release/start.ts` 的 `configShape` 没有 `passsalt`，容器部署时 `utils/token.ts` 与事务 cookie 都回退到公开常量 `'abcde'`（既有弱点，OIDC 使其影响面扩大） | 在 `configShape` 增加 `passsalt: String`（映射 `YAPI_PASSSALT`），并在文档中标为生产必填 |
| 4 | `@types/node` 17.0.33 与 Node 24 运行时不匹配 | 本次用 `skipLibCheck` 绕过；实际会让所有 fetch / WebCrypto 全局在类型层不可见 | 升级 server 的 `@types/node` 到 `^24`，随后评估是否撤掉 `skipLibCheck` |
| 5 | 根目录 ava 测试基础设施失效 | `npm test` 里既有用例全部无法运行 | a) 全部迁到 Node 内置 test runner（与本次 `oidc.test.ts` 一致）；b) 升级 ava 并配 tsx loader |
| 6 | Dex client `local8080` 对回调地址不设限 | 测试期方便，生产应收紧 | 与 Dex 管理员确认；生产单独建 client 并登记精确回调地址，YApi 侧显式配置 `redirectUri` |
| 7 | 账号关联以邮箱为主键 | 用户在 IdP 改邮箱会产生新 YApi 账号；同邮箱既有本地账号会被直接登录（沿用 LDAP 策略） | a) 接受；b) user 模型增加 `oidc_sub` 字段做稳定关联（含数据迁移） |
| 8 | `email_verified` 缺失视为通过 | 仅在显式 `false` 时拒绝；Yotta 连接器是否总是下发该 claim 未知 | a) 接受；b) 改为必须为 `true`（需先确认 Yotta 连接器行为） |
| 9 | 登出不联动 Dex | Dex 无 `end_session_endpoint`，登出后再点 OIDC 登录会免密直进 | a) 接受并写入使用说明；b) 登出后在登录页给出"如需切换账号请先在身份服务登出"的提示 |
| 10 | `redirect_uri` 推导信任 `X-Forwarded-Host` | `app.proxy = true` 下未配置 `redirectUri` 时由请求头推导 | a) 生产强制配置 `redirectUri`（`isEnabled()` 增加该字段校验，或仅在 `NODE_ENV=production` 时要求）；b) 保持现状，靠部署文档约束 |
| 11 | 事务 cookie 与登录 cookie 均未带 `Secure` 属性 | 与既有 `_yapi_token` 行为一致；HTTPS 部署下更稳妥的做法是加 `secure: ctx.secure` | a) 保持一致；b) 本次两个新 cookie 加 `secure: ctx.secure`；c) 连同既有登录 cookie 一起加 |
| 12 | Dex 不可达时首个登录请求承担 discovery 延迟 | 最长 15s 超时后提示"身份服务暂不可用" | a) 接受；b) 启动时异步预热一次 `getConfiguration()`（失败只记日志） |
| 13 | 首页游客区无 OIDC 入口 | 只有 `/login` 页有按钮 | a) 接受；b) `Home.tsx` 的"登录 / 注册"旁加同样按钮 |
| 14 | 登录页按钮未传 `back` | 登录成功固定回 `/group`；服务端已支持 `?back=` | a) 接受；b) `LoginForm` 记录进入登录页前的路径并透传 |
| 15 | `groups` scope 未使用 | Dex 支持 `groups` claim，可用于自动映射 YApi admin 角色 | 后续需求再议 |
