import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { APIService } from '@/core/services/client/api.service';
import {
	validateApiResponse,
	emailResetSuccessResponseSchema,
	TEmailResetSuccessResponse
} from '@/core/types/schemas';

class EmailResetService extends APIService {
	resetEmail = async (email: string): Promise<TEmailResetSuccessResponse> => {
		return this.executeWithValidation(
			() => this.post<TEmailResetSuccessResponse>(`/email-reset/request-change-email`, { email }),
			(data) => validateApiResponse(emailResetSuccessResponseSchema, data, 'resetEmail API response'),
			{ method: 'resetEmail', service: 'EmailResetService', email }
		);
	};

	verifyChangeEmail = async (code: string): Promise<TEmailResetSuccessResponse> => {
		return this.executeWithValidation(
			() => this.post<TEmailResetSuccessResponse>(`/email-reset/verify-change-email`, { code }),
			(data) => validateApiResponse(emailResetSuccessResponseSchema, data, 'verifyChangeEmail API response'),
			{ method: 'verifyChangeEmail', service: 'EmailResetService' }
		);
	};
}

export const emailResetService = new EmailResetService(GAUZY_API_BASE_SERVER_URL.value);
