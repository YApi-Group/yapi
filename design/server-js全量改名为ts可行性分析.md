# server/ 目录 js 全量改名为 ts —— 可行性分析

> 结论：**可以一次性全部改名，运行时零风险**。已在沙箱副本中完成全量演练（49 个 js → ts），`node --import tsx app.ts` 正常启动到监听阶段，75 个模块逐个 import 全部成功。
> 类型错误不阻塞运行（tsx 仅用 esbuild 剥离类型），按"前期不管类型报错"的前提可直接实施。

## 1. 现状盘点

| 项目 | 数据 |
| --- | --- |
| 待改名 js | 49 个，约 11.7k 行，全部已被 git 跟踪 |
| 已有 ts | 28 个 |
| 相对导入写法 | 276 处全部带 `.js` 后缀（含指向 `.ts` 文件的），tsx 会把 `.js` 解析到 `.ts` |
| 运行方式 | 开发 `nodemon`（`execMap` js/ts → tsx）；容器 `node --import tsx app.js`（`docker/release/start.ts`） |
| CJS 残留 | 仅 `common/formats.js` 顶层 `module.exports`（死代码，无人引用，现状即无法 import）；其余几处 `require()` 都在函数体内 |

## 2. 验证结果（沙箱副本，未触碰仓库）

1. **TS 语法可解析**：用 esbuild `loader: 'ts'` 逐个 transform 49 个 js，0 个失败。
   没有 TS 语义会改变的写法：无 `<T>` 形式的表达式、无类字段声明（21 个 class 全是构造函数赋值）、无装饰器/私有字段。
2. **模块加载**：改名前 46/47 可 import（唯一失败 `common/formats.js`，既有问题）；改名后 75/75 可 import。
3. **应用启动**：`node --import tsx app.ts` 输出「服务已启动」后因本机 3000 端口被开发服务占用而 `EADDRINUSE`，与改名前 `app.js` 行为完全一致 —— 说明整张依赖图已走通。
4. **nodemon**：`nodemon app.ts dev` 按现有 `execMap` 正常交给 tsx 执行，无需改 `nodemon.json`。
5. **eslint**：ts override（`@typescript-eslint/parser` + `parserOptions.project`）对改名文件正常工作，0 error。
6. **不能用 Node 原生类型剥离替代 tsx**：`node router.ts` 报 `ERR_MODULE_NOT_FOUND controllers/advMock.js`，Node 不会把 `.js` 说明符改写到 `.ts`。tsx 仍是运行时硬依赖（现状已是如此，`dependencies` 里有 tsx）。

## 3. tsc 类型错误规模（仅供后续分阶段消化，不影响运行）

| 场景 | `tsc --noEmit` 错误数 |
| --- | --- |
| 现状（28 个 ts） | 59 |
| 全部改名，配置不动 | 1558（61 个文件；`noImplicitAny` 族 TS70xx 约 900 条） |
| 全部改名 + `noImplicitAny: false` | 675 |
| 全部改名 + 49 个文件头加 `// @ts-nocheck` | 84（= 59 基线 + 25 条在已有 ts 里新暴露的错误，因为调用方拿到了真实导出类型） |

注意：当前 `tsconfig.json` 的 `moduleResolution: "Node"` 在 TypeScript 6 下报 **TS5107 配置级错误**，tsc 会在此处直接停止，`npm run prod`（`tsc`）现状即不可用。要让 tsc 真正跑起来需加 `"ignoreDeprecations": "6.0"` 或改为 `bundler`/`node16`，这是独立于改名的既有问题。

## 4. 改名时需同步修改的引用点

- `server/package.json`：`main`、`dev`、`dev:init-db`、`start`、`start:init-db` 中的 `app.js` / `install.js`
- 根 `package.json`：`main`、`start`、`install-server`
- `server/tsconfig.json`：`include` 里显式列出的 `./app.js`、`./install.js`、`plugin.js` 可删（`**/*.ts` 已覆盖）；`allowJs` 保留（`controllers/data.ts` 仍引用根 `common/markdown.js`）
- `docker/release/start.ts` 第 362、375 行：`install.js` → `install.ts`、`app.js` → `app.ts`
- `CLAUDE.md`：文中提到的 `server/app.js`、`utils/db.js`、`server/hook.js`、`middleware/mockServer.js` 等文件名
- `README.md`、`docs/devops/index.md`、`docs/documents/redev.md` 中的 `node server/app.js`（文档，可选）
- 根 `test/server/commons.test.js` 引用 `../../server/utils/commons.js`（ava 0.22 + babel-register 的历史测试套件，现状对 ESM 服务端已不可用，可暂不处理）

`nodemon.json`、`.eslintrc.cjs`、`.vscode/settings.json` 无需改动。

## 5. 顺带发现的既有问题（与改名无关，建议单独处理）

- `server/controllers/data.ts` 引用的是**根目录** `../../common/markdown.js`（CJS，依赖根 `node_modules/underscore`），而 `controllers/open.js` 引用的是 `server/common/markdown.js`（ESM 副本）。建议统一到 server 副本，切断 server 对根 `common/` 的运行时依赖。
- `server/common/` 下 `formats.js`、`lib.js`、`power-string.js`、`schema-transformTo-table.js` 在 server 内无人引用（`schema-transformTo-table` 仅被 `markdown.js` 内部使用），`formats.js` 还是 CJS 导出，可考虑删除或补 `export default`。
- ESM 文件里的函数内 `require()`：`common/utils.js#schemaValidator`（`ajv/lib/refs/json-schema-draft-04.json`、`ajv-i18n`）、`common/postmanLib.js`（`vm-browserify`）、`common/plugin.js`、`utils/notice.js`（未被引用）。ESM 作用域下 `require` 未定义，这些路径一旦执行到就会抛错，属于 ESM 迁移遗留，改名后 TS 不会报类型错（`@types/node` 声明了 `require`），需要人工确认是否为死路径。

## 6. 建议的实施方式

1. 用 `git mv` 逐个改名（保留历史），一个 commit 只做改名 + 第 4 节的引用点同步，不改任何代码逻辑。
2. 类型错误处理策略二选一（前期都不阻塞运行）：
   - **A. 文件头加 `// @ts-nocheck`**：tsc/IDE 立即接近干净（84 条），之后按文件逐个摘掉标记补类型；缺点是 eslint 的 `ban-ts-comment` 会对每个文件 warn 一次。
   - **B. tsconfig 暂时关 `noImplicitAny`**：不加标记，IDE 里保留 675 条真实错误提示，靠红线驱动补类型；适合想"看见问题"的节奏。
3. 改名 commit 之后再分别开小 commit 处理第 5 节的既有问题。
