import { ApiErrorService } from '@/core/services/client/api-error.service';
import {
	invoicesRecordingTimeOf,
	isTimeBilledElsewhere,
	logsStartedWithin,
	offeredLogsOf,
	overlapNoticeOf,
	overlapsAtRiskOf,
	recordingReadDaysOf,
	recordsBilledTimeOf,
	timeLogIdsByLineOf,
	type OverlapFacts
} from './invoice-billed-time';

function answered(status: number, message: string) {
	return ApiErrorService.fromAxiosError({
		message: `Request failed with status code ${status}`,
		status,
		response: {
			data: { statusCode: status, message, error: 'Bad Request' },
			headers: {},
			status,
			statusText: 'Error'
		}
	});
}

const BILLED_ELSEWHERE =
	'INVOICE_TIME_LOG_NOT_BILLABLE: a line names a time log it cannot bill. Nothing was saved: read the time not invoiced yet (notInvoiced=true) and save again.';

describe('a save refused because its time is billed elsewhere', () => {
	it('is the API’s 400 naming the time log it cannot bill', () => {
		expect(isTimeBilledElsewhere(answered(400, BILLED_ELSEWHERE))).toBe(true);
	});

	it('is not another refusal, a failure of the server or of the network', () => {
		const unanswered = ApiErrorService.fromAxiosError({ code: 'ERR_NETWORK', message: 'ERR_NETWORK' });

		expect(isTimeBilledElsewhere(answered(400, 'invoiceNumber must be unique'))).toBe(false);
		expect(isTimeBilledElsewhere(answered(500, BILLED_ELSEWHERE))).toBe(false);
		expect(isTimeBilledElsewhere(unanswered)).toBe(false);
		expect(isTimeBilledElsewhere(new Error(BILLED_ELSEWHERE))).toBe(false);
	});
});

describe('whether the API records the time each invoice line bills', () => {
	it('does when every time log states the line that bills it, none included', () => {
		const logs = [
			{ id: 'log-1', invoiceItemId: 'line-1' },
			{ id: 'log-2', invoiceItemId: null }
		];

		expect(recordsBilledTimeOf(logs)).toBe(true);
	});

	it('does not when the time logs come without that field, as from an older API', () => {
		expect(recordsBilledTimeOf([{ id: 'log-1' }, { id: 'log-2' }])).toBe(false);
	});

	it('is not known before a time log was read', () => {
		expect(recordsBilledTimeOf([])).toBeNull();
	});
});

describe('the time saved lines bill', () => {
	const logs = [
		{ id: 'log-1', invoiceItemId: 'line-1' },
		{ id: 'log-2', invoiceItemId: 'line-1' },
		{ id: 'log-3', invoiceItemId: 'line-2' },
		{ id: 'log-4', invoiceItemId: 'line-of-another-invoice' },
		{ id: 'log-5', invoiceItemId: null }
	];

	it('is, for each line, the time logs that name it', () => {
		const byLine = timeLogIdsByLineOf(logs, new Set(['line-1', 'line-2']));

		expect([...byLine.entries()]).toEqual([
			['line-1', ['log-1', 'log-2']],
			['line-2', ['log-3']]
		]);
	});

	it('is offered again beside the free time, each time log once', () => {
		const freeLogs = [
			{ id: 'log-5', invoiceItemId: null },
			{ id: 'log-6', invoiceItemId: 'line-of-a-void-invoice' }
		];

		const offered = offeredLogsOf(freeLogs, [...logs, ...freeLogs], new Set(['line-1', 'line-2']));

		expect(offered.map((log) => log.id)).toEqual(['log-5', 'log-6', 'log-1', 'log-2', 'log-3']);
	});

	it('adds nothing to the free time of an invoice that has no saved lines', () => {
		const freeLogs = [{ id: 'log-5', invoiceItemId: null }];

		const offered = offeredLogsOf(freeLogs, logs, new Set());

		expect(offered.map((log) => log.id)).toEqual(['log-5']);
	});
});

describe('the earlier invoices that record the time they bill', () => {
	const logs = [
		{ id: 'log-1', invoiceItemId: 'a-line-1' },
		{ id: 'log-2', invoiceItemId: 'a-line-2' },
		{ id: 'log-3', invoiceItemId: 'b-line-1' },
		{ id: 'log-4', invoiceItemId: null }
	];

	it('are those whose every line a time log names', () => {
		const invoices = [
			{ invoiceId: 'invoice-a', lineIds: ['a-line-1', 'a-line-2'] },
			{ invoiceId: 'invoice-b', lineIds: ['b-line-1', 'b-line-2'] },
			{ invoiceId: 'invoice-c', lineIds: ['c-line-1'] }
		];

		expect([...invoicesRecordingTimeOf(invoices, logs)]).toEqual(['invoice-a']);
	});

	it('include an invoice without lines: it bills no time', () => {
		expect([...invoicesRecordingTimeOf([{ invoiceId: 'invoice-empty', lineIds: [] }], logs)]).toEqual([
			'invoice-empty'
		]);
	});
});

describe('the warning about earlier invoices of the same period', () => {
	const settled = { recordedIds: new Set<string>(), isLoading: false, isError: false };

	function factsOf(extra: Partial<OverlapFacts>): OverlapFacts {
		return { overlappingIds: ['invoice-a', 'invoice-b'], recordsBilledTime: true, recording: settled, ...extra };
	}

	it('stays a warning about every overlapping invoice when the API does not record billed time', () => {
		const facts = factsOf({ recordsBilledTime: false });

		expect(overlapNoticeOf(facts)).toEqual({ kind: 'mayBillTwice', count: 2, isUnrecorded: false });
		expect(overlapsAtRiskOf(facts)).toEqual(['invoice-a', 'invoice-b']);
	});

	it('becomes a note when every overlapping invoice records its time', () => {
		const recording = { ...settled, recordedIds: new Set(['invoice-a', 'invoice-b']) };
		const facts = factsOf({ recording });

		expect(overlapNoticeOf(facts)).toEqual({ kind: 'leftOut', count: 2 });
		expect(overlapsAtRiskOf(facts)).toEqual([]);
	});

	it('stays a warning about the invoices saved before billed time was recorded', () => {
		const recording = { ...settled, recordedIds: new Set(['invoice-a']) };
		const facts = factsOf({ recording });

		expect(overlapNoticeOf(facts)).toEqual({ kind: 'mayBillTwice', count: 1, isUnrecorded: true });
		expect(overlapsAtRiskOf(facts)).toEqual(['invoice-b']);
	});

	it('says nothing while the earlier invoices are checked', () => {
		const facts = factsOf({ recording: { ...settled, isLoading: true } });

		expect(overlapNoticeOf(facts)).toEqual({ kind: 'none' });
		expect(overlapsAtRiskOf(facts)).toEqual([]);
	});

	it('warns about every overlapping invoice when they could not be checked', () => {
		const facts = factsOf({ recording: { ...settled, isError: true } });

		expect(overlapNoticeOf(facts)).toEqual({ kind: 'mayBillTwice', count: 2, isUnrecorded: false });
		expect(overlapsAtRiskOf(facts)).toEqual(['invoice-a', 'invoice-b']);
	});

	it('says nothing without an overlapping invoice', () => {
		expect(overlapNoticeOf(factsOf({ overlappingIds: [], recordsBilledTime: false }))).toEqual({ kind: 'none' });
	});
});

describe('the days read to check the earlier invoices', () => {
	it('hold every one of their periods, a day wider on each side', () => {
		const periods = [
			{ fromDay: '2026-10-01', toDay: '2026-10-31' },
			{ fromDay: '2026-09-15', toDay: '2026-10-14' }
		];

		expect(recordingReadDaysOf(periods)).toEqual({ fromDay: '2026-09-14', toDay: '2026-11-01' });
	});

	it('are none without a period', () => {
		expect(recordingReadDaysOf([])).toBeNull();
	});
});

describe('the logs of a period out of a read a day wider on each side', () => {
	const from = new Date('2026-10-01T00:00:00.000Z');
	const to = new Date('2026-10-31T23:59:59.999Z');

	it('keeps the logs that start within the period, its bounds included, and those whose start is not stated', () => {
		const logs = [
			{ id: 'first', startedAt: '2026-10-01T00:00:00.000Z' },
			{ id: 'last', startedAt: '2026-10-31T23:59:59.999Z' },
			{ id: 'unstated', startedAt: null }
		];

		expect(logsStartedWithin(logs, from, to).map((log) => log.id)).toEqual(['first', 'last', 'unstated']);
	});

	it('leaves out the logs of the day before and the day after', () => {
		const logs = [
			{ id: 'before', startedAt: '2026-09-30T23:30:00.000Z' },
			{ id: 'after', startedAt: '2026-11-01T00:30:00.000Z' }
		];

		expect(logsStartedWithin(logs, from, to)).toEqual([]);
	});
});
