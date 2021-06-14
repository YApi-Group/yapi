import React, { PureComponent as Component } from 'react'
import { Tabs } from 'antd'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'

import ProjectMessage from './ProjectMessage/ProjectMessage.js'
import ProjectEnv from './ProjectEnv/index.js'
import ProjectRequest from './ProjectRequest/ProjectRequest'
import ProjectToken from './ProjectToken/ProjectToken'
import ProjectMock from './ProjectMock/index.js'

const TabPane = Tabs.TabPane
const plugin = require('@/plugin.js')

const routers = {}

import './Setting.scss'

@connect(state => ({
  curProjectRole: state.project.currProject.role,
}))
class Setting extends Component {
  static propTypes = {
    match: PropTypes.object,
    curProjectRole: PropTypes.string,
  };
  render() {
    const id = this.props.match.params.id
    plugin.emitHook('sub_setting_nav', routers)
    return (
      <div className="g-row">
        <Tabs type="card" className="has-affix-footer tabs-large">
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
            const C = routers[key].component
            return <TabPane tab={routers[key].name} key={routers[key].name}>
              <C projectId={Number(id)} />
            </TabPane>
          })}
        </Tabs>
      </div>
    )
  }
}

export default Setting
