import api from '../axios';

export interface IMeetAuthRequest {
	room?: string;
	tenant?: string;
}

export const getMeetJwtAuthTokenAPI = (params?: IMeetAuthRequest) => {
	return api.get<{ token: string }>('/auth/meet/jwt', { 
		params
	});
};
