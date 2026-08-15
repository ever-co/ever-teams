import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';
import typescript from '@rollup/plugin-typescript';
import dts from 'rollup-plugin-dts';
import pkg from './package.json' with { type: 'json' };

const libraryName = 'tracker';

const commonPlugins = [
	resolve(),
	commonjs(),
	typescript({
		tsconfig: './tsconfig.json',
		declaration: true, // Ensures type declarations are generated
		declarationDir: 'dist/types', // Output directory for declarations
		emitDeclarationOnly: true, // Prevents emitting JS files
		sourceMap: false,
		declarationMap: false,
		outputToFilesystem: false
	})
];

export default [
	// --- Bundle for NPM (ESM and CJS) for use in other projects ---
	{
		input: 'src/index.ts',
		output: [
			{
				file: pkg.module, // "dist/tracker.module.js"
				format: 'es',
				sourcemap: false
			},
			{
				file: pkg.main, // "dist/tracker.js"
				format: 'cjs',
				sourcemap: false
			}
		],
		plugins: commonPlugins,
		// 'clarity-js' is a dependency, so we mark it as external.
		// The consuming application's bundler will handle it.
		external: ['clarity-js']
	},

	// --- Bundle for CDN (UMD) ---
	{
		input: 'src/umd.ts',
		output: [
			{
				// A non-minified version for debugging
				file: 'dist/tracker.umd.js',
				format: 'umd',
				name: libraryName, // This will become window.tracker
				sourcemap: false
			},
			{
				file: pkg.unpkg, // "dist/tracker.min.js"
				format: 'umd',
				name: libraryName,
				sourcemap: false,
				plugins: [terser()]
			}
		],
		// For the UMD build, we bundle all dependencies.
		plugins: commonPlugins
	},
	{
		input: 'dist/types/index.d.ts',
		output: [{ file: 'dist/index.d.ts', format: 'es' }],
		plugins: [dts()]
	}
];
