import { Layout, message } from 'antd'
import PropTypes from 'prop-types'
import React, { PureComponent as Component } from 'react'
import { connect } from 'react-redux'
import { withRouter, Link } from 'react-router-dom'

import { AnyFunc } from '@/types'

import { changeMenuItem } from '../../reducer/modules/menu'
import { checkLoginState, logoutActions, loginTypeAction } from '../../reducer/modules/user'
import Breadcrumb from '../Breadcrumb/Breadcrumb'
import LogoSVG from '../LogoSVG/index.js'

import { ToolUser } from './ToolUser'

import './Header.scss'

const { Header } = Layout

type PropTypes = {
  router?: any
  user?: string
  msg?: string
  uid?: number
  role?: string
  login?: boolean
  relieveLink?: AnyFunc
  logoutActions?: AnyFunc
  checkLoginState?: (...args: any) => Promise<any>
  loginTypeAction?: AnyFunc
  changeMenuItem?: AnyFunc
  history?: any
  location?: any
  study?: boolean
  studyTip?: number
  imageUrl?: any
}

class HeaderCom extends Component<PropTypes, any> {
  linkTo = (e: any) => {
    if (e.key !== '/doc') {
      this.props.changeMenuItem(e.key)
      if (!this.props.login) {
        message.info('请先登录', 1)
      }
    }
  }

  relieveLink = () => {
    this.props.changeMenuItem('')
  }

  logout = (e: any) => {
    e.preventDefault()
    this.props
      .logoutActions()
      .then((res: any) => {
        if (res.payload.data.errcode === 0) {
          this.props.history.push('/')
          this.props.changeMenuItem('/')
          message.success('退出成功! ')
        } else {
          message.error(res.payload.data.errmsg)
        }
      })
      .catch((err: any) => {
        message.error(err)
      })
  }

  handleLogin = (e: any) => {
    e.preventDefault()
    this.props.loginTypeAction('1')
  }

  handleReg = (e: any) => {
    e.preventDefault()
    this.props.loginTypeAction('2')
  }

  checkLoginState = () => {
    this.props.checkLoginState()
      .then((res: any) => {
        if (res.payload.data.errcode !== 0) {
          this.props.history.push('/')
        }
      })
      .catch((err: any) => {
        console.log(err)
      })
  }

  render() {
    const { login, user, msg, uid, role, studyTip, study, imageUrl } = this.props
    return (
      <Header className="header-box m-header">
        <div className="content g-row">
          <Link onClick={this.relieveLink} to="/group" className="logo">
            <div className="href">
              <span className="img">
                <LogoSVG length="32px" />
              </span>
            </div>
          </Link>
          <Breadcrumb />
          <div className="user-toolbar" style={{ position: 'relative', zIndex: this.props.studyTip > 0 ? 3 : 1 }}>
            {login ? (
              <ToolUser
                {...{ studyTip, study, user, msg, uid, role, imageUrl }}
                relieveLink={this.relieveLink}
                logout={this.logout}
              />
            ) : (
              ''
            )}
          </div>
        </div>
      </Header>
    )
  }
}

const states = (state: any) => ({
  user: state.user.userName,
  uid: state.user.uid,
  msg: null as any,
  role: state.user.role,
  login: state.user.isLogin,
  studyTip: state.user.studyTip,
  study: state.user.study,
  imageUrl: state.user.imageUrl,
})

const actions = {
  loginTypeAction,
  logoutActions,
  checkLoginState,
  changeMenuItem,
}

export default connect(states, actions)(withRouter(HeaderCom as any)) as any as typeof HeaderCom
