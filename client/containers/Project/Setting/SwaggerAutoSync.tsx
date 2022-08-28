import { QuestionCircleOutlined, SaveOutlined } from '@ant-design/icons'
import { Form, Switch, Button, Tooltip, message, Input, Select, FormInstance } from 'antd'
import axios from 'axios'
import React, { Component, createRef } from 'react'
import { connect } from 'react-redux'

import { formatTime } from '@/common.js'
import { handleSwaggerUrlData } from '@/reducer/modules/project'
import { AnyFunc } from '@/types'

const FormItem = Form.Item
const Option = Select.Option

// layout
const formItemLayout = {
  labelCol: {
    lg: { span: 5 },
    xs: { span: 24 },
    sm: { span: 10 },
  },
  wrapperCol: {
    lg: { span: 16 },
    xs: { span: 24 },
    sm: { span: 12 },
  },
  className: 'form-item',
}

const tailFormItemLayout = {
  wrapperCol: {
    sm: {
      span: 16,
      offset: 11,
    },
  },
}

type PropTypes = {
  match?: any
  projectId?: number
  projectMsg?: any
  handleSwaggerUrlData?: AnyFunc
}

type StateTypes = {
  random_corn: string

  sync_data: {
    is_sync_open?: boolean
    sync_mode?: any
    last_sync_time?: number
    sync_json_url?: string
    sync_cron?: string
    random_corn?: string
    _id?: number
  }
}

const syncModeOpts = [
  { value: 'normal', label: '普通模式' },
  { value: 'good', label: '智能合并' },
  { value: 'merge', label: '完全覆盖' },
]

class ProjectInterfaceSync extends Component<PropTypes, StateTypes> {
  formRef = createRef<FormInstance>()

  constructor(props: PropTypes) {
    super(props)
    this.state = {
      // 默认每份钟同步一次,取一个随机数
      random_corn: '*/10 * * * *',

      // 查询同步任务
      sync_data: {
        is_sync_open: false,
        _id: 0,
      },
    }

    this.getSyncData()
  }

  handleSubmit = () => {
    const { projectId } = this.props
    const params: any = {
      project_id: projectId,
      is_sync_open: this.state.sync_data.is_sync_open,
      uid: this.props.projectMsg.uid,
    }
    if (this.state.sync_data._id) {
      params.id = this.state.sync_data._id
    }

    this.formRef.current
      .validateFields()
      .then(async (values: any[]) => {
        const assignValue = Object.assign(params, values)
        await axios.post('/api/autoSync/save', assignValue).then(res => {
          if (res.data.errcode === 0) {
            message.success('保存成功')
          } else {
            message.error(res.data.errmsg)
          }
        })
      })
      .catch(err => {
        console.error(err)
      })
  }

  validSwaggerUrl = async (rule: any, value: string, callback: AnyFunc) => {
    if (!value) {
      return
    }
    try {
      await this.props.handleSwaggerUrlData(value)
    } catch (e) {
      callback('swagger地址不正确')
    }
    callback()
  }

  async getSyncData() {
    const projectId = this.props.projectMsg._id
    const result = await axios.get('/api/autoSync/get?project_id=' + projectId)
    if (result.data.errcode === 0) {
      if (result.data.data) {
        this.setState({
          sync_data: result.data.data,
        })
      }
    }
  }

  // 是否开启
  onChange = (v: boolean) => {
    const sync_data = this.state.sync_data
    sync_data.is_sync_open = v
    this.setState({
      sync_data: sync_data,
    })
  }

  sync_cronCheck(rule: any, value: string, callback: AnyFunc) {
    if (!value) {
      return
    }
    value = value.trim()
    if (value.split(/ +/).length > 5) {
      callback('不支持秒级别的设置，建议使用 "*/10 * * * *" ,每隔10分钟更新')
    }
    callback()
  }

  render() {
    return (
      <div className="m-panel">
        <Form ref={this.formRef}>
          <FormItem label="是否开启自动同步" {...formItemLayout}>
            <Switch
              checked={this.state.sync_data.is_sync_open}
              onChange={this.onChange}
              checkedChildren="开"
              unCheckedChildren="关"
            />
            {this.state.sync_data.last_sync_time != null ? (
              <div>
                上次更新时间:
                <span className="logtime">{formatTime(this.state.sync_data.last_sync_time)}</span>
              </div>
            ) : null}
          </FormItem>

          <div>
            <FormItem
              {...formItemLayout}
              label={
                <span className="label">
                  数据同步&nbsp;
                  <Tooltip
                    title={
                      <div>
                        <h3 style={{ color: 'white' }}>普通模式</h3>
                        <p>不导入已存在的接口</p>
                        <br />
                        <h3 style={{ color: 'white' }}>智能合并</h3>
                        <p>已存在的接口，将合并返回数据的 response，适用于导入了 swagger 数据，保留对数据结构的改动</p>
                        <br />
                        <h3 style={{ color: 'white' }}>完全覆盖</h3>
                        <p>不保留旧数据，完全使用新数据，适用于接口定义完全交给后端定义</p>
                      </div>
                    }
                  >
                    <QuestionCircleOutlined />
                  </Tooltip>{' '}
                </span>
              }
              name="sync_mode"
              initialValue={this.state.sync_data.sync_mode}
              rules={[{ required: true, message: '请选择同步方式!' }]}
            >
              <Select options={syncModeOpts} />
            </FormItem>

            <FormItem
              {...formItemLayout}
              label="项目的 swagger json 地址"
              name="sync_json_url"
              rules={[{ required: true, message: '输入swagger地址' }, { validator: this.validSwaggerUrl }]}
              validateTrigger="onBlur"
              initialValue={this.state.sync_data.sync_json_url}
            >
              <Input />
            </FormItem>

            <FormItem
              {...formItemLayout}
              label={
                <span>
                  类cron风格表达式
                  <a href="https://blog.csdn.net/shouldnotappearcalm/article/details/89469047">参考</a>
                  <br />
                  (默认10分钟更新一次)
                </span>
              }
              name="sync_cron"
              rules={[
                { required: true, message: '输入node-schedule的类cron表达式!' },
                { validator: this.sync_cronCheck },
              ]}
              initialValue={this.state.sync_data.sync_cron ? this.state.sync_data.sync_cron : this.state.random_corn}
            >
              <Input />
            </FormItem>
          </div>
          <FormItem {...tailFormItemLayout}>
            <Button type="primary" htmlType="submit" icon={<SaveOutlined />} size="large" onClick={this.handleSubmit}>
              保存
            </Button>
          </FormItem>
        </Form>
      </div>
    )
  }
}

const states = (state: any) => ({
  projectMsg: state.project.currProject,
})

const actions = {
  handleSwaggerUrlData,
}

export default connect(states, actions)(ProjectInterfaceSync)
//  as typeof ProjectInterfaceSync
