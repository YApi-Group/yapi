import { LockFilled, QuestionCircleOutlined, PlusOutlined } from '@ant-design/icons'
import { Button, Form, Input, Tooltip, Select, message, Row, Col, Radio, FormInstance } from 'antd'
import PropTypes from 'prop-types'
import React, { PureComponent as Component, RefObject } from 'react'
import { connect } from 'react-redux'
import { withRouter } from 'react-router-dom'

import constants from '@/cons'
import { DispatchCommonFunc, DispatchPromiseFunc } from '@/types'

import { pickRandomProperty, handlePath, nameLengthLimit } from '../../common'
import { fetchGroupList } from '../../reducer/modules/group.js'
import { addProject } from '../../reducer/modules/project.js'
import { setBreadcrumb } from '../../reducer/modules/user'

import './AddProject.scss'

const { TextArea } = Input
const FormItem = Form.Item
const Option = Select.Option
const RadioGroup = Radio.Group

const formItemLayout = {
  labelCol: {
    lg: { span: 3 },
    xs: { span: 24 },
    sm: { span: 6 },
  },
  wrapperCol: {
    lg: { span: 21 },
    xs: { span: 24 },
    sm: { span: 14 },
  },
  className: 'form-item',
}

type PropTypes = {
  groupList: any[]
  currGroup: Record<string, any>
  addProject: DispatchPromiseFunc<typeof addProject>
  history: Record<string, any>
  setBreadcrumb: DispatchCommonFunc<typeof setBreadcrumb>
  fetchGroupList: DispatchPromiseFunc<typeof fetchGroupList>
}

type StateTypes = {
  groupList: any[]
  currGroupId: number
}

class ProjectList extends Component<PropTypes, StateTypes> {
  formRef: RefObject<FormInstance> = React.createRef()

  constructor(props: PropTypes) {
    super(props)

    this.state = {
      groupList: [],
      currGroupId: null,
    }

    this.handlePath = this.handlePath.bind(this)
    this.handleOk = this.handleOk.bind(this)
  }

  handlePath(e: any) {
    const val = e.target.value
    this.formRef.current.setFieldsValue({
      basepath: handlePath(val),
    })
  }

  // 确认添加项目
  handleOk(e: any) {
    e.preventDefault()

    const { addProject } = this.props
    this.formRef.current.validateFields()
      .then(values => {
        values.group_id = values.group
        values.icon = constants.PROJECT_ICON[0]
        values.color = pickRandomProperty(constants.PROJECT_COLOR)

        return addProject(values)
      })
      .then((res: any) => {
        if (res.payload.data.errcode === 0) {
          this.formRef.current.resetFields()
          message.success('创建成功! ')
          this.props.history.push('/project/' + res.payload.data.data._id + '/interface/api')
        }
      })
      .catch(err => { console.error(err) })
  }

  async UNSAFE_componentWillMount(): Promise<any> {
    this.props.setBreadcrumb([{ name: '新建项目' }])
    if (!this.props.currGroup._id) {
      await this.props.fetchGroupList()
    }
    if (this.props.groupList.length === 0) {
      return null
    }
    this.setState({
      currGroupId: this.props.currGroup._id ? this.props.currGroup._id : this.props.groupList[0]._id,
    })
    this.setState({ groupList: this.props.groupList })
  }

  render() {
    return (
      <div className="g-row">
        <div className="g-row m-container">
          <Form ref={this.formRef}>
            <FormItem {...formItemLayout} label="项目名称" name="name" rules={nameLengthLimit('项目')}>
              <Input placeholder="请输入" />
            </FormItem>

            <FormItem
              {...formItemLayout}
              label="所属分组"
              name="group"
              initialValue={String(this.state.currGroupId)}
              rules={[{ required: true, message: '请选择项目所属的分组!' }]}
            >
              <Select placeholder="请选择">
                {this.state.groupList.map((item, index) => (
                  <Option
                    disabled={!(item.role === 'dev' || item.role === 'owner' || item.role === 'admin')}
                    value={item._id.toString()}
                    key={index}
                  >
                    {item.group_name}
                  </Option>
                ))}
              </Select>
            </FormItem>

            <hr className="breakline" />

            <FormItem
              {...formItemLayout}
              label={
                <span>
                  基本路径&nbsp;
                  <Tooltip title="接口基本路径，为空是根路径">
                    <QuestionCircleOutlined />
                  </Tooltip>
                </span>
              }
              name="basepath"
              rules={[{ required: false, message: '请输入项目基本路径' }]}
            >
              <Input onBlur={this.handlePath} placeholder="请输入" />
            </FormItem>

            <FormItem
              {...formItemLayout}
              label="描述"
              name="desc"
              rules={[{ required: false, message: '描述不超过144字!', max: 144 }]}
            >
              <TextArea rows={4} />
            </FormItem>

            <FormItem
              {...formItemLayout}
              label="权限"
              name="project_type"
              rules={[{ required: true }]}
              initialValue="private"
            >
              <RadioGroup>
                <Radio value="private" className="radio">
                  <LockFilled />
                  私有
                  <br />
                  <span className="radio-desc">只有组长和项目开发者可以索引并查看项目信息</span>
                </Radio>
                <br />
                {/* <Radio value="public" className="radio">
                    <UnlockFilled />公开<br />
                    <span className="radio-desc">任何人都可以索引并查看项目信息</span>
                  </Radio> */}
              </RadioGroup>
            </FormItem>
          </Form>

          <Row>
            <Col sm={{ offset: 6 }} lg={{ offset: 3 }}>
              <Button className="m-btn" icon={<PlusOutlined />} type="primary" onClick={this.handleOk}>
                创建项目
              </Button>
            </Col>
          </Row>
        </div>
      </div>
    )
  }
}

const states = (state: any) => ({
  groupList: state.group.groupList,
  currGroup: state.group.currGroup,
})

const actions = {
  fetchGroupList,
  addProject,
  setBreadcrumb,
}

export default withRouter(connect(states, actions)(ProjectList as any))
