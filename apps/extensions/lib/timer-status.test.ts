import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import { installFakeChrome, installFakeFetch } from '../test/fake-chrome.ts';
import { getTimerStatus } from './gauzy.ts';
import type { Session } from './workspaces.ts';

const SESSION: Session = {
	apiUrl: 'https://api.example.test',
	token: 'access-1',
	refreshToken: 'refresh-1',
	userId: 'user-1',
	email: 'marie@example.test',
	name: 'Marie Curie',
	tenantId: 'tenant-1',
	organizationId: 'organization-1',
	employeeId: 'employee-1',
	teams: [],
	teamId: 'team-1'
};

const RUN_FROM_YESTERDAY = {
	id: 'log-1',
	startedAt: '2026-11-14T22:30:00.000Z',
	isRunning: true,
	source: 'BROWSER_EXTENSION'
};

describe('getTimerStatus past midnight', () => {
	beforeEach(() => {
		installFakeChrome({ session: SESSION });
	});

	it("keeps a run started before midnight that the day's status of an older Gauzy leaves out", async () => {
		const calls = installFakeFetch((url) => {
			if (url.includes('/api/timesheet/timer/status/worked')) {
				return { status: 200, body: [{ running: true, lastLog: RUN_FROM_YESTERDAY }] };
			}
			return { status: 200, body: { running: false, duration: 1800, lastLog: null } };
		});

		const status = await getTimerStatus(SESSION);

		assert.equal(status.running, true);
		assert.equal(status.lastLog?.id, 'log-1');
		assert.equal(status.duration, 1800);
		const worked = calls.find((call) => call.url.includes('/status/worked'));
		assert.match(worked?.url ?? '', /employeeId=employee-1/);
	});

	it('reads no last log when the day already shows the run, and keeps a stopped timer stopped', async () => {
		const running = installFakeFetch(() => ({
			status: 200,
			body: { running: true, duration: 60, lastLog: { id: 'log-2', startedAt: '2026-11-15T08:00:00.000Z' } }
		}));
		assert.equal((await getTimerStatus(SESSION)).running, true);
		assert.equal(running.filter((call) => call.url.includes('/status/worked')).length, 0);

		installFakeFetch((url) => {
			if (url.includes('/status/worked')) {
				return {
					status: 200,
					body: [{ running: false, lastLog: { ...RUN_FROM_YESTERDAY, isRunning: false } }]
				};
			}
			return { status: 200, body: { running: false, duration: 0, lastLog: null } };
		});
		assert.equal((await getTimerStatus(SESSION)).running, false);
	});

	it("answers the day's status when the last log cannot be read", async () => {
		installFakeFetch((url) => {
			if (url.includes('/status/worked')) {
				return { status: 503, body: { message: 'Service Unavailable' } };
			}
			return { status: 200, body: { running: false, duration: 0, lastLog: null } };
		});

		assert.equal((await getTimerStatus(SESSION)).running, false);
	});
});
