import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { Form, Button, Input, message, Radio } from 'antd'
import PropTypes from 'prop-types'
import React, { PureComponent as Component } from 'react'
import { connect } from 'react-redux'
import { withRouter } from 'react-router-dom'

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

// @connect(
//   state => ({ //     loginData: state.user, //     isLDAP: state.user.isLDAP, //   }),
//   { //     loginActions, //     loginLdapActions, //   },
// )
// @withRouter
class Login extends Component {
  constructor(props) {
    super(props)
    this.state = {
      loginType: 'ldap',
    }
  }

  static propTypes = {
    form: PropTypes.object,
    history: PropTypes.object,
    loginActions: PropTypes.func,
    loginLdapActions: PropTypes.func,
    isLDAP: PropTypes.bool,
  }

  handleSubmit = values => {
    // console.log(values)
    if (this.props.isLDAP && this.state.loginType === 'ldap') {
      this.props.loginLdapActions(values).then(res => {
        if (res.payload.data.errcode == 0) {
          this.props.history.replace('/group')
          message.success('登录成功! ')
        }
      })
    } else {
      this.props.loginActions(values).then(res => {
        if (res.payload.data.errcode == 0) {
          this.props.history.replace('/group')
          message.success('登录成功! ')
        }
      })
    }
  }

  componentDidMount() {
    // Qsso.attach('qsso-login','/api/user/login_by_token')
    console.log('isLDAP', this.props.isLDAP)
  }
  handleFormLayoutChange = e => {
    this.setState({ loginType: e.target.value })
  }

  render() {
    const { isLDAP } = this.props

    const emailRule
      = this.state.loginType === 'ldap'
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

        {/* <div className="qsso-breakline">
          <span className="qsso-breakword">或</span>
        </div>
        <Button style={changeHeight} id="qsso-login" type="primary" className="login-form-button" size="large" ghost>QSSO登录</Button> */}
      </Form>
    )
  }
}

const states = state => ({
  loginData: state.user,
  isLDAP: state.user.isLDAP,
})

const actions = {
  loginActions,
  loginLdapActions,
}

export default connect(states, actions)(withRouter(Login))
// export default Login
