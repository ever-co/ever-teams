import api from '../axios';

export const getMeetJwtAuthTokenAPI = () => {
	return api.get<{ token: string }>('/auth/jitsi/jwt');
};
