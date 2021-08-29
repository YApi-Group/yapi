/**
 * Created by gxl.gao on 2017/10/25.
 */
import { QuestionCircleOutlined } from '@ant-design/icons'
import { Row, Col, Tooltip } from 'antd'
import axios from 'axios'
import React, { Component } from 'react'
import { connect } from 'react-redux'

import { setBreadcrumb } from '@/reducer/modules/user'

// import { withRouter } from 'react-router-dom';

import StatChart from './StatChart'
import StatTable from './StatTable'

import './index.scss'

type CountOverviewPropTypes = {
  date: {
    groupCount: number
    projectCount: number
    interfaceCount: number
    interfaceCaseCount: number
  }
}

const CountOverview = (props: CountOverviewPropTypes) => (
  <Row className="m-row">
    <Col className="gutter-row" span={6}>
      <span>
        分组总数
        <Tooltip placement="rightTop" title="统计yapi中一共开启了多少可见的公共分组">
          <QuestionCircleOutlined className="m-help" />
        </Tooltip>
      </span>
      <h2 className="gutter-box">{props.date.groupCount}</h2>
    </Col>
    <Col className="gutter-row" span={6}>
      <span>
        项目总数
        <Tooltip placement="rightTop" title="统计yapi中建立的所有项目总数">
          <QuestionCircleOutlined className="m-help" />
        </Tooltip>
      </span>
      <h2 className="gutter-box">{props.date.projectCount}</h2>
    </Col>
    <Col className="gutter-row" span={6}>
      <span>
        接口总数
        <Tooltip placement="rightTop" title="统计yapi所有项目中的所有接口总数">
          {/* <a href="javascript:void(0)" className="m-a-help">?</a>*/}
          <QuestionCircleOutlined className="m-help" />
        </Tooltip>
      </span>
      <h2 className="gutter-box">{props.date.interfaceCount}</h2>
    </Col>
    <Col className="gutter-row" span={6}>
      <span>
        测试接口总数
        <Tooltip placement="rightTop" title="统计yapi所有项目中的所有测试接口总数">
          {/* <a href="javascript:void(0)" className="m-a-help">?</a>*/}
          <QuestionCircleOutlined className="m-help" />
        </Tooltip>
      </span>
      <h2 className="gutter-box">{props.date.interfaceCaseCount}</h2>
    </Col>
  </Row>
)

type StatusOverviewProps = {
  data: {
    mail: string
    systemName: string
    freemem: string
    totalmem: string
    load: string
    uptime: string
  }
}

const StatusOverview = (props: StatusOverviewProps) => (
  <Row className="m-row">
    <Col className="gutter-row" span={6}>
      <span>
        操作系统类型
        <Tooltip
          placement="rightTop"
          title="操作系统类型,返回值有'darwin', 'freebsd', 'linux', 'sunos' , 'win32'"
        >
          <QuestionCircleOutlined className="m-help" />
        </Tooltip>
      </span>
      <h2 className="gutter-box">{props.data.systemName}</h2>
    </Col>
    <Col className="gutter-row" span={6}>
      <span>
        cpu负载
        <Tooltip placement="rightTop" title="cpu的总负载情况">
          <QuestionCircleOutlined className="m-help" />
        </Tooltip>
      </span>
      <h2 className="gutter-box">{props.data.load} %</h2>
    </Col>
    <Col className="gutter-row" span={6}>
      <span>
        系统空闲内存总量 / 内存总量
        <Tooltip placement="rightTop" title="系统空闲内存总量 / 内存总量">
          <QuestionCircleOutlined className="m-help" />
        </Tooltip>
      </span>
      <h2 className="gutter-box">
        {props.data.freemem} G / {props.data.totalmem} G{' '}
      </h2>
    </Col>
    <Col className="gutter-row" span={6}>
      <span>
        邮箱状态
        <Tooltip placement="rightTop" title="检测配置文件中配置邮箱的状态">
          <QuestionCircleOutlined className="m-help" />
        </Tooltip>
      </span>
      <h2 className="gutter-box">{props.data.mail}</h2>
    </Col>
  </Row>
)

type StatisticPageProps = {
  setBreadcrumb: (data: any) => any
}

type StatisticPageState = {
  count: {
    groupCount: number
    projectCount: number
    interfaceCount: number
    interfaceCaseCount: number
  }
  status: {
    mail: string
    systemName: string
    freemem: string
    totalmem: string
    load: string
    uptime: string
  }
  dataTotal: any[]
}

class StatisticPage extends Component<StatisticPageProps, StatisticPageState> {
  constructor(props: StatisticPageProps) {
    super(props)

    this.state = {
      count: {
        groupCount: 0,
        projectCount: 0,
        interfaceCount: 0,
        interfaceCaseCount: 0,
      },
      status: {
        mail: '',
        systemName: '',
        freemem: '',
        totalmem: '',
        load: '',
        uptime: '',
      },
      dataTotal: [],
    }
  }

  UNSAFE_componentWillMount() {
    this.props.setBreadcrumb([{ name: '系统信息' }])

    /* 下方三个并行执行 */
    this.getStatData()
    this.getSystemStatusData()
    this.getGroupData()
  }

  // 获取统计数据
  async getStatData() {
    const result = await axios.get('/api/statismock/count')
    if (result.data.errcode === 0) {
      const statData = result.data.data
      this.setState({
        count: { ...statData },
      })
    }
  }

  // 获取系统信息
  async getSystemStatusData() {
    const result = await axios.get('/api/statismock/get_system_status')
    if (result.data.errcode === 0) {
      const statusData = result.data.data
      this.setState({ status: { ...statusData } })
    }
  }

  // 获取分组详细信息
  async getGroupData() {
    const result = await axios.get('/api/statismock/group_data_statis')
    if (result.data.errcode === 0) {
      const statusData: any[] = result.data.data
      statusData.map(item => (item.key = item.name))

      this.setState({ dataTotal: statusData })
    }
  }

  render() {
    const { count, status, dataTotal } = this.state

    return (
      <div className="g-statistic">
        <div className="content">
          <h2 className="title">系统状况</h2>
          <div className="system-content">
            <StatusOverview data={status} />
          </div>
          <h2 className="title">数据统计</h2>
          <div>
            <CountOverview date={count} />
            <StatTable dataSource={dataTotal} />
            <StatChart />
          </div>
        </div>
      </div>
    )
  }
}

const states = () => ({ /* noop */ })
const actions = {
  setBreadcrumb,
}

export default connect(states, actions)(StatisticPage)
