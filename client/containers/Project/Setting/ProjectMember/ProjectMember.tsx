import { PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import {
  Table,
  Card,
  Badge,
  Select,
  Button,
  Modal,
  Row,
  Col,
  message,
  Popconfirm,
  Switch,
  Tooltip,
} from 'antd'
import PropsType from 'prop-types'
import React, { PureComponent as Component } from 'react'
import { connect } from 'react-redux'

import { AnyFunc } from '@/types'

import ErrMsg from '../../../../components/ErrMsg/ErrMsg'
import UsernameAutoComplete from '../../../../components/UsernameAutoComplete/UsernameAutoComplete.js'
import { fetchGroupMsg } from '../../../../reducer/modules/group'
import { fetchGroupMemberList } from '../../../../reducer/modules/group.js'
import {
  fetchProjectList,
  getProjectMemberList,
  getProject,
  addMember,
  delMember,
  changeMemberRole,
  changeMemberEmailNotice,
} from '../../../../reducer/modules/project'

import '../Setting.scss'

const Option = Select.Option

const arrayAddKey = (arr: any[]) => arr.map((item, index) => ({
  ...item,
  key: index,
}))

type PropsType = {
  match?: any
  projectId?: number
  projectMsg?: any
  uid?: number
  addMember?: AnyFunc
  delMember?: AnyFunc
  changeMemberRole?: AnyFunc
  getProject?: AnyFunc
  fetchGroupMemberList?: AnyFunc
  fetchGroupMsg?: AnyFunc
  getProjectMemberList?: AnyFunc
  fetchProjectList?: AnyFunc
  projectList?: any[]
  changeMemberEmailNotice?: AnyFunc
}

type StateType = {
  groupMemberList: any[]
  projectMemberList: any[]
  groupName: string
  role: string
  visible: boolean
  dataSource: any[]
  inputUids: number[]
  inputRole: string
  modalVisible: boolean
  selectProjectId: number
}

class ProjectMember extends Component<PropsType, StateType> {
  constructor(props: PropsType) {
    super(props)

    this.state = {
      groupMemberList: [],
      projectMemberList: [],
      groupName: '',
      role: '',
      visible: false,
      dataSource: [],
      inputUids: [],
      inputRole: 'dev',
      modalVisible: false,
      selectProjectId: 0,
    }
  }

  showAddMemberModal = () => {
    this.setState({
      visible: true,
    })
  }

  showImportMemberModal = async () => {
    await this.props.fetchProjectList(this.props.projectMsg.group_id)
    this.setState({
      modalVisible: true,
    })
  }

  // 重新获取列表
  reFetchList = () => {
    this.props.getProjectMemberList(this.props.match.params.id).then((res: any) => {
      this.setState({
        projectMemberList: arrayAddKey(res.payload.data.data),
        visible: false,
        modalVisible: false,
      })
    })
  }

  handleOk = () => {
    this.addMembers(this.state.inputUids)
  }

  // 增 - 添加成员
  addMembers = (memberUids: number[]) => {
    this.props
      .addMember({
        id: this.props.match.params.id,
        member_uids: memberUids,
        role: this.state.inputRole,
      })
      .then((res: any) => {
        if (!res.payload.data.errcode) {
          const { add_members, exist_members } = res.payload.data.data
          const addLength = add_members.length
          const existLength = exist_members.length
          this.setState({
            inputRole: 'dev',
            inputUids: [],
          })
          message.success(`添加成功! 已成功添加 ${addLength} 人，其中 ${existLength} 人已存在`)
          this.reFetchList() // 添加成功后重新获取分组成员列表
        }
      })
  }
  // 添加成员时 选择新增成员权限
  changeNewMemberRole = (value: string) => {
    this.setState({
      inputRole: value,
    })
  }

  // 删 - 删除分组成员
  deleteConfirm = (mUid: number) => () => {
    const id = this.props.match.params.id
    this.props.delMember({ id, member_uid: mUid }).then((res: any) => {
      if (!res.payload.data.errcode) {
        message.success(res.payload.data.errmsg)
        this.reFetchList() // 添加成功后重新获取分组成员列表
      }
    })
  }

  // 改 - 修改成员权限
  changeUserRole = (e: any) => {
    const id = this.props.match.params.id
    const role = e.split('-')[0]
    const member_uid = e.split('-')[1]
    this.props.changeMemberRole({ id, member_uid, role }).then((res: any) => {
      if (!res.payload.data.errcode) {
        message.success(res.payload.data.errmsg)
        this.reFetchList() // 添加成功后重新获取分组成员列表
      }
    })
  }

  // 修改用户是否接收消息通知
  changeEmailNotice = async (notice: boolean, member_uid: string) => {
    const id = this.props.match.params.id
    await this.props.changeMemberEmailNotice({ id, member_uid, notice })
    this.reFetchList() // 添加成功后重新获取项目成员列表
  }

  // 关闭模态框
  handleCancel = () => {
    this.setState({
      visible: false,
    })
  }
  // 关闭批量导入模态框
  handleModalCancel = () => {
    this.setState({
      modalVisible: false,
    })
  }

  // 处理选择项目
  handleChange = (key: number) => {
    this.setState({
      selectProjectId: key,
    })
  }

  // 确定批量导入模态框
  handleModalOk = async () => {
    // 获取项目中的成员列表
    const memberList = await this.props.getProjectMemberList(this.state.selectProjectId)
    const memberUidList = memberList.payload.data.data.map((item: any) => item.uid)
    this.addMembers(memberUidList)
  }

  onUserSelect = (uids: number[]) => {
    this.setState({
      inputUids: uids,
    })
  }

  async UNSAFE_componentWillMount() {
    const groupMemberList = await this.props.fetchGroupMemberList(this.props.projectMsg.group_id)
    const groupMsg = await this.props.fetchGroupMsg(this.props.projectMsg.group_id)
    const projectMemberList = await this.props.getProjectMemberList(this.props.match.params.id)
    this.setState({
      groupMemberList: groupMemberList.payload.data.data,
      groupName: groupMsg.payload.data.data.group_name,
      projectMemberList: arrayAddKey(projectMemberList.payload.data.data),
      role: this.props.projectMsg.role,
    })
  }

  render() {
    const isEmailEditAble = this.state.role === 'owner' || this.state.role === 'admin'
    const columns = [
      {
        title:
          this.props.projectMsg.name + ' 项目成员 (' + this.state.projectMemberList.length + ') 人',
        dataIndex: 'username',
        key: 'username',
        render: (text: string, record: any) => (
          <div className="m-user">
            <img src={'/api/user/avatar?uid=' + record.uid} className="m-user-img" />
            <p className="m-user-name">{text}</p>
            <Tooltip placement="top" title="消息通知">
              <span>
                <Switch
                  size="small"
                  checkedChildren="开"
                  unCheckedChildren="关"
                  checked={record.email_notice}
                  disabled={!(isEmailEditAble || record.uid === this.props.uid)}
                  onChange={e => this.changeEmailNotice(e, record.uid)}
                />
              </span>
            </Tooltip>
          </div>
        ),
      },
      {
        title:
          this.state.role === 'owner' || this.state.role === 'admin' ? (
            <div className="btn-container">
              <Button className="btn" type="primary" icon={<PlusOutlined />} onClick={this.showAddMemberModal}>
                添加成员
              </Button>
              <Button className="btn" icon={<PlusOutlined />} onClick={this.showImportMemberModal}>
                批量导入成员
              </Button>
            </div>
          ) : (
            ''
          ),
        key: 'action',
        className: 'member-operation',
        render: (text: string, record: any) => {
          if (this.state.role === 'owner' || this.state.role === 'admin') {
            return (
              <div>
                <Select
                  value={record.role + '-' + record.uid}
                  className="select"
                  onChange={this.changeUserRole}
                >
                  <Option value={'owner-' + record.uid}>组长</Option>
                  <Option value={'dev-' + record.uid}>开发者</Option>
                  <Option value={'guest-' + record.uid}>访客</Option>
                </Select>
                <Popconfirm
                  placement="topRight"
                  title="你确定要删除吗? "
                  onConfirm={this.deleteConfirm(record.uid)}
                  okText="确定"
                  cancelText=""
                >
                  <Button icon={<DeleteOutlined />} className="btn-danger" danger />
                </Popconfirm>
              </div>
            )
          }
          // 非管理员可以看到权限 但无法修改
          if (record.role === 'owner') {
            return '组长'
          } else if (record.role === 'dev') {
            return '开发者'
          } else if (record.role === 'guest') {
            return '访客'
          }
          return ''

        },
      },
    ]
    // 获取当前分组下的所有项目名称
    const children = this.props.projectList.map((item, index) => (
      <Option key={index} value={String(item._id)}>
        {item.name}
      </Option>
    ))

    return (
      <div className="g-row">
        <div className="m-panel">
          {this.state.visible ? (
            <Modal
              title="添加成员"
              visible={this.state.visible}
              onOk={this.handleOk}
              onCancel={this.handleCancel}
            >
              <Row gutter={6} className="modal-input">
                <Col span="5">
                  <div className="label userNameLabel">用户名: </div>
                </Col>
                <Col span="15">
                  <UsernameAutoComplete callbackState={this.onUserSelect} />
                </Col>
              </Row>
              <Row gutter={6} className="modal-input">
                <Col span="5">
                  <div className="label userNameLabel">权限: </div>
                </Col>
                <Col span="15">
                  <Select defaultValue="dev" className="select" onChange={this.changeNewMemberRole}>
                    <Option value="owner">组长</Option>
                    <Option value="dev">开发者</Option>
                    <Option value="guest">访客</Option>
                  </Select>
                </Col>
              </Row>
            </Modal>
          ) : (
            ''
          )}
          <Modal
            title="批量导入成员"
            visible={this.state.modalVisible}
            onOk={this.handleModalOk}
            onCancel={this.handleModalCancel}
          >
            <Row gutter={6} className="modal-input">
              <Col span="5">
                <div className="label userNameLabel">项目名: </div>
              </Col>
              <Col span="15">
                <Select
                  showSearch
                  style={{ width: 200 }}
                  placeholder="请选择项目名称"
                  optionFilterProp="children"
                  onChange={this.handleChange}
                >
                  {children}
                </Select>
              </Col>
            </Row>
          </Modal>

          <Table
            columns={columns}
            dataSource={this.state.projectMemberList}
            pagination={false}
            locale={{ emptyText: <ErrMsg type="noMemberInProject" /> }}
            className="setting-project-member"
          />
          <Card
            bordered={false}
            title={
              this.state.groupName + ' 分组成员 (' + this.state.groupMemberList.length + ') 人'
            }
            hoverable={true}
            className="setting-group"
          >
            {this.state.groupMemberList.length ? (
              this.state.groupMemberList.map((item, index) => (
                <div key={index} className="card-item">
                  <img
                    src={
                      location.protocol
                      + '//'
                      + location.host
                      + '/api/user/avatar?uid='
                      + item.uid
                    }
                    className="item-img"
                  />
                  <p className="item-name">
                    {item.username}
                    {item.uid === this.props.uid ? (
                      <Badge
                        count={'我'}
                        style={{
                          backgroundColor: '#689bd0',
                          fontSize: '13px',
                          marginLeft: '8px',
                          borderRadius: '4px',
                        }}
                      />
                    ) : null}
                  </p>
                  {item.role === 'owner' ? <p className="item-role">组长</p> : null}
                  {item.role === 'dev' ? <p className="item-role">开发者</p> : null}
                  {item.role === 'guest' ? <p className="item-role">访客</p> : null}
                </div>
              ))
            ) : (
              <ErrMsg type="noMemberInGroup" />
            )}
          </Card>
        </div>
      </div>
    )
  }
}

const states = (state: any) => ({
  projectMsg: state.project.currProject,
  uid: state.user.uid,
  projectList: state.project.projectList,
})
const actions = {
  fetchGroupMemberList,
  getProjectMemberList,
  addMember,
  delMember,
  fetchGroupMsg,
  changeMemberRole,
  getProject,
  fetchProjectList,
  changeMemberEmailNotice,
}

export default connect(states, actions)(ProjectMember) as typeof ProjectMember
