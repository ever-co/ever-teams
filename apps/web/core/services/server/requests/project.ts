import { ICreateProjectRequest, IOrganizationProject } from '@/core/types/interfaces/project/organization-project';
import { serverFetch } from '../fetch';

export function createOrganizationProjectRequest(datas: Partial<ICreateProjectRequest>, bearer_token: string) {
	return serverFetch<IOrganizationProject>({
		path: '/organization-projects',
		method: 'POST',
		body: datas,
		bearer_token
	});
}
