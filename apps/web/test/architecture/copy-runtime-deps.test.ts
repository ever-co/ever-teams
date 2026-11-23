/**
 * `.deploy/examples/copy-runtime-deps.mts` decides which packages the Remix demo image can load: it
 * copies the server bundle's external imports and their dependency closure out of the monorepo install
 * into the runtime stage. A package it misses only shows up as a crash of the published image, so these
 * fixtures pin what it must find, what it must leave out, and that the copied tree loads on its own.
 */
import { spawnSync } from 'node:child_process';
import {
	existsSync,
	lstatSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	symlinkSync,
	writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

const SCRIPT = resolve(__dirname, '../../../../.deploy/examples/copy-runtime-deps.mts');

let workspace: string;

beforeEach(() => {
	workspace = mkdtempSync(join(tmpdir(), 'copy-runtime-deps-'));
});

afterEach(() => {
	rmSync(workspace, { recursive: true, force: true });
});

function write(path: string, content: string): void {
	mkdirSync(dirname(path), { recursive: true });
	writeFileSync(path, content);
}

/** A CommonJS package at `dir`; `exportsCode` is the body of its index.js. */
function writePackage(dir: string, manifest: Record<string, unknown>, exportsCode = 'module.exports = {};'): void {
	write(join(dir, 'package.json'), JSON.stringify({ main: 'index.js', ...manifest }));
	write(join(dir, 'index.js'), exportsCode);
}

/** A directory link, as yarn links a workspace package (a junction on Windows, which needs no privilege). */
function linkDirectory(target: string, path: string): void {
	mkdirSync(dirname(path), { recursive: true });
	symlinkSync(target, path, process.platform === 'win32' ? 'junction' : 'dir');
}

/** As the Remix Dockerfile runs it. */
function run(root: string, app: string, out: string, extra: string[] = []) {
	return spawnSync(
		process.execPath,
		[
			'--experimental-vm-modules',
			'--disable-warning=ExperimentalWarning',
			SCRIPT,
			'--root',
			root,
			'--app',
			app,
			'--out',
			out,
			'--scan',
			join(app, 'build/server'),
			...extra
		],
		{ encoding: 'utf8' }
	);
}

describe('copy-runtime-deps', () => {
	it('copies the bundle’s external imports with their dependency closure, and the copy loads on its own', () => {
		const root = join(workspace, 'repo');
		const app = join(root, 'apps/app');
		const out = join(workspace, 'out');
		const modules = join(root, 'node_modules');

		// `a` needs b@2 (nested under it) while the app itself imports the hoisted b@1. `native` is in both
		// its dependencies and optionalDependencies, which makes it optional (as in yarn): not installed here.
		writePackage(
			join(modules, 'a'),
			{
				name: 'a',
				dependencies: { b: '^2.0.0', native: '*' },
				optionalDependencies: { native: '*', opt: '*' },
				peerDependencies: { p: '*', big: '*' },
				peerDependenciesMeta: { big: { optional: true } }
			},
			"module.exports = { b: require('b').version, p: require('p').p };"
		);
		writePackage(join(modules, 'opt'), { name: 'opt' });
		writePackage(
			join(modules, 'a/node_modules/b'),
			{ name: 'b', version: '2.0.0' },
			"module.exports = { version: '2' };"
		);
		writePackage(join(modules, 'b'), { name: 'b', version: '1.0.0' }, "module.exports = { version: '1' };");
		writePackage(join(modules, 'p'), { name: 'p' }, "module.exports = { p: 'peer' };");
		writePackage(join(modules, 'big'), { name: 'big' }); // optional peer: tooling only
		writePackage(join(modules, 'noise'), { name: 'noise' }); // named only inside bundled code
		writePackage(join(modules, 'side'), { name: 'side' });
		writePackage(join(modules, 'reexp'), { name: 'reexp' });
		writePackage(join(modules, 'lazy'), { name: 'lazy' });
		writePackage(join(modules, 'cli'), { name: 'cli' });
		// A workspace package: linked into node_modules, its own dependency installed beside it.
		writePackage(
			join(root, 'packages/lib'),
			{ name: '@ws/lib', dependencies: { c: '*' } },
			"module.exports = { c: require('c').c };"
		);
		writePackage(join(root, 'packages/lib/node_modules/c'), { name: 'c' }, "module.exports = { c: 'c' };");
		linkDirectory(join(root, 'packages/lib'), join(modules, '@ws/lib'));

		write(
			join(app, 'build/server/index.js'),
			[
				'var _a;',
				'import { a } from "a";',
				'import b from "b";',
				'import "side";',
				'export { x } from "reexp";',
				'import * as lib from "@ws/lib/sub/path";',
				'import fs from "node:fs";',
				'import chunk from "./chunk.js";',
				// Import-shaped text that is not an import: none of it may become an entry (`ghost` is
				// not installed, so taking it for one would fail the copy).
				'const inString = \'import z from "noise"\';',
				'const inTemplate = `${_a} from "noise"`;',
				'const example = `',
				'import "ghost";',
				'export { y } from "noise";',
				'`;',
				'// import "ghost";',
				'/*',
				'import "noise";',
				'*/',
				'const later = () => import("lazy");',
				'const notInstalled = () => import("lazy-missing");'
			].join('\n')
		);
		// --root and --app reached through a link to the repository: package realpaths must still be
		// recognised as inside --root.
		const rootLink = join(workspace, 'repo-link');
		linkDirectory(root, rootLink);

		const result = run(rootLink, join(rootLink, 'apps/app'), out, ['cli']);
		expect(result.stderr).toBe('');
		expect(result.status).toBe(0);

		for (const name of ['a', 'b', 'p', 'opt', 'side', 'reexp', 'lazy', 'cli']) {
			expect(existsSync(join(out, 'node_modules', name, 'package.json'))).toBe(true);
		}
		expect(JSON.parse(readFileSync(join(out, 'node_modules/a/node_modules/b/package.json'), 'utf8')).version).toBe(
			'2.0.0'
		);
		for (const name of ['noise', 'ghost', 'big', 'native']) {
			expect(existsSync(join(out, 'node_modules', name))).toBe(false);
		}
		expect(lstatSync(join(out, 'node_modules/@ws/lib')).isSymbolicLink()).toBe(true);
		expect(existsSync(join(out, 'packages/lib/node_modules/c/package.json'))).toBe(true);

		// The copied tree resolves exactly as the install did, with nothing from the original repo.
		write(
			join(out, 'apps/app/check.cjs'),
			"console.log(JSON.stringify({ a: require('a'), b: require('b').version, lib: require('@ws/lib') }));"
		);
		const check = spawnSync(process.execPath, [join(out, 'apps/app/check.cjs')], { encoding: 'utf8' });
		expect(check.stderr).toBe('');
		expect(JSON.parse(check.stdout)).toEqual({ a: { b: '2', p: 'peer' }, b: '1', lib: { c: 'c' } });
	});

	it('fails, naming each one, when a required package is not installed', () => {
		const root = join(workspace, 'repo');
		const app = join(root, 'apps/app');
		writePackage(join(root, 'node_modules/a'), { name: 'a', dependencies: { gone: '*' } });
		write(join(app, 'build/server/index.js'), ['import "a";', 'import "ghost";'].join('\n'));

		const result = run(root, app, join(workspace, 'out'));

		expect(result.status).toBe(1);
		expect(result.stderr).toContain('ghost (required by the app)');
		expect(result.stderr).toContain('gone (required by a)');
	});
});
