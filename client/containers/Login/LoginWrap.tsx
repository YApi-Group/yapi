import { Tabs } from 'antd'
import type { TabsProps } from 'antd'
import PropTypes from 'prop-types'
import React, { PureComponent as Component } from 'react'
import { connect } from 'react-redux'

import LoginForm from './LoginForm'
import RegForm from './RegForm'

import './Login.scss'

type PropTypes = {
  canRegister?: boolean
  loginWrapActiveKey?: string
}

class LoginWrap extends Component<PropTypes> {
  render() {
    const { loginWrapActiveKey, canRegister } = this.props

    /* show only login when register is disabled */

    const items: TabsProps['items'] = [
      {
        key: '1',
        label: '登录',
        children: <LoginForm />,
      },
      {
        key: '2',
        label: '注册',
        children: canRegister ? <RegForm /> : <div style={{ minHeight: 200 }}>管理员已禁止注册，请联系管理员</div>,
      },
    ]

    return (
      <Tabs defaultActiveKey={loginWrapActiveKey} className="login-form" tabBarStyle={{ border: 'none' }} items={items} />
    )
  }
}

const states = (state: any) => ({
  canRegister: state.user.canRegister,
  loginWrapActiveKey: state.user.loginWrapActiveKey,
})

export default connect(states)(LoginWrap)
