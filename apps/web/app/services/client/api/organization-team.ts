import { PaginationResponse } from '@app/interfaces/IDataResponse';
import {
	IOrganizationTeamList,
	IOrganizationTeamWithMStatus,
	IOrganizationTeamUpdate,
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

export function updateOrganizationTeamAPI(
	teamId: string,
	data: Partial<IOrganizationTeamUpdate>
) {
	return api.put<IOrganizationTeamWithMStatus>(
		`/organization-team/${teamId}`,
		data
	);
}
