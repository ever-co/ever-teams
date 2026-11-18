// The per-module build keeps "use client" and publishes no node_modules folder: node --test test/*.test.mjs
// (from packages/toolkit-ui). A real Rollup build of three small modules, with terser before the plugin as in the
// package's config.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { useClientDirective } from '../scripts/use-client-directive.mjs';
import { outputFileName, isKitPackage } from '../scripts/module-output.mjs';

const require = createRequire(import.meta.url);
const { rollup } = require('rollup');
const terser = require('@rollup/plugin-terser');

async function build(files, format) {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-modules-'));
	try {
		for (const [name, code] of Object.entries(files)) {
			fs.writeFileSync(path.join(dir, name), code);
		}
		const warnings = [];
		const bundle = await rollup({
			input: path.join(dir, 'index.js'),
			plugins: [terser(), useClientDirective()],
			onwarn: (warning) => warnings.push(warning.code)
		});
		const { output } = await bundle.generate({ format, preserveModules: true, preserveModulesRoot: dir });
		const byName = Object.fromEntries(output.map((chunk) => [chunk.fileName, chunk.code]));
		return { byName, warnings };
	} finally {
		fs.rmSync(dir, { recursive: true, force: true });
	}
}

const sources = {
	'index.js': "export { Dialog } from './dialog.js';\nexport { cn } from './utils.js';\n",
	'dialog.js': "/** @jsxImportSource theme-ui */\n'use client';\n\nexport const Dialog = () => 'dialog';\n",
	'utils.js': "export const cn = (...names) => names.join(' ');\n"
};

test('a client module keeps "use client" at the top of its own file, in ESM and in CommonJS', async () => {
	for (const format of ['es', 'cjs']) {
		const { byName, warnings } = await build(sources, format);

		assert.match(byName['dialog.js'], /^'use client';\n/, format);
		assert.doesNotMatch(byName['utils.js'], /use client/, format);
		assert.doesNotMatch(byName['index.js'], /use client/, format);
		assert.equal(warnings.includes('MODULE_LEVEL_DIRECTIVE'), false, format);
	}
});

test('a bundled third-party module is published under vendor/, never under node_modules/', () => {
	const chunk = (facadeModuleId, name) => ({ facadeModuleId, name });

	assert.equal(
		outputFileName(chunk('C:\\repo\\node_modules\\@radix-ui\\react-dialog\\dist\\index.mjs', 'x'), '.es.js'),
		'vendor/@radix-ui/react-dialog/dist/index.es.js'
	);
	assert.equal(
		outputFileName(chunk('/repo/node_modules/a/node_modules/b/index.js?commonjs-es-import', 'x'), '.cjs'),
		'vendor/b/index.commonjs-es-import.cjs'
	);
	assert.equal(
		outputFileName(chunk('/repo/packages/toolkit-ui/src/lib/button.tsx', 'lib/button'), '.es.js'),
		'lib/button.es.js'
	);
});

test('the kit packages are external, other packages are not', () => {
	assert.equal(isKitPackage('@ever-teams/api'), true);
	assert.equal(isKitPackage('@ever-teams/toolkit-types/lib/x'), true);
	assert.equal(isKitPackage('@radix-ui/react-dialog'), false);
});
