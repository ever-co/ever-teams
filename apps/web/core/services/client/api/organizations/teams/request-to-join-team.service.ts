import { APIService } from '@/core/services/client/api.service';
import qs from 'qs';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';

import { ERequestStatus } from '@/core/types/generics/enums';
import {
	validateApiResponse,
	validatePaginationResponse,
	joinTeamRequestSchema,
	validateRequestToJoinTeamSchema,
	joinTeamResponseSchema,
	validateResponseSchema,
	resendCodeResponseSchema,
	acceptRejectParamsSchema,
	TJoinTeamRequest,
	TValidateRequestToJoinTeam,
	TJoinTeamResponse,
	TValidateResponse,
	TResendCodeResponse,
	TGetRequestToJoinResponse,
	TAcceptRejectResponse,
	ZodValidationError
} from '@/core/types/schemas';

class RequestToJoinTeamService extends APIService {
	/**
	 * Get all request to join team entries with Zod validation
	 * @returns Validated paginated request to join team entries
	 */
	getRequestToJoin = async (): Promise<TGetRequestToJoinResponse> => {
		try {
			const organizationId = this.organizationId;
			const tenantId = this.tenantId;

			const query = qs.stringify({
				'where[organizationId]': organizationId,
				'where[tenantId]': tenantId
			});

			const response = await this.get<TGetRequestToJoinResponse>(`/organization-team-join?${query}`);

			// Validate pagination response with Zod
			return validatePaginationResponse(joinTeamResponseSchema, response.data, 'getRequestToJoin API response');
		} catch (error) {
			if (error instanceof ZodValidationError) {
				this.logger.error('Request to join validation failed:', {
					message: error.message,
					issues: error.issues,
					context: 'getRequestToJoin'
				});
			}
			throw error;
		}
	};

	/**
	 * Request to join a team with Zod validation
	 * @param data - Join team request data
	 * @returns Validated join team response
	 */
	requestToJoin = async (data: TJoinTeamRequest): Promise<TJoinTeamResponse> => {
		try {
			// Validate input data
			const validatedData = joinTeamRequestSchema.parse(data);

			const endpoint = '/organization-team-join';
			const response = await this.post<TJoinTeamResponse>(endpoint, validatedData);

			// Validate API response
			return validateApiResponse(joinTeamResponseSchema, response.data, 'requestToJoin API response');
		} catch (error) {
			if (error instanceof ZodValidationError) {
				this.logger.error('Request to join validation failed:', {
					message: error.message,
					issues: error.issues,
					context: 'requestToJoin'
				});
			}
			throw error;
		}
	};

	/**
	 * Validate request to join team with Zod validation
	 * @param data - Validation request data
	 * @returns Validated response
	 */
	validateRequestToJoin = async (data: TValidateRequestToJoinTeam): Promise<TValidateResponse> => {
		try {
			// Validate input data
			const validatedData = validateRequestToJoinTeamSchema.parse(data);

			const response = await this.post<TValidateResponse>('/organization-team-join/validate', validatedData);

			// Validate API response
			return validateApiResponse(validateResponseSchema, response.data, 'validateRequestToJoin API response');
		} catch (error) {
			if (error instanceof ZodValidationError) {
				this.logger.error('Validate request to join validation failed:', {
					message: error.message,
					issues: error.issues,
					context: 'validateRequestToJoin'
				});
			}
			throw error;
		}
	};

	/**
	 * Resend verification code for join team request with Zod validation
	 * @param data - Join team request data
	 * @returns Validated resend code response
	 */
	resendCodeRequestToJoin = async (data: TJoinTeamRequest): Promise<TResendCodeResponse> => {
		try {
			// Validate input data
			const validatedData = joinTeamRequestSchema.parse(data);

			const response = await this.post<TResendCodeResponse>('/organization-team-join/resend-code', validatedData);

			// Validate API response
			return validateApiResponse(resendCodeResponseSchema, response.data, 'resendCodeRequestToJoin API response');
		} catch (error) {
			if (error instanceof ZodValidationError) {
				this.logger.error('Resend code validation failed:', {
					message: error.message,
					issues: error.issues,
					context: 'resendCodeRequestToJoin'
				});
			}
			throw error;
		}
	};

	/**
	 * Accept or reject request to join team with Zod validation
	 * @param id - Request ID
	 * @param action - Accept/Reject action
	 * @returns Validated accept/reject response
	 */
	acceptRejectRequestToJoin = async ({
		id,
		action
	}: {
		id: string;
		action: ERequestStatus;
	}): Promise<TAcceptRejectResponse> => {
		try {
			// Validate input parameters
			const validatedParams = acceptRejectParamsSchema.parse({ id, action });

			const response = await this.put<TAcceptRejectResponse>(
				`/organization-team-join/${validatedParams.id}/${validatedParams.action}`
			);

			// Validate API response
			return validatePaginationResponse(
				joinTeamResponseSchema,
				response.data,
				'acceptRejectRequestToJoin API response'
			);
		} catch (error) {
			if (error instanceof ZodValidationError) {
				this.logger.error('Accept/Reject request validation failed:', {
					message: error.message,
					issues: error.issues,
					context: 'acceptRejectRequestToJoin'
				});
			}
			throw error;
		}
	};
}

export const requestToJoinTeamService = new RequestToJoinTeamService(GAUZY_API_BASE_SERVER_URL.value);
