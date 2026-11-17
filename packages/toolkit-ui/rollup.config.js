import typescript from '@rollup/plugin-typescript';
import postcss from 'rollup-plugin-postcss';
import commonjs from '@rollup/plugin-commonjs';
import { nodeResolve as resolve } from '@rollup/plugin-node-resolve';
import peerDepsExternal from 'rollup-plugin-peer-deps-external';
import terser from '@rollup/plugin-terser';
import { useClientDirective } from './scripts/use-client-directive.mjs';
import { outputFileName, isKitPackage } from './scripts/module-output.mjs';

// One output file per source module, in ESM (dist) and CommonJS (dist/cjs): a host's bundler keeps only what it uses,
// and Next.js reads each "use client" module as a client component. The kit's own packages stay external, so a host
// has one copy of each.
const createConfig = ({ dir, format, extension, declarations }) => ({
	input: 'src/index.ts',
	output: {
		dir,
		format,
		sourcemap: false,
		preserveModules: true,
		preserveModulesRoot: 'src',
		entryFileNames: (chunk) => outputFileName(chunk, extension),
		...(format === 'cjs' ? { exports: 'named' } : {})
	},
	plugins: [
		peerDepsExternal(),
		resolve({
			extensions: ['.js', '.ts', '.jsx', '.tsx'],
			preferBuiltins: true
		}),
		commonjs(),
		typescript(declarations ? {} : { declaration: false, declarationMap: false, outDir: dir }),
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
				// Warnings and errors stay, as in atoms: only log, info and debug calls are dropped.
				drop_console: ['log', 'info', 'debug'],
				drop_debugger: true
			},
			mangle: true
		}),
		// After terser, which drops directives it does not know.
		useClientDirective()
	],
	external: (id) => isKitPackage(id) || /^react(-dom)?(\/|$)/.test(id),
	watch: {
		include: 'src/**',
		exclude: 'node_modules/**'
	}
});

export default [
	createConfig({ dir: 'dist', format: 'es', extension: '.es.js', declarations: true }),
	createConfig({ dir: 'dist/cjs', format: 'cjs', extension: '.cjs', declarations: false })
];
