import {
	CreateReponse,
	PaginationResponse,
} from '@app/interfaces/IDataResponse';
import {
	IOrganizationTeam,
	IOrganizationTeamList,
	IOrganizationTeamUpdate,
	IOrganizationTeamWithMStatus,
} from '@app/interfaces/IOrganizationTeam';
import api from '../axios';

export function getOrganizationTeamsAPI() {
	return api.get<PaginationResponse<IOrganizationTeamList>>(
		'/organization-team'
	);
}

export function createOrganizationTeamAPI(name: string) {
	return api.post<PaginationResponse<IOrganizationTeamList>>(
		'/organization-team',
		{ name }
	);
}

export function getOrganizationTeamAPI(teamId: string) {
	return api.get<IOrganizationTeamWithMStatus>(`/organization-team/${teamId}`);
}

export function editOrganizationTeamAPI(data: IOrganizationTeamUpdate) {
	return api.put<CreateReponse<IOrganizationTeam>>(
		`/organization-team/${data.id}`,
		data
	);
}
