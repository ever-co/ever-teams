/* eslint-disable @typescript-eslint/no-explicit-any */
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

/**
 * Abstract base class for making typed HTTP requests using Axios.
 *
 * Used internally to create feature-specific services (Tasks, Projects, Teams, etc.) in Ever Teams.
 *
 * Provides shared getters for common identifiers (activeTeamId, organizationId, tenantId)
 * to eliminate duplication across service implementations.
 *
 * @abstract
 */
export abstract class APIService {
	protected readonly baseURL: string;
	protected readonly axiosInstance: AxiosInstance;
	protected params: object = {};

	/**
	 * Gets the active team ID from cookies
	 * @returns {string} The active team ID
	 */
	protected get activeTeamId(): string {
		// This will be implemented by the web app's APIService extension
		throw new Error('activeTeamId getter must be implemented by extending class');
	}

	/**
	 * Gets the organization ID from cookies
	 * @returns {string} The organization ID
	 */
	protected get organizationId(): string {
		// This will be implemented by the web app's APIService extension
		throw new Error('organizationId getter must be implemented by extending class');
	}

	/**
	 * Gets the tenant ID from cookies
	 * @returns {string} The tenant ID
	 */
	protected get tenantId(): string {
		// This will be implemented by the web app's APIService extension
		throw new Error('tenantId getter must be implemented by extending class');
	}

	/**
	 * Gets all active team-based query parameters
	 * @returns {object} Object containing organizationTeamId, organizationId, and tenantId
	 */
	protected get activeTeamBasedQueries(): {
		organizationTeamId: string;
		organizationId: string;
		tenantId: string;
	} {
		return {
			organizationTeamId: this.activeTeamId,
			organizationId: this.organizationId,
			tenantId: this.tenantId,
		};
	}
	/**
	 * Initializes a new instance of the APIService.
	 *
	 * @param {string} baseURL - The base URL for all HTTP requests.
	 */
	constructor(baseURL: string) {
		this.baseURL = baseURL;
		this.axiosInstance = axios.create({
			baseURL: this.baseURL,
			withCredentials: true,
		});

		this.setupResponseInterceptors();
	}

	/**
	 * Sets up response interceptors to handle common error scenarios.
	 * Particularly handles 401 Unauthorized responses by redirecting users to login.
	 *
	 * @private
	 */
	private setupResponseInterceptors(): void {
		this.axiosInstance.interceptors.response.use(
			(response: AxiosResponse) => response,
			(error) => {
				if (error.response && error.response.status === 401) {
					this.handleUnauthorized(error);
				}
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
		console.log('Unauthorized', error);
	}

	/**
	 * Sends a GET request.
	 *
	 * @param {string} url - Endpoint path.
	 * @param {object} [params={}] - Query parameters.
	 * @param {AxiosRequestConfig} [config={}] - Additional Axios config.
	 */
	get<T = any>(url: string, params: object = {}, config: AxiosRequestConfig = {}) {
		return this.axiosInstance.get<T>(url, {
			...config,
			params,
		});
	}
	defineParams(params: object) {
		this.params = params;
	}

	/**
	 * Sends a POST request.
	 *
	 * @param {string} url - Endpoint path.
	 * @param {object} [data={}] - Request payload.
	 * @param {AxiosRequestConfig} [config={}] - Additional Axios config.
	 */
	post<T = any>(url: string, data: object = {}, config: AxiosRequestConfig = {}) {
		return this.axiosInstance.post<T>(url, data, config);
	}

	/**
	 * Sends a PUT request.
	 *
	 * @param {string} url - Endpoint path.
	 * @param {object} [data={}] - Request payload.
	 * @param {AxiosRequestConfig} [config={}] - Additional Axios config.
	 */
	put<T = any>(url: string, data: object = {}, config: AxiosRequestConfig = {}) {
		return this.axiosInstance.put<T>(url, data, config);
	}

	/**
	 * Sends a PATCH request.
	 *
	 * @param {string} url - Endpoint path.
	 * @param {object} [data={}] - Request payload.
	 * @param {AxiosRequestConfig} [config={}] - Additional Axios config.
	 */
	patch<T = any>(url: string, data: object = {}, config: AxiosRequestConfig = {}) {
		return this.axiosInstance.patch<T>(url, data, config);
	}

	/**
	 * Sends a DELETE request.
	 *
	 * @param {string} url - Endpoint path.
	 * @param {any} [data] - Request payload (optional).
	 * @param {AxiosRequestConfig} [config={}] - Additional Axios config.
	 */
	delete<T = any>(url: string, data?: any, config: AxiosRequestConfig = {}) {
		return this.axiosInstance.delete<T>(url, { data, ...config });
	}

	/**
	 * Sends a fully customized Axios request.
	 *
	 * @param {AxiosRequestConfig} config - Full Axios configuration.
	 */
	request<T = any>(config: AxiosRequestConfig) {
		return this.axiosInstance.request<T>(config);
	}
}
