import { APIService } from '../../api.service';
import { getOrganizationIdCookie, getTenantIdCookie } from '@/core/lib/helpers/cookies';
import qs from 'qs';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import {
	ICreateProjectRequest,
	IEditProjectRequest,
	IOrganizationProject
} from '@/core/types/interfaces/project/IOrganizationProject';
import { PaginationResponse } from '@/core/types/interfaces/to-review/IDataResponse';

class OrganizationProjectService extends APIService {
	editOrganizationProjectSetting = async (id: string, data: any, tenantId?: string) => {
		return this.put<any>(`/organization-projects/setting/${id}`, data, {
			tenantId
		});
	};

	createOrganizationProject = async (data: Partial<ICreateProjectRequest>) => {
		return this.post<IOrganizationProject>(`/organization-projects`, data);
	};

	editOrganizationProject = async (id: string, data: IEditProjectRequest) => {
		const tenantId = getTenantIdCookie();
		return this.put<IOrganizationProject>(`/organization-projects/${id}`, data, {
			tenantId
		});
	};

	getOrganizationProject = async (id: string, tenantId?: string) => {
		return this.get<IOrganizationProject>(`/organization-projects/${id}`, {
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

		return this.get<PaginationResponse<IOrganizationProject>>(`/organization-projects?${query}`, {
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
