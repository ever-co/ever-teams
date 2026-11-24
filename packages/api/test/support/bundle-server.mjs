// Bundles one server helper of src/lib/server with esbuild, with the error classes it throws, for its tests: the
// tests then run against the source, with no build of the package. Not a test itself: node --test runs *.test.mjs.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const esbuild = require('esbuild');

/**
 * The bundled module of `src/lib/server/<name>.ts`, with the error classes, and `remove()` to delete its folder once
 * the tests are done.
 */
export async function bundleServerHelper(name) {
	const bundleDir = fs.mkdtempSync(path.join(os.tmpdir(), `server-${name}-`));
	const remove = () => fs.rmSync(bundleDir, { recursive: true, force: true });
	try {
		const outfile = path.join(bundleDir, `${name}.mjs`);
		await esbuild.build({
			stdin: {
				contents: `export * from './lib/server/${name}'; export * from './lib/client/errors';`,
				resolveDir: path.join(here, '..', '..', 'src'),
				loader: 'ts'
			},
			bundle: true,
			format: 'esm',
			platform: 'node',
			outfile,
			logLevel: 'error'
		});
		const server = await import(pathToFileURL(outfile).href);
		return { server, remove };
	} catch (error) {
		remove();
		throw error;
	}
}
