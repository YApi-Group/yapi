import { Tabs, Modal, Button } from 'antd'
import PropTypes from 'prop-types'
import React, { PureComponent as Component } from 'react'
import { connect } from 'react-redux'
import { Prompt } from 'react-router'
import { withRouter } from 'react-router-dom'

import plugin from '@/plugin'
import { AnyFunc } from '@/types'

import { fetchInterfaceData } from '../../../../reducer/modules/interface'

import Edit from './Edit'
import Run from './Run/Run'
import View from './View'
import styles from './ic.module.less'

const TabPane = Tabs.TabPane

type PropTypes = {
  match?: any
  list?: any[]
  curdata?: any
  fetchInterfaceData?: AnyFunc
  history?: any
  editStatus?: boolean
}

type StateTypes = {
  curTab: string
  visible: boolean
  nextTab: string
}

class Content extends Component<PropTypes, StateTypes> {
  title = ''
  actionId = ''

  constructor(props: PropTypes) {
    super(props)
    this.title = 'YApi-高效、易用、功能强大的可视化接口管理平台'
    this.state = {
      curTab: 'view',
      visible: false,
      nextTab: '',
    }
  }

  UNSAFE_componentWillMount() {
    const params = this.props.match.params
    this.actionId = params.actionId
    this.handleRequest(this.props)
  }

  componentWillUnmount() {
    document.getElementsByTagName('title')[0].innerText = this.title
  }

  UNSAFE_componentWillReceiveProps(nextProps: PropTypes) {
    const params = nextProps.match.params
    if (params.actionId !== this.actionId) {
      this.actionId = params.actionId
      this.handleRequest(nextProps)
    }
  }

  handleRequest(nextProps: PropTypes) {
    const params = nextProps.match.params
    this.props.fetchInterfaceData(params.actionId)
    this.setState({
      curTab: 'view',
    })
  }

  switchToView = () => {
    this.setState({
      curTab: 'view',
    })
  }

  onChange = (key: string) => {
    if (this.state.curTab === 'edit' && this.props.editStatus) {
      this.showModal()
    } else {
      this.setState({
        curTab: key,
      })
    }
    this.setState({
      nextTab: key,
    })
  }
  // 确定离开页面
  handleOk = () => {
    this.setState({
      visible: false,
      curTab: this.state.nextTab,
    })
  }
  // 离开编辑页面的提示
  showModal = () => {
    this.setState({
      visible: true,
    })
  }

  // 取消离开编辑页面
  handleCancel = () => {
    this.setState({
      visible: false,
    })
  }

  render() {
    if (this.props.curdata.title) {
      document.getElementsByTagName('title')[0].innerText
        = this.props.curdata.title + '-' + this.title
    }

    const InterfaceTabs: { [K: string]: { component: typeof Component, name: string } } = {
      view: { component: View, name: '预览' },
      edit: { component: Edit, name: '编辑' },
      run: { component: Run, name: '运行' },
    }

    plugin.emitHook('interface_tab', InterfaceTabs)

    const tabs = (
      <Tabs className={styles.tabs} size="large" onChange={this.onChange} activeKey={this.state.curTab}>
        {Object.entries(InterfaceTabs).map(([key, item]) => <TabPane tab={item.name} key={key} />)}
      </Tabs>
    )

    let tabContent = null
    if (this.state.curTab) {
      const C = InterfaceTabs[this.state.curTab].component
      tabContent = <C switchToView={this.switchToView} />
    }

    return (
      <div className="interface-content">
        <Prompt
          when={!!(this.state.curTab === 'edit' && this.props.editStatus)}
          message="离开页面会丢失当前编辑的内容，确定要离开吗？"
        />

        {tabs}
        {tabContent}
        {this.state.visible && (
          <Modal
            title="你即将离开编辑页面"
            visible={this.state.visible}
            onCancel={this.handleCancel}
            footer={[
              <Button key="back" onClick={this.handleCancel}>
                取 消
              </Button>,
              <Button key="submit" onClick={this.handleOk}>
                确 定
              </Button>,
            ]}
          >
            <p>离开页面会丢失当前编辑的内容，确定要离开吗？</p>
          </Modal>
        )}
      </div>
    )
  }
}

const states = (state: any) => ({
  curdata: state.inter.curdata,
  list: state.inter.list,
  editStatus: state.inter.editStatus,
})

const actions = {
  fetchInterfaceData,
}

export default connect(states, actions)(withRouter(Content as any)) as typeof Content
