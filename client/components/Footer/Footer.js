import React, { PureComponent as Component } from 'react'
import PropTypes from 'prop-types'
import { Row, Col } from 'antd'
import { GithubOutlined, TeamOutlined, AliwangwangOutlined } from '@ant-design/icons'
import data from '@/package.json'

import './Footer.scss'

// console.log(data.version)
// const version = process.env.version
class Footer extends Component {
  static propTypes = {
    footList: PropTypes.array,
  }

  render() {
    return (
      <div className="footer-wrapper">
        <Row className="footer-container">
          {this.props.footList.map(function (item, i) {
            return (
              <FootItem
                key={i}
                linkList={item.linkList}
                title={item.title}
                iconType={item.iconType}
              />
            )
          })}
        </Row>
      </div>
    )
  }
}

class FootItem extends Component {
  static propTypes = {
    linkList: PropTypes.array,
    title: PropTypes.string,
    iconType: PropTypes.string,
  }

  render() {
    const { iconType, title, linkList } = this.props

    return (
      <Col span={6}>
        <h4 className="title">
          {iconType ? <iconType className="icon" /> : ''}
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
}

Footer.defaultProps = {
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

export default Footer
