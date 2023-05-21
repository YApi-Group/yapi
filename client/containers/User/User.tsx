import { Row } from 'antd'
import React, { PureComponent as Component } from 'react'
import { connect } from 'react-redux'
import { Route } from 'react-router-dom'

import List from './List'
import Profile from './Profile'

import './index.scss'

type PropsType = {
  match: {
    path: string
  }
  curUid: number
  userType: string
  role: string
}

class User extends Component<PropsType> {
  render() {
    return (
      <div>
        <div className="g-doc">
          <Row className="user-box">
            <Route path={this.props.match.path + '/list'} component={List} />
            <Route path={this.props.match.path + '/profile/:uid'} component={Profile} />
          </Row>
        </div>
      </div>
    )
  }
}

const states = (state: any) => ({
  curUid: state.user.uid,
  userType: state.user.type,
  role: state.user.role,
})

const actions = {}

export default connect(states, actions)(User)
