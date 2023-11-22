import { API_BASE_URL, DEFAULT_APP_PATH } from '@app/constants';
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
	baseURL: `${process.env.NEXT_PUBLIC_GAUZY_API_SERVER_URL}/api`,
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

export default api;

export { apiDirect };
