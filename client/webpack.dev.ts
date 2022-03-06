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
    main: path.resolve(__dirname, './index.js'),
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
    host: ip.address(),
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
        /* 所有 /api/ 请求都代理到后端 */
        context: '/api/',
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
    ] as any, // 临时 debug 类型提示错误问题
  },

  module: {
    rules: [
      {
        test: /\.css$/,
        use: [
          { loader: 'style-loader' },
          { loader: 'css-loader' },
          { loader: 'postcss-loader' },
        ],
      },

      {
        test: /\.less$/,
        use: [
          { loader: 'style-loader' },
          { loader: 'css-loader' }, /* css-loader auto set module for \.module\. files */
          { loader: 'postcss-loader' },
          {
            loader: 'less-loader',
            options: {
              lessOptions: {
                javascriptEnabled: true, /* antd need javascriptEnabled */
              },
            },
          },
        ],
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

      {
        test: /\.[jt]sx?$/,
        include: /(json-schema-editor-visual)/,
        loader: 'babel-loader',
      },

      {
        test: /\.(eot|ttf|woff|woff2)(\?\S*)?$/,
        loader: 'file-loader',
      },

      {
        test: /\.(png|jpe?g|gif|svg)(\?\S*)?$/,
        loader: 'url-loader',
        options: {
          limit: 4096,
          emitFile: true,
          outputPath: './img/',
          useRelativePath: false,
          name: '[name].[ext]',
        },
      },

      {
        test: /\.json5?$/,
        loader: 'json5-loader',
        type: 'javascript/auto',
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

  externals: {
  },

  plugins: [
    new ReactRefreshWebpackPlugin(),

    new DefinePlugin({
      VERSION_INFO: JSON.stringify('version: ' + moment.tz('Asia/Shanghai').format()), /* 编译时添加版本信息 */
    }),

    new HtmlWebpackPlugin({
      filename: 'index.html',
      template: path.resolve(__dirname, './static/index.dev.ejs'),
      hash: true,
    }),

    new CopyWebpackPlugin({
      patterns: [
        { from: './static/', to: './', globOptions: { ignore: ['**/*.ejs'] } },
      ],
    }),
  ],
}

export default devConf
