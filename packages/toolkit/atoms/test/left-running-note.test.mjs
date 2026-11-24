// A timer the kit loses the sign-in of while it runs (ever-co/ever-teams#5583), and a person Ever Teams refused
// (#5706): node --test test/*.test.mjs (from packages/toolkit/atoms, after the toolkit-types and api builds).
// bundle-kit.mjs bundles TeamsProvider and the sign-in
// prompt with the built @ever-teams/api; a stand-in fetch answers the API, and getToken stands in for the host's
// backend: it hands a token, then fails once the host's credential is revoked, while the API refuses the old token.
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
const ORGANIZATION = 'org-1';
const LEFT_RUNNING = 'AUTH.timer_left_running';
const SIGN_IN_NOTE = 'AUTH.host_sign_in';
const USER = { id: 'user-1', tenantId: 'tenant-1', employee: { id: 'employee-1', organizationId: ORGANIZATION } };

let React;
let act;
let createRoot;
let kit;
let removeBundle;
const roots = [];

before(async () => {
	const { bundled, remove } = await bundleKit({
		name: 'left-running-note',
		entry: `export { TeamsProvider } from '${kitSources}/components/teams-provider/teams-provider.tsx';
			export { TeamsLoginDialog } from '${kitSources}/components/forms/auth-forms.tsx';
			export { useTimerStatusContext } from '${kitSources}/context/teams-timer-status-context.tsx';`,
		standIns: kitStandIns,
		standInOf: kitStandInOf
	});
	kit = bundled;
	removeBundle = remove;
	React = require('react');
	({ act } = React);
	({ createRoot } = require('react-dom/client'));
});

after(() => {
	removeBundle?.();
});

afterEach(async () => {
	for (const root of roots.splice(0)) {
		await act(async () => root.unmount());
	}
	document.body.replaceChildren();
	localStorage.clear();
});

const tokenFor = (n) => {
	const claims = Buffer.from(JSON.stringify({ id: 'user-1', organizationId: ORGANIZATION, n })).toString('base64url');
	return `header.${claims}.signature`;
};

const json = (status, body) =>
	new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

// The API and the host's backend: the timer runs or not; once revoked, the API refuses the token and getToken fails.
function standIns({ running }) {
	const stand = { revoked: false, tokens: 0 };
	globalThis.fetch = async (url) => {
		const path = new URL(url).pathname.replace(/^\/api/, '');
		if (stand.revoked) {
			return json(401, { statusCode: 401, message: 'Unauthorized' });
		}
		if (path === '/user/me') {
			return json(200, USER);
		}
		if (path === '/timesheet/timer/status') {
			const lastLog = { startedAt: new Date(Date.now() - 60_000).toISOString(), isRunning: running };
			return json(200, { running, duration: 60, lastLog });
		}
		return json(200, {});
	};
	stand.getToken = async () => {
		if (stand.revoked) {
			throw new Error('the credential was revoked');
		}
		stand.tokens += 1;
		return { token: tokenFor(stand.tokens), expiresAt: new Date(Date.now() + 15 * 60_000).toISOString() };
	};
	return stand;
}

async function settle() {
	for (let round = 0; round < 20; round += 1) {
		await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
	}
}

// A timer widget: the provider reads the status only while one is shown.
function TimerWidget() {
	const shared = kit.useTimerStatusContext();
	const register = shared?.registerConsumer;
	React.useEffect(() => register?.(), [register]);
	return null;
}

async function openPage(stand) {
	const container = document.createElement('div');
	document.body.appendChild(container);
	const root = createRoot(container);
	roots.push(root);
	const tree = React.createElement(
		kit.TeamsProvider,
		{ config: { apiUrl: API, getToken: stand.getToken }, onSignOut() {} },
		React.createElement(kit.TeamsLoginDialog),
		React.createElement(TimerWidget)
	);
	await act(async () => root.render(tree));
	await settle();
}

async function revokeAndReadAgain(stand) {
	stand.revoked = true;
	await act(async () => window.dispatchEvent(new window.Event('focus')));
	await settle();
}

test('signed out while the timer runs, the prompt says it runs on in Ever Teams', async () => {
	const stand = standIns({ running: true });
	await openPage(stand);
	assert.doesNotMatch(document.body.textContent, /AUTH\.timer_left_running/);

	await revokeAndReadAgain(stand);

	assert.match(document.body.textContent, new RegExp(SIGN_IN_NOTE.replace('.', '\\.')));
	const note = [...document.querySelectorAll('[role="alert"]')].find((element) =>
		element.textContent.includes(LEFT_RUNNING)
	);
	assert.ok(note, 'the note is read out as an alert');
});

test('signed out while the timer is stopped, the prompt says only to sign in', async () => {
	const stand = standIns({ running: false });
	await openPage(stand);

	await revokeAndReadAgain(stand);

	assert.match(document.body.textContent, new RegExp(SIGN_IN_NOTE.replace('.', '\\.')));
	assert.doesNotMatch(document.body.textContent, /AUTH\.timer_left_running/);
});

// A person the host signs in, whom Ever Teams refuses (ever-co/ever-teams#5706): the host's backend relays the API's
// refusal of the person, as the SDK throws it, instead of saying the person is signed out of the host.
const PERMISSION = 'KIT_ERRORS.PERMISSION';
const refusedByEverTeams = async () => {
	throw Object.assign(new Error('This member cannot track time through an embed.'), { code: 'EMBED_MEMBER_NOT_ALLOWED' });
};

test('a person Ever Teams refused reads the permission message, not a call to sign in to the site', async () => {
	const stand = standIns({ running: false });
	stand.getToken = refusedByEverTeams;
	await openPage(stand);

	assert.match(document.body.textContent, new RegExp(PERMISSION.replace('.', '\\.')));
	assert.doesNotMatch(document.body.textContent, new RegExp(SIGN_IN_NOTE.replace('.', '\\.')));
});

test('a person the site signed out keeps the note that points to its sign-in, not the permission message', async () => {
	const stand = standIns({ running: false });
	stand.getToken = async () => {
		throw new Error('token-url answered 401');
	};
	await openPage(stand);

	assert.match(document.body.textContent, new RegExp(SIGN_IN_NOTE.replace('.', '\\.')));
	assert.doesNotMatch(document.body.textContent, new RegExp(PERMISSION.replace('.', '\\.')));
});
