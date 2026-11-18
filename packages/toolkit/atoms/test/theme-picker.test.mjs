// The theme picker names its themes in the kit's language: node --test test/*.test.mjs (from packages/toolkit/atoms).
// esbuild bundles the picker with toolkit-ui's Select replaced by an element listing the labels it is given, the
// translations read from the kit's locale files and the teams context replaced by a stand-in; React renders it to
// static markup.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const esbuild = require('esbuild');
const lib = path.join(here, '..', 'src', 'lib');
const locale = (lang) => JSON.parse(fs.readFileSync(path.join(lib, 'i18n', 'locales', `${lang}.json`), 'utf8'));

// The labels before the picker went through the translations, in this order. English keeps them, except theme7's
// "Green and Yellow", a second name of theme9 for a teal to orange theme: it is "Teal and orange", as in French.
const ENGLISH_LABELS = [
	'Default',
	'Purple gradient',
	'Black and white',
	'Red and Green',
	'Yellow and Red',
	'Blue and green (Black)',
	'Pink and White',
	'Teal and orange',
	'Red and Blue',
	'Green and yellow',
	'Pink and blue',
	'Orange and red',
	'Chocolate and white',
	'Blue and Pink',
	'Yellow and pink'
];

const stubs = {
	'react-i18next': `export const useTranslation = () => ({
			t: (key) => key.split('.').reduce((group, part) => group?.[part], globalThis.kitLocale) ?? key
		});`,
	'@ever-teams/toolkit-ui': `import { createElement } from 'react';
		export const Select = ({ placeholder, values }) =>
			createElement('output', { 'data-placeholder': placeholder }, values.map((item) => item.label).join('|'));`,
	'@lib/context/teams-context': 'export const useTeamsContext = () => ({ appliedTheme: {}, setAppliedTheme() {} });'
};
// The stub an import names: the alias has already turned an `@lib/...` import into a path ending the same way.
const stubOf = (importPath) => {
	const normalized = importPath.replace(/\\/g, '/');
	return Object.keys(stubs).find((name) => {
		const isLibModule = name.startsWith('@lib/');
		return normalized === name || (isLibModule && normalized.endsWith(name.slice('@lib'.length)));
	});
};

let React;
let renderToStaticMarkup;
let kit;
let bundleDir;

before(async () => {
	bundleDir = fs.mkdtempSync(path.join(here, '.theme-picker-'));
	const entry = path.join(bundleDir, 'entry.mjs');
	const source = lib.replace(/\\/g, '/');
	fs.writeFileSync(
		entry,
		`export { TeamsThemeToggle } from '${source}/components/teams-ui-components/teams-theme-toggle.tsx';`
	);
	const outfile = path.join(bundleDir, 'picker.mjs');
	await esbuild.build({
		entryPoints: [entry],
		bundle: true,
		format: 'esm',
		platform: 'neutral',
		jsx: 'automatic',
		outfile,
		logLevel: 'error',
		external: ['react', 'react/jsx-runtime'],
		alias: { '@components': path.join(lib, 'components'), '@lib': lib },
		plugins: [
			{
				name: 'stubs',
				setup(build) {
					build.onResolve({ filter: /.*/ }, (args) => {
						const stub = stubOf(args.path);
						if (stub === undefined) {
							return undefined;
						}
						return { path: stub, namespace: 'stub' };
					});
					build.onLoad({ filter: /.*/, namespace: 'stub' }, (args) => ({
						contents: stubs[args.path],
						loader: 'js',
						resolveDir: here
					}));
				}
			}
		]
	});
	React = require('react');
	({ renderToStaticMarkup } = require('react-dom/server'));
	kit = await import(pathToFileURL(outfile).href);
});

after(() => {
	if (bundleDir) fs.rmSync(bundleDir, { recursive: true, force: true });
});

// The placeholder and the labels the picker hands its Select
function picker(lang) {
	globalThis.kitLocale = locale(lang);
	const markup = renderToStaticMarkup(React.createElement(kit.TeamsThemeToggle));
	const [, placeholder, labels] = markup.match(/<output data-placeholder="([^"]*)">([^<]*)<\/output>/);
	return { placeholder, labels: labels.split('|') };
}

test('in English the picker shows the same placeholder and labels as before, in the same order', () => {
	const { placeholder, labels } = picker('en');

	assert.equal(placeholder, 'Select theme');
	assert.deepEqual(labels, ENGLISH_LABELS);
	assert.equal(
		new Set(labels.map((label) => label.toLowerCase())).size,
		labels.length,
		'two themes never share a name'
	);
});

test('in French the picker names its themes in French, the new gradient included', () => {
	const { placeholder, labels } = picker('fr');

	assert.equal(placeholder, 'Choisir un thème');
	assert.equal(labels[1], 'Dégradé violet');
	assert.equal(labels.length, ENGLISH_LABELS.length);
	assert.equal(new Set(labels).size, labels.length, 'two themes never share a name');
});

test('both kit locales name every theme of the picker', () => {
	assert.deepEqual(Object.keys(locale('fr').THEME_PICKER), Object.keys(locale('en').THEME_PICKER));
});
