import { invoiceDayOf } from './invoices';
import { dayEdgeOffsetOf, sharedInvoiceDaysOf } from './shared-invoice-days';

const WEST = 'America/New_York';
const EAST = 'Asia/Tokyo';

/** Issued Nov 22 and due Dec 22 in Berlin, as the editor stores them: the first and the last instant of those days. */
const BERLIN = { invoiceDate: '2026-11-21T23:00:00.000Z', dueDate: '2026-12-22T22:59:59.999Z' };

/** The issue and due days the shared page shows for `invoice`, read by someone in `readerTimeZone`. */
function shownDays(invoice: Parameters<typeof sharedInvoiceDaysOf>[0], readerTimeZone: string, now = new Date()) {
	const days = sharedInvoiceDaysOf(invoice, now, readerTimeZone);
	return {
		issue: invoiceDayOf(days.invoice.invoiceDate, days.timeZone),
		due: invoiceDayOf(days.invoice.dueDate, days.timeZone),
		today: days.todayKey
	};
}

describe('sharedInvoiceDaysOf (#5718)', () => {
	it('reads the days the invoice was written for, west and east of the workspace', () => {
		// Read as they come, the dates move a day: New York sees it issued Nov 21, Tokyo sees it due Dec 23
		expect(invoiceDayOf(BERLIN.invoiceDate, WEST)).toBe('2026-11-21');
		expect(invoiceDayOf(BERLIN.dueDate, EAST)).toBe('2026-12-23');

		for (const reader of [WEST, 'Europe/Berlin', EAST]) {
			const { issue, due } = shownDays(BERLIN, reader);
			expect([reader, issue, due]).toEqual([reader, '2026-11-22', '2026-12-22']);
		}
	});

	it('reads the days of a workspace anywhere from UTC-10:00 to UTC+13:45', () => {
		const written: ReadonlyArray<[zone: string, invoiceDate: string, dueDate: string]> = [
			['America/New_York', '2026-11-22T05:00:00.000Z', '2026-12-23T04:59:59.999Z'],
			['Asia/Kolkata', '2026-11-21T18:30:00.000Z', '2026-12-22T18:29:59.999Z'],
			['Asia/Kathmandu', '2026-11-21T18:15:00.000Z', '2026-12-22T18:14:59.999Z'],
			['Pacific/Auckland', '2026-11-21T11:00:00.000Z', '2026-12-22T10:59:59.999Z'],
			['Pacific/Chatham', '2026-11-21T10:15:00.000Z', '2026-12-22T10:14:59.999Z'],
			['Pacific/Honolulu', '2026-11-22T10:00:00.000Z', '2026-12-23T09:59:59.999Z'],
			['Pacific/Marquesas', '2026-11-22T09:30:00.000Z', '2026-12-23T09:29:59.999Z'],
			['UTC', '2026-11-22T00:00:00.000Z', '2026-12-22T23:59:59.999Z']
		];
		for (const [zone, invoiceDate, dueDate] of written) {
			// Written in `zone`, as its own pages read it
			expect([zone, invoiceDayOf(invoiceDate, zone), invoiceDayOf(dueDate, zone)]).toEqual([
				zone,
				'2026-11-22',
				'2026-12-22'
			]);
			for (const reader of [WEST, EAST]) {
				const { issue, due } = shownDays({ invoiceDate, dueDate }, reader);
				expect([zone, reader, issue, due]).toEqual([zone, reader, '2026-11-22', '2026-12-22']);
			}
		}
	});

	it('reads a due date stored as the first instant of its day as that day', () => {
		const { due } = shownDays({ invoiceDate: BERLIN.invoiceDate, dueDate: '2026-12-21T23:00:00.000Z' }, WEST);
		expect(due).toBe('2026-12-22');
	});

	it('counts today where the invoice was written, for the due and overdue label', () => {
		// 00:30 on Dec 23 in Berlin, still Dec 22 in New York
		const now = new Date('2026-12-22T23:30:00.000Z');
		expect(shownDays(BERLIN, WEST, now).today).toBe('2026-12-23');
		expect(shownDays(BERLIN, EAST, now).today).toBe('2026-12-23');
	});

	it('counts today on the clock of the due day when the clocks changed after the issue day', () => {
		// Issued Oct 20 on Berlin summer time (UTC+2), due Nov 20 on Berlin winter time (UTC+1)
		const acrossClockChange = { invoiceDate: '2026-10-19T22:00:00.000Z', dueDate: '2026-11-20T22:59:59.999Z' };
		const lateOnDueDayInBerlin = new Date('2026-11-20T22:30:00.000Z');

		const { due, today } = shownDays(acrossClockChange, WEST, lateOnDueDayInBerlin);

		expect(due).toBe('2026-11-20');
		expect(today).toBe('2026-11-20');
	});

	it('reads in the zone the public read gives, when it gives one', () => {
		const invoice = { ...BERLIN, organization: { timeZone: 'Europe/Berlin' } };
		const days = sharedInvoiceDaysOf(invoice, new Date('2026-12-22T23:30:00.000Z'), WEST);
		expect(days.timeZone).toBe('Europe/Berlin');
		expect(days.invoice).toBe(invoice);
		expect(days.todayKey).toBe('2026-12-23');
	});

	it('ignores a zone the browser does not know, and reads the days as written', () => {
		const invoice = { ...BERLIN, fromOrganization: { timeZone: 'Mars/Olympus_Mons' } };
		expect(shownDays(invoice, WEST)).toEqual(expect.objectContaining({ issue: '2026-11-22', due: '2026-12-22' }));
	});

	it("reads a date that is no edge of a day in the reader's zone, as before", () => {
		const invoice = { invoiceDate: '2026-11-22T03:17:42.000Z', dueDate: '2026-12-22T03:17:42.000Z' };
		const west = sharedInvoiceDaysOf(invoice, new Date('2026-11-22T12:00:00.000Z'), WEST);
		expect(west.invoice).toBe(invoice);
		expect(west.timeZone).toBe(WEST);
		expect(invoiceDayOf(west.invoice.invoiceDate, west.timeZone)).toBe('2026-11-21');
		expect(shownDays(invoice, EAST).issue).toBe('2026-11-22');
	});

	it('keeps a missing date missing', () => {
		const days = sharedInvoiceDaysOf({ invoiceDate: BERLIN.invoiceDate, dueDate: null }, new Date(), WEST);
		expect(days.invoice.dueDate).toBeNull();
		expect(invoiceDayOf(days.invoice.invoiceDate, days.timeZone)).toBe('2026-11-22');
	});
});

describe('dayEdgeOffsetOf', () => {
	it('finds the offset that makes an instant the first or the last of a day', () => {
		expect(dayEdgeOffsetOf(new Date('2026-11-21T23:00:00.000Z'))).toBe(60);
		expect(dayEdgeOffsetOf(new Date('2026-12-22T22:59:59.999Z'))).toBe(60);
		expect(dayEdgeOffsetOf(new Date('2026-11-22T05:00:00.000Z'))).toBe(-300);
		expect(dayEdgeOffsetOf(new Date('2026-11-21T18:30:00.000Z'))).toBe(330);
	});

	it('keeps the likelier of two offsets a day apart', () => {
		// UTC+12 or UTC-12, UTC+13 or UTC-11, UTC+14 or UTC-10
		expect(dayEdgeOffsetOf(new Date('2026-11-21T12:00:00.000Z'))).toBe(720);
		expect(dayEdgeOffsetOf(new Date('2026-11-21T11:00:00.000Z'))).toBe(780);
		expect(dayEdgeOffsetOf(new Date('2026-11-22T10:00:00.000Z'))).toBe(-600);
	});

	it('finds none for an instant that is no edge of a day, or no instant', () => {
		expect(dayEdgeOffsetOf(new Date('2026-11-22T03:17:42.000Z'))).toBeNull();
		expect(dayEdgeOffsetOf(new Date('2026-11-22T14:23:00.000Z'))).toBeNull();
		expect(dayEdgeOffsetOf(new Date('not a date'))).toBeNull();
	});
});
