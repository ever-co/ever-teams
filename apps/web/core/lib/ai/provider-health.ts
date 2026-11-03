import { APICallError, DownloadError, NoObjectGeneratedError, RetryError } from 'ai';

const SECOND_MS = 1000;
const MINUTE_MS = 60 * SECOND_MS;
const MAX_RETRY_AFTER_MS = 30 * MINUTE_MS;

const PAUSE_MS = {
	timeout: 2 * MINUTE_MS,
	network: MINUTE_MS,
	rate: MINUTE_MS,
	dailyQuota: 30 * MINUTE_MS,
	credits: 30 * MINUTE_MS,
	auth: 60 * MINUTE_MS,
	modelGone: 30 * MINUTE_MS,
	badRequest: MINUTE_MS,
	other: 2 * MINUTE_MS
} as const;

const DAILY_QUOTA_PATTERN = /daily|per day|tokens per day|requests per day|\bTPD\b|\bRPD\b|quota/i;
const CREDITS_PATTERN = /credit|billing|insufficient_quota|payment/i;

interface ProviderHealthStore {
	__everTeamsAiPausedUntil?: Map<string, number>;
}

const store = globalThis as ProviderHealthStore;

/**
 * Pauses live in process memory: each server instance learns them on its own, at the cost of a few failed calls
 * after a cold start, and no failed call ever waits on a database write.
 */
function pausedUntil() {
	store.__everTeamsAiPausedUntil ??= new Map<string, number>();
	return store.__everTeamsAiPausedUntil;
}

export function unwrapAiError(error: unknown): unknown {
	if (RetryError.isInstance(error)) {
		return error.lastError ?? error;
	}
	return error;
}

function isTimeout(error: unknown) {
	if (!(error instanceof Error)) {
		return false;
	}
	const isTimeoutError = error.name === 'TimeoutError';
	const isAbortError = error.name === 'AbortError';
	return isTimeoutError || isAbortError;
}

/** `retry-after` is either seconds or an HTTP date. */
function retryAfterMsOf(error: APICallError) {
	const header = error.responseHeaders?.['retry-after'];
	if (!header) {
		return null;
	}
	const seconds = Number(header);
	if (Number.isFinite(seconds)) {
		return Math.min(seconds * SECOND_MS, MAX_RETRY_AFTER_MS);
	}
	const date = Date.parse(header);
	if (Number.isNaN(date)) {
		return null;
	}
	const waitMs = Math.max(date - Date.now(), 0);
	return Math.min(waitMs, MAX_RETRY_AFTER_MS);
}

function rateLimitPauseMs(error: APICallError, message: string) {
	const retryAfterMs = retryAfterMsOf(error);
	if (retryAfterMs !== null) {
		return retryAfterMs;
	}
	const isDailyQuota = DAILY_QUOTA_PATTERN.test(message);
	if (isDailyQuota) {
		return PAUSE_MS.dailyQuota;
	}
	return PAUSE_MS.rate;
}

function httpPauseMs(error: APICallError) {
	const status = error.statusCode ?? 0;
	const message = `${error.message} ${error.responseBody ?? ''}`;
	if (status === 429) {
		return rateLimitPauseMs(error, message);
	}
	const mentionsCredits = CREDITS_PATTERN.test(message);
	const isPaymentRequired = status === 402;
	if (isPaymentRequired || mentionsCredits) {
		return PAUSE_MS.credits;
	}
	const isUnauthorized = status === 401;
	const isForbidden = status === 403;
	if (isUnauthorized || isForbidden) {
		return PAUSE_MS.auth;
	}
	if (status === 404) {
		return PAUSE_MS.modelGone;
	}
	if (status === 413) {
		return 0;
	}
	const isBadRequest = status === 400;
	const isUnprocessable = status === 422;
	if (isBadRequest || isUnprocessable) {
		return PAUSE_MS.badRequest;
	}
	return PAUSE_MS.other;
}

/**
 * How long a failure keeps a provider out of the chain. A wrong answer (unparsable output, a download that
 * failed) says nothing about the provider's health, so it pauses nothing: the next provider is simply tried.
 */
export function pauseMsAfter(failure: unknown) {
	const error = unwrapAiError(failure);
	const isUnusableAnswer = NoObjectGeneratedError.isInstance(error);
	const isDownloadFailure = DownloadError.isInstance(error);
	if (isUnusableAnswer || isDownloadFailure) {
		return 0;
	}
	if (isTimeout(error)) {
		return PAUSE_MS.timeout;
	}
	if (APICallError.isInstance(error)) {
		return httpPauseMs(error);
	}
	return PAUSE_MS.network;
}

export function isProviderPaused(linkId: string) {
	const until = pausedUntil().get(linkId) ?? 0;
	return until > Date.now();
}

export function pauseProviderAfter(linkId: string, failure: unknown) {
	const pauseMs = pauseMsAfter(failure);
	if (pauseMs <= 0) {
		return 0;
	}
	const resumeAt = Date.now() + pauseMs;
	pausedUntil().set(linkId, resumeAt);
	return pauseMs;
}

export function clearProviderPause(linkId: string) {
	pausedUntil().delete(linkId);
}
