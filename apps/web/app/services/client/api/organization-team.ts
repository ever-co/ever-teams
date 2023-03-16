import {
	CreateReponse,
	PaginationResponse,
} from '@app/interfaces/IDataResponse';

import {
	IOrganizationTeamList,
	IOrganizationTeamWithMStatus,
	IOrganizationTeamUpdate,
	IOrganizationTeam,
} from '@app/interfaces';
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
	return api.put<IOrganizationTeamList>(
		`/organization-team/${data.id}`,
		data
	);
}
export function updateOrganizationTeamAPI(
	teamId: string,
	data: Partial<IOrganizationTeamUpdate>
) {
	return api.put<IOrganizationTeamWithMStatus>(
		`/organization-team/${teamId}`,
		data
	);
}

export function deleteOrganizationTeamAPI(id: string) {
	return api.delete<CreateReponse<IOrganizationTeam>>(
		`/organization-team/${id}`
	);
}
export function removeEmployeeOrganizationTeamAPI(employeeId: string) {
	return api.delete<boolean>(`/organization-team/employee/${employeeId}`);
}

export function removeUserFromAllTeamAPI(userId: string) {
	return api.delete(`/organization-team/teams/${userId}`);
}
