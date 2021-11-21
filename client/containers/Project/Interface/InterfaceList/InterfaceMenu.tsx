import {
  DeleteOutlined,
  CopyOutlined,
  FolderOutlined,
  FolderOpenOutlined,
  EditOutlined,
  PlusOutlined,
  //  EllipsisOutlined 
} from '@ant-design/icons'
import { Input, Button, Modal, message, Tree, Tooltip, TreeDataNode } from 'antd'
import axios from 'axios'
import produce from 'immer'
import PropTypes from 'prop-types'
import React, { ChangeEvent, PureComponent as Component } from 'react'
import { connect } from 'react-redux'
import { Link, withRouter } from 'react-router-dom'

import { AnyFunc } from '@/types'

import { arrayChangeIndex } from '../../../../common.js'
import {
  fetchInterfaceListMenu,
  fetchInterfaceList,
  fetchInterfaceCatList,
  fetchInterfaceData,
  deleteInterfaceData,
  deleteInterfaceCatData,
  initInterface,
} from '../../../../reducer/modules/interface.js'
import { getProject } from '../../../../reducer/modules/project.js'

import AddInterfaceCatForm from './AddInterfaceCatForm'
import AddInterfaceForm from './AddInterfaceForm'

import './interfaceMenu.scss'

const confirm = Modal.confirm
const headHeight = 240 // menu顶部到网页顶部部分的高度

type PropTypes = {
  match?: any
  inter?: any
  projectId?: string
  list?: any[]
  curProject?: any
  addInterfaceData?: AnyFunc
  history?: any
  router?: any

  fetchInterfaceListMenu?: AnyFunc
  fetchInterfaceData?: AnyFunc
  deleteInterfaceCatData?: AnyFunc
  deleteInterfaceData?: AnyFunc
  initInterface?: AnyFunc
  getProject?: AnyFunc
  fetchInterfaceCatList?: AnyFunc
  fetchInterfaceList?: AnyFunc
}

type StateTypes = {
  curKey: any
  visible: boolean
  delIcon: any
  curCatId: any
  add_cat_modal_visible: boolean
  change_cat_modal_visible: boolean
  del_cat_modal_visible: boolean
  curCatData: { [K: string]: any }
  expands: any
  filter: any
  list: any[]
}

class InterfaceMenu extends Component<PropTypes, StateTypes> {
  constructor(props: PropTypes) {
    super(props)
    this.state = {
      curKey: null,
      visible: false,
      delIcon: null,
      curCatId: null,
      add_cat_modal_visible: false,
      change_cat_modal_visible: false,
      del_cat_modal_visible: false,
      curCatData: {},
      expands: null,
      filter: null,
      list: [],
    }
  }

  changeModal = (key: string, status: boolean) => {
    // visible add_cat_modal_visible change_cat_modal_visible del_cat_modal_visible
    const newState: any = {}
    newState[key] = status
    this.setState(newState)
  }

  handleCancel = () => {
    this.setState({
      visible: false,
    })
  }

  handleRequest() {
    this.props.initInterface()
    this.getList()
  }

  async getList() {
    const r = await this.props.fetchInterfaceListMenu(this.props.projectId)
    this.setState({
      list: r.payload.data.data,
    })
  }

  UNSAFE_componentWillMount() {
    this.handleRequest()
  }

  UNSAFE_componentWillReceiveProps(nextProps: any) {
    if (this.props.list !== nextProps.list) {
      // console.log('next', nextProps.list)
      this.setState({
        list: nextProps.list,
      })
    }
  }

  onSelect = (selectedKeys: any) => {
    const { history, match } = this.props
    const curKey = selectedKeys[0]

    if (!curKey || !selectedKeys) {
      return false
    }
    const basepath = '/project/' + match.params.id + '/interface/api'
    if (curKey === 'root') {
      history.push(basepath)
    } else {
      history.push(basepath + '/' + curKey)
    }
    this.setState({
      expands: null,
    })
  }

  changeExpands = () => {
    this.setState({
      expands: null,
    })
  }

  handleAddInterface = (data: any, cb: AnyFunc) => {
    data.project_id = this.props.projectId
    axios.post('/api/interface/add', data).then(res => {
      if (res.data.errcode !== 0) {
        return message.error(res.data.errmsg)
      }
      message.success('接口添加成功')
      const interfaceId = res.data.data._id
      this.props.history.push('/project/' + this.props.projectId + '/interface/api/' + interfaceId)
      this.getList()
      this.setState({
        visible: false,
      })

      if (cb) { cb() }
    })
  }

  handleAddInterfaceCat = (data: any) => {
    data.project_id = this.props.projectId
    axios.post('/api/interface/add_cat', data).then(res => {
      if (res.data.errcode !== 0) {
        return message.error(res.data.errmsg)
      }
      message.success('接口分类添加成功')
      this.getList()
      this.props.getProject(data.project_id)
      this.setState({
        add_cat_modal_visible: false,
      })
    })
  }

  handleChangeInterfaceCat = (data: any) => {
    data.project_id = this.props.projectId

    const params = {
      catid: this.state.curCatData._id,
      name: data.name,
      desc: data.desc,
    }

    axios.post('/api/interface/up_cat', params).then(res => {
      if (res.data.errcode !== 0) {
        return message.error(res.data.errmsg)
      }
      message.success('接口分类更新成功')
      this.getList()
      this.props.getProject(data.project_id)
      this.setState({
        change_cat_modal_visible: false,
      })
    })
  }

  showConfirm = (data: any) => {
    const id = data._id
    const catid = data.catid
    const ref = confirm({
      title: '您确认删除此接口????',
      content: '温馨提示：接口删除后，无法恢复',
      okText: '确认',
      cancelText: '取消',
      onOk: async () => {
        await this.props.deleteInterfaceData(id, this.props.projectId)
        await this.getList()
        await this.props.fetchInterfaceCatList({ catid })
        ref.destroy()
        this.props.history.push('/project/' + this.props.match.params.id + '/interface/api/cat_' + catid)
      },
      onCancel() {
        ref.destroy()
      },
    })
  }

  showDelCatConfirm = (catid: string) => {
    const ref = confirm({
      title: '确定删除此接口分类吗？',
      content: '温馨提示：该操作会删除该分类下所有接口，接口删除后无法恢复',
      okText: '确认',
      cancelText: '取消',
      onOk: async () => {
        await this.props.deleteInterfaceCatData(catid, this.props.projectId)
        await this.getList()
        // await this.props.getProject(this.props.projectId)
        await this.props.fetchInterfaceList({ project_id: this.props.projectId })
        this.props.history.push('/project/' + this.props.match.params.id + '/interface/api')
        ref.destroy()
      },
      // onCancel() { },
    })
  }

  copyInterface = async (id: number) => {
    const interfaceData = await this.props.fetchInterfaceData(id)
    // let data = JSON.parse(JSON.stringify(interfaceData.payload.data.data));
    // data.title = data.title + '_copy';
    // data.path = data.path + '_' + Date.now();
    const data = interfaceData.payload.data.data
    const newData = produce(data, (draftData: any) => {
      draftData.title = draftData.title + '_copy'
      draftData.path = draftData.path + '_' + Date.now()
    })

    axios.post('/api/interface/add', newData).then(async res => {
      if (res.data.errcode !== 0) {
        return message.error(res.data.errmsg)
      }
      message.success('接口添加成功')
      const interfaceId = res.data.data._id
      await this.getList()
      this.props.history.push('/project/' + this.props.projectId + '/interface/api/' + interfaceId)
      this.setState({
        visible: false,
      })
    })
  }

  enterItem = (id: string) => {
    this.setState({ delIcon: id })
  }

  leaveItem = () => {
    this.setState({ delIcon: null })
  }

  onFilter = (e: ChangeEvent<HTMLInputElement>) => {
    this.setState({
      filter: e.target.value,
      list: JSON.parse(JSON.stringify(this.props.list)),
    })
  }

  onExpand = (e: any) => {
    this.setState({
      expands: e,
    })
  }

  onDrop = async (e: any) => {
    const dropCatIndex = e.node.props.pos.split('-')[1] - 1
    const dragCatIndex = e.dragNode.props.pos.split('-')[1] - 1
    if (dropCatIndex < 0 || dragCatIndex < 0) {
      return
    }
    const { list } = this.props
    const dropCatId = this.props.list[dropCatIndex]._id
    const id = e.dragNode.props.eventKey
    const dragCatId = this.props.list[dragCatIndex]._id

    const dropPos = e.node.props.pos.split('-')
    const dropIndex = Number(dropPos[dropPos.length - 1])
    const dragPos = e.dragNode.props.pos.split('-')
    const dragIndex = Number(dragPos[dragPos.length - 1])

    if (id.indexOf('cat') === -1) {
      if (dropCatId === dragCatId) {
        // 同一个分类下的接口交换顺序
        const colList = list[dropCatIndex].list
        const changes = arrayChangeIndex(colList, dragIndex, dropIndex)
        axios.post('/api/interface/up_index', changes).then()
      } else {
        await axios.post('/api/interface/up', { id, catid: dropCatId })
      }
      const { projectId, router } = this.props
      this.props.fetchInterfaceListMenu(projectId)
      this.props.fetchInterfaceList({ project_id: projectId })
      if (router && isNaN(router.params.actionId)) {
        // 更新分类list下的数据
        const catid = router.params.actionId.substr(4)
        this.props.fetchInterfaceCatList({ catid })
      }
    } else {
      // 分类之间拖动
      const changes = arrayChangeIndex(list, dragIndex - 1, dropIndex - 1)
      axios.post('/api/interface/up_cat_index', changes).then()
      this.props.fetchInterfaceListMenu(this.props.projectId)
    }
  }

  // 数据过滤
  filterList = (list: any) => {
    // const that = this
    const arr: any[] = []
    const menuList: any = produce(list, (draftList: any[]) => {
      draftList.filter(item => {
        let interfaceFilter = false
        // arr = [];
        if (item.name.indexOf(this.state.filter) === -1) {
          item.list = item.list.filter((inter: any) => {
            if (
              inter.title.indexOf(this.state.filter) === -1
              && inter.path.indexOf(this.state.filter) === -1
            ) {
              return false
            }
            // arr.push('cat_' + inter.catid)
            interfaceFilter = true
            return true
          })
          arr.push('cat_' + item._id)
          return interfaceFilter
        }
        arr.push('cat_' + item._id)
        return true
      })
    })

    return { menuList, arr }
  }

  private getDefaultKeys() {
    const { router, inter, list } = this.props
    const rNull: any = { expands: [], selects: [] }

    if (list.length === 0) { return rNull }

    if (router) {
      if (!isNaN(router.params.actionId)) {
        if (!inter || !inter._id) {
          return rNull
        }
        return {
          expands: this.state.expands ? this.state.expands : ['cat_' + inter.catid],
          selects: [String(inter._id)],
        }
      }
      const catid = router.params.actionId.substr(4)
      return {
        expands: this.state.expands ? this.state.expands : ['cat_' + catid],
        selects: ['cat_' + catid],
      }

    }
    return {
      expands: this.state.expands ? this.state.expands : ['cat_' + list[0]._id],
      selects: ['root'],
    }
  }

  render() {
    const matchParams = this.props.match.params

    const searchBox = (
      <div className="interface-filter">
        <Input onChange={this.onFilter} value={this.state.filter} placeholder="搜索接口" />
        <Button
          type="primary"
          onClick={() => this.changeModal('add_cat_modal_visible', true)}
          className="btn-filter"
        >
          添加分类
        </Button>
        {this.state.visible ? (
          <Modal
            title="添加接口"
            visible={this.state.visible}
            onCancel={() => this.changeModal('visible', false)}
            footer={null}
            className="addCatModal"
          >
            <AddInterfaceForm
              catdata={this.props.curProject.cat}
              catid={this.state.curCatId}
              onCancel={() => this.changeModal('visible', false)}
              onSubmit={this.handleAddInterface}
            />
          </Modal>
        ) : (
          ''
        )}

        {this.state.add_cat_modal_visible ? (
          <Modal
            title="添加分类"
            visible={this.state.add_cat_modal_visible}
            onCancel={() => this.changeModal('add_cat_modal_visible', false)}
            footer={null}
            className="addCatModal"
          >
            <AddInterfaceCatForm
              onCancel={() => this.changeModal('add_cat_modal_visible', false)}
              onSubmit={this.handleAddInterfaceCat}
            />
          </Modal>
        ) : (
          ''
        )}

        {this.state.change_cat_modal_visible ? (
          <Modal
            title="修改分类"
            visible={this.state.change_cat_modal_visible}
            onCancel={() => this.changeModal('change_cat_modal_visible', false)}
            footer={null}
            className="addCatModal"
          >
            <AddInterfaceCatForm
              catdata={this.state.curCatData}
              onCancel={() => this.changeModal('change_cat_modal_visible', false)}
              onSubmit={this.handleChangeInterfaceCat}
            />
          </Modal>
        ) : (
          ''
        )}
      </div>
    )

    const itemInterfaceCreate = (item: any) => ({
      key: String(item._id),
      title: (
        <div
          className="container-title"
          onMouseEnter={() => this.enterItem(item._id)}
          onMouseLeave={this.leaveItem}
        >
          <Link
            className="interface-item"
            onClick={e => e.stopPropagation()}
            to={'/project/' + matchParams.id + '/interface/api/' + item._id}
          >
            {item.title}
          </Link>
          <div className="btns">
            <Tooltip title="删除接口">
              <DeleteOutlined
                className="interface-delete-icon"
                onClick={e => {
                  e.stopPropagation()
                  this.showConfirm(item)
                }}
                style={{ display: this.state.delIcon === item._id ? 'block' : 'none' }}
              />
            </Tooltip>
            <Tooltip title="复制接口">
              <CopyOutlined
                className="interface-delete-icon"
                onClick={e => {
                  e.stopPropagation()
                  this.copyInterface(item._id)
                }}
                style={{ display: this.state.delIcon === item._id ? 'block' : 'none' }}
              />
            </Tooltip>
          </div>
        </div>
      ),
    })

    const currentKes = this.getDefaultKeys()
    // console.log(currentKes)

    let menuList: any[]
    if (this.state.filter) {
      const res = this.filterList(this.state.list)
      menuList = res.menuList
      currentKes.expands = res.arr
    } else {
      menuList = this.state.list
    }

    const treeData: TreeDataNode[] = [
      {
        key: 'root',
        title: (
          <Link
            onClick={e => {
              e.stopPropagation()
              this.changeExpands()
            }}
            to={'/project/' + matchParams.id + '/interface/api'}
          >
            <FolderOutlined style={{ marginRight: 5 }} />
            全部接口
          </Link>
        ),
      },
    ]

    for (const item of menuList) {
      treeData.push({
        key: 'cat_' + item._id,
        title: (
          <div
            className="container-title"
            onMouseEnter={() => this.enterItem(item._id)}
            onMouseLeave={this.leaveItem}
          >
            <Link
              className="interface-item"
              onClick={e => {
                e.stopPropagation()
                this.changeExpands()
              }}
              to={'/project/' + matchParams.id + '/interface/api/cat_' + item._id}
            >
              <FolderOpenOutlined style={{ marginRight: 5 }} />
              {item.name}
            </Link>

            <div className="btns" style={{ display: this.state.delIcon === item._id ? 'block' : 'none' }} >
              <Tooltip title="删除分类">
                <DeleteOutlined
                  className="interface-delete-icon"
                  onClick={e => {
                    e.stopPropagation()
                    this.showDelCatConfirm(item._id)
                  }}
                />
              </Tooltip>
              <Tooltip title="修改分类">
                <EditOutlined
                  className="interface-delete-icon"
                  onClick={e => {
                    e.stopPropagation()
                    this.changeModal('change_cat_modal_visible', true)
                    this.setState({
                      curCatData: item,
                    })
                  }}
                />
              </Tooltip>
              <Tooltip title="添加接口">
                <PlusOutlined
                  className="interface-delete-icon"
                  onClick={e => {
                    e.stopPropagation()
                    this.changeModal('visible', true)
                    this.setState({
                      curCatId: item._id,
                    })
                  }}
                />
              </Tooltip>
            </div>
          </div>
        ),

        // className={`interface-item-nav ${item.list.length ? '' : 'cat_switch_hidden'}`}
        children: item.list.map(itemInterfaceCreate),
      })
    }

    const maxHeight = document.body.clientHeight - headHeight + 'px'

    return (
      <div>
        {searchBox}
        {menuList.length > 0 ? (
          <div className="tree-wrappper" style={{ maxHeight }} >
            <Tree
              className="interface-list"
              treeData={treeData}
              defaultExpandedKeys={currentKes.expands}
              defaultSelectedKeys={currentKes.selects}
              expandedKeys={currentKes.expands}
              selectedKeys={currentKes.selects}
              onSelect={this.onSelect}
              onExpand={this.onExpand}
              onDrop={this.onDrop}
              draggable
              blockNode
            />
          </div>
        ) : null}
      </div>
    )
  }
}

const states = (state: any) => ({
  list: state.inter.list,
  inter: state.inter.curdata,
  curProject: state.project.currProject,
  expands: [] as any[],
})

const actions = {
  fetchInterfaceListMenu,
  fetchInterfaceData,
  deleteInterfaceCatData,
  deleteInterfaceData,
  initInterface,
  getProject,
  fetchInterfaceCatList,
  fetchInterfaceList,
}

export default connect(states, actions)(withRouter(InterfaceMenu as any)) as typeof InterfaceMenu
