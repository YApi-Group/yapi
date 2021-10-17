import { StarOutlined, CopyOutlined, StarFilled } from '@ant-design/icons'
import { Card, Tooltip, Modal, Alert, Input, message } from 'antd'
import produce from 'immer'
import React, { PureComponent as Component } from 'react'
import { connect } from 'react-redux'
import { withRouter } from 'react-router'

import constants from '@/cons'
import { AnyFunc } from '@/types'

import { debounce } from '../../common'
import { trim } from '../../common.js'
import { delFollow, addFollow } from '../../reducer/modules/follow'
import { getProject, checkProjectName, copyProjectMsg } from '../../reducer/modules/project'

import './ProjectCard.scss'

type PropTypes = {
  projectData?: any
  uid?: number
  inFollowPage?: boolean
  callbackResult?: AnyFunc
  history?: any
  delFollow?: AnyFunc
  addFollow?: AnyFunc
  isShow?: boolean
  getProject?: AnyFunc
  checkProjectName?: AnyFunc
  copyProjectMsg?: AnyFunc
  currPage?: number
}

class ProjectCard extends Component<PropTypes> {
  constructor(props: PropTypes) {
    super(props)

    this.add = debounce(this.add.bind(this), 400)
    this.del = debounce(this.del.bind(this), 400)

    this.copy = this.copy.bind(this)
    this.showConfirm = this.showConfirm.bind(this)
  }

  async copy(projectName: string) {
    const id = this.props.projectData._id

    const projectData = await this.props.getProject(id)
    const data = projectData.payload.data.data
    const newData = produce(data, (draftData: any) => {
      draftData.preName = draftData.name
      draftData.name = projectName
    })

    await this.props.copyProjectMsg(newData)
    message.success('项目复制成功')
    this.props.callbackResult()
  }

  // 复制项目的二次确认
  showConfirm() {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const that = this

    Modal.confirm({
      title: '确认复制 ' + that.props.projectData.name + ' 项目吗？',
      okText: '确认',
      cancelText: '取消',
      content: (
        <div style={{ marginTop: '10px', fontSize: '13px', lineHeight: '25px' }}>
          <Alert
            message={`该操作将会复制 ${that.props.projectData.name
            } 下的所有接口集合，但不包括测试集合中的接口`}
            type="info"
          />
          <div style={{ marginTop: '16px' }}>
            <p>
              <b>项目名称:</b>
            </p>
            <Input id="project_name" placeholder="项目名称" />
          </div>
        </div>
      ),
      async onOk() {
        const elem = document.getElementById('project_name') as HTMLInputElement
        const projectName = trim(elem.value)

        // 查询项目名称是否重复
        const group_id = that.props.projectData.group_id
        await that.props.checkProjectName(projectName, group_id)
        that.copy(projectName)
      },
      icon: <CopyOutlined />,
    })
  }

  del() {
    const id = this.props.projectData.projectid || this.props.projectData._id
    this.props.delFollow(id).then((res: any) => {
      if (res.payload.data.errcode === 0) {
        this.props.callbackResult()
        // message.success('已取消关注！');  // 星号已做出反馈 无需重复提醒用户
      }
    })
  }

  add() {
    const { uid, projectData } = this.props
    const param = {
      uid,
      projectid: projectData._id,
      projectname: projectData.name,
      icon: projectData.icon || constants.PROJECT_ICON[0],
      color: projectData.color || constants.PROJECT_COLOR.blue,
    }

    this.props.addFollow(param).then((res: any) => {
      if (res.payload.data.errcode === 0) {
        this.props.callbackResult()
        // message.success('已添加关注！');  // 星号已做出反馈 无需重复提醒用户
      }
    })
  }

  render() {
    const { projectData, inFollowPage, isShow } = this.props
    return (
      <div className="card-container">
        <Card
          bordered={false}
          className="m-card"
          onClick={() => this.props.history.push('/project/' + (projectData.projectid || projectData._id))
          }
        >
          {/* <Icon
            type={projectData.icon || 'star-o'}
            className="ui-logo"
            style={{
              backgroundColor:
                constants.PROJECT_COLOR[projectData.color] || constants.PROJECT_COLOR.blue,
            }}
          /> */}
          <StarOutlined
            className="ui-logo"
            style={{
              backgroundColor:
                (constants.PROJECT_COLOR as any)[projectData.color] || constants.PROJECT_COLOR.blue,
            }}
          />
          <h4 className="ui-title">{projectData.name || projectData.projectname}</h4>
        </Card>
        <div
          className="card-btns"
          onClick={projectData.follow || inFollowPage ? this.del : this.add}
        >
          <Tooltip
            placement="rightTop"
            title={projectData.follow || inFollowPage ? '取消关注' : '添加关注'}
          >
            {
              projectData.follow || inFollowPage
                ? <StarFilled className="icon active" />
                : <StarOutlined className="icon" />
            }
          </Tooltip>
        </div>
        {isShow && (
          <div className="copy-btns" onClick={this.showConfirm}>
            <Tooltip placement="rightTop" title="复制项目">
              <CopyOutlined className="icon" />
            </Tooltip>
          </div>
        )}
      </div>
    )
  }
}

const states = (state: any) => ({
  uid: state.user.uid,
  currPage: state.project.currPage,
})

const actions = {
  delFollow,
  addFollow,
  getProject,
  checkProjectName,
  copyProjectMsg,
}

export default connect(states, actions)(withRouter(ProjectCard as any)) as typeof ProjectCard
