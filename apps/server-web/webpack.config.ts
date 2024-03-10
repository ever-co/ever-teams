import path from 'path';
import { Configuration } from 'webpack';

const config: Configuration = {
	mode: 'development',
	entry: './main.ts',
	target: 'electron-main',
	output: {
		path: path.resolve(__dirname, 'dist'),
		filename: 'main.js'
	},
	resolve: {
		extensions: ['.tsx', '.ts', '.js']
	},
	module: {
		rules: [
			{
				test: /\.tsx?$/,
				use: 'ts-loader',
				exclude: /node_modules/
			}
		]
	},
	node: {
		__dirname: false,
		__filename: false
	}
};

export default config;
