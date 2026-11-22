// The kit's password sign-in: an account with two-factor sign-in on (ever-co/ever-teams#5701), and an email and
// password that open several workspaces (ever-co/ever-teams#5700). node --test test/*.test.mjs (from
// packages/toolkit/atoms, after the toolkit-types and api builds). bundle-kit.mjs bundles the provider and the password
// sign-in hook; a stand-in fetch plays the API's workspace sign-in, its two-factor challenge and its verify route.
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
		// The email and password open one workspace, whose sign-in asks for the code (ever-co/ever-teams#5700).
		if (path === '/auth/signin.email.password') {
			return json(200, { workspaces: [{ token: 'workspace-token', user: { tenant: { name: 'Kestrel Studio' } } }] });
		}
		if (path === '/auth/signin.workspace') {
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

test('Back while a code is checked drops its answer: no sign-in from the step the person left', async () => {
	let answer;
	const held = new Promise((resolve) => {
		answer = resolve;
	});
	await signInWithPassword(apiAskingForACode({ expiresAt: IN_FIVE_MINUTES(), verify: () => held }));

	await act(async () => form.twoFactor.handleCodeChange(typed('123456')));
	let checking;
	await act(async () => {
		checking = form.twoFactor.handleCodeSubmit(submitted);
	});
	await act(async () => form.backToPassword());
	await act(async () => {
		answer(json(200, SESSION));
		await checking;
	});

	assert.equal(form.twoFactor, null);
	assert.equal(form.loading, false);
	const verify = sent.find((request) => request.path === '/auth/two-factor/verify');
	const afterVerify = sent.slice(sent.indexOf(verify) + 1);
	assert.equal(
		afterVerify.some((request) => request.authorization === 'Bearer token-1'),
		false,
		'the session of the abandoned check is not used'
	);
});

test('a refused code keeps the button off until the code changes, a server failure lets the same code go again', async () => {
	let status = 401;
	await signInWithPassword(
		apiAskingForACode({ expiresAt: IN_FIVE_MINUTES(), verify: () => json(status, { statusCode: status, message: 'Refused' }) })
	);

	await act(async () => form.twoFactor.handleCodeChange(typed('123456')));
	await act(async () => form.twoFactor.handleCodeSubmit(submitted));
	assert.equal(form.twoFactor.blocksSubmit, true);

	status = 503;
	await act(async () => form.twoFactor.handleCodeChange(typed('654321')));
	await act(async () => form.twoFactor.handleCodeSubmit(submitted));
	assert.equal(form.twoFactor.error, 'AUTH.two_factor_failed');
	assert.equal(form.twoFactor.blocksSubmit, false);
});

// Several workspaces (ever-co/ever-teams#5700): the workspaces the email and password open, by their tenant's name.
const KESTREL = { token: 'token-kestrel', user: { tenant: { name: 'Kestrel Studio' } } };
const BRIGHTLINE = { token: 'token-brightline', user: { tenant: { name: 'Brightline Agency' } } };

// The API: the email and password open `workspaces` (or are refused with `listStatus`); each workspace's sign-in
// answers a session named after its token, or what `signIn` gives.
function workspaceApi({ workspaces = [], listStatus = 200, signIn } = {}) {
	return async (url, init) => {
		const path = new URL(url).pathname.replace(/^\/api/, '');
		const headers = new Headers(init?.headers);
		const body = init?.body;
		sent.push({ path, authorization: headers.get('authorization'), body: body && JSON.parse(body) });
		if (path === '/auth/signin.email.password') {
			if (listStatus !== 200) {
				return json(listStatus, { statusCode: listStatus, message: 'Unauthorized' });
			}
			return json(200, { workspaces, total_workspaces: workspaces.length });
		}
		if (path === '/auth/signin.workspace') {
			const token = JSON.parse(body).token;
			if (signIn) {
				return signIn(token);
			}
			return json(200, { ...SESSION, token: `session-of-${token}` });
		}
		return json(200, READS[path] ?? {});
	};
}

const pathsSent = () => sent.map((request) => request.path).filter((path) => path.startsWith('/auth/'));
const usesSession = (token) => sent.some((request) => request.authorization === `Bearer ${token}`);

test('an email and password that open one workspace sign in to it at once, as before', async () => {
	await signInWithPassword(workspaceApi({ workspaces: [KESTREL] }));

	assert.deepEqual(pathsSent(), ['/auth/signin.email.password', '/auth/signin.workspace']);
	assert.deepEqual(sent.find((request) => request.path === '/auth/signin.workspace').body, {
		email: 'ayla@example.com',
		token: 'token-kestrel'
	});
	assert.equal(form.workspaces, null);
	assert.ok(usesSession('session-of-token-kestrel'), 'the kit reads on with the workspace session');
});

test('two workspaces wait for the pick, and the pick is the workspace signed in to', async () => {
	await signInWithPassword(workspaceApi({ workspaces: [BRIGHTLINE, KESTREL] }));

	assert.deepEqual(pathsSent(), ['/auth/signin.email.password']);
	assert.deepEqual(
		form.workspaces.choices.map((choice) => choice.name),
		['Brightline Agency', 'Kestrel Studio']
	);

	await act(async () => form.workspaces.choose(form.workspaces.choices[1]));

	assert.deepEqual(sent.find((request) => request.path === '/auth/signin.workspace').body.token, 'token-kestrel');
	assert.equal(form.workspaces, null);
	assert.ok(usesSession('session-of-token-kestrel'));
	assert.equal(usesSession('session-of-token-brightline'), false);
});

test('a wrong password keeps its message, and no workspace is signed in to', async () => {
	await signInWithPassword(workspaceApi({ listStatus: 401 }));

	assert.equal(form.error, 'ERROR.invalid_password_or_email');
	assert.deepEqual(pathsSent(), ['/auth/signin.email.password']);
	assert.equal(form.workspaces, null);
});

test('a picked workspace that asks for a two-factor code opens the code step', async () => {
	const asksForCode = () =>
		json(403, { statusCode: 403, code: 'TWO_FACTOR_REQUIRED', message: 'Enter the code', challenge: 'challenge-1' });
	await signInWithPassword(workspaceApi({ workspaces: [BRIGHTLINE, KESTREL], signIn: asksForCode }));

	await act(async () => form.workspaces.choose(form.workspaces.choices[0]));

	assert.ok(form.twoFactor, 'the code step is open');
});

test('a refused workspace sign-in says so on the workspace step, and Back returns to the email and password', async () => {
	const refused = () => json(401, { statusCode: 401, message: 'Unauthorized' });
	await signInWithPassword(workspaceApi({ workspaces: [BRIGHTLINE, KESTREL], signIn: refused }));

	await act(async () => form.workspaces.choose(form.workspaces.choices[0]));
	assert.equal(form.workspaces.error, 'ERROR.invalid_password_or_email');
	assert.equal(form.workspaces.choosing, null);

	await act(async () => form.backToPassword());
	assert.equal(form.workspaces, null);
	assert.equal(form.formData.email, 'ayla@example.com');
});

test('a check that got no answer, read after the person left its step, leaves the next step checking', async () => {
	let probeStarted;
	const probeCalled = new Promise((resolve) => {
		probeStarted = resolve;
	});
	let releaseProbe;
	const probeHeld = new Promise((resolve) => {
		releaseProbe = resolve;
	});
	let answerSecondCheck;
	const secondCheckHeld = new Promise((resolve) => {
		answerSecondCheck = resolve;
	});
	let checks = 0;
	const api = apiAskingForACode({
		expiresAt: IN_FIVE_MINUTES(),
		verify: () => {
			checks += 1;
			if (checks === 1) {
				return Promise.reject(new TypeError('Failed to fetch'));
			}
			return secondCheckHeld;
		}
	});
	// The kit probes the API (a no-cors request) to say why a check got no answer: held here until the next step checks.
	await signInWithPassword(async (url, init) => {
		if (init?.mode === 'no-cors') {
			probeStarted();
			await probeHeld;
			return new Response('');
		}
		return api(url, init);
	});

	await act(async () => form.twoFactor.handleCodeChange(typed('123456')));
	let firstCheck;
	await act(async () => {
		firstCheck = form.twoFactor.handleCodeSubmit(submitted);
	});
	await probeCalled;
	await act(async () => form.backToPassword());
	await act(async () => form.handleSubmit(submitted));
	await act(async () => form.twoFactor.handleCodeChange(typed('654321')));
	let secondCheck;
	await act(async () => {
		secondCheck = form.twoFactor.handleCodeSubmit(submitted);
	});
	assert.equal(form.twoFactor.loading, true);

	await act(async () => {
		releaseProbe();
		await firstCheck;
	});

	assert.equal(form.twoFactor.loading, true, 'the next step keeps its spinner while its own check runs');
	assert.equal(form.twoFactor.error, undefined, 'the left step says nothing on the next one');
	await act(async () => {
		answerSecondCheck(json(200, SESSION));
		await secondCheck;
	});
	assert.equal(form.twoFactor, null, 'the next check signs the person in');
});
