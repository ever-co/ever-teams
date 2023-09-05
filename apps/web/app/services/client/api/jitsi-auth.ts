import api from '../axios';

export const getJitsiJwtAuthTokenAPI = () => {
	return api.get<{ token: string }>('/auth/jitsi/jwt');
};
