import { describe, expect, it } from '@jest/globals';
import { ApiErrorService } from '@/core/services/client/api-error.service';
import { ETimeLogType } from '@/core/types/generics/enums/timer';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';
import {
	type AddTimeFacts,
	addTimeScopeOf,
	askedSecondsOf,
	claimedIntervalsOf,
	type DurationPhase,
	type FormPeriod,
	IDLE_PHASE,
	type IntervalRequest,
	intervalProposalOf,
	manualTimeRefusalKeyOf,
	minutesOfClockText,
	minutesOfDayOf,
	restingDurationTextOf,
	type ShownTimes,
	spanSecondsOf,
	standingPhaseOf,
	timeOptionOf,
	timeOptionsWith,
	typedDurationOf
} from './manual-time-entry';
import type { TimeWindow } from './timesheet-sheet-edit';

const HOUR = 3600;
const MINUTE = 60;
const NINETY_MINUTES = 90 * MINUTE;

function at(hours: number, minutes = 0) {
	return new Date(2026, 10, 10, hours, minutes);
}

function logOf(overrides: Partial<ITimeLog>): ITimeLog {
	return {
		id: 'log',
		duration: 0,
		version: '1',
		logType: ETimeLogType.TRACKED,
		employeeId: 'member',
		...overrides
	};
}

function requestOf(overrides: Partial<IntervalRequest>): IntervalRequest {
	return {
		seconds: NINETY_MINUTES,
		day: at(0),
		memberLogs: [],
		claimed: [],
		now: new Date(2026, 10, 12, 12),
		allowsFutureDates: false,
		...overrides
	};
}

function timesOf(startMinutes: number | null, endMinutes: number | null): ShownTimes {
	return { startMinutes, endMinutes };
}

function overlaps(first: TimeWindow, second: TimeWindow) {
	const startsBeforeEnd = first.start.getTime() < second.end.getTime();
	const endsAfterStart = first.end.getTime() > second.start.getTime();
	return startsBeforeEnd && endsAfterStart;
}

describe('typedDurationOf', () => {
	it.each(['1:30', '1.5', '90m', '1h 30m'])('reads %p as an hour and a half', (text) => {
		expect(typedDurationOf(text)).toEqual({ kind: 'duration', seconds: NINETY_MINUTES });
	});

	it.each(['', '  ', '0'])('reads %p as nothing asked', (text) => {
		expect(typedDurationOf(text)).toEqual({ kind: 'empty' });
	});

	it.each(['soon', '1:75', '25'])('refuses %p', (text) => {
		expect(typedDurationOf(text)).toEqual({ kind: 'invalid' });
	});
});

describe('intervalProposalOf', () => {
	it('proposes 09:00 on a day without entries', () => {
		const proposal = intervalProposalOf(requestOf({}));

		expect(proposal).toEqual({ status: 'ready', interval: { start: at(9), end: at(10, 30) } });
	});

	it('proposes one stretch that overlaps no entry of the day', () => {
		const morning = logOf({ id: 'morning', startedAt: at(9), stoppedAt: at(10, 30) });
		const call = logOf({ id: 'call', startedAt: at(11), stoppedAt: at(12) });
		const proposal = intervalProposalOf(requestOf({ memberLogs: [morning, call] }));

		expect(proposal).toEqual({ status: 'ready', interval: { start: at(12), end: at(13, 30) } });
		const interval = { start: at(12), end: at(13, 30) };
		expect(overlaps(interval, { start: at(9), end: at(10, 30) })).toBe(false);
		expect(overlaps(interval, { start: at(11), end: at(12) })).toBe(false);
	});

	it('keeps away from an entry that started the day before and from a running timer', () => {
		const night = logOf({ id: 'night', startedAt: new Date(2026, 10, 9, 22), stoppedAt: at(9, 20) });
		const running = logOf({ id: 'running', startedAt: at(10), isRunning: true });
		const proposal = intervalProposalOf(requestOf({ seconds: 30 * MINUTE, memberLogs: [night, running] }));

		expect(proposal).toEqual({ status: 'ready', interval: { start: at(9, 20), end: at(9, 50) } });
	});

	it('keeps away from the intervals the same form already holds on that day', () => {
		const sameDay = { start: at(9), end: at(10, 30) };
		const dayBefore = { start: new Date(2026, 10, 9, 9), end: new Date(2026, 10, 9, 18) };
		const dayAfter = { start: new Date(2026, 10, 11, 9), end: new Date(2026, 10, 11, 18) };
		const proposal = intervalProposalOf(requestOf({ claimed: [dayBefore, sameDay, dayAfter] }));

		expect(proposal).toEqual({ status: 'ready', interval: { start: at(10, 30), end: at(12) } });
	});

	it('ends by now on the current day when the organization refuses time in the future', () => {
		const proposal = intervalProposalOf(requestOf({ now: at(10) }));

		expect(proposal).toEqual({ status: 'ready', interval: { start: at(8, 30), end: at(10) } });
	});

	it('closes a day after today unless the organization allows time in the future', () => {
		const now = new Date(2026, 10, 9, 15);

		expect(intervalProposalOf(requestOf({ now }))).toEqual({ status: 'closedDay' });
		expect(intervalProposalOf(requestOf({ now, allowsFutureDates: true }))).toEqual({
			status: 'ready',
			interval: { start: at(9), end: at(10, 30) }
		});
	});

	it('says there is no room when no free stretch is long enough, even if the free time adds up', () => {
		const night = logOf({ id: 'night', startedAt: at(0), stoppedAt: at(9) });
		const day = logOf({ id: 'day', startedAt: at(10), stoppedAt: at(23) });

		expect(intervalProposalOf(requestOf({ memberLogs: [night, day] }))).toEqual({ status: 'noRoom' });
	});

	it('never ends after 23:59, since a form writes the end as a time of the same day', () => {
		const long = logOf({ id: 'long', startedAt: at(0), stoppedAt: at(22, 30) });
		const fitting = intervalProposalOf(requestOf({ seconds: 89 * MINUTE, memberLogs: [long] }));
		const tooLong = intervalProposalOf(requestOf({ seconds: NINETY_MINUTES, memberLogs: [long] }));

		expect(fitting).toEqual({ status: 'ready', interval: { start: at(22, 30), end: at(23, 59) } });
		expect(tooLong).toEqual({ status: 'noRoom' });
		expect(intervalProposalOf(requestOf({ seconds: 24 * HOUR }))).toEqual({ status: 'noRoom' });
	});
});

describe('times of a form', () => {
	it('reads a time field as minutes of the day', () => {
		expect(minutesOfClockText('09:30')).toBe(570);
		expect(minutesOfClockText('9:05')).toBe(545);
		expect(minutesOfClockText('')).toBeNull();
		expect(minutesOfDayOf(at(13, 45))).toBe(825);
	});

	it('counts the time from a start to a later end only', () => {
		const day = at(0);

		expect(spanSecondsOf(timesOf(540, 630), day)).toBe(NINETY_MINUTES);
		expect(spanSecondsOf(timesOf(null, 630), day)).toBeNull();
		expect(spanSecondsOf(timesOf(540, null), day)).toBeNull();
		expect(spanSecondsOf(timesOf(630, 540), day)).toBeNull();
		expect(spanSecondsOf(timesOf(540, 540), day)).toBeNull();
	});
});

describe('claimedIntervalsOf', () => {
	it('gives the intervals of the other periods that have a start and a later end', () => {
		const periods: FormPeriod[] = [
			{ day: at(0), times: timesOf(540, 630) },
			{ day: at(0), times: timesOf(660, 720) },
			{ day: at(0), times: timesOf(780, null) },
			{ day: null, times: timesOf(840, 900) }
		];

		expect(claimedIntervalsOf(periods, 0)).toEqual([{ start: at(11), end: at(12) }]);
		expect(claimedIntervalsOf(periods, 1)).toEqual([{ start: at(9), end: at(10, 30) }]);
	});
});

describe('phase of a typed duration', () => {
	const handPicked = timesOf(840, 900);
	const proposed: DurationPhase = {
		kind: 'proposed',
		seconds: NINETY_MINUTES,
		interval: { start: at(9), end: at(10, 30) }
	};
	const noTimes = timesOf(null, null);
	const noRoom: DurationPhase = { kind: 'noRoom', seconds: 8 * HOUR };
	const reading: DurationPhase = { kind: 'reading', seconds: NINETY_MINUTES };
	const noMember: DurationPhase = { kind: 'noMember', seconds: NINETY_MINUTES, shown: handPicked };
	const invalid: DurationPhase = { kind: 'invalid', text: 'soon', shown: handPicked };

	it('stands while the form shows the times the duration left it with', () => {
		expect(standingPhaseOf(proposed, timesOf(540, 630))).toBe(proposed);
		expect(standingPhaseOf(reading, noTimes)).toBe(reading);
		expect(standingPhaseOf(noRoom, noTimes)).toBe(noRoom);
		expect(standingPhaseOf(noMember, handPicked)).toBe(noMember);
		expect(standingPhaseOf(invalid, handPicked)).toBe(invalid);
		expect(standingPhaseOf(IDLE_PHASE, handPicked)).toBe(IDLE_PHASE);
	});

	it('ends as soon as the member changes the start or the end by hand', () => {
		expect(standingPhaseOf(proposed, timesOf(540, 660))).toBe(IDLE_PHASE);
		expect(standingPhaseOf(reading, timesOf(540, null))).toBe(IDLE_PHASE);
		expect(standingPhaseOf(noRoom, timesOf(540, null))).toBe(IDLE_PHASE);
		expect(standingPhaseOf(noMember, timesOf(840, 930))).toBe(IDLE_PHASE);
		expect(standingPhaseOf(invalid, timesOf(840, 930))).toBe(IDLE_PHASE);
	});

	it('still asks for its duration, except when nothing readable was typed', () => {
		expect(askedSecondsOf(proposed)).toBe(NINETY_MINUTES);
		expect(askedSecondsOf(noRoom)).toBe(8 * HOUR);
		expect(askedSecondsOf(noMember)).toBe(NINETY_MINUTES);
		expect(askedSecondsOf(invalid)).toBeNull();
		expect(askedSecondsOf(IDLE_PHASE)).toBeNull();
	});

	it('reads the refused text, the asked duration, or the time from start to end', () => {
		const day = at(0);

		expect(restingDurationTextOf(invalid, handPicked, day)).toBe('soon');
		expect(restingDurationTextOf(noRoom, noTimes, day)).toBe('8h 0m');
		expect(restingDurationTextOf(reading, noTimes, day)).toBe('1h 30m');
		expect(restingDurationTextOf(proposed, timesOf(540, 630), day)).toBe('1h 30m');
		expect(restingDurationTextOf(IDLE_PHASE, handPicked, day)).toBe('1h 0m');
		expect(restingDurationTextOf(IDLE_PHASE, noTimes, day)).toBe('');
	});
});

describe('time options of the time entry dialog', () => {
	function minutesOfOption(option: string) {
		const [clock, period] = option.split(' ');
		const [hours, minutes] = clock.split(':').map(Number);
		const hourOfPeriod = hours % 12;
		let total = hourOfPeriod * 60 + minutes;
		if (period === 'PM') {
			total += 720;
		}
		return total;
	}

	it('writes a time as the dialog lists them', () => {
		expect(timeOptionOf(at(9))).toBe('09:00:00 AM');
		expect(timeOptionOf(at(13, 30))).toBe('01:30:00 PM');
		expect(timeOptionOf(at(0, 5))).toBe('12:05:00 AM');
		expect(timeOptionOf(at(12))).toBe('12:00:00 PM');
	});

	it('adds a picked time the list lacks, in time order, once', () => {
		const options = ['09:00:00 AM', '09:05:00 AM', '01:00:00 PM'];
		const picked = ['09:02:00 AM', '12:58:00 PM', '09:02:00 AM', '09:05:00 AM', ''];

		expect(timeOptionsWith(options, picked, minutesOfOption)).toEqual([
			'09:00:00 AM',
			'09:02:00 AM',
			'09:05:00 AM',
			'12:58:00 PM',
			'01:00:00 PM'
		]);
		expect(timeOptionsWith(options, ['09:05:00 AM', ''], minutesOfOption)).toEqual(options);
	});
});

describe('addTimeScopeOf', () => {
	const teamManager: AddTimeFacts = {
		hasOrganizationRole: false,
		hasManualTimePermission: true,
		ownEmployeeId: 'employee-manager',
		allowsManualTime: true
	};
	const admin: AddTimeFacts = { ...teamManager, hasOrganizationRole: true };

	it('lets a team manager with the manual time permission add their own time only', () => {
		expect(addTimeScopeOf(teamManager)).toBe('own');
	});

	it('keeps adding time for anyone to the organization roles', () => {
		expect(addTimeScopeOf(admin)).toBe('anyone');
		expect(addTimeScopeOf({ ...admin, hasManualTimePermission: false })).toBe('anyone');
	});

	it('offers nothing to a member without the permission or without an employee', () => {
		expect(addTimeScopeOf({ ...teamManager, hasManualTimePermission: false })).toBe('none');
		expect(addTimeScopeOf({ ...teamManager, ownEmployeeId: null })).toBe('none');
	});

	it('hides the action for everyone once the organization turns manual time off', () => {
		expect(addTimeScopeOf({ ...teamManager, allowsManualTime: false })).toBe('none');
		expect(addTimeScopeOf({ ...admin, allowsManualTime: false })).toBe('none');
	});
});

describe('manualTimeRefusalKeyOf', () => {
	function requiredFieldRefusal(fields: string[]) {
		return new ApiErrorService('Bad request', 400, 'TRACKING_FIELD_REQUIRED', { fields });
	}

	it('names the field the organization requires and the entry misses', () => {
		expect(manualTimeRefusalKeyOf(requiredFieldRefusal(['projectId']))).toBe('manualTime.REQUIRED.PROJECT');
		expect(manualTimeRefusalKeyOf(requiredFieldRefusal(['organizationTeamId']))).toBe('manualTime.REQUIRED.TEAM');
		expect(manualTimeRefusalKeyOf(requiredFieldRefusal(['organizationTeamId', 'projectId']))).toBe(
			'manualTime.REQUIRED.TEAM_AND_PROJECT'
		);
	});

	it('gives every other failure the reason of its status', () => {
		expect(manualTimeRefusalKeyOf(requiredFieldRefusal([]))).toBe('toasts.REASONS.INVALID');
		expect(manualTimeRefusalKeyOf(new ApiErrorService('Forbidden', 403))).toBe('toasts.REASONS.PERMISSION');
		expect(manualTimeRefusalKeyOf(new Error('Network down'))).toBe('toasts.REASONS.UNKNOWN');
	});
});
