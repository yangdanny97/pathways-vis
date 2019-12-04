const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = {
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',

  plugins: [
    new MiniCssExtractPlugin({
      // Options similar to the same options in webpackOptions.output
      // all options are optional
      filename: '../css/[name].css',
      chunkFilename: '[id].css',
      ignoreOrder: false, // Enable to remove warnings about conflicting order
    }),
  ],

  entry: {
    splash: './src/splash.js',
    pathways: './src/pathways.js',
    about: './src/about.js'
  },

  output: {
    filename: '[name].bundle.js',
    path: __dirname + '/static/dist'
  },

  module: {
    rules: [
      {
        test: /\.s?css$/,
  
        use: [
          {
            loader: MiniCssExtractPlugin.loader,
            options: { publicPath: "static" },
          },
          { loader: "css-loader", options: {url: false} },
          "sass-loader",
        ]
      }
    ],
  },

  node: {
    fs: 'empty',
    net: 'empty',
    tls: 'empty'
  },

};
