import { DeleteOutlined } from '@ant-design/icons'
import { Row, Col, Input } from 'antd'
import PropTypes from 'prop-types'
import React, { Component } from 'react'

import './ProjectTag.scss'

type ItemPart = {
  name: string
  desc: string
}

type PropTypes = {
  tagMsg: ItemPart[]
}

type StateTypes = {
  tag: ItemPart[]
}

class ProjectTag extends Component<PropTypes, StateTypes> {
  constructor(props: PropTypes) {
    super(props)
    this.state = {
      tag: [{ name: '', desc: '' }],
    }
  }

  initState(curdata: ItemPart[]) {
    const tag = [{ name: '', desc: '' }]

    if (curdata && curdata.length !== 0) {
      curdata.forEach(item => {
        tag.unshift(item)
      })
    }

    return { tag }
  }

  componentDidMount() {
    const newValue = this.initState(this.props.tagMsg)
    this.setState({ ...newValue })
  }

  addHeader = (val: string, index: number, label: 'name'| 'desc') => {
    const newValue: StateTypes = {
      tag: [].concat(this.state.tag),
    }
    newValue.tag[index][label] = val

    const nextData = this.state.tag[index + 1]
    if (!(nextData && typeof nextData === 'object')) {
      const data = { name: '', desc: '' }
      newValue.tag = [].concat(this.state.tag, data)
    }

    this.setState(newValue)
  }

  delHeader = (key: number) => {
    const curValue = this.state.tag
    const newValue = {
      tag: curValue.filter((val, index) => index !== key),
    }

    this.setState(newValue)
  }

  handleChange = (val:string, index: number, label: 'name'|'desc') => {
    const newValue = this.state
    newValue.tag[index][label] = val

    this.setState(newValue)
  }

  render() {
    const commonTpl = (item: ItemPart, index: number) => {
      const length = this.state.tag.length - 1
      return (
        <Row key={index} className="tag-item">
          <Col span={6} className="item-name">
            <Input
              placeholder={'请输入 tag 名称'}
              // style={{ width: '200px' }}
              value={item.name || ''}
              onChange={e => this.addHeader(e.target.value, index, 'name')}
            />
          </Col>
          <Col span={12}>
            <Input
              placeholder="请输入tag 描述信息"
              style={{ width: '90%', marginRight: 8 }}
              onChange={e => this.handleChange(e.target.value, index, 'desc')}
              value={item.desc || ''}
            />
          </Col>
          <Col span={2} className={index === length ? ' tag-last-row' : null}>
            {/* 新增的项中，只有最后一项没有有删除按钮 */}
            <DeleteOutlined
              className="dynamic-delete-button delete"
              onClick={e => {
                e.stopPropagation()
                this.delHeader(index)
              }}
            />
          </Col>
        </Row>
      )
    }

    return <div className="project-tag">
      {this.state.tag.map(commonTpl)}
    </div>
  }
}

export default ProjectTag
