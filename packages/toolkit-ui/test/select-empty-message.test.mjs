// What an empty select says: node --test test/*.test.mjs (from packages/toolkit-ui). esbuild bundles the real Select
// with the Radix and command primitives replaced by components that render their children, so its list shows in static
// markup without being opened.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const esbuild = require('esbuild');

const children = '({ children }) => children';
const primitives = {
	'./select': ['ShadCnSelect', 'SelectContent', 'SelectItem', 'SelectTrigger', 'SelectValue'],
	'../command': ['Command', 'CommandEmpty', 'CommandGroup', 'CommandInput', 'CommandItem', 'CommandList']
};
const sources = {
	...Object.fromEntries(
		Object.entries(primitives).map(([name, exported]) => [
			name,
			exported.map((component) => `export const ${component} = ${children};`).join('\n')
		])
	),
	'@/lib/utils/utils': "export const cn = (...names) => names.filter(Boolean).join(' ');"
};

let React;
let renderToStaticMarkup;
let Select;
let folder;

before(async () => {
	folder = fs.mkdtempSync(path.join(here, '.select-empty-message-'));
	const outfile = path.join(folder, 'select.mjs');
	await esbuild.build({
		entryPoints: [path.join(here, '..', 'src', 'lib', 'components', 'select', 'select-input.tsx')],
		outfile,
		bundle: true,
		format: 'esm',
		platform: 'neutral',
		mainFields: ['module', 'main'],
		jsx: 'automatic',
		logLevel: 'error',
		external: ['react', 'react/jsx-runtime'],
		plugins: [
			{
				name: 'primitives',
				setup(build) {
					build.onResolve({ filter: /.*/ }, ({ path: name }) => {
						if (!(name in sources)) {
							return undefined;
						}
						return { path: name, namespace: 'primitive' };
					});
					build.onLoad({ filter: /.*/, namespace: 'primitive' }, ({ path: name }) => ({
						contents: sources[name],
						loader: 'js'
					}));
				}
			}
		]
	});
	React = require('react');
	({ renderToStaticMarkup } = require('react-dom/server'));
	({ Select } = await import(pathToFileURL(outfile).href));
});

after(() => {
	if (folder) fs.rmSync(folder, { recursive: true, force: true });
});

const render = (props) =>
	renderToStaticMarkup(React.createElement(Select, { placeholder: 'Select project', ...props }));

test('a select with no item says the message it is given', () => {
	const markup = render({ values: [], emptyMessage: 'Aucun projet sur lequel suivre le temps' });

	assert.match(markup, /Aucun projet sur lequel suivre le temps/);
	assert.doesNotMatch(markup, /No item found/);
});

test('a select given no message still says "No item found", in its list and in its search', () => {
	assert.match(render({ values: [] }), /No item found/);
	assert.match(render({ values: [{ value: 'p-1', label: 'Trail app' }], search: true }), /No item found/);
});

test("a select with a search passes the message it is given to its search's empty slot", () => {
	const markup = render({
		values: [{ value: 'p-1', label: 'Trail app' }],
		search: true,
		emptyMessage: 'Aucun projet'
	});

	assert.match(markup, /Aucun projet/);
	assert.doesNotMatch(markup, /No item found/);
});
