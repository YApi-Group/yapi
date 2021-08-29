import { Table } from 'antd'
import React from 'react'

const columns = [
  {
    title: 'Group',
    dataIndex: 'name',
    key: 'name',
  },
  {
    title: '项目',
    dataIndex: 'project',
    key: 'project',
  },
  {
    title: '接口',
    dataIndex: 'interface',
    key: 'interface',
  },
  {
    title: 'mock数据',
    dataIndex: 'mock',
    key: 'mock',
  },
]

type StatTableProps = {
  dataSource: any
}

const StatTable = (props: StatTableProps) => {
  const { dataSource } = props
  return (
    <div className="m-row-table">
      <h3 className="statis-title">分组数据详情</h3>
      <Table
        className="statis-table"
        pagination={false}
        dataSource={dataSource}
        columns={columns}
      />
    </div>
  )
}

// StatTable.propTypes = {
//   dataSource: PropTypes.array,
// }

export default StatTable
