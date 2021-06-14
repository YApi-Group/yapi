import * as path from 'path'

import ip from 'ip'
import moment from 'moment-timezone'
import { DefinePlugin, Configuration } from 'webpack'
import HtmlWebpackPlugin from 'html-webpack-plugin'
import CopyWebpackPlugin from 'copy-webpack-plugin'
import 'webpack-dev-server'

const localHost = ip.address()

const devsFile: Configuration = {
  entry: path.resolve(__dirname, './index.js'),

  output: {
    library: 'MyYapi', // Only for umd/amd
    libraryTarget: 'var', // {'var', 'umd', 'comments', 'this' ...}
    path: path.resolve(__dirname, './dist-devs'), // 没什么用，因为文件默认不会输出
    filename: 'js/[name].[contenthash:8].js',
  },

  mode: 'development',
  /* 用于标记编译文件与源文件对应位置，便于调试，该模式 eval 比 inline-source-map 快 */
  devtool: false,
  /* 开发模式下仍然打开 treeshake */
  optimization: {
    usedExports: true,
    sideEffects: true,
  },

  stats: { children: false },

  watchOptions: {
    aggregateTimeout: 200,
    poll: 500,
    ignored: /node_modules/,
  },

  devServer: {
    hot: true,
    open: true,
    host: localHost,
    clientLogLevel: 'none',
    contentBase: path.resolve(__dirname, './dist-devs'), // 没有静态文件加载的时候，没什么用
    historyApiFallback: true, // 404的页面会自动跳转到/页面
    publicPath: '/',
    writeToDisk: true,
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
          { loader: 'css-loader' },
          { loader: 'postcss-loader' },
          /* antd 需要打开 javascriptEnabled */
          {
            loader: 'less-loader',
            options: {
              lessOptions: {
                javascriptEnabled: true,
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

export default devsFile
