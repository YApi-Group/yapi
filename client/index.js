import { LocaleProvider } from 'antd'
import React from 'react'
import ReactDOM from 'react-dom'
import { Provider } from 'react-redux'
import zhCN from 'antd/lib/locale-provider/zh_CN'

import './plugin'
import './styles/common.scss'
import './styles/theme.less'

import App from './Application'
import createStore from './reducer/create'

// 由于 antd 组件的默认文案是英文，所以需要修改为中文

const store = createStore()

ReactDOM.render(
  <Provider store={store}>
    <LocaleProvider locale={zhCN}>
      <App />
    </LocaleProvider>
  </Provider>,
  document.getElementById('yapi'),
)
