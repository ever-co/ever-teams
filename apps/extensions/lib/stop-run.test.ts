import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import { installFakeChrome, installFakeFetch } from '../test/fake-chrome.ts';
import { ApiError } from './api-client.ts';
import { refusalOf } from './refusal.ts';
import { runToStopOf, stopFailureOf, stopThroughBackground } from './stop-run.ts';
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

const RUN = { id: 'log-1', source: 'BROWSER_EXTENSION' };

/** The background as the popup reaches it: what it answers each message, or a failure to reach it. */
function backgroundAnswering(answer: (message: unknown) => Promise<unknown>) {
	const sent: unknown[] = [];
	const chromeLike = (globalThis as unknown as { chrome: Record<string, unknown> }).chrome;
	chromeLike.runtime = {
		sendMessage: (message: unknown) => {
			sent.push(message);
			return answer(message);
		}
	};
	return sent;
}

describe("the popup's stop", () => {
	let calls: ReturnType<typeof installFakeFetch>;

	beforeEach(() => {
		installFakeChrome({ session: SESSION });
		calls = installFakeFetch(() => ({ status: 200, body: {} }));
	});

	it('asks the background to stop the run, and sends nothing to the API itself', async () => {
		const sent = backgroundAnswering(async () => ({ stopped: true }));

		await stopThroughBackground(SESSION, RUN);

		assert.deepEqual(sent, [{ type: 'stopRun', payload: RUN }]);
		assert.equal(calls.length, 0, 'the background credits and stops the run');
	});

	it("throws the API's refusal the background answered, so the popup shows its reason", async () => {
		backgroundAnswering(async () => ({
			stopped: false,
			failure: { status: 409, message: 'Another run is going on' }
		}));

		const refused = await stopThroughBackground(SESSION, RUN).then(
			() => null,
			(error: unknown) => error
		);

		assert.ok(refused instanceof ApiError);
		assert.equal(refused.status, 409);
		assert.deepEqual(refusalOf(refused), { key: 'errorTimerChangedElsewhere' });
	});

	it('fails as a generic failure when the background could not stop the run for a reason not from the API', async () => {
		backgroundAnswering(async () => ({ stopped: false }));

		await assert.rejects(stopThroughBackground(SESSION, RUN), (error: unknown) => !(error instanceof ApiError));
	});

	it('stops the run itself when the background cannot be reached, without crediting its last seconds', async () => {
		backgroundAnswering(async () => {
			throw new Error('Could not establish connection. Receiving end does not exist.');
		});

		await stopThroughBackground(SESSION, RUN);

		// The alarm may be crediting them: losing them beats counting them twice
		assert.deepEqual(
			calls.map((call) => call.url.replace(/\?.*/, '')),
			['https://api.example.test/api/timesheet/timer/stop']
		);
		assert.equal((calls[0].body as { timeLogId: string }).timeLogId, 'log-1');
	});

	it('stops the run itself when the background gives no answer', async () => {
		backgroundAnswering(async () => undefined);

		await stopThroughBackground(SESSION, RUN);

		assert.equal(calls.length, 1);
		assert.ok(calls[0].url.includes('/timesheet/timer/stop'));
	});
});

describe('the stop as the background reads it', () => {
	it('reads the run of a stop message only', () => {
		assert.deepEqual(runToStopOf({ type: 'stopRun', payload: { id: 'log-1', source: 'TEAMS' } }), {
			id: 'log-1',
			source: 'TEAMS'
		});
		assert.deepEqual(runToStopOf({ type: 'stopRun', payload: { id: 'log-1' } }), { id: 'log-1', source: null });
		assert.equal(runToStopOf({ type: 'stopRun', payload: { id: '' } }), null);
		assert.equal(runToStopOf({ type: 'stopRun' }), null);
		assert.equal(runToStopOf({ type: 'statusRead', payload: { id: 'log-1' } }), null);
		assert.equal(runToStopOf(null), null);
	});

	it("keeps the API's answer of a failed stop for the popup, and nothing of any other failure", () => {
		assert.deepEqual(stopFailureOf(new ApiError(422, 'Refused', 'TASK_NOT_PLANNED', ['taskId'])), {
			stopped: false,
			failure: { status: 422, message: 'Refused', code: 'TASK_NOT_PLANNED', details: { fields: ['taskId'] } }
		});
		assert.deepEqual(stopFailureOf(new DOMException('No answer', 'TimeoutError')), { stopped: false });
	});
});
