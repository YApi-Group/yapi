import { Timeline, Spin, Row, Col, Tag, Avatar, Button, Modal, AutoComplete } from 'antd'
import * as jsondiffpatch from 'jsondiffpatch'
import { formatters } from 'jsondiffpatch'
import PropTypes from 'prop-types'
import React, { PureComponent as Component } from 'react'
import { connect } from 'react-redux'
import { Link } from 'react-router-dom'

import variable from '@/cons'
import { AnyFunc } from '@/types.js'

import showDiffMsg from '../../../common/diff-view.js'
import { timeago } from '../../../common/utils'
import { formatTime } from '../../common.js'
import { fetchInterfaceList } from '../../reducer/modules/interface.js'
import { fetchNewsData, fetchMoreNews } from '../../reducer/modules/news.js'
import ErrMsg from '../ErrMsg/ErrMsg'

import 'jsondiffpatch/dist/formatters-styles/annotated.css'
import 'jsondiffpatch/dist/formatters-styles/html.css'
import './YapiTimeLine.scss'

const formattersHtml = formatters.html

// const Option = AutoComplete.Option;
const { Option } = AutoComplete

type PropTypes1 = {
  title: string
  content: string
  className: string
}

const AddDiffView = (props: PropTypes1) => {
  const { title, content, className } = props

  if (!content) {
    return null
  }

  return (
    <div className={className}>
      <h3 className="title">{title}</h3>
      <div dangerouslySetInnerHTML={{ __html: content }} />
    </div>
  )
}

// timeago(new Date().getTime() - 40);

type ApiPartType = {
  method: string
  _id: number
  path: string
  title: string
}

type PropTypes = {
  newsData?: any
  fetchNewsData?: AnyFunc
  fetchMoreNews?: AnyFunc
  setLoading?: AnyFunc
  loading?: boolean
  curpage?: number
  typeid?: number
  curUid?: number
  type?: string
  fetchInterfaceList?: AnyFunc
}

type StateTypes = {
  bidden: string
  loading: boolean
  visible: boolean
  curDiffData: any
  apiList: ApiPartType[]
}

class YapiTimeLine extends Component<PropTypes, StateTypes> {
  curSelectValue = ''

  constructor(props: PropTypes) {
    super(props)
    this.state = {
      bidden: '',
      loading: false,
      visible: false,
      curDiffData: {},
      apiList: [],
    }

    this.curSelectValue = ''
  }

  getMore() {
    if (this.props.curpage <= this.props.newsData.total) {
      this.setState({ loading: true })
      this.props
        .fetchMoreNews(
          this.props.typeid,
          this.props.type,
          this.props.curpage + 1,
          10,
          this.curSelectValue,
        )
        .then(() => {
          this.setState({ loading: false })
          if (this.props.newsData.total === this.props.curpage) {
            this.setState({ bidden: 'logbidden' })
          }
        })
    }
  }

  handleCancel = () => {
    this.setState({
      visible: false,
    })
  }

  UNSAFE_componentWillMount() {
    this.props.fetchNewsData(this.props.typeid, this.props.type, 1, 10)
    if (this.props.type === 'project') {
      this.getApiList()
    }
  }

  openDiff = (data: any) => {
    this.setState({
      curDiffData: data,
      visible: true,
    })
  }

  async getApiList() {
    const result = await this.props.fetchInterfaceList({
      project_id: this.props.typeid,
      limit: 'all',
    })
    this.setState({
      apiList: result.payload.data.data.list,
    })
  }

  handleSelectApi = (selectValue: string) => {
    this.curSelectValue = selectValue
    this.props.fetchNewsData(this.props.typeid, this.props.type, 1, 10, selectValue)
  }

  render() {
    let data: any = this.props.newsData ? this.props.newsData.list : []

    const curDiffData = this.state.curDiffData
    const logType: any = {
      project: '项目',
      group: '分组',
      interface: '接口',
      interface_col: '接口集',
      user: '用户',
      other: '其他',
    }

    const children = this.state.apiList.map(item => {
      const methodColor = (variable.METHOD_COLOR as any)[item.method ? item.method.toLowerCase() : 'get']
      return (
        <Option title={item.title} value={String(item._id)} path={item.path} key={item._id}>
          {item.title}{' '}
          <Tag
            style={{ color: methodColor ? methodColor.color : '#cfefdf', backgroundColor: methodColor ? methodColor.bac : '#00a854', border: 'unset' }}
          >
            {item.method}
          </Tag>
        </Option>
      )
    })

    children.unshift(<Option value="" key="all">
      选择全部
    </Option>)

    if (data && data.length) {
      data = data.map((item: any, i: number) => {
        let interfaceDiff = false
        // 去掉了 && item.data.interface_id
        if (item.data && typeof item.data === 'object') {
          interfaceDiff = true
        }
        return (
          <Timeline.Item
            dot={
              <Link to={`/user/profile/${item.uid}`}>
                <Avatar src={`/api/user/avatar?uid=${item.uid}`} />
              </Link>
            }
            key={i}
          >
            <div className="logMesHead">
              <span className="logTimeAgo">{timeago(item.add_time)}</span>
              <span className="logtype">{logType[item.type]}动态</span>
              <span className="logtime">{formatTime(item.add_time)}</span>
            </div>
            <span className="logcontent" dangerouslySetInnerHTML={{ __html: item.content }} />
            <div style={{ padding: '10px 0 0 10px' }}>
              {interfaceDiff && <Button onClick={() => this.openDiff(item.data)}>改动详情</Button>}
            </div>
          </Timeline.Item>
        )
      })
    } else {
      data = ''
    }
    let pending
      = this.props.newsData.total <= this.props.curpage ? (
        <a className="logbidden">以上为全部内容</a>
      ) : (
        <a className="loggetMore" onClick={this.getMore.bind(this)}>
          查看更多
        </a>
      )
    if (this.state.loading) {
      pending = <Spin />
    }
    const diffView = showDiffMsg(jsondiffpatch, formattersHtml, curDiffData)

    return (
      <section className="news-timeline">
        <Modal
          style={{ minWidth: '800px' }}
          title="Api 改动日志"
          visible={this.state.visible}
          footer={null}
          onCancel={this.handleCancel}
        >
          <i>注： 绿色代表新增内容，红色代表删除内容</i>
          <div className="project-interface-change-content">
            {diffView.map((item, index) => (
              <AddDiffView
                className="item-content"
                title={item.title}
                key={index}
                content={item.content}
              />
            ))}
            {diffView.length === 0 && <ErrMsg type="noChange" />}
          </div>
        </Modal>
        {this.props.type === 'project' && (
          <Row className="news-search">
            <Col span="3">选择查询的 Api：</Col>
            <Col span="10">
              <AutoComplete
                onSelect={this.handleSelectApi}
                style={{ width: '100%' }}
                placeholder="Select Api"
                filterOption={(inputValue, option) => {
                  if (option.value === '') { return true }
                  if (option.path.indexOf(inputValue) !== -1 || option.title.indexOf(inputValue) !== -1) {
                    return true
                  }

                  return false
                }}
              >
                {/* {children} */}
                {/* <OptGroup label="other"> */}
                <Option value="wiki" path="" title="wiki">
                  wiki
                </Option>
                {/* </OptGroup> */}
                {/* <OptGroup label="api">{children}</OptGroup> */}
                {children}
              </AutoComplete>
            </Col>
          </Row>
        )}
        {data ? (
          <Timeline className="news-content" pending={pending}>
            {data}
          </Timeline>
        ) : (
          <ErrMsg type="noData" />
        )}
      </section>
    )
  }
}

const states = (state: any) => ({
  newsData: state.news.newsData,
  curpage: state.news.curpage,
  curUid: state.user.uid,
})

const actions = {
  fetchNewsData,
  fetchMoreNews,
  fetchInterfaceList,
}

export default connect(states, actions)(YapiTimeLine) as typeof YapiTimeLine
