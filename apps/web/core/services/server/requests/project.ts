import { ICreateProjectRequest, IOrganizationProject } from '@/core/types/interfaces/project/organization-project';
import { serverFetch } from '../fetch';

/** Deletes an organization project (the one a team creation made, when the team itself was refused). */
export function deleteOrganizationProjectRequest(projectId: string, tenantId: string, bearer_token: string) {
	return serverFetch<unknown>({
		path: `/organization-projects/${encodeURIComponent(projectId)}`,
		method: 'DELETE',
		bearer_token,
		tenantId
	});
}

export function createOrganizationProjectRequest(datas: Partial<ICreateProjectRequest>, bearer_token: string) {
	return serverFetch<IOrganizationProject>({
		path: '/organization-projects',
		method: 'POST',
		body: datas,
		bearer_token
	});
}
