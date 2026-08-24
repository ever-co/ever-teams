import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { createMockGauzyServer } from '../../apps/web/cypress/support/mock-gauzy-server.mjs';

const fixture = JSON.parse(readFileSync(new URL('../../apps/web/cypress/fixtures/bootstrap.json', import.meta.url)));

test('serves deterministic bootstrap data and keeps request evidence body/header free', async (context) => {
	const server = await createMockGauzyServer({ fixture, port: 0 });
	context.after(() => server.close());

	const response = await fetch(`${server.origin}/api/user/me`);
	assert.equal(response.status, 200);
	assert.equal((await response.json()).id, fixture.ids.user);

	const requests = server.requests();
	assert.deepEqual(Object.keys(requests[0]).sort(), ['endMs', 'method', 'path', 'query', 'startMs', 'status']);
	assert.equal(JSON.stringify(requests).includes('authorization'), false);
});

test('records browser timer/task proof while preserving the IN_PROGRESS taskStatusId', async (context) => {
	const server = await createMockGauzyServer({ fixture, port: 0 });
	context.after(() => server.close());

	await fetch(`${server.origin}/api/timesheet/timer/start`, { method: 'POST', body: '{}' });
	await fetch(`${server.origin}/api/tasks/${fixture.ids.task}`, {
		method: 'PUT',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ status: 'in-progress', taskStatusId: fixture.ids.inProgressStatus })
	});

	assert.deepEqual(server.state().mutationProof, {
		startedTimer: true,
		updatedTask: true,
		inProgressTaskStatusPreserved: true
	});
});

test('supports deterministic A to B delay scenarios without leaking bodies', async (context) => {
	const server = await createMockGauzyServer({ fixture, port: 0 });
	context.after(() => server.close());
	server.setScenario({ delays: { [fixture.ids.tenantA]: 25 } });

	const started = Date.now();
	await fetch(`${server.origin}/api/tasks?tenantId=${fixture.ids.tenantA}`);
	assert.ok(Date.now() - started >= 20);
	assert.equal(server.requests()[0].query, `tenantId=${fixture.ids.tenantA}`);
});
