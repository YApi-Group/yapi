import { Form, Input, Select, Button, FormInstance } from 'antd'
import React, { PureComponent as Component, FocusEvent, createRef, RefObject } from 'react'

import constants from '@/cons'
import { AnyFunc } from '@/types'

import { handleApiPath, nameLengthLimit } from '../../../../common.js'

const HTTP_METHOD = constants.HTTP_METHOD
const HTTP_METHOD_KEYS = Object.keys(HTTP_METHOD)

const FormItem = Form.Item
const Option = Select.Option

type PropTypes = {
  onSubmit?: AnyFunc
  onCancel?: AnyFunc
  catid?: number
  catdata?: any[]
}

class AddInterfaceForm extends Component<PropTypes> {
  formRef: RefObject<FormInstance>

  constructor(props: PropTypes) {
    super(props)

    this.formRef = createRef()
  }

  handleSubmit = (values: any) => {
    this.props.onSubmit(values)
    // () => { this.formRef.current.resetFields() }
  }

  handlePath = (e: FocusEvent<HTMLInputElement>) => {
    const val = e.target.value
    this.formRef.current.setFieldsValue({
      path: handleApiPath(val),
    })
  }

  render() {
    const prefixSelector = (
      <FormItem name="method" initialValue="GET" noStyle >
        <Select style={{ width: 75 }}>
          {HTTP_METHOD_KEYS.map(item => <Option key={item} value={item}>{item}</Option>)}
        </Select>
      </FormItem>
    )

    const formItemLayout = {
      labelCol: {
        xs: { span: 24 },
        sm: { span: 6 },
      },
      wrapperCol: {
        xs: { span: 24 },
        sm: { span: 14 },
      },
    }

    return (
      <Form ref={this.formRef} onFinish={this.handleSubmit} >
        <FormItem
          {...formItemLayout}
          label="接口分类"
          name="catid"
          initialValue={this.props.catid ? String(this.props.catid) : String(this.props.catdata[0]._id)}
        >
          <Select>
            {this.props.catdata.map(item => <Option key={item._id} value={String(item._id)}>{item.name}</Option>)}
          </Select>
        </FormItem>

        <FormItem
          {...formItemLayout}
          label="接口名称"
          name="title"
          rules={nameLengthLimit('接口')}
        >

          <Input placeholder="接口名称" />
        </FormItem>

        <FormItem
          {...formItemLayout}
          label="接口路径"
          name="path"
          rules={[{
            required: true, message: '请输入接口路径!',
          }]}
        >
          <Input onBlur={this.handlePath} addonBefore={prefixSelector} placeholder="/path" />
        </FormItem>

        <FormItem {...formItemLayout} label="注">
          <span style={{ color: '#929292' }}>详细的接口数据可以在编辑页面中添加</span>
        </FormItem>

        <FormItem className="catModalFoot" wrapperCol={{ span: 24, offset: 8 }} >
          <Button onClick={this.props.onCancel} style={{ marginRight: '10px' }} >取消</Button>
          <Button type="primary" htmlType="submit">
            提交
          </Button>
        </FormItem>
      </Form>
    )
  }
}

export default AddInterfaceForm
