import { Breadcrumb } from 'antd'
import React, { PureComponent as Component } from 'react'
import { connect } from 'react-redux'
import { withRouter, Link } from 'react-router-dom'

import './Breadcrumb.scss'

type PropTypes = {
  breadcrumb: any[]
}

class BreadcrumbNavigation extends Component<PropTypes> {
  render() {
    const items = this.props.breadcrumb.map(item => ({
      title: item.href ? <Link to={item.href}>{item.name}</Link> : item.name,
    }))

    return (
      <div className="breadcrumb-container">
        <Breadcrumb items={items} />
      </div>
    )
  }
}

const states = (state: any) => ({
  breadcrumb: state.user.breadcrumb,
})

export default connect(states)(withRouter(BreadcrumbNavigation as any)) as any as typeof BreadcrumbNavigation
