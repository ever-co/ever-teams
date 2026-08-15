/**
 * API Client for Clarity Tracking Integration
 * Handles communication with the tracking API endpoints
 */

import {
	ITrackingApiResponse,
	ITrackingApiSuccessResponse,
	ITrackingApiErrorResponse,
	ITeamsSession,
	IStoreSessionRequest,
	IPostSessionRequest,
	ITrackingApiHeaders,
	ITrackingError,
	ITrackingSessionFullResponse
} from '@ever-teams/toolkit-types';
import QueryString from 'qs';

export class TrackingApiClient {
	private baseUrl: string;
	private defaultHeaders: ITrackingApiHeaders;
	private timeout: number;

	constructor(baseUrl?: string, defaultHeaders: ITrackingApiHeaders = {}, timeout: number = 30000) {
		this.baseUrl = baseUrl || 'https://apidemo.gauzy.co/api'; // Default to Demo Gauzy API

		this.defaultHeaders = {
			'Content-Type': 'application/json',
			Accept: 'application/json',
			...defaultHeaders
		};
		this.timeout = timeout;
	}

	/**
	 * Create a fetch request with proper error handling and timeout
	 */
	private async makeRequest<T>(path: string, options: RequestInit = {}): Promise<ITrackingApiResponse<T>> {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), this.timeout);

		try {
			const url = `${this.baseUrl}${path}`;
			// Filter out undefined values from headers
			const cleanHeaders = Object.fromEntries(
				Object.entries({
					...this.defaultHeaders,
					...options.headers
				}).filter(([_, value]) => value !== undefined)
			) as Record<string, string>;

			const response = await fetch(url, {
				...options,
				signal: controller.signal,
				headers: cleanHeaders
			});

			clearTimeout(timeoutId);

			// Handle non-JSON responses
			const contentType = response.headers.get('content-type');
			if (!contentType?.includes('application/json')) {
				throw new Error(`Invalid response content type: ${contentType}`);
			}

			const data = await response.json();

			// Handle HTTP error status codes
			if (!response.ok) {
				const errorResponse: ITrackingApiErrorResponse = {
					success: false,
					error: data.error || `HTTP ${response.status}: ${response.statusText}`,
					details: data.details || data.message,
					errorStack: data.errorStack
				};
				return errorResponse;
			}

			// Ensure response has the expected format
			if (typeof data.success !== 'boolean') {
				// Handle legacy responses that might not have the success field
				const successResponse: ITrackingApiSuccessResponse<T> = {
					success: true,
					data: data.data || data
				};
				return successResponse;
			}

			return data as ITrackingApiResponse<T>;
		} catch (error) {
			clearTimeout(timeoutId);

			// Handle different error types
			if (error instanceof Error) {
				if (error.name === 'AbortError') {
					return {
						success: false,
						error: 'Request timeout',
						details: `Request timed out after ${this.timeout}ms`
					};
				}

				return {
					success: false,
					error: error.message,
					details: error.stack
				};
			}

			return {
				success: false,
				error: 'Unknown error occurred',
				details: String(error)
			};
		}
	}

	/**
	 * Set headers for organization and tenant context
	 */
	setContext(organizationId?: string, tenantId?: string): void {
		if (organizationId) {
			this.defaultHeaders['organization-id'] = organizationId;
		}
		if (tenantId) {
			this.defaultHeaders['tenant-id'] = tenantId;
		}
	}

	/**
	 * Get all sessions from the tracking API
	 */
	async getSessions(headers?: ITrackingApiHeaders): Promise<ITrackingApiResponse<ITeamsSession[]>> {
		return this.makeRequest<ITeamsSession[]>('/timesheet/custom-tracking/sessions', {
			method: 'GET',
			headers: headers as HeadersInit
		});
	}

	/**
	 * Get filtered sessions by organization, employee IDs, and date range
	 */
	async getFilteredSessions(
		from: string,
		to: string,
		employeeIds: string[] | null,
		organizationId: string,
		tenantId: string,
		bearerToken: string
	): Promise<ITrackingApiResponse<ITrackingSessionFullResponse>> {
		const queryParams = QueryString.stringify({
			startDate: from,
			endDate: to,
			organizationId,
			tenantId,
			...(employeeIds ? { employeeIds } : {})
		});

		const headers: ITrackingApiHeaders = {
			Authorization: `Bearer ${bearerToken}`,
			'organization-id': organizationId,
			'tenant-id': tenantId,
			Accept: 'application/json'
		};

		return this.makeRequest<ITrackingSessionFullResponse>(`/timesheet/custom-tracking/sessions?${queryParams}`, {
			method: 'GET',
			headers: headers as HeadersInit
		});
	}

	/**
	 * Store a new payload for a session in the tracking API
	 */
	async storeSessionPayload(
		sessionData: IPostSessionRequest,
		headers?: ITrackingApiHeaders
	): Promise<ITrackingApiResponse<ITeamsSession>> {
		return this.makeRequest<ITeamsSession>('/timesheet/custom-tracking', {
			method: 'POST',
			headers: headers as HeadersInit,
			body: JSON.stringify(sessionData)
		});
	}

	/**
	 * Store a new session in the tracking API (legacy method for backward compatibility)
	 */
	async storeSession(
		sessionData: IStoreSessionRequest,
		headers?: ITrackingApiHeaders
	): Promise<ITrackingApiResponse<ITeamsSession>> {
		// Convert to new format - sessionId will be extracted from payload
		const postData: IPostSessionRequest = {
			encodedData: sessionData.encodedData,
			timestamp: sessionData.timestamp
		};
		return this.storeSessionPayload(postData, headers);
	}

	/**
	 * Store session payload with context
	 */
	async storeSessionPayloadWithContext(
		sessionData: IPostSessionRequest,
		organizationId?: string,
		tenantId?: string
	): Promise<ITrackingApiResponse<ITeamsSession>> {
		const headers: ITrackingApiHeaders = {};

		if (organizationId) {
			headers['organization-id'] = organizationId;
		}
		if (tenantId) {
			headers['tenant-id'] = tenantId;
		}

		return this.storeSessionPayload(sessionData, headers);
	}

	/**
	 * Store session with context (legacy method for backward compatibility)
	 */
	async storeSessionWithContext(
		sessionData: IStoreSessionRequest,
		organizationId?: string,
		tenantId?: string
	): Promise<ITrackingApiResponse<ITeamsSession>> {
		const headers: ITrackingApiHeaders = {};

		if (organizationId) {
			headers['organization-id'] = organizationId;
		}
		if (tenantId) {
			headers['tenant-id'] = tenantId;
		}

		return this.storeSession(sessionData, headers);
	}

	/**
	 * Batch store multiple session payloads
	 */
	async batchStoreSessionPayloads(
		payloads: IPostSessionRequest[],
		organizationId?: string,
		tenantId?: string
	): Promise<Array<ITrackingApiResponse<ITeamsSession>>> {
		const promises = payloads.map((payload) =>
			this.storeSessionPayloadWithContext(payload, organizationId, tenantId)
		);

		return Promise.all(promises);
	}

	/**
	 * Batch store multiple sessions (legacy method for backward compatibility)
	 */
	async batchStoreSessions(
		sessions: IStoreSessionRequest[],
		organizationId?: string,
		tenantId?: string
	): Promise<Array<ITrackingApiResponse<ITeamsSession>>> {
		const promises = sessions.map((session) => this.storeSessionWithContext(session, organizationId, tenantId));

		return Promise.all(promises);
	}

	/**
	 * Health check for the tracking API
	 */
	async healthCheck(): Promise<boolean> {
		try {
			await this.makeRequest('', {
				method: 'OPTIONS'
			});
			return true;
		} catch {
			return false;
		}
	}

	/**
	 * Create a tracking error from API response
	 */
	createTrackingError(response: ITrackingApiErrorResponse, context?: string): ITrackingError {
		const error = new Error(response.error) as ITrackingError;
		error.name = 'TrackingApiError';
		error.code = 'API_ERROR';
		error.context = context;
		error.retryable = this.isRetryableError(response);

		if (response.details) {
			error.message += ` - ${response.details}`;
		}

		return error;
	}

	/**
	 * Determine if an error is retryable
	 */
	private isRetryableError(response: ITrackingApiErrorResponse): boolean {
		const retryableErrors = ['Request timeout', 'Network error', 'Connection failed', 'Service unavailable'];

		return retryableErrors.some((retryableError) =>
			response.error.toLowerCase().includes(retryableError.toLowerCase())
		);
	}

	/**
	 * Get the current configuration
	 */
	getConfig() {
		return {
			baseUrl: this.baseUrl,
			headers: { ...this.defaultHeaders },
			timeout: this.timeout
		};
	}

	/**
	 * Update configuration
	 */
	updateConfig(
		config: Partial<{
			baseUrl: string;
			headers: ITrackingApiHeaders;
			timeout: number;
		}>
	) {
		if (config.baseUrl) {
			this.baseUrl = config.baseUrl;
		}
		if (config.headers) {
			this.defaultHeaders = { ...this.defaultHeaders, ...config.headers };
		}
		if (config.timeout) {
			this.timeout = config.timeout;
		}
	}
}

// Create a default instance
export const trackingApiClient = new TrackingApiClient();

// Export utility functions
export const createTrackingClient = (baseUrl?: string, headers?: ITrackingApiHeaders, timeout?: number) =>
	new TrackingApiClient(baseUrl, headers, timeout);
