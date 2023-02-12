import { QuestionCircleOutlined } from '@ant-design/icons'
import { Table, Button, message, Popconfirm, Tooltip } from 'antd'
import axios from 'axios'
import PropTypes from 'prop-types'
import React, { Component } from 'react'
import { connect } from 'react-redux'
import { withRouter } from 'react-router-dom'

import { AnyFunc } from '@/types'

import { json5_parse, formatTime } from '../../../../../common'
import cons from '../../../../../cons'
import { fetchMockCol } from '../../../../../reducer/modules/mockCol'

import CaseDesModal from './CaseDesModal'

type PropTypes = {
  list?: any[]
  currInterface?: any
  match?: any
  fetchMockCol?: AnyFunc
  currProject?: any
}

type StateTypes = {
  caseData: Record<string, any>
  caseDesModalVisible: boolean
  isAdd: boolean
}

class MockCol extends Component<PropTypes, StateTypes> {
  // saveFormRef: RefObject<typeof CaseDesModal>

  state: StateTypes = {
    caseData: {},
    caseDesModalVisible: false,
    isAdd: false,
  }

  // constructor(props: PropTypes) {
  // super(props)
  // this.saveFormRef = createRef()
  // }

  componentDidMount() {
    const interfaceId = this.props.match.params.actionId
    this.props.fetchMockCol(interfaceId)
  }

  openModal =
    (record: any, isAdd = false) =>
    async () => {
      if (this.props.currInterface.res_body_is_json_schema && isAdd) {
        const result = await axios.post('/api/interface/schema2json', {
          schema: json5_parse(this.props.currInterface.res_body),
          required: true,
        })
        record.res_body = JSON.stringify(result.data)
      }
      // 参数过滤schema形式
      if (this.props.currInterface.req_body_is_json_schema) {
        const result = await axios.post('/api/interface/schema2json', {
          schema: json5_parse(this.props.currInterface.req_body_other),
          required: true,
        })
        record.req_body_other = JSON.stringify(result.data)
      }

      this.setState({
        isAdd: isAdd,
        caseDesModalVisible: true,
        caseData: record,
      })
    }

  handleOk = async (caseData: any): Promise<void> => {
    if (!caseData) {
      return null
    }
    const { caseData: curCase } = this.state
    const interface_id = this.props.match.params.actionId
    const project_id = this.props.match.params.id
    caseData = {
      ...caseData,
      interface_id: interface_id,
      project_id: project_id,
    }
    if (!this.state.isAdd) {
      caseData.id = curCase._id
    }
    await axios.post('/api/advmock/case/save', caseData).then(async res => {
      if (res.data.errcode === 0) {
        message.success(this.state.isAdd ? '添加成功' : '保存成功')
        await this.props.fetchMockCol(interface_id)
        this.setState({ caseDesModalVisible: false })
      } else {
        message.error(res.data.errmsg)
      }
    })
  }

  deleteCase = async (id: number) => {
    const interface_id = this.props.match.params.actionId
    await axios.post('/api/advmock/case/del', { id }).then(async res => {
      if (res.data.errcode === 0) {
        message.success('删除成功')
        await this.props.fetchMockCol(interface_id)
      } else {
        message.error(res.data.errmsg)
      }
    })
  }

  // mock case 可以设置开启的关闭
  openMockCase = async (id: number, enable = true) => {
    const interface_id = this.props.match.params.actionId

    await axios
      .post('/api/advmock/case/hide', {
        id,
        enable: !enable,
      })
      .then(async res => {
        if (res.data.errcode === 0) {
          message.success('修改成功')
          await this.props.fetchMockCol(interface_id)
        } else {
          message.error(res.data.errmsg)
        }
      })
  }

  render() {
    const { list: data, currInterface } = this.props
    const { isAdd, caseData, caseDesModalVisible } = this.state

    const role = this.props.currProject.role
    const isGuest = role === 'guest'
    const initCaseData = {
      ip: '',
      ip_enable: false,
      name: currInterface.title,
      code: '200',
      delay: 0,
      headers: [{ name: '', value: '' }],
      params: {},
      res_body: currInterface.res_body,
    }

    let ipFilters = []
    const ipObj: Record<string, any> = {}
    let userFilters = []
    const userObj: Record<string, any> = {}
    if (Array.isArray(data)) {
      data.forEach(item => {
        ipObj[item.ip_enable ? item.ip : ''] = ''
        userObj[item.username] = ''
      })
    }

    ipFilters = Object.keys(Object.assign(ipObj)).map(value => {
      if (!value) {
        value = '无过滤'
      }
      return { text: value, value }
    })
    userFilters = Object.keys(Object.assign(userObj)).map(value => ({ text: value, value }))
    const columns = [
      {
        title: '期望名称',
        dataIndex: 'name',
        key: 'name',
      },
      {
        title: 'ip',
        dataIndex: 'ip',
        key: 'ip',
        render: (text: string, recode: Record<string, any>) => {
          if (!recode.ip_enable) {
            text = ''
          }
          return text
        },
        onFilter: (value: string, record: any) =>
          (record.ip === value && record.ip_enable) || (value === '无过滤' && !record.ip_enable),
        filters: ipFilters,
      },
      {
        title: '创建人',
        dataIndex: 'username',
        key: 'username',
        onFilter: (value: string, record: any) => record.username === value,
        filters: userFilters,
      },
      {
        title: '编辑时间',
        dataIndex: 'up_time',
        key: 'up_time',
        render: (text: string) => formatTime(text),
      },
      {
        title: '操作',
        dataIndex: '_id',
        key: '_id',
        render: (_id: number, recode: any) =>
          // console.log(recode)
          !isGuest && (
            <div>
              <span style={{ marginRight: 5 }}>
                <Button size="small" onClick={this.openModal(recode)}>
                  编辑
                </Button>
              </span>
              <span style={{ marginRight: 5 }}>
                <Popconfirm
                  title="你确定要删除这条期望?"
                  onConfirm={() => this.deleteCase(_id)}
                  okText="确定"
                  cancelText="取消"
                >
                  <Button size="small">删除</Button>
                </Popconfirm>
              </span>
              <span>
                <Button size="small" onClick={() => this.openMockCase(_id, recode.case_enable)}>
                  {recode.case_enable ? <span>已开启</span> : <span>未开启</span>}
                </Button>
              </span>
            </div>
          ),
      },
    ]

    return (
      <div>
        <div style={{ marginBottom: 8 }}>
          <Button type="primary" onClick={this.openModal(initCaseData, true)} disabled={isGuest}>
            添加期望
          </Button>
          <a
            target="_blank"
            rel="noopener noreferrer"
            href={cons.docHref.adv_mock_case}
            style={{ marginLeft: 8 }}
          >
            <Tooltip title="点击查看文档">
              <QuestionCircleOutlined />
            </Tooltip>
          </a>
        </div>
        <Table columns={columns} dataSource={data} pagination={false} rowKey="_id" />
        {caseDesModalVisible && (
          <CaseDesModal
            visible={caseDesModalVisible}
            isAdd={isAdd}
            caseData={caseData}
            onOk={this.handleOk}
            onCancel={() => this.setState({ caseDesModalVisible: false })}
          />
          // ref={this.saveFormRef}
        )}
      </div>
    )
  }
}

const states = (state: any) => ({
  list: state.mockCol.list,
  currInterface: state.inter.curdata,
  currProject: state.project.currProject,
})

const actions = {
  fetchMockCol,
}

export default connect(states, actions)(withRouter(MockCol as any)) as any as typeof MockCol
