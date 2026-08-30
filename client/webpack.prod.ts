import * as path from 'path'

import CopyWebpackPlugin from 'copy-webpack-plugin'
import CssMinimizerWebpackPlugin from 'css-minimizer-webpack-plugin'
import HtmlWebpackPlugin from 'html-webpack-plugin'
import MiniCssExtractPlugin from 'mini-css-extract-plugin'
import moment from 'moment-timezone'
import TerserWebpackPlugin from 'terser-webpack-plugin'
import { Configuration, DefinePlugin } from 'webpack'

const prodConf: Configuration = {
  target: 'web',

  entry: {
    main: path.resolve(__dirname, './index.tsx'),
  },

  output: {
    library: 'MyYapi', // Only for umd/amd
    libraryTarget: 'var', // {'var', 'umd', 'comments', 'this' ...}
    path: path.resolve(__dirname, './dist-prod'),
    filename: 'js/[name].[contenthash:8].js',
    publicPath: '/',
  },

  stats: { children: false },

  mode: 'production',
  optimization: {
    minimize: true,
    minimizer: [
      // sourceMap: true // set to true if you want JS source maps
      new TerserWebpackPlugin({
        extractComments: false,
      }),
      new CssMinimizerWebpackPlugin({}),
    ],

    splitChunks: {
      chunks: 'all',
      minSize: 80000,
      minChunks: 1,
      maxAsyncRequests: 5,
      maxInitialRequests: 5,
      automaticNameDelimiter: '-',
    },
  },

  module: {
    rules: [
      {
        test: /\.css$/,
        use: [
          { loader: MiniCssExtractPlugin.loader },
          { loader: 'css-loader' },
          { loader: 'postcss-loader' },
        ],
      },

      {
        test: /\.scss$/,
        use: [
          { loader: MiniCssExtractPlugin.loader },
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
        generator: { filename: 'fonts/[contenthash:8][ext]' },
      },

      {
        test: /\.(png|jpe?g|gif|svg)(\?\S*)?$/,
        type: 'asset',
        parser: { dataUrlCondition: { maxSize: 4096 } },
        generator: { filename: 'img/[contenthash:8][ext]' },
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
    new DefinePlugin({
      VERSION_INFO: JSON.stringify(
        'version: ' + moment.tz('Asia/Shanghai').format()
      ) /* 编译时添加版本信息 */,
    }),

    new MiniCssExtractPlugin({
      filename: 'css/[name].[contenthash:8].css',
    }),

    new HtmlWebpackPlugin({
      filename: 'index.html', // 生产模式下重命名为 index.html
      template: path.resolve(__dirname, './static/index.prod.ejs'),
      hash: true,
    }),

    new CopyWebpackPlugin({
      patterns: [{ from: './static/', to: './', globOptions: { ignore: ['**/*.ejs'] } }],
    }),
  ],
}

export default prodConf
