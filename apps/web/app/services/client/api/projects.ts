import { IProject, IProjectCreate } from '@app/interfaces';
import { post } from '../axios';

export function createOrganizationProjectAPI(data: IProjectCreate) {

	return post<IProject>(`/organization-projects`, data);
}
