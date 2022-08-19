import { Tabs, Layout } from 'antd'
import { ReactComponentLike } from 'prop-types'
import React, { PureComponent as Component } from 'react'
import { connect } from 'react-redux'
import { Route, Switch, matchPath } from 'react-router-dom'

import { AnyFunc } from '@/types'

import { setColData } from '../../../reducer/modules/interfaceCol'
import { getProject } from '../../../reducer/modules/project'

import InterfaceCaseContent from './InterfaceCol/InterfaceCaseContent'
import InterfaceColContent from './InterfaceCol/InterfaceColContent'
import InterfaceColMenu from './InterfaceCol/InterfaceColMenu'
import InterfaceContent from './InterfaceList/InterfaceContent'
import InterfaceList from './InterfaceList/InterfaceList'
import InterfaceMenu from './InterfaceList/InterfaceMenu'

import './interface.scss'

const { Content, Sider } = Layout

const contentRouter = {
  path: '/project/:id/interface/:action/:actionId',
  exact: true,
}

type PropTypes1 = {
  match: any
  history: any
}

const InterfaceRoute = (props: PropTypes1) => {
  let C: ReactComponentLike
  if (props.match.params.action === 'api') {
    if (!props.match.params.actionId) {
      // C = <InterfaceList {...props} />
      C = InterfaceList
    } else if (!isNaN(props.match.params.actionId)) {
      C = InterfaceContent
    } else if (props.match.params.actionId.indexOf('cat_') === 0) {
      C = InterfaceList
    }
  } else if (props.match.params.action === 'col') {
    C = InterfaceColContent
  } else if (props.match.params.action === 'case') {
    C = InterfaceCaseContent
  } else {
    const params = props.match.params
    props.history.replace('/project/' + params.id + '/interface/api')
    return null
  }

  return <C {...props} />
}

type PropTypes = {
  match?: any
  history?: any
  location?: any
  isShowCol?: boolean
  getProject?: AnyFunc
  setColData?: AnyFunc
  // fetchInterfaceColList: PropTypes.func
}

class Interface extends Component<PropTypes> {
  onChange = (action: string) => {
    const params = this.props.match.params
    if (action === 'colOrCase') {
      action = this.props.isShowCol ? 'col' : 'case'
    }
    this.props.history.push('/project/' + params.id + '/interface/' + action)
  }

  // async UNSAFE_componentWillMount() {
  UNSAFE_componentWillMount() {
    this.props.setColData({
      isShowCol: true,
    })
    // await this.props.fetchInterfaceColList(this.props.match.params.id)
  }

  render() {
    const { action } = this.props.match.params
    // const activeKey = this.state.curkey;
    const activeKey = action === 'api' ? 'api' : 'colOrCase'

    return (
      <Layout style={{ minHeight: 'calc(100vh - 156px)', marginLeft: '24px', marginTop: '24px' }}>
        <Sider style={{ height: '100%' }} width={300}>
          <div className="left-menu">
            <Tabs type="card" className="tabs-large" tabBarGutter={0} activeKey={activeKey} onChange={this.onChange}>
              <Tabs.TabPane tab="接口列表" key="api" />
              <Tabs.TabPane tab="测试集合" key="colOrCase" />
            </Tabs>
            {activeKey === 'api' ? (
              <InterfaceMenu
                router={matchPath(this.props.location.pathname, contentRouter)}
                projectId={this.props.match.params.id}
              />
            ) : (
              <InterfaceColMenu
                router={matchPath(this.props.location.pathname, contentRouter)}
              />
            // projectId={this.props.match.params.id}
            )}
          </div>
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
            <div className="right-content">
              <Switch>
                <Route exact path="/project/:id/interface/:action" component={InterfaceRoute} />
                <Route {...contentRouter} component={InterfaceRoute} />
              </Switch>
            </div>
          </Content>
        </Layout>
      </Layout>
    )
  }
}

const states = (state: any) => ({
  isShowCol: state.interfaceCol.isShowCol,
})

const actions = {
  setColData,
  getProject,
}

export default connect(states, actions)(Interface) as any as typeof Interface
