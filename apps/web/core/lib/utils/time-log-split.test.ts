import { describe, expect, it } from '@jest/globals';
import { ApiErrorService } from '@/core/services/client/api-error.service';
import { apiSplitFailureOf, apiSplitSupportOf } from './time-log-split';

/** The API's refusal as the browser client throws it. */
function refusal(status: number, code?: string, message = 'Refused') {
	return new ApiErrorService(message, status, code);
}

describe('apiSplitFailureOf', () => {
	it.each([
		['TIME_LOG_SPLIT_RUNNING', 403, 'running'],
		['TIME_LOG_SPLIT_APPROVED', 403, 'approved'],
		['TIME_LOG_SPLIT_INVOICED', 403, 'invoiced'],
		['TIME_LOG_SPLIT_OUTSIDE', 400, 'too-short'],
		['TIME_LOG_SPLIT_TOO_SHORT', 400, 'too-short'],
		['TIME_LOG_SPLIT_OFF_BOUNDARY', 400, 'off-slot'],
		['TIME_LOG_SPLIT_REASON_REQUIRED', 400, 'reason-required'],
		['TIME_LOG_SPLIT_REASON_TOO_LONG', 400, 'reason-too-long'],
		['TIME_LOG_SPLIT_CHANGED', 409, 'changed']
	])('reads %s as the reason the dialog names', (code, status, failure) => {
		expect(apiSplitFailureOf(refusal(status, code))).toBe(failure);
	});

	it('reads the 404 of an API without the route as "not offered"', () => {
		const missing = refusal(404, undefined, 'Cannot POST /api/timesheet/time-log/log-1/split');

		expect(apiSplitFailureOf(missing)).toBe('not-offered');
	});

	it('reads the 404 of an entry deleted since as a change', () => {
		expect(apiSplitFailureOf(refusal(404, undefined, 'The requested record was not found'))).toBe('changed');
	});

	it('reads the refusal of an edit the viewer may not make as a permission', () => {
		expect(apiSplitFailureOf(refusal(403, undefined, 'You do not have permission'))).toBe('permission');
	});

	it('reads an outage or a lost answer as unknown', () => {
		expect(apiSplitFailureOf(refusal(502))).toBe('unknown');
		expect(apiSplitFailureOf(new Error('Network Error'))).toBe('unknown');
	});

	it("reads the API's message under an Axios error's response too", () => {
		const axiosLike = { response: { status: 404, data: { message: 'Cannot POST /api/x' } } };

		expect(apiSplitFailureOf(axiosLike)).toBe('not-offered');
	});
});

describe('apiSplitSupportOf', () => {
	it('reads any refusal of its own as an API that splits', () => {
		expect(apiSplitSupportOf(refusal(400, 'TIME_LOG_SPLIT_OUTSIDE'))).toBe('supported');
		expect(apiSplitSupportOf(refusal(403, 'TIME_LOG_SPLIT_APPROVED'))).toBe('supported');
		expect(apiSplitSupportOf(refusal(403, undefined, 'Forbidden'))).toBe('supported');
	});

	it('reads the 404 of a missing route as an API that does not', () => {
		expect(apiSplitSupportOf(refusal(404, undefined, 'Cannot POST /api/timesheet/time-log/log-1/split'))).toBe(
			'not-offered'
		);
	});

	it('throws an outage, which says neither', () => {
		const outage = refusal(503);

		expect(() => apiSplitSupportOf(outage)).toThrow(outage);
	});
});
