# 移除 client 中的 UNSAFE_* 废弃生命周期

## 一、结论

**可以全部移除**，不存在无解的场景。60 处调用都能找到语义等价的替代写法，且不需要把 class 组件重写成函数组件。

但这不是一次机械的「查找替换」。`UNSAFE_componentWillReceiveProps` → `componentDidUpdate` 存在**新旧 props 语义翻转**，直接改会把判断条件写反；`UNSAFE_componentWillMount` → `componentDidMount` 会多出一帧「空 state 渲染」。这两点是本次改造的全部风险来源。

## 二、动机澄清（重要）

需要先纠正一个常见误解：**`UNSAFE_` 前缀的生命周期在 React 19 中并未被移除**，它不是 React 19 升级的硬阻塞项。真正阻塞升级的是另外几类（本仓库现状）：

| React 19 破坏性变更 | 本仓库现状 |
| --- | --- |
| 移除 legacy context（`childContextTypes` / `getChildContext`） | 已在 d584086e 迁移完毕 |
| 移除 string ref（`ref="xxx"`） | 约 10 个文件仍在使用，**是真阻塞** |
| 移除 `ReactDOM.findDOMNode` | `components/EasyDragSort/EasyDragSort.tsx` 1 处，**是真阻塞** |
| 移除类组件 `propTypes` 校验 | 37 个文件仍在写（不报错，只是彻底失效） |
| `UNSAFE_*` 生命周期 | **保留，不阻塞** |

所以清理 `UNSAFE_*` 的真实收益是三条，与版本升级无关：

1. **并发渲染正确性** —— render 阶段的生命周期在并发模式下可能被中断并重复执行。目前 `UNSAFE_componentWillMount` 里塞了大量 `axios` 请求与 `dispatch`（见 `StatChart`、`InterfaceColContent` 等），一旦启用 `<Suspense>` / `startTransition` 就会出现重复请求。
2. **解锁 `<StrictMode>`** —— 目前 `client/index.tsx` 没有开启 StrictMode，很可能正是因为这批告警。清理后可以开启，从而暴露其他隐患。
3. **消除控制台告警** —— 延续 00594af9、d584086e 两次提交的方向。

## 三、现状盘点

- 涉及文件：**44 个**
- `UNSAFE_componentWillMount`：**33 处**
- `UNSAFE_componentWillReceiveProps`：**27 处**

## 四、替换决策矩阵

### 4.1 UNSAFE_componentWillMount（33 处）

#### 类型 M1：纯副作用 / 取数 → `componentDidMount`

占绝大多数。原地改名即可，无需改动函数体。

涉及：`StatChart`、`StatisticPage/index`、`YapiTimeLine`、`AddProject`、`Follows`、`GroupList`、`NewsTimeline`、`News`、`Interface`、`InterfaceCaseContent`、`InterfaceColContent`、`InterfaceColMenu`、`InterfaceContent`、`InterfaceList`、`InterfaceMenu`、`ProjectData`、`ProjectMock`、`ProjectRequest`、`ProjectMember`、`ProjectMessage`、`ProjectEnv/index`、`User/List`、`User/Profile`。

```diff
- UNSAFE_componentWillMount() {
+ componentDidMount() {
    this.handleRequest()
  }
```

**唯一需要复核的点**：这些组件的 `render()` 是否能承受「请求尚未返回」的首帧。因为 `willMount` 是在首次 render **之前**同步执行，如果函数体里有同步 `setState`，首帧就已经带着数据；挪到 `didMount` 后首帧读到的是 `constructor` 里的初始值。逐个确认 `state` 初始值不会让 render 抛错（如 `undefined.map()`）即可，绝大多数已有合理初始值。

#### 类型 M2：同步派生 state / 初始化外部 Model → 搬进 `constructor`

这类不能改成 `componentDidMount`，否则首帧数据缺失（轻则闪烁，重则崩）。

| 文件 | 原逻辑 | 处理 |
| --- | --- | --- |
| `components/ModalPostman/index.tsx` | `setState({constantInput: inputValue})` + `handleInitList` | setState 部分并入 constructor 的 state 初始值；`handleInitList` 留在 `componentDidMount` |
| `containers/Group/GroupSetting/GroupSetting.tsx` | `this.initState(this.props)` | `initState` 改为返回 state 对象的纯函数，constructor 内直接用 |
| `package/App.tsx` | `Model.changeEditorSchemaAction(...)` 初始化 schema | 搬进 constructor（写外部 store，首帧就需要） |
| `package/.../SchemaJson.tsx` ×2 | 同上 | 同上 |
| `containers/.../Run/AddColModal.tsx` | `fetchInterfaceColList()` + `setState({caseName})` | 拆开：fetch → `componentDidMount`；setState → constructor |

```diff
  constructor(props) {
    super(props)
-   this.state = { constantInput: '' }
+   this.state = { constantInput: props.inputValue }
  }
- UNSAFE_componentWillMount() {
-   const { inputValue } = this.props
-   this.setState({ constantInput: inputValue })
-   inputValue && this.handleInitList(inputValue)
- }
+ componentDidMount() {
+   const { inputValue } = this.props
+   inputValue && this.handleInitList(inputValue)
+ }
```

#### 类型 M3：渲染前重定向 → 改用声明式 `<Redirect>`

**这类绝不能改成 `componentDidMount`**，否则会先渲染一帧不该被看到的内容（未登录用户闪现受保护页面）。

| 文件 | 原逻辑 |
| --- | --- |
| `containers/Home/Home.tsx:315` | `if (this.props.login) this.props.history.push('/group/261')` |
| `components/AuthenticatedComponent.tsx:27` | `checkAuth()` 内 `history.push('/')` |

改为在 `render()` 中返回 react-router v5 的 `<Redirect>`：

```diff
- UNSAFE_componentWillMount() {
-   if (this.props.login) {
-     this.props.history.push('/group/261')
-   }
- }
  render() {
+   if (this.props.login) {
+     return <Redirect to="/group/261" />
+   }
    ...
```

`AuthenticatedComponent` 同时命中 M3 与下文的 R4，两处一起重写最清爽——它现在的 `render` 已经在做 `isAuthenticated ? <Comp/> : null`，等于渲染了空白页却不跳转，改成 `<Redirect>` 后逻辑反而更简单：

```tsx
render() {
  if (!this.props.isAuthenticated) {
    return <Redirect to="/" />
  }
  return <Comp {...this.props} />
}
```

（`changeMenuItem('/')` 这一副作用可挪到 `componentDidMount` / `componentDidUpdate`，或由目标路由页自行设置。）

#### 类型 M4：空实现 → 直接删除

`containers/Project/Interface/InterfaceList/Run/Run.tsx:37` —— `UNSAFE_componentWillMount() {}`。

### 4.2 UNSAFE_componentWillReceiveProps（27 处）

#### 类型 R1：props → state 单纯镜像 → 优先**消除派生 state**

这是最理想的处理方式：既然 state 完全跟随 props，就不要 state。

| 文件 | 现状 | 建议 |
| --- | --- | --- |
| `components/Loading/Loading.tsx` | `state.show` 完全镜像 `props.visible` | 删掉 state，render 直接读 `this.props.visible` |
| `containers/.../InterfaceMenu.tsx` | `state.list` 镜像 `props.list` | 同上（注意 `getList()` 也会写 `state.list`，需确认哪个是真源） |
| `containers/.../InterfaceColMenu.tsx` | `state.list` 镜像 `props.interfaceColList` | 同上 |
| `containers/Group/GroupList/GroupList.tsx` | `state.groupList` 镜像 `props.groupList` | 同上 |

```diff
  export default class Loading extends React.PureComponent {
-   constructor(props) {
-     super(props)
-     this.state = { show: props.visible }
-   }
-   UNSAFE_componentWillReceiveProps(nextProps) {
-     this.setState({ show: nextProps.visible })
-   }
    render() {
-     return <div style={{ display: this.state.show ? 'flex' : 'none' }}>
+     return <div style={{ display: this.props.visible ? 'flex' : 'none' }}>
```

若组件内部确实还会独立修改这份 state（如 `InterfaceMenu` 的本地筛选），则退到 R2。

#### 类型 R2：可编辑的受控值（props 变化需重置本地草稿）→ `componentDidUpdate` 比较

| 文件 | 说明 |
| --- | --- |
| `package/.../FieldInput.tsx` | 本地 `value` 草稿，父 props 变化时重置 |
| `components/Label/Label.tsx` | props.desc 未变时关闭编辑态 |
| `components/AceEditor/AceEditor.tsx` ×2 | 命令式同步 editor 内容 |
| `components/Postman/Postman.tsx` | `data._id` / `interface_up_time` 变化时 `initState` |
| `containers/Group/GroupSetting/GroupSetting.tsx` | `currGroup._id` 变化时 `initState` |

```diff
- UNSAFE_componentWillReceiveProps(nextProps) {
-   if (nextProps.value !== this.props.value) {
-     this.setState({ value: nextProps.value })
-   }
- }
+ componentDidUpdate(prevProps) {
+   if (this.props.value !== prevProps.value) {
+     this.setState({ value: this.props.value })
+   }
+ }
```

> 不推荐用 `getDerivedStateFromProps`。它是静态方法拿不到旧 props，必须把 `prevValue` 冗余存进 state 才能做比较，代码比 `componentDidUpdate` 更绕，React 官方文档本身也把它列为「多数场景下不该用」。

对 `Postman`、`GroupSetting` 这类「切换实体就整体重置」的场景，还有一个更彻底的选项——**父组件加 `key`**：

```tsx
<Postman key={currInterface._id} data={currInterface} />
```

`key` 变化时 React 会卸载重建，内部 state 自动归零，`initState` 逻辑可直接并入 constructor，整个 `componentDidUpdate` 分支消失。适合 `Postman`（按 `data._id`）与 `GroupSetting`（按 `currGroup._id`）。

#### 类型 R3：props 变化触发副作用（取数 / 路由）→ `componentDidUpdate` + 守卫

| 文件 | 触发条件 |
| --- | --- |
| `containers/Project/Project.tsx` | `match.params.id` 变化 → 重新取项目 |
| `containers/.../InterfaceContent.tsx` | `match.params.actionId` 变化 |
| `containers/.../InterfaceList.tsx` | 同上 |
| `containers/.../InterfaceCaseContent.tsx` | 同上 |
| `containers/.../InterfaceColContent.tsx` | 同上 + `isRander` |
| `containers/Group/MemberList/MemberList.tsx` | `currGroup._id` 变化 |
| `containers/Group/ProjectList/ProjectList.tsx` | `currGroup` / `projectList` 变化 |
| `components/ModalPostman/VariablesSelect.tsx` | `props.id` 变化 |
| `containers/Project/Setting/ProjectEnv/ProjectEnvContent.tsx` | 整块已注释，直接删 |

写法同 R2，重点在**守卫条件必须完整**，见第五节陷阱 3。

#### 类型 R4：无参数、无条件的副作用 → 逐个重新设计

这三处最危险，**机械替换必然出问题**：

| 文件 | 现状 | 问题 |
| --- | --- | --- |
| `components/MyPopConfirm/MyPopConfirm.tsx:29` | 无条件 `setState({visible: true})` | 改 `componentDidUpdate` 后 setState 会再次触发 `componentDidUpdate` → 死循环 |
| `containers/Group/ProjectList/ProjectList.tsx:65` | 无条件 `setBreadcrumb(...)` | dispatch → props 变 → 再 dispatch → 循环 |
| `components/AuthenticatedComponent.tsx:31` | 无条件 `checkAuth()` | 见 M3，整体重写为 `<Redirect>` |

`MyPopConfirm` 的语义是「父组件每次重渲染就把弹窗打开」，这本身就是反模式，应改为由父组件通过 props 显式控制 `visible`，或由父组件用 `key` 强制重建。

`ProjectList` 的 `setBreadcrumb` 必须补守卫：

```diff
- UNSAFE_componentWillReceiveProps(nextProps) {
-   this.props.setBreadcrumb([{ name: String(nextProps.currGroup.group_name || '') }])
-   if (this.props.currGroup !== nextProps.currGroup && nextProps.currGroup._id) {
-     this.props.fetchProjectList(nextProps.currGroup._id, this.props.currPage)
-   }
-   ...
- }
+ componentDidUpdate(prevProps) {
+   if (this.props.currGroup !== prevProps.currGroup) {
+     this.props.setBreadcrumb([{ name: String(this.props.currGroup.group_name || '') }])
+     if (this.props.currGroup._id) {
+       this.props.fetchProjectList(this.props.currGroup._id, this.props.currPage)
+     }
+   }
+   ...
+ }
```

#### 类型 R5：空实现 / 已注释 → 删除

`Run.tsx:39`、`ProjectEnvContent.tsx:114`。

## 五、五个必须警惕的语义陷阱

### 陷阱 1：新旧 props 语义翻转 ⚠️ 最高频

```
UNSAFE_componentWillReceiveProps(nextProps)  →  this.props = 旧，nextProps = 新
componentDidUpdate(prevProps)                →  prevProps = 旧，this.props = 新
```

条件判断 `a !== b` 是对称的所以不受影响，但**赋值取哪一侧会反**：

```diff
- this.setState({ list: nextProps.list })   // 新值
+ this.setState({ list: this.props.list })  // 新值 ← 不是 prevProps.list！
```

`InterfaceContent`、`InterfaceList` 里还有 `this.handleRequest(nextProps)` 这类把 props 当参数传的写法，迁移后必须改成 `this.handleRequest(this.props)`。

### 陷阱 2：`componentDidUpdate` 中裸调 `setState` 会死循环

必须有条件守卫，且守卫比较的是**导致这次更新的那个 props**，不能拿 state 自己比自己。

### 陷阱 3：守卫必须覆盖所有分支

`ProjectList` 现在的写法里，`setBreadcrumb` 在守卫之外无条件执行。在 `willReceiveProps` 里这不致命（只在父组件重渲染时触发一次），但在 `componentDidUpdate` 里就是循环源头。**凡是原来在守卫外的语句，迁移时都要补守卫。**

### 陷阱 4：`await` 后读 `this.props` 拿到的是旧值

`containers/Project/Project.tsx` 现有代码：

```js
await this.props.getProject(nextProjectId)
await this.props.fetchGroupMsg(this.props.curProject.group_id)  // ← this.props 未必已更新
```

这依赖 redux-promise 的同步派发时序，属于既有隐患。迁移时一并修正为**用 action 的返回值**而非 `this.props`：

```js
const res = await this.props.getProject(nextProjectId)
await this.props.fetchGroupMsg(res.payload.data.data.group_id)
```

同类写法还在 `InterfaceCaseContent`、`InterfaceColContent`、`GroupList` 里出现，其中 `InterfaceColContent` 已经在用 `result.payload.data.data` 的正确姿势，可作参照。

### 陷阱 5：顺手修掉的既有 bug

`containers/Group/MemberList/MemberList.tsx:148`：

```js
if (this._groupId !== this._groupId) {  // 恒为 false，这行是死代码
```

迁移时直接删除，并确认原意是否为 `this._groupId !== nextProps.currGroup._id`。

## 六、分批实施计划

按依赖层次从叶子到容器推进，每批独立 commit、独立回归：

| 批次 | 范围 | 文件数 | 说明 | 状态 |
| --- | --- | --- | --- | --- |
| 1 | 空实现与已注释代码 | 2 | `Run.tsx`、`News.tsx` 的 willMount，零风险 | ✅ 已完成 |
| 2 | 纯 M1（只改方法名） | 16 | 机械替换，回归成本低 | ✅ 已完成 |
| 3 | 叶子展示组件（R1/R2） | ~8 | `Loading`、`Label`、`FieldInput`、`AceEditor` ×2、`MyPopConfirm`、`VariablesSelect` | 待做 |
| 4 | M2 constructor 迁移 | 7 | `ModalPostman`、`GroupSetting`、`ProjectMock`、`ProjectRequest`、`AddProject`、`AddColModal`、`App`、`SchemaJson` ×2 | 待做 |
| 5 | M3 重定向改造 | 2 | `Home`、`AuthenticatedComponent`，需人工验证登录/登出跳转 | 待做 |
| 6 | 路由驱动的容器组件（R3） | ~9 | 风险最高，含 `Project`、`InterfaceColContent`、`InterfaceCaseContent`，需逐个人工回归 | 待做 |
| 7 | 收尾 | — | 全仓 grep 归零；`client/index.tsx` 开启 `<StrictMode>` 验证无告警 | 待做 |

### 批次 1 + 2 实施记录

`UNSAFE_componentWillMount` 由 33 处降至 14 处，共处理 18 个文件。

删除空实现 2 处：`Run/Run.tsx`（空方法体）、`News/News.tsx`（方法体仅剩历史注释）。

改名 `componentDidMount` 16 处：`StatChart`、`StatisticPage/index`、`YapiTimeLine`、`Follows`、`GroupList`、`NewsTimeline`、`Interface`、`InterfaceColMenu`、`InterfaceContent`、`InterfaceList`、`InterfaceMenu`、`ProjectData`、`ProjectEnv/index`、`ProjectMember`、`ProjectMessage`、`User/List`。

首帧安全性逐个核对结论：

- `Interface.tsx` 的 `setColData({isShowCol: true})` 看似是渲染前必须完成的同步 dispatch，但 `reducer/modules/interfaceCol.ts:23` 中 `isShowCol` 初始值已经是 `true`，首次挂载时该 dispatch 本就是空操作，可安全后移。
- `InterfaceContent.tsx` 的 `handleRequest` 内含同步 `setState({curTab: 'view'})`，而 constructor 里 `curTab` 初始值已是 `'view'`，同样是空操作。
- `InterfaceList.tsx` 的 `handleRequest` 内 `setState({catid: null})` 与初始值一致，同理。
- `ProjectEnv/index.tsx` 的 `this._isMounted = true` 后移无影响：该字段类属性默认值为 `false`，且只在 `await` 之后的异步回调（第 126 行）中被读取。原先在 render 阶段就置 `true` 本身是错的（组件此时尚未挂载），后移到 `componentDidMount` 反而修正了语义。
- 其余文件的 willMount 体首行即为 `await` 或异步 dispatch，`setState` 本来就发生在首次 render 之后，改名不产生行为差异。
- `User/List.tsx` 原本同时存在 `componentDidMount`（`getUserList`）与 `UNSAFE_componentWillMount`（`setBreadcrumb`），已合并为单个 `componentDidMount`，`setBreadcrumb` 置于 `getUserList` 之前保持原有先后顺序。

本批**刻意排除**的文件及原因：

- `AddProject.tsx` —— 看似只是取数，实则不能简单改名。其 willMount 中 `if (!this.props.currGroup._id)` 为假时不会执行任何 `await`，整个函数体同步跑完，`setState({currGroupId})` 在首次 render 前生效；而 render 里 `<FormItem name="group" initialValue={String(this.state.currGroupId)}>` 的 `initialValue` 被 antd Form 在挂载时一次性捕获。改名后首帧会捕获到 `"null"`，导致「所属分组」默认值失效。归入批次 4 走 constructor。
- `ProjectMock/index.tsx`、`ProjectRequest.tsx` —— 纯同步 `setState` 镜像 props，属 M2，归入批次 4。
- `Project.tsx`、`InterfaceCaseContent.tsx`、`InterfaceColContent.tsx` —— 单看 willMount 只是改名，但都带有第五节陷阱 4 的 `await` 后读 `this.props` 问题，且与各自的 `willReceiveProps` 逻辑高度耦合，放在批次 6 一并改造，避免同一处代码改两次。

验证结果：

- `tsc --noEmit` 前后错误数均为 1848，逐行 diff 后全部差异均为删行导致的行号位移，无新增错误（该 1848 为项目既有基线，实际构建走 babel/ts-loader 的宽松配置）。
- `eslint` 目标文件 4 errors → 3 errors，减少的一条正是被删除的空方法 `no-empty-function`；剩余 3 条均为既有问题（含批次 3 待处理的空 `willReceiveProps`）。
- `npm run prod` 构建通过，仅剩既有的包体积告警。

## 七、验收方式

1. `git grep "UNSAFE_component" -- client/**/*.tsx` 返回空。
2. `client/index.tsx` 包上 `<StrictMode>`，`npm run dev` 控制台无 legacy 生命周期告警。
3. 人工回归重点路径：
   - 登录 / 登出跳转、未登录访问受保护路由
   - 分组切换 → 项目列表刷新 + 面包屑更新
   - 项目切换（直接改地址栏 id）
   - 接口列表 ↔ 接口详情 ↔ 编辑，路由 actionId 切换
   - 测试集合切换、用例切换、运行
   - JSON Schema 编辑器打开/切换接口
   - 高级 Mock、环境配置、成员管理

## 八、后续（不在本次范围）

清理完 `UNSAFE_*` 后，React 19 升级的剩余阻塞项是：string ref（约 10 个文件）、`findDOMNode`（`EasyDragSort`）、`propTypes`（37 个文件，可与 TS 类型合并清理）。建议单独开一份方案。
