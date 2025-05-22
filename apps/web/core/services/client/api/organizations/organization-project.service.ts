import {
	ICreateProjectInput,
	IEditProjectInput,
	IProject,
	PaginationResponse
} from '@/core/types/interfaces/to-review';
import { APIService } from '../../api.service';
import { getOrganizationIdCookie, getTenantIdCookie } from '@/core/lib/helpers/cookies';
import qs from 'qs';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';

class OrganizationProjectService extends APIService {
	editOrganizationProjectSetting = async (id: string, data: any, tenantId?: string) => {
		return this.put<any>(`/organization-projects/setting/${id}`, data, {
			tenantId
		});
	};

	createOrganizationProject = async (data: Partial<ICreateProjectInput>) => {
		return this.post<IProject>(`/organization-projects`, data);
	};

	editOrganizationProject = async (id: string, data: IEditProjectInput) => {
		const tenantId = getTenantIdCookie();
		return this.put<IProject>(`/organization-projects/${id}`, data, {
			tenantId
		});
	};

	getOrganizationProject = async (id: string, tenantId?: string) => {
		return this.get<IProject>(`/organization-projects/${id}`, {
			tenantId
		});
	};

	getOrganizationProjects = async ({ queries }: { queries?: Record<string, string> } = {}) => {
		const organizationId = getOrganizationIdCookie();
		const tenantId = getTenantIdCookie();

		const obj = {
			'where[organizationId]': organizationId,
			'where[tenantId]': tenantId,
			'join[alias]': 'organization_project',
			'join[leftJoin][tags]': 'organization_project.tags'
		} as Record<string, string>;

		const relations = ['members', 'teams', 'members.employee', 'members.employee.user', 'tags', 'tasks'];

		relations.forEach((relation, i) => {
			obj[`relations[${i}]`] = relation;
		});

		if (queries) {
			Object.entries(queries).forEach(([key, value]) => {
				obj[key] = value;
			});
		}

		const query = qs.stringify(obj);

		return this.get<PaginationResponse<IProject>>(`/organization-projects?${query}`, {
			tenantId
		});
	};

	deleteOrganizationProject = async (organizationProjectId: string) => {
		const tenantId = getTenantIdCookie();

		return this.delete(`/organization-projects/${organizationProjectId}`, {
			data: {
				tenantId
			}
		});
	};
}

export const organizationProjectService = new OrganizationProjectService(GAUZY_API_BASE_SERVER_URL.value);
