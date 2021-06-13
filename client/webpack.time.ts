import SpeedMeasurePlugin from 'speed-measure-webpack-plugin'

import webpackProd from './webpack.prod'

const smp = new SpeedMeasurePlugin()

export default smp.wrap(webpackProd)
