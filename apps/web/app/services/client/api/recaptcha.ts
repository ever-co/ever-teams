import api from '../axios';

export const getRecaptchaAPI = () => {
	return api.get<any>('/auth/recaptcha');
};
