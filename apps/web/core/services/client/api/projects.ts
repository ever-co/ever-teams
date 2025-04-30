import { ICreateProjectInput, IProject } from '@/core/types/interfaces';
import { post } from '../axios';

export function createOrganizationProjectAPI(data: Partial<ICreateProjectInput>) {
	return post<IProject>(`/organization-projects`, data);
}
