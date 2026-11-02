/**
 * Why a request failed, in words a user can act on. Server and exception texts are never shown: they are English,
 * often technical, and sometimes carry ids or payloads.
 */
export type ErrorReason =
	| 'offline'
	| 'session'
	| 'permission'
	| 'notFound'
	| 'conflict'
	| 'invalid'
	| 'tooMany'
	| 'server'
	| 'unknown';

export const ERROR_REASON_KEYS: Record<ErrorReason, string> = {
	offline: 'toasts.REASONS.OFFLINE',
	session: 'toasts.REASONS.SESSION',
	permission: 'toasts.REASONS.PERMISSION',
	notFound: 'toasts.REASONS.NOT_FOUND',
	conflict: 'toasts.REASONS.CONFLICT',
	invalid: 'toasts.REASONS.INVALID',
	tooMany: 'toasts.REASONS.TOO_MANY',
	server: 'toasts.REASONS.SERVER',
	unknown: 'toasts.REASONS.UNKNOWN'
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function numberOrNull(value: unknown): number | null {
	if (typeof value !== 'number') {
		return null;
	}
	if (value <= 0) {
		return null;
	}

	return value;
}

function responseStatusOf(response: unknown): unknown {
	if (!isRecord(response)) {
		return undefined;
	}

	return response.status;
}

/** The HTTP status of an `ApiErrorService`, an Axios error or a Gauzy error body, when there is one. */
export function errorStatusOf(error: unknown): number | null {
	if (!isRecord(error)) {
		return null;
	}
	const candidates = [error.statusCode, error.status, responseStatusOf(error.response)];
	for (const candidate of candidates) {
		const status = numberOrNull(candidate);
		if (status !== null) {
			return status;
		}
	}

	return null;
}

function isOffline(): boolean {
	if (typeof navigator === 'undefined') {
		return false;
	}

	return navigator.onLine === false;
}

function isNetworkFailure(error: unknown): boolean {
	if (!isRecord(error)) {
		return false;
	}
	const code = error.code;
	const message = error.message;
	const isAxiosNetworkCode = code === 'ERR_NETWORK';
	const saysNetwork = typeof message === 'string' && message.includes('Network Error');

	return isAxiosNetworkCode || saysNetwork;
}

function reasonOfStatus(status: number): ErrorReason {
	if (status === 401) {
		return 'session';
	}
	if (status === 403) {
		return 'permission';
	}
	if (status === 404) {
		return 'notFound';
	}
	if (status === 409) {
		return 'conflict';
	}
	if (status === 429) {
		return 'tooMany';
	}
	const isClientError = status >= 400 && status < 500;
	if (isClientError) {
		return 'invalid';
	}
	if (status >= 500) {
		return 'server';
	}

	return 'unknown';
}

export function errorReasonOf(error: unknown): ErrorReason {
	if (isOffline()) {
		return 'offline';
	}
	const status = errorStatusOf(error);
	if (status !== null) {
		return reasonOfStatus(status);
	}
	if (isNetworkFailure(error)) {
		return 'offline';
	}

	return 'unknown';
}

/** The next-intl key of the sentence that explains `error` under a failure toast's title. */
export function errorReasonKeyOf(error: unknown): string {
	return ERROR_REASON_KEYS[errorReasonOf(error)];
}
