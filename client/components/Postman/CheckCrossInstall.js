import React from 'react'
import { Alert } from 'antd'
import PropTypes from 'prop-types'

export function initCrossRequest(fn) {
  let startTime = 0
  const _crossRequest = setInterval(() => {
    startTime += 500
    if (startTime > 5000) {
      clearInterval(_crossRequest)
    }
    if (window.crossRequest) {
      clearInterval(_crossRequest)
      fn(true)
    } else {
      fn(false)
    }
  }, 500)
  return _crossRequest
}

CheckCrossInstall.propTypes = {
  hasPlugin: PropTypes.bool,
}

function CheckCrossInstall(props) {
  const hasPlugin = props.hasPlugin
  return (
    <div className={hasPlugin ? null : 'has-plugin'}>
      {hasPlugin ? (
        ''
      ) : (
        <Alert
          message={
            <div>
              重要：当前的接口测试服务，需安装 cross-request 扩展（仅支持 Chrome）。
              安装方式：获取仓库代码后，在 chrome://extensions 页面开启「开发者模式」，
              点击「加载已解压的扩展程序」选择 chrome-cross-request 目录，然后刷新本页面。
              <div>
                <a
                  target="blank"
                  href="https://github.com/YApi-Group/yapi/tree/master/chrome-cross-request"
                >
                  [获取扩展与安装说明]
                </a>
              </div>
            </div>
          }
          type="warning"
        />
      )}
    </div>
  )
}

export default CheckCrossInstall
