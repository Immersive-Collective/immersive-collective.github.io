// const path = require('path');
// const HtmlWebpackPlugin = require('html-webpack-plugin');
// const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

// module.exports = {
//   entry: './src/index.js',
//   output: {
//     filename: 'bundle.js',
//     path: path.resolve(__dirname, 'dist'),
//     clean: true, // Clean the output directory before emit
//   },
//   mode: 'production',
//   module: {
//     rules: [
//       {
//         test: /\.wasm$/, // Handle .wasm files
//         type: 'asset/inline', // Inline WASM as base64
//       },
//       {
//         test: /\.js$/,
//         exclude: /node_modules/,
//         use: {
//           loader: 'babel-loader',
//           options: {
//             presets: ['@babel/preset-env'], // Transpile modern JS
//           },
//         },
//       },
//       {
//         test: /\.js$/, // Specifically handle DRACO JS wrapper files
//         include: /draco/, // Ensure this targets DRACO files
//         type: 'asset/source', // Inline as raw JavaScript source
//       },
//     ],
//   },
//   resolve: {
//     extensions: ['.js', '.wasm'], // Resolve these extensions
//   },
//   plugins: [
//     new HtmlWebpackPlugin({
//       template: './src/index.html', // HTML template
//     }),
//     new BundleAnalyzerPlugin({
//       analyzerMode: 'static',
//       openAnalyzer: false,
//       reportFilename: 'bundle-report.html',
//     }),
//   ],
//   experiments: {
//     asyncWebAssembly: true, // Enable async WebAssembly
//   },
//   optimization: {
//     minimize: true, // Minify the output
//   },
//   devtool: 'source-map', // Generate source maps for debugging
// };


// const path = require('path');
// const HtmlWebpackPlugin = require('html-webpack-plugin');
// const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

// module.exports = {
//   entry: './src/index.js', // Your main entry point
//   output: {
//     filename: 'bundle.js',
//     path: path.resolve(__dirname, 'dist'),
//     clean: true, // Clean the output directory before emit
//   },
//   mode: 'production',
//   module: {
//     rules: [
//       {
//         test: /\.wasm$/, // Handle .wasm files
//         type: 'asset/inline', // Inline WASM as base64 in the output bundle
//       },
//       {
//         test: /\.js$/,
//         exclude: /node_modules/,
//         use: {
//           loader: 'babel-loader',
//           options: {
//             presets: ['@babel/preset-env'], // Transpile modern JS
//           },
//         },
//       },
//       {
//         test: /draco_decoder\.js$/, // Match only the DRACO decoder JS file
//         type: 'asset/source', // Inline as raw JavaScript source
//       },
//     ],
//   },
//   resolve: {
//     extensions: ['.js', '.wasm'], // Resolve these extensions
//   },
//   plugins: [
//     new HtmlWebpackPlugin({
//       template: './src/index.html', // HTML template
//     }),
//     new BundleAnalyzerPlugin({
//       analyzerMode: 'static',
//       openAnalyzer: false,
//       reportFilename: 'bundle-report.html',
//     }),
//   ],
//   experiments: {
//     asyncWebAssembly: true, // Enable async WebAssembly support
//   },
//   optimization: {
//     minimize: true, // Minify the output
//   },
//   devtool: 'source-map', // Generate source maps for debugging
// };


const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  entry: './src/index.js',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
    clean: true, // Clean the output directory before emit
  },
  mode: 'production',
  module: {
    rules: [
      {
        test: /draco_decoder\.js$/,
        type: 'asset/source', // Inline the JS file as raw source
      },
      {
        test: /\.wasm$/, // Handle `.wasm` files
        type: 'asset/inline', // Inline WASM as base64
      },
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
    extensions: ['.js', '.wasm'], // Add `.wasm` to resolved extensions
  },
  experiments: {
    asyncWebAssembly: true, // Enable WebAssembly
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/index.html',
    }),
  ],
};

