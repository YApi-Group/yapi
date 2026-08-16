import { Input } from 'antd'
import PropTypes from 'prop-types'
import React, { PureComponent } from 'react'

export default class FieldInput extends PureComponent {
  static propTypes = {
    onChange: PropTypes.func,
    value: PropTypes.string,
  }

  constructor(props) {
    super(props)
    this.state = {
      value: props.value,
    }
  }

  handleChange =e => {
    const value = e.target.value
    this.setState({
      value,
    })
  }

  UNSAFE_componentWillReceiveProps(nextProps) {
    if (nextProps.value !== this.props.value) {
      this.setState({
        value: nextProps.value,
      })
    }
  }

  onKeyup= e => {
    if (e.keyCode === 13) {
      if (e.target.value !== this.props.value) { return this.props.onChange(e) }
    }
  }

  handleBlur = e => {
    if (e.target.value !== this.props.value) { return this.props.onChange(e) }
  }

  render() {
    const { value } = this.state

    return (
      <Input {...this.props} value={value} onKeyUp={this.onKeyup} onBlur={this.handleBlur} onChange={this.handleChange} />
    )
  }
}
