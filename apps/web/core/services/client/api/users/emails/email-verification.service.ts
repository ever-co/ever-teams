import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { APIService } from '@/core/services/client/api.service';
import { ISuccessResponse } from '@/core/types/interfaces/common/data-response';
import {
	emailVerificationRequestSchema,
	emailVerificationResponseSchema,
	TEmailVerificationResponse
} from '@/core/types/schemas/auth/email-verification.schema';
import { validateApiResponse } from '@/core/types/schemas';

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
		const validatedRequest = emailVerificationRequestSchema.parse({ email, token });
		const endpoint = GAUZY_API_BASE_SERVER_URL.value ? '/auth/email/verify' : `/auth/verify/token`;

		return this.executeWithValidation(
			() => this.post<ISuccessResponse>(endpoint, {
				email: validatedRequest.email,
				token: validatedRequest.token
			}),
			(data) => validateApiResponse(
				emailVerificationResponseSchema,
				data,
				'verifyUserEmailByToken API response'
			),
			{ method: 'verifyUserEmailByToken', service: 'EmailVerificationService', email }
		);
	};
}

export const emailVerificationService = new EmailVerificationService(GAUZY_API_BASE_SERVER_URL.value);
