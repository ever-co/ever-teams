import { describe, expect, it } from '@jest/globals';
import { ApiErrorService } from '@/core/services/client/api-error.service';
import { writeErrorKeyOf } from './time-write-error';

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
