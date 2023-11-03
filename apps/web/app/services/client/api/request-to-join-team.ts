import {
	IRequestToJoinCreate,
	IRequestToJoin,
	IDataResponse,
	ISuccessResponse,
	IValidateRequestToJoin,
	CreateResponse,
	PaginationResponse,
	IRequestToJoinActionEnum
} from '@app/interfaces';
import api from '../axios';

export function requestToJoinAPI(data: IRequestToJoinCreate) {
	return api.post<CreateResponse<IRequestToJoin>>('/organization-team-join', data);
}

export function validateRequestToJoinAPI(data: IValidateRequestToJoin) {
	return api.post<CreateResponse<Pick<IRequestToJoin, 'email' | 'organizationTeamId'>>>(
		'/organization-team-join/validate',
		data
	);
}

export function resendCodeRequestToJoinAPI(data: IRequestToJoinCreate) {
	return api.post<IDataResponse<ISuccessResponse>>('/organization-team-join/resend-code', data);
}

export function getRequestToJoinAPI() {
	return api.get<PaginationResponse<IRequestToJoin>>('/organization-team-join');
}

export function acceptRejectRequestToJoinAPI(id: string, action: IRequestToJoinActionEnum) {
	return api.put<PaginationResponse<IRequestToJoin>>(`/organization-team-join/${id}/${action}`);
}
