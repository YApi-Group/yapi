import { Tabs } from 'antd'
import type { TabsProps } from 'antd'
import PropTypes from 'prop-types'
import React, { PureComponent as Component } from 'react'
import { connect } from 'react-redux'

import plugin from '@/plugin'

import { GenTsService } from './GenTsService'
import ProjectEnv from './ProjectEnv'
import ProjectMessage from './ProjectMessage/ProjectMessage'
import ProjectMock from './ProjectMock/index'
import ProjectRequest from './ProjectRequest/ProjectRequest'
import ProjectToken from './ProjectToken/ProjectToken'
import SwaggerAutoSync from './SwaggerAutoSync'

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

    const items: TabsProps['items'] = [
      {
        key: '1',
        label: '项目配置',
        children: <ProjectMessage projectId={Number(id)} />,
      },
      {
        key: '2',
        label: '环境配置',
        children: <ProjectEnv projectId={Number(id)} />,
      },
      {
        key: '3',
        label: '请求配置',
        children: <ProjectRequest projectId={Number(id)} />,
      },
      ...(this.props.curProjectRole !== 'guest'
        ? [{
            key: '4',
            label: 'token配置',
            children: <ProjectToken projectId={Number(id)} curProjectRole={this.props.curProjectRole} />,
          }]
        : []),
      {
        key: '5',
        label: '全局mock脚本',
        children: <ProjectMock projectId={Number(id)} />,
      },
      {
        key: '6',
        label: '生成 ts services',
        children: <GenTsService projectId={Number(id)} />,
      },
      {
        key: '7',
        label: 'Swagger自动同步',
        children: <SwaggerAutoSync projectId={Number(id)} />,
      },
      ...Object.keys(routers).map(key => {
        const C: any = routers[key].component
        return {
          key: routers[key].name,
          label: routers[key].name,
          children: <C projectId={Number(id)} />,
        }
      }),
    ]

    return (
      <div className="g-row">
        <Tabs type="card" className="tabs-large" tabBarStyle={{ marginBottom: 0 }} items={items} />
      </div>
    )
  }
}

const states = (state: any) => ({
  curProjectRole: state.project.currProject.role,
})

export default connect(states)(Setting) as any as typeof Setting
