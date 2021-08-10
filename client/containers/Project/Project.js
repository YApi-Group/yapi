import PropTypes from 'prop-types'
import React, { PureComponent as Component } from 'react'
import { connect } from 'react-redux'
import { Route, Switch, Redirect, matchPath } from 'react-router-dom'

import Loading from '../../components/Loading/Loading'
import { Subnav } from '../../components/index'
import { fetchGroupMsg } from '../../reducer/modules/group'
import { getProject } from '../../reducer/modules/project'
import { setBreadcrumb } from '../../reducer/modules/user'

import Activity from './Activity/Activity.js'
import Interface from './Interface/Interface.js'
import ProjectData from './Setting/ProjectData/ProjectData.js'
import ProjectMember from './Setting/ProjectMember/ProjectMember.js'
import Setting from './Setting/Setting.js'

const plugin = require('@/plugin.js')
@connect(
  state => ({
    curProject: state.project.currProject,
    currGroup: state.group.currGroup,
  }),
  {
    getProject,
    fetchGroupMsg,
    setBreadcrumb,
  },
)
export default class Project extends Component {
  static propTypes = {
    match: PropTypes.object,
    curProject: PropTypes.object,
    getProject: PropTypes.func,
    location: PropTypes.object,
    fetchGroupMsg: PropTypes.func,
    setBreadcrumb: PropTypes.func,
    currGroup: PropTypes.object,
  };

  constructor(props) {
    super(props)
  }

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

  async UNSAFE_componentWillReceiveProps(nextProps) {
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

    let key, defaultName
    for (key in routers) {
      if (
        matchPath(location.pathname, {
          path: routers[key].path,
        }) !== null
      ) {
        defaultName = routers[key].name
        break
      }
    }

    // let subnavData = [{
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

    let subnavData = []
    Object.keys(routers).forEach(key => {
      const item = routers[key]
      let value = {}
      if (key === 'interface') {
        value = {
          name: item.name,
          path: `/project/${match.params.id}/interface/api`,
        }
      } else {
        value = {
          name: item.name,
          path: item.path.replace(/\:id/gi, match.params.id),
        }
      }
      subnavData.push(value)
    })

    if (this.props.currGroup.type === 'private') {
      subnavData = subnavData.filter(item => item.name != '成员管理')
    }

    if (Object.keys(this.props.curProject).length === 0) {
      return <Loading visible />
    }

    return (
      <div>
        <Subnav default={defaultName} data={subnavData} />
        <Switch>
          <Redirect exact from="/project/:id" to={`/project/${match.params.id}/interface/api`} />
          {/* <Route path={routers.activity.path} component={Activity} />
          
          <Route path={routers.setting.path} component={Setting} />
          {this.props.currGroup.type !== 'private' ?
            <Route path={routers.members.path} component={routers.members.component}/>
            : null
          }

          <Route path={routers.data.path} component={ProjectData} /> */}
          {Object.keys(routers).map(key => {
            const item = routers[key]

            return key === 'members' ? (
              this.props.currGroup.type !== 'private' ? (
                <Route path={item.path} component={item.component} key={key} />
              ) : null
            ) : (
              <Route path={item.path} component={item.component} key={key} />
            )
          })}
        </Switch>
      </div>
    )
  }
}
