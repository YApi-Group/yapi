import { Row, Col, Button, Tooltip } from 'antd'
import PropTypes from 'prop-types'
import React, { PureComponent as Component } from 'react'
import { connect } from 'react-redux'
import { Link } from 'react-router-dom'

import { AnyFunc } from '@/types.js'

import ErrMsg from '../../../components/ErrMsg/ErrMsg'
import ProjectCard from '../../../components/ProjectCard/ProjectCard'
import { addProject, fetchProjectList, delProject } from '../../../reducer/modules/project'
import { setBreadcrumb } from '../../../reducer/modules/user'

import './ProjectList.scss'

type PropTypes = {
  form: any
  fetchProjectList: AnyFunc
  addProject: AnyFunc
  delProject: AnyFunc
  // changeUpdateModal: AnyFunc,
  projectList: any[]
  userInfo: any
  tableLoading: boolean
  currGroup: any
  setBreadcrumb: AnyFunc
  currPage: number
  studyTip: number
  study: boolean
}

type StateTypes = {
  visible: boolean
  protocol: string
  projectData: any[]
}

class ProjectList extends Component<PropTypes, StateTypes> {
  constructor(props: PropTypes) {
    super(props)

    this.state = {
      visible: false,
      protocol: 'http://',
      projectData: [],
    }
  }

  // 取消修改
  handleCancel = () => {
    this.props.form.resetFields()
    this.setState({ visible: false })
  }

  // 修改线上域名的协议类型 (http/https)
  protocolChange = (value: string) => {
    this.setState({ protocol: value })
  }

  // 获取 ProjectCard 组件的关注事件回调，收到后更新数据
  receiveRes = () => {
    this.props.fetchProjectList(this.props.currGroup._id, this.props.currPage)
  }

  UNSAFE_componentWillReceiveProps(nextProps: any) {
    this.props.setBreadcrumb([{ name: String(nextProps.currGroup.group_name || '') }])

    // 切换分组
    if (this.props.currGroup !== nextProps.currGroup && nextProps.currGroup._id) {
      this.props.fetchProjectList(nextProps.currGroup._id, this.props.currPage)
    }

    // 切换项目列表
    if (this.props.projectList !== nextProps.projectList) {
      // console.log(nextProps.projectList);
      const data = nextProps.projectList.map((item: any, index: number) => {
        item.key = index
        return item
      })
      this.setState({
        projectData: data,
      })
    }
  }

  render() {
    let projectData = this.state.projectData
    let noFollow: any[] = []
    let followProject: any[] = []
    for (const i in projectData) {
      if (projectData[i].follow) {
        followProject.push(projectData[i])
      } else {
        noFollow.push(projectData[i])
      }
    }
    followProject = followProject.sort((a, b) => b.up_time - a.up_time)
    noFollow = noFollow.sort((a, b) => b.up_time - a.up_time)
    projectData = [...followProject, ...noFollow]

    const isShow = /(admin)|(owner)|(dev)/.test(this.props.currGroup.role)

    const Follow = () => followProject.length ? (
      <>
        <h3 className="owner-type">我的关注</h3>
        <Row>
          {followProject.map((item, index) => (
            <Col xs={8} lg={6} xxl={4} key={index}>
              <ProjectCard projectData={item} callbackResult={this.receiveRes} />
            </Col>
          ))}
        </Row>
      </>
    ) : null

    const NoFollow = () => noFollow.length ? (
      <>
        <h3 className="owner-type">我的项目</h3>
        <Row style={{ borderBottom: '1px solid #eee', marginBottom: '15px' }}>
          {noFollow.map((item, index) => (
            <Col xs={8} lg={6} xxl={4} key={index}>
              <ProjectCard projectData={item} callbackResult={this.receiveRes} isShow={isShow} />
            </Col>
          ))}
        </Row>
      </>
    ) : null

    const OwnerSpace = () => projectData.length ? (
      <>
        <NoFollow />
        <Follow />
      </>
    ) : (
      <ErrMsg type="noProject" />
    )

    return (
      <div style={{ paddingTop: '24px' }} className="m-panel card-panel card-panel-s project-list">
        <Row className="project-list-header">
          <Col span={16} style={{ textAlign: 'left' }}>
            {this.props.currGroup.group_name} 分组共 ({projectData.length}) 个项目
          </Col>

          <Col span={8}>
            {isShow ? (
              <Link to="/add-project">
                <Button type="primary">添加项目</Button>
              </Link>
            ) : (
              <Tooltip title="您没有权限,请联系该分组组长或管理员">
                <Button type="primary" disabled>
                  添加项目
                </Button>
              </Tooltip>
            )}
          </Col>
        </Row>

        {/* {projectData.length ? projectData.map((item, index) => {
            return (
              <Col xs={8} md={6} xl={4} key={index}>
              <ProjectCard projectData={item} callbackResult={this.receiveRes} />
              </Col>);
            }) : <ErrMsg type="noProject" />} */}
        {this.props.currGroup.type === 'private' ? (
          <OwnerSpace />
        ) : projectData.length ? (
          <Row>
            {projectData.map((item, index) => (
              <Col xs={8} lg={6} xxl={4} key={index}>
                <ProjectCard projectData={item} callbackResult={this.receiveRes} isShow={isShow} />
              </Col>
            ))}
          </Row>
        ) : (
          <Row>
            <ErrMsg type="noProject" />
          </Row>
        )}
      </div>
    )
  }
}

const states = (state: any) => ({
  projectList: state.project.projectList,
  userInfo: state.project.userInfo,
  tableLoading: state.project.tableLoading,
  currGroup: state.group.currGroup,
  currPage: state.project.currPage,
})

const actions = {
  fetchProjectList,
  addProject,
  delProject,
  // changeUpdateModal,
  setBreadcrumb,
}

export default connect(states, actions)(ProjectList)
