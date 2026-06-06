import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import postcss from 'rollup-plugin-postcss';
import peerDepsExternal from 'rollup-plugin-peer-deps-external';
import terser from '@rollup/plugin-terser';
import json from '@rollup/plugin-json';
import alias from '@rollup/plugin-alias';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const createConfig = (input, outputDir, entryFileNames = '[name].es.js', preserveModules = false) => ({
	input,
	output: [
		{
			dir: outputDir,
			format: 'es',
			sourcemap: false,
			entryFileNames,
			...(preserveModules ? { preserveModules: true, preserveModulesRoot: 'src' } : {})
		}
	],
	plugins: [
		peerDepsExternal(),
		json(),
		alias({
			entries: [
				{ find: /^@components\/(.*)$/, replacement: path.resolve(__dirname, 'src/lib/components/$1') },
				{ find: /^@hooks\/(.*)$/, replacement: path.resolve(__dirname, 'src/lib/hooks/$1') },
				{ find: /^@libs\/(.*)$/, replacement: path.resolve(__dirname, 'src/lib/libs/$1') },
				{ find: /^@lib\/(.*)$/, replacement: path.resolve(__dirname, 'src/lib/$1') },
				{ find: /^@utils\/(.*)$/, replacement: path.resolve(__dirname, 'src/lib/utils/$1') }
			]
		}),
		resolve({
			extensions: ['.js', '.ts', '.jsx', '.tsx'],
			preferBuiltins: false, // Changed from true to false to avoid Node.js modules
			browser: true, // Prioritize browser versions of packages
			// Explicitly map Node.js modules to browser alternatives or false
			alias: {
				util: 'util/',
				querystring: 'querystring-es3',
				stream: 'stream-browserify',
				buffer: 'buffer',
				process: 'process/browser'
			}
		}),
		commonjs(),
		typescript({ tsconfig: './tsconfig.json' }),
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
				drop_console: true,
				drop_debugger: true
			},
			mangle: true
		})
	],
	watch: {
		include: 'src/**',
		exclude: 'node_modules/**'
	},
	external: [
		'react',
		'react-dom',
		'theme-ui',
		// Add Node.js modules as external to prevent bundling
		'util',
		'querystring',
		'stream',
		'buffer',
		'process',
		'path',
		'crypto',
		'fs',
		'net',
		'tls'
	],
	onwarn(warning, warn) {
		if (warning.code === 'MODULE_LEVEL_DIRECTIVE') {
			return;
		}
		if (
			warning.code === 'CIRCULAR_DEPENDENCY' &&
			(warning.message.includes('d3-interpolate') || warning.message.includes('recharts'))
		) {
			return;
		}
		warn(warning);
	}
});

export default [
	// Main index build (bundled)
	createConfig('src/index.ts', 'dist')
];
