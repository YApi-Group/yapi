import webpackMerge from 'webpack-merge'

import prodConf from './webpack.prod'

export default webpackMerge(prodConf, {
  /* 分析时不要压缩代码，不然分析不了了 */
  optimization: {
    minimize: false,
    concatenateModules: false,
  },
})
