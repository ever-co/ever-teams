import { CreateReponse, ISuccessResponse } from '@app/interfaces';
import api from '../axios';

export function emailResetRequestAPI(email: string) {
	return api.post<CreateReponse<ISuccessResponse>>(
		`/email-reset/request-change-email`,
		{
			email
		}
	);
}
export function verifyChangeEmailRequestAPI(code: string) {
	return api.post<CreateReponse<ISuccessResponse>>(
		`/email-reset/verify-change-email`,
		{ code }
	);
}
