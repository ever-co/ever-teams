/** @jest-environment jsdom */
/**
 * What becomes of the time a web timer ran without a heartbeat (#5123).
 *
 * Up to the closed-tab delay that time was kept without a word: a tab reopened within ten minutes carried on, and a
 * tab that woke up after a sleep sent a heartbeat that put the whole sleep in the run. The person is now asked.
 */
import { ETimeLogSource } from '@/core/types/generics/enums/timer';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';
import {
	answerUnfollowedTime,
	askAboutUnfollowedTime,
	decideUnfollowedTime,
	dropUnfollowedTimeQuestion,
	forgetHeartbeat,
	rememberHeartbeat,
	rememberedHeartbeat,
	unfollowedTimeQuestion,
	type UnfollowedTimeQuestion
} from './unfollowed-time';

const MINUTE = 60_000;
const DELAY = 10 * MINUTE;
const FLOOR = 3 * MINUTE;
const STARTED_AT = Date.parse('2026-11-14T13:00:00.000Z');
const LAST_HEARTBEAT = Date.parse('2026-11-14T14:05:00.000Z');

/** A web timer's run whose last heartbeat the API has at 14:05. */
function runningLog(members: Partial<ITimeLog> = {}): ITimeLog {
	return {
		id: 'log-1',
		source: ETimeLogSource.TEAMS,
		isRunning: true,
		startedAt: new Date(STARTED_AT),
		stoppedAt: new Date(LAST_HEARTBEAT),
		...members
	} as ITimeLog;
}

/** The decision `minutes` after the last heartbeat, on the API's clock and on the computer's alike. */
const decideAfter = (minutes: number, facts: Partial<Parameters<typeof decideUnfollowedTime>[0]> = {}) =>
	decideUnfollowedTime({
		lastLog: runningLog(),
		now: LAST_HEARTBEAT + minutes * MINUTE,
		clientNow: LAST_HEARTBEAT + minutes * MINUTE,
		thresholdMs: DELAY,
		floorMs: FLOOR,
		...facts
	});

afterEach(() => {
	dropUnfollowedTimeQuestion();
	forgetHeartbeat();
	window.localStorage.clear();
	jest.useRealTimers();
});

describe('the time since a running web timer`s last heartbeat', () => {
	it.each([
		[1, 'follow'],
		[3, 'follow'],
		[4, 'ask'],
		[10, 'ask'],
		[11, 'stop'],
		[600, 'stop']
	])('after %i minutes: %s', (minutes, decision) => {
		expect(decideAfter(minutes)).toBe(decision);
	});

	it('is never asked about, nor cut, when the closed-tab rule is off', () => {
		expect(decideAfter(7, { thresholdMs: 0 })).toBe('follow');
		expect(decideAfter(600, { thresholdMs: 0 })).toBe('follow');
	});

	it('leaves nothing to ask about when the delay is set shorter than three minutes', () => {
		expect(decideAfter(1.5, { thresholdMs: 2 * MINUTE })).toBe('follow');
		expect(decideAfter(2.5, { thresholdMs: 2 * MINUTE })).toBe('stop');
	});

	it.each([
		['a run that is stopped', { isRunning: false }],
		['a run of the desktop app', { source: ETimeLogSource.DESKTOP }],
		['a run that has had no heartbeat yet', { stoppedAt: new Date(STARTED_AT) }],
		['a run without an end', { stoppedAt: undefined }]
	])('concerns only a web timer that runs and has had a heartbeat, not %s', (_case, members) => {
		expect(decideAfter(7, { lastLog: runningLog(members) })).toBe('follow');
		expect(decideAfter(600, { lastLog: runningLog(members) })).toBe('follow');
	});

	it('answers nothing for an employee without a log', () => {
		expect(decideAfter(7, { lastLog: null })).toBe('follow');
	});
});

describe('without the API`s clock, where the computer`s may run five minutes fast', () => {
	// What the closed-tab rule goes by then: the computer's clock less those five minutes
	const withoutApiClock = (minutes: number, facts: Partial<Parameters<typeof decideUnfollowedTime>[0]> = {}) =>
		decideAfter(minutes, { now: LAST_HEARTBEAT + (minutes - 5) * MINUTE, ...facts });
	const ownHeartbeat = { timeLogId: 'log-1', at: LAST_HEARTBEAT, stoppedAt: new Date(LAST_HEARTBEAT).toISOString() };

	it('counts the time from the heartbeat this browser sent, on the computer`s clock alone', () => {
		// Seven minutes: within the allowance of the rule, and plain for the browser that sent the last heartbeat
		expect(withoutApiClock(7)).toBe('follow');
		expect(withoutApiClock(7, { remembered: ownHeartbeat })).toBe('ask');
	});

	it('asks rather than cut within the minutes the closed-tab rule allows the clock', () => {
		expect(withoutApiClock(12, { remembered: ownHeartbeat })).toBe('ask');
		expect(withoutApiClock(16, { remembered: ownHeartbeat })).toBe('stop');
	});

	it('carries on with a run this browser followed a moment ago, however fast the clock runs', () => {
		// The computer's clock a quarter of an hour ahead of the API's: the rule alone would cut a live run
		const heartbeatSentAt = LAST_HEARTBEAT + 15 * MINUTE;
		const facts = {
			now: LAST_HEARTBEAT + 11 * MINUTE,
			clientNow: heartbeatSentAt + MINUTE,
			remembered: { ...ownHeartbeat, at: heartbeatSentAt }
		};

		expect(decideAfter(0, facts)).toBe('follow');
	});

	it('goes by the API`s heartbeat when another device sent a later one', () => {
		const earlier = { ...ownHeartbeat, stoppedAt: new Date(LAST_HEARTBEAT - 30 * MINUTE).toISOString() };

		expect(withoutApiClock(7, { remembered: earlier })).toBe('follow');
	});

	it('ignores the heartbeat of another run', () => {
		expect(withoutApiClock(7, { remembered: { ...ownHeartbeat, timeLogId: 'log-0' } })).toBe('follow');
	});
});

describe('the last heartbeat a browser remembers', () => {
	it('is the one the API has just taken for a running web timer', () => {
		rememberHeartbeat(runningLog(), LAST_HEARTBEAT + 200);

		expect(rememberedHeartbeat()).toEqual({
			timeLogId: 'log-1',
			at: LAST_HEARTBEAT + 200,
			stoppedAt: '2026-11-14T14:05:00.000Z'
		});
	});

	it('is kept as the API wrote the run`s end, a text', () => {
		rememberHeartbeat(runningLog({ stoppedAt: '2026-11-14T14:05:00.000Z' as unknown as Date }), LAST_HEARTBEAT);

		expect(rememberedHeartbeat()?.stoppedAt).toBe('2026-11-14T14:05:00.000Z');
	});

	it.each([
		['a stopped run', runningLog({ isRunning: false })],
		['a run of the desktop app', runningLog({ source: ETimeLogSource.DESKTOP })],
		['no run', null]
	])('is not replaced by %s', (_case, lastLog) => {
		rememberHeartbeat(runningLog(), LAST_HEARTBEAT);

		rememberHeartbeat(lastLog, LAST_HEARTBEAT + MINUTE);

		expect(rememberedHeartbeat()?.at).toBe(LAST_HEARTBEAT);
	});

	it.each(['', 'not json', '{}', '{"timeLogId":"log-1","at":"soon","stoppedAt":"2026-11-14T14:05:00.000Z"}'])(
		'reads nothing from %p',
		(stored) => {
			window.localStorage.setItem('ever-teams.timer.last-heartbeat', stored);

			expect(rememberedHeartbeat()).toBeNull();
		}
	);

	it('goes with the person who signs out', () => {
		rememberHeartbeat(runningLog(), LAST_HEARTBEAT);

		forgetHeartbeat();

		expect(rememberedHeartbeat()).toBeNull();
	});
});

describe('the question put to the person', () => {
	const asked: UnfollowedTimeQuestion = {
		employeeId: 'employee-1',
		timeLogId: 'log-1',
		from: '2026-11-14T14:05:00.000Z',
		until: LAST_HEARTBEAT + 7 * MINUTE
	};

	it.each(['keep', 'stop'] as const)('ends with their answer (%s), and leaves the screen', async (answer) => {
		const ended = askAboutUnfollowedTime(asked, 3 * MINUTE);
		expect(unfollowedTimeQuestion()).toEqual(asked);

		answerUnfollowedTime(answer);

		await expect(ended).resolves.toBe(answer);
		expect(unfollowedTimeQuestion()).toBeNull();
	});

	it('ends unanswered once the closed-tab delay is reached', async () => {
		jest.useFakeTimers();
		const ended = askAboutUnfollowedTime(asked, 3 * MINUTE);

		jest.advanceTimersByTime(3 * MINUTE - 1);
		expect(unfollowedTimeQuestion()).toEqual(asked);
		jest.advanceTimersByTime(1);

		await expect(ended).resolves.toBe('expired');
		expect(unfollowedTimeQuestion()).toBeNull();
	});

	it('goes when the person answers it in another tab, which acts on the answer', async () => {
		const ended = askAboutUnfollowedTime(asked, 3 * MINUTE);

		// What the other tab's answer writes to the storage the tabs share
		window.dispatchEvent(
			new StorageEvent('storage', {
				key: 'ever-teams.timer.unfollowed-time-answer',
				newValue: JSON.stringify({ timeLogId: 'log-1', at: Date.now() })
			})
		);

		await expect(ended).resolves.toBe('elsewhere');
		expect(unfollowedTimeQuestion()).toBeNull();
	});

	it('stays when another tab answers about another run', async () => {
		void askAboutUnfollowedTime(asked, 3 * MINUTE);

		window.dispatchEvent(
			new StorageEvent('storage', {
				key: 'ever-teams.timer.unfollowed-time-answer',
				newValue: JSON.stringify({ timeLogId: 'log-0', at: Date.now() })
			})
		);

		expect(unfollowedTimeQuestion()).toEqual(asked);
	});

	it('tells the other tabs of the browser that it was answered', () => {
		void askAboutUnfollowedTime(asked, 3 * MINUTE);

		answerUnfollowedTime('keep');

		expect(JSON.parse(String(window.localStorage.getItem('ever-teams.timer.unfollowed-time-answer')))).toEqual(
			expect.objectContaining({ timeLogId: 'log-1' })
		);
	});
});
