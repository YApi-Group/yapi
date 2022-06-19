import { LogoutOutlined, UserOutlined, SolutionOutlined, BarChartOutlined } from '@ant-design/icons'
import { Menu } from 'antd'
import PropTypes from 'prop-types'
import React from 'react'
import { Link } from 'react-router-dom'

import plugin from '@/plugin.js'
import { AnyFunc } from '@/types'

import './Header.scss'

type PropTypes = {
  user: string
  msg: string
  role: string
  uid: number
  relieveLink: AnyFunc
  logout: AnyFunc
}

type MenuNames = 'user' | 'solution' | 'statistic'

const headerMenu = {
  user: {
    path: '/user/profile',
    name: '个人中心',
    icon: UserOutlined,
    adminFlag: false,
  },
  solution: {
    path: '/user/list',
    name: '用户管理',
    icon: SolutionOutlined,
    adminFlag: true,
  },
  statistic: {
    path: '/statistic',
    name: '系统信息',
    icon: BarChartOutlined,
    adminFlag: true,
  },
} as const

plugin.emitHook('header_menu', headerMenu)

const MenuUser = (props: PropTypes) => (
  <Menu theme="dark" className="user-menu">
    {Object.keys(headerMenu).map((key: MenuNames) => {
      const item = headerMenu[key]

      const isAdmin = props.role === 'admin'
      if (item.adminFlag && !isAdmin) {
        return null
      }

      return (
        <Menu.Item key={key}>
          {item.name === '个人中心' ? (
            <Link to={item.path + `/${props.uid}`}>
              <item.icon />
              {item.name}
            </Link>
          ) : (
            <Link to={item.path}>
              <item.icon />
              {item.name}
            </Link>
          )}
        </Menu.Item>
      )
    })}

    <Menu.Item key="9">
      <a onClick={props.logout}>
        <LogoutOutlined />
        退出
      </a>
    </Menu.Item>
  </Menu>
)

export { MenuUser }
