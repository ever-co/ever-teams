import { getOrganizationIdCookie, getTenantIdCookie } from '@/core/lib/helpers/cookies';
import { APIService } from '@/core/services/client/api.service';
import qs from 'qs';
import {
	IDataResponse,
	IRequestToJoin,
	IRequestToJoinActionEnum,
	IRequestToJoinCreate,
	ISuccessResponse,
	IValidateRequestToJoin,
	PaginationResponse
} from '@/core/types/interfaces';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';

class RequestToJoinTeamService extends APIService {
	getRequestToJoin = async () => {
		const organizationId = getOrganizationIdCookie();
		const tenantId = getTenantIdCookie();

		const query = qs.stringify({
			'where[organizationId]': organizationId,
			'where[tenantId]': tenantId
		});

		return this.get<PaginationResponse<IRequestToJoin>>(`/organization-team-join?${query}`);
	};

	requestToJoin = async (data: IRequestToJoinCreate) => {
		const endpoint = '/organization-team-join';
		return this.post<IRequestToJoin>(endpoint, data);
	};

	validateRequestToJoin = async (data: IValidateRequestToJoin) => {
		return this.post<Pick<IRequestToJoin, 'email' | 'organizationTeamId'>>(
			'/organization-team-join/validate',
			data
		);
	};

	resendCodeRequestToJoin = async (data: IRequestToJoinCreate) => {
		return this.post<IDataResponse<ISuccessResponse>>('/organization-team-join/resend-code', data);
	};

	acceptRejectRequestToJoin = async (id: string, action: IRequestToJoinActionEnum) => {
		return this.put<PaginationResponse<IRequestToJoin>>(`/organization-team-join/${id}/${action}`);
	};
}

export const requestToJoinTeamService = new RequestToJoinTeamService(GAUZY_API_BASE_SERVER_URL.value);
