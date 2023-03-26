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
        test: /\.less$/,
        use: [
          { loader: MiniCssExtractPlugin.loader },
          { loader: 'css-loader' } /* css-loader auto set module for \.module\. files */,
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
          name: '[contenthash:8].[ext]',
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

  externals: {},

  plugins: [
    new DefinePlugin({
      VERSION_INFO: JSON.stringify(
        'version: ' + moment.tz('Asia/Shanghai').format(),
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
