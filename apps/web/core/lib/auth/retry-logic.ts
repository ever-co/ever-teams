/**
 * Retry Logic with Exponential Backoff for Authentication Operations
 *
 * Distinguishes between:
 * - 401 Unauthorized: Token invalid → No retry, proceed with logout
 * - Network errors: Connection issues → Retry with exponential backoff
 * - Server errors (5xx): Temporary issues → Retry with exponential backoff
 *
 */

import { AxiosError } from 'axios';

/**
 * Determine if an error is recoverable (can be retried)
 *
 * @param error - The error to check
 * @returns true if the error is retryable, false otherwise
 */
export function isRetryableError(error: unknown): boolean {
	// First check: if it's a 401 error, NEVER retry
	if (isUnauthorizedError(error)) {
		return false;
	}

	// Axios error handling
	if (error && typeof error === 'object' && 'isAxiosError' in error) {
		const axiosError = error as AxiosError;
		const status = axiosError.response?.status;

		const isClientError = status && status >= 400 && status < 500;

		// Canceled requests should NOT be retried (user navigation, AbortController, etc.)
		if (axiosError.code === 'ERR_CANCELED') {
			return false;
		}

		// No response = network error (retryable)
		if (!axiosError.response) {
			return true;
		}

		// Server errors (5xx) are retryable
		if (axiosError.response.status >= 500) {
			return true;
		}

		// Timeout errors are retryable
		if (axiosError.code === 'ECONNABORTED' || axiosError.code === 'ETIMEDOUT') {
			return true;
		}

		// 4xx client errors are NOT retryable
		if (isClientError) {
			return false;
		}
	}

	// serverFetch format: { statusCode: number }
	if (error && typeof error === 'object' && 'statusCode' in error) {
		const statusCode = (error as { statusCode: number }).statusCode;
		// 5xx are retryable, 4xx are not
		return statusCode >= 500;
	}

	// Generic error handling
	if (error instanceof TypeError) {
		// Network errors often throw TypeErrors
		return true;
	}

	// Check for error message patterns indicating network issues
	if (error instanceof Error) {
		const message = error.message.toLowerCase();
		if (
			message.includes('network') ||
			message.includes('fetch') ||
			message.includes('timeout') ||
			message.includes('connection')
		) {
			return true;
		}
	}

	return false;
}

/**
 * Check if an error is a 401 Unauthorized error
 *
 * Handles multiple error formats:
 * - ApiErrorService: { isApiError: true, statusCode: 401 }
 * - Axios: { response: { status: 401 } }
 * - serverFetch: { statusCode: 401 } or { message: 'Unauthorized', statusCode: 401 }
 * - Generic: { status: 401 }
 *
 * @param error - The error to check
 * @returns true if it's a 401 error
 */
export function isUnauthorizedError(error: unknown): boolean {
	if (error && typeof error === 'object') {
		// ApiErrorService format: { isApiError: true, statusCode: 401 }
		if ('isApiError' in error && (error as { isApiError: boolean }).isApiError === true) {
			if ('statusCode' in error) {
				return (error as { statusCode: number }).statusCode === 401;
			}
			return false;
		}

		// Axios error
		if ('isAxiosError' in error) {
			const axiosError = error as AxiosError;
			return axiosError.response?.status === 401;
		}

		// serverFetch format: { statusCode: 401, message: 'Unauthorized' }
		if ('statusCode' in error) {
			return (error as { statusCode: number }).statusCode === 401;
		}

		// Generic error with status
		if ('status' in error) {
			return (error as { status: number }).status === 401;
		}

		// Error with response.status (nested format)
		if ('response' in error && error.response && typeof error.response === 'object') {
			const response = error.response as { status?: number; statusCode?: number };
			return response.status === 401 || response.statusCode === 401;
		}

		// Check message for "Unauthorized" (fallback)
		if ('message' in error) {
			const message = (error as { message: string }).message;
			return message === 'Unauthorized' || message?.toLowerCase().includes('unauthorized');
		}
	}

	return false;
}

/**
 * Retry a function with exponential backoff
 *
 * @param fn - The async function to retry
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @param baseDelayMs - Base delay in milliseconds (default: 1000ms)
 * @returns The result of the function
 * @throws The last error if all retries fail
 */
export async function retryWithBackoff<T>(fn: () => Promise<T>, maxRetries = 3, baseDelayMs = 1000): Promise<T> {
	let lastError: unknown;

	for (let attempt = 0; attempt <= maxRetries; attempt++) {
		try {
			return await fn();
		} catch (error) {
			lastError = error;

			// Don't retry on non-retryable errors (like 401)
			if (!isRetryableError(error)) {
				throw error;
			}

			// Last attempt, throw the error
			if (attempt === maxRetries) {
				console.error(`[Retry] All ${maxRetries} retry attempts failed`);
				throw error;
			}

			// Calculate delay with exponential backoff: 1s, 2s, 4s, 8s...
			const backDelay = baseDelayMs * Math.pow(2, attempt);

			console.warn(`[Retry] Attempt ${attempt + 1}/${maxRetries} failed, retrying in ${backDelay}ms...`, error);

			// Wait before next attempt
			await delay(backDelay);
		}
	}

	throw lastError;
}

/**
 * Delay execution for a specified time
 *
 * @param ms - Delay in milliseconds
 * @returns Promise that resolves after the delay
 */
export function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
