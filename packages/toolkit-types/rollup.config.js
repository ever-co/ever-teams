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
	plugins: [
		resolve(),
		commonjs(),
		typescript({
			tsconfig: './tsconfig.json',
			declaration: true, // Ensures type declarations are generated
			declarationDir: 'dist', // Output directory for declarations
			emitDeclarationOnly: true // Prevents emitting JS files
		}),
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
