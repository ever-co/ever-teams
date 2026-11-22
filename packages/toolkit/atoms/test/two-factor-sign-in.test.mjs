// A password sign-in for an account with two-factor sign-in on (ever-co/ever-teams#5701): node --test test/*.test.mjs
// (from packages/toolkit/atoms, after the toolkit-types and api builds). bundle-kit.mjs bundles the provider and the
// password sign-in hook; a stand-in fetch plays the API, which answers the password with TWO_FACTOR_REQUIRED and its
// challenge, then the verify route as each case needs.
import { test, before, after, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { bundleKit, kitSources } from './bundle-kit.mjs';
import { kitStandInOf, kitStandIns } from './kit-stand-ins.mjs';

const require = createRequire(import.meta.url);
const { JSDOM } = require('jsdom');

const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', { url: 'http://localhost/' });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.localStorage = dom.window.localStorage;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const API = 'https://api.example.com/api';
const USER = { id: 'user-1', tenantId: 'tenant-1', employee: { id: 'employee-1', organizationId: 'org-1' } };
const SESSION = { token: 'token-1', refresh_token: 'refresh-1', user: USER };
// What a signed-in kit reads next, as in kit-stand-ins.mjs; anything else gets an empty object.
const READS = {
	'/user/me': USER,
	'/role-permissions/me': [],
	'/user-organization': { items: [{ organizationId: 'org-1', isDefault: true }], total: 1 },
	'/timesheet/timer/status': { duration: 0, running: false, lastLog: null }
};
const submitted = { preventDefault() {} };
const typed = (value) => ({ target: { name: '', value } });

let React;
let act;
let createRoot;
let kit;
let removeBundle;
let root;
let form;
let sent;

before(async () => {
	const bundle = await bundleKit({
		name: 'two-factor-sign-in',
		entry: `export { TeamsProvider } from '${kitSources}/components/teams-provider/teams-provider.tsx';
			export { usePasswordLoginForm } from '${kitSources}/hooks/usePasswordLoginForm.ts';`,
		standIns: kitStandIns,
		standInOf: kitStandInOf
	});
	kit = bundle.bundled;
	removeBundle = bundle.remove;
	React = require('react');
	act = React.act;
	createRoot = require('react-dom/client').createRoot;
});

after(() => removeBundle?.());

afterEach(async () => {
	await act(async () => root?.unmount());
	document.body.replaceChildren();
	localStorage.clear();
});

const json = (status, body) =>
	new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

// The API: the password asks for a code until `expiresAt`; the verify route answers what `verify` gives.
function apiAskingForACode({ expiresAt, verify }) {
	return async (url, init) => {
		const path = new URL(url).pathname.replace(/^\/api/, '');
		const headers = new Headers(init?.headers);
		const body = init?.body;
		sent.push({ path, authorization: headers.get('authorization'), body: body && JSON.parse(body) });
		if (path === '/auth/login') {
			return json(403, { statusCode: 403, code: 'TWO_FACTOR_REQUIRED', message: 'Enter the code', challenge: 'challenge-1', expiresAt });
		}
		if (path === '/auth/two-factor/verify') {
			return verify();
		}
		return json(200, READS[path] ?? {});
	};
}

function PasswordForm() {
	form = kit.usePasswordLoginForm({});
	return null;
}

async function signInWithPassword(api) {
	sent = [];
	globalThis.fetch = api;
	const container = document.createElement('div');
	document.body.appendChild(container);
	root = createRoot(container);
	const tree = React.createElement(kit.TeamsProvider, { config: { apiUrl: API } }, React.createElement(PasswordForm));
	await act(async () => root.render(tree));
	await act(async () => form.handleInputChange({ target: { name: 'email', value: 'ayla@example.com' } }));
	await act(async () => form.handleInputChange({ target: { name: 'password', value: 'a-password' } }));
	await act(async () => form.handleSubmit(submitted));
}

const IN_FIVE_MINUTES = () => new Date(Date.now() + 5 * 60_000).toISOString();
const A_MINUTE_AGO = () => new Date(Date.now() - 60_000).toISOString();

test('a password answered TWO_FACTOR_REQUIRED opens the code step, never the permission message', async () => {
	await signInWithPassword(apiAskingForACode({ expiresAt: IN_FIVE_MINUTES(), verify: () => json(200, SESSION) }));

	assert.equal(form.error, undefined);
	assert.ok(form.twoFactor, 'the code step is open');
	assert.equal(form.twoFactor.usesRecoveryCode, false);
	assert.equal(form.formData.email, 'ayla@example.com');
});

test('the code completes the sign-in through the verify route, with the challenge', async () => {
	await signInWithPassword(apiAskingForACode({ expiresAt: IN_FIVE_MINUTES(), verify: () => json(200, SESSION) }));

	await act(async () => form.twoFactor.handleCodeChange(typed('123 456')));
	await act(async () => form.twoFactor.handleCodeSubmit(submitted));

	const verify = sent.find((request) => request.path === '/auth/two-factor/verify');
	assert.deepEqual(verify.body, { challenge: 'challenge-1', code: '123456' });
	assert.equal(form.twoFactor, null, 'the code step closed');
	const afterVerify = sent.slice(sent.indexOf(verify) + 1);
	assert.ok(
		afterVerify.some((request) => request.authorization === 'Bearer token-1'),
		'the kit reads on with the session the code gave'
	);
});

test('a code of five digits is not sent, and says all six are needed', async () => {
	await signInWithPassword(apiAskingForACode({ expiresAt: IN_FIVE_MINUTES(), verify: () => json(200, SESSION) }));

	await act(async () => form.twoFactor.handleCodeChange(typed('12345')));
	await act(async () => form.twoFactor.handleCodeSubmit(submitted));

	assert.equal(form.twoFactor.error, 'AUTH.two_factor_code_incomplete');
	assert.equal(
		sent.some((request) => request.path === '/auth/two-factor/verify'),
		false
	);
});

test('a refused code while the challenge lasts is a wrong code, and the step stays open', async () => {
	await signInWithPassword(
		apiAskingForACode({ expiresAt: IN_FIVE_MINUTES(), verify: () => json(401, { statusCode: 401, message: 'Unauthorized' }) })
	);

	await act(async () => form.twoFactor.handleCodeChange(typed('000000')));
	await act(async () => form.twoFactor.handleCodeSubmit(submitted));

	assert.equal(form.twoFactor.error, 'AUTH.two_factor_wrong_code');
});

test('a refused code after the challenge ended asks to sign in again', async () => {
	await signInWithPassword(
		apiAskingForACode({ expiresAt: A_MINUTE_AGO(), verify: () => json(401, { statusCode: 401, message: 'Unauthorized' }) })
	);

	await act(async () => form.twoFactor.handleCodeChange(typed('123456')));
	await act(async () => form.twoFactor.handleCodeSubmit(submitted));

	assert.equal(form.twoFactor.error, 'AUTH.two_factor_expired');
	await act(async () => form.backToPassword());
	assert.equal(form.twoFactor, null);
	assert.equal(form.formData.email, 'ayla@example.com');
});

test('a recovery code goes as recoveryCode, and a refused one says so', async () => {
	await signInWithPassword(
		apiAskingForACode({ expiresAt: IN_FIVE_MINUTES(), verify: () => json(401, { statusCode: 401, message: 'Unauthorized' }) })
	);

	await act(async () => form.twoFactor.toggleRecoveryCode());
	await act(async () => form.twoFactor.handleCodeChange(typed('abcd-efgh-ijkl-mnop')));
	await act(async () => form.twoFactor.handleCodeSubmit(submitted));

	const verify = sent.find((request) => request.path === '/auth/two-factor/verify');
	assert.deepEqual(verify.body, { challenge: 'challenge-1', recoveryCode: 'ABCD-EFGH-IJKL-MNOP' });
	assert.equal(form.twoFactor.error, 'AUTH.two_factor_wrong_recovery_code');
});

test('too many codes say to wait', async () => {
	await signInWithPassword(
		apiAskingForACode({ expiresAt: IN_FIVE_MINUTES(), verify: () => json(429, { statusCode: 429, message: 'Too Many Requests' }) })
	);

	await act(async () => form.twoFactor.handleCodeChange(typed('123456')));
	await act(async () => form.twoFactor.handleCodeSubmit(submitted));

	assert.equal(form.twoFactor.error, 'AUTH.two_factor_too_many');
});
