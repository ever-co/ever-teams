// The built package imports only what it declares: node --test test/*.test.mjs (from packages/api, after `rollup -c`).
// A host installs the dependencies of package.json and nothing else: an import of another package (tslib in 0.2.1,
// react-day-picker in the declarations) fails at load, or in the host's type check.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { builtinModules } from 'node:module';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const packageDir = path.join(here, '..');
const dist = path.join(packageDir, 'dist');
const manifest = JSON.parse(fs.readFileSync(path.join(packageDir, 'package.json'), 'utf8'));

const declared = new Set([
	...Object.keys(manifest.dependencies ?? {}),
	...Object.keys(manifest.peerDependencies ?? {})
]);

// `from 'x'`, `import 'x'`, `import('x')` and `require('x')`, with the specifiers that name a package (a package name
// holds no space, which keeps out the quoted words of a comment).
const SPECIFIER = /(?:\bfrom\s*|\bimport\s*\(?\s*|\brequire\s*\(\s*)["']([^"'.\/\s][^"'\s]*)["']/g;

const packageOf = (specifier) => {
	const parts = specifier.split('/');
	if (specifier.startsWith('@')) {
		return `${parts[0]}/${parts[1]}`;
	}
	return parts[0];
};

const isBuiltin = (name) => name.startsWith('node:') || builtinModules.includes(name);

const filesUnder = (dir, suffix) =>
	fs
		.readdirSync(dir, { recursive: true })
		.filter((file) => file.endsWith(suffix))
		.map((file) => path.join(dir, file));

const packagesImportedBy = (file) => {
	const source = fs.readFileSync(file, 'utf8');
	return [...source.matchAll(SPECIFIER)].map((match) => packageOf(match[1]));
};

const undeclaredImportsOf = (file) =>
	packagesImportedBy(file).filter((name) => !isBuiltin(name) && !declared.has(name));

test('the ESM and CommonJS builds import only declared packages', () => {
	for (const file of [path.join(dist, 'index.es.js'), path.join(dist, 'index.cjs')]) {
		assert.deepEqual(undeclaredImportsOf(file), [], path.relative(packageDir, file));
	}
});

// The server entry (@ever-teams/api/server) imports the main entry by the package's own name, for its error classes.
test('the server builds import only declared packages and the main entry', () => {
	for (const file of [path.join(dist, 'server.es.js'), path.join(dist, 'server.cjs')]) {
		const undeclared = undeclaredImportsOf(file).filter((name) => name !== manifest.name);

		assert.deepEqual(undeclared, [], path.relative(packageDir, file));
		assert.ok(packagesImportedBy(file).includes(manifest.name), path.relative(packageDir, file));
	}
});

test('the declarations import only declared packages', () => {
	const declarations = filesUnder(dist, '.d.ts');

	assert.ok(declarations.length > 0, 'build the package first: rollup -c');
	for (const file of declarations) {
		assert.deepEqual(undeclaredImportsOf(file), [], path.relative(packageDir, file));
	}
});
