// CSS Modules 类型声明
// 让 TypeScript / VSCode 识别 `*.module.scss` 等样式模块的默认导入，
// 避免出现 "Cannot find module './xxx.module.scss'" (ts2307) 报错。
// 注意: typescript-plugin-css-modules 仅在编辑器中生效, 此声明可同时让 tsc 通过。

declare module '*.module.scss' {
  const classes: { readonly [key: string]: string }
  export default classes
}

declare module '*.module.less' {
  const classes: { readonly [key: string]: string }
  export default classes
}

declare module '*.module.css' {
  const classes: { readonly [key: string]: string }
  export default classes
}

declare const VERSION_INFO: string
