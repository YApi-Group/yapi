# chrome-cross-request 插件升级 Manifest V3 方案

> 编写日期：2026-07-25。文中所有文件路径、行号均已在该日期的代码状态下核实。实施时如行号有偏移，以文中给出的搜索关键字重新定位为准。
>
> 本文档面向「全新上下文」的实施者，包含全部调研结论，无需回溯其他资料即可开工。

## 一、背景：插件为什么失效了

`chrome-cross-request/` 目录存放的是 YApi 配套的 Chrome 扩展 **cross-request v3.1（Manifest V2）**。它让 YApi 页面（部署在任意域名）能直接请求开发者本机/内网可达的后端接口，是「接口测试」功能（Postman 面板、测试集合）的运行前提。

失效原因是 Chrome 对 Manifest V2 的分阶段停用：

- 2024-06 起（Chrome 127+）：Stable 渠道逐步禁用 MV2 扩展；
- 2025-06（Chrome 138）：企业策略 `ExtensionManifestV2Availability` 豁免到期，MV2 彻底不可加载。

旧插件依赖两个 **MV2 专属能力**，MV3 下均不存在，因此无法「改个 manifest 版本号」了事，必须重写：

1. **持久后台页**（`background.html` + XHR + `localStorage`）—— MV3 只有 Service Worker，无 DOM、无 XHR、无 localStorage、空闲 30 秒即被终止；
2. **`webRequestBlocking`**（同步修改请求/响应头）—— MV3 中仅企业策略强装扩展可用，普通安装一律不可用，替代品是 `declarativeNetRequest`。

另外官方仓库 [YMFE/cross-request](https://github.com/YMFE/cross-request) 已多年不维护，且早年就因隐私政策问题被 Chrome 商店下架（[YMFE/yapi#1603](https://github.com/YMFE/yapi/issues/1603)），社区没有可靠的 MV3 版本。插件源码就在本仓库，自己重写是最可控的路径。

## 二、现状快照（实施前必读)

### 2.1 旧插件架构（chrome-cross-request/）

| 文件 | 角色 | 备注 |
|---|---|---|
| `manifest.json` | MV2 声明 | permissions 仅 `webRequest`+`webRequestBlocking`，**未声明 host 权限**（疑为当年过审整改遗留，MV3 版必须补上 `host_permissions`） |
| `index.js` | 注入页面主世界的脚本 | 定义 `window.crossRequest`，经 `web_accessible_resources` + script 标签注入 |
| `response.js` | content script（隔离世界） | 页面 ↔ 后台的中转，并负责注入 index.js |
| `background.js` | MV2 持久后台页脚本 | 真正发 XHR + webRequestBlocking 改头 |
| `popup.html` / `popup.js` | 工具栏弹窗 | 现为纯静态说明页，URL 白名单功能整段被注释，`popup.js`、`jquery-3.1.1.js` 为死代码 |
| `background.html` / `index.html` / `icon.png` | 后台页壳 / 演示页 / 图标 | |

**数据流（旧）**——三层之间用「隐藏 DOM + 轮询」和「runtime port」通信：

```
YApi 页面 window.crossRequest(options)                     [index.js, 主世界]
  │  把 {req} base64 编码写入隐藏容器 div#y-request 的子 div（status=0）
  │  自身每 50ms 轮询容器里 status=2 的 div 取回结果
  ▼
content script 每 100ms 轮询 #y-request                    [response.js, 隔离世界]
  │  status=0 → 置 1，decode，记 runTime，经 chrome.runtime.connect 端口发 {id, req}
  │  收到 {id, res} 后 encode 写回对应 div 并置 status=2
  ▼
后台页 XHR 发真实请求                                       [background.js]
     • GET/HEAD/OPTIONS 删 Content-Type；其余默认 x-www-form-urlencoded（data 做
       urlencode），CT 为 json 等时 JSON.stringify(data)；query 对象拼进 url
     • xhr.timeout = req.timeout || 1000000
     • 21 个浏览器禁设头（Cookie/User-Agent/Host/Referer…）不直接 set，而是打包进
       自定义头 cross-request-unsafe-headers-list，再打标 cross-request-open-sign: 1
     • webRequest.onBeforeSendHeaders(blocking)：识别打标请求，解包写入真实请求头
     • webRequest.onHeadersReceived(blocking)：把全部响应头（含 Set-Cookie）打包进
       cross-response-unsafe-headers-list 塞回响应，供 XHR 侧读取（绕过 XHR 读不到
       Set-Cookie 的限制）
     • status==200 走 successFn，其余走 errorFn
```

### 2.2 YApi 客户端调用面（升级必须保持的兼容契约）

引用位置：

- `common/postmanLib.js:347` —— `window.crossRequest(options)`，唯一真正调用点（`crossRequest()` 函数定义于 255 行，被 Postman 面板与测试集合共用）；
- `client/components/Postman/CheckCrossInstall.js:5` —— `initCrossRequest`：每 500ms 检测 `window.crossRequest` 是否存在，共 5 秒，据此渲染「需安装插件」警告并禁用发送按钮；
- `client/components/Postman/Postman.js:267`、`client/containers/Project/Interface/InterfaceCol/InterfaceColContent.tsx:190` —— 消费 `hasPlugin`；
- `client/static/index.dev.ejs:4`、`index.prod.ejs:4` —— `<meta id="cross-request-sign" charset="utf-8" />`，插件的激活标记（`index.js:3` 检测到才注入 API）。

**契约明细**（新插件必须逐项对齐，客户端零改动）：

1. `window.crossRequest(options)`：options 关键字段 `url`、`method`、`headers`、`data`、`query`、`timeout`、`success`、`error`（options 里还会带 `taskId`、`caseId` 等业务字段，插件忽略即可）。
2. 回调签名：`success(res.body, res.header, data)`、`error(res.statusText, res.header, data)`。
3. **`data` 对象是核心契约**：`{ req, res: { id, status, statusText, header, body }, runTime }`。注意 `res.header` 是**单数**（对象形式的响应头），`runTime` 为毫秒耗时。`postmanLib.js:329-345` 只消费 `data.res.status / data.res.body / data.res.header`。
4. 分发规则：`res.status === 200` 走 success，**其余一律走 error**（含 2xx 其他码；postmanLib 里 success/error 是同一个函数，靠 status 再判断，所以无碍）。
5. **异常路径的隐性契约**：网络错误/超时时旧版返回的 `res` 只有 `body`（错误文案），`status` 为 `undefined`。`postmanLib.js:337` 用 `isNaN(data.res.status)` 判定异常并 reject。因此新版**异常时严禁把 status 置为 0 或 null**（`isNaN(0)`/`isNaN(null)` 均为 false，会被误判为成功），必须保持 `undefined`。
6. 检测方式：`window.crossRequest` 挂上 window 即视为已安装（5 秒轮询窗口内）。

### 2.3 旧插件顺带可修复的问题

- 双层 DOM 轮询（50ms + 100ms）+ 手写 base64 编解码 —— 纯历史包袱，`postMessage` 结构化克隆可直接传对象；且手写 base64 里 `REGEX_SPACE_CHARACTERS = /<%= spaceCharacters %>/g` 是未渲染的 lodash 模板占位符（凑巧无害的 bug），三个文件各复制了一份约 150 行；
- **文件上传（`options.files/file`）在旧版实际已失效**：带文件逻辑的 `sendAjaxByContent` 在 `response.js:388-400` 被整段注释，统一走后台通道 `sendAjaxByBack`，而 `background.js` 的 `sendAjax` 没有任何 files 处理。`common/postmanLib.js:470` 仍会组装 `files` 字段，但运行时等于被忽略。新版按「阶段二可选」处理（见 4.7）；
- `jquery-3.1.1.js`、`popup.js`、`background.html`、`index.html` 均为死代码/无用文件，重写时删除。

## 三、方案对比

| 方案 | 结论 | 说明 |
|---|---|---|
| **A. 插件重写为 MV3（推荐）** | ✅ 主方案 | 用户体验与旧版完全一致，客户端近零改动；MV3 能力（SW fetch + host_permissions 绕 CORS、declarativeNetRequest 改禁设头、webRequest 观察模式读 Set-Cookie）足以完整复刻旧功能。工作量：4 个新文件约 400~500 行，无构建、零依赖 |
| B. 换 Firefox 继续用旧插件 | 🔶 临时过渡 | Firefox 长期保留 `webRequestBlocking`（MV2/MV3 均可用），旧插件加 `browser_specific_settings` 后基本可直接装。不解决 Chrome 用户问题，只作为方案 A 落地前的应急口径 |
| C. 本地代理进程 | 🔶 长期补充 | 每个开发者本机跑一个小型 Node 转发服务，YApi 页面 fetch `http://127.0.0.1:<port>` 中转（loopback 不算混合内容，可在 HTTPS 页面直接访问；Chrome 138+ 会弹一次 Local Network Access 授权）。优点：不依赖任何浏览器扩展机制；缺点：需常驻进程 + client 需要新增一条传输层分支（`postmanLib.js:324-327` 的 `isNode` 分支和 `httpRequestByNode` TODO 与此方向呼应）。不在本次范围 |
| D. YApi 服务端代理转发 | ❌ 不满足需求 | server 部署在远端时够不着开发者本机 `127.0.0.1` 的后端，这正是插件存在的原因（官方也讨论过并否决：[YMFE/yapi#1159](https://github.com/YMFE/yapi/issues/1159)） |

## 四、方案 A 详细设计

### 4.1 新目录结构与 manifest.json

在 `chrome-cross-request/` 原地重写（旧文件删除），零依赖、无构建步骤：

```
chrome-cross-request/
├── manifest.json      # MV3 声明
├── page-api.js        # 主世界 content script：window.crossRequest
├── relay.js           # 隔离世界 content script：消息中转
├── background.js      # Service Worker：fetch + DNR + webRequest 观察
├── popup.html         # 静态说明页（无 js）
├── icon.png
└── README.md          # 更新安装说明（开发者模式加载）
```

```json
{
  "manifest_version": 3,
  "name": "cross-request",
  "description": "YApi 跨域请求（Manifest V3）",
  "version": "4.0.0",
  "minimum_chrome_version": "116",
  "action": { "default_icon": "icon.png", "default_popup": "popup.html" },
  "background": { "service_worker": "background.js" },
  "permissions": ["declarativeNetRequest", "webRequest"],
  "host_permissions": ["http://*/*", "https://*/*"],
  "content_scripts": [
    {
      "matches": ["http://*/*", "https://*/*"],
      "js": ["page-api.js"],
      "world": "MAIN",
      "all_frames": true
    },
    {
      "matches": ["http://*/*", "https://*/*"],
      "js": ["relay.js"],
      "all_frames": true
    }
  ]
}
```

要点：

- **`world: "MAIN"`**（Chrome 111+ 支持声明式主世界注入）取代旧版「content script 动态插 script 标签 + web_accessible_resources」的注入方式，时机更早更可靠；
- 两个 content script 都用默认 `run_at: document_idle`——`page-api.js` 需要读取 `<meta id="cross-request-sign">`（位于 head），document_start 时 DOM 尚未就绪；`CheckCrossInstall` 有 5 秒检测窗口，idle 注入完全来得及；
- `host_permissions` 是 SW 侧 fetch 绕过 CORS 的前提（旧 manifest 漏了 host 权限，这次补齐）；
- 不申请 `storage` 等多余权限；仅自用分发（开发者模式加载），不走商店审核，`http(s)://*/*` 全站注入可接受——脚本首行仍按旧版惯例检测 sign 标记，非 YApi 页面立即退出，不产生任何行为。

### 4.2 分层架构与通信协议（新）

```
YApi 页面 ── window.crossRequest(options)          [page-api.js, MAIN world]
  │ window.postMessage({ __crossRequest: 'req', id, req })       ↑回调分发
  ▼                                                              │
relay.js [ISOLATED world] ── window.postMessage({ __crossRequest: 'res', id, res })
  │ chrome.runtime.sendMessage({ id, req })（Promise 化，天然唤醒休眠的 SW）
  ▼
background.js [Service Worker] ── fetch + DNR + webRequest 观察
```

- 三层全部传**纯对象**（postMessage/sendMessage 走结构化克隆或 JSON 序列化），彻底删除 base64 编解码与 DOM 轮询；
- `page-api.js` 职责：检测 `#cross-request-sign`（不存在则不挂 API）→ 挂 `window.crossRequest` → 每次调用生成自增 id，剥离 `success/error` 函数后把可序列化的 `req`（url/method/headers/data/query/timeout）postMessage 出去，并在回包时按 2.2 契约组装 `data` 对象、记 `runTime`、按 `status === 200` 分发回调；
- `relay.js` 职责：校验 `event.source === window` 与消息标记，转发给 SW，把 SW 的应答 postMessage 回主世界。消息标记字段建议用 `__crossRequest` 命名空间，避免与页面自身消息冲突；
- **id 关联**贯穿三层，天然支持并发请求（测试集合是批量跑的）。

### 4.3 SW 侧发请求：fetch 替代 XHR

`background.js` 的 `chrome.runtime.onMessage` 处理器中：

1. **请求规范化**（照搬旧 `background.js:208-235` 语义，保证行为一致）：
   - `method` 默认 GET；GET/HEAD/OPTIONS 删除 Content-Type 且不带 body；
   - 其余方法：无 CT 或 CT 为 `application/x-www-form-urlencoded` → 对 `data` 做 urlencode；CT 为其他（如 json）且 `data` 是对象 → `JSON.stringify`；
   - `query` 对象序列化后拼进 url。
2. **发起**：
   ```js
   const resp = await fetch(url, {
     method, headers: safeHeaders, body,
     credentials: 'omit',          // 旧版跨域 XHR 不带浏览器 cookie，Cookie 仅在用户显式填写时经 DNR 注入，见 4.4
     redirect: 'follow',
     signal: AbortSignal.timeout(req.timeout || 1000000),   // 对齐旧版默认超时
   });
   const body = await resp.text();
   ```
   扩展自身上下文（SW）+ host_permissions ⇒ fetch **不受 CORS 限制**，这是 MV3 对旧「后台页 XHR」的官方等价物。
3. **应答**：`{ status, statusText, header, body }`；`header` 优先取 webRequest 捕获的完整响应头（见 4.5），兜底用 `resp.headers` 迭代结果。
4. **异常**（超时 / TypeError 网络错误）：应答 `{ body: <错误文案> }`——status 保持 `undefined`，对齐 2.2 第 5 条隐性契约。

### 4.4 浏览器禁设头：declarativeNetRequest 会话规则替代 webRequestBlocking

fetch 规范禁止脚本直接设置 `Cookie`、`User-Agent`、`Referer`、`Host`、`Origin` 等头（与旧版 `unsafeHeader` 列表基本一致）。旧版靠 `webRequestBlocking` 改写，MV3 等价物是 **DNR 动态会话规则**（`chrome.declarativeNetRequest.updateSessionRules`），每个请求一条临时规则：

```js
const ruleId = nextRuleId();          // 自增，注意 DNR 规则 id 必须为正整数
await chrome.declarativeNetRequest.updateSessionRules({
  addRules: [{
    id: ruleId,
    action: {
      type: 'modifyHeaders',
      requestHeaders: unsafeEntries.map(([name, value]) => ({ header: name, operation: 'set', value })),
    },
    condition: {
      urlFilter: finalUrl,            // 完整目标 URL
      tabIds: [-1],                   // 关键：-1 = 不属于任何标签页的请求，即 SW 自己发起的 fetch，避免误伤页面流量
      resourceTypes: ['xmlhttprequest'],
    },
  }],
});
try { /* fetch … */ } finally {
  await chrome.declarativeNetRequest.updateSessionRules({ removeRuleIds: [ruleId] });
}
```

注意点：

- 规则生存期仅覆盖单次 fetch（毫秒~秒级），`tabIds: [-1]` 已把影响面收敛到扩展后台自发请求；
- **残余歧义**：同一 URL 同时并发、且禁设头取值不同的多个请求会互相串规则。接口测试场景中该情况几乎不存在；稳妥起见，实现时对「带禁设头且 URL 相同」的请求做 SW 侧串行队列（几行代码），普通请求不受影响；
- 非禁设头直接放进 fetch 的 `headers`，不走 DNR；
- 实现时先在目标 Chrome 版本上验证 `tabIds: [-1]` 对 SW 发起请求的匹配行为（设计时依据文档确认，但属于易变细节）；若不生效，退路是给 URL 追加一次性查询参数 `__crid=<id>` 并用 `urlFilter` 精确匹配，转发前该参数会到达后端，故仅作退路。

### 4.5 完整响应头（含 Set-Cookie）：webRequest 观察模式

fetch 的 `Headers` 读不到 `Set-Cookie`（禁读响应头）。MV3 移除的只是 webRequest 的 **blocking** 能力，**观察模式仍可用**，用它复刻旧版「打包完整响应头」的功能：

```js
chrome.webRequest.onHeadersReceived.addListener(
  details => { if (details.tabId === -1) captured.set(keyOf(details), details.responseHeaders); },
  { urls: ['http://*/*', 'https://*/*'], types: ['xmlhttprequest'] },
  ['responseHeaders', 'extraHeaders']    // extraHeaders 才能拿到 Set-Cookie
);
```

- 关联方式：`tabId === -1` + URL + 时间窗（fetch 前登记、onHeadersReceived 回填、fetch 后取走并清理），与 4.4 相同的并发歧义与相同的处置（同 URL 串行）；
- 多个 `Set-Cookie` 聚合为数组，对齐旧版 `background.js:340-349` 的形状；
- 该监听器同时天然解决重定向后响应头的问题（取最后一次收到的头即可）。

### 4.6 Service Worker 生命周期与超时

- SW 空闲 30 秒被终止是常态，**不需要对抗**：`relay.js` 的 `chrome.runtime.sendMessage` 属于事件驱动，会自动唤醒 SW；
- 需要处理的是**单次长请求超过 30 秒**（旧版默认超时高达 1000000ms）：请求进行中用扩展 API 心跳重置空闲计时器（Chrome 116+ 任何扩展 API 调用都会重置）：
  ```js
  // 有 in-flight 请求期间：
  keepAlive = setInterval(() => chrome.runtime.getPlatformInfo(), 20_000);
  // 计数归零时 clearInterval
  ```
- 超时本身用 `AbortSignal.timeout()`（Chrome 103+，被 `minimum_chrome_version: 116` 覆盖）。

### 4.7 文件上传（阶段二，可选）

如 2.3 所述，该功能在旧版已实际失效多年，客户端虽仍组装 `files` 字段（`common/postmanLib.js:470`）但无人依赖运行结果。若要恢复：

- `page-api.js` 在主世界可直接 `document.getElementById(domId).files[0]` 拿到 File，postMessage 到 relay（同页结构化克隆支持 File）；
- relay → SW 的 `sendMessage` 只支持 JSON，需将文件读为 ArrayBuffer 再转 base64 字符串，SW 侧还原为 Blob 组装 FormData；
- 代价：base64 体积膨胀约 33%，大文件（>20MB 量级）不适用，需在 UI 文案标注。

建议先不做，主流程验收后视需求补。

### 4.8 popup 与安装形态

- `popup.html` 保留为纯静态说明页（指向仓库 README 的安装说明），删除注释掉的白名单 UI 与 `popup.js`/`jquery`；
- 分发方式：不上架商店（旧插件因全站注入被下架的前科 + 自用场景），走 `chrome://extensions` 开发者模式「加载已解压的扩展程序」，或企业内通过策略分发；README 写清步骤。

## 五、客户端配套改动（极小）

1. `client/components/Postman/CheckCrossInstall.js:36-52`：安装引导文案与链接更新——现指向 2020 年的掘金教程，改为指向本仓库 `chrome-cross-request/README.md` 的 MV3 安装说明；
2. 其余**零改动**：`window.crossRequest` API、`data` 契约、sign 标记（两个 ejs 模板中的 `<meta id="cross-request-sign">`）全部原样保留。

## 六、实施步骤

1. 清空 `chrome-cross-request/` 旧实现（保留 icon.png），按 4.1 结构新建 5 个文件；
2. 先打通最小闭环：manifest + page-api + relay + SW 的普通 GET/POST（无禁设头、无 Set-Cookie 捕获），用 YApi Postman 面板验证 `hasPlugin` 检测与基本收发；
3. 补 4.3 请求规范化的全部分支（CT 推断、query 合并、超时、异常路径的 `status: undefined` 契约）；
4. 补 4.4 DNR 禁设头注入 + 同 URL 串行队列；实测验证 `tabIds: [-1]` 匹配行为；
5. 补 4.5 webRequest 响应头捕获（含 Set-Cookie 聚合）；
6. 补 4.6 keepAlive 心跳；
7. 更新插件 README 安装说明 + 客户端 CheckCrossInstall 文案（第五节）；
8. 按第七节清单回归；阶段二再评估 4.7 文件上传。

## 七、测试清单

| 场景 | 验收点 |
|---|---|
| 安装检测 | 加载扩展后刷新 YApi 页，警告条消失、发送按钮可用（Postman.js / InterfaceColContent.tsx 两处） |
| 基本请求 | GET（query 合并）、POST urlencoded / json / raw，回显 status、header、body、耗时 |
| 非 200 | 4xx/5xx 走 error 分支且 `data.res.status` 正确；2xx 非 200 同样走 error（旧版语义） |
| 异常路径 | 目标端口不通 / 超时：postmanLib 走 reject（即 `data.res.status` 为 undefined），页面提示请求异常 |
| 禁设头 | headers 里填 Cookie / User-Agent / Referer，用本地 echo 服务确认后端真实收到 |
| 响应头 | 后端返回 Set-Cookie（含多条），YApi 响应头面板可见 |
| 核心跨域场景 | https 部署的 YApi 页面 → `http://127.0.0.1:*` 本地接口；http 页面 → https 接口 |
| 批量运行 | 测试集合连续跑 20+ 用例（并发 id 关联、pre/after script 场景） |
| SW 生命周期 | 空闲 1 分钟后再发请求（事件唤醒）；单请求持续 >30s（心跳保活不中断） |
| 无害性 | 非 YApi 页面（无 sign 标记）上 `window.crossRequest` 未定义、无任何网络行为 |

## 八、风险与注意点

1. **`tabIds: [-1]` 的 DNR 匹配行为**是本方案唯一「文档确认、未实测」的点，第六节第 4 步安排了显式验证，且已给出退路（一次性查询参数匹配）；
2. 同 URL 并发 + 不同禁设头的串规则风险 → 已用串行队列收敛（4.4）；
3. `credentials: 'omit'` 与旧版跨域 XHR 行为一致（不自动携带浏览器 cookie）；若日后有「带登录态 cookie 调试」诉求，再评估 popup 加开关切 `include`，不在本次范围；
4. Chrome 138+ 对公网页面访问本地网络会弹 Local Network Access 授权，属浏览器级提示，用户允许一次即可，README 提示即可；
5. 插件不上架商店，团队成员需手动加载；版本更新靠 git 拉取后在扩展页点「重新加载」，README 写明；
6. Firefox 用户可继续沿用旧 MV2 插件作为过渡（方案 B），本次不专门适配（如需支持，后续给 manifest 加 `browser_specific_settings` 并做兼容层评估）。
