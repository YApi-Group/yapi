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
    const getItem = this.props.breadcrumb.map((item, index) => {
      if (item.href) {
        return (
          <Breadcrumb.Item key={index}>
            <Link to={item.href}>{item.name}</Link>
          </Breadcrumb.Item>
        )
      }

      return <Breadcrumb.Item key={index}>{item.name}</Breadcrumb.Item>
    })

    return (
      <div className="breadcrumb-container">
        <Breadcrumb>{getItem}</Breadcrumb>
      </div>
    )
  }
}

const states = (state: any) => ({
  breadcrumb: state.user.breadcrumb,
})

export default connect(states)(withRouter(BreadcrumbNavigation as any)) as any as typeof BreadcrumbNavigation
