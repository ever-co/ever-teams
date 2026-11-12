import { requiredTrackingFieldsMessageKeyOf, requiredTrackingFieldsOf } from '@/core/lib/helpers/timer-errors';
import { errorReasonKeyOf, errorStatusOf } from '@/core/lib/utils/error-feedback';

const FORBIDDEN_STATUS = 403;

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
