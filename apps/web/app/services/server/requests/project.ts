import { IProjectCreate, IProject } from '@app/interfaces/';
import { serverFetch } from '../fetch';

export function createOrganizationProjectRequest(
	datas: IProjectCreate,
	bearer_token: string
) {
	return serverFetch<IProject>({
		path: '/organization-projects',
		method: 'POST',
		body: datas,
		bearer_token
	});
}
