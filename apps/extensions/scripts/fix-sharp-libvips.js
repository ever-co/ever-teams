#!/usr/bin/env node
/**
 * Make every prebuilt `@img/sharp-<platform>` binary able to find its matching
 * `@img/sharp-libvips-<platform>` shared library.
 *
 * WHY
 * ---
 * This monorepo carries two sharp versions: the workspace root depends on `sharp@^0.34.5`
 * (apps/web, apps/server-web) while `plasmo` (apps/extensions) pins `sharp@0.33.5`.
 * yarn 1 hoists ONE `@img/sharp-libvips-<platform>` version to the root `node_modules/@img`
 * and nests the other one, so the nested `@img/sharp-linux-x64` that plasmo's sharp loads can
 * no longer resolve `libvips-cpp.so.*` through the RPATH baked into the binary:
 *
 *   $ORIGIN/../../sharp-libvips-<platform>/lib                    (sibling of the binary package)
 *   $ORIGIN/../../node_modules/@img/sharp-libvips-<platform>/lib  (nested under the @img dir)
 *
 * On CI this surfaced as (Extensions Build Dev/Prod, step "Build and zip extension artifact"):
 *
 *   Error: Could not load the "sharp" module using the linux-x64 runtime
 *   ERR_DLOPEN_FAILED: libvips-cpp.so.42: cannot open shared object file: No such file or directory
 *
 * WHAT
 * ----
 * For each `@img/sharp-<platform>` package found under node_modules, if the sibling
 * `@img/sharp-libvips-<platform>` is missing or is a different version, link a matching-version
 * copy (already installed somewhere else in the tree by yarn) into the first free RPATH slot.
 *
 *   - idempotent: a no-op when the layout is already correct
 *   - never touches yarn.lock or package.json
 *   - only creates symlinks (junctions on Windows); nothing is removed or overwritten
 *   - Windows packages (`@img/sharp-win32-*`) bundle libvips inside and are skipped
 *
 * USAGE
 * -----
 *   node apps/extensions/scripts/fix-sharp-libvips.js            # repo root derived from this file
 *   node apps/extensions/scripts/fix-sharp-libvips.js <rootDir>  # explicit root (tests)
 *
 * Exit code is 0 unless a binary package has NO matching libvips anywhere in the tree (then 1),
 * because in that case `sharp` cannot load and the caller should fail loudly.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const repoRoot = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve(__dirname, '..', '..', '..');

const searchRoots = [
	path.join(repoRoot, 'node_modules'),
	path.join(repoRoot, 'apps', 'extensions', 'node_modules')
].filter((p) => isDir(p));

const LIBVIPS_PREFIX = 'sharp-libvips-';
const BINARY_PREFIX = 'sharp-';
const SKIP_BINARIES = new Set(['sharp-wasm32']);

function isDir(p) {
	try {
		return fs.statSync(p).isDirectory();
	} catch {
		return false;
	}
}

function readJson(p) {
	try {
		return JSON.parse(fs.readFileSync(p, 'utf8'));
	} catch {
		return null;
	}
}

function safeReaddir(p) {
	try {
		return fs.readdirSync(p, { withFileTypes: true });
	} catch {
		return [];
	}
}

/**
 * Walk the package tree the way Node resolution sees it: node_modules -> package -> node_modules
 * -> ... Only package roots are visited (not every file), so this is cheap even on a huge tree.
 * Symlinked packages (yarn workspaces) are followed once via a realpath visited-set.
 */
function walkPackageTree(nmDir, onImgDir, visited) {
	let real;
	try {
		real = fs.realpathSync(nmDir);
	} catch {
		return;
	}
	if (visited.has(real)) return;
	visited.add(real);

	for (const entry of safeReaddir(nmDir)) {
		if (entry.name.startsWith('.')) continue;
		const entryPath = path.join(nmDir, entry.name);
		if (!isDir(entryPath)) continue;

		if (entry.name.startsWith('@')) {
			if (entry.name === '@img') onImgDir(entryPath);
			for (const scoped of safeReaddir(entryPath)) {
				const scopedPath = path.join(entryPath, scoped.name);
				if (!isDir(scopedPath)) continue;
				walkPackageTree(path.join(scopedPath, 'node_modules'), onImgDir, visited);
			}
		} else {
			walkPackageTree(path.join(entryPath, 'node_modules'), onImgDir, visited);
		}
	}
}

// Collect every libvips package and every prebuilt binary package in the tree.
const libvips = []; // { platform, version, dir }
const binaries = []; // { platform, wantVersion, imgDir, dir }
const visited = new Set();

for (const root of searchRoots) {
	walkPackageTree(
		root,
		(imgDir) => {
			for (const entry of safeReaddir(imgDir)) {
				const dir = path.join(imgDir, entry.name);
				if (!isDir(dir)) continue;
				const pkg = readJson(path.join(dir, 'package.json'));
				if (!pkg || !pkg.version) continue;

				if (entry.name.startsWith(LIBVIPS_PREFIX)) {
					libvips.push({ platform: entry.name.slice(LIBVIPS_PREFIX.length), version: pkg.version, dir });
				} else if (entry.name.startsWith(BINARY_PREFIX) && !SKIP_BINARIES.has(entry.name)) {
					const platform = entry.name.slice(BINARY_PREFIX.length);
					const wantVersion =
						pkg.optionalDependencies && pkg.optionalDependencies[`@img/${LIBVIPS_PREFIX}${platform}`];
					// win32-* (and anything else without a separate libvips package) bundles libvips inside.
					if (!wantVersion) continue;
					binaries.push({ platform, wantVersion, imgDir, dir });
				}
			}
		},
		visited
	);
}

function versionAt(dir) {
	const pkg = readJson(path.join(dir, 'package.json'));
	return pkg && pkg.version ? pkg.version : null;
}

function link(target, dest) {
	fs.mkdirSync(path.dirname(dest), { recursive: true });
	// 'junction' is honoured on Windows (no admin needed) and ignored elsewhere (plain dir symlink).
	fs.symlinkSync(target, dest, 'junction');
}

let linked = 0;
let ok = 0;
let missing = 0;

for (const bin of binaries) {
	const rel = (p) => path.relative(repoRoot, p) || '.';
	const sibling = path.join(bin.imgDir, `${LIBVIPS_PREFIX}${bin.platform}`);
	const nested = path.join(bin.imgDir, 'node_modules', '@img', `${LIBVIPS_PREFIX}${bin.platform}`);

	// Already reachable through one of the RPATH slots the binary was linked with?
	if (versionAt(sibling) === bin.wantVersion || versionAt(nested) === bin.wantVersion) {
		ok += 1;
		continue;
	}

	const candidate = libvips.find((l) => l.platform === bin.platform && l.version === bin.wantVersion);
	if (!candidate) {
		missing += 1;
		console.error(
			`[fix-sharp-libvips] ${rel(bin.dir)} needs @img/${LIBVIPS_PREFIX}${bin.platform}@${bin.wantVersion} ` +
				'but no copy of that version is installed anywhere under node_modules'
		);
		continue;
	}

	// First free RPATH slot: the sibling if nothing occupies it, otherwise the nested slot.
	const dest = isDir(sibling) ? nested : sibling;
	if (isDir(dest)) {
		// Occupied by a different version — nothing safe to do without deleting; report it.
		missing += 1;
		console.error(
			`[fix-sharp-libvips] ${rel(bin.dir)}: both RPATH slots are taken by other versions ` +
				`(${rel(sibling)}=${versionAt(sibling)}, ${rel(nested)}=${versionAt(nested)})`
		);
		continue;
	}

	link(fs.realpathSync(candidate.dir), dest);
	linked += 1;
	console.log(`[fix-sharp-libvips] ${rel(dest)} -> ${rel(candidate.dir)} (v${bin.wantVersion}) for ${rel(bin.dir)}`);
}

console.log(
	`[fix-sharp-libvips] binaries=${binaries.length} already-ok=${ok} linked=${linked} unresolved=${missing} ` +
		`(searched: ${searchRoots.map((p) => path.relative(repoRoot, p)).join(', ') || 'nothing'})`
);

process.exit(missing > 0 ? 1 : 0);
