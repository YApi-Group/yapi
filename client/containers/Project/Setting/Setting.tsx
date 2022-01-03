import { Tabs } from 'antd'
import PropTypes from 'prop-types'
import React, { PureComponent as Component } from 'react'
import { connect } from 'react-redux'

import plugin from '@/plugin.js'

import ProjectEnv from './ProjectEnv'
import ProjectMessage from './ProjectMessage/ProjectMessage'
import ProjectMock from './ProjectMock/index.js'
import ProjectRequest from './ProjectRequest/ProjectRequest'
import ProjectToken from './ProjectToken/ProjectToken'

const TabPane = Tabs.TabPane

const routers: { [key: string]: { name: string, component: Component } } = {}

import './Setting.scss'

type PropTypes = {
  match: any
  curProjectRole: string
}

class Setting extends Component<PropTypes> {
  render() {
    const id = this.props.match.params.id
    plugin.emitHook('sub_setting_nav', routers)
    return (
      <div className="g-row">
        <Tabs type="card" className="tabs-large" tabBarStyle={{ marginBottom: 0 }}>
          <TabPane tab="项目配置" key="1">
            <ProjectMessage projectId={Number(id)} />
          </TabPane>
          <TabPane tab="环境配置" key="2">
            <ProjectEnv projectId={Number(id)} />
          </TabPane>
          <TabPane tab="请求配置" key="3">
            <ProjectRequest projectId={Number(id)} />
          </TabPane>
          {this.props.curProjectRole !== 'guest' ? (
            <TabPane tab="token配置" key="4">
              <ProjectToken projectId={Number(id)} curProjectRole={this.props.curProjectRole} />
            </TabPane>
          ) : null}
          <TabPane tab="全局mock脚本" key="5">
            <ProjectMock projectId={Number(id)} />
          </TabPane>
          {Object.keys(routers).map(key => {
            const C: any = routers[key].component
            return (
              <TabPane tab={routers[key].name} key={routers[key].name}>
                <C projectId={Number(id)} />
              </TabPane>
            )
          })}
        </Tabs>
      </div>
    )
  }
}

const states = (state: any) => ({
  curProjectRole: state.project.currProject.role,
})

export default connect(states)(Setting) as any as typeof Setting
