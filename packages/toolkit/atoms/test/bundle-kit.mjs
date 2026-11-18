// Bundles kit modules for a test: esbuild compiles an entry that re-exports modules of src/lib, with the aliases the
// kit's build uses, and every import the test names is answered by a stand-in. The bundle is written next to the tests,
// so the React it imports is the one the test renders with. Not a test itself: node --test runs *.test.mjs only.
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const esbuild = require('esbuild');

// The kit's sources, with forward slashes so that an entry can name them in an import.
export const kitSources = path.join(here, '..', 'src', 'lib').replaceAll('\\', '/');

const kitAliases = {
	'@components': `${kitSources}/components`,
	'@hooks': `${kitSources}/hooks`,
	'@lib': kitSources
};

// Answers each import that `standInOf` names with that stand-in's source.
function standInPlugin(standIns, standInOf) {
	return {
		name: 'stand-ins',
		setup(build) {
			build.onResolve({ filter: /.*/ }, ({ path: requested }) => {
				const name = standInOf(requested.replaceAll('\\', '/'));
				if (name === undefined) {
					return undefined;
				}
				return { path: name, namespace: 'stand-in' };
			});
			build.onLoad({ filter: /.*/, namespace: 'stand-in' }, ({ path: name }) => ({
				contents: standIns[name],
				loader: 'js',
				resolveDir: here
			}));
		}
	};
}

/**
 * The bundled module, and `remove()` to delete its folder once the tests are done.
 * - `name`: the start of the temporary folder's name
 * - `entry`: the entry's source, `export { ... } from '${kitSources}/...'` lines
 * - `standIns`: each stand-in's source, by name
 * - `standInOf(importPath)`: the stand-in an import is answered with, or undefined; the aliases have already turned
 *   an `@lib/...` import into a path, and backslashes into slashes
 */
export async function bundleKit({ name, entry, standIns, standInOf }) {
	const folder = fs.mkdtempSync(path.join(here, `.${name}-`));
	const remove = () => fs.rmSync(folder, { recursive: true, force: true });
	try {
		const entryFile = path.join(folder, 'entry.mjs');
		fs.writeFileSync(entryFile, entry);
		const outfile = path.join(folder, 'bundle.mjs');
		await esbuild.build({
			entryPoints: [entryFile],
			outfile,
			bundle: true,
			format: 'esm',
			platform: 'neutral',
			mainFields: ['module', 'main'],
			jsx: 'automatic',
			logLevel: 'error',
			external: ['react', 'react/jsx-runtime', 'react-dom'],
			alias: kitAliases,
			plugins: [standInPlugin(standIns, standInOf)]
		});
		const bundled = await import(pathToFileURL(outfile).href);
		return { bundled, remove };
	} catch (error) {
		remove();
		throw error;
	}
}
