/* eslint-disable @typescript-eslint/no-require-imports */
const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin'); // NEW
const webpack = require('webpack');
const dotenv = require('dotenv');

const env = dotenv.config({ path: path.resolve(__dirname, '../.env.local') }).parsed || {};

module.exports = {
  mode: process.env.NODE_ENV || 'development',
  entry: {
    popup: './src/popup/index.tsx',
    background: './src/background/service-worker.ts',
    content: './src/content/ContentScript.tsx',
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    clean: true,
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/i,
        use: [
          MiniCssExtractPlugin.loader, // CHANGED: Extracts CSS to file
          'css-loader',
          'postcss-loader' // NEW: Processes Tailwind
        ],
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js', '.jsx'],
    alias: {
      '@': path.resolve(__dirname, '../src'),
      '@extension': path.resolve(__dirname, './src'),
    },
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env': JSON.stringify(env),
    }),
    new HtmlWebpackPlugin({
      template: './src/popup/popup.html',
      filename: 'popup.html',
      chunks: ['popup'],
    }),
    new MiniCssExtractPlugin({ // NEW: Configures the output file
      filename: '[name].css', // This creates content.css from content.js
    }),
    new CopyPlugin({
      patterns: [
        { from: 'manifest.json', to: 'manifest.json' },
        { from: 'public/assets', to: 'assets', noErrorOnMissing: true },
      ],
    }),
  ],
  devtool: process.env.NODE_ENV === 'production' ? false : 'inline-source-map',
};