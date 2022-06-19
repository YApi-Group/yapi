import { SearchOutlined } from '@ant-design/icons'
import { Input, AutoComplete } from 'antd'
import axios from 'axios'
import PropTypes from 'prop-types'
import React, { PureComponent as Component } from 'react'
import { connect } from 'react-redux'
import { withRouter } from 'react-router-dom'

import { AnyFunc } from '@/types'

import { setCurrGroup, fetchGroupMsg } from '../../../reducer/modules/group'
import { fetchInterfaceListMenu } from '../../../reducer/modules/interface'
import { changeMenuItem } from '../../../reducer/modules/menu'

import './Search.scss'

type PropTypes = {
  groupList?: any[]
  projectList?: any[]
  router?: any
  history?: any
  location?: any
  setCurrGroup?: AnyFunc
  changeMenuItem?: AnyFunc
  fetchInterfaceListMenu?: AnyFunc
  fetchGroupMsg?: AnyFunc
}

type StateTypes = {
  dataSource: any[]
}

class Search extends Component<PropTypes, StateTypes> {
  constructor(props: PropTypes) {
    super(props)

    this.state = {
      dataSource: [],
    }

    this.onSelect = this.onSelect.bind(this)
    this.handleSearch = this.handleSearch.bind(this)
  }

  async onSelect(value: string, option: any) {
    console.log(option)
    if (option.props.type === 'group') {
      this.props.changeMenuItem('/group')
      this.props.history.push('/group/' + option.props.id)
      this.props.setCurrGroup({ group_name: value, _id: option.props.id - 0 })
    } else if (option.props.type === 'project') {
      await this.props.fetchGroupMsg(option.props.groupId)
      this.props.history.push('/project/' + option.props.id)
    } else if (option.props.type === 'interface') {
      await this.props.fetchInterfaceListMenu(option.props.projectId)
      this.props.history.push('/project/' + option.props.projectId + '/interface/api/' + option.props.id)
    }
  }

  handleSearch(value: string) {
    axios
      .get('/api/project/search?q=' + value)
      .then(res => {
        if (res.data && res.data.errcode === 0) {
          const dataSource: any[] = []

          for (const [title, items] of Object.entries(res.data.data)) {
            (items as any[]).map(item => {
              switch (title) {
                case 'group':
                  dataSource.push({
                    value: `分组: ${item.groupName} <${item._id}>`,
                    type: 'group',
                    id: item._id,
                  })
                  break
                case 'project':
                  dataSource.push({
                    value: `项目: ${item.name} <${item._id}>`,
                    type: 'project',
                    groupId: item.groupId,
                    id: item._id,
                  })
                  break
                case 'interface':
                  dataSource.push({
                    value: `接口: ${item.title} <${item._id}>`,
                    type: 'interface',
                    projectId: item.projectId,
                    id: item._id,
                  })
                  break
                default:
                  break
              }
            })
          }

          this.setState({ dataSource: dataSource })
        } else {
          console.log('查询项目或分组失败')
        }
      })
      .catch(err => {
        console.log(err)
      })
  }

  // getDataSource(groupList){
  //   const groupArr =[];
  //   groupList.forEach(item =>{
  //     groupArr.push("group: "+ item["group_name"]);
  //   })
  //   return groupArr;
  // }

  render() {
    const { dataSource } = this.state

    return (
      <div className="search-wrapper">
        {/* TODO 这个应该改为 Select */}
        <AutoComplete
          className="search-dropdown"
          options={dataSource}
          style={{ width: '100%' }}
          defaultActiveFirstOption={false}
          onSelect={this.onSelect}
          onSearch={this.handleSearch}
        >
          <Input
            prefix={<SearchOutlined className="srch-icon" />}
            placeholder="搜索分组/项目/接口"
            className="search-input"
          />
        </AutoComplete>
      </div>
    )
  }
}

const states = (state: any) => ({
  groupList: state.group.groupList,
  projectList: state.project.projectList,
})

const actions = {
  setCurrGroup,
  changeMenuItem,
  fetchGroupMsg,
  fetchInterfaceListMenu,
}

export default connect(states, actions)(withRouter(Search as any)) as any as typeof Search
