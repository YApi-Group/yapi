import { QuestionCircleOutlined } from '@ant-design/icons'
import { Form, Switch, Button, message, Tooltip, Radio, RadioChangeEvent } from 'antd'
import axios from 'axios'
import PropTypes from 'prop-types'
import React, { Component } from 'react'
// import { connect } from 'react-redux'
import { withRouter } from 'react-router-dom'

import mockEditor from '../../../../../components/AceEditor/mockEditor'
import constants from '../../../../../cons'

import MockCol from './MockCol'

const FormItem = Form.Item

type PropTypes = {
  match: any
}

type StateTypes = {
  enable: boolean
  mock_script: string
  tab: string
}

class AdvMock extends Component<PropTypes, StateTypes> {
  constructor(props: PropTypes) {
    super(props)
    this.state = {
      enable: false,
      mock_script: '',
      tab: 'case',
    }
  }

  handleFinish = () => {
    const projectId = this.props.match.params.id
    const interfaceId = this.props.match.params.actionId
    const params = {
      project_id: projectId,
      interface_id: interfaceId,
      mock_script: this.state.mock_script,
      enable: this.state.enable,
    }
    axios.post('/api/advmock/save', params).then(res => {
      if (res.data.errcode === 0) {
        message.success('保存成功')
      } else {
        message.error(res.data.errmsg)
      }
    })
  }

  componentDidMount() {
    this.getAdvMockData()
  }

  async getAdvMockData() {
    const interfaceId = this.props.match.params.actionId
    const result = await axios.get('/api/advmock/get?interface_id=' + interfaceId)
    if (result.data.errcode === 0) {
      const mockData = result.data.data
      this.setState({
        enable: mockData.enable,
        mock_script: mockData.mock_script,
      })
    }

    mockEditor({
      container: 'mock-script',
      data: this.state.mock_script,
      onChange: (d: any) => {
        this.setState({
          mock_script: d.text,
        })
      },
    })
  }

  onChange = (v: boolean) => {
    this.setState({
      enable: v,
    })
  }

  handleTapChange = (e: RadioChangeEvent) => {
    this.setState({
      tab: e.target.value,
    })
  }

  render() {
    const formItemLayout = {
      labelCol: {
        sm: { span: 4 },
      },
      wrapperCol: {
        sm: { span: 16 },
      },
    }
    const tailFormItemLayout = {
      wrapperCol: {
        sm: {
          span: 16,
          offset: 11,
        },
      },
    }
    const { tab } = this.state
    const isShowCase = tab === 'case'
    return (
      <div style={{ padding: '20px 10px' }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <Radio.Group value={tab} size="large" onChange={this.handleTapChange}>
            <Radio.Button value="case">期望</Radio.Button>
            <Radio.Button value="script">脚本</Radio.Button>
          </Radio.Group>
        </div>
        <div style={{ display: isShowCase ? 'none' : '' }}>
          <Form onFinish={this.handleFinish}>
            <FormItem
              label={
                <span>
                  是否开启&nbsp;
                  <a target="_blank" rel="noopener noreferrer" href={constants.docHref.adv_mock_script}>
                    <Tooltip title="点击查看文档">
                      <QuestionCircleOutlined />
                    </Tooltip>
                  </a>
                </span>
              }
              {...formItemLayout}
            >
              <Switch
                checked={this.state.enable}
                onChange={this.onChange}
                checkedChildren="开"
                unCheckedChildren="关"
              />
            </FormItem>

            <FormItem label="Mock脚本" {...formItemLayout}>
              <div id="mock-script" style={{ minHeight: '500px' }} />
            </FormItem>
            <FormItem {...tailFormItemLayout}>
              <Button type="primary" htmlType="submit">
                保存
              </Button>
            </FormItem>
          </Form>
        </div>
        <div style={{ display: isShowCase ? '' : 'none' }}>
          <MockCol />
        </div>
      </div>
    )
  }
}

export default withRouter(AdvMock as any) as any as typeof AdvMock
