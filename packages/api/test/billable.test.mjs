// Billable time through the SDK and the kit's timer start, against the built package (ever-co/ever-teams#5571).
// A start or an entry is billable as the caller chose, else as its project is set (`billableFromProject`), as in the
// web app. Without a choice, the start still sends `isBillable: true` for time without a project and for an API that
// does not know the field yet; an entry still sends no `isBillable`, which such an API reads as not billable.
import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { apiConfigManager, createClient, resetTimerSource, startTimer } from '../dist/index.es.js';
import { API_URL, ME, json, standInApi } from './support/stand-in-api.mjs';

const LOG = { id: 'log-1', startedAt: '2026-11-18T09:00:00.000Z', stoppedAt: '2026-11-18T09:30:00.000Z' };

function clientWithStandIn() {
	const api = standInApi({
		'GET /user/me': ME,
		'POST /timesheet/timer/start': () => json(201, LOG),
		'POST /timesheet/time-log': () => json(201, LOG)
	});
	const teams = createClient({ apiUrl: API_URL, token: 't', fetch: api.fetch });
	return { api, teams };
}

const billableOf = ({ isBillable, billableFromProject }) => ({ isBillable, billableFromProject });

test('a start without a choice asks for its project setting, billable when it has no project', async () => {
	const { api, teams } = clientWithStandIn();

	await teams.timer.start({ projectId: 'project-1' });

	assert.deepEqual(billableOf(api.requests[1].body), { isBillable: true, billableFromProject: true });
});

test("a start sends the caller's choice, and nothing about the project", async () => {
	const { api, teams } = clientWithStandIn();

	await teams.timer.start({ projectId: 'project-1', isBillable: false });

	assert.deepEqual(billableOf(api.requests[1].body), { isBillable: false, billableFromProject: undefined });
	assert.equal('billableFromProject' in api.requests[1].body, false);
});

test('an entry without a choice asks for its project setting and sends no isBillable, as before', async () => {
	const { api, teams } = clientWithStandIn();

	await teams.timeEntries.create({
		startedAt: '2026-11-18T09:00:00.000Z',
		stoppedAt: '2026-11-18T09:30:00.000Z',
		projectId: 'project-1'
	});

	assert.deepEqual(billableOf(api.requests[1].body), { isBillable: undefined, billableFromProject: true });
	assert.equal('isBillable' in api.requests[1].body, false);
});

test("an entry sends the caller's choice, and nothing about the project", async () => {
	const { api, teams } = clientWithStandIn();

	await teams.timeEntries.create({
		startedAt: '2026-11-18T09:00:00.000Z',
		stoppedAt: '2026-11-18T09:30:00.000Z',
		projectId: 'project-1',
		isBillable: true
	});

	assert.deepEqual(billableOf(api.requests[1].body), { isBillable: true, billableFromProject: undefined });
});

const originalFetch = globalThis.fetch;

afterEach(() => {
	globalThis.fetch = originalFetch;
});

test("the kit's timer start asks for its project setting, billable when it has no project", async () => {
	resetTimerSource();
	apiConfigManager.setConfig({ apiUrl: 'https://api.example.com/api' });
	const bodies = [];
	globalThis.fetch = async (_url, init) => {
		bodies.push(JSON.parse(init.body));
		return new Response(JSON.stringify({ id: 'log-1' }), {
			status: 201,
			headers: { 'Content-Type': 'application/json' }
		});
	};
	const user = { id: 'user-1', tenantId: 'tenant-1' };
	const state = { taskId: 'task-1', clientId: null, organizationTeamId: 'team-1', projectId: 'project-1' };

	await startTimer(user, 'token', state, 'org-1');

	assert.deepEqual(billableOf(bodies[0]), { isBillable: true, billableFromProject: true });
});
