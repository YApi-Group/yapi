import { Alert } from 'antd'
import React, { PureComponent as Component } from 'react'
import ReactDOM from 'react-dom'
import { connect } from 'react-redux'
import { Route, BrowserRouter } from 'react-router-dom'

import plugin from '@/plugin.js'

import { requireAuthentication } from './components/AuthenticatedComponent'
import Footer from './components/Footer/Footer'
import Header from './components/Header/Header'
import Loading from './components/Loading/Loading'
import MyPopConfirm from './components/MyPopConfirm/MyPopConfirm'
import Notify from './components/Notify/Notify'
import StatisticPage from './components/StatisticPage'
import User from './containers/User/User.jsx'
import { Home, Group, Project, Follows, AddProject, Login } from './containers/index'
import { checkLoginState } from './reducer/modules/user'

const LOADING_STATUS = 0

const alertContent = () => {
  const ua = window.navigator.userAgent
  const isChrome = ua.indexOf('Chrome') && (window as any).chrome
  if (!isChrome) {
    return (
      <Alert
        style={{ zIndex: 99 }}
        message={'YApi 的接口测试等功能仅支持 Chrome 浏览器，请使用 Chrome 浏览器获得完整功能。'}
        banner
        closable
      />
    )
  }
}

const appRoutes: { [K: string]: any } = {
  home: {
    path: '/',
    component: Home,
  },
  group: {
    path: '/group',
    component: Group,
  },
  project: {
    path: '/project/:id',
    component: Project,
  },
  user: {
    path: '/user',
    component: User,
  },
  follow: {
    path: '/follow',
    component: Follows,
  },
  addProject: {
    path: '/add-project',
    component: AddProject,
  },
  login: {
    path: '/login',
    component: Login,
  },
  statistic: {
    path: '/statistic',
    component: StatisticPage,
  },
}

// 增加路由钩子
plugin.emitHook('app_route', appRoutes)

type AppProps = {
  checkLoginState: () => any
  loginState: number
  curUserRole: string
}

class App extends Component<AppProps> {
  constructor(props: AppProps) {
    super(props)
    this.state = {
      login: LOADING_STATUS,
    }

    this.route.bind(this)
  }

  // static propTypes = {
  //   checkLoginState: PropTypes.func,
  //   loginState: PropTypes.number,
  //   curUserRole: PropTypes.string,
  // }

  componentDidMount() {
    this.props.checkLoginState()
  }

  showConfirm = (msg: any, callback: any) => {
    // 自定义 window.confirm
    // http://reacttraining.cn/web/api/BrowserRouter/getUserConfirmation-func
    const container = document.createElement('div')
    document.body.appendChild(container)
    ReactDOM.render(<MyPopConfirm msg={msg} callback={callback} />, container)
  }

  route(status: number) {
    if (status === LOADING_STATUS) { return <Loading visible /> }

    const r = (
      <BrowserRouter getUserConfirmation={this.showConfirm}>
        <div className="g-main">
          <div className="router-main">
            {this.props.curUserRole === 'admin' && <Notify />}
            {alertContent()}
            {this.props.loginState !== 1 ? <Header /> : null}
            <div className="router-container">
              {Object.keys(appRoutes).map(key => {
                const item = appRoutes[key]

                return key === 'login' ? (
                  <Route key={key} path={item.path} component={item.component} />
                ) : key === 'home' ? (
                  <Route key={key} exact path={item.path} component={item.component} />
                ) : (
                  <Route
                    key={key}
                    path={item.path}
                    component={requireAuthentication(item.component)}
                  />
                )
              })}
            </div>
            {/* <div className="router-container">
                <Route exact path="/" component={Home} />
                <Route path="/group" component={requireAuthentication(Group)} />
                <Route path="/project/:id" component={requireAuthentication(Project)} />
                <Route path="/user" component={requireAuthentication(User)} />
                <Route path="/follow" component={requireAuthentication(Follows)} />
                <Route path="/add-project" component={requireAuthentication(AddProject)} />
                <Route path="/login" component={Login} />
                {/* <Route path="/statistic" component={statisticsPage} /> */}
            {/* </div> */}
          </div>
          <Footer />
        </div>
      </BrowserRouter>
    )

    return r
  }

  render() {
    return this.route(this.props.loginState)
  }
}

const states = (state: any) => ({
  loginState: state.user.loginState,
  curUserRole: state.user.role,
})

const actions = {
  checkLoginState,
}

export default connect(states, actions)(App)
