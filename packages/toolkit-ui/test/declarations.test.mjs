// The published declarations work for ES and CommonJS callers on every module setting: node --test test/*.test.mjs
// (from packages/toolkit-ui). A small dist/ tree, rewritten and copied by scripts/declarations.mjs, then type-checked
// as a host on "module": "node16" would.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { addDeclarationExtensions, copyCommonJsDeclarations } from '../scripts/declarations.mjs';

const require = createRequire(import.meta.url);
const ts = require('typescript');

function write(root, files) {
	for (const [name, content] of Object.entries(files)) {
		const file = path.join(root, name);
		fs.mkdirSync(path.dirname(file), { recursive: true });
		fs.writeFileSync(file, content);
	}
}

const DIST = {
	'index.d.ts':
		"export * from './lib/button';\nexport * from './lib/forms';\nexport type { Color } from './lib/color.helper';\n",
	'lib/button.d.ts':
		"export declare const Button: (label: string) => string;\nexport type Store = import('./forms').Form;\n",
	'lib/forms/index.d.ts': 'export interface Form { name: string }\n',
	'lib/color.helper.d.ts': "export type Color = 'red' | 'blue';\n"
};

test('relative specifiers get the extension node16 and nodenext need', () => {
	const dist = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-dts-'));
	try {
		write(dist, DIST);

		assert.equal(addDeclarationExtensions(dist), 2);
		const index = fs.readFileSync(path.join(dist, 'index.d.ts'), 'utf8');
		assert.match(index, /from '\.\/lib\/button\.js'/);
		assert.match(index, /from '\.\/lib\/forms\/index\.js'/);
		assert.match(index, /from '\.\/lib\/color\.helper\.js'/);
		assert.match(
			fs.readFileSync(path.join(dist, 'lib', 'button.d.ts'), 'utf8'),
			/import\('\.\/forms\/index\.js'\)/
		);
		assert.equal(addDeclarationExtensions(dist), 0, 'a second run changes nothing');
	} finally {
		fs.rmSync(dist, { recursive: true, force: true });
	}
});

test('a host type-checks the package from an ES module and from a CommonJS module', () => {
	const host = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-host-'));
	try {
		const pkg = path.join(host, 'node_modules', 'kit');
		write(pkg, {
			'package.json': JSON.stringify({
				name: 'kit',
				type: 'module',
				exports: {
					'.': {
						import: { types: './dist/index.d.ts', default: './dist/index.es.js' },
						require: { types: './dist/cjs/index.d.ts', default: './dist/cjs/index.cjs' }
					}
				}
			}),
			...Object.fromEntries(Object.entries(DIST).map(([name, content]) => [`dist/${name}`, content]))
		});
		addDeclarationExtensions(path.join(pkg, 'dist'), path.join(pkg, 'dist', 'cjs'));
		assert.equal(copyCommonJsDeclarations(path.join(pkg, 'dist'), path.join(pkg, 'dist', 'cjs')), 4);
		write(host, {
			'esm.mts':
				"import { Button, type Form, type Color } from 'kit';\nexport const b: string = Button('x');\nexport type F = [Form, Color];\n",
			'cjs.cts':
				"import kit = require('kit');\nexport const b: string = kit.Button('x');\nexport type F = kit.Form;\n"
		});

		const program = ts.createProgram([path.join(host, 'esm.mts'), path.join(host, 'cjs.cts')], {
			module: ts.ModuleKind.Node16,
			moduleResolution: ts.ModuleResolutionKind.Node16,
			target: ts.ScriptTarget.ES2022,
			strict: true,
			noEmit: true,
			types: []
		});
		const errors = ts
			.getPreEmitDiagnostics(program)
			.map((d) => ts.flattenDiagnosticMessageText(d.messageText, ' '));

		assert.deepEqual(errors, []);
	} finally {
		fs.rmSync(host, { recursive: true, force: true });
	}
});
