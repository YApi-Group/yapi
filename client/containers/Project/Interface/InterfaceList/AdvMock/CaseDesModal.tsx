import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons'
import {
  Form,
  Select,
  InputNumber,
  Switch,
  Col,
  message,
  Row,
  Input,
  Button,
  AutoComplete,
  Modal,
  FormInstance,
} from 'antd'
import json5 from 'json5'
import React, { Component, createRef, RefObject } from 'react'
import { connect } from 'react-redux'

import { AnyFunc } from '@/types'

import { httpCodes } from '../../../../../../exts/yapi-plugin-advanced-mock/index.js'
import { safeAssign } from '../../../../../common'
import AceEditor from '../../../../../components/AceEditor/AceEditor'
import cons from '../../../../../cons'

import './CaseDesModal.scss'

const Option = Select.Option
const FormItem = Form.Item

const formItemLayout = {
  labelCol: { span: 5 },
  wrapperCol: { span: 12 },
}

const formItemLayoutWithOutLabel = {
  wrapperCol: { span: 12, offset: 5 },
}

type PropTypes = {
  caseData?: Record<string, any>
  currInterface?: Record<string, any>
  onOk?: AnyFunc
  onCancel?: AnyFunc
  isAdd?: boolean
  visible?: boolean
}

// TODO Form initialValue 设置
class CaseDesForm extends Component<PropTypes, any> {
  formRef: RefObject<FormInstance>

  // 初始化输入数据
  preProcess = (caseData: Record<string, any>) => {
    try {
      caseData = JSON.parse(JSON.stringify(caseData))
    } catch (error) {
      console.log(error)
    }

    const initCaseData = {
      ip: '',
      ip_enable: false,
      name: '',
      code: '200',
      delay: 0,
      headers: [{ name: '', value: '' }],
      paramsArr: [{ name: '', value: '' }],
      params: {},
      res_body: '',
      paramsForm: 'form',
    }
    caseData.params = caseData.params || {}
    const paramsArr = Object.keys(caseData.params).length
      ? Object.keys(caseData.params)
          .map(key => ({ name: key, value: caseData.params[key] }))
          .filter(item => {
            if (typeof item.value === 'object') {
              // this.setState({ paramsForm: 'json' })
              caseData.paramsForm = 'json'
            }
            return typeof item.value !== 'object'
          })
      : [{ name: '', value: '' }]
    const headers = caseData.headers && caseData.headers.length ? caseData.headers : [{ name: '', value: '' }]
    caseData.code = String(caseData.code)
    caseData.params = JSON.stringify(caseData.params, null, 2)

    caseData = safeAssign(initCaseData, { ...caseData, headers, paramsArr })

    return caseData
  }

  constructor(props: PropTypes) {
    super(props)

    this.formRef = createRef()

    const { caseData } = this.props
    this.state = this.preProcess(caseData)
  }

  // 处理request_body编译器
  handleRequestBody = (d: any) => {
    this.setState({ res_body: d.text })
  }

  // 处理参数编译器
  handleParams = (d: any) => {
    this.setState({ params: d.text })
  }

  // 增加参数信息
  addValues = (key: string) => {
    const { getFieldValue } = this.formRef.current
    let values = getFieldValue(key)
    values = values.concat({ name: '', value: '' })
    this.setState({ [key]: values })
  }

  // 删除参数信息
  removeValues = (key: string, index: number) => {
    const { setFieldsValue, getFieldValue } = this.formRef.current
    let values = getFieldValue(key)
    values = values.filter((val: any, index2: number) => index !== index2)
    setFieldsValue({ [key]: values })
    this.setState({ [key]: values })
  }

  // 处理参数
  getParamsKey = () => {
    const {
      req_query,
      req_body_form,
      req_body_type,
      method,
      req_body_other,
      req_body_is_json_schema,
      req_params,
    } = this.props.currInterface
    let keys: string[] = []
    req_query &&
      Array.isArray(req_query) &&
      req_query.forEach(item => {
        keys.push(item.name)
      })
    req_params &&
      Array.isArray(req_params) &&
      req_params.forEach(item => {
        keys.push(item.name)
      })

    const methodUpper = method.toUpperCase() as keyof typeof cons.HTTP_METHOD

    if (cons.HTTP_METHOD[methodUpper].request_body && req_body_type === 'form') {
      req_body_form &&
        Array.isArray(req_body_form) &&
        req_body_form.forEach(item => {
          keys.push(item.name)
        })
    } else if (cons.HTTP_METHOD[methodUpper].request_body && req_body_type === 'json' && req_body_other) {
      let bodyObj
      try {
        // 针对json-schema的处理
        if (req_body_is_json_schema) {
          bodyObj = json5.parse(this.props.caseData.req_body_other)
        } else {
          bodyObj = json5.parse(req_body_other)
        }

        keys = keys.concat(Object.keys(bodyObj))
      } catch (error) {
        console.log(error)
      }
    }
    return keys
  }

  endProcess = (caseData: Record<string, any>) => {
    const headers: any[] = []
    const params: Record<string, any> = {}
    const { paramsForm } = this.state
    caseData.headers &&
      Array.isArray(caseData.headers) &&
      caseData.headers.forEach(item => {
        if (item.name) {
          headers.push({
            name: item.name,
            value: item.value,
          })
        }
      })
    caseData.paramsArr &&
      Array.isArray(caseData.paramsArr) &&
      caseData.paramsArr.forEach(item => {
        if (item.name) {
          params[item.name] = item.value
        }
      })
    caseData.headers = headers
    if (paramsForm === 'form') {
      caseData.params = params
    } else {
      try {
        caseData.params = json5.parse(caseData.params)
      } catch (error) {
        console.log(error)
        message.error('请求参数 json 格式有误，请修改')
        return false
      }
    }
    delete caseData.paramsArr

    return caseData
  }

  handleOk = () => {
    const form = this.formRef.current
    form
      .validateFields()
      .then(values => {
        values.res_body = this.state.res_body
        values.params = this.state.params
        this.props.onOk(this.endProcess(values))
      })
      .catch(err => {
        form.scrollToField(err[0].name)
      })
  }

  render() {
    const { getFieldValue } = this.formRef.current
    const { isAdd, visible, onCancel } = this.props
    const { name, code, headers, ip, ip_enable, params, paramsArr, paramsForm, res_body, delay } = this.state

    const valuesTpl = (values: any[], title: string) => {
      const dataSource = this.getParamsKey()
      const display = paramsForm === 'json' ? 'none' : ''
      return values.map((item, index) => (
        <div key={index} className="paramsArr" style={{ display }}>
          <FormItem
            {...(index === 0 ? formItemLayout : formItemLayoutWithOutLabel)}
            wrapperCol={index === 0 ? { span: 19 } : { span: 19, offset: 5 }}
            label={index ? '' : title}
          >
            <Row gutter={8}>
              <Col span={10}>
                {/* {getFieldDecorator(`paramsArr[${index}].name`, { initialValue: item.name })( */}
                <FormItem name={`paramsArr[${index}].name`}>
                  <AutoComplete
                    dataSource={dataSource}
                    placeholder="参数名称"
                    filterOption={(inputValue, option) =>
                      option.props.children.toUpperCase().indexOf(inputValue.toUpperCase()) !== -1
                    }
                  />
                </FormItem>
              </Col>
              <Col span={10}>
                {/* {getFieldDecorator(`paramsArr[${index}].value`, { initialValue: item.value })( */}
                <FormItem name={`paramsArr[${index}].value`}>
                  <Input placeholder="参数值" />
                </FormItem>
              </Col>
              <Col span={4}>
                {values.length > 1 ? (
                  <MinusCircleOutlined
                    className="dynamic-delete-button"
                    onClick={() => this.removeValues('paramsArr', index)}
                  />
                ) : null}
              </Col>
            </Row>
          </FormItem>
        </div>
      ))
    }
    const headersTpl = (values: any[], title: string) => {
      const dataSource = cons.HTTP_REQUEST_HEADER
      return values.map((item, index) => (
        <div key={index} className="headers">
          <FormItem
            {...(index === 0 ? formItemLayout : formItemLayoutWithOutLabel)}
            wrapperCol={index === 0 ? { span: 19 } : { span: 19, offset: 5 }}
            label={index ? '' : title}
          >
            <Row gutter={8}>
              <Col span={10}>
                {/* {getFieldDecorator(`headers[${index}].name`, { initialValue: item.name })( */}
                <FormItem name={`headers[${index}].name`}>
                  <AutoComplete
                    dataSource={dataSource}
                    placeholder="参数名称"
                    filterOption={(inputValue, option) =>
                      option.props.children.toUpperCase().indexOf(inputValue.toUpperCase()) !== -1
                    }
                  />
                </FormItem>
              </Col>
              <Col span={10}>
                {/* {getFieldDecorator(`headers[${index}].value`, { initialValue: item.value })( */}
                <FormItem name={`headers[${index}].value`}>
                  <Input placeholder="参数值" />
                </FormItem>
              </Col>
              <Col span={4}>
                {values.length > 1 ? (
                  <MinusCircleOutlined
                    className="dynamic-delete-button"
                    onClick={() => this.removeValues('headers', index)}
                  />
                ) : null}
              </Col>
            </Row>
          </FormItem>
        </div>
      ))
    }
    return (
      <Modal
        title={isAdd ? '添加期望' : '编辑期望'}
        visible={visible}
        maskClosable={false}
        onOk={this.handleOk}
        width={780}
        onCancel={() => onCancel()}
        afterClose={() => this.setState({ paramsForm: 'form' })}
        className="case-des-modal"
      >
        <Form ref={this.formRef} onFinish={this.handleOk}>
          <h2 className="sub-title" style={{ marginTop: 0 }}>
            基本信息
          </h2>
          <FormItem {...formItemLayout} name={'name'} label="期望名称">
            {/* {getFieldDecorator('name', {
              initialValue: name,
              rules: [{ required: true, message: '请输入期望名称！' }],
            }) */}
            <Input placeholder="请输入期望名称" />
          </FormItem>
          <FormItem {...formItemLayout} label="IP 过滤" className="ip-filter">
            <Col span={6} className="ip-switch">
              <FormItem name="ip_enable">
                {/* {getFieldDecorator('ip_enable', {
                  initialValue: ip_enable,
                  valuePropName: 'checked',
                  rules: [{ type: 'boolean' }],
                })} */}
                <Switch />
              </FormItem>
            </Col>
            <Col span={18}>
              <div style={{ display: getFieldValue('ip_enable') ? '' : 'none' }} className="ip">
                <FormItem name="ip">
                  {/* {getFieldDecorator(
                    'ip',
                    getFieldValue('ip_enable')
                      ? {
                          initialValue: ip,
                          rules: [
                            {
                              pattern: cons.IP_REGEXP,
                              message: '请填写正确的 IP 地址',
                              required: true,
                            },
                          ],
                        }
                      : {}
                  )} */}
                  <Input placeholder="请输入过滤的 IP 地址" />
                </FormItem>
              </div>
            </Col>
          </FormItem>
          <Row className="params-form" style={{ marginBottom: 8 }}>
            <Col {...{ span: 12, offset: 5 }}>
              <Switch
                size="small"
                checkedChildren="JSON"
                unCheckedChildren="JSON"
                checked={paramsForm === 'json'}
                onChange={bool => {
                  this.setState({ paramsForm: bool ? 'json' : 'form' })
                }}
              />
            </Col>
          </Row>
          {valuesTpl(paramsArr, '参数过滤')}
          <FormItem
            wrapperCol={{ span: 6, offset: 5 }}
            style={{ display: paramsForm === 'form' ? '' : 'none' }}
          >
            <Button type="primary" onClick={() => this.addValues('paramsArr')} style={{ width: '100%' }}>
              <PlusOutlined /> 添加参数
            </Button>
          </FormItem>
          <FormItem
            {...formItemLayout}
            wrapperCol={{ span: 17 }}
            label="参数过滤"
            style={{ display: paramsForm === 'form' ? 'none' : '' }}
          >
            <AceEditor className="pretty-editor" data={params} onChange={this.handleParams} />
            <FormItem name="params">
              {/* {getFieldDecorator(
                'params',
                paramsForm === 'json'
                  ? {
                      rules: [{ validator: this.jsonValidator, message: '请输入正确的 JSON 字符串！' }],
                    }
                  : {}
              )()} */}
              <Input style={{ display: 'none' }} />
            </FormItem>
          </FormItem>
          <h2 className="sub-title">响应</h2>
          <FormItem {...formItemLayout} name="code" required label="HTTP Code">
            {/* {getFieldDecorator('code', {
              initialValue: code,
            })( */}
            <Select showSearch>
              {httpCodes.map(code => (
                <Option key={String(code)} value={String(code)}>
                  {String(code)}
                </Option>
              ))}
            </Select>
          </FormItem>
          <FormItem {...formItemLayout} name="delay" label="延时">
            {/* {getFieldDecorator('delay', {
              initialValue: delay,
              rules: [{ required: true, message: '请输入延时时间！', type: 'integer' }],
            })()} */}
            <InputNumber placeholder="请输入延时时间" min={0} />
            <span>ms</span>
          </FormItem>
          {headersTpl(headers, 'HTTP 头')}
          <FormItem wrapperCol={{ span: 6, offset: 5 }}>
            <Button type="primary" onClick={() => this.addValues('headers')} style={{ width: '100%' }}>
              <PlusOutlined /> 添加 HTTP 头
            </Button>
          </FormItem>
          <FormItem {...formItemLayout} wrapperCol={{ span: 17 }} label="Body" required>
            <FormItem>
              <AceEditor
                className="pretty-editor"
                data={res_body}
                mode={this.props.currInterface.res_body_type === 'json' ? null : 'text'}
                onChange={this.handleRequestBody}
              />
            </FormItem>
          </FormItem>
        </Form>
      </Modal>
    )
  }
}

const states = (state: any) => ({
  currInterface: state.inter.curdata,
})

export default connect(states)(CaseDesForm) as any as typeof CaseDesForm
