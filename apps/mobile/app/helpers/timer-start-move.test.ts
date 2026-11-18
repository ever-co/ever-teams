/**
 * The rules of the running time's panel: what it offers, how it reads the time typed, and why a move is refused.
 * They are the web's (ever-co/ever-teams#5266) and the API's (ever-co/ever-gauzy#11941).
 */
import { TimerSource } from '../services/interfaces/ITimer';
import {
	daysOfRun,
	isSameStartMinute,
	localStartMoveRefusalKeyOf,
	startOnDay,
	timeTextOf,
	timeTextFromTyping,
	timerStartMoveAccessOf,
	timerStartMoveRefusalKeyOf,
	timerStartMoveSupportOf
} from './timer-start-move';

const OPEN_ORGANIZATION = { allowModifyTime: true, allowManualTime: true, requireReason: false };
const EDITOR = ['TIME_TRACKER', 'ALLOW_MODIFY_TIME', 'ALLOW_MANUAL_TIME'];

/** A moment of 16 November 2026, in the phone's own time zone. */
const at = (hours: number, minutes: number, day = 16) => new Date(2026, 10, day, hours, minutes);

describe('timerStartMoveAccessOf', () => {
	it('offers the field to a role and an organization that allow changing and adding time', () => {
		const access = timerStartMoveAccessOf({
			source: TimerSource.MOBILE,
			support: 'supported',
			permissions: EDITOR,
			organization: OPEN_ORGANIZATION
		});

		expect(access).toEqual({ kind: 'edit', earlierAllowed: true, reasonRequired: false });
	});

	it('offers only a later start where the organization does not allow time added by hand', () => {
		const access = timerStartMoveAccessOf({
			source: TimerSource.MOBILE,
			support: 'supported',
			permissions: EDITOR,
			organization: { ...OPEN_ORGANIZATION, allowManualTime: false }
		});

		expect(access).toEqual({ kind: 'edit', earlierAllowed: false, reasonRequired: false });
	});

	it('offers only a later start to a role without the manual time permission', () => {
		const access = timerStartMoveAccessOf({
			source: TimerSource.MOBILE,
			support: 'supported',
			permissions: ['TIME_TRACKER', 'ALLOW_MODIFY_TIME'],
			organization: OPEN_ORGANIZATION
		});

		expect(access).toEqual({ kind: 'edit', earlierAllowed: false, reasonRequired: false });
	});

	it('asks for a reason where the organization requires one', () => {
		const access = timerStartMoveAccessOf({
			source: TimerSource.MOBILE,
			support: 'supported',
			permissions: EDITOR,
			organization: { ...OPEN_ORGANIZATION, requireReason: true }
		});

		expect(access).toEqual({ kind: 'edit', earlierAllowed: true, reasonRequired: true });
	});

	it('shows the start alone, saying why, where members may not change tracked time', () => {
		const organizationRefuses = timerStartMoveAccessOf({
			source: TimerSource.MOBILE,
			support: 'supported',
			permissions: EDITOR,
			organization: { ...OPEN_ORGANIZATION, allowModifyTime: false }
		});
		const roleRefuses = timerStartMoveAccessOf({
			source: TimerSource.MOBILE,
			support: 'supported',
			permissions: ['TIME_TRACKER'],
			organization: OPEN_ORGANIZATION
		});

		expect(organizationRefuses).toEqual({ kind: 'view', why: 'not-allowed' });
		expect(roleRefuses).toEqual({ kind: 'view', why: 'not-allowed' });
	});

	it('shows the start alone for a run of the desktop app, which records its own time', () => {
		const access = timerStartMoveAccessOf({
			source: TimerSource.DESKTOP,
			support: 'supported',
			permissions: EDITOR,
			organization: OPEN_ORGANIZATION
		});

		expect(access).toEqual({ kind: 'view', why: 'tracker' });
	});

	it('shows the start alone against an API without the route, and while that is being checked', () => {
		const input = { source: TimerSource.MOBILE, permissions: EDITOR, organization: OPEN_ORGANIZATION };

		expect(timerStartMoveAccessOf({ ...input, support: 'unsupported' })).toEqual({
			kind: 'view',
			why: 'unsupported'
		});
		expect(timerStartMoveAccessOf({ ...input, support: 'checking' })).toEqual({ kind: 'view', why: 'checking' });
	});

	it('shows the start alone while the organization is not read: its switches decide', () => {
		const access = timerStartMoveAccessOf({
			source: TimerSource.MOBILE,
			support: 'supported',
			permissions: EDITOR,
			organization: null
		});

		expect(access).toEqual({ kind: 'view', why: 'not-allowed' });
	});
});

describe('timerStartMoveSupportOf', () => {
	it('reads a missing route as an API without the move, and any other answer as one with it', () => {
		expect(timerStartMoveSupportOf(404)).toBe('unsupported');
		expect(timerStartMoveSupportOf(400)).toBe('supported');
		expect(timerStartMoveSupportOf(403)).toBe('supported');
	});
});

describe('timerStartMoveRefusalKeyOf', () => {
	it('names the rule the API refused the move with', () => {
		expect(timerStartMoveRefusalKeyOf({ status: 409, code: 'TIMER_START_OVERLAP' })).toBe(
			'timer.startMove.overlap'
		);
		expect(timerStartMoveRefusalKeyOf({ status: 400, code: 'TIMER_START_IN_FUTURE' })).toBe(
			'timer.startMove.inFuture'
		);
		expect(timerStartMoveRefusalKeyOf({ status: 403, code: 'TIMER_START_MANUAL_NOT_ALLOWED' })).toBe(
			'timer.startMove.manualNotAllowed'
		);
		expect(timerStartMoveRefusalKeyOf({ status: 400, code: 'TIMER_START_REASON_REQUIRED' })).toBe(
			'timer.startMove.reasonRequired'
		);
		expect(timerStartMoveRefusalKeyOf({ status: 409, code: 'TIMER_START_TRACKER_RUN' })).toBe(
			'timer.startMove.trackerRun'
		);
	});

	it('says the server cannot move a start yet when the route is missing', () => {
		expect(timerStartMoveRefusalKeyOf({ status: 404 })).toBe('timer.startMove.unsupported');
	});

	it('says the phone is offline when the request never reached the API', () => {
		expect(timerStartMoveRefusalKeyOf({ status: null })).toBe('timer.startMove.offline');
	});

	it('says the save failed for any other answer', () => {
		expect(timerStartMoveRefusalKeyOf({ status: 500 })).toBe('timer.startMove.saveFailed');
		expect(timerStartMoveRefusalKeyOf({ status: 400, code: 'SOMETHING_ELSE' })).toBe('timer.startMove.saveFailed');
	});
});

describe('timeTextOf', () => {
	it('writes a time as the field shows it', () => {
		expect(timeTextOf(at(9, 5))).toBe('09:05');
		expect(timeTextOf(at(23, 40))).toBe('23:40');
	});
});

describe('timeTextFromTyping', () => {
	it('places the colon before the last two digits', () => {
		expect(timeTextFromTyping('905')).toBe('9:05');
		expect(timeTextFromTyping('0905')).toBe('09:05');
	});

	it('keeps a time typed with its colon', () => {
		expect(timeTextFromTyping('09:05')).toBe('09:05');
	});

	it('keeps a time whose last digit is being changed as it is, never as another time', () => {
		expect(timeTextFromTyping('12:3')).toBe('12:3');
		expect(timeTextFromTyping('1:234')).toBe('1:234');
	});

	it('keeps one or two digits as they are, until the minutes come', () => {
		expect(timeTextFromTyping('9')).toBe('9');
		expect(timeTextFromTyping('09')).toBe('09');
	});

	it('drops what is not a digit, and the digits past four', () => {
		expect(timeTextFromTyping('9h05')).toBe('9:05');
		expect(timeTextFromTyping('091530')).toBe('09:15');
	});
});

describe('isSameStartMinute', () => {
	it('reads the minute the run started as no change, its seconds left aside', () => {
		const runStart = new Date(2026, 10, 16, 9, 25, 42);

		expect(isSameStartMinute(at(9, 25), runStart)).toBe(true);
		expect(isSameStartMinute(at(9, 24), runStart)).toBe(false);
	});
});

describe('daysOfRun', () => {
	it('gives the one day of a run that started today: no day to choose', () => {
		expect(daysOfRun(at(9, 25), at(9, 30))).toEqual([at(0, 0)]);
	});

	it('gives each day of a run that started before midnight, for the person to choose the day of the new start', () => {
		expect(daysOfRun(at(23, 50, 15), at(0, 20, 16))).toEqual([at(0, 0, 15), at(0, 0, 16)]);
	});
});

describe('startOnDay', () => {
	it('reads the time on the day of the run', () => {
		expect(startOnDay(at(0, 0), '09:00')).toEqual(at(9, 0));
		expect(startOnDay(at(0, 0), '9:05')).toEqual(at(9, 5));
	});

	it('reads the time on the day the person chose, whichever day is nearer the start', () => {
		// Started at 23:50 on the 15th, now 00:20 on the 16th: 12:00 means the day chosen, never a guess
		expect(startOnDay(at(0, 0, 15), '12:00')).toEqual(at(12, 0, 15));
		expect(startOnDay(at(0, 0, 16), '12:00')).toEqual(at(12, 0, 16));
	});

	it('reads nothing for a time the clocks skip that day, rather than a start an hour later than typed', () => {
		// Where clocks go forward from 02:00 to 03:00, 02:30 does not exist that day: the phone's date lands on 03:30
		const datePrototype = Object.getPrototypeOf(at(0, 0)) as Date;
		const setHours = datePrototype.setHours;
		function setHoursSkippingTwoOClock(this: Date, hours: number, minutes = 0, seconds = 0, ms = 0): number {
			const skipped = hours === 2;
			return setHours.call(this, skipped ? 3 : hours, minutes, seconds, ms);
		}
		const clocksSkipTwoOClock = jest.spyOn(datePrototype, 'setHours').mockImplementation(setHoursSkippingTwoOClock);
		try {
			expect(startOnDay(at(0, 0), '02:30')).toBeNull();
			expect(startOnDay(at(0, 0), '09:05')).toEqual(at(9, 5));
		} finally {
			clocksSkipTwoOClock.mockRestore();
		}
	});

	it('reads nothing that is not a time', () => {
		expect(startOnDay(at(0, 0), '')).toBeNull();
		expect(startOnDay(at(0, 0), '9')).toBeNull();
		expect(startOnDay(at(0, 0), '24:00')).toBeNull();
		expect(startOnDay(at(0, 0), '09:60')).toBeNull();
	});
});

describe('localStartMoveRefusalKeyOf', () => {
	const check = {
		start: at(9, 0),
		runStart: at(9, 25),
		now: at(9, 30),
		earlierAllowed: true,
		reasonRequired: false,
		reason: ''
	};

	it('lets a move the panel can tell nothing against go to the API', () => {
		expect(localStartMoveRefusalKeyOf(check)).toBeNull();
	});

	it('refuses a start later than now', () => {
		expect(localStartMoveRefusalKeyOf({ ...check, start: at(9, 45) })).toBe('timer.startMove.inFuture');
	});

	it('refuses an earlier start where time may not be added by hand, and lets a later one go', () => {
		expect(localStartMoveRefusalKeyOf({ ...check, earlierAllowed: false })).toBe(
			'timer.startMove.manualNotAllowed'
		);
		expect(localStartMoveRefusalKeyOf({ ...check, earlierAllowed: false, start: at(9, 28) })).toBeNull();
	});

	it('asks for the reason the organization requires', () => {
		expect(localStartMoveRefusalKeyOf({ ...check, reasonRequired: true, reason: '  ' })).toBe(
			'timer.startMove.reasonRequired'
		);
		expect(localStartMoveRefusalKeyOf({ ...check, reasonRequired: true, reason: 'Came in at 9' })).toBeNull();
	});
});
