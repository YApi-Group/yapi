import { DeleteOutlined, QuestionCircleOutlined, PlusOutlined } from '@ant-design/icons'
import { Layout, Tooltip, message, Row, Popconfirm } from 'antd'
import PropTypes from 'prop-types'
import React, { Component } from 'react'
import { connect } from 'react-redux'

import { NameValueStr, EnvPart, ProjectGetData } from '@/ajax/ProjectGet'
import { AnyFunc } from '@/types'

import EasyDragSort from '../../../../components/EasyDragSort/EasyDragSort.js'
import { updateEnv, getProject, getEnv } from '../../../../reducer/modules/project'

import ProjectEnvContent from './ProjectEnvContent'
import styles from './index.module.less'

import './index.scss'

const { Content, Sider } = Layout

type PropTypes = {
  projectId?: number
  updateEnv?: AnyFunc
  getProject?: AnyFunc
  currProject?: ProjectGetData
  onOk?: AnyFunc
  getEnv?: AnyFunc
}

type StateTypes = {
  env: EnvPart[]
  _id: number
  currentEnvMsg: EnvPart
  delIcon: string
  currentKey: number
}

class ProjectEnv extends Component<PropTypes, StateTypes> {
  _isMounted = false

  constructor(props: PropTypes) {
    super(props)

    this.state = {
      env: [] as EnvPart[],
      _id: null,
      currentEnvMsg: { name: '', domain: '' },
      delIcon: null,
      currentKey: -2,
    }
  }

  initState(curdata: EnvPart[], id: number) {
    this.setState({
      ...this.state,

      env: curdata.slice(),
      _id: id,
    })
  }

  async UNSAFE_componentWillMount() {
    this._isMounted = true
    await this.props.getProject(this.props.projectId)
    const { env, _id } = this.props.currProject
    this.initState(env, _id)
    this.handleClick(0, env[0])
  }

  componentWillUnmount() {
    this._isMounted = false
  }

  handleClick = (key: number, data: EnvPart) => {
    // console.log(key, data)
    this.setState({
      currentKey: key,
      currentEnvMsg: data,
    })
  }

  // 增加环境变量项
  addEnvParams = () => {
    const data: EnvPart = { name: '新环境', domain: '', header: [] as NameValueStr[] }

    this.setState({
      env: [data].concat(this.state.env),
    })
    this.handleClick(0, data)
  }

  // 删除提示信息
  showConfirm(key: number) {
    const assignValue = this.delParams(key)
    this.onSave(assignValue)
  }

  // 删除环境变量项
  delParams = (key: number) => {
    const curValue = this.state.env

    const newValue = {
      _id: this.state._id,
      env: curValue.filter((val, index) => index !== key),
    }

    this.setState(newValue)
    this.handleClick(0, newValue.env[0])

    return newValue
  }

  // TODO debug 不显示
  enterItem = (key: any) => {
    this.setState({ delIcon: key })
  }

  // 保存设置
  async onSave(assignValue: any) {
    await this.props
      .updateEnv(assignValue)
      .then((res: any) => {
        if (res.payload.data.errcode === 0) {
          this.props.getProject(this.props.projectId)
          this.props.getEnv(this.props.projectId)
          message.success('修改成功! ')
          if (this._isMounted) {
            this.setState({ ...assignValue })
          }
        }
      })
      .catch(() => {
        message.error('环境设置不成功 ')
      })
  }

  //  提交保存信息
  onSubmit = (value: any, index: number) => {
    const assignValue = {
      env: [].concat(this.state.env),
      _id: this.state._id,
    }
    assignValue.env.splice(index, 1, value.env)

    this.onSave(assignValue)
    this.props.onOk && this.props.onOk(assignValue.env, index)
  }

  // 动态修改环境名称
  handleInputChange = (value: string, currentKey: number) => {
    const newValue = [].concat(this.state.env)
    newValue[currentKey].name = value || '新环境'
    this.setState({ env: newValue })
  }

  // 侧边栏拖拽
  handleDragMove = () => (data: any, from: any, to: any) => {
    const newValue = {
      _id: this.state._id,
      env: data,
    }
    this.setState(newValue)

    this.handleClick(to, newValue.env[to])
    this.onSave(newValue)
  }

  render() {
    const { env, currentKey } = this.state

    const envSettingItems = env.map((item, index) => (
      <Row
        key={index}
        className={'menu-item ' + (index === currentKey ? 'menu-item-checked' : '')}
        onClick={() => this.handleClick(index, item)}
        onMouseEnter={() => this.enterItem(index)}
      >
        <span className="env-icon-style">
          <span className="env-name" style={{ color: item.name === '新环境' && '#2395f1' }}>
            {item.name}
          </span>
          <Popconfirm
            title="您确认删除此环境变量?"
            onConfirm={e => {
              e.stopPropagation()
              this.showConfirm(index)
            }}
            okText="确定"
            cancelText="取消"
          >
            <DeleteOutlined
              className="interface-delete-icon"
              style={{
                display: this.state.delIcon === String(index) && env.length - 1 !== 0 ? 'block' : 'none',
              }}
            />
          </Popconfirm>
        </span>
      </Row>
    ))

    return (
      <div className="m-env-panel">
        <Layout className="project-env">
          <Sider width={195} style={{ background: '#fff' }}>
            <div style={{ height: '100%', borderRight: 0 }}>
              <Row className={styles.envAddDiv}>
                <Tooltip placement="top" title="在这里添加项目的环境配置">
                  环境列表&nbsp;
                  <QuestionCircleOutlined />
                </Tooltip>

                <Tooltip title="添加环境变量">
                  <PlusOutlined onClick={() => this.addEnvParams()} />
                </Tooltip>
              </Row>

              <EasyDragSort data={() => env} onChange={this.handleDragMove()}>
                {envSettingItems}
              </EasyDragSort>
            </div>
          </Sider>

          <Layout className="env-content">
            <Content style={{ background: '#fff', padding: 24, margin: 0, minHeight: 280 }}>
              <ProjectEnvContent
                key={this.state.currentEnvMsg._id + this.state.currentEnvMsg.name}
                projectMsg={this.state.currentEnvMsg}
                onSubmit={e => this.onSubmit(e, currentKey)}
                handleEnvInput={e => this.handleInputChange(e, currentKey)}
              />
            </Content>
          </Layout>
        </Layout>
      </div>
    )
  }
}

const states = (state: any) => ({
  currProject: state.project.currProject,
})
const actions = {
  updateEnv,
  getProject,
  getEnv,
}

export default connect(states, actions)(ProjectEnv)
