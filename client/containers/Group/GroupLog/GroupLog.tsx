import PropTypes from 'prop-types'
import React, { PureComponent as Component } from 'react'
import { connect } from 'react-redux'

import { YapiTimeLine } from '../../../components/YapiTimeLine'
// import { Button } from 'antd'

type PropTypes = {
  uid?: string
  match?: any
  curGroupId?: number
}

class GroupLog extends Component<PropTypes> {
  render() {
    return (
      <div className="g-row">
        <section className="news-box m-panel">
          <YapiTimeLine type={'group'} typeid={this.props.curGroupId} />
        </section>
      </div>
    )
  }
}

const states = (state: any) => ({
  uid: String(state.user.uid),
  curGroupId: state.group.currGroup._id,
})

export default connect(states)(GroupLog) as typeof GroupLog
