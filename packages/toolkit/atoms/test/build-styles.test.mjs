// The kit stylesheet's scoping (scripts/build-styles.mjs): node --test test/*.test.mjs (from packages/toolkit/atoms).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { buildStyles, scopeSelector, scopeStylesheet, KIT_ROOT } from '../scripts/build-styles.mjs';

const require = createRequire(import.meta.url);
const postcss = require('postcss');

// Builds the stylesheet in a folder of its own and returns it, leaving nothing in the OS temp folder.
async function buildStylesheet() {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-styles-'));
	try {
		const output = path.join(dir, 'styles.css');
		await buildStyles({ output });
		return fs.readFileSync(output, 'utf8');
	} finally {
		fs.rmSync(dir, { recursive: true, force: true });
	}
}

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

test('layers are flattened; keyframes and registered properties get the kit names', () => {
	const css =
		'@layer theme, utilities;@layer theme{:root,:host{--a:1}}@layer utilities{.p-4{padding:1rem}}@keyframes spin{to{transform:rotate(1turn)}}@property --tw-x{syntax:"*";inherits:false}';
	const out = scopeStylesheet(postcss.parse(css)).toString();

	assert.doesNotMatch(out, /@layer/);
	assert.match(out, /\[data-ever-teams-kit\]\{--a:1\}/);
	assert.match(out, /\[data-ever-teams-kit\] \.p-4\{padding:1rem\}/);
	assert.match(out, /@keyframes ever-teams-kit-spin\{to\{transform:rotate\(1turn\)\}\}/);
	assert.match(out, /@property --ever-teams-tw-x/);
});

test('flattened layers keep their order: an earlier layer first, unlayered rules last', () => {
	const css =
		'@layer theme, base, utilities;@layer utilities{:where(.space-y-6>:not(:last-child)){margin-block-start:1.5rem}}.custom{color:red}@layer base{*{margin:0}}@layer theme{:root{--a:1}}';
	const out = scopeStylesheet(postcss.parse(css)).toString();
	const position = (text) => out.indexOf(text);

	assert.ok(position('--a:1') < position('{margin:0}'), out);
	assert.ok(position('{margin:0}') < position('margin-block-start'), out);
	assert.ok(position('margin-block-start') < position('color:red'), out);
});

test('a keyframes name is renamed where an animation or a custom property names it, and nowhere else', () => {
	const css =
		':root{--animate-spin:spin 1s linear infinite;--align:center}.animate-spin{animation:var(--animate-spin)}.animate-in{animation:enter .15s,spin 2s}.spinner{animation-name:spin}@keyframes spin{to{opacity:1}}@keyframes enter{from{opacity:0}}';
	const out = scopeStylesheet(postcss.parse(css)).toString();

	assert.match(out, /--animate-spin:ever-teams-kit-spin 1s linear infinite/);
	assert.match(out, /--align:center/);
	assert.match(out, /animation:var\(--animate-spin\)/);
	assert.match(out, /animation:ever-teams-kit-enter \.15s,ever-teams-kit-spin 2s/);
	assert.match(out, /animation-name:ever-teams-kit-spin/);
	assert.match(out, /@keyframes ever-teams-kit-enter/);
	assert.doesNotMatch(out, /@keyframes (spin|enter)\{/);
});

test('every --tw- property is renamed where it is declared, read and registered', () => {
	const css =
		'.x{--tw-translate-x:2px;translate:var(--tw-translate-x) var(--tw-translate-y)}@property --tw-translate-x{syntax:"*";inherits:false;initial-value:0}';
	const out = scopeStylesheet(postcss.parse(css)).toString();

	assert.doesNotMatch(out, /--tw-/);
	assert.match(out, /--ever-teams-tw-translate-x:2px/);
	assert.match(out, /var\(--ever-teams-tw-translate-x\) var\(--ever-teams-tw-translate-y\)/);
	assert.match(out, /@property --ever-teams-tw-translate-x/);
});

test('every rule of the built stylesheet applies only inside a kit root, and none to html, body or bare elements', async () => {
	const css = await buildStylesheet();
	const root = postcss.parse(css);
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
	assert.match(css, /\[data-ever-teams-kit\] \.outline-hidden/);
});

test('the built reset comes before the utilities, so space-y-* keeps its margins against the reset of the same specificity', async () => {
	const css = await buildStylesheet();
	const root = postcss.parse(css);
	const rules = [];
	root.walkRules((rule) => {
		rules.push(rule);
	});
	const resetsMargins = (rule) =>
		rule.selectors.includes(`${KIT_ROOT} *`) && rule.nodes.some((d) => d.prop === 'margin' && d.value === '0');
	const reset = rules.findIndex(resetsMargins);
	const spaceY = rules.findIndex((rule) => rule.selector.includes(':where(.space-y-6>'));

	assert.ok(reset >= 0, 'the reset is in the stylesheet');
	assert.ok(spaceY >= 0, 'space-y-6 is in the stylesheet');
	assert.ok(reset < spaceY, `the reset (rule ${reset}) comes before space-y-6 (rule ${spaceY})`);
});

test('dark styles follow the color scheme of the kit root, never a dark class of the host page', async () => {
	const { JSDOM } = require('jsdom');
	const root = postcss.parse(await buildStylesheet());
	const selectorOf = (matches) => {
		let found;
		root.walkRules((rule) => {
			if (!found && matches(rule)) found = rule.selector;
		});
		return found;
	};
	// jsdom's selector engine reads no escaped class name: the variant's class is swapped for a plain one.
	const darkText = selectorOf((rule) => rule.selector.includes('.dark\\:text-white')).replace(
		'.dark\\:text-white',
		'.probe'
	);
	const darkTokens = selectorOf((rule) =>
		rule.nodes.some((d) => d.prop === '--background' && d.value === '224 71% 4%')
	);
	// A host page in dark mode, with one light and one dark kit root.
	const { document } = new JSDOM(
		`<html class="dark"><body>
			<div id="light" data-ever-teams-kit data-ever-teams-color-scheme="light"><span id="light-text" class="probe"></span></div>
			<div id="dark" data-ever-teams-kit data-ever-teams-color-scheme="dark"><span id="dark-text" class="probe"></span></div>
		</body></html>`
	).window;
	const ids = (selector) => [...document.querySelectorAll(selector)].map((element) => element.id);

	assert.deepEqual(ids(darkText), ['dark-text']);
	assert.deepEqual(ids(darkTokens), ['dark']);
});

test('the built stylesheet names no keyframes and registers no property a host could also use', async () => {
	const css = await buildStylesheet();
	const root = postcss.parse(css);
	const keyframes = [];
	const properties = [];
	root.walkAtRules(/keyframes$/, (atRule) => keyframes.push(atRule.params));
	root.walkAtRules('property', (atRule) => properties.push(atRule.params));

	assert.ok(keyframes.length > 0);
	assert.deepEqual(
		keyframes.filter((name) => !name.startsWith('ever-teams-kit-')),
		[]
	);
	assert.ok(properties.length > 0);
	assert.deepEqual(
		properties.filter((name) => !name.startsWith('--ever-teams-')),
		[]
	);
	assert.doesNotMatch(css, /--tw-/);
});
