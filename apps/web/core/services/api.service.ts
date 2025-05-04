import axios, { AxiosError, AxiosInstance, AxiosProgressEvent, AxiosRequestConfig, AxiosResponse } from 'axios';

import { CacheItem, ErrorInterceptor, HttpClientConfig, ResponseInterceptor } from '@/core/types/generics';

import { HttpLoggerAdapter } from './logs/logger-adapter.service';
import { Logger } from './logs/logger.service';
import { ApiErrorService } from './api-error.service';

export class APIService {
	protected readonly instance: AxiosInstance;
	private readonly cache: Map<string, CacheItem<any>> = new Map();
	private readonly pendingRequests: Map<string, Promise<any>> = new Map();
	private readonly config: Required<HttpClientConfig>;
	private cancelSources: Map<string, AbortController> = new Map();

	private logger: Logger;
	private httpLogger: HttpLoggerAdapter;

	private static readonly DEFAULT_CONFIG: Required<HttpClientConfig> = {
		baseURL: '',
		token: '',
		timeout: 30000,
		retries: 0,
		retryDelay: 1000,
		customHeaders: {},
		withCredentials: true,
		loggerConfig: {}
	};

	constructor(config?: HttpClientConfig) {
		this.config = {
			...APIService.DEFAULT_CONFIG,
			...config,
			customHeaders: {
				...APIService.DEFAULT_CONFIG.customHeaders,
				...config?.customHeaders
			},
			loggerConfig: {
				...config?.loggerConfig
			}
		};

		// Initialize the logger
		this.logger = Logger.getInstance();
		this.httpLogger = new HttpLoggerAdapter(this.config.loggerConfig);
		this.instance = axios.create({
			baseURL: this.config.baseURL || process.env.NEXT_PUBLIC_API_URL,
			timeout: this.config.timeout,
			headers: {
				'Content-Type': 'application/json',
				Accept: 'application/json',
				...this.config.customHeaders,
				...(this.config.token ? { Authorization: `Bearer ${this.config.token}` } : {})
			},
			withCredentials: this.config.withCredentials
		});

		this._initializeInterceptors();
	}

	/**
	 * @description Sets the authentication token for future requests
	 */
	public setAuthToken(token: string): void {
		this.config.token = token;
		this.instance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
	}

	/**
	 * @description Clears the authentication token
	 */
	public clearAuthToken(): void {
		this.config.token = '';
		delete this.instance.defaults.headers.common['Authorization'];
	}

	/**
	 * @description Adds a custom header for all future requests
	 */
	public setHeader(name: string, value: string): void {
		this.config.customHeaders[name] = value;
		this.instance.defaults.headers.common[name] = value;
	}

	/**
	 * @description Cancels all pending requests
	 */
	public cancelAllRequests(reason = 'Operation cancelled by user'): void {
		this.cancelSources.forEach((controller) => {
			controller.abort();
		});
		this.cancelSources.clear();
	}

	/**
	 * @description Cancels a specific request based on its identifier
	 */
	public cancelRequest(requestId: string, reason = 'Operation cancelled'): void {
		const controller = this.cancelSources.get(requestId);
		if (controller) {
			controller.abort();
			this.cancelSources.delete(requestId);
		}
	}

	/**
	 * @description Performs a GET request
	 * @param url URL of the request
	 * @param config Request configuration
	 * @param cacheOptions Cache options
	 */
	public async get<T>(
		url: string,
		config?: AxiosRequestConfig,
		cacheOptions?: { ttl: number; bypassCache?: boolean }
	): Promise<T> {
		const cacheKey = this._getCacheKey(url, config?.params);

		// Check the cache if cache options are specified and the cache is not bypassed
		if (cacheOptions && !cacheOptions.bypassCache) {
			const cachedData = this._getFromCache<T>(cacheKey);
			if (cachedData) return cachedData;
		}

		// Deduplicate requests in progress
		if (this.pendingRequests.has(cacheKey)) {
			return this.pendingRequests.get(cacheKey) as Promise<T>;
		}

		// Preparation of the cancellation token
		const controller = new AbortController();
		this.cancelSources.set(cacheKey, controller);

		const requestConfig: AxiosRequestConfig = {
			...config,
			signal: controller.signal
		};

		// Perform the request with retry logic
		const requestPromise = this._executeWithRetry<T>(() =>
			this.instance.get<T>(url, requestConfig).then(this._unwrapResponse)
		)
			.then((data) => {
				// Cache if necessary
				if (cacheOptions) {
					this._saveToCache(cacheKey, data, cacheOptions.ttl);
				}
				this.pendingRequests.delete(cacheKey);
				this.cancelSources.delete(cacheKey);
				return data;
			})
			.catch((error) => {
				this.pendingRequests.delete(cacheKey);
				this.cancelSources.delete(cacheKey);
				throw error;
			});

		this.pendingRequests.set(cacheKey, requestPromise);
		return requestPromise;
	}

	/**
	 * @description Performs a POST request
	 * @param url URL of the request
	 * @param data Data to send
	 * @param config Request configuration
	 */
	public async post<T, D = any>(url: string, data?: D, config?: AxiosRequestConfig): Promise<T> {
		const requestId = `POST:${url}:${Date.now()}`;
		const controller = new AbortController();
		this.cancelSources.set(requestId, controller);

		const requestConfig: AxiosRequestConfig = {
			...config,
			signal: controller.signal
		};

		try {
			const response = await this._executeWithRetry<T>(() =>
				this.instance.post<T>(url, data, requestConfig).then(this._unwrapResponse)
			);
			this.cancelSources.delete(requestId);
			return response;
		} catch (error) {
			this.cancelSources.delete(requestId);
			throw error;
		}
	}

	/**
	 * @description Performs a PUT request
	 * @param url URL of the request
	 * @param data Data to send
	 * @param config Request configuration
	 */
	public async put<T, D = any>(url: string, data?: D, config?: AxiosRequestConfig): Promise<T> {
		const requestId = `PUT:${url}:${Date.now()}`;
		const controller = new AbortController();
		this.cancelSources.set(requestId, controller);

		const requestConfig: AxiosRequestConfig = {
			...config,
			signal: controller.signal
		};

		try {
			const response = await this._executeWithRetry<T>(() =>
				this.instance.put<T>(url, data, requestConfig).then(this._unwrapResponse)
			);
			this.cancelSources.delete(requestId);
			return response;
		} catch (error) {
			this.cancelSources.delete(requestId);
			throw error;
		}
	}

	/**
	 * @description Performs a PATCH request
	 * @param url URL of the request
	 * @param data Data to send
	 * @param config Request configuration
	 */
	public async patch<T, D = any>(url: string, data?: D, config?: AxiosRequestConfig): Promise<T> {
		const requestId = `PATCH:${url}:${Date.now()}`;
		const controller = new AbortController();
		this.cancelSources.set(requestId, controller);

		const requestConfig: AxiosRequestConfig = {
			...config,
			signal: controller.signal
		};
		try {
			const response = await this._executeWithRetry<T>(() =>
				this.instance.patch<T>(url, data, requestConfig).then(this._unwrapResponse)
			);
			this.cancelSources.delete(requestId);
			return response;
		} catch (error) {
			this.cancelSources.delete(requestId);
			throw error;
		}
	}

	/**
	 * @description Performs a DELETE request
	 * @param url URL of the request
	 * @param config Request configuration
	 */
	public async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
		const requestId = `DELETE:${url}:${Date.now()}`;
		const controller = new AbortController();
		this.cancelSources.set(requestId, controller);

		const requestConfig: AxiosRequestConfig = {
			...config,
			signal: controller.signal
		};

		try {
			const response = await this._executeWithRetry<T>(() =>
				this.instance.delete<T>(url, requestConfig).then(this._unwrapResponse)
			);
			this.cancelSources.delete(requestId);
			return response;
		} catch (error) {
			this.cancelSources.delete(requestId);
			throw error;
		}
	}

	/**
	 * @description Downloads a file with progress
	 */
	public async downloadFile(
		url: string,
		onProgress?: (progressEvent: AxiosProgressEvent) => void,
		config?: AxiosRequestConfig
	): Promise<Blob> {
		const requestId = `DOWNLOAD:${url}:${Date.now()}`;
		const controller = new AbortController();
		this.cancelSources.set(requestId, controller);

		const requestConfig: AxiosRequestConfig = {
			...config,
			responseType: 'blob',
			signal: controller.signal,
			onDownloadProgress: onProgress
		};

		try {
			const response = await this._executeWithRetry<Blob>(() =>
				this.instance.get<Blob>(url, requestConfig).then(this._unwrapResponse)
			);
			this.cancelSources.delete(requestId);
			return response;
		} catch (error) {
			this.cancelSources.delete(requestId);
			throw error;
		}
	}

	/**
	 * @description Uploads a file with progress
	 */
	public async uploadFile<T>(
		url: string,
		file: File | Blob | FormData,
		onProgress?: (progressEvent: AxiosProgressEvent) => void,
		config?: AxiosRequestConfig
	): Promise<T> {
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

		const requestConfig: AxiosRequestConfig = {
			...config,
			headers: {
				...config?.headers,
				'Content-Type': 'multipart/form-data'
			},
			signal: controller.signal,
			onUploadProgress: onProgress
		};

		try {
			const response = await this._executeWithRetry<T>(() =>
				this.instance.post<T>(url, formData, requestConfig).then(this._unwrapResponse)
			);
			this.cancelSources.delete(requestId);
			return response;
		} catch (error) {
			this.cancelSources.delete(requestId);
			throw error;
		}
	}

	/**
	 * @description Executes a request with retry mechanism
	 */
	private async _executeWithRetry<T>(requestFn: () => Promise<T>, retryCount = 0): Promise<T> {
		try {
			return await requestFn();
		} catch (error) {
			// Do not retry if the request was intentionally cancelled
			if (axios.isCancel(error as AxiosError)) {
				throw error;
			}
			const axiosError = error as AxiosError;

			// Check if we should retry (only for certain errors and if there are remaining attempts)
			const isRetryable = this._isRetryableError(axiosError);
			const canRetry = retryCount < this.config.retries && isRetryable;

			if (canRetry) {
				const delay = this._getRetryDelay(retryCount);

				// Log of the retry attempt
				this.logger.info(
					`Retrying request in ${delay}ms (attempt ${retryCount + 1}/${this.config.retries})`,
					{
						url: axiosError.config?.url,
						method: axiosError.config?.method?.toUpperCase(),
						statusCode: axiosError.response?.status
					},
					'HttpClient'
				);

				await new Promise((resolve) => setTimeout(resolve, delay));
				return this._executeWithRetry(requestFn, retryCount + 1);
			}

			// Log the error before transforming it
			this.httpLogger.logError(axiosError);

			// Transform the error before rejecting it
			throw this._handleAxiosError(axiosError);
		}
	}

	/**
	 * @description Determines if an error is of type to be retried
	 */
	private _isRetryableError(error: AxiosError): boolean {
		// No response (network problem)
		if (!error.response) {
			return true;
		}

		// Server errors (5xx)
		if (error.response.status >= 500 && error.response.status < 600) {
			return true;
		}

		// For certain specific 4xx errors (e.g. 429 Too Many Requests)
		if (error.response.status === 429) {
			return true;
		}

		return false;
	}

	/**
	 * @description Calculates the delay before the next attempt (with exponential backoff)
	 */
	private _getRetryDelay(retryCount: number): number {
		const baseDelay = this.config.retryDelay;
		const exponentialDelay = baseDelay * Math.pow(2, retryCount);
		const jitter = Math.random() * 100; // Add jitter to avoid request storms
		return exponentialDelay + jitter;
	}

	/**
	 * @description Initializes the request and response interceptors
	 */
	private _initializeInterceptors() {
		this._addRequestInterceptor();
		this._addResponseInterceptor();
	}

	private _addRequestInterceptor() {
		this.instance.interceptors.request.use(this._onRequestInterceptor.bind(this), (error) => {
			this.httpLogger.logError(error);
			return Promise.reject(error);
		});
	}

	private _onRequestInterceptor(config: any) {
		if (config.method?.toLowerCase() === 'get') {
			config.params = {
				...(config.params ?? {}),
				_t: Date.now()
			};
		}
		this.httpLogger.logRequest(config);
		return config;
	}

	private _addResponseInterceptor() {
		this.instance.interceptors.response.use(this._onResponseInterceptor.bind(this), (error: AxiosError) => {
			this.httpLogger.logError(error);
			return Promise.reject(error);
		});
	}

	private _onResponseInterceptor(response: any) {
		this.httpLogger.logResponse(response);
		return response;
	}

	protected _handleError(error: AxiosError) {
		const statusCode = error.response?.status;
		const url = error.config?.url;
		const method = error.config?.method?.toUpperCase();
		console.error(`[HttpClient Error ${statusCode}] ${method} ${url}`, error.response?.data || error.message);
		this.httpLogger.logError(error);
		return Promise.reject(error);
	}

	/**
	 * @description Extracts the data from the response
	 */
	private _unwrapResponse<T>(response: AxiosResponse<T>): T {
		return response.data;
	}

	/**
	 * @description Transforms Axios errors into ApiError for better management
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
	 * @description Generates a cache key for a URL and its parameters
	 */
	private _getCacheKey(url: string, params?: Record<string, any>): string {
		const sortedParams = params
			? Object.keys(params)
					.sort()
					.reduce(
						(result, key) => {
							result[key] = params[key];
							return result;
						},
						{} as Record<string, any>
					)
			: undefined;

		return `${url}:${sortedParams ? JSON.stringify(sortedParams, null, 2) : ''}`;
	}

	/**
	 * @description Retrieves data from the cache if they are still valid
	 */
	private _getFromCache<T>(key: string): T | null {
		const cached = this.cache.get(key);

		if (!cached) {
			return null;
		}

		const now = Date.now();
		if (now > cached.expiry) {
			// Data expired
			this.cache.delete(key);
			return null;
		}

		return cached.data as T;
	}

	/**
	 * @description Saves data in the cache with a lifetime
	 */
	private _saveToCache<T>(key: string, data: T, ttlMs: number): void {
		const now = Date.now();
		const expiry = now + ttlMs;

		this.cache.set(key, {
			data,
			timestamp: now,
			expiry
		});
	}

	/**
	 * @description Clears the entire cache or for a specific URL
	 */
	public clearCache(urlPattern?: RegExp): void {
		if (!urlPattern) {
			this.cache.clear();
			return;
		}

		const keysToDelete: string[] = [];
		this.cache.forEach((_, key) => {
			if (urlPattern.test(key.split(':')[0])) {
				keysToDelete.push(key);
			}
		});

		keysToDelete.forEach((key) => this.cache.delete(key));
	}

	/**
	 * @description Adds a custom interceptor
	 */
	public addResponseInterceptor(onFulfilled?: ResponseInterceptor, onRejected?: ErrorInterceptor): number {
		return this.instance.interceptors.response.use(onFulfilled, onRejected);
	}

	/**
	 * @description Removes an interceptor by its ID
	 */
	public removeResponseInterceptor(id: number): void {
		this.instance.interceptors.response.eject(id);
	}
}
