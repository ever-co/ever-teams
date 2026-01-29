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
	TAcceptRejectResponse
} from '@/core/types/schemas';

class RequestToJoinTeamService extends APIService {
	/**
	 * Get all request to join team entries with Zod validation
	 * @returns Validated paginated request to join team entries
	 */
	getRequestToJoin = async (): Promise<TGetRequestToJoinResponse> => {
		const organizationId = this.organizationId;
		const tenantId = this.tenantId;

		const query = qs.stringify({
			'where[organizationId]': organizationId,
			'where[tenantId]': tenantId
		});

		return this.executeWithPaginationValidation(
			() => this.get<TGetRequestToJoinResponse>(`/organization-team-join?${query}`),
			(data) => validatePaginationResponse(joinTeamResponseSchema, data, 'getRequestToJoin API response'),
			{ method: 'getRequestToJoin', service: 'RequestToJoinTeamService' }
		);
	};

	/**
	 * Request to join a team with Zod validation
	 * @param data - Join team request data
	 * @returns Validated join team response
	 */
	requestToJoin = async (data: TJoinTeamRequest): Promise<TJoinTeamResponse> => {
		const validatedData = joinTeamRequestSchema.parse(data);

		return this.executeWithValidation(
			() => this.post<TJoinTeamResponse>('/organization-team-join', validatedData),
			(responseData) => validateApiResponse(joinTeamResponseSchema, responseData, 'requestToJoin API response'),
			{ method: 'requestToJoin', service: 'RequestToJoinTeamService' }
		);
	};

	/**
	 * Validate request to join team with Zod validation
	 * @param data - Validation request data
	 * @returns Validated response
	 */
	validateRequestToJoin = async (data: TValidateRequestToJoinTeam): Promise<TValidateResponse> => {
		const validatedData = validateRequestToJoinTeamSchema.parse(data);

		return this.executeWithValidation(
			() => this.post<TValidateResponse>('/organization-team-join/validate', validatedData),
			(responseData) => validateApiResponse(validateResponseSchema, responseData, 'validateRequestToJoin API response'),
			{ method: 'validateRequestToJoin', service: 'RequestToJoinTeamService' }
		);
	};

	/**
	 * Resend verification code for join team request with Zod validation
	 * @param data - Join team request data
	 * @returns Validated resend code response
	 */
	resendCodeRequestToJoin = async (data: TJoinTeamRequest): Promise<TResendCodeResponse> => {
		const validatedData = joinTeamRequestSchema.parse(data);

		return this.executeWithValidation(
			() => this.post<TResendCodeResponse>('/organization-team-join/resend-code', validatedData),
			(responseData) => validateApiResponse(resendCodeResponseSchema, responseData, 'resendCodeRequestToJoin API response'),
			{ method: 'resendCodeRequestToJoin', service: 'RequestToJoinTeamService' }
		);
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
		const validatedParams = acceptRejectParamsSchema.parse({ id, action });

		return this.executeWithPaginationValidation(
			() => this.put<TAcceptRejectResponse>(`/organization-team-join/${validatedParams.id}/${validatedParams.action}`),
			(data) => validatePaginationResponse(joinTeamResponseSchema, data, 'acceptRejectRequestToJoin API response'),
			{ method: 'acceptRejectRequestToJoin', service: 'RequestToJoinTeamService', id, action }
		);
	};
}

export const requestToJoinTeamService = new RequestToJoinTeamService(GAUZY_API_BASE_SERVER_URL.value);
