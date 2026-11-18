// The API address of each caller (ever-co/ever-teams#5483). Runs against the built package: `yarn test` in
// packages/api builds it, then runs node --test test/*.test.mjs
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
	ApiCall,
	ApiCallUpload,
	apiConfigManager,
	authLogin,
	createCompleteAccount,
	getMyPermissions,
	getUser
} from '../dist/index.es.js';

const originalFetch = globalThis.fetch;
const originalConfig = { ...apiConfigManager.getConfig() };
const SERVER_A = { apiUrl: 'https://a.example.com/api' };
const USER = { id: 'user-1', tenantId: 'tenant-1' };

// What the stand-in answers, by the path under /api; anything else gets an empty object.
const ANSWERS = {
	'/auth/register': { id: 'user-1' },
	'/auth/login': { token: 'token-1', refresh_token: 'refresh-1', user: { id: 'user-1', tenantId: null } },
	'/tenant': { id: 'tenant-1', name: 'Northwind' },
	'/organization': { id: 'org-1' },
	'/employee': { id: 'employee-1' },
	'/auth/refresh-token': { token: 'token-2' }
};
let requested;

beforeEach(() => {
	requested = [];
	globalThis.fetch = async (url) => {
		requested.push(String(url));
		const path = new URL(url).pathname.replace(/^\/api/, '');
		const body = ANSWERS[path] ?? {};
		return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });
	};
	// The address the page set last, as a second TeamsProvider of the page does.
	apiConfigManager.setConfig({ apiUrl: 'https://page.example.com/api' });
});

afterEach(() => {
	globalThis.fetch = originalFetch;
	apiConfigManager.setConfig(originalConfig);
});

const hostsOf = (urls) => urls.map((url) => new URL(url).host);

test('a request given its own API address goes there, whatever address the page set last', async () => {
	await ApiCall({ path: '/user/me', method: 'GET' }, SERVER_A);
	await ApiCallUpload({ path: '/image-assets/upload/avatars', method: 'POST', body: new FormData() }, SERVER_A);

	assert.deepEqual(requested, [
		'https://a.example.com/api/user/me',
		'https://a.example.com/api/image-assets/upload/avatars'
	]);
});

test('a request without an address of its own goes to the one set with setConfig, as before', async () => {
	await ApiCall({ path: '/user/me', method: 'GET' });
	await ApiCall({ path: '/user/me', method: 'GET' }, { apiUrl: undefined });
	await ApiCallUpload({ path: '/image-assets/upload/avatars', method: 'POST', body: new FormData() });

	assert.deepEqual(requested, [
		'https://page.example.com/api/user/me',
		'https://page.example.com/api/user/me',
		'https://page.example.com/api/image-assets/upload/avatars'
	]);
});

test('a sign-in and the reads that follow it go to the address given as their last argument', async () => {
	await authLogin({ email: 'priya@example.com', password: 'secret' }, SERVER_A);
	await getUser({ token: 'token-1' }, SERVER_A);
	await getMyPermissions(USER, 'token-1', SERVER_A);

	assert.deepEqual(hostsOf(requested), ['a.example.com', 'a.example.com', 'a.example.com']);
});

test('an account setup sends each of its steps to the address it was given', async () => {
	const fields = { fullName: 'Priya Rao', email: 'priya@example.com', password: 'secret', confirmPassword: 'secret' };

	const account = await createCompleteAccount(fields, SERVER_A);

	assert.equal(account.token, 'token-2');
	assert.deepEqual(
		requested.map((url) => new URL(url).pathname),
		[
			'/api/auth/register',
			'/api/auth/login',
			'/api/tenant',
			'/api/organization',
			'/api/employee',
			'/api/auth/refresh-token'
		]
	);
	assert.deepEqual(new Set(hostsOf(requested)), new Set(['a.example.com']));
});

test('a request function called without the new argument still uses the address set with setConfig', async () => {
	await authLogin({ email: 'priya@example.com', password: 'secret' });
	await getUser({ token: 'token-1' });

	assert.deepEqual(hostsOf(requested), ['page.example.com', 'page.example.com']);
});
