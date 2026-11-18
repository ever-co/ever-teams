// What an avatar says to screen readers, with or without its picture: node --test test/*.test.mjs (from
// packages/toolkit-ui). esbuild bundles the real Avatar with its tooltip and the Radix primitives replaced by plain
// elements (Radix draws the picture only once it has loaded, which never happens in static markup); React renders it.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const esbuild = require('esbuild');

const stubs = {
	tooltip: 'export const Tooltip = ({ children }) => children;',
	primitives: `
		import { createElement } from 'react';
		export const ShadCnAvatar = ({ children }) => createElement('div', null, children);
		export const AvatarImage = (props) => createElement('img', props);
		export const AvatarFallback = (props) => createElement('span', props);`
};

let React;
let renderToStaticMarkup;
let Avatar;
let bundleDir;

before(async () => {
	bundleDir = fs.mkdtempSync(path.join(here, '.avatar-'));
	const outfile = path.join(bundleDir, 'avatar.mjs');
	await esbuild.build({
		entryPoints: [path.join(here, '..', 'src', 'lib', 'components', 'avatar', 'teams-avatar.tsx')],
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
					build.onResolve({ filter: /\/teams-tooltip$/ }, () => ({ path: 'tooltip', namespace: 'stub' }));
					build.onResolve({ filter: /^\.\/avatar$/ }, () => ({ path: 'primitives', namespace: 'stub' }));
					build.onLoad({ filter: /.*/, namespace: 'stub' }, (args) => ({
						contents: stubs[args.path],
						loader: 'jsx'
					}));
				}
			}
		]
	});
	React = require('react');
	({ renderToStaticMarkup } = require('react-dom/server'));
	({ Avatar } = await import(pathToFileURL(outfile).href));
});

after(() => {
	if (bundleDir) fs.rmSync(bundleDir, { recursive: true, force: true });
});

const render = (props) =>
	renderToStaticMarkup(React.createElement(Avatar, { title: 'L M', fallback: 'LM', src: '/l.png', ...props }));

test('without an alt, the picture is described by the title and the initials read as before', () => {
	const markup = render({});

	assert.match(markup, /<img[^>]*alt="L M"/);
	assert.match(markup, /<span>LM<\/span>/);
});

test('a name as alt describes the picture, and the initials shown without it', () => {
	const markup = render({ alt: 'Lina Moreau' });

	assert.match(markup, /<img[^>]*alt="Lina Moreau"/);
	assert.match(markup, /<span role="img" aria-label="Lina Moreau">LM<\/span>/);
});

test('an empty alt makes the picture and the initials decorative', () => {
	const markup = render({ alt: '' });

	assert.match(markup, /<img[^>]*alt=""/);
	assert.match(markup, /<span aria-hidden="true">LM<\/span>/);
});
