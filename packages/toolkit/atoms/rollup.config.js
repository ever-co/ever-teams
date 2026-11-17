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
import { buildStyles } from './scripts/build-styles.mjs';
import { resolveDeclarationPaths } from './scripts/resolve-declaration-paths.mjs';
import { useClientDirective } from '../../toolkit-ui/scripts/use-client-directive.mjs';
import { outputFileName, isKitPackage } from '../../toolkit-ui/scripts/module-output.mjs';
import { addDeclarationExtensions, copyCommonJsDeclarations } from '../../toolkit-ui/scripts/declarations.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Peers and Node built-ins: never bundled.
const PEERS_AND_BUILTINS = [
	'react',
	'react-dom',
	'theme-ui',
	'@emotion/react',
	'next-themes',
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
];

// One output file per source module, in ESM (dist) and CommonJS (dist/cjs): a host's bundler keeps only what it uses,
// and Next.js reads each "use client" module as a client component. The kit's own packages stay external, so a host
// has one copy of each (one apiConfigManager, one portal context).
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
		typescript(
			declarations
				? { tsconfig: './tsconfig.json' }
				: { tsconfig: './tsconfig.json', declaration: false, declarationMap: false, outDir: dir }
		),
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
				// Warnings and errors stay: the kit warns once about behaviors it keeps for compatibility.
				drop_console: ['log', 'info', 'debug'],
				drop_debugger: true
			},
			mangle: true
		}),
		// After terser, which drops directives it does not know.
		useClientDirective(),
		// dist/styles.css: the components' classes, compiled and scoped under the kit root (scripts/build-styles.mjs)
		{
			name: 'kit-styles',
			// kit.css is read by buildStyles, outside the module graph: watch it so that `rollup -c --watch` rebuilds it.
			buildStart() {
				this.addWatchFile(path.join(__dirname, 'src', 'styles', 'kit.css'));
			},
			async writeBundle() {
				if (!declarations) {
					return;
				}
				await buildStyles();
				// The declarations keep the source's path aliases (@components/...): a host's TypeScript cannot follow them.
				resolveDeclarationPaths(path.join(__dirname, 'dist'));
				// Then: extensions for ES callers on node16/nodenext, and a copy for CommonJS callers (dist/cjs).
				addDeclarationExtensions(path.join(__dirname, 'dist'), path.join(__dirname, 'dist', 'cjs'));
				copyCommonJsDeclarations(path.join(__dirname, 'dist'), path.join(__dirname, 'dist', 'cjs'));
			}
		}
	],
	watch: {
		include: 'src/**',
		exclude: 'node_modules/**'
	},
	external: (id) => isKitPackage(id) || PEERS_AND_BUILTINS.some((name) => id === name || id.startsWith(`${name}/`)),
	onwarn(warning, warn) {
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
	createConfig({ dir: 'dist', format: 'es', extension: '.es.js', declarations: true }),
	createConfig({ dir: 'dist/cjs', format: 'cjs', extension: '.cjs', declarations: false })
];
