import PropTypes from 'prop-types'
import React from 'react'
import { connect } from 'react-redux'

import { AnyFunc } from '@/types'

import { changeMenuItem } from '../reducer/modules/menu'

type PropTypes = {
  isAuthenticated: boolean
  location: any
  dispatch: AnyFunc
  history: any
  changeMenuItem: AnyFunc
}

const states = (state:any) => ({
  isAuthenticated: state.user.isLogin,
})

const actions = {
  changeMenuItem,
}

export function requireAuthentication(Comp: typeof React.Component) {
  class AuthenticatedComponent extends React.PureComponent<PropTypes> {
    UNSAFE_componentWillMount() {
      this.checkAuth()
    }

    UNSAFE_componentWillReceiveProps() {
      this.checkAuth()
    }

    checkAuth() {
      if (!this.props.isAuthenticated) {
        this.props.history.push('/')
        this.props.changeMenuItem('/')
      }
    }

    render() {
      return <div>{this.props.isAuthenticated ? <Comp {...this.props} /> : null}</div>
    }
  }

  return connect(states, actions)(AuthenticatedComponent) as typeof AuthenticatedComponent
}
