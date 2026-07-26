# cross-request（Manifest V3）

赋予 YApi 页面跨域请求能力的 Chrome 扩展：在 YApi 上做接口测试时，可直接请求本机 / 内网可达的后端接口，不受浏览器 CORS 限制。

本目录是对旧版 [YMFE/cross-request](https://github.com/YMFE/cross-request)（Manifest V2）的完全重写。Chrome 已于 2025 年彻底停用 MV2 扩展，旧版依赖的持久后台页与 `webRequestBlocking` 在 MV3 下均不存在，因此按 MV3 能力重新实现，对 YApi 客户端保持 API 完全兼容（`window.crossRequest` 契约不变，client 侧零改动）。设计方案详见仓库 `design/chrome插件cross-request升级MV3.md`。

## 安装

扩展不上架 Chrome 商店，使用开发者模式加载：

1. 拉取本仓库代码；
2. 打开 `chrome://extensions`，右上角开启「开发者模式」；
3. 点击「加载已解压的扩展程序」，选择 `chrome-cross-request` 目录；
4. 刷新已打开的 YApi 页面，接口测试页的「安装插件」警告消失即表示生效。

更新方式：`git pull` 后在 `chrome://extensions` 中点击该扩展的「重新加载」按钮，并刷新 YApi 页面。

要求 Chrome ≥ 116。

## 架构

```
YApi 页面 ── window.crossRequest(options)          [page-api.js, 主世界 content script]
  │ window.postMessage                                       ↑ 回调分发
  ▼                                                          │
relay.js（隔离世界 content script）──────────────── window.postMessage
  │ chrome.runtime.sendMessage（自动唤醒休眠的 SW）
  ▼
background.js（Service Worker）
   • fetch + host_permissions 发起真实请求（不受 CORS 限制）
   • Cookie / User-Agent / Host 等浏览器禁设头经 declarativeNetRequest 会话规则注入
   • webRequest 观察模式捕获完整响应头（含 Set-Cookie）
   • 请求在途期间心跳保活，支持超长超时（YApi 默认 82400000ms）
```

仅在带有 `<meta id="cross-request-sign">` 标记的页面（YApi 页面模板自带）上激活，其他页面不注入 API、不代理任何请求。

## API

```js
crossRequest(options)
```

### GET

```js
crossRequest({
  url: 'http://127.0.0.1:3000/api/user?id=1',
  method: 'GET',
  success: function (res, header, data) {},
  error: function (err, header, data) {},
})
```

### POST

```js
crossRequest({
  url: 'http://127.0.0.1:3000/api',
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  data: { a: 1, b: 2 },
  success: function (res, header, data) {},
})
```

约定（与旧版一致）：

- 仅 `status === 200` 触发 `success`，其余状态码触发 `error`；
- 第三个参数 `data` 为 `{ req, res: { status, statusText, header, body }, runTime }`；
- 异常（超时、目标不可达等）时 `data.res.status` 为 `undefined`，`body` 为错误信息；
- 未显式指定 `Content-Type` 时，非 GET 请求默认按 `application/x-www-form-urlencoded` 序列化 `data`。

## 与旧版的差异

- 不自动携带浏览器 Cookie（与旧版跨域 XHR 行为一致）；需要 Cookie 时在请求头中显式填写，扩展会将其真实注入；
- 文件上传（`options.files` / `options.file`）暂未实现——该功能在旧版 3.x 走后台通道后实际早已失效，如有需求再补；
- Chrome 138+ 从公网部署的 YApi 页面请求本机/内网地址时，浏览器可能弹出「本地网络访问」授权，允许一次即可。

## 调试

- Service Worker 日志：`chrome://extensions` → 本扩展 → 「服务工作进程 (service worker)」链接打开 DevTools；
- 页面侧日志：YApi 页面的 DevTools Console（page-api.js / relay.js 运行于页面内）；
- 请求由扩展 Service Worker 发出，**YApi 页面 DevTools 的 Network 面板看不到目标请求属正常现象**，要看请求需打开上述 SW 的 DevTools；
- 请求未生效时优先检查：扩展是否启用、YApi 页面是否在扩展安装/重载后刷新过。

### 报「请求异常 / Error:Failed to fetch」但目标服务正常

大概率是扩展的「站点访问权限」被收窄了（Chrome 会把 manifest 申请的全站点权限扣留，
只授予用户点选过的站点）。此时内容脚本在 YApi 页面照常注入（插件检测显示已安装），
但 SW 对未授权主机的 fetch 会退化为受 CORS 约束的普通请求，被不支持 CORS 的目标服务拒绝。

修复：`chrome://extensions` → cross-request → 详情 → 「站点访问权限」（允许此扩展读取和更改您在
所访问网站上的所有数据）→ 选择「在所有网站上」。
