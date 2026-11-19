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
		export const useThemeColor = () => 'purple';
		const passThrough = ({ children }) => children ?? null;
		export const Dialog = ({ trigger, children }) => createElement('div', null, trigger, children);
		export const Avatar = () => null;
		export const Card = passThrough;
		export const Checkbox = () => null;
		export const Popover = passThrough;
		export const PopoverContent = () => null;
		export const PopoverTrigger = passThrough;
		export const Tabs = passThrough;
		export const TabsContent = passThrough;
		export const TabsListThemed = passThrough;
		export const TabsTrigger = passThrough;`,
	'react-i18next': 'export const useTranslation = () => ({ t: (key) => key });',
	'password-hook': `export const usePasswordLoginForm = () => ({
		handleSubmit() {}, handleInputChange() {}, formData: { email: '', password: '' }, error: globalThis.formError, loading: false
	});`,
	'token-hook': `export const useTokenSubmission = () => ({
		handleSubmit() {}, handleInputChange() {}, tokenInput: '', error: globalThis.formError, isLoading: Boolean(globalThis.formLoading)
	});`,
	'registration-hook': `export const useRegistrationForm = () => ({
		handleSubmit() {}, handleInputChange() {}, handleCheckboxChange() {}, loading: false,
		errors: globalThis.formError ? [globalThis.formError] : [],
		formData: { fullName: '', email: '', password: '', confirmPassword: '', acceptTerms: false }
	});`,
	'teams-context': 'export const useTeamsContext = () => ({ authenticatedUser: null, loadings: {} });',
	kit: `export const useKitOptions = () => ({ scoped: true });
		export const SpinOverlayLoader = () => null;
		export const TeamsTimerFooter = () => null;
		export const warnOnce = () => {};
		export const useClearKitSession = () => () => {};
		export const logOut = async () => {};
		export const apiConfigManager = { getConfig: () => ({ apiUrl: 'https://api.example.com/api' }) };`,
	'lucide-react': `export const LoaderCircle = () => null;
		export const CheckIcon = () => null;
		export const Copy = () => null;
		export const LogOutIcon = () => null;`
};
const routes = [
	[/^(@ever-teams\/toolkit-ui|react-i18next|lucide-react)$/, (p) => p],
	[/^@hooks\/usePasswordLoginForm$/, () => 'password-hook'],
	[/^@hooks\/useTokenSubmission$/, () => 'token-hook'],
	[/^@hooks\/useRegistrationForm$/, () => 'registration-hook'],
	[/^@lib\/context\/teams-context$/, () => 'teams-context'],
	[
		/^(@ever-teams\/api|@components\/teams-provider\/kit-root|\.\.\/loaders\/spin-overlay-loader|@components\/layouts\/footers\/component-footer|@lib\/utils\/warn-once|@hooks\/useClearKitSession)$/,
		() => 'kit'
	]
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
		`export { KitFormField, KitFormError } from '${forms}/kit-form-field.tsx';
		export { TeamsPasswordLoginForm } from '${forms}/teams-password-login-form.tsx';
		export { TeamsTokenLoginForm } from '${forms}/teams-token-login-form.tsx';
		export { TeamsLoginDialog, TeamsRegistrationDialog, TeamsRegistrationForm } from '${forms}/auth-forms.tsx';`
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
		plugins: [
			{
				name: 'stubs',
				setup(build) {
					build.onResolve({ filter: /^@components\/teams-ui-components\/notice-surface$/ }, () => ({
						path: path.join(lib, 'components', 'teams-ui-components', 'notice-surface.ts')
					}));
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

test('the password form names its two fields, says a refused password on the notice, and keeps its button text', () => {
	const markup = render(kit.TeamsPasswordLoginForm, {}, REFUSED);
	const fields = labelledInputs(markup);

	assert.deepEqual(
		fields.map((field) => field.text),
		['COMMON.email', 'COMMON.password']
	);
	assert.ok(
		fields.every((field) => field.input),
		'every label points to its input'
	);
	assert.match(markup, /<p role="alert" class="[^"]*bg-destructive\/5[^"]*">You entered/);
	assert.match(markup, />AUTH\.sign_in_title<\/button>/);
});

test('the token form names its field and keeps its button text', () => {
	const markup = render(kit.TeamsTokenLoginForm);
	const fields = labelledInputs(markup);

	assert.deepEqual(
		fields.map((field) => field.text),
		['COMMON.token']
	);
	assert.match(fields[0].input, /name="token"/);
	assert.match(markup, />AUTH\.sign_in_title<\/button>/);
});

test('the token form cannot be sent again while its token is checked', () => {
	globalThis.formLoading = true;
	try {
		assert.match(render(kit.TeamsTokenLoginForm), /<button[^>]*disabled=""/);
	} finally {
		globalThis.formLoading = false;
	}
	assert.doesNotMatch(render(kit.TeamsTokenLoginForm), /<button[^>]*disabled=""/);
});

test('the registration form names its four fields, says a refusal on the notice, and keeps its button text', () => {
	const markup = render(kit.TeamsRegistrationForm, {}, 'Passwords do not match.');
	const fields = labelledInputs(markup);

	assert.deepEqual(
		fields.map((field) => field.text),
		['COMMON.full_name', 'COMMON.email', 'COMMON.password', 'AUTH.confirm_password_prompt']
	);
	assert.ok(
		fields.every((field) => field.input),
		'every label points to its input'
	);
	assert.match(markup, /<p role="alert" class="[^"]*bg-destructive\/5[^"]*">Passwords do not match\./);
	assert.match(markup, />AUTH\.sign_up_title<\/button>/);
});

test('the dialogs open from buttons in the kit language', () => {
	assert.match(render(kit.TeamsLoginDialog), /<button class="min-w-28">AUTH\.sign_in_title<\/button>/);
	assert.match(render(kit.TeamsRegistrationDialog), /<button>AUTH\.register_now<\/button>/);
});

test('the English sign-in strings read without a typo or a space before the question mark', () => {
	const en = JSON.parse(fs.readFileSync(path.join(lib, 'i18n', 'locales', 'en.json'), 'utf8'));

	assert.equal(en.AUTH.dont_have_an_account, "Don't have an account?");
	assert.equal(en.AUTH.have_an_account, 'Have an account?');
	assert.equal(en.ERROR.invalid_password_or_email, 'You entered an invalid email or password.');
});
