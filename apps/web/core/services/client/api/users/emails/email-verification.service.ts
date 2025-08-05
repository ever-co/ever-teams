import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { APIService } from '@/core/services/client/api.service';
import { ISuccessResponse } from '@/core/types/interfaces/common/data-response';
import {
	emailVerificationRequestSchema,
	emailVerificationResponseSchema,
	TEmailVerificationResponse
} from '@/core/types/schemas/auth/email-verification.schema';
import { validateApiResponse, ZodValidationError } from '@/core/types/schemas';

class EmailVerificationService extends APIService {
	verifyUserEmailByCode = async ({ code, email }: { code: string; email: string }) => {
		const endpoint = GAUZY_API_BASE_SERVER_URL.value ? '/auth/email/verify/code' : `/auth/verify/code`;

		return this.post<ISuccessResponse>(endpoint, { code, tenantId: this.tenantId, email });
	};

	/**
	 * Verify user email by token with Zod validation
	 *
	 * @param email - User email address
	 * @param token - Verification token
	 * @returns Promise<TEmailVerificationResponse> - Validated email verification response
	 * @throws ValidationError if response data doesn't match schema
	 */
	verifyUserEmailByToken = async ({
		email,
		token
	}: {
		email: string;
		token: string;
	}): Promise<TEmailVerificationResponse> => {
		try {
			// Validate input parameters
			const validatedRequest = emailVerificationRequestSchema.parse({ email, token });

			const endpoint = GAUZY_API_BASE_SERVER_URL.value ? '/auth/email/verify' : `/auth/verify/token`;
			const response = await this.post<ISuccessResponse>(endpoint, {
				email: validatedRequest.email,
				token: validatedRequest.token
			});

			// Validate the response data using Zod schema
			const validatedResponse = validateApiResponse(
				emailVerificationResponseSchema,
				response.data,
				'verifyUserEmailByToken API response'
			);

			return validatedResponse;
		} catch (error) {
			if (error instanceof ZodValidationError) {
				this.logger.error(
					'Email verification validation failed:',
					{
						message: error.message,
						issues: error.issues
					},
					'EmailVerificationService'
				);
			}
			// Re-throw with additional context for email verification errors
			throw error;
		}
	};
}

export const emailVerificationService = new EmailVerificationService(GAUZY_API_BASE_SERVER_URL.value);
