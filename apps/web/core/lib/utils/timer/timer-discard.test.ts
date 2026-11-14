import { ApiErrorService } from '@/core/services/client/api-error.service';
import {
	TIMER_DISCARD_DISABLED,
	TIMER_DISCARD_TOO_LATE,
	timerDiscardAvailabilityOf,
	timerDiscardFailureOf
} from './timer-discard';

const START = Date.parse('2026-11-14T10:00:00.000Z');
const minutes = (count: number) => count * 60_000;

/** An answer of the API, with its HTTP status and body code, as the client receives it. */
function apiErrorOf(status: number, code?: string) {
	return ApiErrorService.fromAxiosError({
		message: `Request failed with status code ${status}`,
		status,
		response: { status, data: { message: 'refused', ...(code ? { code } : {}) } }
	});
}

describe('timerDiscardAvailabilityOf', () => {
	it('offers no discard while no timer runs', () => {
		const availability = timerDiscardAvailabilityOf({
			organization: { allowDiscardTimer: null },
			running: false,
			startedAt: START,
			now: START
		});

		expect(availability).toEqual({ available: false, reason: 'NOT_RUNNING' });
	});

	it('offers no discard against an API that does not know the setting', () => {
		const availability = timerDiscardAvailabilityOf({
			organization: { name: 'Studio' },
			running: true,
			startedAt: START,
			now: START
		});

		expect(availability).toEqual({ available: false, reason: 'NOT_SUPPORTED' });
	});

	it('offers no discard before the organization is read', () => {
		const availability = timerDiscardAvailabilityOf({
			organization: null,
			running: true,
			startedAt: START,
			now: START
		});

		expect(availability).toEqual({ available: false, reason: 'NOT_SUPPORTED' });
	});

	it('counts an unset switch as allowed, with no closing time', () => {
		const availability = timerDiscardAvailabilityOf({
			organization: { allowDiscardTimer: null, discardTimerWithinMinutes: null },
			running: true,
			startedAt: START,
			now: START + minutes(90)
		});

		expect(availability).toEqual({ available: true, closesAt: null });
	});

	it('offers no discard when the organization turned it off', () => {
		const availability = timerDiscardAvailabilityOf({
			organization: { allowDiscardTimer: false, discardTimerWithinMinutes: null },
			running: true,
			startedAt: START,
			now: START
		});

		expect(availability).toEqual({ available: false, reason: 'DISABLED' });
	});

	it('closes the discard when the run is older than the organization allows', () => {
		const organization = { allowDiscardTimer: true, discardTimerWithinMinutes: 10 };

		const early = timerDiscardAvailabilityOf({
			organization,
			running: true,
			startedAt: START,
			now: START + minutes(9)
		});
		const late = timerDiscardAvailabilityOf({
			organization,
			running: true,
			startedAt: START,
			now: START + minutes(10)
		});

		expect(early).toEqual({ available: true, closesAt: START + minutes(10) });
		expect(late).toEqual({ available: false, reason: 'TOO_LATE' });
	});

	it('leaves the age limit to the API when the run has no known start', () => {
		const availability = timerDiscardAvailabilityOf({
			organization: { allowDiscardTimer: true, discardTimerWithinMinutes: 10 },
			running: true,
			startedAt: null,
			now: START
		});

		expect(availability).toEqual({ available: true, closesAt: null });
	});
});

describe('timerDiscardFailureOf', () => {
	it('names the refusal of each answer the discard route gives', () => {
		expect(timerDiscardFailureOf(apiErrorOf(400))).toBe('NOT_RUNNING');
		expect(timerDiscardFailureOf(apiErrorOf(403, TIMER_DISCARD_DISABLED))).toBe('DISABLED');
		expect(timerDiscardFailureOf(apiErrorOf(403, TIMER_DISCARD_TOO_LATE))).toBe('TOO_LATE');
		expect(timerDiscardFailureOf(apiErrorOf(403))).toBe('FORBIDDEN');
		expect(timerDiscardFailureOf(apiErrorOf(404))).toBe('NOT_SUPPORTED');
		expect(timerDiscardFailureOf(apiErrorOf(409))).toBe('CHANGED');
	});

	it('reads any other failure as one to try again', () => {
		expect(timerDiscardFailureOf(apiErrorOf(500))).toBe('GENERIC');
		expect(timerDiscardFailureOf(new Error('offline'))).toBe('GENERIC');
	});
});
