import { message, Modal } from 'antd'
import axios from 'axios'
import PropTypes from 'prop-types'
import React, { createRef, PureComponent as Component, RefObject } from 'react'
import { connect } from 'react-redux'
import { withRouter, Link } from 'react-router-dom'

import { AnyFunc } from '@/types.js'

import {
  updateInterfaceData,
  fetchInterfaceListMenu,
  fetchInterfaceData,
} from '../../../../reducer/modules/interface.js'
import { getProject } from '../../../../reducer/modules/project'
import ProjectTag from '../../Setting/ProjectMessage/ProjectTag'

import InterfaceEditForm from './InterfaceEditForm'

import './Edit.scss'

type PropTypes = {
  curdata?: any
  currProject?: any
  updateInterfaceData?: AnyFunc
  fetchInterfaceListMenu?: AnyFunc
  fetchInterfaceData?: AnyFunc
  match?: any
  switchToView?: AnyFunc
  getProject?: AnyFunc
}

type StateTypes = {
  mockUrl:string
  curdata: any
  status: number
  visible: boolean
}

class InterfaceEdit extends Component<PropTypes, StateTypes> {
  wsIns: WebSocket
  tagRef: RefObject<ProjectTag>
  
  constructor(props: PropTypes) {
    super(props)

    this.tagRef = createRef()

    const { curdata, currProject } = this.props
    this.state = {
      mockUrl:
        location.protocol
        + '//'
        + location.hostname
        + (location.port !== '' ? ':' + location.port : '')
        + `/mock/${currProject._id}${currProject.basepath}${curdata.path}`,
      curdata: {},
      status: 0,
      visible: false,
    }
  }

  onSubmit = async (params:any) => {
    params.id = this.props.match.params.actionId
    const result = await axios.post('/api/interface/up', params)
    this.props.fetchInterfaceListMenu(this.props.currProject._id).then()
    this.props.fetchInterfaceData(params.id).then()
    if (result.data.errcode === 0) {
      this.props.updateInterfaceData(params)
      message.success('保存成功')
    } else {
      message.error(result.data.errmsg)
    }
  }

  componentWillUnmount() {
    try {
      if (this.state.status === 1) {
        this.wsIns.close()
      }
    } catch (e) {
      console.error(e)
    }
  }

  componentDidMount() {
    const domain = location.hostname + (location.port !== '' ? ':' + location.port : '')
    let initData = false
    // 因后端 node 仅支持 ws， 暂不支持 wss
    const wsProtocol = location.protocol === 'https:' ? 'wss' : 'ws'

    setTimeout(() => {
      if (initData === false) {
        this.setState({
          curdata: this.props.curdata,
          status: 1,
        })
        initData = true
      }
    }, 3000)

    try {
      const s = new WebSocket(wsProtocol
          + '://'
          + domain
          + '/api/interface/solve_conflict?id='
          + this.props.match.params.actionId)
      s.onopen = () => {
        this.wsIns = s
      }

      s.onmessage = e => {
        initData = true
        const result = JSON.parse(e.data)
        if (result.errno === 0) {
          this.setState({
            curdata: result.data,
            status: 1,
          })
        } else {
          this.setState({
            curdata: result.data,
            status: 2,
          })
        }
      }

      s.onerror = () => {
        this.setState({
          curdata: this.props.curdata,
          status: 1,
        })
        console.warn('websocket 连接失败，将导致多人编辑同一个接口冲突。')
      }
    } catch (e) {
      this.setState({
        curdata: this.props.curdata,
        status: 1,
      })
      console.error('websocket 连接失败，将导致多人编辑同一个接口冲突。')
    }
  }

  onTagClick = () => {
    this.setState({
      visible: true,
    })
  }

  handleOk = async () => {
    let { tag } = this.tagRef.current.state
    tag = tag.filter(val => val.name !== '')

    const id = this.props.currProject._id
    const params = {
      id,
      tag,
    }
    const result = await axios.post('/api/project/up_tag', params)

    if (result.data.errcode === 0) {
      await this.props.getProject(id)
      message.success('保存成功')
    } else {
      message.error(result.data.errmsg)
    }

    this.setState({
      visible: false,
    })
  }

  handleCancel = () => {
    this.setState({
      visible: false,
    })
  }

  render() {
    const { cat, basepath, switch_notice, tag } = this.props.currProject
    return (
      <div className="interface-edit">
        {this.state.status === 1 ? (
          <InterfaceEditForm
            cat={cat}
            mockUrl={this.state.mockUrl}
            basepath={basepath}
            noticed={switch_notice}
            onSubmit={this.onSubmit}
            curdata={this.state.curdata}
            onTagClick={this.onTagClick}
          />
        ) : null}
        {this.state.status === 2 ? (
          <div style={{ textAlign: 'center', fontSize: '14px', paddingTop: '10px' }}>
            <Link to={'/user/profile/' + this.state.curdata.uid}>
              <b>{this.state.curdata.username}</b>
            </Link>
            <span>正在编辑该接口，请稍后再试...</span>
          </div>
        ) : null}
        {this.state.status === 0 && '正在加载，请耐心等待...'}

        <Modal
          title="Tag 设置"
          width={680}
          visible={this.state.visible}
          onOk={this.handleOk}
          onCancel={this.handleCancel}
          okText="保存"
        >
          <div className="tag-modal-center">
            <ProjectTag tagMsg={tag} ref={this.tagRef} />
          </div>
        </Modal>
      </div>
    )
  }
}

const states = (state:any) => ({
  curdata: state.inter.curdata,
  currProject: state.project.currProject,
})

const actions = {
  updateInterfaceData,
  fetchInterfaceListMenu,
  fetchInterfaceData,
  getProject,
}

export default withRouter(connect(states, actions)(InterfaceEdit as any)) as any as typeof InterfaceEdit
