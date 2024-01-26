import { IProject } from '@app/interfaces';
import { post } from '../axios';

type Params = {
	name: string;
	tenantId: string;
	organizationId: string;
};

export function createOrganizationProjectAPI(params: Params) {
	return post<IProject>(`/organization-projects`, params);
}
