import api from '../axios';

export const getMeetJwtAuthTokenAPI = () => {
	return api.get<{ token: string }>('/auth/meet/jwt');
};
