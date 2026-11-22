import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { APIService } from '@/core/services/client/api.service';
import { ISuccessResponse } from '@/core/types/interfaces/common/data-response';
import {
	emailVerificationRequestSchema,
	emailVerificationResponseSchema,
	emailVerificationStatusSchema,
	TEmailVerificationResponse,
	TEmailVerificationStatus
} from '@/core/types/schemas/auth/email-verification.schema';
import { validateApiResponse, ZodValidationError } from '@/core/types/schemas';
import { errorStatusOf } from '@/core/lib/utils/error-feedback';

const NOT_FOUND = 404;

class EmailVerificationService extends APIService {
	verifyUserEmailByCode = async ({ code, email }: { code: string; email: string }) => {
		const endpoint = GAUZY_API_BASE_SERVER_URL.value ? '/auth/email/verify/code' : `/auth/verify/code`;

		return this.post<ISuccessResponse>(endpoint, { code, tenantId: this.tenantId, email });
	};

	/**
	 * Where the signed-in user stands with Gauzy's address verification, or `null` on a deployment that verifies no
	 * address: Gauzy keeps its verification routes behind FEATURE_EMAIL_VERIFICATION and answers them with 404 while it
	 * is off, so that a client asks nobody to verify there (ever-co/ever-gauzy#10332). `isEmailVerified` on the user
	 * cannot say it: nobody is ever verified on such a deployment, apart from people who joined through an invitation.
	 */
	getVerificationStatus = async (): Promise<TEmailVerificationStatus | null> => {
		const endpoint = GAUZY_API_BASE_SERVER_URL.value ? '/auth/email/verify/status' : '/auth/verify/status';

		try {
			const response = await this.get<TEmailVerificationStatus>(endpoint);
			return validateApiResponse(
				emailVerificationStatusSchema,
				response.data,
				'getVerificationStatus API response'
			);
		} catch (error) {
			if (errorStatusOf(error) === NOT_FOUND) {
				return null;
			}
			throw error;
		}
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
