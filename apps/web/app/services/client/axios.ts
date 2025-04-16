/* eslint-disable no-mixed-spaces-and-tabs */
import {
	API_BASE_URL,
	APPLICATION_LANGUAGES_CODE,
	DEFAULT_APP_PATH,
	GAUZY_API_BASE_SERVER_URL,
	IS_DESKTOP_APP
} from '@app/constants';
import {
	getAccessTokenCookie,
	getActiveTeamIdCookie,
	getOrganizationIdCookie,
	getTenantIdCookie
} from '@app/helpers/cookies';
import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';

const api = axios.create({
	baseURL: API_BASE_URL,
	withCredentials: true,
	timeout: 120 * 1000 // 2 minutes default timeout
});

// Custom timeouts for specific endpoints
const ENDPOINT_TIMEOUTS: Record<string, number> = {
	'/timer/timesheet': 180 * 1000,
	'/timer/timesheet/daily': 180 * 1000,
	'/timer/timesheet/statistics': 180 * 1000
};
api.interceptors.request.use(
	async (config: any) => {
		const cookie = getActiveTeamIdCookie();

		if (cookie) {
			config.headers['Authorization'] = `Bearer ${cookie}`;
		}

		// Set custom timeout for specific endpoints
		if (config.url) {
			const matchingEndpoint = Object.keys(ENDPOINT_TIMEOUTS).find((endpoint) => config.url?.includes(endpoint));
			if (matchingEndpoint) {
				config.timeout = ENDPOINT_TIMEOUTS[matchingEndpoint];
			}
		}

		return config;
	},
	(error: any) => {
		return Promise.reject(error);
	}
);
// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second
const RETRYABLE_STATUS_CODES = [408, 429, 500, 502, 503, 504];

api.interceptors.response.use(
	(response: AxiosResponse) => response,
	async (error: AxiosError) => {
		const statusCode = error.response?.status;
		const config = error.config as AxiosRequestConfig & { retryCount?: number };

		// Initialize retry count
		config.retryCount = config.retryCount || 0;

		// Check if we should retry the request
		const shouldRetry =
			config.retryCount < MAX_RETRIES &&
			(error.code === 'ECONNABORTED' ||
				error.code === 'ETIMEDOUT' || // Timeout
				!statusCode || // Network error
				RETRYABLE_STATUS_CODES.includes(statusCode));

		if (shouldRetry) {
			config.retryCount += 1;

			// Exponential backoff delay
			const delay = RETRY_DELAY * Math.pow(2, config.retryCount - 1);
			await new Promise((resolve) => setTimeout(resolve, delay));

			// Retry the request
			return api(config);
		}

		// Handle 401 unauthorized
		if (statusCode === 401) {
			window.location.assign(DEFAULT_APP_PATH);
		}

		return Promise.reject(error);
	}
);

const apiDirect = axios.create({
	timeout: 120 * 1000 // 2 minutes timeout
});

apiDirect.interceptors.request.use(
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
		Promise.reject(error);
	}
);

apiDirect.interceptors.response.use(
	(response: AxiosResponse) => response,
	async (error: { response: AxiosResponse }) => {
		const statusCode = error.response?.status;

		if (statusCode === 401) {
			const paths = location.pathname.split('/').filter(Boolean);
			if (
				!paths.includes('join') &&
				(paths[0] === 'team' || (APPLICATION_LANGUAGES_CODE.includes(paths[0]) && paths[1] === 'team'))
			) {
				return error.response;
			}

			window.location.assign(DEFAULT_APP_PATH);
		}

		return Promise.reject(error);
	}
);

type APIConfig = AxiosRequestConfig<any> & { tenantId?: string; directAPI?: boolean };

async function desktopServerOverride() {
	if (typeof window !== 'undefined') {
		try {
			const serverConfig = await api.get('/desktop-server');
			return serverConfig?.data?.NEXT_PUBLIC_GAUZY_API_SERVER_URL;
		} catch (error) {
			return GAUZY_API_BASE_SERVER_URL;
		}
	}
	return GAUZY_API_BASE_SERVER_URL;
}

async function apiConfig(config?: APIConfig) {
	const tenantId = getTenantIdCookie();
	const organizationId = getOrganizationIdCookie();

	let baseURL: string | undefined = GAUZY_API_BASE_SERVER_URL.value;

	if (IS_DESKTOP_APP) {
		// dynamic api host while on desktop mode
		const runtimeConfig = await desktopServerOverride();
		baseURL = runtimeConfig || GAUZY_API_BASE_SERVER_URL.value;
	}

	baseURL = baseURL ? `${baseURL}/api` : undefined;

	apiDirect.defaults.baseURL = baseURL;

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

async function get<T>(endpoint: string, config?: APIConfig) {
	const { baseURL, headers } = await apiConfig(config);
	const { directAPI = true } = config || {};

	return baseURL && directAPI ? apiDirect.get<T>(endpoint, { ...config, headers }) : api.get<T>(endpoint);
}

async function deleteApi<T>(endpoint: string, config?: APIConfig) {
	const { baseURL, headers } = await apiConfig(config);
	const { directAPI = true } = config || {};

	return baseURL && directAPI ? apiDirect.delete<T>(endpoint, { ...config, headers }) : api.delete<T>(endpoint);
}

async function post<T>(url: string, data?: Record<string, any> | FormData, config?: APIConfig) {
	const { baseURL, headers, tenantId, organizationId } = await apiConfig(config);
	const { directAPI = true } = config || {};

	if (baseURL && directAPI && data && !(data instanceof FormData)) {
		if (!data.tenantId && data.tenantId !== null) {
			data.tenantId = tenantId;
		}

		if (!data.organizationId && data.organizationId !== null) {
			data.organizationId = organizationId;
		}
	}

	return baseURL && directAPI ? apiDirect.post<T>(url, data, { ...config, headers }) : api.post<T>(url, data);
}
async function put<T>(url: string, data?: Record<string, any> | FormData, config?: APIConfig) {
	const { baseURL, headers, tenantId, organizationId } = await apiConfig(config);
	const { directAPI = true } = config || {};

	if (baseURL && directAPI && data && !(data instanceof FormData)) {
		if (!data.tenantId) {
			data.tenantId = tenantId;
		}

		if (!data.organizationId) {
			data.organizationId = organizationId;
		}
	}

	return baseURL && directAPI ? apiDirect.put<T>(url, data, { ...config, headers }) : api.put<T>(url, data);
}
async function patch<T>(url: string, data?: Record<string, any> | FormData, config?: APIConfig) {
	const { baseURL, headers, tenantId, organizationId } = await apiConfig(config);
	const { directAPI = true } = config || {};

	if (baseURL && directAPI && data && !(data instanceof FormData)) {
		if (!data.tenantId) {
			data.tenantId = tenantId;
		}

		if (!data.organizationId) {
			data.organizationId = organizationId;
		}
	}

	return baseURL && directAPI ? apiDirect.patch<T>(url, data, { ...config, headers }) : api.patch<T>(url, data);
}

export { get, post, deleteApi, put, patch };

export default api;
