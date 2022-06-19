import {
  StarOutlined,
  PlusCircleOutlined,
  DownOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons'
import { Dropdown, Tooltip, Popover, Tag } from 'antd'
import PropTypes from 'prop-types'
import React from 'react'
import { Link } from 'react-router-dom'

import { AnyFunc } from '@/types'

import GuideBtns from '../GuideBtns/GuideBtns.js'

import { MenuUser } from './MenuUser'
import Search from './Search/Search'

import './Header.scss'

type PropTypes = {
  user?: string
  msg?: string
  role?: string
  uid?: number
  relieveLink?: AnyFunc
  logout?: AnyFunc
  groupList?: any[]
  studyTip?: number
  study?: boolean
  imageUrl?: string
}

const tipFollow = (
  <div className="title-container">
    <h3 className="title">
      <StarOutlined /> 关注
    </h3>
    <p>这里是你的专属收藏夹，便于你找到自己的项目</p>
  </div>
)
const tipAdd = (
  <div className="title-container">
    <h3 className="title">
      <PlusCircleOutlined /> 新建项目
    </h3>
    <p>在任何页面都可以快速新建项目</p>
  </div>
)
const tipDoc = (
  <div className="title-container">
    <h3 className="title">
      使用文档 <Tag color="orange">推荐!</Tag>
    </h3>
    <p>
      初次使用 YApi，强烈建议你阅读{' '}
      <a target="_blank" href="https://hellosean1025.github.io/yapi/" rel="noopener noreferrer">
        使用文档
      </a>
      ，我们为你提供了通俗易懂的快速入门教程，更有详细的使用说明，欢迎阅读！{' '}
    </p>
  </div>
)

const ToolUser = (props: PropTypes) => {
  const imageUrl = props.imageUrl ? props.imageUrl : `/api/user/avatar?uid=${props.uid}`
  return (
    <ul>
      <li className="toolbar-li item-search">
        <Search groupList={props.groupList} />
      </li>
      <Popover
        overlayClassName="popover-index"
        content={<GuideBtns />}
        title={tipFollow}
        placement="bottomRight"
        arrowPointAtCenter
        visible={props.studyTip === 1 && !props.study}
      >
        <Tooltip placement="bottom" title={'我的关注'}>
          <li className="toolbar-li">
            <Link to="/follow">
              <StarOutlined className="dropdown-link" style={{ fontSize: 16 }} />
            </Link>
          </li>
        </Tooltip>
      </Popover>
      <Popover
        overlayClassName="popover-index"
        content={<GuideBtns />}
        title={tipAdd}
        placement="bottomRight"
        arrowPointAtCenter
        visible={props.studyTip === 2 && !props.study}
      >
        <Tooltip placement="bottom" title={'新建项目'}>
          <li className="toolbar-li">
            <Link to="/add-project">
              <PlusCircleOutlined className="dropdown-link" style={{ fontSize: 16 }} />
            </Link>
          </li>
        </Tooltip>
      </Popover>
      <Popover
        overlayClassName="popover-index"
        content={<GuideBtns isLast={true} />}
        title={tipDoc}
        placement="bottomRight"
        arrowPointAtCenter
        visible={props.studyTip === 3 && !props.study}
      >
        <Tooltip placement="bottom" title={'使用文档'}>
          <li className="toolbar-li">
            <a target="_blank" href="https://hellosean1025.github.io/yapi" rel="noopener noreferrer">
              <QuestionCircleOutlined className="dropdown-link" style={{ fontSize: 16 }} />
            </a>
          </li>
        </Tooltip>
      </Popover>
      <li className="toolbar-li">
        <Dropdown
          placement="bottomRight"
          trigger={['click']}
          overlay={
            <MenuUser
              user={props.user}
              msg={props.msg}
              uid={props.uid}
              role={props.role}
              relieveLink={props.relieveLink}
              logout={props.logout}
            />
          }
        >
          <a className="dropdown-link">
            <span className="avatar-image">
              <img src={imageUrl} />
            </span>
            {/* props.imageUrl? <Avatar src={props.imageUrl} />: <Avatar src={`/api/user/avatar?uid=${props.uid}`} />*/}
            <span className="name">
              <DownOutlined />
            </span>
          </a>
        </Dropdown>
      </li>
    </ul>
  )
}

export { ToolUser }
