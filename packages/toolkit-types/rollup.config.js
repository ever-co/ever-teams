import typescript from '@rollup/plugin-typescript';
import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';
import { publishedDeclarations } from '../toolkit-ui/scripts/declarations.mjs';

export default {
	input: 'src/index.ts',
	output: [
		{
			file: 'dist/index.es.js',
			format: 'es',
			sourcemap: false
		},
		// For require() and for the CommonJS build of atoms, which loads this package. Its declarations go to dist/cjs
		// (../toolkit-ui/scripts/declarations.mjs); the file stays in dist, where the TypeScript plugin wants every output.
		{
			file: 'dist/index.cjs',
			format: 'cjs',
			exports: 'named',
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
		}),
		publishedDeclarations()
	],
	watch: {
		include: 'src/**',
		exclude: 'node_modules/**'
	}
};
