/**
 * Whether the running timer offers "Discard this run", and why a discard was refused. The rules are the web's
 * (ever-co/ever-teams#5274) and the API's (ever-co/ever-gauzy#11935).
 */
import { TimerSource } from '../services/interfaces/ITimer';
import { discardSourceKeyOf, timerDiscardAvailabilityOf, timerDiscardFailureOf } from './timer-discard';

const MINUTE_MS = 60 * 1000;
const STARTED_AT = Date.parse('2026-11-16T09:25:00.000Z');
const OPEN_ORGANIZATION = { allowDiscardTimer: true, discardTimerWithinMinutes: null };

describe('timerDiscardAvailabilityOf', () => {
	const running = {
		organization: OPEN_ORGANIZATION,
		running: true,
		runningLogId: 'log-running' as string | undefined,
		source: TimerSource.MOBILE,
		startedAt: STARTED_AT,
		now: STARTED_AT + 2 * MINUTE_MS
	};

	it('offers Discard on a running timer the organization lets members discard', () => {
		expect(timerDiscardAvailabilityOf(running)).toEqual({ available: true, closesAt: null });
	});

	it('counts an organization that never set the switch as allowing it', () => {
		const organization = { allowDiscardTimer: null, discardTimerWithinMinutes: null };

		expect(timerDiscardAvailabilityOf({ ...running, organization })).toEqual({ available: true, closesAt: null });
	});

	it('offers nothing when no timer runs', () => {
		expect(timerDiscardAvailabilityOf({ ...running, running: false })).toEqual({
			available: false,
			reason: 'NOT_RUNNING'
		});
	});

	it('offers nothing when the organization turns discarding off', () => {
		const organization = { ...OPEN_ORGANIZATION, allowDiscardTimer: false };

		expect(timerDiscardAvailabilityOf({ ...running, organization })).toEqual({
			available: false,
			reason: 'DISABLED'
		});
	});

	it('offers Discard until the organization limit, then no more', () => {
		const organization = { ...OPEN_ORGANIZATION, discardTimerWithinMinutes: 5 };
		const closesAt = STARTED_AT + 5 * MINUTE_MS;

		expect(timerDiscardAvailabilityOf({ ...running, organization })).toEqual({ available: true, closesAt });
		expect(timerDiscardAvailabilityOf({ ...running, organization, now: closesAt })).toEqual({
			available: false,
			reason: 'TOO_LATE'
		});
	});

	it('offers nothing against an API without the discard: its organization carries no switch', () => {
		const organization = { allowModifyTime: true };

		expect(timerDiscardAvailabilityOf({ ...running, organization })).toEqual({
			available: false,
			reason: 'NOT_SUPPORTED'
		});
		expect(timerDiscardAvailabilityOf({ ...running, organization: null })).toEqual({
			available: false,
			reason: 'NOT_SUPPORTED'
		});
	});

	it('offers nothing for a run of the desktop app, which keeps its time itself', () => {
		expect(timerDiscardAvailabilityOf({ ...running, source: TimerSource.DESKTOP })).toEqual({
			available: false,
			reason: 'TRACKER_RUN'
		});
	});

	it('offers nothing while the status does not name the running run: a confirmation must name what it discards', () => {
		expect(timerDiscardAvailabilityOf({ ...running, runningLogId: undefined })).toEqual({
			available: false,
			reason: 'NOT_RUNNING'
		});
	});
});

describe('timerDiscardFailureOf', () => {
	it('reads each refusal of the API', () => {
		expect(timerDiscardFailureOf({ status: 400 })).toBe('NOT_RUNNING');
		expect(timerDiscardFailureOf({ status: 403, code: 'TIMER_DISCARD_DISABLED' })).toBe('DISABLED');
		expect(timerDiscardFailureOf({ status: 403, code: 'TIMER_DISCARD_TOO_LATE' })).toBe('TOO_LATE');
		expect(timerDiscardFailureOf({ status: 403 })).toBe('FORBIDDEN');
		expect(timerDiscardFailureOf({ status: 404 })).toBe('NOT_SUPPORTED');
		expect(timerDiscardFailureOf({ status: 409, code: 'TIMER_DISCARD_TRACKER_RUN' })).toBe('TRACKER_RUN');
		expect(timerDiscardFailureOf({ status: 409 })).toBe('CHANGED');
	});

	it('says the phone is offline when the request never reached the API', () => {
		expect(timerDiscardFailureOf({ status: null })).toBe('OFFLINE');
	});

	it('reads any other answer as a failure to try again', () => {
		expect(timerDiscardFailureOf({ status: 500 })).toBe('GENERIC');
	});
});

describe('discardSourceKeyOf', () => {
	it('names where a run started on another kind of device, since it stops there too', () => {
		expect(discardSourceKeyOf(TimerSource.BROWSER)).toBe('timer.discard.sources.web');
		expect(discardSourceKeyOf(TimerSource.TEAMS)).toBe('timer.discard.sources.web');
		expect(discardSourceKeyOf(TimerSource.BROWSER_EXTENSION)).toBe('timer.discard.sources.browserExtension');
		expect(discardSourceKeyOf('AGENT')).toBe('timer.discard.sources.other');
	});

	it('names nothing for a run started from the mobile app', () => {
		expect(discardSourceKeyOf(TimerSource.MOBILE)).toBeNull();
		expect(discardSourceKeyOf(undefined)).toBeNull();
	});
});
