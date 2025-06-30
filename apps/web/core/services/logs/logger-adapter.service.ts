import { AxiosError, AxiosRequestConfig, AxiosResponse, AxiosResponseHeaders, RawAxiosRequestHeaders } from 'axios';

import { Logger } from './logger.service';
import { HttpLoggerConfig, LogLevel } from '@/core/types/generics';

export class HttpLoggerAdapter {
	private logger: Logger;
	private config: Required<HttpLoggerConfig>;

	private static readonly DEFAULT_CONFIG: Required<HttpLoggerConfig> = {
		logRequestData: true,
		logResponseData: false, // By default, we do not log responses to avoid overloading the logs
		logErrorData: true,
		excludeUrls: [/\/health$/, /\/ping$/], // Exclude healthcheck endpoints
		sensitiveHeaders: ['Authorization', 'Cookie', 'Set-Cookie']
	};

	constructor(config?: HttpLoggerConfig) {
		this.logger = Logger.getInstance({
			console: true
		});
		this.config = {
			...HttpLoggerAdapter.DEFAULT_CONFIG,
			...config,
			excludeUrls: [...HttpLoggerAdapter.DEFAULT_CONFIG.excludeUrls, ...(config?.excludeUrls ?? [])],
			sensitiveHeaders: [
				...HttpLoggerAdapter.DEFAULT_CONFIG.sensitiveHeaders,
				...(config?.sensitiveHeaders ?? [])
			]
		};
	}

	/**
	 * Log the details of an HTTP request
	 * @param config - The Axios request configuration
	 */
	public logRequest(config: AxiosRequestConfig): void {
		const { url, method, headers, params, data } = config;

		this.logHttpEvent(
			'Request',
			method,
			url,
			undefined,
			headers as RawAxiosRequestHeaders,
			data,
			params,
			this.config.logRequestData
		);
	}

	/**
	 * Log the details of an HTTP response
	 * @param response - The Axios response object
	 */
	public logResponse(response: AxiosResponse): void {
		const { config, status, headers, data } = response;

		this.logHttpEvent(
			'Response',
			config.method,
			config.url,
			status,
			headers as AxiosResponseHeaders,
			data,
			undefined,
			this.config.logResponseData
		);
	}

	/**
	 * Log HTTP event data (request or response) in a standardized format.
	 *
	 * @param eventType - Type of the HTTP event ('Request' or 'Response')
	 * @param method - HTTP method used (GET, POST, etc.)
	 * @param url - URL of the request/response
	 * @param status - (Optional) HTTP status code (for responses only)
	 * @param headers - HTTP headers of the request/response
	 * @param data - Payload of the request/response
	 * @param params - (Optional) Query parameters (for requests only)
	 * @param shouldLogData - Flag to determine if data should be included in the logs
	 */
	private logHttpEvent(
		eventType: 'Request' | 'Response',
		method: string | undefined,
		url: string | undefined,
		status: number | undefined,
		headers: RawAxiosRequestHeaders | AxiosResponseHeaders,
		data: unknown,
		params: unknown = undefined,
		shouldLogData: boolean
	): void {
		if (this.shouldExcludeUrl(url)) {
			return;
		}

		const sanitizedHeaders = this.sanitizeHeaders(headers);
		const upperMethod = method?.toUpperCase();
		const message =
			eventType === 'Request'
				? `HTTP Request: ${upperMethod} ${url}`
				: `HTTP Response: ${upperMethod} ${url} ${status}`;

		const logData = shouldLogData
			? {
					headers: sanitizedHeaders,
					...(params && typeof params === 'object' ? { params } : {}),
					data: this.truncateData(data),
					...(status !== undefined && { statusCode: status })
				}
			: status !== undefined
				? { statusCode: status }
				: undefined;
		this.logger.info(message, logData, 'HttpClient');
	}

	/**
	 * @description Log the details of an HTTP error
	 * @param error The error to log
	 */
	public logError(error: AxiosError): void {
		if (!this.shouldLogAxiosError(error)) {
			return;
		}

		const logLevel = this.getLogLevel(error);
		const errorDetails = this.getErrorDetails(error);
		const message = this.getLogMessage(error);

		this.logWithLevel(logLevel, message, errorDetails);
	}

	private shouldLogAxiosError(error: AxiosError): boolean {
		if (!error.config) {
			this.logger.error(`HTTP Error without config: ${error.message}`, error, 'HttpClient');
			return false;
		}
		const { url } = error.config;
		return !this.shouldExcludeUrl(url);
	}

	private getLogLevel(error: AxiosError): LogLevel {
		const statusCode = error.response?.status;
		return this.getLogLevelForStatus(statusCode);
	}

	private getErrorDetails(error: AxiosError): any {
		const { response, config } = error;
		const statusCode = response?.status;

		const baseDetails = this.config.logErrorData
			? {
					statusCode,
					statusText: response?.statusText,
					headers: this.sanitizeHeaders(response?.headers),
					data: this.truncateData(response?.data),
					errorMessage: error.message,
					errorName: error.name,
					stack: error.stack
				}
			: {
					statusCode,
					errorMessage: error.message
				};

		// Enhanced details for 403 Forbidden errors to aid debugging
		if (statusCode === 403) {
			return {
				...baseDetails,
				criticalError: true,
				endpoint: config?.url,
				method: config?.method?.toUpperCase(),
				timestamp: new Date().toISOString(),
				debugInfo: {
					message: 'This 403 error indicates a permission/authorization issue',
					possibleCauses: [
						'User lacks required permissions',
						'Invalid or expired authentication token',
						'Resource access restrictions',
						'Role-based access control (RBAC) denial'
					]
				}
			};
		}

		return baseDetails;
	}

	private getLogMessage(error: AxiosError): string {
		const statusCode = error.response?.status;
		const method = error.config?.method?.toUpperCase();
		const url = error.config?.url;

		// Enhanced message for critical 403 errors to ensure visibility
		if (statusCode === 403) {
			return `🚨 CRITICAL: HTTP 403 Forbidden - ${method} ${url} - Permission Denied`;
		}

		return `HTTP Error: ${method} ${url} ${statusCode || 'NO_RESPONSE'}`;
	}

	private logWithLevel(logLevel: LogLevel, message: string, errorDetails: any): void {
		switch (logLevel) {
			case LogLevel.WARN:
				this.logger.warn(message, errorDetails, 'HttpClient');
				break;
			case LogLevel.ERROR:
				this.logger.error(message, errorDetails, 'HttpClient');
				break;
			case LogLevel.FATAL:
				this.logger.fatal(message, errorDetails, 'HttpClient');
				break;
			default:
				this.logger.error(message, errorDetails, 'HttpClient');
		}
	}

	/**
	 * Determine the log level based on the HTTP status code
	 * Enhanced to properly handle authorization errors as critical issues
	 */
	private getLogLevelForStatus(status?: number): LogLevel {
		if (!status) return LogLevel.ERROR; // No status = network error

		if (status >= 400 && status < 500) {
			// 403 Forbidden should be treated as ERROR, not WARN, as it indicates
			// a critical permission issue that needs immediate attention
			if (status === 403) {
				return LogLevel.ERROR;
			}
			// 401 can remain as WARN as it's often expected (token expiry)
			return status === 401 ? LogLevel.WARN : LogLevel.ERROR;
		}

		if (status >= 500) {
			return status >= 503 ? LogLevel.FATAL : LogLevel.ERROR;
		}

		return LogLevel.ERROR;
	}

	/**
	 * Check if a URL should be excluded from the logs
	 */
	private shouldExcludeUrl(url?: string): boolean {
		if (!url) return false;

		return this.config.excludeUrls.some((pattern) => pattern.test(url));
	}

	/**
	 * Remove sensitive information from headers
	 */
	private sanitizeHeaders(headers?: any): any {
		if (!headers) return undefined;

		const sanitized = { ...headers };

		this.config.sensitiveHeaders.forEach((header) => {
			const headerLower = header.toLowerCase();

			Object.keys(sanitized).forEach((key) => {
				if (key.toLowerCase() === headerLower) {
					sanitized[key] = '[REDACTED]';
				}
			});
		});

		return sanitized;
	}

	/**
	 * Truncate data that is too large for the logs
	 */
	private truncateData(data: any): any {
		if (!data) return undefined;

		const MAX_STRING_LENGTH = 1000; // Limit to 1000 characters

		try {
			if (typeof data === 'string') {
				return data.length > MAX_STRING_LENGTH
					? `${data.substring(0, MAX_STRING_LENGTH)}... [TRUNCATED, ${data.length} chars total]`
					: data;
			}

			// Convert to string to apply truncation
			const stringified = JSON.stringify(data, null, 2);
			if (stringified.length > MAX_STRING_LENGTH) {
				return `${stringified.substring(0, MAX_STRING_LENGTH)}... [TRUNCATED, ${stringified.length} chars total]`;
			}

			return data;
		} catch (error) {
			return '[UNSTRINGIFIABLE_DATA]';
		}
	}
}
