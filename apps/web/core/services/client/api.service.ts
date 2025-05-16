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
 * Type for the cache elements
 */
interface CacheItem<T> {
	data: T;
	timestamp: number;
	expiry: number;
}

/**
 * Configuration Options for HTTP Request
 */
interface HttpClientConfig {
	baseURL?: string;
	timeout?: number;
	retries?: number;
	retryDelay?: number;
	customHeaders?: Record<string, string>;
	withCredentials?: boolean;
	directAPI?: boolean;
	loggerConfig?: any;
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
	// For the caching and deduplication of requests
	private readonly cache: Map<string, CacheItem<any>> = new Map();
	private readonly pendingRequests: Map<string, Promise<any>> = new Map();
	private cancelSources: Map<string, AbortController> = new Map();

	// Default configuration
	private readonly config: Required<HttpClientConfig>;

	private static readonly DEFAULT_CONFIG: Required<HttpClientConfig> = {
		baseURL: '',
		timeout: 60 * 1000,
		retries: 3,
		retryDelay: 1000,
		customHeaders: {
			'Content-Type': 'application/json',
			Accept: 'application/json'
		},
		withCredentials: false,
		directAPI: true,
		loggerConfig: {}
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
				// Log errors
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
			!paths.includes('join') &&
			(paths[0] === 'team' || (APPLICATION_LANGUAGES_CODE.includes(paths[0]) && paths[1] === 'team'));
		if (isAuthPath) {
			return error?.response;
		}

		window.location.assign(DEFAULT_APP_PATH);
	}

	/**
	 * Log request details for debugging
	 */
	private logRequest(config: AxiosRequestConfig) {
		this.logger.debug(`🚀 Request: ${config.method?.toUpperCase()} ${config.url}`, {
			headers: config.headers,
			params: config.params,
			data: config.data
		});
	}

	/**
	 * Log response details for debugging
	 */
	private logResponse(response: AxiosResponse) {
		this.logger.debug(
			`✅ Response: ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url}`,
			{
				data: response.data,
				headers: response.headers
			}
		);
	}

	/**
	 * Log error details for debugging
	 */
	private logError(error: any) {
		if (axios.isCancel(error)) {
			console.debug(`⚠️ Request canceled: ${error.message}`);
			return;
		}
		this.httpLogger.logError(error);
	}

	/**
	 * Generate a unique cache key for a URL and parameters
	 */
	private getCacheKey(url: string, params?: any): string {
		const sortedParams = params
			? JSON.stringify(
					Object.keys(params)
						.sort()
						.reduce((obj: any, key) => {
							obj[key] = params[key];
							return obj;
						}, {})
				)
			: '';
		return `${url}:${sortedParams}`;
	}

	/**
	 * Retrieve data from cache if they are still valid
	 */
	private getFromCache<T>(key: string): T | null {
		const cached = this.cache.get(key);
		if (!cached) return null;

		const now = Date.now();
		if (now > cached.expiry) {
			this.cache.delete(key);
			return null;
		}

		return cached.data as T;
	}

	/**
	 * Save data in cache with a lifetime
	 */
	private saveToCache<T>(key: string, data: T, ttlMs: number): void {
		const now = Date.now();
		this.cache.set(key, {
			data,
			timestamp: now,
			expiry: now + ttlMs
		});
	}

	/**
	 * Clear the cache or the one corresponding to a specific URL pattern
	 */
	public clearCache(urlPattern?: RegExp): void {
		if (!urlPattern) {
			this.cache.clear();
			return;
		}

		for (const key of this.cache.keys()) {
			const url = key.split(':')[0];
			if (urlPattern.test(url)) {
				this.cache.delete(key);
			}
		}
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
	 * Execute a function with a retry logic
	 */
	private async executeWithRetry<T>(fn: () => Promise<AxiosResponse<T>>): Promise<AxiosResponse<T>> {
		let lastError: any;

		for (let attempt = 1; attempt <= this.config.retries; attempt++) {
			try {
				return await fn();
			} catch (error: any) {
				// Do not retry if the request was intentionally cancelled
				if (axios.isCancel(error as AxiosError)) {
					throw error;
				}
				lastError = error;

				// Check if the error is recoverable (network errors or 5xx)
				const isRetryable =
					!error.response ||
					(error.response.status >= 500 && error.response.status < 600) ||
					error.response.status === 429;

				if (attempt >= this.config.retries || !isRetryable) {
					break;
				}

				// Wait with exponential backoff + jitter
				const delay = this.config.retryDelay * Math.pow(2, attempt) + Math.random() * 100;
				await new Promise((resolve) => {
					// Log of the retry attempt
					this.logger.info(
						`Retrying request in ${delay}ms (attempt ${attempt + 1}/${this.config.retries})`,
						{
							url: lastError.config?.url,
							method: lastError.config?.method?.toUpperCase(),
							statusCode: lastError.response?.status
						},
						'HttpClient'
					);
					return setTimeout(resolve, delay);
				});

				// Log the error before transforming it
				this.logError(lastError);
			}
		}

		// Transform the error before throwing it
		throw this._handleAxiosError(lastError);
	}
	/**
	 * Sends a GET request with caching support.
	 *
	 * @param {string} url - Endpoint path.
	 * @param {object} config - Additional config.
	 * @param {object} cacheOptions - Optional caching configuration.
	 */
	/**
	 * Sends a GET request with caching support.
	 *
	 * @param {string} url - Endpoint path.
	 * @param {object} config - Additional config.
	 * @param {object} cacheOptions - Optional caching configuration.
	 */
	async get<T>(
		url: string,
		config?: APIConfig,
		cacheOptions?: { ttl: number; bypassCache?: boolean }
	): Promise<AxiosResponse<T>> {
		const { baseURL, headers } = await this.getApiConfig(config);
		const { directAPI = true } = config || {};
		// If we don't use the direct API, we delegate to the old instance
		const getRequest = !baseURL || !directAPI ? (await getFallbackAPI()).get<T> : this.axiosInstance.get<T>;

		const cacheKey = this.getCacheKey(url, config?.params);

		// Check the cache if requested
		if (cacheOptions && !cacheOptions.bypassCache) {
			const cachedData = this.getFromCache<T>(cacheKey);
			if (cachedData) {
				// We encapsulate the data in a fake AxiosResponse
				return {
					data: cachedData,
					status: 200,
					statusText: 'OK (from cache)',
					headers: {},
					config: config || {}
				} as AxiosResponse<T>;
			}
		}

		// Deduplicate identical requests in progress
		if (this.pendingRequests.has(cacheKey)) {
			return this.pendingRequests.get(cacheKey) as Promise<AxiosResponse<T>>;
		}

		const controller = new AbortController();
		this.cancelSources.set(cacheKey, controller);
		const requestPromise = this.executeWithRetry(() =>
			getRequest(url, {
				...config,
				headers,
				signal: controller.signal
			})
		)
			.then((response) => {
				if (cacheOptions) {
					this.saveToCache(cacheKey, response.data, cacheOptions.ttl);
				}
				this.pendingRequests.delete(cacheKey);
				this.cancelSources.delete(cacheKey);
				return response;
			})
			.catch((error) => {
				this.pendingRequests.delete(cacheKey);
				this.cancelSources.delete(cacheKey);
				throw error;
			});
		this.pendingRequests.set(cacheKey, requestPromise);
		return requestPromise as Promise<AxiosResponse<T>>;
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
		config?: APIConfig
	): Promise<AxiosResponse<T>> {
		const { baseURL, headers, tenantId, organizationId } = await this.getApiConfig(config);
		const { directAPI = true } = config || {};

		// If we don't use the direct API, we delegate to the old instance
		const postRequest = !baseURL || !directAPI ? (await getFallbackAPI()).post<T> : this.axiosInstance.post<T>;

		const requestId = `POST:${url}:${Date.now()}`;
		const controller = new AbortController();
		this.cancelSources.set(requestId, controller);

		try {
			const response = await this.executeWithRetry<T>(() => {
				// Automatically add tenantId / organizationId
				if (data && !(data instanceof FormData)) {
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

			return response;
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
			return await this.executeWithRetry<T>(() => {
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
			return await this.executeWithRetry<T>(() => {
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
			return await this.executeWithRetry<T>(() => {
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
			return await this.executeWithRetry<T>(async () => {
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
