import { Form, Input, Button, FormInstance } from 'antd'
import PropTypes from 'prop-types'
import React, { createRef, PureComponent as Component, RefObject } from 'react'

import { AnyFunc } from '@/types'

const FormItem = Form.Item

type PropTypes = {
  onSubmit?: AnyFunc
  onCancel?: AnyFunc
  catdata?: any
}

class AddInterfaceCatForm extends Component<PropTypes> {
  formRef: RefObject<FormInstance>

  constructor(props: PropTypes) {
    super(props)

    this.formRef = createRef()
  }

  handleSubmit = (values: any[]) => {
    this.props.onSubmit(values)
  }

  render() {
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
      <Form ref={this.formRef} onFinish={this.handleSubmit}>
        <FormItem
          {...formItemLayout}
          label="分类名"
          name="name"
          rules={[{ required: true, message: '请输入分类名称!' }]}
          initialValue={this.props.catdata ? this.props.catdata.name || null : null}
        >
          <Input placeholder="分类名称" />
        </FormItem>

        <FormItem
          {...formItemLayout}
          label="备注"
          name="desc"
          initialValue={this.props.catdata ? this.props.catdata.desc || null : null}
        >
          <Input placeholder="备注" />
        </FormItem>

        <FormItem className="catModalFoot" wrapperCol={{ span: 24, offset: 8 }}>
          <Button onClick={this.props.onCancel} style={{ marginRight: '10px' }}>
            取消
          </Button>
          <Button type="primary" htmlType="submit">
            提交
          </Button>
        </FormItem>
      </Form>
    )
  }
}

export default AddInterfaceCatForm
