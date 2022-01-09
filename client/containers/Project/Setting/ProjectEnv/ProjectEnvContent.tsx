import { DeleteOutlined, QuestionCircleOutlined, SaveOutlined } from '@ant-design/icons'
import { Row, Col, Form, Input, Select, Button, AutoComplete, Tooltip, FormInstance } from 'antd'
import PropTypes from 'prop-types'
import React, { Component, MouseEvent, createRef, RefObject } from 'react'

import { EnvPart } from '@/ajax/ProjectGet'
import constants from '@/cons'
import { AnyFunc } from '@/types'

import styles from './pec.module.less'

import './index.scss'

const Option = Select.Option

const headerOpts = constants.HTTP_REQUEST_HEADER.map(v => ({ label: v, value: v }))

type ItemKey = 'header' | 'cookie' | 'global'
type ItemData = {
  name: string
  value: string
}

const initMap = {
  header: [{ name: '', value: '' }],
  cookie: [{ name: '', value: '' }],
  global: [{ name: '', value: '' }],
}

type PropTypes = {
  projectMsg: EnvPart
  onSubmit: AnyFunc
  handleEnvInput: AnyFunc
}

type StateTypes = typeof initMap

class ProjectEnvContent extends Component<PropTypes, StateTypes> {
  formRef: RefObject<FormInstance>

  constructor(props: PropTypes) {
    super(props)

    this.formRef = createRef()

    this.state = this.initState(props.projectMsg)
  }

  initState(curdata: any) {
    const header = [{ name: '', value: '' }]
    const cookie = [{ name: '', value: '' }]
    const global = [{ name: '', value: '' }]

    const curHeader = curdata.header
    const curGlobal = curdata.global

    if (curHeader && curHeader.length !== 0) {
      curHeader.forEach((item: ItemData) => {
        if (item.name === 'Cookie') {
          const cookieStr = item.value
          if (cookieStr) {
            cookieStr.split(';').forEach(c => {
              if (c) {
                const ary = c.split('=')
                cookie.unshift({
                  name: ary[0] ? ary[0].trim() : '',
                  value: ary[1] ? ary[1].trim() : '',
                })
              }
            })
          }
        } else {
          header.unshift(item)
        }
      })
    }

    if (curGlobal && curGlobal.length !== 0) {
      curGlobal.forEach((item: ItemData) => {
        global.unshift(item)
      })
    }
    return { header, cookie, global }
  }

  addHeader = (index: number, name: ItemKey) => {
    const nextHeader = this.state[name][index + 1]
    if (nextHeader && typeof nextHeader === 'object') {
      return
    }

    const data = { name: '', value: '' }
    const newValue: any = {
      [name]: [].concat(this.state[name], data),
    }
    this.setState(newValue)
  }

  delHeader = (key: number, name: ItemKey) => {
    const curValue: any[] = this.formRef.current.getFieldValue(name)
    const newValue: any = {
      [name]: curValue.filter((val, index) => index !== key),
    }

    this.formRef.current.setFieldsValue(newValue)
    this.setState(newValue)
  }

  handleInit(data: any) {
    this.formRef.current.resetFields()
    const newValue = this.initState(data)
    this.setState({ ...newValue })
  }

  // UNSAFE_componentWillReceiveProps(nextProps: PropTypes) {
  //   const curEnvName = this.props.projectMsg.name
  //   const nextEnvName = nextProps.projectMsg.name
  //   if (curEnvName !== nextEnvName) {
  //     this.handleInit(nextProps.projectMsg)
  //   }
  // }

  handleOk = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    const { onSubmit, projectMsg } = this.props

    this.formRef.current
      .validateFields()
      .then((values: any) => {
        console.log(values)
        const header: ItemData[] = values.header.filter((val: ItemData) => val.name !== '')
        const cookie: ItemData[] = values.cookie.filter((val: ItemData) => val.name !== '')
        const global: ItemData[] = values.global.filter((val: ItemData) => val.name !== '')
        if (cookie.length > 0) {
          header.push({
            name: 'Cookie',
            value: cookie.map(item => item.name + '=' + item.value).join(';'),
          })
        }

        const assignValue = {
          env: {
            _id: projectMsg._id,
            name: values.env.name,
            domain: values.env.protocol + values.env.domain,
            header: header,
            global,
          },
        }
        onSubmit(assignValue)
      })
      .catch(err => {
        console.error(err)
      })
  }

  render() {
    const { projectMsg } = this.props

    const headerTpl = (item: ItemData, index: number) => {
      const headerLength = this.state.header.length - 1
      return (
        <Row gutter={2} key={index}>
          <Col span={10}>
            <Form.Item
              name={['header', index, 'name']}
              validateTrigger={['onChange', 'onBlur']}
              initialValue={item.name || ''}
            >
              <AutoComplete
                style={{ width: '200px' }}
                allowClear={true}
                options={headerOpts}
                placeholder="请输入header名称"
                onChange={() => this.addHeader(index, 'header')}
                filterOption={(inputVal, opt) => opt.value.toUpperCase().includes(inputVal.toUpperCase())}
              />
            </Form.Item>
          </Col>

          <Col span={12}>
            <Form.Item
              name={['header', index, 'value']}
              validateTrigger={['onChange', 'onBlur']}
              initialValue={item.value || ''}
            >
              <Input placeholder="请输入参数内容" style={{ width: '90%', marginRight: 8 }} />
            </Form.Item>
          </Col>
          <Col span={2} className={index === headerLength ? ' env-last-row' : null}>
            {/* 新增的项中，只有最后一项没有有删除按钮 */}
            <DeleteOutlined
              className="dynamic-delete-button delete"
              onClick={e => {
                e.stopPropagation()
                this.delHeader(index, 'header')
              }}
            />
          </Col>
        </Row>
      )
    }

    const commonTpl = (item: ItemData, index: number, name: ItemKey) => {
      const length = this.state[name].length - 1
      return (
        <Row gutter={2} key={index}>
          <Col span={10}>
            <Form.Item
              name={[name, index, 'name']}
              validateTrigger={['onChange', 'onBlur']}
              initialValue={item.name || ''}
            >
              <Input
                placeholder={`请输入 ${name} Name`}
                style={{ width: '200px' }}
                onChange={() => this.addHeader(index, name)}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name={[name, index, 'value']}
              validateTrigger={['onChange', 'onBlur']}
              initialValue={item.value || ''}
            >
              <Input placeholder="请输入参数内容" style={{ width: '90%', marginRight: 8 }} />
            </Form.Item>
          </Col>
          <Col span={2} className={index === length ? ' env-last-row' : null}>
            {/* 新增的项中，只有最后一项没有有删除按钮 */}
            <DeleteOutlined
              className="dynamic-delete-button delete"
              onClick={e => {
                e.stopPropagation()
                this.delHeader(index, name)
              }}
            />
          </Col>
        </Row>
      )
    }

    const envTpl = (data: any) => (
      <div>
        <h3 className="env-label">环境名称</h3>
        <Form.Item
          required={false}
          name={['env', 'name']}
          validateTrigger={['onChange', 'onBlur']}
          initialValue={data.name === '新环境' ? '' : data.name || ''}
          rules={[
            {
              required: false,
              whitespace: true,
              validator(_, value) {
                if (value) {
                  if (value.length === 0) {
                    return Promise.reject('请输入环境名称')
                  } else if (!/\S/.test(value)) {
                    return Promise.reject('请输入环境名称')
                  }
                  return Promise.resolve()
                }
                return Promise.reject('请输入环境名称')
              },
            },
          ]}
        >
          <Input
            onChange={e => this.props.handleEnvInput(e.target.value)}
            placeholder="请输入环境名称"
            style={{ width: '90%', marginRight: 8 }}
          />
        </Form.Item>

        <h3 className="env-label">环境域名</h3>
        <div className={styles.domainBar}>
          <Form.Item
            noStyle
            name={['env', 'protocol']}
            initialValue={data.domain ? data.domain.split('//')[0] + '//' : 'http://'}
            rules={[{ required: true }]}
          >
            <Select>
              <Option value="http://">{'http://'}</Option>
              <Option value="https://">{'https://'}</Option>
            </Select>
          </Form.Item>
          <Form.Item
            noStyle
            required={false}
            name={['env', 'domain']}
            validateTrigger={['onChange', 'onBlur']}
            initialValue={data.domain ? data.domain.split('//')[1] : ''}
            rules={[
              {
                required: false,
                whitespace: true,
                validator(_, value) {
                  if (value) {
                    if (value.length === 0) {
                      return Promise.reject('请输入环境域名!')
                    } else if (/\s/.test(value)) {
                      return Promise.reject('环境域名不允许出现空格!')
                    }
                    return Promise.resolve()
                  }
                  return Promise.reject('请输入环境域名!')
                },
              },
            ]}
          >
            <Input placeholder="请输入环境域名" style={{ height: '32px' }} />
          </Form.Item>
        </div>

        <h3 className="env-label">Header</h3>
        {this.state.header.map((item, index) => headerTpl(item, index))}

        <h3 className="env-label">Cookie</h3>
        {this.state.cookie.map((item, index) => commonTpl(item, index, 'cookie'))}

        <h3 className="env-label">
          global
          <a
            target="_blank"
            rel="noopener noreferrer"
            href="https://hellosean1025.github.io/yapi/documents/project.html#%E9%85%8D%E7%BD%AE%E7%8E%AF%E5%A2%83"
            style={{ marginLeft: 8 }}
          >
            <Tooltip title="点击查看文档">
              <QuestionCircleOutlined style={{ fontSize: '13px' }} />
            </Tooltip>
          </a>
        </h3>
        {this.state.global.map((item, index) => commonTpl(item, index, 'global'))}
      </div>
    )

    return (
      <Form ref={this.formRef}>
        <div>
          {envTpl(projectMsg)}
          <div className={styles.btnSave}>
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
        </div>
      </Form>
    )
  }
}

export default ProjectEnvContent
