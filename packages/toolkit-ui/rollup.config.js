import typescript from '@rollup/plugin-typescript';
import postcss from 'rollup-plugin-postcss';
import commonjs from '@rollup/plugin-commonjs';
import { nodeResolve as resolve } from '@rollup/plugin-node-resolve';
import peerDepsExternal from 'rollup-plugin-peer-deps-external';
import terser from '@rollup/plugin-terser';

export default {
	input: 'src/index.ts',
	output: [
		{
			file: 'dist/index.es.js',
			format: 'es',
			sourcemap: false
		}
	],
	plugins: [
		peerDepsExternal(),
		resolve({
			extensions: ['.js', '.ts', '.jsx', '.tsx'],
			preferBuiltins: true
		}),
		commonjs(),
		typescript(),
		// PostCSS plugin configured to preserve raw Tailwind classes
		// extract: false - don't extract CSS to separate file
		// inject: false - don't inject CSS into JS
		// modules: false - don't use CSS modules
		postcss({
			extract: false,
			inject: false,
			modules: false
		}),
		terser({
			compress: {
				drop_console: true, // Remove console.log statements
				drop_debugger: true // Remove debugger statements
			},
			mangle: true // Shorten variable names
		})
	],
	external: ['react', 'react-dom'],
	onwarn(warning, warn) {
		if (warning.code === 'MODULE_LEVEL_DIRECTIVE') return;
		warn(warning);
	},
	watch: {
		include: 'src/**',
		exclude: 'node_modules/**'
	}
};
