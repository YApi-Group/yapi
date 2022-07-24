import { FolderAddOutlined, UserOutlined, FolderOpenOutlined } from '@ant-design/icons'
import { Modal, Input, message, Spin, Row, Menu, Col, Popover, Tooltip } from 'antd'
import { ItemType } from 'antd/lib/menu/hooks/useItems'
import axios from 'axios'
import PropTypes from 'prop-types'
import { MenuInfo } from 'rc-menu/lib/interface'
import React, { ChangeEvent, PureComponent as Component, ReactNode } from 'react'
import { connect } from 'react-redux'
import { withRouter } from 'react-router-dom'

import { AnyFunc } from '@/types.js'

import GuideBtns from '../../../components/GuideBtns/GuideBtns.js'
import UsernameAutoComplete from '../../../components/UsernameAutoComplete/UsernameAutoComplete.js'
import { fetchGroupList, setCurrGroup, fetchGroupMsg } from '../../../reducer/modules/group.js'
import { fetchNewsData } from '../../../reducer/modules/news.js'

import style from './gl.module.less'

import './GroupList.scss'

const { TextArea } = Input

const tip = (
  <div className="title-container">
    <h3 className="title">欢迎使用 YApi ~</h3>
    <p>
      这里的
      <b>“个人空间”</b>
      是你自己才能看到的分组，你拥有这个分组的全部权限，可以在这个分组里探索 YApi 的功能。
    </p>
  </div>
)

type PropTypes = {
  groupList?: any[]
  currGroup?: any
  match?: any
  history?: any
  curUserRole?: string
  curUserRoleInGroup?: string
  studyTip?: number
  study?: boolean
  fetchGroupList?: AnyFunc
  setCurrGroup?: AnyFunc
  // setGroupList?: AnyFunc,
  fetchNewsData?: AnyFunc
  fetchGroupMsg?: AnyFunc
}

type StateTypes = {
  addGroupModalVisible: boolean
  newGroupName: string
  newGroupDesc: string
  currGroupName: string
  currGroupDesc: string
  groupList: any[]
  owner_uids: any[]
}

class GroupList extends Component<PropTypes, StateTypes> {
  state: StateTypes = {
    addGroupModalVisible: false,
    newGroupName: '',
    newGroupDesc: '',
    currGroupName: '',
    currGroupDesc: '',
    groupList: [],
    owner_uids: [],
  }

  async UNSAFE_componentWillMount() {
    const groupId = !isNaN(this.props.match.params.groupId) ? parseInt(this.props.match.params.groupId) : 0
    await this.props.fetchGroupList()
    let currGroup: any
    if (this.props.groupList.length && groupId) {
      for (let i = 0; i < this.props.groupList.length; i++) {
        if (this.props.groupList[i]._id === groupId) {
          currGroup = this.props.groupList[i]
        }
      }
    } else if (!groupId && this.props.groupList.length) {
      this.props.history.push(`/group/${this.props.groupList[0]._id}`)
    }
    if (!currGroup) {
      currGroup = this.props.groupList[0] || { group_name: '', group_desc: '' }
      this.props.history.replace(`${currGroup._id}`)
    }
    this.setState({ groupList: this.props.groupList })
    this.props.setCurrGroup(currGroup)
  }

  showModal = () => {
    this.setState({
      addGroupModalVisible: true,
    })
  }

  hideModal = () => {
    this.setState({
      newGroupName: '',
      // group_name: '',
      owner_uids: [],
      addGroupModalVisible: false,
    })
  }

  addGroup = async () => {
    const { newGroupName: group_name, newGroupDesc: group_desc, owner_uids } = this.state
    const res = await axios.post('/api/group/add', { group_name, group_desc, owner_uids })
    if (!res.data.errcode) {
      this.setState({
        newGroupName: '',
        // group_name: '',
        owner_uids: [],
        addGroupModalVisible: false,
      })
      await this.props.fetchGroupList()
      this.setState({ groupList: this.props.groupList })
      this.props.fetchGroupMsg(this.props.currGroup._id)
      this.props.fetchNewsData(this.props.currGroup._id, 'group', 1, 10)
    } else {
      message.error(res.data.errmsg)
    }
  }

  editGroup = async () => {
    const { currGroupName: group_name, currGroupDesc: group_desc } = this.state
    const id = this.props.currGroup._id
    const res = await axios.post('/api/group/up', { group_name, group_desc, id })
    if (res.data.errcode) {
      message.error(res.data.errmsg)
    } else {
      await this.props.fetchGroupList()

      this.setState({ groupList: this.props.groupList })
      const currGroup = this.props.groupList.find(group => Number(group._id) === Number(id))

      this.props.setCurrGroup(currGroup)
      // this.props.setCurrGroup({ group_name, group_desc, _id: id });
      this.props.fetchGroupMsg(this.props.currGroup._id)
      this.props.fetchNewsData(this.props.currGroup._id, 'group', 1, 10)
    }
  }

  inputNewGroupName = (e: ChangeEvent<HTMLInputElement>) => {
    this.setState({ newGroupName: e.target.value })
  }

  inputNewGroupDesc = (e: ChangeEvent<HTMLTextAreaElement>) => {
    this.setState({ newGroupDesc: e.target.value })
  }

  selectGroup = (e: MenuInfo) => {
    const groupId = e.key
    // const currGroup = this.props.groupList.find((group) => { return +group._id === +groupId });
    const currGroup = this.props.groupList.find(group => Number(group._id) === Number(groupId))
    this.props.setCurrGroup(currGroup)
    this.props.history.replace(`${currGroup._id}`)
    this.props.fetchNewsData(groupId, 'group', 1, 10)
  }

  onUserSelect = (uids: number[]) => {
    this.setState({
      owner_uids: uids,
    })
  }

  searchGroup = (e: ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value
    const { groupList } = this.props
    if (v === '') {
      this.setState({ groupList })
    } else {
      this.setState({
        groupList: groupList.filter(group => new RegExp(v, 'i').test(group.group_name)),
      })
    }
  }

  UNSAFE_componentWillReceiveProps(nextProps: PropTypes) {
    // GroupSetting 组件设置的分组信息，通过redux同步到左侧分组菜单中
    if (this.props.groupList !== nextProps.groupList) {
      this.setState({
        groupList: nextProps.groupList,
      })
    }
  }

  render() {
    const menuItems: ItemType[] = []

    let label: ReactNode
    for (const group of this.state.groupList) {
      if (group.type === 'private') {
        label = (
          <div className="group-item" style={{ zIndex: this.props.studyTip === 0 ? 3 : 1 }}>
            <UserOutlined className={style.itemIcon} />
            <Popover
              overlayClassName="popover-index"
              content={<GuideBtns />}
              title={tip}
              placement="right"
              visible={this.props.studyTip === 0 && !this.props.study}
            >
              {group.group_name}
            </Popover>
          </div>
        )
      } else {
        label = (
          <div className="group-item">
            <FolderOpenOutlined className={style.itemIcon} />
            <span className={style.itemText} style={{ marginLeft: '10px' }}>{group.group_name}</span>
          </div>
        )
      }

      menuItems.push({
        label: label,
        key: `${group._id}`,
      })
    }

    const { currGroup } = this.props
    return (
      <div className="m-group">
        {!this.props.study ? <div className="study-mask" /> : null}
        <div className="group-bar">
          <div className="curr-group">
            <div className="curr-group-name">
              <span className="name">{currGroup.group_name}</span>
              <Tooltip title="添加分组">
                <a className="editSet">
                  <FolderAddOutlined className="btn" onClick={this.showModal} />
                </a>
              </Tooltip>
            </div>
            <div className="curr-group-desc">简介: {currGroup.group_desc}</div>
          </div>

          <div className="group-operate">
            <div className="search">
              <Input placeholder="搜索分类" onChange={this.searchGroup} />
            </div>
          </div>

          {this.state.groupList.length === 0 && (
            <Spin
              style={{
                marginTop: 20,
                display: 'flex',
                justifyContent: 'center',
              }}
            />
          )}
          <Menu
            items={menuItems}
            className="group-list"
            mode="inline"
            onClick={this.selectGroup}
            selectedKeys={[`${currGroup._id}`]}
          />
        </div>

        {this.state.addGroupModalVisible ? (
          <Modal
            title="添加分组"
            visible={this.state.addGroupModalVisible}
            onOk={this.addGroup}
            onCancel={this.hideModal}
            className="add-group-modal"
          >
            <Row gutter={6} className="modal-input">
              <Col span="5">
                <div className="label">分组名：</div>
              </Col>
              <Col span="15">
                <Input placeholder="请输入分组名称" onChange={this.inputNewGroupName} />
              </Col>
            </Row>
            <Row gutter={6} className="modal-input">
              <Col span="5">
                <div className="label">简介：</div>
              </Col>
              <Col span="15">
                <TextArea rows={3} placeholder="请输入分组描述" onChange={this.inputNewGroupDesc} />
              </Col>
            </Row>
            <Row gutter={6} className="modal-input">
              <Col span="5">
                <div className="label">组长：</div>
              </Col>
              <Col span="15">
                <UsernameAutoComplete callbackState={this.onUserSelect} />
              </Col>
            </Row>
          </Modal>
        ) : (
          ''
        )}
      </div>
    )
  }
}

const states = (state: any) => ({
  groupList: state.group.groupList,
  currGroup: state.group.currGroup,
  curUserRole: state.user.role,
  curUserRoleInGroup: state.group.currGroup.role || state.group.role,
  studyTip: state.user.studyTip,
  study: state.user.study,
})

const actions = {
  fetchGroupList,
  setCurrGroup,
  // setGroupList,
  fetchNewsData,
  fetchGroupMsg,
}

export default connect(states, actions)(withRouter(GroupList as any)) as any as typeof GroupList
