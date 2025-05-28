import qs from 'qs';
import { serverFetch } from '../fetch';
import { IOrganizationProject } from '@/core/types/interfaces/project/organization-project';
import { PaginationResponse } from '@/core/types/interfaces/global/data-response';

export function editOrganizationProjectsSettingsRequest({
	id,
	datas,
	bearer_token,
	tenantId
}: {
	id: string | any;
	datas: any;
	bearer_token: string;
	tenantId?: any;
}) {
	return serverFetch<any>({
		path: `/organization-projects/setting/${id}`,
		method: 'PUT',
		body: datas,
		bearer_token,
		tenantId
	});
}

export function editOrganizationProjectsRequest({
	id,
	datas,
	bearer_token,
	tenantId
}: {
	id: string | any;
	datas: any;
	bearer_token: string;
	tenantId?: any;
}) {
	return serverFetch<any>({
		path: `/organization-projects/${id}`,
		method: 'PUT',
		body: datas,
		bearer_token,
		tenantId
	});
}

export function getOrganizationProjectRequest({
	id,
	tenantId,
	bearer_token
}: {
	id: string;
	tenantId: string;
	bearer_token: string;
}) {
	return serverFetch<IOrganizationProject>({
		path: `/organization-projects/${id}`,
		method: 'GET',
		bearer_token,
		tenantId
	});
}

export function getOrganizationProjectsRequest({
	tenantId,
	organizationId,
	bearer_token
}: {
	tenantId: string;
	bearer_token: string;
	organizationId: string;
}) {
	const obj = {
		'where[organizationId]': organizationId,
		'where[tenantId]': tenantId
	};
	const query = qs.stringify(obj);

	return serverFetch<PaginationResponse<IOrganizationProject>>({
		path: `/organization-projects?${query}`,
		method: 'GET',
		bearer_token,
		tenantId
	});
}
