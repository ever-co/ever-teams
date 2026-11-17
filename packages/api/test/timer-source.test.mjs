// Runs against the built package: `yarn test` in packages/api builds it, then runs node --test test/*.test.mjs
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { startTimer, stopTimer, resetTimerSource, apiConfigManager } from '../dist/index.es.js';

const user = { id: 'user-1', tenantId: 'tenant-1' };
const state = { taskId: 'task-1', clientId: null, organizationTeamId: 'team-1', projectId: 'project-1' };
const originalFetch = globalThis.fetch;
let sent;
let sentTo;

// An API that knows EMBED answers 201; an older one refuses it the way Gauzy's validation does.
// knowsEmbed: true or false for every API, or a function of the host the request goes to.
const api = ({ knowsEmbed }) => {
	sent = [];
	sentTo = [];
	globalThis.fetch = async (url, init) => {
		const body = JSON.parse(init.body);
		const { host } = new URL(url);
		sent.push(body.source);
		sentTo.push(`${host} ${body.source}`);
		const known = typeof knowsEmbed === 'function' ? knowsEmbed(host) : knowsEmbed;
		const refused = body.source === 'EMBED' && !known;
		const headers = { 'Content-Type': 'application/json' };
		if (refused) {
			const refusal = {
				statusCode: 400,
				message: ['source must be one of the following values: BROWSER, TEAMS'],
				error: 'Bad Request'
			};
			return new Response(JSON.stringify(refusal), { status: 400, headers });
		}
		return new Response(JSON.stringify({ id: 'log-1', source: body.source }), { status: 201, headers });
	};
};

beforeEach(() => {
	resetTimerSource();
	apiConfigManager.setConfig({ apiUrl: 'https://api.example.com/api' });
});

afterEach(() => {
	globalThis.fetch = originalFetch;
});

test('a start and a stop are recorded as embedded time on an API that knows the source', async () => {
	api({ knowsEmbed: true });

	const started = await startTimer(user, 'token', state, 'org-1');
	await stopTimer(user, 'token', 'org-1');

	assert.equal(started.source, 'EMBED');
	assert.deepEqual(sent, ['EMBED', 'EMBED']);
});

test('on an older API the start is sent again as TEAMS, and later calls go as TEAMS directly', async () => {
	api({ knowsEmbed: false });

	const started = await startTimer(user, 'token', state, 'org-1');
	await stopTimer(user, 'token', 'org-1');

	assert.equal(started.source, 'TEAMS');
	assert.deepEqual(sent, ['EMBED', 'TEAMS', 'TEAMS']);
});

test('the fallback is kept per API: a host that moves to an API that knows the source records EMBED again', async () => {
	api({ knowsEmbed: (host) => host === 'new-api.example.com' });

	apiConfigManager.setConfig({ apiUrl: 'https://old-api.example.com/api' });
	await startTimer(user, 'token', state, 'org-1');
	apiConfigManager.setConfig({ apiUrl: 'https://new-api.example.com/api' });
	const started = await startTimer(user, 'token', state, 'org-1');
	apiConfigManager.setConfig({ apiUrl: 'https://old-api.example.com/api' });
	await stopTimer(user, 'token', 'org-1');

	assert.equal(started.source, 'EMBED');
	assert.deepEqual(sentTo, [
		'old-api.example.com EMBED',
		'old-api.example.com TEAMS',
		'new-api.example.com EMBED',
		'old-api.example.com TEAMS'
	]);
});

test('another 400 is returned as it is, without a retry', async () => {
	sent = [];
	globalThis.fetch = async (_url, init) => {
		sent.push(JSON.parse(init.body).source);
		return new Response(JSON.stringify({ statusCode: 400, message: ['projectId must be a UUID'] }), {
			status: 400
		});
	};

	const answer = await startTimer(user, 'token', state, 'org-1');

	assert.equal(answer.statusCode, 400);
	assert.deepEqual(sent, ['EMBED']);
});

test('a 400 that only contains the letters of source in another word is not a refusal of the source', async () => {
	sent = [];
	globalThis.fetch = async (_url, init) => {
		sent.push(JSON.parse(init.body).source);
		return new Response(JSON.stringify({ statusCode: 400, message: 'resource is not available' }), {
			status: 400
		});
	};

	const answer = await startTimer(user, 'token', state, 'org-1');

	assert.equal(answer.statusCode, 400);
	assert.deepEqual(sent, ['EMBED']);
});
