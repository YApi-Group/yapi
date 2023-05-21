import { Table, Popconfirm, message, Input } from 'antd'
import axios from 'axios'
import PropTypes from 'prop-types'
import React, { PureComponent as Component } from 'react'
import { connect } from 'react-redux'
import { Link } from 'react-router-dom'

import { AnyFunc } from '@/types.js'

import { formatTime } from '../../common.js'
import { setBreadcrumb } from '../../reducer/modules/user'

// import PropTypes from 'prop-types'

const Search = Input.Search
const limit = 20

type ItemPart = {
  _id: number
  username: string
}

type PropsType = {
  curUserRole: string
  setBreadcrumb: AnyFunc
}
type StateType = {
  data: any[]
  total: number | null
  current: number
  backups: any[]
  isSearch: boolean
}
// @connect(
//   state => ({
//     curUserRole: state.user.role,
//   }),
//   {
//     setBreadcrumb,
//   },
// )
class List extends Component<PropsType, StateType> {
  constructor(props: PropsType) {
    super(props)
    this.state = {
      data: [],
      total: null,
      current: 1,
      backups: [],
      isSearch: false,
    }
  }
  static propTypes = {
    setBreadcrumb: PropTypes.func,
    curUserRole: PropTypes.string,
  }

  changePage = (current: number) => {
    this.setState({ current: current }, this.getUserList)
  }

  getUserList() {
    axios.get('/api/user/list?page=' + this.state.current + '&limit=' + limit).then(res => {
      const result = res.data

      if (result.errcode === 0) {
        const list = result.data.list as any[]
        const total = result.data.count
        list.map((item, index) => {
          item.key = index
          item.up_time = formatTime(item.up_time)
        })
        this.setState({
          data: list,
          total: total,
          backups: list,
        })
      }
    })
  }

  componentDidMount() {
    this.getUserList()
  }

  confirm = (uid: number) => {
    axios
      .post('/api/user/del', {
        id: uid,
      })
      .then(
        res => {
          if (res.data.errcode === 0) {
            message.success('已删除此用户')
            let users = this.state.data
            users = users.filter(item => item._id !== uid)
            this.setState({
              data: users,
            })
          } else {
            message.error(res.data.errmsg)
          }
        },
        err => {
          message.error(err.message)
        }
      )
  }

  async UNSAFE_componentWillMount() {
    this.props.setBreadcrumb([{ name: '用户管理' }])
  }

  handleSearch = (value: string) => {
    const params = { q: value }
    if (params.q !== '') {
      axios.get('/api/user/search', { params }).then(data => {
        const userList: any[] = []

        data = data.data.data
        if (data) {
          ;(data as any).forEach((v: any) =>
            userList.push({
              ...v,
              _id: v.uid,
            })
          )
        }

        this.setState({
          data: userList,
          isSearch: true,
        })
      })
    } else {
      this.setState({
        data: this.state.backups,
        isSearch: false,
      })
    }
  }

  render() {
    const role = this.props.curUserRole
    let data = []
    if (role === 'admin') {
      data = this.state.data
    }
    let columns = [
      {
        title: '用户名',
        dataIndex: 'username',
        key: 'username',
        width: 180,
        render: (_: any, item: ItemPart) => <Link to={'/user/profile/' + item._id}>{item.username}</Link>,
      },
      {
        title: 'Email',
        dataIndex: 'email',
        key: 'email',
      },
      {
        title: '用户角色',
        dataIndex: 'role',
        key: 'role',
        width: 150,
      },
      {
        title: '更新日期',
        dataIndex: 'up_time',
        key: 'up_time',
        width: 160,
      },
      {
        title: '功能',
        key: 'action',
        width: '90px',
        render: (item: ItemPart) => (
          <span>
            {/* <span className="ant-divider" /> */}
            <Popconfirm
              title="确认删除此用户?"
              onConfirm={() => {
                this.confirm(item._id)
              }}
              okText="确定"
              cancelText="取消"
            >
              <a style={{ display: 'block', textAlign: 'center' }} href="#">
                删除
              </a>
            </Popconfirm>
          </span>
        ),
      },
    ]

    columns = columns.filter(item => {
      if (item.key === 'action' && role !== 'admin') {
        return false
      }
      return true
    })

    const pageConfig = {
      total: this.state.total,
      pageSize: limit,
      current: this.state.current,
      onChange: this.changePage,
    }

    const defaultPageConfig = {
      total: this.state.data.length,
      pageSize: limit,
      current: 1,
    }

    return (
      <section className="user-table">
        <div className="user-search-wrapper">
          <h2 style={{ marginBottom: '10px' }}>用户总数：{this.state.total}位</h2>
          <Search
            onChange={e => this.handleSearch(e.target.value)}
            onSearch={this.handleSearch}
            placeholder="请输入用户名"
          />
        </div>
        <Table
          bordered={true}
          rowKey={record => record._id}
          columns={columns}
          pagination={this.state.isSearch ? defaultPageConfig : pageConfig}
          dataSource={data}
        />
      </section>
    )
  }
}

const states = (state: any) => ({
  curUserRole: state.user.role,
})

const actions = {
  setBreadcrumb,
}

export default connect(states, actions)(List)
