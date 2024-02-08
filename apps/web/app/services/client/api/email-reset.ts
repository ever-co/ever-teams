import { ISuccessResponse } from '@app/interfaces';
import { post } from '../axios';

export function emailResetRequestAPI(email: string) {
	return post<ISuccessResponse>(`/email-reset/request-change-email`, {
		email
	});
}
export function verifyChangeEmailRequestAPI(code: string) {
	return post<ISuccessResponse>(`/email-reset/verify-change-email`, { code });
}
