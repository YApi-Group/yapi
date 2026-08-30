import * as path from 'path'

import ReactRefreshWebpackPlugin from '@pmmmwh/react-refresh-webpack-plugin'
import CopyWebpackPlugin from 'copy-webpack-plugin'
import HtmlWebpackPlugin from 'html-webpack-plugin'
import ip from 'ip'
import moment from 'moment-timezone'
import { DefinePlugin, Configuration } from 'webpack'

import 'webpack-dev-server'

const devConf: Configuration = {
  target: 'web',

  entry: {
    main: path.resolve(__dirname, './index.tsx'),
  },

  output: {
    library: 'MyYapi', // Only for umd/amd
    libraryTarget: 'var', // {'var', 'umd', 'comments', 'this' ...}
    path: path.resolve(__dirname, './dist-dev'), // 没什么用，因为文件默认不会输出
    filename: 'js/[name].[contenthash:8].js',
    publicPath: '/',
  },

  mode: 'development',
  stats: { children: true },
  /* 缓存到硬盘上，可以加快冷启动速度 */
  cache: {
    type: 'filesystem',
  },
  /* 用于标记编译文件与源文件对应位置，便于调试，该模式 eval 比 inline-source-map 快 */
  devtool: 'inline-source-map',
  optimization: {
    /* 开发模式下如下设置 可提升热更新速度 */
    moduleIds: 'deterministic',
    runtimeChunk: 'single',
    /* 开发模式下仍然打开 treeshake */
    usedExports: true,
    sideEffects: true,
    /* 开发模式下仍然 split 可以提升热更新速度 */
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendors: {
          test: /node_modules/,
          priority: 10,
        },
      },
    },
  },

  watchOptions: {
    aggregateTimeout: 200,
    ignored: /node_modules/,
  },

  devServer: {
    hot: true,
    open: ['/'],
    // host: ip.address(),
    client: { logging: 'none' },
    devMiddleware: {
      writeToDisk: false,
    },
    static: {
      directory: path.resolve(__dirname, './dist-dev'), // 没有静态文件加载的时候，没什么用
    },

    historyApiFallback: true, // 404的页面会自动跳转到/页面

    proxy: [
      {
        // 所有 /api/ 请求都代理到后端（含 websocket，如接口编辑冲突检测）
        context: '/api/',
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
        ws: true,
      },
    ] as any, // 临时 debug 类型提示错误问题
  },

  module: {
    rules: [
      {
        test: /\.css$/,
        use: [{ loader: 'style-loader' }, { loader: 'css-loader' }, { loader: 'postcss-loader' }],
      },

      {
        test: /\.scss$/,
        use: [
          { loader: 'style-loader' },
          { loader: 'css-loader' },
          { loader: 'postcss-loader' },
          { loader: 'sass-loader' },
        ],
      },

      {
        test: /\.[jt]sx?$/,
        exclude: /node_modules/,
        loader: 'babel-loader',
      },

      // webpack 5 下继续用 url-loader/file-loader 会与内置 asset 处理叠加：
      // css url() 引用的资源会把 loader 输出的 JS 源码当图片二次 emit（体积 60 字节的假文件），
      // 故迁移到原生 asset modules
      {
        test: /\.(eot|ttf|woff|woff2)(\?\S*)?$/,
        type: 'asset/resource',
        generator: { filename: 'fonts/[name][ext]' },
      },

      {
        test: /\.(png|jpe?g|gif|svg)(\?\S*)?$/,
        type: 'asset',
        parser: { dataUrlCondition: { maxSize: 4096 } },
        generator: { filename: 'img/[name][ext]' },
      },

      {
        test: /\.json5?$/,
        loader: 'json5-loader',
        type: 'javascript/auto',
      },
      {
        // ../common 是共享源码、没有自己的 node_modules：其第三方依赖优先从 client/node_modules 解析，
        // 避免沿目录向上落到根目录的 node_modules（此前 ajv 就因此实际用的是根目录的 5.x）。
        // 只对 common/ 生效——若放到全局 resolve.modules，会破坏 client/node_modules 内各包对自身嵌套依赖的就近解析
        include: path.resolve(__dirname, '../common'),
        resolve: {
          modules: [path.resolve(__dirname, 'node_modules'), 'node_modules'],
        },
      },
    ],
  },

  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
    alias: {
      '@': path.resolve(__dirname, './'),
      '@common': path.resolve(__dirname, '../common'),
    },
  },

  externals: {},

  plugins: [
    new ReactRefreshWebpackPlugin(),

    new DefinePlugin({
      /** 编译时添加版本信息 */
      VERSION_INFO: JSON.stringify('version: ' + moment.tz('Asia/Shanghai').format()),
    }),

    new HtmlWebpackPlugin({
      filename: 'index.html',
      template: path.resolve(__dirname, './static/index.dev.ejs'),
      hash: true,
    }),

    new CopyWebpackPlugin({
      patterns: [{ from: './static/', to: './', globOptions: { ignore: ['**/*.ejs'] } }],
    }),
  ],
}

export default devConf
