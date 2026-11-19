import path from 'node:path';
import typescript from '@rollup/plugin-typescript';
import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';
import { publishedDeclarations } from '../toolkit-ui/scripts/declarations.mjs';

// Use package names instead of regex to avoid absolute path issues
// qs is a dependency; toolkit-types stays a package of its own, so a host has one copy. The TypeScript helpers
// (tslib) are bundled: the package does not depend on tslib.
const external = (id) => id === 'qs' || id.startsWith('@ever-teams/');

// Each build gets its own instances: a plugin keeps state between the hooks of one build.
const plugins = () => [
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
	}),
	publishedDeclarations()
];

const errorsModule = path.resolve('src/lib/client/errors');

// The server entry imports the error classes from the main entry instead of a copy of its own, so that
// `instanceof EverTeamsError` (imported from '@ever-teams/api') holds for the errors it throws. The sources import
// the module by a relative path without extension ('./errors', '../client/errors').
const errorsFromMainEntry = () => ({
	name: 'errors-from-main-entry',
	resolveId(source, importer) {
		const isRelative = source.startsWith('.');
		if (!importer || !isRelative) {
			return null;
		}
		const target = path.resolve(path.dirname(importer), source).replace(/\.[cm]?[jt]s$/, '');
		if (target !== errorsModule) {
			return null;
		}
		return { id: '@ever-teams/api', external: true };
	}
});

const watch = {
	include: 'src/**',
	exclude: 'node_modules/**'
};

export default [
	{
		input: 'src/index.ts',
		output: [
			{
				file: 'dist/index.es.js',
				format: 'es',
				sourcemap: false
			},
			// For require() and for the CommonJS build of atoms, which loads this package. Its declarations go to dist/cjs
			// (../toolkit-ui/scripts/declarations.mjs); the file stays in dist, where the TypeScript plugin wants every
			// output.
			{
				file: 'dist/index.cjs',
				format: 'cjs',
				exports: 'named',
				sourcemap: false
			}
		],
		external,
		plugins: plugins(),
		watch
	},
	// @ever-teams/api/server, built on its own so that the main entry stays as it is.
	{
		input: 'src/server.ts',
		output: [
			{
				file: 'dist/server.es.js',
				format: 'es',
				sourcemap: false
			},
			{
				file: 'dist/server.cjs',
				format: 'cjs',
				exports: 'named',
				sourcemap: false
			}
		],
		external,
		plugins: [errorsFromMainEntry(), ...plugins()],
		watch
	}
];
