import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { APIService } from '@/core/services/client/api.service';
import { ISuccessResponse } from '@/core/types/interfaces/global/data-response';

class EmailResetService extends APIService {
	resetEmail = async (email: string) => {
		return this.post<ISuccessResponse>(`/email-reset/request-change-email`, {
			email
		});
	};
	verifyChangeEmail = async (code: string) => {
		return this.post<ISuccessResponse>(`/email-reset/verify-change-email`, { code });
	};
}

export const emailResetService = new EmailResetService(GAUZY_API_BASE_SERVER_URL.value);
