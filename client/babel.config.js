// 1. 先执行完所有Plugin，再执行Preset。
// 2. 多个Plugin，按照声明次序 *顺序执行* 。
// 3. 多个Preset，按照声明次序 *逆序执行* 。

module.exports = {
  plugins: [
    ['@babel/plugin-transform-typescript', { isTSX: true, optimizeConstEnums: true }],
    '@babel/plugin-transform-modules-umd',
    '@babel/plugin-transform-runtime',
    ['@babel/plugin-proposal-decorators', { legacy: true }],
  ],

  presets: [
    /* 这里的 target 设置已经移动到 package.json browserslist 字段中了 */
    '@babel/preset-env',
    '@babel/preset-react',
  ],
}
