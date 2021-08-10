import { DeleteOutlined, QuestionCircleOutlined, PlusOutlined } from '@ant-design/icons'
import { Layout, Tooltip, message, Row, Popconfirm } from 'antd'
import PropTypes from 'prop-types'
import React, { Component } from 'react'
import { connect } from 'react-redux'

import EasyDragSort from '../../../../components/EasyDragSort/EasyDragSort.js'
import { updateEnv, getProject, getEnv } from '../../../../reducer/modules/project'

import ProjectEnvContent from './ProjectEnvContent.js'

import './index.scss'

const { Content, Sider } = Layout

@connect(
  state => ({
    projectMsg: state.project.currProject,
  }),
  {
    updateEnv,
    getProject,
    getEnv,
  },
)
class ProjectEnv extends Component {
  static propTypes = {
    projectId: PropTypes.number,
    updateEnv: PropTypes.func,
    getProject: PropTypes.func,
    projectMsg: PropTypes.object,
    onOk: PropTypes.func,
    getEnv: PropTypes.func,
  };

  constructor(props) {
    super(props)
    this.state = {
      env: [],
      _id: null,
      currentEnvMsg: {},
      delIcon: null,
      currentKey: -2,
    }
  }

  initState(curdata, id) {
    const newValue = {}
    newValue.env = [].concat(curdata)
    newValue._id = id
    this.setState({
      ...this.state,
      ...newValue,
    })
  }

  async UNSAFE_componentWillMount() {
    this._isMounted = true
    await this.props.getProject(this.props.projectId)
    const { env, _id } = this.props.projectMsg
    this.initState(env, _id)
    this.handleClick(0, env[0])
  }

  componentWillUnmount() {
    this._isMounted = false
  }

  handleClick = (key, data) => {
    this.setState({
      currentEnvMsg: data,
      currentKey: key,
    })
  };

  // 增加环境变量项
  addParams = (name, data) => {
    const newValue = {}
    data = { name: '新环境', domain: '', header: [] }
    newValue[name] = [].concat(data, this.state[name])
    this.setState(newValue)
    this.handleClick(0, data)
  };

  // 删除提示信息
  showConfirm(key, name) {
    const assignValue = this.delParams(key, name)
    this.onSave(assignValue)
  }

  // 删除环境变量项
  delParams = (key, name) => {
    const curValue = this.state.env
    const newValue = {}
    newValue[name] = curValue.filter((val, index) => index !== key)
    this.setState(newValue)
    this.handleClick(0, newValue[name][0])
    newValue._id = this.state._id
    return newValue
  };

  enterItem = key => {
    this.setState({ delIcon: key })
  };

  // 保存设置
  async onSave(assignValue) {
    await this.props
      .updateEnv(assignValue)
      .then(res => {
        if (res.payload.data.errcode == 0) {
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
  onSubmit = (value, index) => {
    const assignValue = {}
    assignValue.env = [].concat(this.state.env)
    assignValue.env.splice(index, 1, value.env)
    assignValue._id = this.state._id
    this.onSave(assignValue)
    this.props.onOk && this.props.onOk(assignValue.env, index)
  };

  // 动态修改环境名称
  handleInputChange = (value, currentKey) => {
    const newValue = [].concat(this.state.env)
    newValue[currentKey].name = value || '新环境'
    this.setState({ env: newValue })
  };

  // 侧边栏拖拽
  handleDragMove = name => (data, from, to) => {
    const newValue = {
      [name]: data,
    }
    this.setState(newValue)
    newValue._id = this.state._id
    this.handleClick(to, newValue[name][to])
    this.onSave(newValue)
  };

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
              this.showConfirm(index, 'env')
            }}
            okText="确定"
            cancelText="取消"
          >
            <DeleteOutlined
              className="interface-delete-icon"
              style={{
                display: this.state.delIcon == index && env.length - 1 !== 0 ? 'block' : 'none',
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
              <Row className="first-menu-item menu-item">
                <div className="env-icon-style">
                  <h3>
                    环境列表&nbsp;<Tooltip placement="top" title="在这里添加项目的环境配置">
                      <QuestionCircleOutlined />
                    </Tooltip>
                  </h3>
                  <Tooltip title="添加环境变量">
                    <PlusOutlined onClick={() => this.addParams('env')} />
                  </Tooltip>
                </div>
              </Row>
              <EasyDragSort data={() => env} onChange={this.handleDragMove('env')}>
                {envSettingItems}
              </EasyDragSort>
            </div>
          </Sider>
          <Layout className="env-content">
            <Content style={{ background: '#fff', padding: 24, margin: 0, minHeight: 280 }}>
              <ProjectEnvContent
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

export default ProjectEnv
