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
	// Use package names instead of regex to avoid absolute path issues
	// qs is a dependency; toolkit-types stays a package of its own, so a host has one copy. The TypeScript helpers
	// (tslib) are bundled: the package does not depend on tslib.
	external: (id) => id === 'qs' || id.startsWith('@ever-teams/'),
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
		}),
		publishedDeclarations()
	],
	watch: {
		include: 'src/**',
		exclude: 'node_modules/**'
	}
};
