import { MenuOutlined } from '@ant-design/icons'
// import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
// import { useSortable, arrayMove, SortableContext,
//  sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Table } from 'antd'
import React, { Component } from 'react'
import { SortableContainer, SortableElement, SortableHandle, SortEnd } from 'react-sortable-hoc'

// import styles from './ct.module.less'

const DragHandle = SortableHandle(() => <MenuOutlined style={{ cursor: 'grab', color: '#999' }} />)

const columns = [
  {
    title: 'Sort',
    dataIndex: 'sort',
    width: 30,
    className: 'drag-visible',
    render: () => <DragHandle />,
  },
  {
    title: 'Age',
    dataIndex: 'age',
  },
  {
    title: 'Address',
    dataIndex: 'address',
  },
]

const data = [
  {
    key: '1',
    name: 'John Brown',
    age: 32,
    address: 'New York No. 1 Lake Park',
    index: 0,
  },
  {
    key: '2',
    name: 'Jim Green',
    age: 42,
    address: 'London No. 1 Lake Park',
    index: 1,
  },
  {
    key: '3',
    name: 'Joe Black',
    age: 32,
    address: 'Sidney No. 1 Lake Park',
    index: 2,
  },
]

const SortableCon = SortableContainer((props: any) => <tbody {...props} />)
const SortableItem = SortableElement((props: any) => <tr {...props} />)

// function SortableItem(props: any) {
//   const { attributes, listeners, setNodeRef } = useSortable({ id: props.id })

//   return (
//     <tr ref={setNodeRef} {...attributes} {...listeners} {...props} />
//   )
// }

class CaseTable extends Component {
  state = {
    dataSource: data,
  }

  onSortEnd = ({ oldIndex, newIndex }: SortEnd) => {
    const { dataSource } = this.state
    if (oldIndex !== newIndex) {
      // arrayMoveImmutable([].concat(dataSource), oldIndex, newIndex).filter(el => !!el)
      const newData = dataSource.slice()
      newData.splice(newIndex, 0, ...newData.splice(oldIndex, 1))
      console.log('Sorted items: ', newData)
      this.setState({ dataSource: newData })
    }
  }

  DraggableContainer = (props:any) => (
    <SortableCon 
      useDragHandle
      disableAutoscroll
      helperClass="row-dragging"
      onSortEnd={this.onSortEnd} 
      {...props}
    />
  )

  DraggableBodyRow = (props: any) => {
    const { dataSource } = this.state
    // function findIndex base on Table rowKey props and should always be a right array index
    const index = dataSource.findIndex(x => x.index === props['data-row-key'])
    return <SortableItem index={index} {...props} />
  }

  render() {
    const { dataSource } = this.state

    return (
      <Table
        pagination={false}
        dataSource={dataSource}
        columns={columns}
        rowKey="index"
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
