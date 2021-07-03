// 1. 先执行完所有Plugin，再执行Preset。
// 2. 多个Plugin，按照声明次序 *顺序执行* 。
// 3. 多个Preset，按照声明次序 *逆序执行* 。

module.exports = {
  presets: [
    /* 这里的 target 设置已经移动到 package.json browserslist 字段中了 */
    ['@babel/preset-env', { targets: { node: 'current' } }],
  ],
}
