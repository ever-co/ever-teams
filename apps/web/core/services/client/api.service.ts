/* eslint-disable @typescript-eslint/no-explicit-any */
import {
	APPLICATION_LANGUAGES_CODE,
	DEFAULT_APP_PATH,
	GAUZY_API_BASE_SERVER_URL,
	IS_DESKTOP_APP
} from '@/core/constants/config/constants';

export const getFallbackAPI = async () => {
	const { getAPI } = await import('./axios');
	return await getAPI();
};

import { getAccessTokenCookie, getOrganizationIdCookie, getTenantIdCookie } from '@/core/lib/helpers/cookies';
import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { APIConfig, desktopServerOverride } from './axios';
import { HttpLoggerAdapter } from '../logs/logger-adapter.service';
import { Logger } from '../logs/logger.service';
import { ApiErrorService } from './api-error.service';

/**
 * Configuration Options for HTTP Request
 */
interface HttpClientConfig {
	baseURL?: string;
	timeout?: number;
	customHeaders?: Record<string, string>;
	withCredentials?: boolean;
	directAPI?: boolean;
	loggerConfig?: any;
	enableLogging?: boolean;
}

/**
 * Abstract base class for making typed HTTP requests using Axios.
 *
 * Used internally to create feature-specific services (Tasks, Projects, Teams, etc.) in Ever Teams.
 *
 * @abstract
 */
export class APIService {
	protected readonly baseURL: string | undefined;
	public readonly axiosInstance: AxiosInstance;
	public apiInstance: AxiosInstance | undefined;

	protected logger!: Logger;
	protected httpLogger!: HttpLoggerAdapter;
	// For request cancellation
	private cancelSources: Map<string, AbortController> = new Map();

	// Robust error logging tracking using WeakMap (no object pollution)
	private readonly loggedErrors = new WeakMap<Error, boolean>();

	// Default configuration
	private readonly config: Required<HttpClientConfig>;

	private static readonly DEFAULT_CONFIG: Required<HttpClientConfig> = {
		baseURL: '',
		timeout: 60 * 1000,
		customHeaders: {
			'Content-Type': 'application/json',
			Accept: 'application/json'
		},
		withCredentials: false,
		directAPI: true,
		loggerConfig: {},
		enableLogging: process.env.NODE_ENV === 'development'
	};

	/**
	 * Initializes a new instance of the APIService.
	 *
	 * @param {string} baseURL - The base URL for all HTTP requests.
	 */
	constructor(baseURL: string, config: HttpClientConfig = {}) {
		this.baseURL = baseURL;

		this.config = {
			...APIService.DEFAULT_CONFIG,
			...config,
			baseURL: baseURL
		};
		this.axiosInstance = this.getInstance();

		// Initialize the logger
		this.logger = Logger.getInstance();
		this.httpLogger = new HttpLoggerAdapter(this.config.loggerConfig);
		this.setupRequestInterceptors();
		this.setupResponseInterceptors();
	}
	getConfig() {
		return this.config;
	}
	getInstance() {
		if (!this.apiInstance) {
			this.apiInstance = axios.create({
				baseURL: this.config.baseURL,
				timeout: this.config.timeout,
				withCredentials: this.config.withCredentials
			});
		}

		return this.apiInstance;
	}
	/**
	 * @description Transforms Axios errors into ApiError for better management
	 * @param error The error
	 * @returns A promise that rejects the error
	 */
	private _handleAxiosError(error: AxiosError): never {
		if (axios.isCancel(error)) {
			throw ApiErrorService.fromAxiosError({
				...error,
				message: `Request cancelled (${error.message})`
			});
		}
		throw ApiErrorService.fromAxiosError(error);
	}

	/**
	 * Sets up response interceptors to handle common error scenarios.
	 * Particularly handles 401 Unauthorized responses by redirecting users to login.
	 *
	 * @private
	 */
	private setupResponseInterceptors(): void {
		this.axiosInstance.interceptors.response.use(
			(response: AxiosResponse) => {
				// Log successful responses
				this.logResponse(response);
				return response;
			},
			(error) => {
				// Log errors using robust WeakMap-based deduplication
				this.logError(error);

				if (error.response && error.response.status === 401) {
					this.handleUnauthorized(error);
				}
				return Promise.reject(error);
			}
		);
	}

	/**
	 * Sets up request interceptors to handle common error scenarios.
	 *
	 * @private
	 */
	private setupRequestInterceptors(): void {
		this.axiosInstance.interceptors.request.use(
			async (config: any) => {
				const tenantId = getTenantIdCookie();
				const cookie = getAccessTokenCookie();

				if (cookie) {
					config.headers['Authorization'] = `Bearer ${cookie}`;
				}

				if (tenantId) {
					config.headers['tenant-id'] = tenantId;
				}

				// Log outgoing requests
				this.logRequest(config);

				return config;
			},
			(error: any) => {
				// Log request configuration errors using robust deduplication
				this.logError(error);
				return Promise.reject(error);
			}
		);
	}

	/**
	 * Handles 401 Unauthorized errors by redirecting users appropriately.
	 * This logic adapts to special path prefixes used in Ever Teams (e.g., /god-mode, /spaces).
	 *
	 * @param {any} error - The error object from Axios response.
	 * @private
	 */
	private handleUnauthorized(error: any) {
		const paths = location.pathname.split('/').filter(Boolean);
		const isAuthPath =
			(!paths.includes('join') &&
				(paths[0] === 'team' || (APPLICATION_LANGUAGES_CODE.includes(paths[0]) && paths[1] === 'team'))) ||
			paths[0] === 'auth';
		if (isAuthPath) {
			return error?.response;
		}

		window.location.assign(DEFAULT_APP_PATH);
	}

	/**
	 * Log request details for debugging
	 */
	private logRequest(config: AxiosRequestConfig) {
		if (this.config.enableLogging) {
			this.logger.debug(`🚀 Request: ${config.method?.toUpperCase()} ${config.url}`, {
				headers: config.headers,
				params: config.params,
				data: config.data
			});
		}
	}

	/**
	 * Log response details for debugging
	 */
	private logResponse(response: AxiosResponse) {
		if (this.config.enableLogging) {
			this.logger.debug(
				`✅ Response: ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url}`,
				{
					data: response.data,
					headers: response.headers
				}
			);
		}
	}

	/**
	 * Mark an error as logged using WeakMap (robust, no object pollution)
	 */
	private markErrorAsLogged(error: Error): void {
		this.loggedErrors.set(error, true);
	}

	/**
	 * Check if an error has already been logged
	 */
	private isErrorAlreadyLogged(error: Error): boolean {
		return this.loggedErrors.has(error);
	}

	/**
	 * Log error details for debugging with robust duplication prevention
	 */
	private logError(error: any) {
		if (axios.isCancel(error)) {
			console.debug(`⚠️ Request canceled: ${error.message}`);
			return;
		}

		// Robust duplication check using WeakMap
		if (this.isErrorAlreadyLogged(error)) {
			if (process.env.NODE_ENV === 'development') {
				console.debug(`🔍 Skipping duplicate error log:`, {
					url: error.config?.url,
					status: error.response?.status,
					timestamp: new Date().toISOString()
				});
			}
			return;
		}

		// Mark as logged before actual logging
		this.markErrorAsLogged(error);

		// Debug logging for first-time logging (development only)
		if (process.env.NODE_ENV === 'development') {
			console.debug(`🔍 Logging error for first time:`, {
				url: error.config?.url,
				status: error.response?.status,
				timestamp: new Date().toISOString()
			});
		}

		// Use the existing HttpLoggerAdapter which already handles all error types properly
		this.httpLogger.logError(error);
	}

	/**
	 * Get active request statistics for debugging and monitoring
	 */
	public getRequestStats(): {
		activeAbortControllers: number;
	} {
		return {
			activeAbortControllers: this.cancelSources.size
		};
	}

	/**
	 * Cancel all requests
	 */
	public cancelAllRequests(reason = 'Operation cancelled by user'): void {
		this.cancelSources.forEach((controller) => {
			controller.abort(reason);
		});
		this.cancelSources.clear();
	}

	/**
	 * Cancel a specific request
	 */
	public cancelRequest(requestId: string, reason = 'Operation cancelled'): void {
		const controller = this.cancelSources.get(requestId);
		if (controller) {
			controller.abort(reason);
			this.cancelSources.delete(requestId);
		}
	}

	private async getApiConfig(config?: APIConfig) {
		const tenantId = getTenantIdCookie();
		const organizationId = getOrganizationIdCookie();
		let baseURL: string | undefined = this.baseURL;

		if (IS_DESKTOP_APP) {
			// dynamic api host while on desktop mode
			const runtimeConfig = await desktopServerOverride();
			baseURL = (runtimeConfig || GAUZY_API_BASE_SERVER_URL.value) as string;
		}

		baseURL = baseURL ? `${baseURL}/api` : undefined;
		if (this.config.directAPI) {
			this.axiosInstance.defaults.baseURL = baseURL;
		}

		const headers = {
			...(config?.tenantId ? { 'tenant-id': config?.tenantId } : {}),
			...config?.headers
		};

		return {
			baseURL,
			tenantId,
			organizationId,
			headers
		};
	}

	/**
	 * Execute a function with basic error handling
	 */
	private async executeRequest<T>(fn: () => Promise<AxiosResponse<T>>): Promise<AxiosResponse<T>> {
		try {
			return await fn();
		} catch (error: any) {
			throw this._handleAxiosError(error);
		}
	}

	/**
	 * Sends a GET request.
	 *
	 * @param {string} url - Endpoint path.
	 * @param {object} config - Additional config.
	 */
	async get<T>(url: string, config?: APIConfig): Promise<AxiosResponse<T>> {
		const { baseURL, headers } = await this.getApiConfig(config);
		const { directAPI = true } = config || {};
		// If we don't use the direct API, we delegate to the old instance
		const getRequest = !baseURL || !directAPI ? (await getFallbackAPI()).get<T> : this.axiosInstance.get<T>;

		const requestId = `GET:${url}:${Date.now()}`;
		const controller = new AbortController();
		this.cancelSources.set(requestId, controller);

		try {
			return await this.executeRequest<T>(() =>
				getRequest(url, {
					...config,
					headers,
					signal: controller.signal
				})
			);
		} finally {
			this.cancelSources.delete(requestId);
		}
	}

	/**
	 * Sends a POST request.
	 *
	 * @param {string} url - Endpoint path.
	 * @param {object} [data={}] - Request payload.
	 * @param {object} [config={}] - Additional config.
	 */
	async post<T = any>(
		url: string,
		data?: Record<string, any> | FormData,
		config?: APIConfig,
		includeTenantAndOrganizationIds = true
	): Promise<AxiosResponse<T>> {
		const { baseURL, headers, tenantId, organizationId } = await this.getApiConfig(config);
		const { directAPI = true } = config || {};

		// If we don't use the direct API, we delegate to the old instance
		const postRequest = !baseURL || !directAPI ? (await getFallbackAPI()).post<T> : this.axiosInstance.post<T>;

		const requestId = `POST:${url}:${Date.now()}`;
		const controller = new AbortController();
		this.cancelSources.set(requestId, controller);

		try {
			return await this.executeRequest<T>(() => {
				// Automatically add tenantId / organizationId
				if (data && !(data instanceof FormData) && includeTenantAndOrganizationIds) {
					if (!('tenantId' in data) && tenantId !== undefined) {
						(data as any).tenantId = tenantId;
					}
					if (!('organizationId' in data) && organizationId !== undefined) {
						(data as any).organizationId = organizationId;
					}
				}

				return postRequest(url, data, {
					...config,
					headers,
					signal: controller.signal
				});
			});
		} finally {
			this.cancelSources.delete(requestId);
		}
	}

	/**
	 * Sends a PUT request.
	 *
	 * @param {string} url - Endpoint path.
	 * @param {object} [data={}] - Request payload.
	 * @param {object} [config={}] - Additional config.
	 */
	async put<T = any>(
		url: string,
		data?: Record<string, any> | FormData,
		config?: APIConfig
	): Promise<AxiosResponse<T>> {
		const { baseURL, headers, tenantId, organizationId } = await this.getApiConfig(config);
		const { directAPI = true } = config || {};
		// If we don't use the direct API, we delegate to the old instance
		const putRequest = !baseURL || !directAPI ? (await getFallbackAPI()).put<T> : this.axiosInstance.put<T>;

		const requestId = `PUT:${url}:${Date.now()}`;
		const controller = new AbortController();
		this.cancelSources.set(requestId, controller);
		try {
			return await this.executeRequest<T>(() => {
				if (data && !(data instanceof FormData)) {
					if (!('tenantId' in data)) {
						(data as any).tenantId = tenantId;
					}

					if (!('organizationId' in data)) {
						(data as any).organizationId = organizationId;
					}
				}

				return putRequest(url, data, {
					...config,
					headers,
					signal: controller.signal
				});
			});
		} finally {
			this.cancelSources.delete(requestId);
		}
	}

	/**
	 * Sends a PATCH request.
	 *
	 * @param {string} url - Endpoint path.
	 * @param {object} [data={}] - Request payload.
	 * @param {object} [config={}] - Additional config.
	 */
	async patch<T = any>(
		url: string,
		data?: Record<string, any> | FormData,
		config?: APIConfig
	): Promise<AxiosResponse<T>> {
		const { baseURL, headers, tenantId, organizationId } = await this.getApiConfig(config);
		const { directAPI = true } = config || {};

		// If we don't use the direct API, we delegate to the old instance
		const patchRequest = !baseURL || !directAPI ? (await getFallbackAPI()).patch<T> : this.axiosInstance.patch<T>;

		const requestId = `PATCH:${url}:${Date.now()}`;
		const controller = new AbortController();
		this.cancelSources.set(requestId, controller);
		try {
			return await this.executeRequest<T>(() => {
				if (data && !(data instanceof FormData)) {
					if (!('tenantId' in data)) {
						(data as any).tenantId = tenantId;
					}

					if (!('organizationId' in data)) {
						(data as any).organizationId = organizationId;
					}
				}

				return patchRequest(url, data, {
					...config,
					headers,
					signal: controller.signal
				});
			});
		} finally {
			this.cancelSources.delete(requestId);
		}
	}

	/**
	 * Sends a DELETE request.
	 *
	 * @param {string} url - Endpoint path.
	 * @param {object} [config={}] - Additional config.
	 */
	async delete<T = any>(url: string, config?: APIConfig): Promise<AxiosResponse<T>> {
		const { baseURL, headers } = await this.getApiConfig(config);
		const { directAPI = true } = config || {};
		// If we don't use the direct API, we delegate to the old instance
		const deleteRequest =
			!baseURL || !directAPI ? (await getFallbackAPI()).delete<T> : this.axiosInstance.delete<T>;

		const requestId = `DELETE:${url}:${Date.now()}`;
		const controller = new AbortController();
		this.cancelSources.set(requestId, controller);

		try {
			return await this.executeRequest<T>(() => {
				return deleteRequest(url, {
					...config,
					headers,
					signal: controller.signal
				});
			});
		} finally {
			this.cancelSources.delete(requestId);
		}
	}

	/**
	 * Sends a HEAD request.
	 *
	 * @param {string} url - Endpoint path.
	 * @param {object} [config={}] - Additional config.
	 */
	async head<T = any>(url: string, config?: APIConfig): Promise<AxiosResponse<T>> {
		const { baseURL, headers } = await this.getApiConfig(config);
		const { directAPI = true } = config || {};
		// If we don't use the direct API, we delegate to the old instance
		const headRequest = !baseURL || !directAPI ? (await getFallbackAPI()).head<T> : this.axiosInstance.head<T>;

		const requestId = `HEAD:${url}:${Date.now()}`;
		const controller = new AbortController();
		this.cancelSources.set(requestId, controller);

		try {
			return await this.executeRequest<T>(() =>
				headRequest(url, {
					...config,
					headers,
					signal: controller.signal
				})
			);
		} finally {
			this.cancelSources.delete(requestId);
		}
	}

	/**
	 * Sends an OPTIONS request.
	 *
	 * @param {string} url - Endpoint path.
	 * @param {object} [config={}] - Additional config.
	 */
	async options<T = any>(url: string, config?: APIConfig): Promise<AxiosResponse<T>> {
		const { baseURL, headers } = await this.getApiConfig(config);
		const { directAPI = true } = config || {};
		// If we don't use the direct API, we delegate to the old instance
		const optionsRequest =
			!baseURL || !directAPI ? (await getFallbackAPI()).options<T> : this.axiosInstance.options<T>;

		const requestId = `OPTIONS:${url}:${Date.now()}`;
		const controller = new AbortController();
		this.cancelSources.set(requestId, controller);

		try {
			return await this.executeRequest<T>(() =>
				optionsRequest(url, {
					...config,
					headers,
					signal: controller.signal
				})
			);
		} finally {
			this.cancelSources.delete(requestId);
		}
	}

	/**
	 * Uploads a file with progress tracking
	 *
	 * @param url The URL to upload to
	 * @param file The File or FormData to upload
	 * @param onProgress Optional callback for progress updates
	 * @param config Additional request configuration
	 * @returns A promise that resolves to the response
	 */
	public async uploadFile<T>(
		url: string,
		file: File | Blob | FormData,
		onProgress?: (progressEvent: any) => void,
		config?: APIConfig
	): Promise<T> {
		const { baseURL, headers, tenantId, organizationId } = await this.getApiConfig(config);
		if (!baseURL) {
			throw new Error('Base URL is required for file uploads');
		}

		const requestId = `UPLOAD:${url}:${Date.now()}`;
		const controller = new AbortController();
		this.cancelSources.set(requestId, controller);

		let formData: FormData;
		if (file instanceof FormData) {
			formData = file;
		} else {
			formData = new FormData();
			formData.append('file', file);
		}

		// Automatically add the IDs
		if (tenantId) {
			formData.append('tenantId', tenantId);
		}

		if (organizationId) {
			formData.append('organizationId', organizationId);
		}
		try {
			const response = await this.axiosInstance.post<T>(url, formData, {
				...config,
				headers: {
					...headers,
					'Content-Type': 'multipart/form-data'
				},
				signal: controller.signal,
				onUploadProgress: onProgress
			});
			return response.data;
		} finally {
			this.cancelSources.delete(requestId);
		}
	}

	/**
	 * Sends a fully customized Axios request.
	 *
	 * @param {AxiosRequestConfig} config - Full Axios configuration.
	 */
	async request<T = any>(config: AxiosRequestConfig) {
		const requestId = `REQUEST:${config.url}:${Date.now()}`;
		const controller = new AbortController();
		this.cancelSources.set(requestId, controller);

		try {
			return await this.executeRequest<T>(async () => {
				const response = await this.axiosInstance.request<T>({
					...config,
					signal: controller.signal
				});
				return response;
			});
		} finally {
			this.cancelSources.delete(requestId);
		}
	}
}
