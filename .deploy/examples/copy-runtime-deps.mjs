#!/usr/bin/env node
/**
 * Copies the packages a server bundle needs at runtime, and everything they depend on, out of the
 * monorepo's installed node_modules: a production install pruned to one app, built from the install the
 * image already did (same yarn.lock versions, no second resolution, no network).
 *
 * Used by the Remix demo image (packages/toolkit/examples/remix/Dockerfile). The Next.js demos do not
 * need it: their `output: 'standalone'` build traces its own files.
 *
 * Usage:
 *   node copy-runtime-deps.mjs --root <repo root> --app <app dir> --out <dir> \
 *     [--scan <dir of built server files>]... [<package name>]...
 *
 * - --scan: every package imported by a top-level import declaration of the .js/.mjs/.cjs files under
 *   that directory is an entry (what the bundler left external), so a dependency the app forgot to
 *   declare is still found. `import('pkg')` with a literal adds an optional entry.
 * - <package name>: extra entry packages (e.g. the server CLI the image runs).
 * Packages are looked up from --app upwards, as Node resolves them, and copied to --out at the same
 * path relative to --root, so the copied tree resolves the same way. `dependencies` must resolve;
 * `optionalDependencies` and non-optional `peerDependencies` are copied when installed.
 */
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, symlinkSync } from 'node:fs';
import { isBuiltin } from 'node:module';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { parseArgs } from 'node:util';

const { values, positionals } = parseArgs({
	allowPositionals: true,
	options: {
		root: { type: 'string' },
		app: { type: 'string' },
		out: { type: 'string' },
		scan: { type: 'string', multiple: true, default: [] }
	}
});

if (!values.root || !values.app || !values.out) {
	console.error('usage: copy-runtime-deps.mjs --root <dir> --app <dir> --out <dir> [--scan <dir>]... [<package>]...');
	process.exit(2);
}

const root = resolve(values.root);
const app = resolve(values.app);
const out = resolve(values.out);

/** `@scope/name/sub/path` -> `@scope/name`, `name/sub` -> `name`; null for relative, absolute or built-in. */
function packageName(specifier) {
	if (/^[./]/.test(specifier) || specifier.includes(':') || isBuiltin(specifier)) return null;
	const parts = specifier.split('/');
	return specifier.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
}

function* filesUnder(dir) {
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const full = join(dir, entry.name);
		if (entry.isDirectory()) yield* filesUnder(full);
		else if (/\.(c|m)?js$/.test(entry.name)) yield full;
	}
}

// Rollup (Vite) writes each static import or re-export of a chunk as one top-level declaration on its own,
// unindented line: `import { x } from "pkg";`, `import * as x from "pkg";`, `import "pkg";`,
// `export { x } from "pkg";`. Matching only such whole lines, rather than any `from "..."` in the file,
// keeps strings and template literals inside the bundled code from being taken for imports.
const STATIC_IMPORT = /^import\s*(?:[^'"`;]*?\sfrom\s*)?["']([^"'`]+)["'];?[ \t]*$/gm;
const REEXPORT = /^export\s*(?:\*|\{[^}]*\})(?:\s*as\s+[\w$]+)?\s*from\s*["']([^"'`]+)["'];?[ \t]*$/gm;
// `import("pkg")` with a literal: loaded lazily, so copied when installed but not required.
const DYNAMIC_IMPORT = /\bimport\(\s*["']([^"'`\s]+)["']\s*\)/g;
const PACKAGE_NAME = /^(?:@[a-z0-9][\w.-]*\/)?[a-z0-9][\w.-]*$/i;

const entries = new Set(positionals);
const lazyEntries = new Set();

function addEntry(set, specifier) {
	const name = packageName(specifier);
	if (name && PACKAGE_NAME.test(name)) set.add(name);
}

for (const dir of values.scan) {
	for (const file of filesUnder(resolve(dir))) {
		const code = readFileSync(file, 'utf8');
		for (const [, specifier] of code.matchAll(STATIC_IMPORT)) addEntry(entries, specifier);
		for (const [, specifier] of code.matchAll(REEXPORT)) addEntry(entries, specifier);
		for (const [, specifier] of code.matchAll(DYNAMIC_IMPORT)) addEntry(lazyEntries, specifier);
	}
}
for (const name of entries) lazyEntries.delete(name);

/** Node's lookup: <from>/node_modules/<name>, then each parent directory's, up to the filesystem root. */
function findPackage(name, from) {
	for (let dir = from; ; dir = dirname(dir)) {
		const candidate = join(dir, 'node_modules', name);
		if (existsSync(join(candidate, 'package.json'))) return candidate;
		if (dirname(dir) === dir) return null;
	}
}

const copied = new Map(); // package dir (as installed) -> name
const queue = [];
const missing = [];

function visit(name, from, required, requiredBy) {
	const dir = findPackage(name, from);
	if (!dir) {
		if (required) missing.push(`${name} (required by ${requiredBy})`);
		return;
	}
	if (copied.has(dir)) return;
	copied.set(dir, name);
	queue.push(dir);
}

for (const name of entries) visit(name, app, true, 'the app');
for (const name of lazyEntries) visit(name, app, false, 'the app');

while (queue.length > 0) {
	const dir = queue.shift();
	const manifest = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
	// A workspace package is a symlink: its own dependencies resolve from where it really lives.
	const from = realpathSync(dir);
	for (const name of Object.keys(manifest.dependencies ?? {})) visit(name, from, true, manifest.name);
	for (const name of Object.keys(manifest.optionalDependencies ?? {})) visit(name, from, false, manifest.name);
	// Optional peers (e.g. `typescript` for @remix-run/*) are only for tooling: a runtime need shows up
	// as an import of the app or a dependency of some package.
	for (const name of Object.keys(manifest.peerDependencies ?? {})) {
		if (!manifest.peerDependenciesMeta?.[name]?.optional) visit(name, from, false, manifest.name);
	}
}

if (missing.length > 0) {
	console.error(`copy-runtime-deps: cannot find ${missing.length} required package(s):\n  ${missing.join('\n  ')}`);
	process.exit(1);
}

/** `path` relative to --root; refuses anything outside it. */
function insideRoot(path) {
	const relativePath = relative(root, path);
	if (relativePath.startsWith('..') || isAbsolute(relativePath)) {
		throw new Error(`copy-runtime-deps: ${path} is outside --root ${root}`);
	}
	return relativePath;
}

for (const dir of copied.keys()) {
	const target = join(out, insideRoot(dir));
	const source = realpathSync(dir);
	const copyTo = join(out, insideRoot(source));
	cpSync(source, copyTo, {
		recursive: true,
		dereference: true,
		// Nested node_modules hold packages of their own: copied only if something needs them.
		filter: (path) => !relative(source, path).split(sep).includes('node_modules')
	});
	// A workspace package keeps its symlink, so it resolves its dependencies from the same place as before.
	if (copyTo !== target) {
		mkdirSync(dirname(target), { recursive: true });
		symlinkSync(relative(dirname(target), copyTo), target, 'dir');
		console.log(`  workspace package ${copied.get(dir)}: ${insideRoot(dir)} -> ${insideRoot(source)}`);
	}
}

console.log(
	`copy-runtime-deps: ${copied.size} package(s) copied to ${out}\n` +
		`  entries: ${[...entries].sort().join(' ')}\n` +
		`  lazy (copied when installed): ${[...lazyEntries].sort().join(' ') || '-'}`
);
