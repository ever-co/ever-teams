import {
	APPLICATION_LANGUAGES_CODE,
	DEFAULT_APP_PATH,
	GAUZY_API_BASE_SERVER_URL
} from '@/core/constants/config/constants';
import { getAccessTokenCookie, getOrganizationIdCookie, getTenantIdCookie } from '@/core/lib/helpers/cookies';
import { handleUnauthorized } from '@/core/lib/auth/handle-unauthorized';
import { DisconnectionReason } from '@/core/types/enums/disconnection-reason';
import { AxiosRequestConfig, AxiosResponse } from 'axios';
import { APIService } from './api.service';
import { buildAPIService, buildDirectAPIService } from './api-factory';

let api: APIService;
let apiDirect: APIService;

export const getAPI = async (): Promise<APIService> => {
	if (!api) {
		api = await buildAPIService();

		api.axiosInstance.interceptors.request.use(
			async (config: any) => {
				const cookie = getAccessTokenCookie();
				const tenantId = getTenantIdCookie();
				if (cookie) {
					config.headers['Authorization'] = `Bearer ${cookie}`;
				}
				if (tenantId) {
					config.headers['tenant-id'] = tenantId;
				}
				return config;
			},
			(error: any) => Promise.reject(error)
		);

		api.axiosInstance.interceptors.response.use(
			(response: AxiosResponse) => response,
			async (error: { response: AxiosResponse; config?: any }) => {
				if (error.response?.status === 401) {
					// Don't disconnect immediately - let handleUnauthorized() trigger the 600ms debounce
					// which gives refreshUserData() a chance to attempt token refresh
					handleUnauthorized(DisconnectionReason.UNAUTHORIZED_401, {
						status: 401,
						endpoint: error.config?.url,
						method: error.config?.method,
						context: 'axios.ts -> api.axiosInstance.interceptors.response.use'
					});
				}
				return Promise.reject(error);
			}
		);
	}
	return api;
};

export const getAPIDirect = async (): Promise<APIService> => {
	if (!apiDirect) {
		apiDirect = await buildDirectAPIService();

		apiDirect.axiosInstance.interceptors.request.use(
			async (config: any) => {
				const cookie = getAccessTokenCookie();
				const tenantId = getTenantIdCookie();
				if (cookie) {
					config.headers['Authorization'] = `Bearer ${cookie}`;
				}
				if (tenantId) {
					config.headers['tenant-id'] = tenantId;
				}
				return config;
			},
			(error: any) => Promise.reject(error)
		);

		apiDirect.axiosInstance.interceptors.response.use(
			(response: AxiosResponse) => response,
			async (error: { response: AxiosResponse; config?: any }) => {
				const statusCode = error.response?.status;
				if (statusCode === 401) {
					const paths = location.pathname.split('/').filter(Boolean);
					if (
						!paths.includes('join') &&
						(paths[0] === 'team' || (APPLICATION_LANGUAGES_CODE.includes(paths[0]) && paths[1] === 'team'))
					) {
						return error.response;
					}
					// Don't disconnect immediately - let handleUnauthorized() trigger the 600ms debounce
					// which gives refreshUserData() a chance to attempt token refresh
					handleUnauthorized(DisconnectionReason.UNAUTHORIZED_401, {
						status: 401,
						endpoint: error.config?.url,
						method: error.config?.method,
						path: location.pathname,
						context: 'axios.ts -> apiDirect.axiosInstance.interceptors.response.use'
					});
				}
				return Promise.reject(error);
			}
		);
	}
	return apiDirect;
};

export type APIConfig = AxiosRequestConfig<any> & { tenantId?: string | null; directAPI?: boolean };

async function apiConfig(config?: APIConfig) {
	const tenantId = getTenantIdCookie();
	const organizationId = getOrganizationIdCookie();

	let baseURL: string | undefined = GAUZY_API_BASE_SERVER_URL.value;

	baseURL = baseURL ? `${baseURL}/api` : undefined;

	apiDirect.axiosInstance.defaults.baseURL = baseURL;

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
	const isDirect = baseURL && directAPI;
	const apiClient = isDirect ? await getAPIDirect() : await getAPI();
	if (isDirect && data && !(data instanceof FormData)) {
		if (!data.tenantId && data.tenantId !== null) {
			data.tenantId = tenantId;
		}

		if (!data.organizationId && data.organizationId !== null) {
			data.organizationId = organizationId;
		}
	}

	return isDirect ? apiClient.post<T>(url, data, { ...config, headers }) : apiClient.post<T>(url, data);
}
async function put<T>(url: string, data?: Record<string, any> | FormData, config?: APIConfig) {
	const { baseURL, headers, tenantId, organizationId } = await apiConfig(config);
	const { directAPI = true } = config || {};
	const isDirect = baseURL && directAPI;
	const apiClient = isDirect ? await getAPIDirect() : await getAPI();

	if (isDirect && data && !(data instanceof FormData)) {
		if (!data.tenantId && data.tenantId !== null) {
			data.tenantId = tenantId;
		}

		if (!data.organizationId) {
			data.organizationId = organizationId;
		}
	}

	return isDirect ? apiClient.put<T>(url, data, { ...config, headers }) : apiClient.put<T>(url, data);
}
async function patch<T>(url: string, data?: Record<string, any> | FormData, config?: APIConfig) {
	const { baseURL, headers, tenantId, organizationId } = await apiConfig(config);
	const { directAPI = true } = config || {};
	const isDirect = baseURL && directAPI;
	const apiClient = isDirect ? await getAPIDirect() : await getAPI();

	if (isDirect && data && !(data instanceof FormData)) {
		if (!data.tenantId && data.tenantId !== null) {
			data.tenantId = tenantId;
		}

		if (!data.organizationId) {
			data.organizationId = organizationId;
		}
	}

	return isDirect ? apiClient.patch<T>(url, data, { ...config, headers }) : apiClient.patch<T>(url, data);
}

export { get, post, deleteApi, put, patch };
export default getAPI;
