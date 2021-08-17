import { ConfigProvider } from 'antd'
import zhCN from 'antd/lib/locale-provider/zh_CN'
import React from 'react'
import ReactDOM from 'react-dom'
import { Provider } from 'react-redux'

import './plugin'
import './styles/common.scss'
import './styles/theme.less'

import App from './Application'
import createStore from './reducer/create'

// 由于 antd 组件的默认文案是英文，所以需要修改为中文
console.log(VERSION_INFO)

const store = createStore()

ReactDOM.render(
  <Provider store={store}>
    <ConfigProvider locale={zhCN}>
      <App />
    </ConfigProvider>
  </Provider>,
  document.getElementById('yapi'),
)
