const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  entry: './src/index.js',
  output: {
    filename: '[name].js', // Static names without content hashes
    chunkFilename: '[name].chunk.js', // For split chunks without hashes
    path: path.resolve(__dirname, 'dist'),
    library: 'THREEBundle',
    libraryTarget: 'window',
    clean: true,
  },
  mode: 'production',
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env'],
          },
        },
      },
    ],
  },
  resolve: {
    extensions: ['.js'],
    fallback: {
      fs: false,
      path: require.resolve('path-browserify'),
    },
  },
  experiments: {
    asyncWebAssembly: true,
  },
  optimization: {
    splitChunks: {
      chunks: 'all',
      minSize: 20000, // Minimum chunk size (20 KB)
      maxSize: 100000, // Maximum chunk size (100 KB)
      cacheGroups: {
        vendors: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          priority: -10,
        },
        default: {
          minChunks: 2,
          priority: -20,
          reuseExistingChunk: true,
        },
      },
    },
    runtimeChunk: 'single',
  },

  plugins: [
    new HtmlWebpackPlugin({
      template: './src/index.html',
      inject: 'body', // Automatically inject scripts into the body
      scriptLoading: 'defer',
    }),
  ],
};
