// The timer's collapse icon draws in the text color (ever-co/ever-teams#5608): node --test test/*.test.mjs
// (from packages/toolkit-ui). esbuild bundles the two icons; react-dom/server renders them.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const esbuild = require('esbuild');

let icons;
let bundleDir;

before(async () => {
	bundleDir = fs.mkdtempSync(path.join(here, '.expand-icons-'));
	const entry = path.join(bundleDir, 'entry.mjs');
	const svgs = path.join(here, '..', 'src', 'lib', 'svgs').replaceAll('\\', '/');
	fs.writeFileSync(
		entry,
		`export { ExpandIcon } from '${svgs}/expand.tsx';\nexport { CollapseIcon } from '${svgs}/collapse.tsx';`
	);
	const outfile = path.join(bundleDir, 'icons.mjs');
	await esbuild.build({
		entryPoints: [entry],
		bundle: true,
		format: 'esm',
		platform: 'neutral',
		jsx: 'automatic',
		outfile,
		logLevel: 'error',
		external: ['react', 'react/jsx-runtime']
	});
	icons = await import(pathToFileURL(outfile).href);
});

after(() => {
	fs.rmSync(bundleDir, { recursive: true, force: true });
});

const { createElement } = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const strokesOf = (markup) => [...markup.matchAll(/stroke="([^"]+)"/g)].map((match) => match[1]);

for (const name of ['CollapseIcon']) {
	test(`${name} draws every stroke in the text color, readable in light and dark`, () => {
		const markup = renderToStaticMarkup(createElement(icons[name], { size: 10 }));

		const strokes = strokesOf(markup);
		assert.equal(strokes.length, 4);
		assert.deepEqual(new Set(strokes), new Set(['currentColor']));
		assert.match(markup, /width="10"/);
	});
}
