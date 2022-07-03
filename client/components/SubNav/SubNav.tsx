import { Menu } from 'antd'
import { ItemType } from 'antd/lib/menu/hooks/useItems'
import PropTypes from 'prop-types'
import React, { PureComponent as Component } from 'react'
import { Link } from 'react-router-dom'

import './SubNav.scss'

type PropTypes = {
  data: any[]
  default: string
}

class SubNav extends Component<PropTypes, any> {
  handleClick: () => {
    /* noop */
  }

  render() {
    const menuItems: ItemType[] = this.props.data.map((item, index) => {
      // 若导航标题为两个字，则自动在中间加个空格
      if (item.name.length === 2) {
        item.name = item.name[0] + ' ' + item.name[1]
      }

      return {
        label: <Link to={item.path}>{this.props.data[index].name}</Link>,
        key: item.name.replace(' ', ''),
      }
    })

    return (
      <div className="m-subnav">
        <Menu
          onClick={this.handleClick}
          selectedKeys={[this.props.default]}
          items={menuItems}
          mode="horizontal"
          className="g-row m-subnav-menu"
        />
      </div>
    )
  }
}

export default SubNav
