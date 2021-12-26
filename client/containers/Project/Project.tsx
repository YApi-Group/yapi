import React, { PureComponent as Component } from 'react'
import { connect } from 'react-redux'
import { Route, Switch, Redirect, matchPath } from 'react-router-dom'

import plugin from '@/plugin'
import { AnyFunc } from '@/types'

import { SubNav } from '../../components'
import Loading from '../../components/Loading/Loading'
import { fetchGroupMsg } from '../../reducer/modules/group'
import { getProject } from '../../reducer/modules/project'
import { setBreadcrumb } from '../../reducer/modules/user'

import Activity from './Activity/Activity'
import Interface from './Interface/Interface'
import ProjectData from './Setting/ProjectData/ProjectData'
import ProjectMember from './Setting/ProjectMember/ProjectMember'
import Setting from './Setting/Setting'

type PropTypes = {
  match?: any
  curProject?: any
  getProject?: AnyFunc
  location?: any
  fetchGroupMsg?: AnyFunc
  setBreadcrumb?: AnyFunc
  currGroup?: any
}

class Project extends Component<PropTypes> {
  async UNSAFE_componentWillMount() {
    await this.props.getProject(this.props.match.params.id)
    await this.props.fetchGroupMsg(this.props.curProject.group_id)

    this.props.setBreadcrumb([
      {
        name: this.props.currGroup.group_name,
        href: '/group/' + this.props.currGroup._id,
      },
      {
        name: this.props.curProject.name,
      },
    ])
  }

  async UNSAFE_componentWillReceiveProps(nextProps: PropTypes) {
    const currProjectId = this.props.match.params.id
    const nextProjectId = nextProps.match.params.id
    if (currProjectId !== nextProjectId) {
      await this.props.getProject(nextProjectId)
      await this.props.fetchGroupMsg(this.props.curProject.group_id)
      this.props.setBreadcrumb([
        {
          name: this.props.currGroup.group_name,
          href: '/group/' + this.props.currGroup._id,
        },
        {
          name: this.props.curProject.name,
        },
      ])
    }
  }

  render() {
    const { match, location } = this.props
    const routers = {
      interface: { name: '接口', path: '/project/:id/interface/:action', component: Interface },
      activity: { name: '动态', path: '/project/:id/activity', component: Activity },
      data: { name: '数据管理', path: '/project/:id/data', component: ProjectData },
      members: { name: '成员管理', path: '/project/:id/members', component: ProjectMember },
      setting: { name: '设置', path: '/project/:id/setting', component: Setting },
    }

    plugin.emitHook('sub_nav', routers)

    let defaultName
    for (const ro of Object.values(routers)) {
      if (matchPath(location.pathname, { path: ro.path }) !== null) {
        defaultName = ro.name
        break
      }
    }

    // let subData = [{
    //   name: routers.interface.name,
    //   path: `/project/${match.params.id}/interface/api`
    // }, {
    //   name: routers.activity.name,
    //   path: `/project/${match.params.id}/activity`
    // }, {
    //   name: routers.data.name,
    //   path: `/project/${match.params.id}/data`
    // }, {
    //   name: routers.members.name,
    //   path: `/project/${match.params.id}/members`
    // }, {
    //   name: routers.setting.name,
    //   path: `/project/${match.params.id}/setting`
    // }];

    let subData: { path: string, name: string }[] = []
    for (const [key, item] of Object.entries(routers)) {
      if (key === 'interface') {
        subData.push({
          name: item.name,
          path: `/project/${match.params.id}/interface/api`,
        })
      } else {
        subData.push({
          name: item.name,
          path: item.path.replace(/:id/gi, match.params.id),
        })
      }
    }

    if (this.props.currGroup.type === 'private') {
      subData = subData.filter(item => item.name !== '成员管理')
    }

    if (Object.keys(this.props.curProject).length === 0) {
      return <Loading visible />
    }

    return (
      <div>
        <SubNav default={defaultName} data={subData} />
        <Switch>
          <Redirect exact from="/project/:id" to={`/project/${match.params.id}/interface/api`} />
          {/* <Route path={routers.activity.path} component={Activity} />
          
          <Route path={routers.setting.path} component={Setting} />
          {this.props.currGroup.type !== 'private' ?
            <Route path={routers.members.path} component={routers.members.component}/>
            : null
          }

          <Route path={routers.data.path} component={ProjectData} /> */}
          {
            Object.entries(routers).map(([key, item]) => key === 'members' ? (
              this.props.currGroup.type !== 'private' ? (
                <Route path={item.path} component={item.component} key={key} />
              ) : null
            ) : (
              <Route path={item.path} component={item.component} key={key} />
            ))
          }
        </Switch>
      </div>
    )
  }
}

const states = (state: any) => ({
  curProject: state.project.currProject,
  currGroup: state.group.currGroup,
})

const actions = {
  getProject,
  fetchGroupMsg,
  setBreadcrumb,
}

export default connect(states, actions)(Project) as any as typeof Project
