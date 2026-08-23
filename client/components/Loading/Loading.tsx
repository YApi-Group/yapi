import PropTypes from 'prop-types'
import React from 'react'
import './Loading.scss'

export default class Loading extends React.PureComponent {
  static defaultProps = {
    visible: false,
  };
  static propTypes = {
    visible: PropTypes.bool,
  };
  render() {
    return (
      <div className="loading-box" style={{ display: this.props.visible ? 'flex' : 'none' }}>
        <div className="loading-box-bg" />
        <div className="loading-box-inner">
          <div />
          <div />
          <div />
          <div />
          <div />
          <div />
          <div />
          <div />
        </div>
      </div>
    )
  }
}
