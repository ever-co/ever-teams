import { errorStatusOf, gauzyErrorCodeOf } from './error-feedback';

/**
 * How the API's split of one entry (ever-co/ever-gauzy#12030) ended when it did not: the API does not offer it, it
 * refused the split with a reason the dialog names, the entry changed since the calendar read it, or the outcome is
 * not known (a lost answer, an outage). The split is one write that a second try never makes twice, so an unknown
 * outcome can be tried again.
 */
export type ApiSplitFailure =
	| 'not-offered'
	| 'running'
	| 'approved'
	| 'invoiced'
	| 'too-short'
	| 'off-slot'
	| 'reason-required'
	| 'reason-too-long'
	| 'permission'
	| 'changed'
	| 'unknown';

/** Whether the API offers the split: answered by a request it refuses before writing anything. */
export type ApiSplitSupport = 'supported' | 'not-offered';

const FAILURE_OF_CODE: Record<string, ApiSplitFailure> = {
	TIME_LOG_SPLIT_RUNNING: 'running',
	TIME_LOG_SPLIT_APPROVED: 'approved',
	TIME_LOG_SPLIT_INVOICED: 'invoiced',
	TIME_LOG_SPLIT_OUTSIDE: 'too-short',
	TIME_LOG_SPLIT_TOO_SHORT: 'too-short',
	TIME_LOG_SPLIT_OFF_BOUNDARY: 'off-slot',
	TIME_LOG_SPLIT_REASON_REQUIRED: 'reason-required',
	TIME_LOG_SPLIT_REASON_TOO_LONG: 'reason-too-long',
	TIME_LOG_SPLIT_CHANGED: 'changed'
};

const NOT_FOUND = 404;
const FORBIDDEN = 403;
const CONFLICT = 409;
const FIRST_CLIENT_ERROR = 400;
const FIRST_SERVER_ERROR = 500;

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

/** The message of the API's answer: an `ApiErrorService` keeps it as its own, an Axios error under its response. */
function answerMessageOf(error: unknown): string {
	if (!isRecord(error)) {
		return '';
	}
	const response = error.response;
	let body: Record<string, unknown> = {};
	if (isRecord(response) && isRecord(response.data)) {
		body = response.data;
	}
	if (typeof body.message === 'string') {
		return body.message;
	}
	if (typeof error.message === 'string') {
		return error.message;
	}
	return '';
}

/**
 * Whether the 404 is the one of an API without the route: the framework's "Cannot POST ..." answer, not the "record
 * was not found" of an entry deleted since.
 */
function isRouteMissing(error: unknown): boolean {
	return answerMessageOf(error).startsWith('Cannot POST');
}

/** What a failed split of the API means for the Calendar's dialog. */
export function apiSplitFailureOf(error: unknown): ApiSplitFailure {
	const code = gauzyErrorCodeOf(error);
	const knownFailure = code ? FAILURE_OF_CODE[code] : undefined;
	if (knownFailure) {
		return knownFailure;
	}
	const status = errorStatusOf(error);
	if (status === NOT_FOUND) {
		if (isRouteMissing(error)) {
			return 'not-offered';
		}
		return 'changed';
	}
	if (status === FORBIDDEN) {
		return 'permission';
	}
	if (status === CONFLICT) {
		return 'changed';
	}
	return 'unknown';
}

// A timeout (408) and a cancel (499) are made up by the browser client when no answer came: they say nothing of the route
const STATUSES_WITHOUT_AN_ANSWER = new Set([408, 499]);

/**
 * Whether the API offers the split, from its answer to a split it refuses before any write (at the very start of the
 * entry): any refusal of its own says it does, the 404 of a missing route says it does not. An outage, a timeout or a
 * cancelled probe says neither, and is thrown as it came.
 */
export function apiSplitSupportOf(error: unknown): ApiSplitSupport {
	if (apiSplitFailureOf(error) === 'not-offered') {
		return 'not-offered';
	}
	const status = errorStatusOf(error);
	const isRefusal =
		status !== null &&
		status >= FIRST_CLIENT_ERROR &&
		status < FIRST_SERVER_ERROR &&
		!STATUSES_WITHOUT_AN_ANSWER.has(status);
	if (isRefusal) {
		return 'supported';
	}
	throw error;
}
