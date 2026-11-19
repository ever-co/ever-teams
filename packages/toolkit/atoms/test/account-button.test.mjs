// The account button of the widget is named for screen readers: node --test test/*.test.mjs (from packages/toolkit/atoms).
// esbuild bundles the sign-in components with toolkit-ui, the API client, the forms and the session hooks replaced by
// stand-ins (toolkit-ui's Avatar draws its alt as a plain img); React renders them to static markup.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const esbuild = require('esbuild');

const passThrough = '({ children, ...props }) => children ?? null';
const stubs = {
	'@ever-teams/toolkit-ui': `
		import { createElement } from 'react';
		export const cn = (...names) => names.flat().filter(Boolean).join(' ');
		export const Avatar = ({ alt, title }) => createElement('img', { alt: alt ?? title, 'data-title': title });
		export const PopoverTrigger = ({ children, ...props }) => createElement('button', props, children);
		export const Popover = ${passThrough};
		export const PopoverContent = () => null;
		export const Card = ${passThrough};
		export const Checkbox = () => null;
		export const Dialog = ${passThrough};
		export const Input = () => null;
		export const Tabs = ${passThrough};
		export const TabsContent = ${passThrough};
		export const TabsListThemed = ${passThrough};
		export const TabsTrigger = ${passThrough};
		export const ThemedButton = ${passThrough};`,
	'@ever-teams/api': `export const logOut = async () => {};
		export const apiConfigManager = { getConfig: () => ({ apiUrl: 'https://api.example.com/api' }) };`,
	'react-i18next': `export const useTranslation = () => ({ t: (key, values) => (values ? key + ' ' + JSON.stringify(values) : key) });`,
	'teams-context': `export const useTeamsContext = () => ({
		authenticatedUser: globalThis.kitTestUser,
		loadings: { userLoading: false }
	});`,
	forms: 'export const TeamsPasswordLoginForm = () => null; export const TeamsTokenLoginForm = () => null;',
	kit: `export const useKitOptions = () => ({ scoped: true });
		export const SpinOverlayLoader = () => null;
		export const TeamsTimerFooter = () => null;
		export const warnOnce = () => {};
		export const useRegistrationForm = () => ({});
		export const useClearKitSession = () => () => {};`
};
const routes = [
	[/^(@ever-teams\/toolkit-ui|@ever-teams\/api|react-i18next)$/, (p) => p],
	[/^@lib\/context\/teams-context$/, () => 'teams-context'],
	[/^\.\/teams-(password|token)-login-form$/, () => 'forms'],
	[
		/^(@components\/teams-provider\/kit-root|\.\.\/loaders\/spin-overlay-loader|@components\/layouts\/footers\/component-footer|@lib\/utils\/warn-once|@hooks\/useRegistrationForm|@hooks\/useClearKitSession)$/,
		() => 'kit'
	]
];

const lina = {
	firstName: 'Lina',
	lastName: 'Moreau',
	email: 'lina@example.com',
	imageUrl: 'https://img.example.com/l.png'
};
globalThis.kitTestUser = lina;

let React;
let renderToStaticMarkup;
let kit;
let bundleDir;

before(async () => {
	bundleDir = fs.mkdtempSync(path.join(here, '.account-button-'));
	const outfile = path.join(bundleDir, 'auth-forms.mjs');
	await esbuild.build({
		entryPoints: [path.join(here, '..', 'src', 'lib', 'components', 'forms', 'auth-forms.tsx')],
		bundle: true,
		format: 'esm',
		platform: 'neutral',
		mainFields: ['module', 'main'],
		jsx: 'automatic',
		outfile,
		logLevel: 'error',
		external: ['react', 'react/jsx-runtime', 'react-dom', 'lucide-react', 'theme-ui', 'theme-ui/jsx-runtime'],
		plugins: [
			{
				name: 'stubs',
				setup(build) {
					for (const [filter, name] of routes) {
						build.onResolve({ filter }, (args) => ({ path: name(args.path), namespace: 'stub' }));
					}
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
	kit = await import(pathToFileURL(outfile).href);
});

after(() => {
	if (bundleDir) fs.rmSync(bundleDir, { recursive: true, force: true });
});

test('the account button says whose account it opens, and its picture adds no second name', () => {
	const markup = renderToStaticMarkup(React.createElement(kit.TeamsUserAvatar));

	assert.match(markup, /<button[^>]*aria-label="AUTH\.account_menu \{&quot;name&quot;:&quot;Lina Moreau&quot;\}"/);
	assert.match(markup, /<img alt=""/);
});

test('an avatar shown outside a button is described by the person name', () => {
	const markup = renderToStaticMarkup(React.createElement(kit.TeamsUserAvatar, { showMenu: false }));

	assert.match(markup, /<img alt="Lina Moreau"/);
});

test('a person with no name has an account button named without the email, and a decorative lone avatar', () => {
	globalThis.kitTestUser = { email: 'lina@example.com', imageUrl: 'https://img.example.com/l.png' };
	try {
		const button = renderToStaticMarkup(React.createElement(kit.TeamsUserAvatar));
		const alone = renderToStaticMarkup(React.createElement(kit.TeamsUserAvatar, { showMenu: false }));

		assert.match(button, /<button[^>]*aria-label="AUTH\.account_menu_unnamed"/);
		assert.match(alone, /<img alt=""/);
		assert.doesNotMatch(button + alone, /lina@example\.com/);
	} finally {
		globalThis.kitTestUser = lina;
	}
});

test('every kit locale names the account menu, with and without a name', () => {
	for (const lang of ['en', 'fr']) {
		const file = path.join(here, '..', 'src', 'lib', 'i18n', 'locales', `${lang}.json`);
		const auth = JSON.parse(fs.readFileSync(file, 'utf8')).AUTH;
		assert.match(auth.account_menu, /\{\{name\}\}/, lang);
		assert.ok(auth.account_menu_unnamed, lang);
	}
});
