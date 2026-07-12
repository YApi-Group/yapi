import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import React from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'

import './plugin'
import 'antd/dist/reset.css'
import './styles/common.scss'
import './styles/antd-overrides.scss'

import App from './App'
import createStore from './reducer/create'
import antdTheme from './styles/antdTheme'

// 由于 antd 组件的默认文案是英文，所以需要修改为中文
console.log(VERSION_INFO)

// antd 5 的 message/notification/Modal 静态方法默认渲染在 ConfigProvider 之外，
// 无法消费动态主题与 locale（控制台会告警）。项目中静态调用遍布 reducer 中间件等
// 非组件模块，无法改用 App.useApp()，故采用官方的全局 holderRender 方案统一注入。
ConfigProvider.config({
  holderRender: children => (
    <ConfigProvider locale={zhCN} theme={antdTheme}>
      {children}
    </ConfigProvider>
  ),
})

const store = createStore()

// React 18 起使用 createRoot 挂载应用（替代已废弃的 ReactDOM.render）
const root = createRoot(document.getElementById('yapi') as HTMLElement)
root.render(
  <Provider store={store}>
    <ConfigProvider locale={zhCN} theme={antdTheme}>
      <App />
    </ConfigProvider>
  </Provider>
)
