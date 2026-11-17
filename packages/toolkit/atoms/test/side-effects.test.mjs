// The modules with a side effect stay listed in package.json "sideEffects": node --test test/*.test.mjs
// (from packages/toolkit/atoms). The i18n module initializes i18next and then only re-exports it: a bundler that
// believed it side-effect free would skip it, i18next would never be initialized, and every useTranslation would
// suspend for ever (a Next.js page with TeamsProvider never finished rendering).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { outputFileName } from '../../../toolkit-ui/scripts/module-output.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const manifest = JSON.parse(fs.readFileSync(path.join(here, '..', 'package.json'), 'utf8'));

// The source modules whose top-level code must run, by their name in the build.
const MODULES_WITH_SIDE_EFFECTS = ['lib/i18n/init'];

test('the i18n initialization is declared as a side effect in the ESM and CommonJS builds', () => {
	for (const name of MODULES_WITH_SIDE_EFFECTS) {
		const esm = `./dist/${outputFileName({ name }, '.es.js')}`;
		const cjs = `./dist/cjs/${outputFileName({ name }, '.cjs')}`;

		assert.ok(manifest.sideEffects.includes(esm), esm);
		assert.ok(manifest.sideEffects.includes(cjs), cjs);
	}
	assert.ok(manifest.sideEffects.includes('*.css'));
});

test('the i18n module still initializes i18next at load', () => {
	const source = fs.readFileSync(path.join(here, '..', 'src', 'lib', 'i18n', 'init.ts'), 'utf8');

	assert.match(source, /^i18n\.use\(initReactI18next\)\.init\(/m);
});
