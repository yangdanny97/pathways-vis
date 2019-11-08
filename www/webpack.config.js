const path = require('path');

module.exports = {
  mode: 'development',

  entry: {
    splash: './src/splash.js',
    pathways: './src/pathways.js',
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
          { loader: "style-loader", },
          { loader: "css-loader", options: {url: false} },
          { 
            loader: "sass-loader",
            options: {
              implementation: require("sass")
            }
          }
        ]
      }
    ],
  },

  node: {
    fs: 'empty',
    net: 'empty',
    tls: 'empty'
  }
};
