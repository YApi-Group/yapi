import { LogoutOutlined, UserOutlined, SolutionOutlined, BarChartOutlined } from '@ant-design/icons'
import { Menu } from 'antd'
import { ItemType } from 'antd/lib/menu/hooks/useItems'
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

const MenuUser = (props: PropTypes) => {
  const menuItems: ItemType[] = []

  for (const [k, v] of Object.entries(headerMenu)) {
    const isAdmin = props.role === 'admin'
    if (v.adminFlag && !isAdmin) {
      continue
    }

    let lb: JSX.Element = null
    if (v.name === '个人中心') {
      lb = (
        <Link to={v.path + `/${props.uid}`}>
          <v.icon />
          {v.name}
        </Link>
      )
    } else {
      lb = (
        <Link to={v.path}>
          <v.icon />
          {v.name}
        </Link>
      )
    }

    menuItems.push({ label: lb, key: k })
  }

  menuItems.push({
    label: (
      <a onClick={props.logout}>
        <LogoutOutlined /> 退出
      </a>
    ),
    key: 'unique-9',
  })

  return <Menu items={menuItems} theme="dark" className="user-menu" />
}

export { MenuUser }
