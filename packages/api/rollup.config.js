import typescript from '@rollup/plugin-typescript';
import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
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
	// Use package names instead of regex to avoid absolute path issues
	external: ['qs', 'tslib'],
	plugins: [
		resolve({
			extensions: ['.js', '.ts', '.jsx', '.tsx'],
			preferBuiltins: true
		}),
		commonjs(),
		typescript({ tsconfig: './tsconfig.json' }),
		terser({
			compress: {
				drop_console: true, // Remove console.log statements
				drop_debugger: true // Remove debugger statements
			},
			mangle: true // Shorten variable names
		})
	],
	watch: {
		include: 'src/**',
		exclude: 'node_modules/**'
	}
};
