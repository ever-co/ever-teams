// The kit's default theme is the web app's flat primary, and the gradient it had stays one pick away: node --test
// test/*.test.mjs (from packages/toolkit/atoms).
// esbuild bundles the themes and the theme picker with toolkit-ui's Select and the kit context replaced by stand-ins;
// React renders the picker to static markup.
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

const GRADIENT = 'linear-gradient(135deg, #3826A6 0%, #A11DB1 100%)';
const stubs = {
	'@ever-teams/toolkit-ui': `
		import { createElement } from 'react';
		export const Select = ({ values }) => createElement('ul', null, values.map((v) => createElement('li', { key: v.label, 'data-value': v.value }, v.label)));`,
	'teams-context': 'export const useTeamsContext = () => ({ appliedTheme: null, setAppliedTheme() {} });'
};

let React;
let renderToStaticMarkup;
let kit;
let bundleDir;

before(async () => {
	bundleDir = fs.mkdtempSync(path.join(here, '.default-theme-'));
	const entry = path.join(bundleDir, 'entry.mjs');
	const themes = path.join(lib, 'themes', 'themes.ts').replace(/\\/g, '/');
	const toggle = path.join(lib, 'components', 'teams-ui-components', 'teams-theme-toggle.tsx').replace(/\\/g, '/');
	fs.writeFileSync(entry, `export * from '${themes}';\nexport { TeamsThemeToggle } from '${toggle}';`);
	const outfile = path.join(bundleDir, 'themes.mjs');
	await esbuild.build({
		entryPoints: [entry],
		bundle: true,
		format: 'esm',
		platform: 'neutral',
		jsx: 'automatic',
		outfile,
		logLevel: 'error',
		external: ['react', 'react/jsx-runtime'],
		plugins: [
			{
				name: 'stubs',
				setup(build) {
					build.onResolve({ filter: /^@ever-teams\/toolkit-ui$/ }, (args) => ({
						path: args.path,
						namespace: 'stub'
					}));
					build.onResolve({ filter: /^@ever-teams\/toolkit-types$/ }, () => ({
						path: 'types',
						namespace: 'stub'
					}));
					build.onResolve({ filter: /^@lib\/context\/teams-context$/ }, () => ({
						path: 'teams-context',
						namespace: 'stub'
					}));
					build.onResolve({ filter: /^@lib\/themes\/themes$/ }, () => ({
						path: path.join(lib, 'themes', 'themes.ts')
					}));
					build.onLoad({ filter: /.*/, namespace: 'stub' }, (args) => ({
						contents: stubs[args.path] ?? '',
						loader: 'jsx'
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

test('the default theme paints buttons and focused fields in the flat primary', () => {
	assert.equal(kit.defaultTheme.colors.mainColor, '#3826A6');
	assert.equal(kit.defaultTheme.colors.borderColor, '#3826A6');
});

test('the gradient of earlier versions stays exported as gradientTheme', () => {
	assert.equal(kit.gradientTheme.colors.mainColor, GRADIENT);
	assert.equal(kit.gradientTheme.colors.borderColor, '#A11DB1');
});

test('the theme picker offers the flat default and the gradient', () => {
	const markup = renderToStaticMarkup(React.createElement(kit.TeamsThemeToggle));

	assert.match(markup, /data-value="[^"]*#3826A6&quot;[^"]*">Default</);
	assert.match(markup, /data-value="[^"]*linear-gradient[^"]*">Purple gradient</);
});
