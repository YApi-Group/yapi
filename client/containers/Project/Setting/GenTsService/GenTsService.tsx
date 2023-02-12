import PropTypes from 'prop-types'
import React, { PureComponent as Component } from 'react'
import { connect } from 'react-redux'

import { getToken } from '@/reducer/modules/project'
import { AnyFunc } from '@/types'

import styles from './gts.module.less'

type PropTypes = {
  projectId: number
  token?: string
  getToken?: AnyFunc
}

class GenTsService extends Component<PropTypes> {
  async componentDidMount() {
    const id = this.props.projectId
    await this.props.getToken(id)
  }

  render() {
    const id = this.props.projectId
    return (
      <div className={styles.psMain}>
        <section className="news-box m-panel">
          <div className="token">
            <h5>安装工具</h5>
            <pre>{`
  npm i sm2tsservice -D
  `}</pre>
            <h5>配置【3.2.0及以上版本】</h5>
            <pre>{`
  touch json2service.json
  `}</pre>
            <pre>
              {`
  {
    "url": "yapi-swagger.json",
    "remoteUrl": "${location.protocol}//${location.hostname}${
                location.port ? `:${location.port}` : ''
              }/api/open/export-full?type=json&pid=${id}&status=all&token=${this.props.token}",
    "type": "yapi",
    "swaggerParser": {}
  }
  `}
            </pre>
            <h5>配置【3.2.0以下版本】</h5>
            <pre>{`
  touch json2service.json
  `}</pre>
            <pre>
              {`
  {
    "url": "${location.protocol}//${location.hostname}${
                location.port ? `:${location.port}` : ''
              }/api/open/export-full?type=json&pid=${id}&status=all&token=${this.props.token}",
    "type": "yapi",
    "swaggerParser": {}
  }
  `}
            </pre>
            <h5>生成services代码</h5>
            <pre>{`
  (./node_modules/.bin/)sm2tsservice --clear
  `}</pre>
          </div>
          <a href="https://github.com/gogoyqj/sm2tsservice">更多说明 sm2tsservice</a>
        </section>
      </div>
    )
  }
}

const states = (state: any) => ({
  token: state.project.token,
})
const actions = {
  getToken,
}

export default connect(states, actions)(GenTsService) as any as typeof GenTsService
