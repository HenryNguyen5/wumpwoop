import { CleanWebpackPlugin } from "clean-webpack-plugin";
import HTMLWebpackPlugin from "html-webpack-plugin";
import path from "path";
import { Configuration } from "webpack";
import TsconfigPathsPlugin from 'tsconfig-paths-webpack-plugin'

delete process.env.TS_NODE_PROJECT

const config: Configuration = {
  mode: (process.env.NODE_ENV as any) ?? "development",
  entry: {
    app: "./src/index.tsx",
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, "dist"),
  },
  resolve: {
    extensions: ['.wasm', '.mjs', '.js', '.json', '.ts', 'tsx'],
    plugins: [
     new TsconfigPathsPlugin(),
    ]
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [
          {
            loader: 'ts-loader',
            options: {
              transpileOnly: true,

            }
          }
        ]
      },
      {
        test: /.css$/,
        use: ["style-loader", "css-loader"],
      },
    ],
  },
  plugins: [

    new CleanWebpackPlugin({ cleanStaleWebpackAssets: true }),
    new HTMLWebpackPlugin({ title: "Output Management", template: './src/template.html' }),

  ],
  devtool: "source-map",
  devServer: {
    contentBase: "./dist",
    bonjour: false,
    hot: true,
  },
};

export default config;
