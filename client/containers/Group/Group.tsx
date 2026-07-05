import { Tabs, Layout, Spin } from 'antd'
import type { TabsProps } from 'antd'
import axios from 'axios'
import PropTypes from 'prop-types'
import React, { PureComponent as Component } from 'react'
import { connect } from 'react-redux'
import { Route, Switch, Redirect } from 'react-router-dom'

import { AnyFunc } from '@/types'

import { setCurrGroup } from '../../reducer/modules/group'
import { fetchNewsData } from '../../reducer/modules/news.js'

import GroupList from './GroupList/GroupList'
import GroupLog from './GroupLog/GroupLog'
import GroupSetting from './GroupSetting/GroupSetting.js'
import MemberList from './MemberList/MemberList.js'
import ProjectList from './ProjectList/ProjectList'

import './Group.scss'

const { Content, Sider } = Layout

type PropTypes = {
  fetchNewsData: AnyFunc
  curGroupId: number
  curUserRole: string
  currGroup: any
  curUserRoleInGroup: string
  setCurrGroup: AnyFunc
}

type StateTypes = {
  groupId: number
}

class Group extends Component<PropTypes, StateTypes> {
  constructor(props: PropTypes) {
    super(props)

    this.state = {
      groupId: -1,
    }
  }

  async componentDidMount() {
    const r = await axios.get('/api/group/get_mygroup')
    try {
      const group = r.data.data
      this.setState({
        groupId: group._id,
      })
      this.props.setCurrGroup(group)
    } catch (e) {
      console.error(e)
    }
  }

  // onTabClick=(key)=> {
  //   // if (key == 3) {
  //   //   this.props.fetchNewsData(this.props.curGroupId, "group", 1, 10)
  //   // }
  // }
  render() {
    if (this.state.groupId === -1) { return <Spin /> }

    const items: TabsProps['items'] = [
      {
        key: '1',
        label: '项目列表',
        children: <ProjectList />,
      },
      ...(this.props.currGroup.type === 'public'
        ? [{
            key: '2',
            label: '成员列表',
            children: <MemberList />,
          }]
        : []),
      ...(['admin', 'owner', 'guest', 'dev'].indexOf(this.props.curUserRoleInGroup) > -1
        || this.props.curUserRole === 'admin'
        ? [{
            key: '3',
            label: '分组动态',
            children: <GroupLog />,
          }]
        : []),
      ...((this.props.curUserRole === 'admin' || this.props.curUserRoleInGroup === 'owner')
        && this.props.currGroup.type !== 'private'
        ? [{
            key: '4',
            label: '分组设置',
            children: <GroupSetting />,
          }]
        : []),
    ]

    const GroupContent = (
      <Layout style={{ minHeight: 'calc(100vh - 100px)', marginLeft: '24px', marginTop: '24px' }}>
        <Sider style={{ height: '100%' }} width={300}>
          <div className="logo" />
          <GroupList />
        </Sider>
        <Layout>
          <Content
            style={{
              height: '100%',
              margin: '0 24px 0 16px',
              overflow: 'initial',
              backgroundColor: '#fff',
            }}
          >
            <Tabs type="card" className="m-tab tabs-large" style={{ height: '100%' }} items={items} />
          </Content>
        </Layout>
      </Layout>
    )

    return (
      <div className="projectGround">
        <Switch>
          <Redirect exact from="/group" to={'/group/' + this.state.groupId} />
          <Route path="/group/:groupId" render={() => GroupContent} />
        </Switch>
      </div>
    )
  }
}

const states = (state: any) => ({
  curGroupId: state.group.currGroup._id,
  curUserRole: state.user.role,
  curUserRoleInGroup: state.group.currGroup.role || state.group.role,
  currGroup: state.group.currGroup,
})

const actions = {
  fetchNewsData,
  setCurrGroup,
}

export default connect(states, actions)(Group)
