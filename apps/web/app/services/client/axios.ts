/* eslint-disable no-mixed-spaces-and-tabs */
import { API_BASE_URL, DEFAULT_APP_PATH, GAUZY_API_BASE_SERVER_URL } from '@app/constants';
import { getAccessTokenCookie, getActiveTeamIdCookie } from '@app/helpers/cookies';
import axios, { AxiosResponse } from 'axios';

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

function get(
	endpoint: string,
	isDirect: boolean,
	extras?: {
		tenantId: string;
	}
) {
	let baseURL: string | undefined = GAUZY_API_BASE_SERVER_URL.value;
	baseURL = baseURL ? `${baseURL}/api` : undefined;

	return isDirect && baseURL
		? apiDirect.get(endpoint, {
				baseURL,
				headers: {
					...(extras?.tenantId ? { 'tenant-id': extras?.tenantId } : {})
				}
		  })
		: api.get(endpoint);
}

function post(
	endpoint: string,
	data: any,
	isDirect: boolean,
	extras?: {
		tenantId: string;
	}
) {
	let baseURL: string | undefined = GAUZY_API_BASE_SERVER_URL.value;
	baseURL = baseURL ? `${baseURL}/api` : undefined;

	return isDirect && baseURL
		? apiDirect.post(endpoint, data, {
				baseURL,
				headers: {
					...(extras?.tenantId ? { 'tenant-id': extras?.tenantId } : {})
				}
		  })
		: api.post(endpoint, data);
}

export { get, post };

export default api;
