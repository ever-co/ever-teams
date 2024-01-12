/* eslint-disable no-mixed-spaces-and-tabs */
import { API_BASE_URL, DEFAULT_APP_PATH, GAUZY_API_BASE_SERVER_URL } from '@app/constants';
import {
	getAccessTokenCookie,
	getActiveTeamIdCookie,
	getOrganizationIdCookie,
	getTenantIdCookie
} from '@app/helpers/cookies';
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';

const api = axios.create({
	baseURL: API_BASE_URL,
	withCredentials: true,
	timeout: 60 * 1000
});
api.interceptors.request.use(
	async (config: any) => {
		const cookie = getActiveTeamIdCookie();

		if (cookie) {
			config.headers['Authorization'] = `Bearer ${cookie}`;
		}

		return config;
	},
	(error: any) => {
		Promise.reject(error);
	}
);
api.interceptors.response.use(
	(response: AxiosResponse) => response,
	async (error: { response: AxiosResponse }) => {
		const statusCode = error.response?.status;

		if (statusCode === 401) {
			window.location.assign(DEFAULT_APP_PATH);
		}

		return Promise.reject(error);
	}
);

const apiDirect = axios.create({
	timeout: 60 * 1000
});

apiDirect.interceptors.request.use(
	async (config: any) => {
		const cookie = getAccessTokenCookie();

		if (cookie) {
			config.headers['Authorization'] = `Bearer ${cookie}`;
		}

		return config;
	},
	(error: any) => {
		Promise.reject(error);
	}
);

apiDirect.interceptors.response.use(
	(response: AxiosResponse) => {
		return {
			...response,
			data: response
		};
	},
	async (error: { response: AxiosResponse }) => {
		const statusCode = error.response?.status;

		if (statusCode === 401) {
			window.location.assign(DEFAULT_APP_PATH);
		}

		return Promise.reject(error);
	}
);

type APIConfig = AxiosRequestConfig<any> & { tenantId?: string; directAPI?: boolean };

function apiConfig(config?: APIConfig) {
	const bearer_token = getAccessTokenCookie();
	const tenantId = getTenantIdCookie();
	const organizationId = getOrganizationIdCookie();

	let baseURL: string | undefined = GAUZY_API_BASE_SERVER_URL.value;
	baseURL = baseURL ? `${baseURL}/api` : undefined;

	apiDirect.defaults.baseURL = baseURL;

	if (bearer_token) {
		apiDirect.defaults.headers.common = {
			...apiDirect.defaults.headers.common,
			Authorization: `Bearer ${bearer_token}`
		};
	}

	if (tenantId) {
		apiDirect.defaults.headers.common = {
			...apiDirect.defaults.headers.common,
			'tenant-id': tenantId
		};
	}

	const headers = {
		...(config?.tenantId ? { 'tenant-id': config?.tenantId } : { 'tenant-id': tenantId }),
		...config?.headers
	};

	return {
		baseURL,
		bearer_token,
		tenantId,
		organizationId,
		headers
	};
}

function get<T>(endpoint: string, config?: APIConfig) {
	const { baseURL, headers } = apiConfig(config);

	return baseURL ? apiDirect.get<T>(endpoint, { ...config, headers }) : api.get<T>(endpoint);
}

function post<T>(url: string, data?: Record<string, any> | FormData, config?: APIConfig) {
	const { baseURL, headers, tenantId, organizationId } = apiConfig(config);
	const { directAPI = true } = config || {};

	if (baseURL && directAPI && data && !(data instanceof FormData)) {
		if (!data.tenantId) {
			data.tenantId = tenantId;
		}

		if (!data.organizationId) {
			data.organizationId = organizationId;
		}
	}

	return baseURL && directAPI ? apiDirect.post<T>(url, data, { ...config, headers }) : api.post<T>(url, data);
}

export { get, post };

export default api;
