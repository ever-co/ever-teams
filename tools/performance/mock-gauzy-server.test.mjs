import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createConnection } from 'node:net';
import test from 'node:test';

import { createMockGauzyServer } from '../../apps/web/cypress/support/mock-gauzy-server.mjs';

const fixture = JSON.parse(readFileSync(new URL('../../apps/web/cypress/fixtures/bootstrap.json', import.meta.url)));

test('serves deterministic bootstrap data and keeps request evidence body/header free', async (context) => {
	const server = await createMockGauzyServer({ fixture, port: 0 });
	context.after(() => server.close());

	const response = await fetch(`${server.origin}/api/user/me`);
	assert.equal(response.status, 200);
	assert.equal((await response.json()).id, fixture.ids.user);
	const tasks = await (await fetch(`${server.origin}/api/tasks/team`)).json();
	assert.equal(tasks.items[0].teams[0].id, fixture.ids.teamA);

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

test('scopes fixture responses from the tenant header and models a non-manager role', async (context) => {
	const server = await createMockGauzyServer({ fixture, port: 0 });
	context.after(() => server.close());
	server.setScenario({ manager: false });

	const response = await fetch(`${server.origin}/api/user/me`, {
		headers: { 'tenant-id': fixture.ids.tenantB }
	});
	const user = await response.json();

	assert.equal(user.defaultOrganizationId, fixture.ids.organizationB);
	assert.equal(user.lastTeamId, fixture.ids.teamB);
	assert.equal(user.role.name, 'EMPLOYEE');
});

test('survives an aborted request body and continues serving deterministic traffic', async (context) => {
	const server = await createMockGauzyServer({ fixture, port: 0 });
	context.after(() => server.close());
	server.setScenario({ delays: { '/api/tasks': 50 } });
	const origin = new URL(server.origin);

	await new Promise((resolve, reject) => {
		const socket = createConnection({ host: origin.hostname, port: Number(origin.port) });
		socket.once('error', (error) => {
			if (error.code === 'ECONNRESET') resolve();
			else reject(error);
		});
		socket.once('connect', () => {
			socket.write(
				[
					'POST /api/tasks HTTP/1.1',
					`Host: ${origin.host}`,
					'Content-Type: application/json',
					'Content-Length: 1024',
					'Connection: close',
					'',
					'{"partial":'
				].join('\r\n')
			);
			setImmediate(() => {
				socket.destroy();
				resolve();
			});
		});
	});

	await new Promise((resolve) => setTimeout(resolve, 75));
	const response = await fetch(`${server.origin}/api/user/me`);
	assert.equal(response.status, 200);
	assert.equal((await response.json()).id, fixture.ids.user);
	assert.equal(server.requests().some((request) => request.path === '/api/tasks'), false);
});

test('allows credentials only for the deterministic local browser origins', async (context) => {
	const server = await createMockGauzyServer({ fixture, port: 0 });
	context.after(() => server.close());

	const trusted = await fetch(`${server.origin}/api/user/me`, {
		headers: { origin: 'http://127.0.0.1:3030' }
	});
	assert.equal(trusted.status, 200);
	assert.equal(trusted.headers.get('access-control-allow-origin'), 'http://127.0.0.1:3030');
	assert.equal(trusted.headers.get('access-control-allow-credentials'), 'true');

	const untrusted = await fetch(`${server.origin}/api/user/me`, {
		headers: { origin: 'https://example.invalid' }
	});
	assert.equal(untrusted.status, 403);
	assert.equal(untrusted.headers.get('access-control-allow-origin'), null);
});
