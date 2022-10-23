export type RunFuncReturn = {
  basePath?: string
  apis: any[]
  cats: any[]
}

export type RunFunc = (res: string) => RunFuncReturn | Promise<RunFuncReturn>

export type ImportDataPart = {
  name: string
  run(res: string): RunFuncReturn | Promise<RunFuncReturn>
  desc: string
}

export type DefaultParamType = {
  /** Form 模式下才拥有的属性 */
  type?: 'file' | 'text'
  example?: any

  name: string
  desc: string
  required: '0' | '1'
}

export type ExportDefine = {
  name: string
  route: string
  desc: string
}
