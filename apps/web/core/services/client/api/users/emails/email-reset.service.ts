import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { APIService } from '@/core/services/client/api.service';
import {
	validateApiResponse,
	emailResetSuccessResponseSchema,
	ZodValidationError,
	TEmailResetSuccessResponse
} from '@/core/types/schemas';

class EmailResetService extends APIService {
	resetEmail = async (email: string): Promise<TEmailResetSuccessResponse> => {
		try {
			const response = await this.post<TEmailResetSuccessResponse>(`/email-reset/request-change-email`, {
				email
			});

			// Validate API response using utility function
			return validateApiResponse(emailResetSuccessResponseSchema, response.data, 'resetEmail API response');
		} catch (error) {
			if (error instanceof ZodValidationError) {
				this.logger.error(
					'Email reset validation failed:',
					{
						message: error.message,
						issues: error.issues
					},
					'EmailResetService'
				);
			}
			throw error;
		}
	};

	verifyChangeEmail = async (code: string): Promise<TEmailResetSuccessResponse> => {
		try {
			const response = await this.post<TEmailResetSuccessResponse>(`/email-reset/verify-change-email`, {
				code
			});

			// Validate API response using utility function
			return validateApiResponse(
				emailResetSuccessResponseSchema,
				response.data,
				'verifyChangeEmail API response'
			);
		} catch (error) {
			if (error instanceof ZodValidationError) {
				this.logger.error(
					'Email verification validation failed:',
					{
						message: error.message,
						issues: error.issues
					},
					'EmailResetService'
				);
			}
			throw error;
		}
	};
}

export const emailResetService = new EmailResetService(GAUZY_API_BASE_SERVER_URL.value);
