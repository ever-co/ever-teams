const path = require('node:path');

/** @type {import('next').NextConfig} */
module.exports = {
	// The Docker image sets NEXT_BUILD_OUTPUT_TYPE=standalone (as apps/web does): Next then traces the
	// files the server needs into .next/standalone, so the image ships those instead of the whole
	// monorepo install. Tracing starts at the repository root, where yarn hoists node_modules.
	output: process.env.NEXT_BUILD_OUTPUT_TYPE === 'standalone' ? 'standalone' : undefined,
	outputFileTracingRoot: path.resolve(__dirname, '../../../..'),
	// Build tools that the hoisted monorepo install puts in reach of Next's server trace: webpack and the
	// minifiers it can load, plus the musl builds of sharp. `node server.js` never loads them (~110 MB).
	outputFileTracingExcludes: {
		'*': [
			'**/node_modules/webpack/**',
			'**/node_modules/minimizer-webpack-plugin/**',
			'**/node_modules/@swc/core/**',
			'**/node_modules/@swc/core-*/**',
			'**/node_modules/esbuild/**',
			'**/node_modules/@esbuild/**',
			'**/node_modules/{sass,svgo,csso,clean-css,uglify-js}/**',
			'**/node_modules/babel-plugin-react-compiler/**',
			'**/node_modules/@img/*linuxmusl*/**'
		]
	},
	reactStrictMode: true,
	transpilePackages: ['@ever-teams/toolkit-ui', '@ever-teams/atoms']
};
