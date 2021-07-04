// 1. 先执行完所有Plugin，再执行Preset。
// 2. 多个Plugin，按照声明次序 *顺序执行* 。
// 3. 多个Preset，按照声明次序 *逆序执行* 。

module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' } }],
  ],
}
