import { Row } from 'antd'
import PropTypes from 'prop-types'
import React, { PureComponent as Component } from 'react'
import { connect } from 'react-redux'
import { Route } from 'react-router-dom'

import List from './List.jsx'
import Profile from './Profile.jsx'

import './index.scss'

// @connect(
//   state => ({
//     curUid: state.user.uid,
//     userType: state.user.type,
//     role: state.user.role,
//   }),
//   {},
// )
class User extends Component {
  static propTypes = {
    match: PropTypes.object,
    curUid: PropTypes.number,
    userType: PropTypes.string,
    role: PropTypes.string,
  }

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

const states = state => ({
  curUid: state.user.uid,
  userType: state.user.type,
  role: state.user.role,
})

const actions = {}

export default connect(states, actions)(User)
