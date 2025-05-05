/* eslint-disable @typescript-eslint/no-explicit-any */
import { APPLICATION_LANGUAGES_CODE, DEFAULT_APP_PATH, IS_DESKTOP_APP } from '@/core/constants/config/constants';
import { getAccessTokenCookie, getOrganizationIdCookie, getTenantIdCookie } from '@/core/lib/helpers/cookies';
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import api, { APIConfig, desktopServerOverride } from './axios';

/**
 * Abstract base class for making typed HTTP requests using Axios.
 *
 * Used internally to create feature-specific services (Tasks, Projects, Teams, etc.) in Ever Teams.
 *
 * @abstract
 */
export abstract class APIService {
	protected readonly baseURL: string | undefined;
	protected readonly axiosInstance: AxiosInstance;

	/**
	 * Initializes a new instance of the APIService.
	 *
	 * @param {string} baseURL - The base URL for all HTTP requests.
	 */
	constructor(baseURL: string) {
		this.baseURL = baseURL;
		this.axiosInstance = axios.create({
			timeout: 60 * 1000
		});

		this.setupRequestInterceptors();
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

				return config;
			},
			(error: any) => {
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
		if (
			!paths.includes('join') &&
			(paths[0] === 'team' || (APPLICATION_LANGUAGES_CODE.includes(paths[0]) && paths[1] === 'team'))
		) {
			return error?.response;
		}

		window.location.assign(DEFAULT_APP_PATH);
	}

	private async getApiConfig(config?: APIConfig) {
		const tenantId = getTenantIdCookie();
		const organizationId = getOrganizationIdCookie();
		let baseURL: string | undefined = this.baseURL;
		const API = {
			GAUZY_API: {},
			EVER_TEAMS_API: {}
		};

		if (IS_DESKTOP_APP) {
			// dynamic api host while on desktop mode
			const runtimeConfig = await desktopServerOverride();
			baseURL = runtimeConfig || this.baseURL;
		}

		baseURL = baseURL ? `${baseURL}/api` : undefined;

		this.axiosInstance.defaults.baseURL = baseURL;

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
	 * Sends a GET request.
	 *
	 * @param {string} url - Endpoint path.
	 * @param {AxiosRequestConfig} config - Additional Axios config.
	 */
	protected async get<T>(url: string, config?: APIConfig) {
		const { baseURL, headers } = await this.getApiConfig(config);
		const { directAPI = true } = config || {};

		return baseURL && directAPI ? this.axiosInstance.get<T>(url, { ...config, headers }) : api.get<T>(url);
	}

	/**
	 * Sends a POST request.
	 *
	 * @param {string} url - Endpoint path.
	 * @param {object} [data={}] - Request payload.
	 * @param {AxiosRequestConfig} [config={}] - Additional Axios config.
	 */
	protected async post<T = any>(url: string, data?: Record<string, any> | FormData, config?: APIConfig) {
		const { baseURL, headers, tenantId, organizationId } = await this.getApiConfig(config);
		const { directAPI = true } = config || {};

		if (baseURL && directAPI && data && !(data instanceof FormData)) {
			if (!data.tenantId && data.tenantId !== null) {
				data.tenantId = tenantId;
			}

			if (!data.organizationId && data.organizationId !== null) {
				data.organizationId = organizationId;
			}
		}

		return baseURL && directAPI
			? this.axiosInstance.post<T>(url, data, { ...config, headers })
			: api.post<T>(url, data);
	}

	/**
	 * Sends a PUT request.
	 *
	 * @param {string} url - Endpoint path.
	 * @param {object} [data={}] - Request payload.
	 * @param {AxiosRequestConfig} [config={}] - Additional Axios config.
	 */
	protected async put<T = any>(url: string, data?: Record<string, any> | FormData, config?: APIConfig) {
		const { baseURL, headers, tenantId, organizationId } = await this.getApiConfig(config);
		const { directAPI = true } = config || {};

		if (baseURL && directAPI && data && !(data instanceof FormData)) {
			if (!data.tenantId) {
				data.tenantId = tenantId;
			}

			if (!data.organizationId) {
				data.organizationId = organizationId;
			}
		}

		return baseURL && directAPI
			? this.axiosInstance.put<T>(url, data, { ...config, headers })
			: api.put<T>(url, data);
	}

	/**
	 * Sends a PATCH request.
	 *
	 * @param {string} url - Endpoint path.
	 * @param {object} [data={}] - Request payload.
	 * @param {AxiosRequestConfig} [config={}] - Additional Axios config.
	 */
	protected async patch<T = any>(url: string, data?: Record<string, any> | FormData, config?: APIConfig) {
		const { baseURL, headers, tenantId, organizationId } = await this.getApiConfig(config);
		const { directAPI = true } = config || {};

		if (baseURL && directAPI && data && !(data instanceof FormData)) {
			if (!data.tenantId) {
				data.tenantId = tenantId;
			}

			if (!data.organizationId) {
				data.organizationId = organizationId;
			}
		}

		return baseURL && directAPI
			? this.axiosInstance.patch<T>(url, data, { ...config, headers })
			: api.patch<T>(url, data);
	}

	/**
	 * Sends a DELETE request.
	 *
	 * @param {string} url - Endpoint path.
	 * @param {AxiosRequestConfig} [config={}] - Additional Axios config.
	 */
	protected async delete<T = any>(url: string, config?: APIConfig) {
		const { baseURL, headers } = await this.getApiConfig(config);
		const { directAPI = true } = config || {};

		return baseURL && directAPI ? this.axiosInstance.delete<T>(url, { ...config, headers }) : api.delete<T>(url);
	}

	/**
	 * Sends a fully customized Axios request.
	 *
	 * @param {AxiosRequestConfig} config - Full Axios configuration.
	 */
	protected request<T = any>(config: AxiosRequestConfig) {
		return this.axiosInstance.request<T>(config);
	}
}
