import { MenuOutlined } from '@ant-design/icons'
// import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
// import { useSortable, arrayMove, SortableContext,
//  sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Table } from 'antd'
import { ColumnsType } from 'antd/lib/table'
import React, { Component } from 'react'
import { SortableContainer, SortableElement, SortableHandle, SortEnd } from 'react-sortable-hoc'
// import styles from './ct.module.less'

// eslint-disable-next-line new-cap
const DragHandle = SortableHandle(() => <MenuOutlined style={{ cursor: 'grab', color: '#999' }} />)
// eslint-disable-next-line new-cap
const SortableCon = SortableContainer((props: any) => <tbody {...props} />)
// eslint-disable-next-line new-cap
const SortableItem = SortableElement((props: any) => <tr {...props} />)

const sortCol = {
  title: '排序',
  dataIndex: 'sort',
  width: 30,
  className: 'drag-visible',
  render: () => <DragHandle />,
}

type PropTypes = {
  rowKey: string
  columns: ColumnsType<any>
  dataSource: any[]
  onSortEnd(newDatas: any[]): void
}

class CaseTable extends Component<PropTypes> {
  onSortEnd = ({ oldIndex, newIndex }: SortEnd) => {
    const { dataSource } = this.props
    if (oldIndex !== newIndex) {
      const newDatas = dataSource.slice()
      newDatas.splice(newIndex, 0, ...newDatas.splice(oldIndex, 1))
      // console.log(dataSource, newDatas)
      this.props.onSortEnd(newDatas)
    }
  }

  DraggableContainer = (chProps: any) => (
    <SortableCon useDragHandle disableAutoscroll helperClass="row-dragging" onSortEnd={this.onSortEnd} {...chProps} />
  )

  DraggableBodyRow = (chProps: any) => {
    const { dataSource, rowKey } = this.props
    // function findIndex base on Table rowKey props and should always be a right array index
    const index = dataSource.findIndex(p => p[rowKey] === chProps['data-row-key'])
    // console.log(this.props, chProps, index)
    return <SortableItem index={index} {...chProps} />
  }

  render() {
    const { columns, ...restProps } = this.props
    const realCols = [sortCol, ...columns]

    return (
      <Table
        {...restProps}
        columns={realCols}
        components={{
          body: {
            wrapper: this.DraggableContainer,
            row: this.DraggableBodyRow,
          },
        }}
      />
    )
  }
}

export default CaseTable
