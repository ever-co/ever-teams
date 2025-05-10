import {
	APPLICATION_LANGUAGES_CODE,
	DEFAULT_APP_PATH,
	GAUZY_API_BASE_SERVER_URL,
	IS_DESKTOP_APP
} from '@/core/constants/config/constants';
import {
	getAccessTokenCookie,
	getActiveTeamIdCookie,
	getOrganizationIdCookie,
	getTenantIdCookie
} from '@/core/lib/helpers/cookies';
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
				const cookie = getActiveTeamIdCookie();
				if (cookie) {
					config.headers['Authorization'] = `Bearer ${cookie}`;
				}
				return config;
			},
			(error: any) => Promise.reject(error)
		);

		api.axiosInstance.interceptors.response.use(
			(response: AxiosResponse) => response,
			async (error: { response: AxiosResponse }) => {
				if (error.response?.status === 401) {
					window.location.assign(DEFAULT_APP_PATH);
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
	}
	return apiDirect;
};

export type APIConfig = AxiosRequestConfig<any> & { tenantId?: string; directAPI?: boolean };

export async function desktopServerOverride() {
	if (typeof window !== 'undefined') {
		try {
			const serverConfig = await api.get<{ NEXT_PUBLIC_GAUZY_API_SERVER_URL: string }>('/desktop-server');

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
		baseURL = (runtimeConfig || GAUZY_API_BASE_SERVER_URL.value) as string;
	}

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
