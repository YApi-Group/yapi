import { Menu } from 'antd'
import { ItemType } from 'antd/lib/menu/hooks/useItems.js'
import React, { PureComponent as Component } from 'react'
import { connect } from 'react-redux'

import { fetchNewsData } from '../../../reducer/modules/news.js'
import { AnyFunc } from '../../../types'

const logList = [{ name: '用户' }, { name: '分组' }, { name: '接口' }, { name: '项目' }]

type PropTypes = {
  fetchNewsData: AnyFunc
  setLoading: AnyFunc
  uid: string
}

type StateTypes = {
  selectedKeys: number
}

class NewsList extends Component<PropTypes, StateTypes> {
  constructor(props: PropTypes) {
    super(props)
    this.state = {
      selectedKeys: 0,
    }

    this.getLogData = this.getLogData.bind(this)
  }

  getLogData(e: any) {
    // page,size,logId
    // console.log(e.key);
    this.setState({
      selectedKeys: Number(e.key),
    })

    this.props.setLoading(true)
    this.props
      .fetchNewsData(Number(this.props.uid), 0, 5)
      .then(() => {
        this.props.setLoading(false)
      })
  }

  render() {
    const menuItems: ItemType[] = logList.map((item, i) => ({
      key: i,
      // <Menu.Item key={i} className="log-item">
      label: item.name,
    }))

    return (
      <div className="logList">
        <h3>日志类型</h3>
        <Menu
          items={menuItems} 
          mode="inline"
          selectedKeys={[`${this.state.selectedKeys}`]}
          onClick={this.getLogData} 
        />
      </div>
    )
  }
}

const states = state => ({
  uid: String(state.user.uid),
  newsData: state.news.newsData,
})

const actions = {
  fetchNewsData,
}

export default connect(states, actions)(NewsList)
