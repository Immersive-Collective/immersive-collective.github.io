// const path = require('path');
// const HtmlWebpackPlugin = require('html-webpack-plugin');

// module.exports = {
//   entry: './src/index.js', // Library entry point
//   output: {
//     filename: 'bundle.js',
//     path: path.resolve(__dirname, 'dist'),
//     clean: true,
//     library: 'THREEBundle',
//     libraryTarget: 'window', // Attach everything to `window`
//   },
//   mode: 'production',
//   module: {
//     rules: [
//       {
//         test: /draco_decoder\.js$/,
//         type: 'asset/source',
//       },
//       {
//         test: /\.wasm$/,
//         type: 'asset/inline',
//       },
//       {
//         test: /\.js$/,
//         exclude: /node_modules/,
//         use: {
//           loader: 'babel-loader',
//           options: {
//             presets: ['@babel/preset-env'],
//           },
//         },
//       },
//     ],
//   },
//   resolve: {
//     extensions: ['.js', '.wasm'],
//   },
//   experiments: {
//     asyncWebAssembly: true,
//   },
//   plugins: [
//     new HtmlWebpackPlugin({
//       template: './src/index.html',
//     }),
//   ],
// };

const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  entry: './src/index.js',
  output: {
    filename: 'three-draco-orbit-xr.js',
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
      path: require.resolve('path-browserify'),  // Fix path dependency
    },
  },
  experiments: {
    asyncWebAssembly: true,
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/index.html',
    }),
  ],
};




