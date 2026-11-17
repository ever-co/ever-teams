// Runs against the built package (`yarn build` first): node --test test/
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { TrackingApiClient, apiConfigManager } from '../dist/index.es.js';

const originalFetch = globalThis.fetch;
const originalConfig = { ...apiConfigManager.getConfig() };
let requested;

beforeEach(() => {
	requested = [];
	globalThis.fetch = async (url, init) => {
		requested.push({ url: String(url), authorization: init?.headers?.Authorization });
		return new Response(JSON.stringify({ sessions: [], total: 0 }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' }
		});
	};
});

afterEach(() => {
	globalThis.fetch = originalFetch;
	apiConfigManager.setConfig(originalConfig);
});

const readSessions = (client) =>
	client.getFilteredSessions(
		'2026-11-17T08:00:00.000Z',
		'2026-11-17T09:00:00.000Z',
		null,
		'org-id',
		'tenant-id',
		'the-token'
	);

test('a client given no base URL sends the token only to the API the SDK is configured with', async () => {
	apiConfigManager.setConfig({ apiUrl: 'https://api.example.com/api' });

	await readSessions(new TrackingApiClient());

	assert.equal(requested.length, 1);
	assert.equal(new URL(requested[0].url).origin, 'https://api.example.com');
});

test('a base URL the host sets still wins over the SDK API', async () => {
	apiConfigManager.setConfig({ apiUrl: 'https://api.example.com/api' });

	await readSessions(new TrackingApiClient('https://tracking.example.org/api'));

	assert.equal(new URL(requested[0].url).origin, 'https://tracking.example.org');
});

test('getConfig reports the API that requests will go to', () => {
	apiConfigManager.setConfig({ apiUrl: 'https://api.example.com/api' });

	assert.equal(new TrackingApiClient().getConfig().baseUrl, 'https://api.example.com/api');
});
