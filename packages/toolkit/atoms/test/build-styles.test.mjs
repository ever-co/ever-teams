// The kit stylesheet's scoping (scripts/build-styles.mjs): node --test test/ (from packages/toolkit/atoms).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { buildStyles, scopeSelector, scopeStylesheet, KIT_ROOT } from '../scripts/build-styles.mjs';

const require = createRequire(import.meta.url);
const postcss = require('postcss');

test('a utility applies only inside the kit root', () => {
	assert.equal(scopeSelector('.flex'), `${KIT_ROOT} .flex`);
	assert.equal(scopeSelector('.hover\\:bg-primary:hover'), `${KIT_ROOT} .hover\\:bg-primary:hover`);
	assert.equal(scopeSelector(':where(.dark, .dark *) .text-white'), `${KIT_ROOT} :where(.dark, .dark *) .text-white`);
});

test('the document root becomes the kit root', () => {
	assert.equal(scopeSelector(':root'), KIT_ROOT);
	assert.equal(scopeSelector(':host'), KIT_ROOT);
	assert.equal(scopeSelector('html'), KIT_ROOT);
});

test('a selector already written for the kit root is kept', () => {
	assert.equal(scopeSelector(`.dark ${KIT_ROOT}`), `.dark ${KIT_ROOT}`);
});

test('layers are flattened, keyframes and registered properties are kept as they are', () => {
	const css =
		'@layer theme, utilities;@layer theme{:root,:host{--a:1}}@layer utilities{.p-4{padding:1rem}}@keyframes spin{to{transform:rotate(1turn)}}@property --tw-x{syntax:"*";inherits:false}';
	const out = scopeStylesheet(postcss.parse(css)).toString();

	assert.doesNotMatch(out, /@layer/);
	assert.match(out, /\[data-ever-teams-kit\]\{--a:1\}/);
	assert.match(out, /\[data-ever-teams-kit\] \.p-4\{padding:1rem\}/);
	assert.match(out, /@keyframes spin\{to\{transform:rotate\(1turn\)\}\}/);
	assert.match(out, /@property --tw-x/);
});

test('every rule of the built stylesheet applies only inside a kit root, and none to html, body or bare elements', async () => {
	const output = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'kit-styles-')), 'styles.css');
	await buildStyles({ output });
	const root = postcss.parse(fs.readFileSync(output, 'utf8'));
	const unscoped = [];
	root.walkRules((rule) => {
		const inKeyframes = rule.parent?.type === 'atrule' && /keyframes$/.test(rule.parent.name);
		if (inKeyframes) return;
		for (const selector of rule.selectors) {
			if (!selector.includes(KIT_ROOT)) unscoped.push(selector);
		}
	});
	let layers = 0;
	root.walkAtRules('layer', () => {
		layers++;
	});

	assert.deepEqual(unscoped, []);
	assert.equal(layers, 0);
	assert.match(fs.readFileSync(output, 'utf8'), /\[data-ever-teams-kit\] \.outline-hidden/);
});
