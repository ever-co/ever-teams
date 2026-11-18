// "Powered by Ever Teams" follows TeamsProvider's branding: node --test test/*.test.mjs (from packages/toolkit/atoms).
// esbuild bundles the footer, the kit options and TeamsProvider with toolkit-ui, the translations and the provider's
// data hooks, theme and API replaced by stand-ins; React renders them to static markup.
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

// What TeamsProvider renders around its children, reduced to the children; its data hooks answer a signed-out person.
const passThrough = 'export default ({ children }) => children;';
const stubs = {
	'react-i18next': `export const useTranslation = () => ({ t: (key) => key });
		export const I18nextProvider = ({ children }) => children;`,
	'@ever-teams/toolkit-ui': `import { createContext } from 'react';
		export const PortalContainerContext = createContext(null);
		export const cn = (...names) => names.filter(Boolean).join(' ');
		export const Toaster = () => null;
		export const getWeekStartAndEnd = () => ({ start: new Date(0), end: new Date(0) });`,
	'theme-ui': 'export const ThemeUIProvider = ({ children }) => children;',
	'next-themes': 'export const ThemeProvider = ({ children }) => children;',
	'@ever-teams/api': 'export const apiConfigManager = { setConfig() {}, getConfig: () => ({}) };',
	'@ever-teams/toolkit-types': '',
	'@hooks/useAccessToken': 'export const useAccessToken = () => ({ accessToken: null });',
	'@hooks/useAuthUser': 'export const useAuthUser = () => ({ data: undefined });',
	'@hooks/useUserPermission': 'export const useUserPermission = () => ({});',
	'@hooks/useUserOrganization': 'export const useUserOrganization = () => ({ data: undefined });',
	'@hooks/useSelectedOrganization': 'export const useSelectedOrganization = () => ({});',
	'@hooks/useFontSelector': 'export default () => ({ fontOptions: [], selectedFont: "", setSelectedFont() {} });',
	'@components/i18n/language-switch': 'export const changeTeamsLanguage = () => undefined;',
	'@lib/i18n/init': 'export default {};',
	'@lib/context/teams-tracking-context': passThrough,
	'@lib/context/teams-timer-status-context': 'export const TimerStatusProvider = ({ children }) => children;',
	'../../themes/kit-theme-config': 'export const withoutGlobalStyles = (theme) => theme;'
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
	bundleDir = fs.mkdtempSync(path.join(here, '.branding-'));
	const entry = path.join(bundleDir, 'entry.mjs');
	const components = path.join(lib, 'components').replace(/\\/g, '/');
	fs.writeFileSync(
		entry,
		`export { TeamsTimerFooter } from '${components}/layouts/footers/component-footer.tsx';
		export { KitOptionsProvider } from '${components}/teams-provider/kit-root.tsx';
		export { TeamsProvider } from '${components}/teams-provider/teams-provider.tsx';`
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
		external: ['react', 'react/jsx-runtime', 'jotai'],
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

function footerUnderProvider(props) {
	return renderToStaticMarkup(
		React.createElement(kit.TeamsProvider, props, React.createElement(kit.TeamsTimerFooter))
	);
}

test('through TeamsProvider: the footer shows without branding and with branding, and branding={false} hides it', () => {
	assert.match(footerUnderProvider({}), /FOOTER\.powered_by/);
	assert.match(footerUnderProvider({ branding: true }), /FOOTER\.powered_by/);
	assert.doesNotMatch(footerUnderProvider({ branding: false }), /FOOTER\.powered_by/);
});
