/**
 * API Type definitions for Clarity Replay Integration
 * Matches the tracking API contract defined in /api/tracking/route.ts
 */

import { Data } from 'clarity-decode';

// Base payload interface for individual tracking payloads
export interface ITrackingPayload {
	encodedData: string;
	timestamp: string;
}

// Base session interface from the API - now represents a collection of payloads
export interface ISession {
	sessionId: string;
	payloads: ITrackingPayload[];
	createdAt: string;
	updatedAt: string;
	startTime: string;
	lastActivity: string;
}

// Extended session with Teams context
export interface ITeamsSession {
	sessionId: string;
	timeLogs: string[]; // To be replaced with time log type
	timeSlots: string[]; // To be replaced with time slot type
	session: ISession;
}

export interface ITrackingSessionFullResponse {
	sessions: ITeamsSession[];
	summary: {
		totalSessions: number;
		totalTimeSlots: number;
		dateRange: {
			start: string;
			end: string;
		};
	};
}

// API Response interfaces matching the tracking API format
export interface ITrackingApiSuccessResponse<T = unknown> {
	success: true;
	data: T;
}

export interface ITrackingApiErrorResponse {
	success: false;
	error: string;
	details?: string;
	errorStack?: string;
}

export type ITrackingApiResponse<T = unknown> = ITrackingApiSuccessResponse<T> | ITrackingApiErrorResponse;

// Specific response types for tracking endpoints
export interface IGetSessionsResponse extends ITrackingApiSuccessResponse<ITrackingSessionFullResponse[]> {}

export interface IGetFilteredSessionsResponse extends ITrackingApiSuccessResponse<ITrackingSessionFullResponse> {}

export interface IPostSessionResponse extends ITrackingApiSuccessResponse<ITeamsSession> {}

// Request types for API calls - sessionId is extracted from decoded payload
export interface IPostSessionRequest {
	encodedData: string;
	timestamp: string;
}

// GET endpoint query parameters for filtering sessions
export interface IGetSessionsQueryParams {
	from: string; // ISO 8601 date string
	to: string; // ISO 8601 date string
	employeeIds: string; // JSON stringified array of employee IDs
}

// GET endpoint request headers (required)
export interface IGetSessionsHeaders extends ITrackingApiHeaders {
	'organization-id': string;
	'tenant-id': string;
	Authorization: string; // Bearer token
	Accept: string;
}

export interface ITrackingApiHeaders extends Record<string, string | undefined> {
	'organization-id'?: string;
	'tenant-id'?: string;
	'Content-Type'?: string;
	Accept?: string;
	Authorization?: string;
}

// Enhanced session data for Clarity integration
export interface IClaritySessionData {
	id: string; // Generated client-side for tracking
	session: ITeamsSession;
	decodedPayloads: Data.DecodedPayload[]; // Array of decoded payloads for the session
	metadata?: {
		duration?: number;
		eventCount?: number;
		lastActivity?: string;
		userAgent?: string;
		screenResolution?: string;
		payloadCount?: number; // Number of payloads in this session
	};
}

// API configuration for requests
export interface ITrackingApiConfig {
	baseUrl: string;
	headers: ITrackingApiHeaders;
	timeout?: number;
	retryAttempts?: number;
	retryDelay?: number;
}

// Error types for enhanced error handling
export interface ITrackingError extends Error {
	code?: string;
	statusCode?: number;
	context?: string;
	retryable?: boolean;
	originalError?: Error;
}

// Request options for data fetching
export interface IFetchSessionsOptions {
	organizationId?: string;
	tenantId?: string;
	employeeId?: string;
	fromDate?: string;
	toDate?: string;
	limit?: number;
	offset?: number;
}

// Response metadata for pagination and filtering
export interface ISessionsMetadata {
	total: number;
	filtered: number;
	page: number;
	limit: number;
	hasMore: boolean;
}

// Enhanced response with metadata
export interface IEnhancedSessionsResponse extends ITrackingApiSuccessResponse<IClaritySessionData[]> {
	metadata?: ISessionsMetadata;
}

// Session storage request for posting new sessions - sessionId extracted from payload
export interface IStoreSessionRequest {
	encodedData: string;
	timestamp: string;
	metadata?: {
		userAgent?: string;
		screenResolution?: string;
		sessionDuration?: number;
		eventCount?: number;
	};
}

// Batch operations for multiple sessions
export interface IBatchSessionRequest {
	sessions: IStoreSessionRequest[];
	batchId?: string;
}

export interface IBatchSessionResponse extends ITrackingApiSuccessResponse<ITeamsSession[]> {
	batchId?: string;
	processed: number;
	failed: number;
	errors?: Array<{
		index: number;
		error: string;
	}>;
}

// Filter and search options
export interface ISessionFilters {
	employeeId?: string;
	organizationId?: string;
	tenantId?: string;
	dateRange?: {
		start: string;
		end: string;
	};
	searchTerm?: string;
	sortBy?: 'timestamp' | 'duration' | 'eventCount';
	sortOrder?: 'asc' | 'desc';
}

// API client configuration
export interface ITrackingApiClient {
	get: <T = unknown, Q = void>(
		path: string,
		options?: RequestInit & { query?: Q }
	) => Promise<ITrackingApiResponse<T>>;
	post: <T = unknown, D = unknown>(path: string, data: D, options?: RequestInit) => Promise<ITrackingApiResponse<T>>;
	put: <T = unknown, D = unknown>(path: string, data: D, options?: RequestInit) => Promise<ITrackingApiResponse<T>>;
	delete: <T = unknown>(path: string, options?: RequestInit) => Promise<ITrackingApiResponse<T>>;
}

// Utility type guards
export const isSuccessResponse = <T>(response: ITrackingApiResponse<T>): response is ITrackingApiSuccessResponse<T> => {
	return response.success === true;
};

export const isErrorResponse = (response: ITrackingApiResponse): response is ITrackingApiErrorResponse => {
	return response.success === false;
};

// Type for decoded session data ready for Clarity visualization
export interface IDecodedSessionData {
	id: string;
	session: ITeamsSession;
	decodedPayloads: Data.DecodedPayload[]; // Array of decoded payloads for the session
	events: Data.DecodedEvent[];
	duration: number;
	eventCount: number;
	payloadCount: number; // Number of payloads in this session
	metadata: {
		processedAt: string;
		version: string;
		userAgent?: string;
		screenResolution?: string;
	};
}

// All types are exported individually above
