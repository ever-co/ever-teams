import { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';

import { Logger, LogLevel } from './logger.service';

export interface HttpLoggerConfig {
	logRequestData?: boolean;
	logResponseData?: boolean;
	logErrorData?: boolean;
	excludeUrls?: RegExp[];
	sensitiveHeaders?: string[];
}

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
		this.logger = Logger.getInstance();
		this.config = {
			...HttpLoggerAdapter.DEFAULT_CONFIG,
			...config
		};
	}

	/**
	 * Log the details of an HTTP request
	 */
	public logRequest(config: AxiosRequestConfig): void {
		const { url, method, headers, params, data } = config;

		// Check if the URL is excluded from the logs
		if (this.shouldExcludeUrl(url)) {
			return;
		}

		const sanitizedHeaders = this.sanitizeHeaders(headers);

		this.logger.info(
			`HTTP Request: ${method?.toUpperCase()} ${url}`,
			this.config.logRequestData
				? {
						headers: sanitizedHeaders,
						params,
						data: this.truncateData(data)
					}
				: undefined,
			'HttpClient'
		);
	}

	/**
	 * Log the details of an HTTP response
	 */
	public logResponse(response: AxiosResponse): void {
		const { config, status, headers, data } = response;

		// Check if the URL is excluded from the logs
		if (this.shouldExcludeUrl(config.url)) {
			return;
		}

		const sanitizedHeaders = this.sanitizeHeaders(headers);

		this.logger.info(
			`HTTP Response: ${config.method?.toUpperCase()} ${config.url} ${status}`,
			this.config.logResponseData
				? {
						headers: sanitizedHeaders,
						data: this.truncateData(data)
					}
				: { statusCode: status },
			'HttpClient'
		);
	}

	/**
	 * Log the details of an HTTP error
	 */
	public logError(error: AxiosError): void {
		if (!error.config) {
			this.logger.error(`HTTP Error without config: ${error.message}`, error, 'HttpClient');
			return;
		}

		const { config, response } = error;
		const { url, method } = config;

		// Check if the URL is excluded from the logs
		if (this.shouldExcludeUrl(url)) {
			return;
		}

		// Determine the log level based on the HTTP status code
		const statusCode = response?.status;
		const logLevel = this.getLogLevelForStatus(statusCode);

		// Error details to log
		const errorDetails = this.config.logErrorData
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

		// Log with the appropriate level
		const message = `HTTP Error: ${method?.toUpperCase()} ${url} ${statusCode || 'NO_RESPONSE'}`;

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
	 */
	private getLogLevelForStatus(status?: number): LogLevel {
		if (!status) return LogLevel.ERROR; // No status = network error

		if (status >= 400 && status < 500) {
			return status === 401 || status === 403 ? LogLevel.WARN : LogLevel.ERROR;
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
