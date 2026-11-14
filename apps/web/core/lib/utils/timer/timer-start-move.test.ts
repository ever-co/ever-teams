import { ETimeLogSource } from '@/core/types/generics/enums/timer';
import {
	holdsTimerStartMovePermissions,
	startFromTimeText,
	timeTextOf,
	timerStartMoveAccessOf,
	timerStartMoveRefusalKeyOf,
	timerStartMoveSupportOf
} from './timer-start-move';

const OPEN_ORGANIZATION = { allowModifyTime: true, allowManualTime: true, requireReason: false };
const EDITOR = ['TIME_TRACKER', 'ALLOW_MODIFY_TIME', 'ALLOW_MANUAL_TIME'];

describe('timerStartMoveAccessOf', () => {
	it('offers the field to a role and an organization that allow changing and adding time', () => {
		const access = timerStartMoveAccessOf({
			source: ETimeLogSource.TEAMS,
			support: 'supported',
			permissions: EDITOR,
			organization: OPEN_ORGANIZATION
		});

		expect(access).toEqual({ kind: 'edit', earlierAllowed: true, reasonRequired: false });
	});

	it('offers only a later start where the organization does not allow time added by hand', () => {
		const access = timerStartMoveAccessOf({
			source: ETimeLogSource.TEAMS,
			support: 'supported',
			permissions: EDITOR,
			organization: { ...OPEN_ORGANIZATION, allowManualTime: false }
		});

		expect(access).toEqual({ kind: 'edit', earlierAllowed: false, reasonRequired: false });
	});

	it('offers only a later start to a role without the manual time permission', () => {
		const access = timerStartMoveAccessOf({
			source: ETimeLogSource.TEAMS,
			support: 'supported',
			permissions: ['TIME_TRACKER', 'ALLOW_MODIFY_TIME'],
			organization: OPEN_ORGANIZATION
		});

		expect(access).toEqual({ kind: 'edit', earlierAllowed: false, reasonRequired: false });
	});

	it('asks for a reason where the organization requires one', () => {
		const access = timerStartMoveAccessOf({
			source: ETimeLogSource.TEAMS,
			support: 'supported',
			permissions: EDITOR,
			organization: { ...OPEN_ORGANIZATION, requireReason: true }
		});

		expect(access).toEqual({ kind: 'edit', earlierAllowed: true, reasonRequired: true });
	});

	it('shows the start without the field where the organization does not let tracked time change', () => {
		const access = timerStartMoveAccessOf({
			source: ETimeLogSource.TEAMS,
			support: 'supported',
			permissions: EDITOR,
			organization: { ...OPEN_ORGANIZATION, allowModifyTime: false }
		});

		expect(access).toEqual({ kind: 'view', why: 'not-allowed' });
	});

	it('reads an organization that never set the switch as not allowing it, as the API does', () => {
		const access = timerStartMoveAccessOf({
			source: ETimeLogSource.TEAMS,
			support: 'supported',
			permissions: EDITOR,
			organization: {}
		});

		expect(access).toEqual({ kind: 'view', why: 'not-allowed' });
	});

	it('shows the start without the field to a role that may not change tracked time', () => {
		const access = timerStartMoveAccessOf({
			source: ETimeLogSource.TEAMS,
			support: 'supported',
			permissions: ['TIME_TRACKER', 'ALLOW_MANUAL_TIME'],
			organization: OPEN_ORGANIZATION
		});

		expect(access).toEqual({ kind: 'view', why: 'not-allowed' });
	});

	it('sends a run of the desktop app back to that app, whatever the rules', () => {
		const access = timerStartMoveAccessOf({
			source: ETimeLogSource.DESKTOP,
			support: 'supported',
			permissions: EDITOR,
			organization: OPEN_ORGANIZATION
		});

		expect(access).toEqual({ kind: 'view', why: 'tracker' });
	});

	it('shows the start without the field against an API that cannot move it', () => {
		const access = timerStartMoveAccessOf({
			source: ETimeLogSource.TEAMS,
			support: 'unsupported',
			permissions: EDITOR,
			organization: OPEN_ORGANIZATION
		});

		expect(access).toEqual({ kind: 'view', why: 'unsupported' });
	});

	it('waits for the API check before it offers the field', () => {
		const access = timerStartMoveAccessOf({
			source: ETimeLogSource.TEAMS,
			support: 'checking',
			permissions: EDITOR,
			organization: OPEN_ORGANIZATION
		});

		expect(access).toEqual({ kind: 'view', why: 'checking' });
	});
});

describe('timerStartMoveSupportOf', () => {
	it('reads a refused empty body as an API that has the route', () => {
		expect(timerStartMoveSupportOf(400)).toBe('supported');
	});

	it('reads a missing route as an API that cannot move the start', () => {
		expect(timerStartMoveSupportOf(404)).toBe('unsupported');
	});

	it('leaves any other answer to the save, which says what went wrong', () => {
		expect(timerStartMoveSupportOf(403)).toBe('supported');
		expect(timerStartMoveSupportOf(502)).toBe('supported');
		expect(timerStartMoveSupportOf(undefined)).toBe('supported');
	});
});

describe('timerStartMoveRefusalKeyOf', () => {
	it('names the reason of each refusal the API gives', () => {
		expect(timerStartMoveRefusalKeyOf({ statusCode: 409, errorCode: 'TIMER_START_OVERLAP' })).toBe(
			'timer.startMove.OVERLAP'
		);
		expect(timerStartMoveRefusalKeyOf({ statusCode: 400, errorCode: 'TIMER_START_IN_FUTURE' })).toBe(
			'timer.startMove.IN_FUTURE'
		);
		expect(timerStartMoveRefusalKeyOf({ statusCode: 403, errorCode: 'TIMER_START_MANUAL_NOT_ALLOWED' })).toBe(
			'timer.startMove.MANUAL_NOT_ALLOWED'
		);
		expect(timerStartMoveRefusalKeyOf({ statusCode: 403, errorCode: 'TIMER_START_EDIT_NOT_ALLOWED' })).toBe(
			'timer.startMove.EDIT_NOT_ALLOWED'
		);
		expect(timerStartMoveRefusalKeyOf({ statusCode: 400, errorCode: 'TIMER_START_REASON_REQUIRED' })).toBe(
			'timer.startMove.REASON_REQUIRED'
		);
		expect(timerStartMoveRefusalKeyOf({ statusCode: 409, errorCode: 'TIMER_START_TRACKER_RUN' })).toBe(
			'timer.startMove.TRACKER_RUN'
		);
		expect(timerStartMoveRefusalKeyOf({ statusCode: 400, errorCode: 'TIMER_NOT_RUNNING' })).toBe(
			'timer.startMove.NOT_RUNNING'
		);
	});

	it('names a missing route, and says the save failed for anything else', () => {
		expect(timerStartMoveRefusalKeyOf({ statusCode: 404 })).toBe('timer.startMove.UNSUPPORTED');
		expect(timerStartMoveRefusalKeyOf({ statusCode: 500, errorCode: 'SOMETHING' })).toBe(
			'timer.startMove.SAVE_FAILED'
		);
		expect(timerStartMoveRefusalKeyOf(new Error('Network Error'))).toBe('timer.startMove.SAVE_FAILED');
		expect(timerStartMoveRefusalKeyOf(undefined)).toBe('timer.startMove.SAVE_FAILED');
	});
});

describe('startFromTimeText', () => {
	it('places the time on the day the run started, in local time', () => {
		const runStart = new Date(2026, 10, 16, 9, 25, 12);

		const start = startFromTimeText(runStart, '09:00');

		expect(start).toEqual(new Date(2026, 10, 16, 9, 0, 0, 0));
	});

	it('refuses a time that is not one', () => {
		const runStart = new Date(2026, 10, 16, 9, 25, 12);

		expect(startFromTimeText(runStart, '')).toBeNull();
		expect(startFromTimeText(runStart, '25:00')).toBeNull();
		expect(startFromTimeText(runStart, '9h')).toBeNull();
	});
});

describe('timeTextOf', () => {
	it('writes a time the way a time field reads it', () => {
		expect(timeTextOf(new Date(2026, 10, 16, 9, 5, 40))).toBe('09:05');
		expect(timeTextOf(new Date(2026, 10, 16, 14, 30, 0))).toBe('14:30');
	});
});

describe('holdsTimerStartMovePermissions', () => {
	it('lets a role through that runs the timer and may change tracked time', () => {
		expect(holdsTimerStartMovePermissions(['TIME_TRACKER', 'ALLOW_MODIFY_TIME'])).toBe(true);
	});

	it('refuses a role that lacks either permission', () => {
		expect(holdsTimerStartMovePermissions(['TIME_TRACKER'])).toBe(false);
		expect(holdsTimerStartMovePermissions(['ALLOW_MODIFY_TIME'])).toBe(false);
		expect(holdsTimerStartMovePermissions([])).toBe(false);
	});
});
