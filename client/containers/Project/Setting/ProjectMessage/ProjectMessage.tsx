import {
  CheckOutlined,
  CodeOutlined,
  LockOutlined,
  QuestionCircleOutlined,
  UnlockOutlined,
  ExclamationCircleOutlined,
  UpOutlined,
  DownOutlined,
  StarOutlined,
  SaveOutlined,
} from '@ant-design/icons'
import {
  Form,
  Input,
  Switch,
  Select,
  Tooltip,
  Button,
  Row,
  Col,
  message,
  Card,
  Radio,
  Alert,
  Modal,
  Popover,
  FormInstance,
  RadioChangeEvent,
} from 'antd'
import PropTypes from 'prop-types'
import React, { createRef, MouseEvent, PureComponent as Component, RefObject } from 'react'
import { connect } from 'react-redux'
import { withRouter } from 'react-router-dom'

import constants from '@/cons'
import { AnyFunc } from '@/types'

import { nameLengthLimit, entries, trim, htmlFilter } from '../../../../common'
import { fetchGroupMsg } from '../../../../reducer/modules/group'
import { fetchGroupList } from '../../../../reducer/modules/group.js'
import { updateProject, delProject, getProject, upsetProject } from '../../../../reducer/modules/project'
import { setBreadcrumb } from '../../../../reducer/modules/user'

import ProjectTag from './ProjectTag'

const { TextArea } = Input
const FormItem = Form.Item
const RadioGroup = Radio.Group
const RadioButton = Radio.Button
const confirm = Modal.confirm

import '../Setting.scss'

// layout
const formItemLayout = {
  labelCol: {
    lg: { offset: 1, span: 3 },
    xs: { span: 24 },
    sm: { span: 6 },
  },
  wrapperCol: {
    lg: { span: 19 },
    xs: { span: 24 },
    sm: { span: 14 },
  },
  className: 'form-item',
}

const Option = Select.Option

type PropTypes = {
  projectId?: number
  form?: any
  updateProject?: AnyFunc
  delProject?: AnyFunc
  getProject?: AnyFunc
  history?: any
  fetchGroupMsg?: AnyFunc
  upsetProject?: AnyFunc
  groupList?: any[]
  projectList?: any[]
  projectMsg?: any
  fetchGroupList?: AnyFunc
  currGroup?: any
  setBreadcrumb?: AnyFunc
}

type StateTypes = {
  protocol: 'http://' | 'https://'
  projectMsg: any
  showDangerOptions: boolean
}

class ProjectMessage extends Component<PropTypes, StateTypes> {
  tagRef: RefObject<ProjectTag>
  formRef: RefObject<FormInstance>

  constructor(props: PropTypes) {
    super(props)

    this.tagRef = createRef()
    this.formRef = createRef()

    this.state = {
      protocol: 'http://',
      projectMsg: {},
      showDangerOptions: false,
    }
  }

  // 确认修改
  handleOk = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()

    const { updateProject, projectMsg, groupList } = this.props
    this.formRef.current.validateFields().then(values => {
      let { tag } = this.tagRef.current.state
      // let tag = this.refs.tag;
      tag = tag.filter(val => val.name !== '')
      const assignValue = Object.assign(projectMsg, values, { tag })

      values.protocol = this.state.protocol.split(':')[0]
      const group_id = assignValue.group_id
      const selectGroup = groupList.find(item => item._id === Number(group_id))
      // console.log(111, groupList, group_id)

      updateProject(assignValue).then((res: any) => {
        if (res.payload.data.errcode === 0) {
          this.props.getProject(this.props.projectId)
          message.success('修改成功! ')

          // 如果如果项目所在的分组位置发生改变
          this.props.fetchGroupMsg(group_id)
          // this.props.history.push('/group');
          const projectName = htmlFilter(assignValue.name)
          this.props.setBreadcrumb([
            { name: selectGroup.group_name, href: '/group/' + group_id },
            { name: projectName },
          ])
        }
      })

      this.formRef.current.resetFields()
    })
  }

  showConfirm = () => {
    confirm({
      title: '确认删除 ' + this.props.projectMsg.name + ' 项目吗？',
      content: (
        <div style={{ marginTop: '10px', fontSize: '13px', lineHeight: '25px' }}>
          <Alert message="警告：此操作非常危险,会删除该项目下面所有接口，并且无法恢复!" type="warning" banner />
          <div style={{ marginTop: '16px' }}>
            <p style={{ marginBottom: '8px' }}>
              <b>请输入项目名称确认此操作:</b>
            </p>
            <Input id="project_name" size="large" />
          </div>
        </div>
      ),
      onOk: () => {
        const groupName = trim((document.getElementById('project_name') as any).value)
        if (this.props.projectMsg.name !== groupName) {
          message.error('项目名称有误')
          return new Promise((resolve, reject) => {
            reject('error')
          })
        }
        this.props.delProject(this.props.projectId).then((res: any) => {
          if (res.payload.data.errcode === 0) {
            message.success('删除成功!')
            this.props.history.push('/group/' + this.props.projectMsg.group_id)
          }
        })
      },
    })
  }

  // 修改项目头像的背景颜色
  changeProjectColor = (e: RadioChangeEvent) => {
    const { _id, color, icon } = this.props.projectMsg
    this.props.upsetProject({ id: _id, color: e.target.value || color, icon }).then((res: any) => {
      if (res.payload.data.errcode === 0) {
        this.props.getProject(this.props.projectId)
      }
    })
  }
  // 修改项目头像的图标
  changeProjectIcon = (e: RadioChangeEvent) => {
    const { _id, color, icon } = this.props.projectMsg
    this.props.upsetProject({ id: _id, color, icon: e.target.value || icon }).then((res: any) => {
      if (res.payload.data.errcode === 0) {
        this.props.getProject(this.props.projectId)
      }
    })
  }

  // 点击“查看危险操作”按钮
  toggleDangerOptions = () => {
    // console.log(this.state.showDangerOptions);
    this.setState({
      showDangerOptions: !this.state.showDangerOptions,
    })
  }

  async UNSAFE_componentWillMount() {
    await this.props.fetchGroupList()
    await this.props.fetchGroupMsg(this.props.projectMsg.group_id)
  }

  render() {
    const { projectMsg, currGroup } = this.props
    const mockUrl
      = location.protocol
      + '//'
      + location.hostname
      + (location.port !== '' ? ':' + location.port : '')
      + `/mock/${projectMsg._id}${projectMsg.basepath}+$接口请求路径`

    const { name, basepath, desc, project_type, group_id, switch_notice, strice, is_json5, tag } = projectMsg

    const initFormValues = {
      name,
      basepath,
      desc,
      project_type,
      group_id,
      switch_notice,
      strice,
      is_json5,
      tag,
    }

    const colorArr = entries(constants.PROJECT_COLOR)
    const colorSelector = (
      <RadioGroup onChange={this.changeProjectColor} value={projectMsg.color} className="color">
        {colorArr.map((item, index) => (
          <RadioButton
            key={index}
            value={item[0]}
            style={{ backgroundColor: item[1], color: '#fff', fontWeight: 'bold' }}
          >
            {item[0] === projectMsg.color ? <CheckOutlined /> : null}
          </RadioButton>
        ))}
      </RadioGroup>
    )
    const iconSelector = (
      <RadioGroup onChange={this.changeProjectIcon} value={projectMsg.icon} className="icon">
        {constants.PROJECT_ICON.map(item => (
          <RadioButton key={item} value={item} style={{ fontWeight: 'bold' }}>
            {/* {TODO} */}
            {/* <Icon type={item} /> */}
            <CodeOutlined />
          </RadioButton>
        ))}
      </RadioGroup>
    )
    const selectDisabled = projectMsg.role === 'owner' || projectMsg.role === 'admin'
    return (
      <div>
        <div className="m-panel">
          <Row className="project-setting">
            <Col xs={6} lg={{ offset: 1, span: 3 }} className="setting-logo">
              <Popover
                placement="bottom"
                title={colorSelector}
                content={iconSelector}
                trigger="click"
                overlayClassName="change-project-container"
              >
                {/* <Icon
                  type={projectMsg.icon || 'star-o'}
                  className="ui-logo"
                  style={{
                    backgroundColor:
                      constants.PROJECT_COLOR[projectMsg.color] || constants.PROJECT_COLOR.blue,
                  }}
                /> */}
                <StarOutlined
                  className="ui-logo"
                  style={{
                    backgroundColor: (constants.PROJECT_COLOR as any)[projectMsg.color] || constants.PROJECT_COLOR.blue,
                  }}
                />
              </Popover>
            </Col>
            <Col xs={18} sm={15} lg={19} className="setting-intro">
              <h2 className="ui-title">{(currGroup.group_name || '') + ' / ' + (projectMsg.name || '')}</h2>
              {/* <p className="ui-desc">{projectMsg.desc}</p> */}
            </Col>
          </Row>
          <hr className="breakline" />
          <Form ref={this.formRef}>
            <FormItem {...formItemLayout} label="项目ID">
              <span>{this.props.projectMsg._id}</span>
            </FormItem>
            <FormItem
              {...formItemLayout}
              label="项目名称"
              name="name"
              initialValue={initFormValues.name}
              rules={nameLengthLimit('项目')}
            >
              <Input placeholder="请输入" />
            </FormItem>
            <FormItem
              {...formItemLayout}
              label="所属分组"
              name="group_id"
              initialValue={String(initFormValues.group_id)}
              rules={[{ required: true, message: '请选择项目所属的分组!' }]}
            >
              <Select disabled={!selectDisabled} placeholder="请选择">
                {this.props.groupList.map((item, index) => (
                  <Option value={item._id.toString()} key={index}>
                    {item.group_name}
                  </Option>
                ))}
              </Select>
            </FormItem>

            <FormItem
              {...formItemLayout}
              label={
                <span>
                  接口基本路径&nbsp;
                  <Tooltip title="基本路径为空表示根路径">
                    <QuestionCircleOutlined />
                  </Tooltip>
                </span>
              }
              name="basepath"
              initialValue={initFormValues.basepath}
              rules={[{ required: false, message: '请输入基本路径! ' }]}
            >
              <Input />
            </FormItem>

            <FormItem
              {...formItemLayout}
              label={
                <span>
                  MOCK地址&nbsp;
                  <Tooltip title="具体使用方法请查看文档">
                    <QuestionCircleOutlined />
                  </Tooltip>
                </span>
              }
            >
              <Input
                disabled
                value={mockUrl}
                onChange={() => {
                  /* noop */
                }}
              />
            </FormItem>

            <FormItem
              {...formItemLayout}
              label="描述"
              name="desc"
              initialValue={initFormValues.desc}
              rules={[{ required: false }]}
            >
              <TextArea rows={8} />
            </FormItem>

            <FormItem
              {...formItemLayout}
              label={
                <span>
                  tag 信息&nbsp;
                  <Tooltip title="定义 tag 信息，过滤接口">
                    <QuestionCircleOutlined />
                  </Tooltip>
                </span>
              }
            >
              <ProjectTag tagMsg={tag} ref={this.tagRef} />
            </FormItem>
            <FormItem
              {...formItemLayout}
              label={
                <span>
                  mock严格模式&nbsp;
                  <Tooltip title="开启后 mock 请求会对 query，body form 的必须字段和 json schema 进行校验">
                    <QuestionCircleOutlined />
                  </Tooltip>
                </span>
              }
              name="strice"
              valuePropName="checked"
              initialValue={initFormValues.strice}
            >
              <Switch checkedChildren="开" unCheckedChildren="关" />
            </FormItem>
            <FormItem
              {...formItemLayout}
              label={
                <span>
                  开启json5&nbsp;
                  <Tooltip title="开启后可在接口 body 和返回值中写 json 字段">
                    <QuestionCircleOutlined />
                  </Tooltip>
                </span>
              }
              name="is_json5"
              valuePropName="checked"
              initialValue={initFormValues.is_json5}
            >
              <Switch checkedChildren="开" unCheckedChildren="关" />
            </FormItem>
            <FormItem
              {...formItemLayout}
              label="默认开启消息通知"
              name="switch_notice"
              valuePropName="checked"
              initialValue={initFormValues.switch_notice}
            >
              <Switch checkedChildren="开" unCheckedChildren="关" />
            </FormItem>

            <FormItem
              {...formItemLayout}
              label="权限"
              name="project_type"
              rules={[{ required: true }]}
              initialValue={initFormValues.project_type}
            >
              <RadioGroup>
                <Radio value="private" className="radio">
                  <LockOutlined />
                  私有
                  <br />
                  <span className="radio-desc">只有组长和项目开发者可以索引并查看项目信息</span>
                </Radio>
                <br />
                {projectMsg.role === 'admin' && (
                  <Radio value="public" className="radio">
                    <UnlockOutlined />
                    公开
                    <br />
                    <span className="radio-desc">任何人都可以索引并查看项目信息</span>
                  </Radio>
                )}
              </RadioGroup>
            </FormItem>
          </Form>

          <div className="btnwrap-changeproject">
            <Button
              className="m-btn btn-save"
              icon={<SaveOutlined />}
              type="primary"
              size="large"
              onClick={this.handleOk}
            >
              保 存
            </Button>
          </div>

          {/* 只有组长和管理员有权限删除项目 */}
          {projectMsg.role === 'owner' || projectMsg.role === 'admin' ? (
            <div className="danger-container">
              <div className="title">
                <h2 className="content">
                  <ExclamationCircleOutlined /> 危险操作
                </h2>
                <Button onClick={this.toggleDangerOptions}>
                  查 看{this.state.showDangerOptions ? <UpOutlined /> : <DownOutlined />}
                </Button>
              </div>
              {this.state.showDangerOptions ? (
                <Card hoverable={true} className="card-danger">
                  <div className="card-danger-content">
                    <h3>删除项目</h3>
                    <p>项目一旦删除，将无法恢复数据，请慎重操作！</p>
                    <p>只有组长和管理员有权限删除项目。</p>
                  </div>
                  <Button danger ghost className="card-danger-btn" onClick={this.showConfirm}>
                    删除
                  </Button>
                </Card>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    )
  }
}

const states = (state: any) => ({
  projectList: state.project.projectList,
  groupList: state.group.groupList,
  projectMsg: state.project.currProject,
  currGroup: state.group.currGroup,
})

const actions = {
  updateProject,
  delProject,
  getProject,
  fetchGroupMsg,
  upsetProject,
  fetchGroupList,
  setBreadcrumb,
}

export default connect(states, actions)(withRouter(ProjectMessage as any)) as any as typeof ProjectMessage
