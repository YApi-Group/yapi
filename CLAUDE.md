# YApi 项目简介

本项目是 **YApi**（可视化接口管理平台）的现代化改造分支，是一个基于 MongoDB 的接口文档、Mock 与测试工具。
该分支正处于迁移过程中：服务端已迁移到 ESM + TypeScript（`"type": "module"`，使用 ts-node），客户端组件正在逐步迁移为 `.tsx`。
近期提交也反映了这一点（"服务端升级为 es6"、"组件迁移到 tsx"）。因此代码中会同时存在 `.js` 与 `.ts`/`.tsx` 文件。

## Monorepo 结构

三个相互独立的 npm 包，各自拥有独立的 `package.json` 与 `node_modules`：

- **根目录**（`yapi-vendor`）—— 仅包含编排脚本，用于同时启动服务端与客户端。
- **`server/`**（`yapi-server`）—— Koa 2 后端，ESM TypeScript，MongoDB/Mongoose。
- **`client/`**（`yapi-client`）—— React 17 + Redux + antd 4 单页应用，使用 webpack 5 构建。

根目录执行 `npm install` 时会触发 `postinstall`，通过 `concurrently` 同时安装 `server/` 与 `client/` 的依赖。

## 服务端架构

- **入口** `server/app.js` —— 构建 Koa 应用（用 `websockify` 支持 websocket），连接 Mongo（`utils/db.js`），挂载 `koaBody`、`mockServer` 中间件与路由，随后从 `WEB_ROOT/static` 提供已构建的客户端（支持 gzip，并将单页路由回退到 `/`）。
- **配置驱动的路由** —— `server/router.ts` 是 API 路由的唯一来源。每条路由形如 `{ action, path, method }`，按控制器分组在 `routerConfig` 中，并结合 `INTERFACE_CONFIG` 提供的 `/api/<prefix>/` 前缀。`createAction`（位于 `utils/commons.js`）负责装配每条路由：它在每次请求时实例化控制器，调用 `init(ctx)`（鉴权/登录校验），如存在则按控制器的 `schemaMap[action]` 校验参数，最后分发到 `inst[action](ctx)`。**新增接口的方式：在控制器中添加方法，并在 `routerConfig` 中注册。**
- **控制器** `server/controllers/*` 继承自 `BaseController`（`base.ts`），后者在 `init()` 中处理登录/token 鉴权，并暴露 `$user`、`$uid`、`$auth`。部分路由为公开路由（`ignoreRouter`）或开放 API token 路由（`openApiRouter`）—— 详见 `base.ts`。
- **模型** `server/models/*` 继承自 `base.ts` 并封装 Mongoose。通过**单例注册表** `yapi.getInst(SomeModel)`（`utils/inst.ts`）获取模型实例 —— 请勿在请求处理中直接 `new` 模型，而应复用缓存实例。
- **`yapi` 全局对象**（`server/yapi.ts`）聚合了 `cons`（配置/常量）、`inst`（模型注册表）、`commons`/`modelUtils`，以及 `bindHook`/`emitHook` 接口。需要跨模块访问时引入它。
- **钩子与插件** —— `server/hook.js` 定义扩展点（如 `third_login`、`interface_add`、`add_router`）。插件通过这些钩子注册；`add_router` 允许插件新增 `/api/.../plugin/...` 路由。`app.js` 中旧的动态 require 插件加载逻辑目前被注释（正在重新设计）。
- **Mock 服务** `middleware/mockServer.js` 拦截非 `/api` 的项目路径以返回 mock 响应（随机 mock + "期望"规则）。`advMock` 控制器/模型支撑了高级 mock 与 case 功能。

## 客户端架构

- **入口** `client/index.tsx` → `App.tsx`。路由使用 `react-router-dom` v5（`BrowserRouter`），路由声明于 `App.tsx` 的 `appRoutes`。大多数路由由 `requireAuthentication`（`components/AuthenticatedComponent`）包裹。
- **状态管理** Redux store 在 `reducer/create.ts` 中创建，使用 `redux-promise` 与自定义的 `messageMiddleware`。各功能 reducer 位于 `reducer/modules/*`（在 `modules/reducer.js` 中合并）。action creator 通常返回一个 promise/axios 调用（由 `redux-promise` 处理）。
- **目录结构** —— `containers/*` 为页面级组件（Group、Project、User、Home、Login……）；`components/*` 为可复用 UI。`ajax/` 与各模块 reducer 负责请求 `/api/...` 后端。
- **别名** —— `@` → `client/`，`@common` → `common/`（webpack + tsconfig）。根目录的 `webpack.alias.js` 另外定义了 `common` 与 `client` 别名。
- **构建** —— webpack 5，antd 4（less 启用 `javascriptEnabled`），文件系统缓存。开发模式使用 React Refresh。模板：`client/static/index.{dev,prod}.ejs`。

## 共享与其他

- **`common/`** —— 服务端与客户端共享的代码（通过 `@common`/`common` 别名引入）。
- **`exts/`** —— 内置扩展，如 `yapi-plugin-wiki`。
- **`config.json`**（与 `config_example.json` 对应）保存端口、管理员账号、MongoDB `db` 配置，以及可选的 `mail`（nodemailer）。`server/cons.ts` 将其加载到 `WEB_CONFIG`。注意该文件已被纳入版本控制，请勿提交真实凭据。
- **`docker/`、`docker-compose.yml`** —— 容器化部署。

## 开发约定

- 中文交流: 注释、commit message、编辑修改总结 等文档主要使用**中文**，阅读、书写文档/注释、AI问答 与之保持一致。
