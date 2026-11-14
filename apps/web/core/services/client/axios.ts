import { APPLICATION_LANGUAGES_CODE, GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { getAccessTokenCookie, getOrganizationIdCookie, getTenantIdCookie } from '@/core/lib/helpers/cookies';
import { AxiosRequestConfig, AxiosResponse } from 'axios';
import { APIService } from './api.service';
import { buildAPIService, buildDirectAPIService } from './api-factory';

let api: APIService;
let apiDirect: APIService;

// Public team pages are open to visitors without a session: a 401 there is an answer like another.
const isPublicTeamPage = () => {
	const paths = location.pathname.split('/').filter(Boolean);
	return (
		!paths.includes('join') &&
		(paths[0] === 'team' || (APPLICATION_LANGUAGES_CODE.includes(paths[0]) && paths[1] === 'team'))
	);
};

export const getAPI = async (): Promise<APIService> => {
	if (!api) {
		api = await buildAPIService();

		api.axiosInstance.interceptors.request.use(
			async (config: any) => {
				const cookie = getAccessTokenCookie();
				const tenantId = getTenantIdCookie();
				if (cookie && !config.pinnedAuthorization) {
					config.headers['Authorization'] = `Bearer ${cookie}`;
				}
				if (tenantId && !config.headers.has('tenant-id')) {
					config.headers.set('tenant-id', tenantId);
				}
				return config;
			},
			(error: any) => Promise.reject(error)
		);

		// What a 401 does (renew the session, send the request again, or sign out) is decided by the APIService this
		// client is built on, once for the request: api.service.ts handleUnauthorized()
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
				if (cookie && !config.pinnedAuthorization) {
					config.headers['Authorization'] = `Bearer ${cookie}`;
				}
				if (tenantId && !config.headers.has('tenant-id')) {
					config.headers.set('tenant-id', tenantId);
				}
				return config;
			},
			(error: any) => Promise.reject(error)
		);

		apiDirect.axiosInstance.interceptors.response.use(
			(response: AxiosResponse) => response,
			async (error: { response: AxiosResponse; config?: any }) => {
				// Elsewhere, what a 401 does (renew the session, send the request again, or sign out) is decided by the
				// APIService this client is built on, once for the request: api.service.ts handleUnauthorized()
				if (error.response?.status === 401 && isPublicTeamPage()) {
					return error.response;
				}
				return Promise.reject(error);
			}
		);
	}
	return apiDirect;
};

export type APIConfig = AxiosRequestConfig<any> & {
	tenantId?: string | null;
	directAPI?: boolean;
	pinnedAuthorization?: boolean;
	/**
	 * A 401 of this request is its answer: the session is not renewed for it and it is not sent again. For the
	 * request that renews the session itself, whose 401 says the refresh token is refused.
	 */
	noSessionRenewal?: boolean;
	/**
	 * The answer holds a secret shown once (a chat webhook's URL or signing secret): the development log of
	 * `APIService` leaves its body out, in direct and in proxy mode alike.
	 */
	secretResponse?: boolean;
};

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
