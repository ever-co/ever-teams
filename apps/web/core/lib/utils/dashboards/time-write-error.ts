import { requiredTrackingFieldsMessageKeyOf, requiredTrackingFieldsOf } from '@/core/lib/helpers/timer-errors';
import { errorReasonKeyOf, errorStatusOf } from '@/core/lib/utils/error-feedback';
import { ApiErrorService } from '@/core/services/client/api-error.service';

const FORBIDDEN_STATUS = 403;

const CONFLICT_STATUS = 409;

/**
 * Ever Gauzy's refusal of an entry update made under an `updatedAt` the entry no longer holds (409 `TIME_LOG_CHANGED`,
 * #5382): it wrote nothing. The message names it: Gauzy gives every 409 the code `CONCURRENT_MODIFICATION`, its refusal
 * of a range over a running timer (`RUNNING_TIMER_OVERLAP`) included, and an older Gauzy answers only that one.
 */
const TIME_LOG_CHANGED = 'TIME_LOG_CHANGED';

/** The service wraps some failures in its own error; the API's answer is then its cause. */
function causeOf(error: unknown): unknown {
	if (!(error instanceof Error)) {
		return error;
	}
	if (!error.cause) {
		return error;
	}
	return error.cause;
}

/**
 * Whether an entry update was refused because the entry changed after it was read: the API wrote nothing, so there is
 * nothing to write back. An older Ever Gauzy never answers this: it leaves the precondition out and saves as before.
 */
export function isTimeEntryChangedMeanwhile(error: unknown): boolean {
	const source = causeOf(error);
	if (!ApiErrorService.isApiError(source)) {
		return false;
	}
	return source.hasHttpResponseStatus(CONFLICT_STATUS) && source.message.includes(TIME_LOG_CHANGED);
}

export function writeErrorKeyOf(error: unknown): string {
	const source = causeOf(error);
	const missingFields = requiredTrackingFieldsOf(source);
	if (missingFields) {
		return requiredTrackingFieldsMessageKeyOf(missingFields);
	}
	const isForbidden = errorStatusOf(source) === FORBIDDEN_STATUS;
	if (isForbidden) {
		return 'dashboard.timesheets.SHEET.EDIT.REFUSED';
	}
	return errorReasonKeyOf(source);
}
