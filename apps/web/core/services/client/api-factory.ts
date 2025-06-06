import { API_BASE_URL, GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';

export const buildAPIService = async () => {
	const { APIService } = await import('./api.service');

	return new APIService(API_BASE_URL, {
		baseURL: API_BASE_URL,
		withCredentials: true,
		timeout: 180_000,
		directAPI: false
	});
};

export const buildDirectAPIService = async () => {
	const { APIService } = await import('./api.service');

	return new APIService(GAUZY_API_BASE_SERVER_URL.value, {
		baseURL: GAUZY_API_BASE_SERVER_URL.value,
		timeout: 180_000,
		directAPI: true
	});
};
