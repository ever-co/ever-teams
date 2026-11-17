import { describe, expect, it } from '@jest/globals';
import { ApiErrorService } from '@/core/services/client/api-error.service';
import { isTimeEntryChangedMeanwhile, writeErrorKeyOf } from './time-write-error';

/** The error a request answered with `status` and `body` rejects with, as the API client builds it. */
function apiAnswer(status: number, body: Record<string, unknown> = {}) {
	return ApiErrorService.fromAxiosError({
		message: `Request failed with status code ${status}`,
		status,
		response: { data: { statusCode: status, ...body }, headers: {}, status, statusText: '' }
	});
}

describe('reason of a refused time write', () => {
	it("reads the API's answer inside the error the service wraps it in", () => {
		const wrapped = new Error('Failed to update time-log', { cause: { status: 403 } });

		expect(writeErrorKeyOf(wrapped)).toBe('dashboard.timesheets.SHEET.EDIT.REFUSED');
	});

	it('says that the time of this member cannot be changed when the API forbids the write', () => {
		expect(writeErrorKeyOf({ status: 403 })).toBe('dashboard.timesheets.SHEET.EDIT.REFUSED');
	});

	it('names the field the organization requires on every entry', () => {
		const refusal = new ApiErrorService('A project is required', 400, 'TRACKING_FIELD_REQUIRED', {
			fields: ['projectId']
		});

		expect(writeErrorKeyOf(refusal)).toBe('timer.REQUIRED_PROJECT_MESSAGE');
	});

	it('gives the general reason of any other failure', () => {
		expect(writeErrorKeyOf({ status: 500 })).toBe('toasts.REASONS.SERVER');
		expect(writeErrorKeyOf(new Error('No answer'))).toBe('toasts.REASONS.UNKNOWN');
	});
});

describe('an entry update refused because the entry changed meanwhile (#5382)', () => {
	const changedMeanwhile = () =>
		apiAnswer(409, {
			code: 'CONCURRENT_MODIFICATION',
			message: 'TIME_LOG_CHANGED: the time entry changed since it was read. Nothing was saved.'
		});

	it('is told by the refusal Ever Gauzy names it with, inside the error the service wraps it in', () => {
		expect(isTimeEntryChangedMeanwhile(changedMeanwhile())).toBe(true);
		expect(isTimeEntryChangedMeanwhile(new Error('Failed to update time-log', { cause: changedMeanwhile() }))).toBe(
			true
		);
	});

	it('is not any other 409: a range over a running timer, which an older Ever Gauzy answers too', () => {
		const runningTimer = apiAnswer(409, { code: 'CONCURRENT_MODIFICATION', message: 'RUNNING_TIMER_OVERLAP' });

		expect(isTimeEntryChangedMeanwhile(runningTimer)).toBe(false);
	});

	it('is not the same message without the 409 an answer carries, nor an error without an answer', () => {
		const withoutAnswer = new ApiErrorService('TIME_LOG_CHANGED', 409);

		expect(isTimeEntryChangedMeanwhile(apiAnswer(400, { message: 'TIME_LOG_CHANGED' }))).toBe(false);
		expect(isTimeEntryChangedMeanwhile(withoutAnswer)).toBe(false);
		expect(isTimeEntryChangedMeanwhile(new Error('TIME_LOG_CHANGED'))).toBe(false);
		expect(isTimeEntryChangedMeanwhile(undefined)).toBe(false);
	});
});
