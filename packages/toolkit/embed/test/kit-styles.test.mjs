// The kit's stylesheet split between the element's shadow root and the page: node --test test/*.test.mjs (from
// packages/toolkit/embed, after the atoms build). esbuild compiles the module; jsdom stands in for the page.
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const esbuild = require('esbuild');
const { JSDOM } = require('jsdom');

const kitStylesheet = path.join(here, '..', '..', 'atoms', 'dist', 'styles.css');
let styles;

before(async () => {
	const outfile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'kit-styles-')), 'kit-styles.mjs');
	await esbuild.build({
		entryPoints: [path.join(here, '..', 'src', 'kit-styles.ts')],
		bundle: true,
		format: 'esm',
		platform: 'neutral',
		outfile,
		logLevel: 'error'
	});
	styles = await import(pathToFileURL(outfile).href);
});

test('the shadow root gets the stylesheet without @property, the page gets only the kit prefixed registrations', () => {
	const { shadow, page } = styles.splitKitStyles(fs.readFileSync(kitStylesheet, 'utf8'));
	const registrations = page.match(/@property\s+([^\s{]+)/g) ?? [];

	assert.doesNotMatch(shadow, /@property/);
	assert.match(shadow, /\[data-ever-teams-kit\]/);
	assert.ok(registrations.length > 0);
	for (const registration of registrations) {
		assert.match(registration, /@property\s+--ever-teams-tw-/);
	}
	assert.doesNotMatch(page, /[}]\s*[^@\s][^{]*\{/, 'nothing but @property rules');
});

test('the registrations go into the page once, however many elements', () => {
	const { document } = new JSDOM('<!doctype html><html><head></head><body></body></html>').window;
	const page = '@property --ever-teams-tw-shadow{syntax:"*";inherits:false;initial-value:0 0 #0000}';

	styles.registerKitProperties(document, page);
	styles.registerKitProperties(document, page);

	const added = document.head.querySelectorAll('style[data-ever-teams-properties]');
	assert.equal(added.length, 1);
	assert.equal(added[0].textContent, page);
});
