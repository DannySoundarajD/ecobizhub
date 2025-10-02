// webpack.config.js
module.exports = {
  // ... other configuration settings
  module: {
    rules: [
      {
        test: /\.js$/,
        enforce: 'pre',
        use: ['source-map-loader'],
        exclude: /node_modules\/html2pdf.js/, // This line ignores the library
      },
    ],
  },
};