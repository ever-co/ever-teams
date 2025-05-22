import { ICreateProjectInput, IProject } from '@/core/types/interfaces/to-review';
import { serverFetch } from '../fetch';

export function createOrganizationProjectRequest(datas: Partial<ICreateProjectInput>, bearer_token: string) {
	return serverFetch<IProject>({
		path: '/organization-projects',
		method: 'POST',
		body: datas,
		bearer_token
	});
}
