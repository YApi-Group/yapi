import { Row, Col, Tabs } from 'antd'
import type { TabsProps } from 'antd'
import PropTypes from 'prop-types'
import React from 'react'

function jsonFormat(json: any) {
  // console.log('json',json)
  if (json && typeof json === 'object') {
    return JSON.stringify(json, null, '   ')
  }
  return json
}

type PropTypes = {
  url: string
  data: any
  headers: any
  res_header: any
  res_body: any
  query: string
  validRes: any[]
  status: number
}

const CaseReport = function (props: PropTypes) {
  const params = jsonFormat(props.data)
  const headers = jsonFormat(props.headers)
  const res_header = jsonFormat(props.res_header)
  const res_body = jsonFormat(props.res_body)
  const httpCode = props.status

  let validRes
  if (props.validRes && Array.isArray(props.validRes)) {
    validRes = props.validRes.map((item, index) => <div key={index}>{item.message}</div>)
  }

  const items: TabsProps['items'] = [
    {
      key: 'request',
      label: 'Request',
      className: 'case-report-pane',
      children: (
        <>
          <Row className="case-report">
            <Col className="case-report-title" span="6">
              Url
            </Col>
            <Col span="18">{props.url}</Col>
          </Row>
          {props.query ? (
            <Row className="case-report">
              <Col className="case-report-title" span="6">
                Query
              </Col>
              <Col span="18">{props.query}</Col>
            </Row>
          ) : null}

          {props.headers ? (
            <Row className="case-report">
              <Col className="case-report-title" span="6">
                Headers
              </Col>
              <Col span="18">
                <pre>{headers}</pre>
              </Col>
            </Row>
          ) : null}

          {params ? (
            <Row className="case-report">
              <Col className="case-report-title" span="6">
                Body
              </Col>
              <Col span="18">
                <pre style={{ whiteSpace: 'pre-wrap' }}>{params}</pre>
              </Col>
            </Row>
          ) : null}
        </>
      ),
    },
    {
      key: 'response',
      label: 'Response',
      className: 'case-report-pane',
      children: (
        <>
          <Row className="case-report">
            <Col className="case-report-title" span="6">
              HttpCode
            </Col>
            <Col span="18">
              <pre>{httpCode}</pre>
            </Col>
          </Row>
          {props.res_header ? (
            <Row className="case-report">
              <Col className="case-report-title" span="6">
                Headers
              </Col>
              <Col span="18">
                <pre>{res_header}</pre>
              </Col>
            </Row>
          ) : null}
          {props.res_body ? (
            <Row className="case-report">
              <Col className="case-report-title" span="6">
                Body
              </Col>
              <Col span="18">
                <pre>{res_body}</pre>
              </Col>
            </Row>
          ) : null}
        </>
      ),
    },
    {
      key: 'valid',
      label: '验证结果',
      className: 'case-report-pane',
      children: props.validRes ? (
        <Row className="case-report">
          <Col className="case-report-title" span="6">
            验证结果
          </Col>
          <Col span="18">
            <pre>{validRes}</pre>
          </Col>
        </Row>
      ) : null,
    },
  ]

  return (
    <div className="report">
      <Tabs defaultActiveKey="request" items={items} />
    </div>
  )
}

export default CaseReport
