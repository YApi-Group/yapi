
export type NameValue<T> = {
  name: string
  value: T
}

export type NameValueStr = NameValue<string>
export type NameValueNum = NameValue<number>

export type EnvPart = {
  _id?: string
  name: string
  domain: string
  header?: NameValueStr[]
  global?: NameValueStr[]
}

export type CatPart = {
  index: number
  _id: number
  name: string
  project_id: number
  desc: string
  uid: number
  add_time: number
  up_time: number
  __v: number
}

export type ProjectGetData = {
  switch_notice: boolean
  is_mock_open: boolean
  strice: boolean
  is_json5: boolean
  _id: number
  name: string
  basepath: string
  project_type: string
  group_id: number
  icon: string
  color: string
  env: EnvPart[]
  uid: number
  add_time: number
  up_time: number
  tag: any[]
  cat: CatPart[]
  role: number
}

