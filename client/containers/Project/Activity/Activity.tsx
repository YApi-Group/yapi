import './Activity.scss'
import { Button } from 'antd'
import PropTypes from 'prop-types'
import React, { PureComponent as Component } from 'react'
import { connect } from 'react-redux'

import { AnyFunc } from '@/types'

import { YapiTimeLine } from '../../../components/YapiTimeLine'

type PropTypes = {
  uid: string
  match: any
  curdata: any
  currProject: any
  getMockUrl: AnyFunc
}

class Activity extends Component<PropTypes> {
  render() {
    const { currProject } = this.props

    return (
      <div className="g-row">
        <section className="news-box m-panel">
          <div style={{ display: 'none' }} className="logHead">
            {/* <Breadcrumb />*/}
            <div className="projectDes">
              <p>高效、易用、可部署的API管理平台</p>
            </div>
            <div className="Mockurl">
              <span>Mock地址：</span>
              <p>
                {location.protocol
                  + '//'
                  + location.hostname
                  + (location.port !== '' ? ':' + location.port : '')
                  + `/mock/${currProject._id}${currProject.basepath}/yourPath`}
              </p>
              <Button type="primary">
                <a href={`/api/project/download?project_id=${this.props.match.params.id}`}>
                  下载Mock数据
                </a>
              </Button>
            </div>
          </div>
          <YapiTimeLine type={'project'} typeid={Number(this.props.match.params.id)} />
        </section>
      </div>
    )
  }
}

const states = (state:any) => ({
  uid: String(state.user.uid),
  curdata: state.inter.curdata,
  currProject: state.project.currProject,
})

export default connect(states)(Activity) as typeof Activity
