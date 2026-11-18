// The kit's sign-in forms name their fields and say what went wrong: node --test test/*.test.mjs (from
// packages/toolkit/atoms).
// esbuild bundles the forms with toolkit-ui, the form hooks and the translations replaced by stand-ins (an input keeps
// its props, a translation is its key); React renders them to static markup.
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

const REFUSED = 'You entered an invalid email or password.';
const stubs = {
	'@ever-teams/toolkit-ui': `
		import { createElement } from 'react';
		export const cn = (...names) => names.flat().filter(Boolean).join(' ');
		export const Input = (props) => createElement('input', props);
		export const ThemedButton = ({ children, ...props }) => createElement('button', props, children);
		export const Button = ThemedButton;
		export const useThemeColor = () => 'purple';`,
	'react-i18next': 'export const useTranslation = () => ({ t: (key) => key });',
	'password-hook': `export const usePasswordLoginForm = () => ({
		handleSubmit() {}, handleInputChange() {}, formData: { email: '', password: '' }, error: globalThis.formError, loading: false
	});`,
	'token-hook': `export const useTokenSubmission = () => ({
		handleSubmit() {}, handleInputChange() {}, tokenInput: '', error: globalThis.formError, isLoading: false
	});`,
	'lucide-react': 'export const LoaderCircle = () => null;'
};
const routes = [
	[/^(@ever-teams\/toolkit-ui|react-i18next|lucide-react)$/, (p) => p],
	[/^@hooks\/usePasswordLoginForm$/, () => 'password-hook'],
	[/^@hooks\/useTokenSubmission$/, () => 'token-hook']
];

let React;
let renderToStaticMarkup;
let kit;
let bundleDir;

before(async () => {
	bundleDir = fs.mkdtempSync(path.join(here, '.sign-in-forms-'));
	const entry = path.join(bundleDir, 'entry.mjs');
	const forms = path.join(lib, 'components', 'forms').replace(/\\/g, '/');
	fs.writeFileSync(
		entry,
		`export { KitFormField, KitFormError } from '${forms}/kit-form-field.tsx';`
	);
	const outfile = path.join(bundleDir, 'forms.mjs');
	await esbuild.build({
		entryPoints: [entry],
		bundle: true,
		format: 'esm',
		platform: 'neutral',
		mainFields: ['module', 'main'],
		jsx: 'automatic',
		outfile,
		logLevel: 'error',
		external: ['react', 'react/jsx-runtime', 'theme-ui', 'theme-ui/jsx-runtime'],
		alias: { '@components': path.join(lib, 'components') },
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

// Every label of the markup with the input it names, matched by id.
function labelledInputs(markup) {
	const labels = [...markup.matchAll(/<label for="([^"]+)"[^>]*>([^<]*)<\/label>/g)];
	return labels.map(([, id, text]) => ({ text, input: new RegExp(`<input[^>]*id="${id}"[^>]*>`).exec(markup)?.[0] }));
}

function render(component, props = {}, error = null) {
	globalThis.formError = error;
	return renderToStaticMarkup(React.createElement(component, props));
}

test('a field names its input: the label points to it, with no colon after the text', () => {
	const markup = render(kit.KitFormField, { label: 'Email', name: 'email', type: 'email' });
	const [field] = labelledInputs(markup);

	assert.equal(field.text, 'Email');
	assert.match(field.input, /name="email"/);
});

test('two fields of one page get two ids', () => {
	const markup = renderToStaticMarkup(
		React.createElement(
			'div',
			null,
			React.createElement(kit.KitFormField, { label: 'Email', name: 'email' }),
			React.createElement(kit.KitFormField, { label: 'Email', name: 'email' })
		)
	);
	const ids = [...markup.matchAll(/<input[^>]*id="([^"]+)"/g)].map(([, id]) => id);

	assert.equal(ids.length, 2);
	assert.notEqual(ids[0], ids[1]);
});

test('an error is read out on the error notice, and nothing is drawn without one', () => {
	assert.equal(render(kit.KitFormError, { message: null }), '');
	assert.match(
		render(kit.KitFormError, { message: REFUSED }),
		/<p role="alert" class="[^"]*bg-destructive\/5[^"]*">You entered/
	);
});

