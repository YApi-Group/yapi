import { UserOutlined, MailOutlined, LockOutlined } from '@ant-design/icons'
import { Form, Button, Input, message } from 'antd'
import PropTypes from 'prop-types'
import React, { PureComponent as Component } from 'react'
import { connect } from 'react-redux'
import { withRouter } from 'react-router-dom'

import { AnyFunc } from '@/types'

import { regActions } from '../../reducer/modules/user'

const FormItem = Form.Item
const formItemStyle = {
  marginBottom: '.16rem',
}

const changeHeight = {
  height: '.42rem',
}

type PropTypes = {
  form?: any
  history?: any
  regActions?: AnyFunc
}

type StateTypes = {
  confirmDirty: boolean
}

class RegForm extends Component<PropTypes, StateTypes> {
  constructor(props: PropTypes) {
    super(props)
    this.state = {
      confirmDirty: false,
    }
  }

  handleSubmit = (values: any) => {
    // e.preventDefault()
    // const form = this.props.form
    // form.validateFieldsAndScroll((err, values) => {
    // if (!err) {
    this.props.regActions(values).then((res:any) => {
      if (res.payload.data.errcode === 0) {
        this.props.history.replace('/group')
        message.success('注册成功! ')
      }
    })
    // }
    // })
  }

  checkPassword = (rule:any, value:any, callback:any) => {
    const form = this.props.form
    if (value && value !== form.getFieldValue('password')) {
      callback('两次输入的密码不一致啊!')
    } else {
      callback()
    }
  }

  checkConfirm = (rule:any, value:any, callback:any) => {
    const form = this.props.form
    if (value && this.state.confirmDirty) {
      form.validateFields(['confirm'], { force: true })
    }
    callback()
  }

  render() {
    return (
      <Form onFinish={this.handleSubmit}>
        {/* 用户名 */}
        <FormItem style={formItemStyle} name="userName" rules={[{ required: true, message: '请输入用户名!' }]}>
          <Input style={changeHeight} prefix={<UserOutlined style={{ fontSize: 13 }} />} placeholder="Username" />
        </FormItem>

        {/* Emaiil */}
        <FormItem
          style={formItemStyle}
          name="email"
          rules={[
            {
              required: true,
              message: '请输入email!',
              pattern: /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{1,})+$/,
            },
          ]}
        >
          <Input style={changeHeight} prefix={<MailOutlined style={{ fontSize: 13 }} />} placeholder="Email" />
        </FormItem>

        {/* 密码 */}
        <FormItem
          style={formItemStyle}
          name="password"
          rules={[{ required: true, message: '请输入密码!' }, { validator: this.checkConfirm }]}
        >
          <Input
            style={changeHeight}
            prefix={<LockOutlined style={{ fontSize: 13 }} />}
            type="password"
            placeholder="Password"
          />
        </FormItem>

        {/* 密码二次确认 */}
        <FormItem
          style={formItemStyle}
          name="confirm"
          rules={[{ required: true, message: '请再次输入密码密码!' }, { validator: this.checkPassword }]}
        >
          <Input
            style={changeHeight}
            prefix={<LockOutlined style={{ fontSize: 13 }} />}
            type="password"
            placeholder="Confirm Password"
          />
        </FormItem>

        {/* 注册按钮 */}
        <FormItem style={formItemStyle}>
          <Button style={changeHeight} type="primary" htmlType="submit" className="login-form-button">
            注册
          </Button>
        </FormItem>
      </Form>
    )
  }
}

const states = (state: any) => ({
  loginData: state.user,
})

const actions = {
  regActions,
}

export default connect(states, actions)(withRouter(RegForm as any)) as any as typeof RegForm
