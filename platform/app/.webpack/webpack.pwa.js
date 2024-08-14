const path = require('path');
const { merge } = require('webpack-merge');
const webpack = require('webpack');
const webpackBase = require('./../../../.webpack/webpack.base.js');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { InjectManifest } = require('workbox-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const Dotenv = require('dotenv-webpack');

// Directories
const SRC_DIR = path.join(__dirname, '../src');
const DIST_DIR = path.join(__dirname, '../DICOM_Visionneuse'); // Output directory
const PUBLIC_DIR = path.join(__dirname, '../public');

// Env Vars
const HTML_TEMPLATE = process.env.HTML_TEMPLATE || 'index.html';
const PUBLIC_URL = process.env.PUBLIC_URL || '/DICOM_Visionneuse/'; // Public URL

module.exports = (env, argv) => {
  const isProdBuild = process.env.NODE_ENV === 'production';

  const mergedConfig = merge(webpackBase(env, argv, { SRC_DIR, DIST_DIR }), {
    entry: {
      app: process.env.ENTRY_TARGET || `${SRC_DIR}/index.js`,
    },
    output: {
      path: DIST_DIR,
      filename: isProdBuild ? '[name].bundle.[contenthash].js' : '[name].js',
      publicPath: PUBLIC_URL,
    },
    resolve: {
      modules: [
        path.resolve(__dirname, '../node_modules'),
        path.resolve(__dirname, '../../../node_modules'),
        SRC_DIR,
      ],
    },
    plugins: [
      new Dotenv(),
      new CleanWebpackPlugin(),
      new CopyWebpackPlugin({
        patterns: [
          {
            from: PUBLIC_DIR,
            to: DIST_DIR,
            globOptions: {
              ignore: ['**/config/**', '**/html-templates/**', '.DS_Store'],
            },
          },
          {
            from: `${PUBLIC_DIR}/config/google.js`,
            to: `${DIST_DIR}/google.js`,
          },
          {
            from: `${PUBLIC_DIR}/${process.env.APP_CONFIG || 'config/default.js'}`,
            to: `${DIST_DIR}/app-config.js`,
          },
        ],
      }),
      new HtmlWebpackPlugin({
        template: `${PUBLIC_DIR}/html-templates/${HTML_TEMPLATE}`,
        filename: 'index.html',
        templateParameters: {
          PUBLIC_URL: PUBLIC_URL,
        },
      }),
      new InjectManifest({
        swDest: 'sw.js',
        swSrc: path.join(SRC_DIR, 'service-worker.js'),
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        exclude: [/theme/],
        maximumFileSizeToCacheInBytes: 1024 * 1024 * 50,
      }),
    ],
    devServer: {
      open: true,
      port: Number(process.env.OHIF_PORT || 3000),
      client: {
        overlay: { errors: true, warnings: false },
      },
      proxy: {
        '/dicomweb': 'http://localhost:5000',
      },
      static: [
        {
          directory: path.join(__dirname, '../../testdata'),
          publicPath: '/viewer-testdata',
        },
      ],
      historyApiFallback: {
        disableDotRule: true,
        index: PUBLIC_URL + 'index.html',
      },
      headers: {
        'Cross-Origin-Embedder-Policy': 'require-corp',
        'Cross-Origin-Opener-Policy': 'same-origin',
      },
    },
  });

  if (isProdBuild) {
    mergedConfig.plugins.push(
      new MiniCssExtractPlugin({
        filename: '[name].bundle.css',
        chunkFilename: '[id].css',
      })
    );
  }

  return mergedConfig;
};
