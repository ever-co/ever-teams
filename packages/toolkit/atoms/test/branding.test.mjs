// "Powered by Ever Teams" follows TeamsProvider's branding: node --test test/*.test.mjs (from packages/toolkit/atoms).
// esbuild bundles the footer and the kit options with toolkit-ui and the translations replaced by stand-ins; React
// renders them to static markup.
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

const stubs = {
	'react-i18next': 'export const useTranslation = () => ({ t: (key) => key });',
	'@ever-teams/toolkit-ui': `import { createContext } from 'react';
		export const PortalContainerContext = createContext(null);
		export const cn = (...names) => names.filter(Boolean).join(' ');`
};

let React;
let renderToStaticMarkup;
let kit;
let bundleDir;

before(async () => {
	bundleDir = fs.mkdtempSync(path.join(here, '.branding-'));
	const entry = path.join(bundleDir, 'entry.mjs');
	const components = path.join(lib, 'components').replace(/\\/g, '/');
	fs.writeFileSync(
		entry,
		`export { TeamsTimerFooter } from '${components}/layouts/footers/component-footer.tsx';
		export { KitOptionsProvider } from '${components}/teams-provider/kit-root.tsx';`
	);
	const outfile = path.join(bundleDir, 'footer.mjs');
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
					build.onResolve({ filter: /^(@ever-teams\/toolkit-ui|react-i18next)$/ }, (args) => ({
						path: args.path,
						namespace: 'stub'
					}));
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

function footerWith(options) {
	return renderToStaticMarkup(
		React.createElement(kit.KitOptionsProvider, { value: options }, React.createElement(kit.TeamsTimerFooter))
	);
}

test('the footer says Powered by Ever Teams by default, as before', () => {
	assert.match(footerWith({ scoped: true }), /FOOTER\.powered_by/);
	assert.match(footerWith({ scoped: true, branding: true }), /href="https:\/\/ever\.team\/"/);
});

test('branding false hides the footer', () => {
	assert.equal(footerWith({ scoped: true, branding: false }), '');
});
