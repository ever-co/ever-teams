import {
	changedScheduleFieldsOf,
	compareSchedulesByNextRun,
	defaultInvoiceScheduleInput,
	explainedReasonOf,
	firstDayOfMonthOf,
	invoiceScheduleRunToneOf,
	isPausedSchedule,
	isRealDayKey,
	leftOutHoursOf
} from './invoice-schedules';
import type { TInvoiceSchedule } from '@/core/types/schemas/organization/invoice-schedule.schema';

function schedule(name: string, runDay: string | null, pausedAt: string | null = null): TInvoiceSchedule {
	return {
		id: name,
		organizationContactId: `client-${name}`,
		organizationContact: { id: `client-${name}`, name },
		frequency: 'MONTHLY',
		startDay: '2026-10-01',
		grouping: 'PROJECT',
		sendInvoice: false,
		pausedAt,
		activeSince: '2026-10-01T00:00:00Z',
		nextPeriod: runDay ? { startDay: '2026-11-01', endDay: '2026-11-30', runDay } : null
	};
}

describe('invoice schedules', () => {
	it('starts a new schedule monthly from the first day of this month, by project, as a draft', () => {
		expect(firstDayOfMonthOf('2026-11-15')).toBe('2026-11-01');
		expect(defaultInvoiceScheduleInput('2026-11-15')).toEqual({
			frequency: 'MONTHLY',
			startDay: '2026-11-01',
			grouping: 'PROJECT',
			sendInvoice: false
		});
	});

	it('tells a day that exists from one that does not', () => {
		expect(isRealDayKey('2028-02-29')).toBe(true);
		expect(isRealDayKey('2026-02-29')).toBe(false);
		expect(isRealDayKey('')).toBe(false);
	});

	it('sends only the fields the form changed', () => {
		const saved = {
			frequency: 'MONTHLY',
			startDay: '2026-10-01',
			grouping: 'PROJECT',
			sendInvoice: false
		} as const;

		expect(changedScheduleFieldsOf(saved, { ...saved })).toEqual({});
		expect(changedScheduleFieldsOf(saved, { ...saved, grouping: 'TASK', sendInvoice: true })).toEqual({
			grouping: 'TASK',
			sendInvoice: true
		});
	});

	it('reads a run: its tone, the hours it left out, and the reason a line explains', () => {
		expect(invoiceScheduleRunToneOf('SENT')).toBe('success');
		expect(invoiceScheduleRunToneOf('FAILED')).toBe('danger');
		expect(invoiceScheduleRunToneOf('NOT_SENT')).toBe('warning');
		expect(leftOutHoursOf({ leftOutSeconds: 5400 })).toBe(1.5);
		expect(leftOutHoursOf({ leftOutSeconds: null })).toBe(0);
		expect(explainedReasonOf({ reason: 'CLIENT_HAS_NO_EMAIL' })).toBe('CLIENT_HAS_NO_EMAIL');
		// The time left out is told by its hours, not by a sentence of its own
		expect(explainedReasonOf({ reason: 'TIME_LEFT_OUT' })).toBeNull();
		expect(explainedReasonOf({ reason: null })).toBeNull();
	});

	it('lists the schedules by their next invoice, the soonest first, the paused ones last', () => {
		const paused = schedule('Paused', null, '2026-11-02T00:00:00Z');
		const later = schedule('Later', '2026-12-01');
		const sooner = schedule('Sooner', '2026-11-16');

		expect(isPausedSchedule(paused)).toBe(true);
		expect([paused, later, sooner].sort(compareSchedulesByNextRun).map(({ id }) => id)).toEqual([
			'Sooner',
			'Later',
			'Paused'
		]);
	});
});
