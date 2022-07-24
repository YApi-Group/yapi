import { Tabs } from 'antd'
import PropTypes from 'prop-types'
import React, { PureComponent as Component } from 'react'
import { connect } from 'react-redux'

import LoginForm from './LoginForm'
import RegForm from './RegForm'

import './Login.scss'

const TabPane = Tabs.TabPane

type PropTypes = {
  canRegister?: boolean
  loginWrapActiveKey?: string
}

class LoginWrap extends Component<PropTypes> {
  render() {
    const { loginWrapActiveKey, canRegister } = this.props

    /* show only login when register is disabled */

    return (
      <Tabs defaultActiveKey={loginWrapActiveKey} className="login-form" tabBarStyle={{ border: 'none' }}>
        <TabPane tab="登录" key="1">
          <LoginForm />
        </TabPane>
        <TabPane tab={'注册'} key="2">
          {canRegister ? <RegForm /> : <div style={{ minHeight: 200 }}>管理员已禁止注册，请联系管理员</div>}
        </TabPane>
      </Tabs>
    )
  }
}

const states = (state: any) => ({
  canRegister: state.user.canRegister,
  loginWrapActiveKey: state.user.loginWrapActiveKey,
})

export default connect(states)(LoginWrap)
