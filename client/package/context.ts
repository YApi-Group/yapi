import { createContext } from 'react'

/**
 * json-schema 编辑器内部共享的上下文
 * 用于替代 React 已废弃的 legacy context（getChildContext/childContextTypes/contextTypes）
 */
export interface SchemaContextValue {
  /** 读取某个节点的展开状态 */
  getOpenValue?: (keys: string[]) => any
  /** 高级设置弹窗中修改当前节点数据 */
  changeCustomValue?: (value: any) => void
  /** moox Model 实例 */
  Model?: any
  /** 是否展示 mock 列 */
  isMock?: boolean
}

const SchemaContext = createContext<SchemaContextValue>({})

export default SchemaContext
