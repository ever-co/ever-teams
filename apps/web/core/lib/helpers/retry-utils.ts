/**
 * Smart retry logic for activity query hooks.
 *
 * Prevents the "timeout cascade" problem where multiple slow queries
 * each retry 3 times with a 60s Axios timeout, saturating the browser's
 * 6-connection-per-origin limit and freezing the entire application.
 *
 * Rules:
 * - Timeouts (408 / 504)  → never retry (server is too slow, retrying will cascade)
 * - Cancellations (499)    → never retry (intentional abort)
 * - Network / 5xx errors   → retry once (transient, may recover)
 * - 4xx client errors      → never retry (bad request, won't change)
 */

// HTTP status codes produced by ApiErrorService.fromAxiosError for timeout scenarios
const TIMEOUT_STATUS_CODES = new Set([408, 504]);
// Status code for intentionally cancelled requests (ERR_CANCELED → 499 in ApiErrorService)
const CANCELLED_STATUS_CODE = 499;

/**
 * Determines whether a failed React Query should be retried.
 *
 * Designed for **display-only** activity queries (dashboard, charts, reports)
 * where aggressive retries are harmful — they saturate the connection pool
 * and block the rest of the application.
 *
 * @param failureCount - How many times the query has already failed (0-based from React Query)
 * @param error - The error thrown by the queryFn (typically an ApiErrorService instance)
 * @returns `true` to retry, `false` to stop
 */
export function shouldRetryQuery(failureCount: number, error: unknown): boolean {
	// --- Extract status code from the error (handles both ApiErrorService and raw AxiosError) ---

	let statusCode: number | undefined;
	let axiosCode: string | undefined;

	if (error && typeof error === 'object') {
		if ('statusCode' in error) {
			statusCode = (error as { statusCode: number }).statusCode;
		}
		if ('code' in error) {
			axiosCode = (error as { code: string }).code;
		}
	}

	// --- Never retry timeouts ---
	// ApiErrorService maps ECONNABORTED → 408, ETIMEDOUT → 504
	if (statusCode !== undefined && TIMEOUT_STATUS_CODES.has(statusCode)) {
		return false;
	}
	// Safety net: raw AxiosError that somehow bypassed ApiErrorService wrapping
	if (axiosCode === 'ECONNABORTED' || axiosCode === 'ETIMEDOUT') {
		return false;
	}

	// --- Never retry intentional cancellations ---
	if (statusCode === CANCELLED_STATUS_CODE || axiosCode === 'ERR_CANCELED') {
		return false;
	}

	// --- Never retry 4xx client errors (except 408 already handled above) ---
	if (statusCode !== undefined && statusCode >= 400 && statusCode < 500) {
		return false;
	}

	// --- Retry transient errors (network, 5xx) at most once ---
	return failureCount < 1;
}

