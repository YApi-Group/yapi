import SpeedMeasurePlugin from 'speed-measure-webpack-plugin'

import prodConf from './webpack.prod'

const smp = new SpeedMeasurePlugin()

export default smp.wrap(prodConf)
