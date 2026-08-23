# wiki 插件去插件化：融入主项目方案与实施记录

> 2026-08-23 · 将 `exts/yapi-plugin-wiki` 的前后端逻辑直接内联进主项目，不再以插件形式存在。

## 一、背景与动机

1. **插件机制已停摆**：`server/app.js` 中 `import './plugin.js'` 被注释（TODO 重新设计 plugin 机制），`client/plugin.ts` 中 `plugin-module.js` 的加载也被注释成空对象。因此 wiki 插件的 `add_router`/`add_ws_router`/`sub_nav` 三个钩子从未被触发，**wiki 功能当前整体处于下线状态**。
2. **主项目早已与 wiki 事实耦合**，它从来不是真正可插拔的：
   - `client/containers/Project/Setting/ProjectData/ProjectData.tsx` 有"添加wiki"导出选项（isWiki）；
   - `client/components/YapiTimeLine/YapiTimeLine.tsx` 动态时间线有 wiki 类型过滤；
   - `server/controllers/open.js` `exportFullData` 直接 `require('../yapi-plugin-wiki/wikiModel.js')`（相对路径本身就是错的，`isWiki=true` 时抛错被 catch 吞掉）；
   - `server/controllers/data.ts` 同样的取数逻辑被 TODO 注释（2022-10-23），`createMarkdown` 里的 `wikiData` 形参一直悬空。
3. **有现成的内联先例**：`statistic`（原 statistics 插件）与 `advmock`（原 advanced-mock 插件）都已作为普通"模型 + 控制器 + routerConfig 分组"融入主项目，wiki 照同样的模式办理。

## 二、插件原逻辑速览

- **数据层** `wikiModel.js`：Mongoose 集合 `wiki`，每项目一条记录。字段 `project_id / desc(HTML) / markdown / uid / username / edit_uid(编辑锁) / add_time / up_time`；`project_id` 建索引（原插件在 server.js 里手动 `createIndex`）。
- **HTTP 接口**（原经 `add_router` 钩子注册）：
  - `GET /api/plugin/wiki_desc/get`：按 project_id 查 wiki；
  - `POST /api/plugin/wiki_desc/up`：保存/更新，含项目 edit 权限校验、可选邮件通知（jsondiffpatch 生成 diff HTML）、写项目动态日志（type: wiki）。
- **WS 接口**（原经 `add_ws_router` 钩子注册）：`/api/ws_plugin/wiki_desc/solve_conflict?id=<project_id>`，`start/editor/end` 三种消息读写 `edit_uid` 实现多人编辑冲突锁，与接口编辑页 `solveConflict` 同模式。
- **客户端**：`client.js` 经 `sub_nav` 钩子往项目页注入 Wiki tab（`/project/:id/wiki`）；页面为 View/Editor 切换（tui-editor 富文本，存 HTML + Markdown 双格式）+ WebSocket 冲突处理。
- **死代码**：`util.js` 的 `formatDate`（无引用）、`index.js` 的 `httpCodes` 数组（advMock 控制器已自带同款 `HTTP_CODES`），直接丢弃。

## 三、文件去向映射

| 插件文件 | 去向 | 说明 |
|---|---|---|
| `wikiModel.js` | `server/models/wiki.ts` | ESM + TS，继承 `models/base.js`；`project_id` 用 schema `index: true` 替代手动 `createIndex`；废弃的 `model.update()` 改 `updateOne()` |
| `controller.js` | `server/controllers/wiki.ts` | ESM + TS，风格对齐 `advMock.ts`/`interface.js`；action 名修正拼写 `uplodaWikiDesc` → `upWikiDesc`（URL 不变） |
| `server.js` HTTP 路由 | `server/router.ts` | 新增 `wiki` 分组，prefix 定为 `/plugin/wiki_desc/`，**对外 URL 与原插件完全一致**，前端零改动 |
| `server.js` WS 路由 | `server/websocket.js` | 直接 `createAction(..., '/ws_plugin/wiki_desc/solve_conflict', 'get', true)`，路径保持前端硬编码值 |
| `server.js` 建索引 | （并入 model schema） | |
| `wikiPage/index.js` | `client/containers/Project/Wiki/Wiki.tsx` | 转 TS：`@connect` 装饰器 → `connect()(...)`（对齐 `Activity.tsx`），PropTypes → TS 类型 |
| `wikiPage/View.js` | `client/containers/Project/Wiki/WikiView.tsx` | antd3 遗留 `icon="edit"` 字符串写法 → `<EditOutlined />` |
| `wikiPage/Editor.js` | `client/containers/Project/Wiki/WikiEditor.tsx` | 同上 `icon="upload"` → `<UploadOutlined />`；tui-editor 引用改 `@common` 别名（对齐 `InterfaceEditForm.tsx`） |
| `wikiPage/index.scss` | `client/containers/Project/Wiki/Wiki.scss` | 原样 |
| `client.js`（sub_nav 注入） | `client/containers/Project/Project.tsx` | routers 直接加 `wiki` 条目，置于最后（与原插件钩子追加顺序一致，即位于"设置"之后） |
| `index.js` / `util.js` | 丢弃 | 死代码 |
| 整个 `exts/yapi-plugin-wiki/` | 删除 | 同时从 `server/common/config.ts` 的 exts 列表移除 `{ name: 'wiki' }` |

## 四、顺带修复

1. **`server/controllers/open.js` `exportFullData`**：`require('../yapi-plugin-wiki/wikiModel.js')`（路径错误 + ESM 无 require）改为顶部 `import WikiModel from '../models/wiki.js'`，`isWiki=true` 的全量导出恢复可用。
2. **`server/controllers/data.ts` `exportData`**：恢复 2022 年被 TODO 注释的 wiki 取数逻辑，"数据管理"页导出勾选"添加wiki"后，html/markdown 导出真正带上 wiki 内容（`common/markdown.js` 的 `createProjectMarkdown(curProject, wikiData)` 一直支持该参数）。
3. **邮件通知健壮性**：通知子系统当前整体停摆——`utils/notice.js`（把 `sendNotice` 挂到 `yapi.commons` 上）在 `app.js` 里的引入被注释，且其内部仍用 CommonJS `require`。wiki 控制器对 `sendNotice` 做存在性判断并将通知块置于独立 try/catch：**通知失败只记日志，绝不影响 wiki 保存本身**（原插件实现里通知抛错会把已成功的保存响应覆盖成 400）。恢复整个通知子系统属独立任务，不在本次范围。

## 五、行为保持的关键点

- HTTP / WS 路径不变：`/api/plugin/wiki_desc/get|up`、`/api/ws_plugin/wiki_desc/solve_conflict`（前端 `Wiki.tsx` 中硬编码，老外部脚本亦兼容）。
- `POST up` 中 `$tokenAuth` 分支保留原样。注：`base.ts` 的 `openApiRouter` 白名单不含 wiki 路径，该分支目前不可达，与迁移前一致。
- 权限：查看不限角色（登录即可），编辑要求项目 `edit` 权限；前端按钮按 `role ∈ {admin, owner, dev}` 置灰，与原逻辑一致。
- 保存日志 `type: 'wiki'` 的项目动态记录格式不变（YapiTimeLine 的 wiki 过滤依赖它）。
- Model 继承 BaseModel 默认启用 `_id` 自增插件，与原插件（继承同一 base）行为一致，存量数据无迁移需求；集合名仍为 `wiki`。

## 六、实施记录

- [x] `server/models/wiki.ts` 新建
- [x] `server/controllers/wiki.ts` 新建
- [x] `server/router.ts` 注册 `wiki` 分组（CtrlType / INTERFACE_CONFIG / routerConfig）
- [x] `server/websocket.js` 注册 ws 路由
- [x] `server/controllers/open.js` 修复 wikiModel 引用
- [x] `server/controllers/data.ts` 恢复 wiki 导出取数
- [x] `server/common/config.ts` 移除 wiki ext 声明
- [x] `client/containers/Project/Wiki/` 四文件新建（Wiki.tsx / WikiView.tsx / WikiEditor.tsx / Wiki.scss）
- [x] `client/containers/Project/Project.tsx` 注册 Wiki tab 路由
- [x] 删除 `exts/yapi-plugin-wiki/`
- [x] 验证：server `tsc --noEmit` 与迁移前基线对比无新增错误；client 生产构建通过

（验证结果详见文末"七、验证"一节，实施过程中同步更新。）

## 七、验证

全部通过（2026-08-23，本地 dev 环境，nodemon 热重启后实测运行中的服务）：

1. **server 类型检查**：`npx tsc --noEmit --ignoreDeprecations "6.0"` 迁移前后对比，无新增错误（唯一差异是 `data.ts` 一处既有错误因删注释行号从 114 漂移到 112；新文件 `wiki.ts` 零错误）。
2. **client 生产构建**：`npm run prod` 通过（webpack 5，35s，仅 3 个既有的包体积告警）。
3. **HTTP 路由注册**：tsx 加载 `router.ts` 冒烟，`GET /api/plugin/wiki_desc/get`、`POST /api/plugin/wiki_desc/up` 均在路由表中（共 118 条）。
4. **读写全链路**（admin 登录态，项目 461）：
   - 未登录 GET 返回 40011"请登录"（进入控制器鉴权链路，而非 404）；
   - 登录后 GET 空数据返回 `errcode 0, data null`；
   - POST 保存 → 回读一致；新记录 `_id: 27`，自增插件与存量 `wiki` 集合计数兼容；
   - 项目动态出现"admin 更新了 wiki 的信息"日志（type: project / data.type: wiki）。
5. **wiki 导出修复**：`GET /api/data/export?type=markdown&pid=461&isWiki=true` 导出的 markdown 含"### 公共信息"及 wiki 正文——2022 年 TODO 注释的功能恢复。
6. **ws 编辑冲突**：带 cookie 连接 `/api/ws_plugin/wiki_desc/solve_conflict?id=461`，发 `editor` 收到 `{errno:0, data:{...}}`（抢占编辑锁成功），发 `end` 后 `edit_uid` 回到 0（锁释放）。
   - 注：测试中发现连接建立后**立即**发消息会因服务端 `init(ctx)` 异步鉴权尚未完成、`on('message')` 监听未注册而丢失。这是原插件同款行为，真实前端流程（连接后用户手动点"编辑"才发 `editor`）不受影响，`start` 消息即使偶发丢失也仅影响"清理自己遗留的锁"这一容错动作。
7. **遗留测试数据**：项目 461（OnlyOffice）留有一条内容为"wiki 去插件化迁移验证"的 wiki 数据，可作人工回归入口，确认后可直接在页面编辑覆盖。

## 八、待人工回归

- 项目页 Wiki tab 的完整 UI 流程：查看 → 编辑（tui-editor 富文本）→ 更新/取消；双开浏览器验证编辑冲突提示。
- antd 5 下按钮图标显示（本次已将 antd3 遗留的字符串 icon 修为 `<EditOutlined />`/`<UploadOutlined />`，此前 antd4 下图标本就不显示，属顺带修复）。
- "数据管理"页勾选"添加wiki"导出 html/markdown。

## 九、后续可选项

- **通知子系统**：`utils/notice.js` 的加载在 `app.js` 中被注释且其内部仍是 CommonJS `require`，全站（含 interface 更新通知）邮件通知目前均不可用，属独立修复任务。wiki 控制器已做防御：通知不可用时仅记 warn 日志，不影响保存。
- `server/controllers/open.js` 的 `exportFullData`（`/api/open/export-full`）与 `data.ts` 的 `exportData` 大量重复，可考虑合并。
