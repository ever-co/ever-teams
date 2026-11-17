// Runs against the built package (`yarn build` first): node --test test/
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { startTimer, stopTimer, resetTimerSource, apiConfigManager } from '../dist/index.es.js';

const user = { id: 'user-1', tenantId: 'tenant-1' };
const state = { taskId: 'task-1', clientId: null, organizationTeamId: 'team-1', projectId: 'project-1' };
const originalFetch = globalThis.fetch;
let sent;

// An API that knows EMBED answers 201; an older one refuses it the way Gauzy's validation does.
const api = ({ knowsEmbed }) => {
	sent = [];
	globalThis.fetch = async (_url, init) => {
		const body = JSON.parse(init.body);
		sent.push(body.source);
		const refused = body.source === 'EMBED' && !knowsEmbed;
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
