import { periodOfPreset } from '@/core/lib/utils/dashboard-period';
import {
	clearLinkedFilters,
	dayOfKey,
	hasViewInLink,
	linkedFiltersOf,
	periodOfDays,
	periodOfLink,
	writeLinkedFilters,
	writePeriodToLink
} from './time-activity-link';

const MONDAY = 1;

describe('dayOfKey', () => {
	it('reads a real calendar day as a local date', () => {
		const day = dayOfKey('2026-10-31');
		expect(day?.getFullYear()).toBe(2026);
		expect(day?.getMonth()).toBe(9);
		expect(day?.getDate()).toBe(31);
	});

	it('refuses a day that does not exist or is not written YYYY-MM-DD', () => {
		expect(dayOfKey('2026-02-30')).toBeNull();
		expect(dayOfKey('2026-13-01')).toBeNull();
		expect(dayOfKey('31/10/2026')).toBeNull();
		expect(dayOfKey('')).toBeNull();
		expect(dayOfKey(null)).toBeNull();
	});
});

describe('periodOfDays', () => {
	it('spans the two days, both included', () => {
		const period = periodOfDays('2026-10-01', '2026-10-31');
		expect(period?.from).toEqual(new Date(2026, 9, 1, 0, 0, 0, 0));
		expect(period?.to).toEqual(new Date(2026, 9, 31, 23, 59, 59, 999));
	});

	it('refuses days in the wrong order', () => {
		expect(periodOfDays('2026-10-31', '2026-10-01')).toBeNull();
	});
});

describe('periodOfLink', () => {
	const now = new Date(2026, 10, 14, 15, 0, 0);

	it('evaluates a linked preset on the day the link is opened', () => {
		const params = new URLSearchParams('period=lastMonth');
		expect(periodOfLink(params, MONDAY, now)).toEqual(periodOfPreset('lastMonth', MONDAY, now));
	});

	it('reads fixed days', () => {
		const params = new URLSearchParams('from=2026-09-01&to=2026-09-15');
		expect(periodOfLink(params, MONDAY, now)).toEqual(periodOfDays('2026-09-01', '2026-09-15'));
	});

	it('names no period for an unknown preset or broken days', () => {
		expect(periodOfLink(new URLSearchParams('period=nextYear'), MONDAY, now)).toBeNull();
		expect(periodOfLink(new URLSearchParams('from=2026-09-01'), MONDAY, now)).toBeNull();
		expect(periodOfLink(new URLSearchParams(''), MONDAY, now)).toBeNull();
	});
});

describe('hasViewInLink', () => {
	it('is true only for a link that names a period', () => {
		expect(hasViewInLink(new URLSearchParams('period=today'), MONDAY)).toBe(true);
		expect(hasViewInLink(new URLSearchParams('from=2026-09-01&to=2026-09-02'), MONDAY)).toBe(true);
		expect(hasViewInLink(new URLSearchParams('groupBy=project&clients=none'), MONDAY)).toBe(false);
	});
});

describe('writePeriodToLink', () => {
	it('links a preset period by its name and drops fixed days', () => {
		const params = new URLSearchParams('from=2026-09-01&to=2026-09-15&groupBy=project');
		writePeriodToLink(params, periodOfPreset('last14Days', MONDAY), MONDAY);
		expect(params.get('period')).toBe('last14Days');
		expect(params.has('from')).toBe(false);
		expect(params.has('to')).toBe(false);
		expect(params.get('groupBy')).toBe('project');
	});

	it('links any other period by its two days and drops a preset', () => {
		const params = new URLSearchParams('period=today');
		const period = periodOfDays('2025-01-03', '2025-01-09');
		if (!period) throw new Error('period expected');
		writePeriodToLink(params, period, MONDAY);
		expect(params.has('period')).toBe(false);
		expect(params.get('from')).toBe('2025-01-03');
		expect(params.get('to')).toBe('2025-01-09');
	});
});

describe('linked filters', () => {
	it('writes each list and reads it back, leaving empty ones out', () => {
		const params = new URLSearchParams('clients=none');
		writeLinkedFilters(params, {
			teamIds: ['team-1'],
			employeeIds: ['member-1', 'member-2'],
			projectIds: [],
			taskIds: ['task-1']
		});
		expect(params.get('teams')).toBe('team-1');
		expect(params.get('members')).toBe('member-1,member-2');
		expect(params.has('projects')).toBe(false);
		expect(params.get('clients')).toBe('none');
		expect(linkedFiltersOf(params)).toEqual({
			teamIds: ['team-1'],
			employeeIds: ['member-1', 'member-2'],
			projectIds: [],
			taskIds: ['task-1']
		});
	});

	it('reads repeated and empty values once', () => {
		expect(linkedFiltersOf(new URLSearchParams('members=a,,a,b')).employeeIds).toEqual(['a', 'b']);
	});

	it('clears the four lists only', () => {
		const params = new URLSearchParams('teams=t&members=m&projects=p&tasks=k&clients=none&period=today');
		clearLinkedFilters(params);
		expect(params.toString()).toBe('clients=none&period=today');
	});
});
