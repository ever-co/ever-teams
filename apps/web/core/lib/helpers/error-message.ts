import { IS_DEV_MODE } from '@/core/constants/config/constants';

/**
 * Safely extracts error message from various error types
 * In development: shows full error details for debugging
 * In production: shows user-friendly message to avoid exposing sensitive info
 *
 * @param error - The error object (can be Error, AxiosError, string, etc.)
 * @param userFriendlyMessage - Fallback message for production
 * @returns Safe, serializable error message string
 */
export function getErrorMessage(error: unknown, userFriendlyMessage: string = 'An error occurred'): string {
	// In development, show full error details for debugging
	if (IS_DEV_MODE) {
		if (error instanceof Error) {
			// Handle Axios errors with response data
			const axiosError = error as any;
			if (axiosError.response?.data) {
				try {
					return JSON.stringify(axiosError.response.data);
				} catch {
					// If JSON.stringify fails, fall back to message
					return axiosError.message || String(error);
				}
			}
			return error.message;
		}
		// For non-Error objects, try to stringify safely
		try {
			return JSON.stringify(error);
		} catch {
			return String(error);
		}
	}

	// In production, return user-friendly message only
	if (error instanceof Error) {
		// Don't expose internal error messages to users
		return userFriendlyMessage;
	}

	return userFriendlyMessage;
}

/**
 * Logs error to console in development mode only
 * Useful for debugging without exposing errors to users
 *
 * @param context - Context/label for the error (e.g., "Failed to start timer")
 * @param error - The error object
 */
export function logErrorInDev(context: string, error: unknown): void {
	if (IS_DEV_MODE) {
		console.error(`[${context}]`, error);
	}
}

