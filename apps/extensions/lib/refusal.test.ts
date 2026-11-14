import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { refusalOf } from './refusal.ts';

describe('refusalOf', () => {
	it('names what a refused start missed, with the messages the web shows', () => {
		const missing = (fields: unknown) => ({ status: 400, code: 'TRACKING_FIELD_REQUIRED', details: { fields } });

		assert.deepEqual(refusalOf(missing(['projectId'])), { key: 'refusalRequiredProject' });
		assert.deepEqual(refusalOf(missing(['organizationTeamId'])), { key: 'refusalRequiredTeam' });
		assert.deepEqual(refusalOf(missing(['organizationTeamId', 'projectId'])), {
			key: 'refusalRequiredTeamAndProject'
		});
		assert.deepEqual(refusalOf(missing(['description'])), { key: 'refusalRequiredDetails' });
		assert.deepEqual(refusalOf(missing(undefined)), { key: 'refusalRequiredDetails' });
	});

	it('reads the daily plan rules by their codes', () => {
		assert.deepEqual(refusalOf({ status: 422, code: 'DAILY_PLAN_REQUIRED' }), { key: 'refusalPlanRequired' });
		assert.deepEqual(refusalOf({ status: 422, code: 'TASK_NOT_PLANNED' }), { key: 'refusalTaskNotPlanned' });
	});

	it('reads a 403 about time tracking as tracking turned off, not as a role problem', () => {
		const off = { status: 403, message: 'The time tracking functionality has been disabled for you.' };

		assert.deepEqual(refusalOf(off), { key: 'refusalTrackingOff' });
	});

	it('tells offline, an expired session and a timer changed elsewhere apart', () => {
		assert.deepEqual(refusalOf({ status: 0 }), { key: 'errorOffline' });
		assert.deepEqual(refusalOf({ status: 401 }), { key: 'errorSessionExpired' });
		assert.deepEqual(refusalOf({ status: 409 }), { key: 'errorTimerChangedElsewhere' });
	});

	it("keeps the API's own words for any other refusal", () => {
		assert.deepEqual(refusalOf({ status: 400, message: 'Task is archived' }), {
			key: 'errorWithReason',
			reason: 'Task is archived'
		});
		assert.deepEqual(refusalOf({ status: 500 }), { key: 'errorGeneric' });
	});
});
