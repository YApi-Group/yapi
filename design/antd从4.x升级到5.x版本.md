# antd 4.x → 5.x 升级方案（client）

> 编写日期：2026-07-04。文中所有文件路径、行号、数量统计均已在该日期的代码状态下逐项核实。实施时如行号有偏移，以文中给出的搜索关键字重新定位为准。
>
> 本文档面向「全新上下文」的实施者，包含全部调研结论，无需回溯其他资料即可开工。

## 一、背景与目标

- client 目前使用 **antd 4.21.0**（`client/package.json:26`，精确锁定无 `^`），React 已升级到 18.3.1，具备升级 antd 5 的前提。
- antd 5 的核心变化：**主题系统从 Less 变量改为 CSS-in-JS Design Token（不再发布 less 文件）**，同时废弃一批组件 API（5.x 报警告、6.x 移除）。
- 目标：升级到 **5.x 最新稳定版**，视觉与功能对齐升级前；本次一并清理 5.x 已废弃的 API 写法。

## 二、现状快照（实施前必读）

### 2.1 依赖（client/package.json）

| 依赖 | 当前版本 | 说明 |
|---|---|---|
| antd | `4.21.0`（精确锁定） | dependencies |
| @ant-design/icons | `^4.7.0` | 需同步升 ^5 |
| react / react-dom | `^18.3.1` | 满足 antd 5 要求，不动 |
| moment | `^2.29.3` | 仅 `client/common.js:3` 一处纯格式化（`formatTime`），**与 antd 无关，不动** |
| dayjs | 未安装 | antd 5 会作为自身依赖自动带入，无需手动处理 |
| less / less-loader | `^4.1.3` / `^11.0.0` | devDependencies，只服务一个文件 theme.less |
| json-schema-editor-visual | `^2.0.0` | devDependencies（第 120 行），**升级的关键障碍，见 3.1 第 4 条** |
| babel-plugin-import | 未安装 | 项目不用按需引入，靠 theme.less 全量引样式 |

另：根目录 `package.json:79` devDependencies 残留 `"antd": "4.16.2"`，server 端无任何 antd 引用，纯历史遗留，可顺手删除。

### 2.2 样式体系

- 样式文件：**1 个 less**（`client/styles/theme.less`，全项目唯一）、55 个 scss、4 个 css。
- **antd 样式的唯一入口**：`client/styles/theme.less` 第 1-2 行：
  ```less
  @import "~antd/lib/style/themes/default.less";
  @import "~antd/dist/antd.less";
  ```
  随后覆盖几十个 less 变量做主题定制（利用 Less「后定义覆盖」特性，**不走 modifyVars**）。该文件由 `client/index.tsx:9` 引入。
- 主题关键值：主色 `#2395f1`、成功 `#57cf27`、错误 `#ff561b`、警告 `#fac200`、字号 13px、圆角 4px、Header 背景 `#32363a`、body 背景 `#eceef1`。
- theme.less 中除变量外有 **2 处活代码 `.ant-*` 覆盖**：
  - 244-247 行：嵌套 `.ant-form-item` 边距修复（注释注明是修「添加环境配置下边距重合」bug）；
  - 390-392 行：`.ant-tabs-bar { margin-bottom: 0 }`（这是 antd **3** 的类名，在 antd 4 已是死代码，可直接删）。
  - 329-334 行是已注释的 Menu 选中背景覆盖，删除即可。
- 全局 reset：由 antd.less 附带的全局样式（`* box-sizing` 等）+ `client/styles/common.scss` 手写 reset（39-77 行，枚举标签清 margin/padding）共同承担。common.scss 还负责：`html{font-size:100px}` rem 基准、html/body 字体族（9-10 行）、滚动条、`::selection` 主色。**手写 reset 不完整，antd 样式移除后必须补 reset.css，否则全站 box-sizing 基线漂移。**
- **`.ant-*` 类名覆盖：29 个 scss/css 文件、约 192 处选择器、84 个不同类名**。明细见附录 A。

### 2.3 构建链路

- webpack 5，dev/prod 两套配置（`client/webpack.dev.ts`、`client/webpack.prod.ts`）。
- less 规则：dev 91-105 行、prod 60-76 行，均带 `lessOptions.javascriptEnabled: true`（注释写着 "antd need javascriptEnabled"，升级后语义过期）。
- scss 规则独立（dev 107-115、prod 78-86），与 antd 解耦，不受影响。
- babel-loader 的 include 里有 `/(json-schema-editor-visual)/`（dev 125 行、prod 96 行）——该 npm 包以**源码形态**被宿主 webpack 编译。
- `client/.stylelintrc.json:6-7` 有 `*.less` + `postcss-less` 的 override。
- `client/global.d.ts:11` 声明了 `*.module.less` 模块类型。
- babel 配置（`client/babel.config.js`）与 antd 无关，不动。

### 2.4 入口文件 client/index.tsx（当前 27 行，全文结构）

```tsx
import { ConfigProvider } from 'antd'
import zhCN from 'antd/lib/locale-provider/zh_CN'   // ← 5.x 路径已移除
...
import './styles/common.scss'
import './styles/theme.less'                         // ← 5.x 编译失败
...
<ConfigProvider locale={zhCN}>                       // ← 已有 ConfigProvider，加 theme 即可
```

## 三、注意点评估

### 3.1 硬中断（不改无法编译/运行），共 4 项

1. **antd less 链路整体报废（最致命）**：antd 5 包内没有 `dist/antd.less` / `lib/style/themes/default.less`，`theme.less:1-2` 直接编译失败 → 整个构建中断。主题定制需整体迁移到 `ConfigProvider theme` token（映射表见第五节）。
2. **locale 路径变更**：`client/index.tsx:2` 的 `antd/lib/locale-provider/zh_CN` 已移除，改为 `antd/locale/zh_CN`。
3. **ItemType 深路径导入失效，共 4 处**（搜索关键字 `antd/lib/menu/hooks/useItems`）：
   - `client/components/Header/MenuUser.tsx:3`
   - `client/components/SubNav/SubNav.tsx:2`
   - `client/containers/Group/GroupList/GroupList.tsx:3`
   - `client/containers/News/NewsList/NewsList.tsx:2`（此处路径还带 `.js` 后缀）
   替代写法见第七节。
4. **json-schema-editor-visual@2.0.0 依赖炸弹**：
   - `client/containers/Project/Interface/InterfaceList/InterfaceEditForm.tsx:21` 真实引用 `import jSchema from 'json-schema-editor-visual'`；同文件第 31 行有预留注释 `// import jSchema from '@/package'`。
   - 该包 package.json 把 `"antd": "^4"`、`"@ant-design/icons": "^4.2.1"`、`"react": "^16.13.1"` 等声明为**直接依赖**（非 peerDependencies），`main` 指向源码 `package/index.js`，靠宿主 webpack 编译、样式一直靠宿主 theme.less 全量引入供给。
   - 顶层升 antd 5 后：npm 会在该包下**嵌套安装一份 antd 4** → 产物 antd 4+5 双份并存、共用 `.ant-` 前缀互相污染；且 antd 4 的 less 样式已无人引入，接口编辑页的 schema 编辑器必然裸奔。
   - **解法（推荐）**：切换到仓库内 vendored 副本 `client/package/`（是维护过的同源代码），与顶层共用 antd 5。详见 Phase 0。**不推荐** npm overrides 强改该包 antd 版本（预打包产物行为不可控）。

### 3.2 软废弃（5.x 仍可运行、控制台警告；6.x 移除。本次一并清理）

| 变更点 | 规模 | 文件清单 |
|---|---|---|
| Tabs.TabPane → `items` | 9 文件约 54 处 | `containers/Project/Setting/Setting.tsx`（最密集，约 8 个 TabPane）、`containers/Group/Group.tsx`、`containers/Login/LoginWrap.tsx`、`containers/Project/Interface/Interface.tsx`、`InterfaceContent.tsx`、`InterfaceEditForm.tsx`、`InterfaceCol/InterfaceColContent.tsx`、`InterfaceCol/CaseReport.tsx`、`components/Postman/Postman.js`。多数是 `const TabPane = Tabs.TabPane` 别名写法 |
| Collapse.Panel → `items` | 4 文件约 13 处 | `components/Postman/Postman.js`（4 个 Panel，与 TabPane 同文件）、`components/ModalPostman/index.js`（3 个）、`components/CaseEnv/index.js`、`containers/Project/Interface/InterfaceList/Run/AddColModal.js` |
| `visible=` → `open` | 约 20 文件 35 处 antd 组件 | Modal 约 31 处、Popover 4 处（`components/Header/ToolUser.tsx` 3 个引导气泡 + `GroupList.tsx:204`）。**无** onVisibleChange/onDropdownVisibleChange。**注意 4 处是自定义组件透传 props，不要改**：`Run.js:108`（AddColModal）、`MockCol.tsx:254`（CaseDesModal）、`Postman.js:579`（ModalPostman）、`InterfaceColMenu.tsx:578`（ColModalForm） |
| Dropdown `overlay` → `menu` | 全项目仅 2 处 | `components/Header/ToolUser.tsx:124`、`client/package/components/SchemaComponents/SchemaJson.js:524` |
| Menu.Item 子元素写法 → `items` | 1 文件 2 处 | `SchemaJson.js`（504、509 行）。其余 Menu（`MenuUser.tsx`、`SubNav.tsx`）**已是 items 写法**，不动 |

### 3.3 样式覆盖风险（升级中最大的不可控项）

- **高风险（v5 DOM 已重构，覆盖必失效，需重写）**：
  - `client/containers/Project/Interface/interface.scss`（10-46 行）：强依赖 v4 卡片式 Tabs 旧结构 `.ant-tabs-bar`、`.ant-tabs-nav-container`、`.ant-tabs-nav-wrap` 定高定背景。v5 对应结构为 `.ant-tabs-nav` / `.ant-tabs-nav-wrap` / `.ant-tabs-tab`。
  - `client/components/YapiTimeLine/YapiTimeLine.scss`（40-158 行）：深度重构 Timeline——重定位 `.ant-timeline-item-head-custom`/`-tail`，把 `-content` 改成浮动定宽气泡。v5 类名大体保留但间距/伪元素实现有变，需逐条修正。
- **中风险（类名保留、默认值/结构微调，需回归验证）**：`styles/common.scss`（含 `.ant-confirm`——v5 已改名 `.ant-modal-confirm`）、`containers/Project/Setting/Setting.scss`、`containers/Home/Home.scss`、`components/ModalPostman/index.scss`、`containers/User/index.scss`、`components/Header/Header.scss`（dark Menu 选中态覆盖）。
- **低风险**：其余约 20 个文件（Tree/Input/Tag/Avatar 等颜色间距微调）。
- 有利因素：antd 5 组件样式使用 `:where()` 低优先级选择器，业务覆盖在**类名仍存在**的前提下优先级上更容易胜出；风险集中在「类名/DOM 变了选不中」而非「优先级打不过」。

### 3.4 确认为零影响（已核实，放心跳过）

- 被移除组件 Comment / PageHeader / BackTop：**0 使用**。
- moment → dayjs：项目**完全没用** DatePicker/TimePicker/RangePicker/Calendar（0 命中），无任何 moment 对象传入 antd；moment 仅 `client/common.js` 纯格式化。**antd 层面零影响。**
- 旧版 `Icon` 组件（从 'antd' 导入）：0 残留，图标已全部用 `@ant-design/icons` 具名图标。
- `@ant-design/compatible`：未使用。
- babel-plugin-import 按需引入：本就未使用，无迁移动作。
- `exts/yapi-plugin-wiki` 3 个文件（`wikiPage/index.js`、`Editor.js`、`View.js`）仅用 Button/Checkbox/message，API 无破坏，且 exts 无 `.ant-` 样式覆盖，仅需回归测试。
- 整体规模参考：`from 'antd'` 共 94 个文件（client 91 + exts 3）。

## 四、实施计划（推荐「先跑通，再清理」两波推进，每阶段独立 commit，出问题可二分回滚）

### Phase 0：依赖升级与编辑器依赖处置（约 0.5 人日，风险中）

1. 升级 antd：在 `client/` 下执行安装。**先 `npm view antd dist-tags` 确认 5.x 最新稳定版号，用 `npm i antd@5` 锁定大版本 5，谨防 latest 已指向 6.x**。沿用现有精确锁定风格写入 package.json。
2. 升级 `@ant-design/icons` → ^5.x 最新；装完 `npm ls @ant-design/icons` 确认无双实例（如有，用 overrides 归一）。
3. **json-schema-editor-visual 切 vendored**：
   - `InterfaceEditForm.tsx`：删除第 21 行 npm 导入，恢复第 31 行注释的 `import jSchema from '@/package'`；
   - `client/package.json` 移除 `json-schema-editor-visual`；
   - **补装 `moox`**（vendored 副本 `client/package/index.js:3` 引用，目前只嵌套存在于该 npm 包之下）；其余依赖顶层已有：`brace ^0.11.1`（devDeps）、`generate-schema`、`underscore`、`react-redux`；
   - 清理 webpack 两处 babel include `/(json-schema-editor-visual)/`（`webpack.dev.ts:125`、`webpack.prod.ts:96`）；
   - 冒烟验证 vendored 版编辑器与 npm 2.0.0 功能等价（接口编辑页 Req/Res Body 的 JSON Schema 编辑）。
4. 可选顺手项：删根目录 `package.json:79` 残留的 `"antd": "4.16.2"`。

### Phase 1：入口与主题改造，修复全部硬中断（约 1 人日，风险高——主题还原度是关键）

**验收标准：`npm run dev` 编译通过、页面可开、主色/字号/圆角与升级前一致（允许控制台黄色 deprecated 警告）。**

1. `client/index.tsx`：
   - `import zhCN from 'antd/locale/zh_CN'`（替换第 2 行）；
   - 在 `import './styles/common.scss'` **之前**加 `import 'antd/dist/reset.css'`（理由见第六节）；
   - 删除 `import './styles/theme.less'`；
   - `<ConfigProvider locale={zhCN} theme={antdTheme}>` 接入主题。
2. 新建 `client/styles/antdTheme.ts`，导出 `ThemeConfig` 对象（`import type { ThemeConfig } from 'antd'`），内容按第五节映射表。**删 theme.less 引用与接入 theme 必须同一 commit，否则视觉全变。**
3. theme.less 残留处理：
   - 244-247 行嵌套 `.ant-form-item` 边距修复 → 搬到新建 `client/styles/antd-overrides.scss`，在 index.tsx 中紧跟 common.scss 引入；v5 中 `.ant-form-item` 类名未变，选择器大概率仍有效，回归「项目设置→环境配置」页验证；
   - 390-392 行 `.ant-tabs-bar` 死代码直接删；如回归发现 Tabs 导航需要去下边距，用 `components.Tabs.horizontalMargin: '0'` 实现；
   - theme.less 文件本体**先保留**在仓库作对照，Phase 4 收尾删除。
4. 修 4 处 ItemType 深路径导入（写法见第七节）。

### Phase 2：高危样式抢修（约 1–1.5 人日，风险高）

- `interface.scss`：对照 v5 Tabs 实际渲染 DOM 重写卡片式 Tabs 覆盖；能用 `components.Tabs` token（`cardBg`、`itemSelectedColor`、`horizontalMargin` 等）表达的优先走 token，减少脆弱的 DOM 覆盖。
- `YapiTimeLine.scss`：对照 v5 Timeline DOM 逐条修正定位覆盖。
- 中风险文件本阶段过一遍「能跑不崩」即可，精修放 Phase 4。

### Phase 3：废弃 API 批量迁移（约 1–1.5 人日，风险低但机械量大）

1. **预备**：先删除备份文件 `client/containers/Project/Interface/InterfaceCol/CaseTable.bak.tsx`（避免被 codemod/批量替换污染；它本身不参与构建）。
2. **官方 codemod**（可选但推荐）：`npx @ant-design/codemod-v5 client/`
   - 主要收益：`visible` → `open` 这 35 处自动化；
   - 无法覆盖（仍需手工）：TabPane/Panel 的 items 化、Dropdown overlay→menu、locale 路径、主题、ItemType；
   - 风险控制：jscodeshift 对 .js/.tsx 混合代码库均支持，但可能重排格式——跑完接 `eslint --fix`，**全量 review diff**（重点确认 3.2 节列出的 4 处自定义组件透传 visible 未被误改），单独一个 commit。
   - 若不想用 codemod，35 处纯手工约半天。
3. **手工迁移**：
   - Tabs items 化（9 文件）：注意条件渲染的 TabPane 要转成 items 数组的条件拼装（`items={[...(cond ? [{key, label, children}] : [])]}` 形式）；
   - Collapse items 化（4 文件，Postman.js 与 Tabs 一起改）；
   - Dropdown `overlay={menu}` → `menu={{ items }}`（2 处）；
   - `SchemaJson.js` 的 2 处 `<Menu.Item>` → items（与该文件 Dropdown 改造一并完成）。
4. **可选清理**：3 处类型深导入 `CaseTable.tsx:6`、`InterfaceColContent.tsx:8`（`antd/lib/table`）、`ProjectData.tsx:18`（`antd/lib/checkbox`）——v5 保留 lib CJS 构建仍可解析，**非硬中断**，建议统一改根导出或 `antd/es/*`。

### Phase 4：全量样式回归、prod 验证与收尾清理（约 1.5–2 人日，风险中）

1. 按第八节清单逐页人工回归。192 处 `.ant-*` 覆盖的处理原则：**v5 下已无效且视觉无影响的直接删；仍需要的对照 v5 DOM 修正；能 token 化的搬进 antdTheme.ts**。
2. `npm run prod` 构建通过；用 webpack-bundle-analyzer（已在 devDeps）对比升级前后产物，**重点确认产物中无 antd 4 残留副本**（在产物中搜索版本字符串），CSS 产物中不再含 antd 4 全量样式。
3. **收尾清理（最后一个独立 commit，全部回归通过后再做）**：
   - 删 `client/styles/theme.less` 文件本体；
   - 删 webpack dev/prod 的 less 规则（`webpack.dev.ts:91-105`、`webpack.prod.ts:60-76`）；
   - 删 package.json 的 `less`、`less-loader`、`postcss-less`；
   - 删 `client/global.d.ts:11` 的 `*.module.less` 声明、`.stylelintrc.json:5-8` 的 less override。
   - 放最后的原因：若中途需要回滚 Phase 1，不必恢复构建配置；删规则的收益只是整洁，不抢进度。

## 五、主题 token 映射表（theme.less → ConfigProvider theme）

落在 `client/styles/antdTheme.ts`。分三档：

### A. 必设（与 v5 默认值不同，直接决定视觉还原度）

| theme.less 变量 | v5 位置 | 值 | 备注 |
|---|---|---|---|
| `@primary-color` | `token.colorPrimary` | `'#2395f1'` | |
| `@info-color` | `token.colorInfo` | `'#2395f1'` | |
| `@success-color` | `token.colorSuccess` | `'#57cf27'` | |
| `@error-color` | `token.colorError` | `'#ff561b'` | |
| `@warning-color` | `token.colorWarning` | `'#fac200'` | |
| `@link-color` | `token.colorLink` | `'#2395f1'` | hover/active 由 v5 自动派生 |
| `@font-size-base: 13px` | `token.fontSize` | `13` | **v5 默认 14，影响全局** |
| `@font-size-lg: 16px` | `token.fontSizeLG` | `16` | v5 默认 fontSize+2=15 |
| `@border-radius-base: 4px` | `token.borderRadius` | `4` | v5 默认 6 |
| `@border-radius-sm: 2px` | `token.borderRadiusSM` | `2` | v5 默认 4 |
| `@text-color` | `token.colorText` | `'rgba(13,27,62,0.65)'` | 原 fade(#0d1b3e,65%) |
| `@text-color-secondary` | `token.colorTextSecondary` | `'rgba(13,27,62,0.43)'` | |
| `@heading-color` | `token.colorTextHeading` | `'rgba(39,56,72,0.85)'` | 原 fade(#273848,85%) |
| `@disabled-color` | `token.colorTextDisabled` | `'rgba(13,27,62,0.45)'` | |
| `@btn-height-lg: 36px` | `token.controlHeightLG` | `36` | v5 默认 40 |
| `@btn-height-sm: 26px` | `token.controlHeightSM` | `26` | v5 默认 24 |
| `@modal-mask-bg` | `token.colorBgMask` | `'rgba(55,55,55,0.6)'` | |
| `@border-color-split: #e9e9e9` | `token.colorSplit` | `'#e9e9e9'` | v5 默认半透明黑，表格分割线可感知 |
| `@animation-duration-*` | `token.motionDurationFast/Mid/Slow` | `'0.1s'/'0.2s'/'0.3s'` | |
| `@layout-body-background` | `components.Layout.bodyBg` | `'#eceef1'` | **v5 不再给 body 上色**，如页面依赖 body 背景需在 common.scss 补 `body{background:#eceef1}` |
| `@layout-header-background` | `components.Layout.headerBg` | `'#32363a'` | |
| `@layout-header-height: 56px` | `components.Layout.headerHeight` | `56` | |
| `@layout-header-padding: 0` | `components.Layout.headerPadding` | `0` | |
| `@layout-sider-background` | `components.Layout.siderBg` | `'#fff'` | |
| `@menu-dark-bg` | `components.Menu.darkItemBg` | `'#32363a'` | 顶栏用户菜单 `<Menu theme="dark">` 用到 |
| `@menu-dark-submenu-bg` | `components.Menu.darkSubMenuItemBg` | `'#333'` | |
| `@table-header-bg: #eee` | `components.Table.headerBg` | `'#eee'` | |
| `@table-row-hover-bg` | `components.Table.rowHoverBg` | 主色 1 号派生浅色 | 原 @primary-1，可用 colorPrimaryBg 的实际值 |
| `@card-head-height: 48px` | `components.Card.headerHeight` | `48` | v5 默认 56 |

### B. 与 v5 默认一致或自动派生，可省略

`@border-color-base #d9d9d9`（= colorBorder 默认）、`@btn-height-base 32`（= controlHeight 默认）、`@component-background #fff`、`@btn-font-weight 400`、`@form-item-margin-bottom 24`、`@item-active-bg/@item-hover-bg @primary-1`（v5 controlItemBgActive/Hover 自动从主色派生）、`@link-hover-decoration none`（v5 默认）、avatar 全套。

### C. 低优先级微调（回归时按需补进 components）

`@tooltip-bg` → `token.colorBgSpotlight: 'rgba(64,64,64,0.85)'`；`@tag-default-bg` → `components.Tag.defaultBg: '#f3f3f3'`；`@popover-min-width` → `components.Popover.minWidth: 177`；`@spin-dot-size*` → `components.Spin.dotSize/dotSizeSM/dotSizeLG`；`@badge-*` → `components.Badge`；`@label-required-color` → `components.Form.labelRequiredMarkColor: '#ff561b'`；`@input-addon-bg #eee` → `components.Input.addonBg`。TimePicker/Carousel/Rate/BackTop 变量因项目未用相应组件，直接丢弃。

## 六、reset 策略：引入 `antd/dist/reset.css`，放在 common.scss 之前

理由：
- 现状全局 normalize（`* box-sizing:border-box`、标题/列表/段落 margin 清理）主要由 antd.less 附带的全局样式提供，全站布局建立在这层地基上；common.scss 手写 reset 不完整（box-sizing 只施加在枚举的标签上而非 `*`）。
- 删 theme.less 后若不补 reset，全站基线漂移（box-sizing 差异导致大面积宽度错位），回归成本远高于处理 reset.css 的少量冲突。v5 reset.css 内容与 v4 全局样式高度接近。
- 冲突评估：reset.css 会设 body 字体与元素 margin，与 common.scss 职责重叠——导入顺序保证为 `reset.css → common.scss → antd-overrides.scss`，common.scss 的 rem 方案与字体族照常胜出。风险很低。

## 七、ItemType 深路径替代写法

```ts
// 替换 import { ItemType } from 'antd/lib/menu/hooks/useItems'
import type { GetProp, MenuProps } from 'antd'   // GetProp 需 antd >= 5.13
type ItemType = GetProp<MenuProps, 'items'>[number]

// 或不依赖 GetProp 的等价写法：
import type { MenuProps } from 'antd'
type ItemType = Required<MenuProps>['items'][number]
```

涉及 4 个文件：`components/Header/MenuUser.tsx:3`、`components/SubNav/SubNav.tsx:2`、`containers/Group/GroupList/GroupList.tsx:3`、`containers/News/NewsList/NewsList.tsx:2`。

## 八、验证方案

- 每阶段末 `npm run dev` 冒烟：控制台无红色报错；Phase 3 完成后 antd 废弃警告应清零。
- **人工回归页面清单（按样式风险降序）**：
  1. 项目-接口页 Tabs 全套（`containers/Project/Interface/*`，interface.scss 卡片 Tabs）—— 最高危
  2. 动态/时间线页（YapiTimeLine）
  3. 接口运行页 Run / Postman（Collapse + Tabs 混合）
  4. 项目设置 Setting（TabPane 最密集，含环境配置嵌套表单边距）
  5. 接口编辑页 schema 编辑器（vendored 切换后的重点：Req/Res Body 的 JSON Schema 增删改、mock 选择、高级设置弹窗）
  6. 测试集合（CaseReport 报告、InterfaceColContent 表格、用例拖拽排序）
  7. 首页 Home、登录页 LoginWrap
  8. 各类弹窗开关（visible→open 后逐个确认能开能关）、Modal.confirm 确认框
  9. Header 菜单 / ToolUser 下拉与引导 Popover / SubNav / GroupList / NewsList
  10. wiki 插件页（exts/yapi-plugin-wiki）
- **prod 验证**：`npm run prod` 通过；bundle-analyzer 对比体积；确认产物无 antd 4 残留；部署后抽查清单 1-5 项。

## 九、明确不做（本次范围外）

- `message.*`（约 40 文件）/ `Modal.confirm`（7 文件）→ `App.useApp()` 迁移：v5 静态方法仍可用，仅有脱离 ConfigProvider 上下文的告警；本项目主题是静态配置，实际视觉无损。列为后续可选优化。
- moment 移除/替换：与 antd 升级无关。
- 暗色主题、cssVar 模式、cssinjs SSR 抽取：项目无此需求。
- `client/package` vendored 编辑器深度重构：仅做 v5 下正常工作的最小修改。
- antd 6 预研。

## 十、工作量与风险汇总

| 阶段 | 内容 | 工作量 | 风险 |
|---|---|---|---|
| Phase 0 | 依赖升级 + 编辑器切 vendored | 0.5 人日 | 中（编辑器等价性） |
| Phase 1 | 主题 token / locale / reset / ItemType，修复全部硬中断 | 1 人日 | 高（主题还原度） |
| Phase 2 | interface.scss Tabs、YapiTimeLine 高危样式抢修 | 1–1.5 人日 | 高（DOM 重构适配） |
| Phase 3 | codemod + items 化等废弃 API 迁移 | 1–1.5 人日 | 低（机械量大） |
| Phase 4 | 长尾样式回归 + prod 验证 + less 链路清理 | 1.5–2 人日 | 中（长尾不可预估） |
| **合计** | | **约 5.5–6.5 人日** | |

---

## 附录 A：`.ant-*` 覆盖明细（29 文件约 192 处）

命中最多的文件（覆盖行数）：

| 文件（相对 client/） | 行数 |
|---|---|
| `containers/Project/Interface/interface.scss` | 21（高危，Tabs 旧 DOM） |
| `containers/Project/Setting/Setting.scss` | 12 |
| `styles/common.scss` | 10（含 `.ant-confirm` 旧类名） |
| `containers/Home/Home.scss` | 10 |
| `components/YapiTimeLine/YapiTimeLine.scss` | 10（高危，Timeline 重构） |
| `components/ModalPostman/index.scss` | 9 |
| `containers/User/index.scss` | 7 |
| `styles/theme.less` | 5（迁移后消失） |
| `package/components/SchemaComponents/schemaJson.css` | 5 |
| `containers/Project/Interface/InterfaceList/Edit.scss` | 5 |
| `components/ProjectCard/ProjectCard.scss` | 5 |

其余分散在 `Header.scss`、`GroupList.scss`、`Postman.scss`、`package/index.css` 等约 18 个文件。

被覆盖最频繁的类名：`.ant-form-item`(10)、`.ant-modal-body`(9)、`.ant-card-body`(9)、`.ant-tabs-nav`(8)、`.ant-tabs-card`(8)、`.ant-tabs-bar`(7，v5 不存在)、`.ant-tabs`(7)、`.ant-tabs-tab`(5)、`.ant-input`(5)、`.ant-tree-*`、`.ant-timeline-item-*`。

## 附录 B：快速定位用搜索关键字

| 目标 | 搜索 |
|---|---|
| visible→open 待改点 | `visible=`（.tsx/.js，排除 4 处自定义组件透传） |
| TabPane | `TabPane`、`Tabs.TabPane` |
| Collapse.Panel | `Collapse.Panel`、`const { Panel }` |
| Dropdown overlay | `overlay=` |
| ItemType 深导入 | `antd/lib/menu/hooks/useItems` |
| 其他 antd 深导入 | `antd/lib/` |
| 样式覆盖 | `\.ant-`（scss/css/less） |
| 静态方法（不改，仅了解） | `message.`、`Modal.confirm` |
