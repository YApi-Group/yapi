import {
  CheckCircleOutlined,
  ExclamationCircleFilled,
  InfoCircleOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons'
import { Tooltip, Input, Button, Row, Col, Spin, Modal, message, Select, Switch } from 'antd'
import { ColumnType } from 'antd/lib/table'
import axios from 'axios'
import copy from 'copy-to-clipboard'
import produce from 'immer'
import PropTypes from 'prop-types'
import React, { createRef, PureComponent as Component, RefObject } from 'react'
import { connect } from 'react-redux'
import { withRouter, Link } from 'react-router-dom'
import _ from 'underscore'

import AceEditor from '@/components/AceEditor/AceEditor'
import CaseEnv from '@/components/CaseEnv'
import { initCrossRequest } from '@/components/Postman/CheckCrossInstall.js'
import { InsertCodeMap } from '@/components/Postman/Postman.js'
import plugin from '@/plugin.js'
import { AnyFunc } from '@/types.js'
import createContext from '@common/createContext'
import { handleParams, crossRequest, handleCurrDomain, checkNameIsExistInArray } from '@common/postmanLib.js'
import { handleParamsValue, json_parse, changeArrayToObject } from '@common/utils.js'

import Label from '../../../../components/Label/Label.js'
import {
  fetchInterfaceColList,
  fetchCaseList,
  setColData,
  fetchCaseEnvList,
} from '../../../../reducer/modules/interfaceCol'
import { getToken, getEnv } from '../../../../reducer/modules/project'

import CaseReport from './CaseReport'
import CaseTable from './CaseTable'

const Option = Select.Option

const defaultModalStyle = {
  top: 10,
}

type PropTypes = {
  match?: any
  interfaceColList?: any[]
  fetchInterfaceColList?: AnyFunc
  fetchCaseList?: AnyFunc
  setColData?: AnyFunc
  history?: any
  currCaseList?: any[]
  currColId?: number
  currCaseId?: number
  isShowCol?: boolean
  isRander?: boolean
  currProject?: any
  getToken?: AnyFunc
  token?: string
  curProjectRole?: string
  getEnv?: AnyFunc
  projectEnv?: any
  fetchCaseEnvList?: AnyFunc
  envList?: any[]
  curUid?: number
}

type StateTypes = {
  rows: any[]
  reports: { [K: string]: any }
  visible: boolean
  curCaseid: any
  hasPlugin: boolean
  advVisible: boolean
  curScript: string
  enableScript: boolean
  autoVisible: boolean
  mode: string
  email: boolean
  download: boolean
  currColEnvObj: { [K: string]: any }
  collapseKey: string
  commonSettingModalVisible: boolean
  commonSetting: {
    checkHttpCodeIs200: boolean
    checkResponseField: {
      name: string
      value: string
      enable: boolean
    }
    checkResponseSchema: boolean
    checkScript: {
      enable: boolean
      content: string
    }
  }
}

class InterfaceColContent extends Component<PropTypes, StateTypes> {
  reports: { [K: string]: any }
  records: { [K: string]: any }
  currColId: number

  _crossRequestInterval: NodeJS.Timeout
  
  aceEditorRef:RefObject<AceEditor> = createRef()
  // this.aceEditor = aceEditor

  constructor(props: PropTypes) {
    super(props)
    this.reports = {}
    this.records = {}
    this.state = {
      rows: [],
      reports: {},
      visible: false,
      curCaseid: null,
      hasPlugin: false,

      advVisible: false,
      curScript: '',
      enableScript: false,
      autoVisible: false,
      mode: 'html',
      email: false,
      download: false,
      currColEnvObj: {},
      collapseKey: '1',
      commonSettingModalVisible: false,
      commonSetting: {
        checkHttpCodeIs200: false,
        checkResponseField: {
          name: 'code',
          value: '0',
          enable: false,
        },
        checkResponseSchema: false,
        checkScript: {
          enable: false,
          content: '',
        },
      },
    }
  }

  async handleColIdChange(newColId: number | string) {
    this.props.setColData({
      currColId: Number(newColId),
      isShowCol: true,
      isRander: false,
    })

    const result = await this.props.fetchCaseList(newColId)
    if (result.payload.data.errcode === 0) {
      try {
        this.reports = JSON.parse(result.payload.data.colData.test_report)
      } catch (e) {
        console.error(e)
        this.reports = {}
      }
    
      this.setState({
        commonSetting: {
          ...this.state.commonSetting,
          ...result.payload.data.colData,
        },
      })
    }

    await this.props.fetchCaseList(newColId)
    await this.props.fetchCaseEnvList(newColId)
    this.changeCollapseClose()
    this.handleColdata(this.props.currCaseList)
  }

  async UNSAFE_componentWillMount() {
    const result = await this.props.fetchInterfaceColList(this.props.match.params.id)
    await this.props.getToken(this.props.match.params.id)
    let { currColId } = this.props
    const params = this.props.match.params
    const { actionId } = params
    currColId = Number(actionId) || result.payload.data.data[0]._id
    this.currColId = currColId
    // this.props.history.push('/project/' + params.id + '/interface/col/' + currColId);
    if (currColId && currColId !== 0) {
      await this.handleColIdChange(currColId)
    }

    this._crossRequestInterval = initCrossRequest((hasPlugin: boolean) => {
      this.setState({ hasPlugin: hasPlugin })
    })
  }

  componentWillUnmount() {
    clearInterval(this._crossRequestInterval)
  }

  // 更新分类简介
  handleChangeInterfaceCol = (desc: string, name: string) => {
    const params = {
      col_id: this.props.currColId,
      name: name,
      desc: desc,
    }

    axios.post('/api/col/up_col', params).then(async res => {
      if (res.data.errcode) {
        return message.error(res.data.errmsg)
      }
      const project_id = this.props.match.params.id
      await this.props.fetchInterfaceColList(project_id)
      message.success('接口集合简介更新成功')
    })
  }

  // 整合header信息
  handleReqHeader = (project_id: string, req_header: any[], case_env: any) => {
    const envItem = this.props.envList.find(item => item._id === project_id)

    const currDomain = handleCurrDomain(envItem && envItem.env, case_env)
    const header = currDomain.header
    for (const item of header) {
      if (!checkNameIsExistInArray(item.name, req_header)) {
        // item = { ...item, abled: true, }
        req_header.push({ ...item, abled: true })
      }
    }

    return req_header
  }

  handleColdata = (rows: any, currColEnvObj: any = {}) => {
    const newRows: any = produce(rows, (draftRows: any) => {
      draftRows.map((item: any) => {
        item.id = item._id
        item._test_status = item.test_status
        if (currColEnvObj[item.project_id]) {
          item.case_env = currColEnvObj[item.project_id]
        }
        item.req_headers = this.handleReqHeader(item.project_id, item.req_headers, item.case_env)
        return item
      })
    })

    this.setState({ rows: newRows })
  }

  executeTests = async () => {
    for (let i = 0, l = this.state.rows.length, newRows, curitem; i < l; i++) {
      const { rows } = this.state

      const envItem = _.find(this.props.envList, item => item._id === rows[i].project_id)

      curitem = {

        ...rows[i],
        env: envItem.env,
        pre_script: this.props.currProject.pre_script,
        after_script: this.props.currProject.after_script,
        test_status: 'loading',
      }
      newRows = [].concat([], rows)
      newRows[i] = curitem
      this.setState({ rows: newRows })
      let status = 'error',
        result
      try {
        result = await this.handleTest(curitem)

        if (result.code === 400) {
          status = 'error'
        } else if (result.code === 0) {
          status = 'ok'
        } else if (result.code === 1) {
          status = 'invalid'
        }
      } catch (e) {
        console.error(e)
        status = 'error'
        result = e
      }

      // result.body = result.data;
      this.reports[curitem._id] = result
      this.records[curitem._id] = {
        status: result.status,
        params: result.params,
        body: result.res_body,
      }

      curitem = { ...rows[i], test_status: status }
      newRows = [].concat([], rows)
      newRows[i] = curitem
      this.setState({ rows: newRows })
    }
    await axios.post('/api/col/up_col', {
      col_id: this.props.currColId,
      test_report: JSON.stringify(this.reports),
    })
  }

  handleTest = async (interfaceData: any) => {
    let requestParams = {}
    const options:any = handleParams(interfaceData, this.handleValue, requestParams)

    let result:any = {
      code: 400,
      msg: '数据异常',
      validRes: [] as any,
    }

    await plugin.emitHook('before_col_request', {
      ...options,
      type: 'col',
      caseId: options.caseId,
      projectId: interfaceData.project_id,
      interfaceId: interfaceData.interface_id,
    })

    try {
      const data = await crossRequest(options, interfaceData.pre_script, interfaceData.after_script, createContext(
        this.props.curUid,
        this.props.match.params.id,
        interfaceData.interface_id,
      ))
      options.taskId = this.props.curUid

      data.res.body = json_parse(data.res.body)
      const res = data.res.body 

      result = {
        ...options,
        ...result,
        res_header: data.res.header,
        res_body: res,
        status: data.res.status,
        statusText: data.res.statusText,
      }

      await plugin.emitHook('after_col_request', result, {
        type: 'col',
        caseId: options.caseId,
        projectId: interfaceData.project_id,
        interfaceId: interfaceData.interface_id,
      })

      if (options.data && typeof options.data === 'object') {
        requestParams = {
          ...requestParams,
          ...options.data,
        }
      }

      const validRes:any[] = []

      const responseData = {

        status: data.res.status,
        body: res,
        header: data.res.header,
        statusText: data.res.statusText,
      }

      // 断言测试
      await this.handleScriptTest(interfaceData, responseData, validRes, requestParams)

      if (validRes.length === 0) {
        result.code = 0
        result.validRes = [{ message: '验证通过' }]
      } else if (validRes.length > 0) {
        result.code = 1
        result.validRes = validRes
      }
    } catch (data) {
      result = {
        ...options,
        ...result,
        res_header: data.header,
        res_body: data.body || data.message,
        status: 0,
        statusText: data.message,
        code: 400,
        validRes: [
          {
            message: data.message,
          },
        ],
      }
    }

    result.params = requestParams
    return result
  }

  // response, validRes
  // 断言测试
  handleScriptTest = async (interfaceData:any, response:any, validRes:any[], requestParams:any) => {
    // 是否启动断言
    try {
      const test = await axios.post('/api/col/run_script', {
        response: response,
        records: this.records,
        script: interfaceData.test_script,
        params: requestParams,
        col_id: this.props.currColId,
        interface_id: interfaceData.interface_id,
      })
      if (test.data.errcode !== 0) {
        test.data.data.logs.forEach((item: string) => {
          validRes.push({ message: item })
        })
      }
    } catch (err) {
      validRes.push({
        message: 'Error: ' + err.message,
      })
    }
  }

  handleValue = (val:any, global:any) => {
    const globalValue = changeArrayToObject(global)
    const context = { global: globalValue, ...this.records }
    return handleParamsValue(val, context)
  }

  onSortEnd = (newRows: any[]) => {
    this.setState({ rows: newRows })

    const changes = newRows.map((item, index) => ({ id: item._id, index: index }))    
    // console.log(changes)
    axios.post('/api/col/up_case_index', changes).then(() => {
      this.props.fetchInterfaceColList(this.props.match.params.id)
    })
  }

  onChangeTest = (d:any) => {
    this.setState({
      commonSetting: {
        ...this.state.commonSetting,
        checkScript: {
          ...this.state.commonSetting.checkScript,
          content: d.text,
        },
      },
    })
  }

  handleInsertCode = (code:string) => {
    this.aceEditorRef.current.editor.insertCode(code)
  }

  UNSAFE_componentWillReceiveProps(nextProps: PropTypes) {
    const newColId = !isNaN(nextProps.match.params.actionId) ? Number(nextProps.match.params.actionId) : 0

    if ((newColId && this.currColId && newColId !== this.currColId) || nextProps.isRander) {
      this.currColId = newColId
      this.handleColIdChange(newColId)
    }
  }

  // 测试用例环境面板折叠
  changeCollapseClose = (key?: string) => {
    if (key) {
      this.setState({
        collapseKey: key,
      })
    } else {
      this.setState({
        collapseKey: '1',
        currColEnvObj: {},
      })
    }
  }

  openReport = (id:number) => {
    if (!this.reports[id]) {
      return message.warn('还没有生成报告')
    }
    this.setState({ visible: true, curCaseid: id })
  }

  openAdv = (id: number) => {
    const findCase = _.find(this.props.currCaseList, item => item.id === id)

    this.setState({
      enableScript: findCase.enable_script,
      curScript: findCase.test_script,
      advVisible: true,
      curCaseid: id,
    })
  }

  handleScriptChange = (d:any) => {
    this.setState({ curScript: d.text })
  }

  handleAdvCancel = () => {
    this.setState({ advVisible: false })
  }

  handleAdvOk = async () => {
    const { curCaseid, enableScript, curScript } = this.state
    const res = await axios.post('/api/col/up_case', {
      id: curCaseid,
      test_script: curScript,
      enable_script: enableScript,
    })
    if (res.data.errcode === 0) {
      message.success('更新成功')
    }
    this.setState({ advVisible: false })
    const currColId = this.currColId
    this.props.setColData({
      currColId: Number(currColId),
      isShowCol: true,
      isRander: false,
    })
    await this.props.fetchCaseList(currColId)

    this.handleColdata(this.props.currCaseList)
  }

  handleCancel = () => {
    this.setState({ visible: false })
  }

  currProjectEnvChange = (envName: string, project_id: string) => {
    const currColEnvObj = {
      ...this.state.currColEnvObj,
      [project_id]: envName,
    }
    this.setState({ currColEnvObj })
    // this.handleColdata(this.props.currCaseList, envName, project_id);
    this.handleColdata(this.props.currCaseList, currColEnvObj)
  }

  autoTests = () => {
    this.setState({ autoVisible: true, currColEnvObj: {}, collapseKey: '' })
  }

  handleAuto = () => {
    this.setState({
      autoVisible: false,
      email: false,
      download: false,
      mode: 'html',
      currColEnvObj: {},
      collapseKey: '',
    })
  }

  copyUrl = (url:string) => {
    copy(url, { format: 'text/plain' })
    message.success('已经成功复制到剪切板')
  }

  modeChange = (mode:string) => {
    this.setState({ mode })
  }

  emailChange = (email: boolean) => {
    this.setState({ email })
  }

  downloadChange = (download: boolean) => {
    this.setState({ download })
  }

  handleColEnvObj = (envObj: any) => {
    let str = ''
    for (const [k, v] of Object.entries(envObj)) {
      str += v ? `&env_${k}=${v}` : ''
    }
    return str
  }

  handleCommonSetting = () => {
    const setting = this.state.commonSetting

    const params = {
      col_id: this.props.currColId,
      ...setting,

    }
    console.log(params)

    axios.post('/api/col/up_col', params)
      .then(res => {
        if (res.data.errcode) {
          return message.error(res.data.errmsg)
        }
        message.success('配置测试集成功')
      })

    this.setState({
      commonSettingModalVisible: false,
    })
  }

  cancelCommonSetting = () => {
    this.setState({
      commonSettingModalVisible: false,
    })
  }

  openCommonSetting = () => {
    this.setState({
      commonSettingModalVisible: true,
    })
  }

  changeCommonFieldSetting = (key:string) => (e: any) => {
    let value = e
    if (typeof e === 'object' && e) {
      value = e.target.value
    }
    const { checkResponseField } = this.state.commonSetting
    this.setState({
      commonSetting: {
        ...this.state.commonSetting,
        checkResponseField: {
          ...checkResponseField,
          [key]: value,
        },
      },
    })
  }

  render() {
    const currProjectId = this.props.currProject._id
    const columns: ColumnType<any>[] = [
      {
        dataIndex: 'casename',
        title: '用例名称',
        render: (text:string, record:any) => (
          <Link to={'/project/' + currProjectId + '/interface/case/' + record._id}>
            {record.casename.length > 23
              ? record.casename.substr(0, 20) + '...'
              : record.casename}
          </Link>
        ),
      },
      {
        dataIndex: 'key',
        title: () => (
          <Tooltip
            title={
              <span>
                {' '}
                    每个用例都有唯一的key，用于获取所匹配接口的响应数据，例如使用{' '}
                <a
                  href="https://hellosean1025.github.io/yapi/documents/case.html#%E7%AC%AC%E4%BA%8C%E6%AD%A5%EF%BC%8C%E7%BC%96%E8%BE%91%E6%B5%8B%E8%AF%95%E7%94%A8%E4%BE%8B"
                  className="link-tooltip"
                  target="blank"
                >
                  {' '}
                      变量参数{' '}
                </a>{' '}
                    功能{' '}
              </span>
            }
          >
                Key
          </Tooltip>
        ),
        render: (value:any, record:any) => <span>{record._id}</span>,
      },
      {
        dataIndex: 'test_status',
        title: '状态',
        render: (value:any, rowData :any) => {
          const id = rowData._id
          const code = this.reports[id] ? this.reports[id].code : 0
          if (rowData.test_status === 'loading') {
            return (
              <div>
                <Spin />
              </div>
            )
          }

          switch (code) {
            case 0:
              return (
                <div>
                  <Tooltip title="Pass">
                    <CheckCircleOutlined style={{ color: '#00a854' }} />
                  </Tooltip>
                </div>
              )
            case 400:
              return (
                <div>
                  <Tooltip title="请求异常">
                    <InfoCircleOutlined style={{ color: '#f04134' }} />
                  </Tooltip>
                </div>
              )
            case 1:
              return (
                <div>
                  <Tooltip title="验证失败">
                    <ExclamationCircleFilled style={{ color: '#ffbf00' }} />
                  </Tooltip>
                </div>
              )
            default:
              return (
                <div>
                  <CheckCircleOutlined style={{ color: '#00a854' }} />
                </div>
              )
          }
        },
      },
      {
        dataIndex: 'path',
        title: '接口路径',
        render: (text:string, record:any) => (
          <Tooltip title="跳转到对应接口">
            <Link to={`/project/${record.project_id}/interface/api/${record.interface_id}`}>
              {record.path.length > 23 ? record.path + '...' : record.path}
            </Link>
          </Tooltip>
        ),
      },
      {
        dataIndex: 'report',
        title: '测试报告',
        render: (text:string, rowData :any) => {
          const reportFun = () => {
            if (!this.reports[rowData.id]) {
              return null
            }
            return <Button onClick={() => this.openReport(rowData.id)}>测试报告</Button>
          }
          return <div className="interface-col-table-action">{reportFun()}</div>
        },
      },
    ]

    const { rows } = this.state
    // console.log(rows)

    const localUrl
      = location.protocol
      + '//'
      + location.hostname
      + (location.port !== '' ? ':' + location.port : '')
    const currColEnvObj = this.handleColEnvObj(this.state.currColEnvObj)
    const autoTestsUrl = `/api/open/run_auto_test?id=${this.props.currColId}&token=${this.props.token
    }${currColEnvObj ? currColEnvObj : ''}&mode=${this.state.mode}&email=${this.state.email
    }&download=${this.state.download}`

    let col_name = ''
    let col_desc = ''

    for (let i = 0; i < this.props.interfaceColList.length; i++) {
      if (this.props.interfaceColList[i]._id === this.props.currColId) {
        col_name = this.props.interfaceColList[i].name
        col_desc = this.props.interfaceColList[i].desc
        break
      }
    }

    return (
      <div className="interface-col">
        <Modal
          title="通用规则配置"
          visible={this.state.commonSettingModalVisible}
          onOk={this.handleCommonSetting}
          onCancel={this.cancelCommonSetting}
          width={'1000px'}
          style={defaultModalStyle}
        >
          <div className="common-setting-modal">
            <Row className="setting-item">
              <Col className="col-item" span="4">
                <label>检查HttpCode:&nbsp;<Tooltip title={'检查 http code 是否为 200'}>
                  <QuestionCircleOutlined style={{ width: '10px' }} />
                </Tooltip></label>
              </Col>
              <Col className="col-item" span="18">
                <Switch onChange={e => {
                  const { commonSetting } = this.state
                  this.setState({
                    commonSetting: {
                      ...commonSetting,
                      checkHttpCodeIs200: e,
                    },
                  })
                }} checked={this.state.commonSetting.checkHttpCodeIs200} checkedChildren="开" unCheckedChildren="关" />
              </Col>
            </Row>

            <Row className="setting-item">
              <Col className="col-item" span="4">
                <label>检查返回json:&nbsp;<Tooltip title={'检查接口返回数据字段值，比如检查 code 是不是等于 0'}>
                  <QuestionCircleOutlined style={{ width: '10px' }} />
                </Tooltip></label>
              </Col>
              <Col className="col-item" span="6">
                <Input value={this.state.commonSetting.checkResponseField.name} onChange={this.changeCommonFieldSetting('name')} placeholder="字段名" />
              </Col>
              <Col className="col-item" span="6">
                <Input onChange={this.changeCommonFieldSetting('value')} value={this.state.commonSetting.checkResponseField.value} placeholder="值" />
              </Col>
              <Col className="col-item" span="6">
                <Switch onChange={this.changeCommonFieldSetting('enable')} checked={this.state.commonSetting.checkResponseField.enable} checkedChildren="开" unCheckedChildren="关" />
              </Col>
            </Row>

            <Row className="setting-item">
              <Col className="col-item" span="4">
                <label>检查返回数据结构:&nbsp;<Tooltip title={'只有 response 基于 json-schema 方式定义，该检查才会生效'}>
                  <QuestionCircleOutlined style={{ width: '10px' }} />
                </Tooltip></label>
              </Col>
              <Col className="col-item" span="18">
                <Switch onChange={e => {
                  const { commonSetting } = this.state
                  this.setState({
                    commonSetting: {
                      ...commonSetting,
                      checkResponseSchema: e,
                    },
                  })
                }} checked={this.state.commonSetting.checkResponseSchema} checkedChildren="开" unCheckedChildren="关" />
              </Col>
            </Row>

            <Row className="setting-item">
              <Col className="col-item  " span="4">
                <label>全局测试脚本:&nbsp;<Tooltip title={'在跑自动化测试时，优先调用全局脚本，只有全局脚本通过测试，才会开始跑case自定义的测试脚本'}>
                  <QuestionCircleOutlined style={{ width: '10px' }} />
                </Tooltip></label>
              </Col>
              <Col className="col-item" span="14">
                <div><Switch onChange={e => {
                  const { commonSetting } = this.state
                  this.setState({
                    commonSetting: {
                      ...commonSetting,
                      checkScript: {
                        ...this.state.commonSetting.checkScript,
                        enable: e,
                      },
                    },
                  })
                }} checked={this.state.commonSetting.checkScript.enable} checkedChildren="开" unCheckedChildren="关" /></div>
                <AceEditor
                  onChange={this.onChangeTest}
                  className="case-script"
                  data={this.state.commonSetting.checkScript.content}
                  ref={this.aceEditorRef}
                />
              </Col>
              <Col span="6">
                <div className="insert-code">
                  {InsertCodeMap.map(item => (
                    <div
                      style={{ cursor: 'pointer' }}
                      className="code-item"
                      key={item.title}
                      onClick={() => {
                        this.handleInsertCode('\n' + item.code)
                      }}
                    >
                      {item.title}
                    </div>
                  ))}
                </div>
              </Col>
            </Row>

          </div>
        </Modal>
        <Row justify="center" align="top">
          <Col span={5}>
            <h2
              className="interface-title"
              style={{
                display: 'inline-block',
                margin: '8px 20px 16px 0px',
              }}
            >
              测试集合&nbsp;<a
                target="_blank"
                rel="noopener noreferrer"
                href="https://hellosean1025.github.io/yapi/documents/case.html"
              >
                <Tooltip title="点击查看文档">
                  <QuestionCircleOutlined />
                </Tooltip>
              </a>
            </h2>
          </Col>
          <Col span={10}>
            <CaseEnv
              envList={this.props.envList}
              currProjectEnvChange={this.currProjectEnvChange}
              envValue={this.state.currColEnvObj}
              collapseKey={this.state.collapseKey}
              changeClose={this.changeCollapseClose}
            />
          </Col>
          <Col span={9}>
            {this.state.hasPlugin ? (
              <div
                style={{
                  float: 'right',
                  paddingTop: '8px',
                }}
              >
                {this.props.curProjectRole !== 'guest' && (
                  <Tooltip title="在 YApi 服务端跑自动化测试，测试环境不能为私有网络，请确保 YApi 服务器可以访问到自动化测试环境domain">
                    <Button
                      style={{
                        marginRight: '8px',
                      }}
                      onClick={this.autoTests}
                    >
                      服务端测试
                    </Button>
                  </Tooltip>
                )}
                <Button onClick={this.openCommonSetting} style={{
                  marginRight: '8px',
                }} >通用规则配置</Button>
                &nbsp;
                <Button type="primary" onClick={this.executeTests}>
                  开始测试
                </Button>
              </div>
            ) : (
              <Tooltip title="请安装 cross-request Chrome 插件">
                <Button
                  disabled
                  type="primary"
                  style={{
                    float: 'right',
                    marginTop: '8px',
                  }}
                >
                  开始测试
                </Button>
              </Tooltip>
            )}
          </Col>
        </Row>

        <div className="component-label-wrapper">
          <Label onChange={(val:any) => this.handleChangeInterfaceCol(val, col_name)} desc={col_desc} />
        </div>

        {/* <Table
          rowKey="id"
          columns={columns}
          dataSource={rows}
        /> */}

        <CaseTable 
          rowKey="id"
          columns={columns}
          dataSource={rows}        
          onSortEnd={this.onSortEnd}
        />

        <Modal
          title="测试报告"
          width="900px"
          style={{
            minHeight: '500px',
          }}
          visible={this.state.visible}
          onCancel={this.handleCancel}
          footer={null}
        >
          <CaseReport {...this.reports[this.state.curCaseid]} />
        </Modal>

        <Modal
          title="自定义测试脚本"
          width="660px"
          style={{
            minHeight: '500px',
          }}
          visible={this.state.advVisible}
          onCancel={this.handleAdvCancel}
          onOk={this.handleAdvOk}
          maskClosable={false}
        >
          <h3>
            是否开启:&nbsp;
            <Switch
              checked={this.state.enableScript}
              onChange={e => this.setState({ enableScript: e })}
            />
          </h3>
          <AceEditor
            className="case-script"
            data={this.state.curScript}
            onChange={this.handleScriptChange}
          />
        </Modal>
        {this.state.autoVisible && (
          <Modal
            title="服务端自动化测试"
            width="780px"
            style={{
              minHeight: '500px',
            }}
            visible={this.state.autoVisible}
            onCancel={this.handleAuto}
            className="autoTestsModal"
            footer={null}
          >
            <Row justify="space-around" className="row" align="top">
              <Col span={3} className="label" style={{ paddingTop: '16px' }}>
                选择环境
                <Tooltip title="默认使用测试用例选择的环境">
                  <QuestionCircleOutlined />
                </Tooltip>
                &nbsp;：
              </Col>
              <Col span={21}>
                <CaseEnv
                  envList={this.props.envList}
                  currProjectEnvChange={this.currProjectEnvChange}
                  envValue={this.state.currColEnvObj}
                  collapseKey={this.state.collapseKey}
                  changeClose={this.changeCollapseClose}
                />
              </Col>
            </Row>
            <Row justify="space-around" className="row" align="middle">
              <Col span={3} className="label">
                输出格式：
              </Col>
              <Col span={21}>
                <Select value={this.state.mode} onChange={this.modeChange}>
                  <Option key="html" value="html">
                    html
                  </Option>
                  <Option key="json" value="json">
                    json
                  </Option>
                </Select>
              </Col>
            </Row>
            <Row justify="space-around" className="row" align="middle">
              <Col span={3} className="label">
                消息通知
                <Tooltip title={'测试不通过时，会给项目组成员发送消息通知'}>
                  <QuestionCircleOutlined style={{ width: '10px' }} />
                </Tooltip>
                &nbsp;：
              </Col>
              <Col span={21}>
                <Switch
                  checked={this.state.email}
                  checkedChildren="开"
                  unCheckedChildren="关"
                  onChange={this.emailChange}
                />
              </Col>
            </Row>
            <Row justify="space-around" className="row" align="middle">
              <Col span={3} className="label">
                下载数据
                <Tooltip title={'开启后，测试数据将被下载到本地'}>
                  <QuestionCircleOutlined style={{ width: '10px' }} />
                </Tooltip>
                &nbsp;：
              </Col>
              <Col span={21}>
                <Switch
                  checked={this.state.download}
                  checkedChildren="开"
                  unCheckedChildren="关"
                  onChange={this.downloadChange}
                />
              </Col>
            </Row>
            <Row justify="space-around" className="row" align="middle">
              <Col span={21} className="autoTestUrl">
                <a
                  target="_blank"
                  rel="noopener noreferrer"
                  href={localUrl + autoTestsUrl} >
                  {autoTestsUrl}
                </a>
              </Col>
              <Col span={3}>
                <Button className="copy-btn" onClick={() => this.copyUrl(localUrl + autoTestsUrl)}>
                  复制
                </Button>
              </Col>
            </Row>
            <div className="autoTestMsg">
              注：访问该URL，可以测试所有用例，请确保YApi服务器可以访问到环境配置的 domain
            </div>
          </Modal>
        )}
      </div>
    )
  }
}

const states = (state: any) => ({
  interfaceColList: state.interfaceCol.interfaceColList,
  currColId: state.interfaceCol.currColId,
  currCaseId: state.interfaceCol.currCaseId,
  isShowCol: state.interfaceCol.isShowCol,
  isRander: state.interfaceCol.isRander,
  currCaseList: state.interfaceCol.currCaseList,
  currProject: state.project.currProject,
  token: state.project.token,
  envList: state.interfaceCol.envList,
  curProjectRole: state.project.currProject.role,
  projectEnv: state.project.projectEnv,
  curUid: state.user.uid,
})
const actions = {
  fetchInterfaceColList,
  fetchCaseList,
  setColData,
  getToken,
  getEnv,
  fetchCaseEnvList,
}

export default connect(states, actions)(withRouter(InterfaceColContent as any)) as any as typeof InterfaceColContent
