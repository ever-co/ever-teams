// The time logs read sends the time zone's name (ever-co/ever-teams#5628). Runs against the built package: `yarn test`
// in packages/api builds it, then runs node --test test/*.test.mjs
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { getTimeLogs, apiConfigManager } from '../dist/index.es.js';

const originalFetch = globalThis.fetch;
let sentTimeZones;

beforeEach(() => {
	sentTimeZones = [];
	apiConfigManager.setConfig({ apiUrl: 'https://api.example.com/api' });
	globalThis.fetch = async (url) => {
		sentTimeZones.push(new URL(String(url)).searchParams.get('timeZone'));
		return new Response('[]', { status: 200, headers: { 'Content-Type': 'application/json' } });
	};
});

afterEach(() => {
	globalThis.fetch = originalFetch;
});

const personWithZone = (timeZone) => ({ id: 'user-1', tenantId: 'tenant-1', timeZone });
const readFor = (user, timeZone) => getTimeLogs({ user, token: 'token-1', organizationId: 'org-1', timeZone });

test('a profile time zone stored with its offset, as the web app writes it, is sent as its name', async () => {
	await readFor(personWithZone('Europe/Berlin (UTC +01:00)'));
	await readFor(personWithZone('America/Los_Angeles (UTC -08:00)'));
	await readFor(personWithZone('UTC (UTC +00:00)'));

	assert.deepEqual(sentTimeZones, ['Europe/Berlin', 'America/Los_Angeles', 'UTC']);
});

test("the timesheet's own zone wins, and a zone without an offset is sent as it is", async () => {
	await readFor(personWithZone('Europe/Berlin (UTC +01:00)'), 'Asia/Tokyo (UTC +09:00)');
	await readFor(personWithZone('Europe/Paris'));

	assert.deepEqual(sentTimeZones, ['Asia/Tokyo', 'Europe/Paris']);
});
