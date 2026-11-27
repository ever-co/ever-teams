import { APPLICATION_LANGUAGES_CODE, GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { getOrganizationIdCookie, getTenantIdCookie } from '@/core/lib/helpers/cookies';
import { AxiosRequestConfig, AxiosResponse } from 'axios';
import { APIService, authorizeRequest } from './api.service';
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

/** A 401 the call expected (a wrong two-factor code, see `APIConfig.expectedUnauthorized`) is not a lost session. */
const isExpectedRefusal = (config: unknown) => (config as APIConfig | undefined)?.expectedUnauthorized === true;

export const getAPI = async (): Promise<APIService> => {
	if (!api) {
		api = await buildAPIService();

		api.axiosInstance.interceptors.request.use(
			async (config: any) => {
				const tenantId = getTenantIdCookie();
				// The cookie's token, or this tab's own for its organization (#5134)
				authorizeRequest(config);
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
				const tenantId = getTenantIdCookie();
				// The cookie's token, or this tab's own for its organization (#5134)
				authorizeRequest(config);
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
				// APIService this client is built on, once for the request: api.service.ts handleUnauthorized(). A 401
				// the call expected (a wrong two-factor code) is the call's own answer.
				if (error.response?.status === 401 && !isExpectedRefusal(error.config) && isPublicTeamPage()) {
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
	/**
	 * The address holds a secret (the token of a shared report's link): `APIService` writes neither this request, its
	 * answer nor its error to any log, in direct and in proxy mode alike.
	 */
	secretAddress?: boolean;
	/**
	 * A 401 of this call refuses a proof the person typed (a wrong two-factor code), not their session: the session
	 * handler (refresh, then sign-out) is not called, and the caller shows the refusal.
	 */
	expectedUnauthorized?: boolean;
	/**
	 * Statuses this call takes as an answer, not as a failure (a 404 from a Gauzy without the route): `APIService`
	 * leaves them out of its error log, in direct and in proxy mode alike. Only the log: the call still fails with that
	 * status for its caller to read, and a 401 still goes to the session handler.
	 */
	quietStatuses?: readonly number[];
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
