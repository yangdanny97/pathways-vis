const path = require('path');

module.exports = {
  mode: 'development',
  entry: './src/splash.js',
  output: {
    filename: 'splash.js',
    publicPath: 'dist'
  },

  module: {
    rules: [
      {
        test: /\.scss$/,
  
        use: [
          { loader: "style-loader", },
          { loader: "css-loader", },
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
};
