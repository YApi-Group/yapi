import { GithubOutlined, TeamOutlined, AliwangwangOutlined } from '@ant-design/icons'
import { Row, Col } from 'antd'
import React, { PureComponent as Component } from 'react'

import data from '@/package.json'

import './Footer.scss'

type ItemPropTypes = {
  linkList: any[]
  title: string
  iconType: typeof Component
}

function FootItem(props: ItemPropTypes) {
  const { iconType: IconType, title, linkList } = props

  return (
    <Col span={6}>
      <h4 className="title">
        {IconType ? <IconType className="icon" /> : ''}
        {title}
      </h4>
      {linkList.map(function (item, i) {
        return (
          <p key={i}>
            <a href={item.itemLink} className="link">
              {item.itemTitle}
            </a>
          </p>
        )
      })}
    </Col>
  )
}

const defaultProps = {
  footList: [
    {
      title: 'GitHub',
      iconType: GithubOutlined,
      linkList: [
        {
          itemTitle: 'YApi 源码仓库',
          itemLink: 'https://github.com/YMFE/yapi',
        },
      ],
    },
    {
      title: '团队',
      iconType: TeamOutlined,
      linkList: [
        {
          itemTitle: 'YMFE',
          itemLink: 'https://ymfe.org',
        },
      ],
    },
    {
      title: '反馈',
      iconType: AliwangwangOutlined,
      linkList: [
        {
          itemTitle: 'Github Issues',
          itemLink: 'https://github.com/YMFE/yapi/issues',
        },
        {
          itemTitle: 'Github Pull Requests',
          itemLink: 'https://github.com/YMFE/yapi/pulls',
        },
      ],
    },
    {
      title: 'Copyright © 2018 YMFE',
      linkList: [
        {
          itemTitle: `版本: ${data.version} `,
          itemLink: 'https://github.com/YMFE/yapi/blob/master/CHANGELOG.md',
        },
        {
          itemTitle: '使用文档',
          itemLink: 'https://hellosean1025.github.io/yapi/',
        },
      ],
    },
  ],
}

type FooPropTypes = {
  footList?: any[]
}

function Footer(props: FooPropTypes = defaultProps) {
  props = Object.assign(defaultProps, props)

  return (
    <div className="footer-wrapper">
      <Row className="footer-container">
        {props.footList.map(function (item, i) {
          return <FootItem key={i} linkList={item.linkList} title={item.title} iconType={item.iconType} />
        })}
      </Row>
    </div>
  )
}

export default Footer
