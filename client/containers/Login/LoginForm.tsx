import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { Form, Button, Input, message, Radio, RadioChangeEvent } from 'antd'
import PropTypes from 'prop-types'
import React, { PureComponent as Component } from 'react'
import { connect } from 'react-redux'
import { withRouter } from 'react-router-dom'

import { AnyFunc } from '@/types'

import { loginActions, loginLdapActions } from '../../reducer/modules/user'

import './Login.scss'

const FormItem = Form.Item
const RadioGroup = Radio.Group

const formItemStyle = {
  marginBottom: '.16rem',
}

const changeHeight = {
  height: '.42rem',
}

type PropTypes = {
  form?: any
  history?: any
  location?: any
  loginActions?: AnyFunc
  loginLdapActions?: AnyFunc
  isLDAP?: boolean
  isOIDC?: boolean
  oidcName?: string
}

type StateTypes = {
  loginType: string
}

class LoginForm extends Component<PropTypes, StateTypes> {
  constructor(props: PropTypes) {
    super(props)
    this.state = {
      loginType: 'ldap',
    }
  }

  handleSubmit = (values: any) => {
    // console.log(values)
    if (this.props.isLDAP && this.state.loginType === 'ldap') {
      this.props.loginLdapActions(values).then((res: any) => {
        if (res.payload.data.errcode === 0) {
          this.props.history.replace('/group')
          message.success('登录成功! ')
        }
      })
    } else {
      this.props.loginActions(values).then((res: any) => {
        if (res.payload.data.errcode === 0) {
          this.props.history.replace('/group')
          message.success('登录成功! ')
        }
      })
    }
  }

  componentDidMount() {
    // OIDC 登录失败时服务端会重定向到 /login?oidc_error=<文案>：提示后清掉查询串
    const search = this.props.location ? this.props.location.search : ''
    const oidcError = new URLSearchParams(search).get('oidc_error')
    if (oidcError) {
      message.error(oidcError)
      this.props.history.replace('/login')
    }
  }

  handleFormLayoutChange = (e: RadioChangeEvent) => {
    this.setState({ loginType: e.target.value })
  }

  // OIDC 是整页跳转的重定向流程，不能走 axios
  handleOidcLogin = () => {
    window.location.assign('/api/user/login_by_oidc')
  }

  render() {
    const { isLDAP, isOIDC, oidcName } = this.props

    const emailRule = this.state.loginType === 'ldap'
      ? {}
      : {
        required: true,
        message: '请输入正确的email!',
        pattern: /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{1,})+$/,
      }
    return (
      <Form onFinish={this.handleSubmit}>
        {/* 登录类型 (普通登录／LDAP登录) */}
        {isLDAP && (
          <FormItem>
            <RadioGroup defaultValue="ldap" onChange={this.handleFormLayoutChange}>
              <Radio value="ldap">LDAP</Radio>
              <Radio value="normal">普通登录</Radio>
            </RadioGroup>
          </FormItem>
        )}
        {/* 用户名 (Email) */}
        <FormItem style={formItemStyle} name="email" rules={[emailRule]}>
          <Input style={changeHeight} prefix={<UserOutlined style={{ fontSize: 13 }} />} placeholder="Email" />
        </FormItem>

        {/* 密码 */}
        <FormItem style={formItemStyle} name="password" rules={[{ required: true, message: '请输入密码!' }]}>
          <Input
            style={changeHeight}
            prefix={<LockOutlined style={{ fontSize: 13 }} />}
            type="password"
            placeholder="Password"
          />
        </FormItem>

        {/* 登录按钮 */}
        <FormItem style={formItemStyle}>
          <Button style={changeHeight} type="primary" htmlType="submit" className="login-form-button">
            登录
          </Button>
        </FormItem>

        {/* OIDC 登录：服务端 /api/user/status 下发 oidc 开关时才显示 */}
        {isOIDC && (
          <>
            <div className="login-breakline">
              <span className="login-breakword">或</span>
            </div>
            <Button style={changeHeight} className="login-oidc-button" onClick={this.handleOidcLogin}>
              使用 {oidcName} 账号登录
            </Button>
          </>
        )}
      </Form>
    )
  }
}

const states = (state:any) => ({
  loginData: state.user,
  isLDAP: state.user.isLDAP,
  isOIDC: state.user.isOIDC,
  oidcName: state.user.oidcName,
})

const actions = {
  loginActions,
  loginLdapActions,
}

export default connect(states, actions)(withRouter(LoginForm as any)) as any as typeof LoginForm
