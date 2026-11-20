// A client with an embed token (ever-co/ever-teams#5589), against the built package: node --test test/*.test.mjs (from
// packages/api, after `rollup -c`). In a browser the API's refusal of a route an embed token cannot reach is never read
// (CORS is open to an allowed site on the timer's routes only), so the client refuses those calls itself.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createClient, EverTeamsForbiddenError, isEmbedToken } from '../dist/index.es.js';
import { API_URL, json, ME, standInApi } from './support/stand-in-api.mjs';

const tokenWith = (claims) => `header.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.signature`;
const EMBED_TOKEN = tokenWith({ id: 'user-1', embedCredentialId: 'credential-1', embedEmployeeId: 'employee-1' });
const STATUS = { running: false, duration: 0, lastLog: null };

test('an embed token reaches the timer and the user as before', async () => {
	const log = { id: 'log-1', isRunning: true };
	const api = standInApi({
		'GET /user/me': ME,
		'GET /timesheet/timer/status': STATUS,
		'POST /timesheet/timer/start': log,
		'POST /timesheet/timer/stop': { ...log, isRunning: false }
	});
	const teams = createClient({ apiUrl: API_URL, token: EMBED_TOKEN, fetch: api.fetch });

	const status = await teams.timer.status();
	await teams.timer.start();
	await teams.timer.stop();

	assert.equal(status.running, false);
	assert.deepEqual(api.routesSent(), [
		'GET /user/me',
		'GET /timesheet/timer/status',
		'POST /timesheet/timer/start',
		'POST /timesheet/timer/stop'
	]);
});

test('an embed token gets EMBED_SCOPE for the calls it cannot make, with no request sent', async () => {
	const api = standInApi({ 'GET /user/me': ME });
	const teams = createClient({ apiUrl: API_URL, token: EMBED_TOKEN, fetch: api.fetch });
	const calls = {
		'timeEntries.list': () => teams.timeEntries.list({ from: '2026-11-16', to: '2026-11-20', mine: true }),
		'totals.today': () => teams.totals.today(),
		'members.list': () => teams.members.list(),
		'projects.list': () => teams.projects.list(),
		'tasks.list': () => teams.tasks.list()
	};

	for (const [name, call] of Object.entries(calls)) {
		await assert.rejects(call(), (error) => {
			assert.ok(error instanceof EverTeamsForbiddenError, name);
			assert.equal(error.code, 'EMBED_SCOPE', name);
			assert.equal(error.status, 403, name);
			assert.match(error.nextStep, /personal API token/, name);
			return true;
		});
	}
	const sent = api.routesSent();
	assert.deepEqual(
		sent.filter((request) => request !== 'GET /user/me'),
		[],
		'nothing but the user is read'
	);
});

test('a personal token, or a token that is not a JWT, is sent as before', async () => {
	const counts = { todayDuration: 60, todayActivities: 0, weekDuration: 0, weekActivities: 0 };
	for (const token of [tokenWith({ id: 'user-1' }), 'opaque-token']) {
		const api = standInApi({ 'GET /user/me': ME, 'GET /timesheet/statistics/counts': counts });
		const teams = createClient({ apiUrl: API_URL, token, fetch: api.fetch });

		const today = await teams.totals.today();

		assert.equal(today.duration, 60);
	}
});

test('a token with the grant claim alone is an embed token too', async () => {
	const api = standInApi({ 'GET /user/me': ME });
	const token = tokenWith({ id: 'user-1', embedGrantId: 'grant-1' });
	const teams = createClient({ apiUrl: API_URL, token, fetch: api.fetch });

	await assert.rejects(
		teams.totals.today(),
		(error) => error instanceof EverTeamsForbiddenError && error.code === 'EMBED_SCOPE'
	);
	assert.deepEqual(
		api.routesSent().filter((route) => route !== 'GET /user/me'),
		[]
	);
});

test('a renewed token is checked before the retry: a call refused (401) is not sent again with an embed token', async () => {
	const api = standInApi({
		'GET /user/me': ME,
		'GET /timesheet/statistics/counts': () => json(401, { statusCode: 401, message: 'Unauthorized' })
	});
	const tokens = [tokenWith({ id: 'user-1' }), EMBED_TOKEN];
	const teams = createClient({ apiUrl: API_URL, getToken: async () => tokens.shift(), fetch: api.fetch });

	await assert.rejects(
		teams.totals.today(),
		(error) => error instanceof EverTeamsForbiddenError && error.code === 'EMBED_SCOPE'
	);
	assert.equal(api.routesSent().filter((route) => route === 'GET /timesheet/statistics/counts').length, 1);
});

test('the package tells an embed token from another one, as the client does (#5602)', () => {
	assert.equal(isEmbedToken(EMBED_TOKEN), true);
	assert.equal(isEmbedToken(tokenWith({ id: 'user-1', embedGrantId: 'grant-1' })), true, "a site's sign-in");
	assert.equal(isEmbedToken(tokenWith({ id: 'user-1', tenantId: 'tenant-1' })), false, 'a personal token');
	assert.equal(isEmbedToken('not-a-jwt'), false);
	assert.equal(isEmbedToken(null), false);
});
