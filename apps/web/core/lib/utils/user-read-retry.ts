import type { QueryState } from '@tanstack/react-query';
import { ERROR_REASON_KEYS, errorReasonOf, errorStatusOf } from '@/core/lib/utils/error-feedback';

/** How long a page waits before it reads the signed-in user again after its first read failed. */
export const USER_READ_RETRY_FIRST_DELAY_MS = 5_000;

/** The longest wait between two of those reads: once the API answers again, the page loads within it. */
export const USER_READ_RETRY_MAX_DELAY_MS = 60_000;

/** Refusals that mean "later": the request timed out, or too many were sent. */
const TEMPORARY_REFUSALS = new Set([408, 429]);

type UserReadState = Pick<QueryState<unknown, unknown>, 'data' | 'status' | 'error' | 'errorUpdateCount'>;

/** Whether a failed read can answer when it is sent again later: the API or the way to it failed, nothing refused it. */
export function isTemporaryReadFailure(error: unknown): boolean {
	const status = errorStatusOf(error);
	if (status === null) {
		return false;
	}
	if (status >= 500) {
		return true;
	}
	return TEMPORARY_REFUSALS.has(status);
}

/**
 * How long a page that has no signed-in user yet waits before it reads the user again, after a read that failed for a
 * temporary reason: 5 s, then twice as long after each new failure, up to a minute, so a tab left open during an outage
 * asks less and less often. `false` while the user is known, while the read has not failed, and after a refusal that
 * asking again would not change.
 */
export function userReadRetryDelay(state: UserReadState): number | false {
	const hasUser = state.data !== undefined;
	if (hasUser) {
		return false;
	}
	if (state.status !== 'error') {
		return false;
	}
	if (!isTemporaryReadFailure(state.error)) {
		return false;
	}
	const earlierFailures = Math.max(state.errorUpdateCount - 1, 0);
	const delay = USER_READ_RETRY_FIRST_DELAY_MS * 2 ** earlierFailures;
	return Math.min(delay, USER_READ_RETRY_MAX_DELAY_MS);
}

/** The request got no answer in time, or its connection dropped (the API client's code for a timed out request). */
const NO_ANSWER_IN_TIME = 408;

/**
 * The next-intl key of the sentence that says why the user read failed. A read that got no answer in time failed on
 * the API's side: it says the server could not complete it, never that the values sent were refused.
 */
export function userReadFailureReasonKey(error: unknown): string {
	const reason = errorReasonOf(error);
	const isClientRefusal = reason === 'invalid';
	const gotNoAnswerInTime = errorStatusOf(error) === NO_ANSWER_IN_TIME;
	if (isClientRefusal && gotNoAnswerInTime) {
		return ERROR_REASON_KEYS.server;
	}
	return ERROR_REASON_KEYS[reason];
}
