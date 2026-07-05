import { MenuOutlined } from '@ant-design/icons'
import { DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Table } from 'antd'
import type { ColumnsType, ColumnType } from 'antd/es/table'
import React, { createContext, useContext, useMemo } from 'react'

type RowContextProps = {
  setActivatorNodeRef?: (element: HTMLElement | null) => void
  listeners?: any
}

const RowContext = createContext<RowContextProps>({})

const DragHandle: React.FC = () => {
  const { setActivatorNodeRef, listeners } = useContext(RowContext)
  return (
    <span ref={setActivatorNodeRef} {...listeners} style={{ cursor: 'grab', color: '#999', touchAction: 'none' }}>
      <MenuOutlined />
    </span>
  )
}

type BodyRowProps = React.HTMLAttributes<HTMLTableRowElement> & {
  'data-row-key': React.Key
}

const SortableRow: React.FC<BodyRowProps> = props => {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: props['data-row-key'] })

  const style: React.CSSProperties = {
    ...props.style,
    transform: CSS.Translate.toString(transform),
    transition,
    ...(isDragging ? { position: 'relative', zIndex: 999 } : {}),
  }

  const contextValue = useMemo<RowContextProps>(
    () => ({ setActivatorNodeRef, listeners }),
    [setActivatorNodeRef, listeners],
  )

  return (
    <RowContext.Provider value={contextValue}>
      <tr {...props} ref={setNodeRef} style={style} {...attributes} />
    </RowContext.Provider>
  )
}

// 空数据占位行(rc-table 的 ExpandedRow)没有 data-row-key，不能进 useSortable
const BodyRow: React.FC<BodyRowProps> = props =>
  props['data-row-key'] === undefined ? <tr {...props} /> : <SortableRow {...props} />

const sortCol: ColumnType<any> = {
  title: '排序',
  dataIndex: 'sort',
  width: 50,
  align: 'center',
  render: () => <DragHandle />,
}

type PropTypes = {
  rowKey: string
  columns: ColumnsType<any>
  dataSource: any[]
  onSortEnd?(newDatas: any[]): void
}

function CaseTable(props: PropTypes) {
  const { rowKey, columns, dataSource, onSortEnd } = props
  // 设置最小拖动距离，避免手柄上的点击被误判为拖拽
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (over && active.id !== over.id) {
      const oldIndex = dataSource.findIndex(r => r[rowKey] === active.id)
      const newIndex = dataSource.findIndex(r => r[rowKey] === over.id)
      onSortEnd?.(arrayMove(dataSource, oldIndex, newIndex))
    }
  }

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <SortableContext items={dataSource.map(r => r[rowKey])} strategy={verticalListSortingStrategy}>
        <Table
          rowKey={rowKey}
          columns={[sortCol, ...columns]}
          dataSource={dataSource}
          components={{ body: { row: BodyRow } }}
        />
      </SortableContext>
    </DndContext>
  )
}

export default CaseTable
