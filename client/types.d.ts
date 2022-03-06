export type DispatchCommonFunc<T extends (...args: any) => any> = (...args: Parameters<T>) => any
export type DispatchPromiseFunc<T extends (...args: any) => any> = (...args: Parameters<T>) => ReturnType<T>['payload']

export type AnyFunc = (...args: any) => any

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'HEAD' | 'OPTIONS' | 'PATCH'
