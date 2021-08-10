import './News.scss'
import { Button } from 'antd'
import PropTypes from 'prop-types'
import React, { PureComponent as Component } from 'react'
import { connect } from 'react-redux'

import Breadcrumb from '../../components/Breadcrumb/Breadcrumb'
import Subnav from '../../components/Subnav/Subnav.js'
import { getMockUrl } from '../../reducer/modules/news.js'

import NewsTimeline from './NewsTimeline/NewsTimeline'

@connect(
  state => ({
    uid: String(state.user.uid),
  }),
  {
    getMockUrl: getMockUrl,
  },
)
class News extends Component {
  constructor(props) {
    super(props)
    this.state = {
      mockURL: '',
    }
  }
  static propTypes = {
    uid: PropTypes.string,
    getMockUrl: PropTypes.func,
  };
  UNSAFE_componentWillMount() {
    // const that = this;
    // this.props.getMockUrl(2724).then(function(data){
    //   const { prd_host, basepath, protocol } = data.payload.data.data;
    //   const mockURL = `${protocol}://${prd_host}${basepath}/{path}`;
    //   that.setState({
    //     mockURL: mockURL
    //   })
    // })
  }
  render() {
    return (
      <div>
        <Subnav
          default={'动态'}
          data={[
            {
              name: '动态',
              path: '/news',
            },
            {
              name: '测试',
              path: '/follow',
            },
            {
              name: '设置',
              path: '/follow',
            },
          ]}
        />
        <div className="g-row">
          <section className="news-box m-panel">
            <div className="logHead">
              <Breadcrumb />
              <div className="Mockurl">
                <span>Mock地址：</span>
                <p>{this.state.mockURL}</p>
                <Button type="primary">下载Mock数据</Button>
              </div>
            </div>
            <NewsTimeline />
          </section>
        </div>
      </div>
    )
  }
}

export default News
