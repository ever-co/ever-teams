import qs from 'qs';
import { serverFetch } from '../fetch';
import { IOrganizationProject } from '@/core/types/interfaces/project/organization-project';
import { PaginationResponse } from '@/core/types/interfaces/common/data-response';

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
	// Encoded, so an id such as `../employee` stays one path segment instead of reaching another endpoint
	const encodedId = encodeURIComponent(id);

	return serverFetch<any>({
		path: `/organization-projects/${encodedId}`,
		method: 'PUT',
		body: datas,
		bearer_token,
		tenantId
	});
}

export function getOrganizationProjectRequest({
	id,
	tenantId,
	bearer_token,
	searchParams
}: {
	id: string;
	tenantId: string;
	bearer_token: string;
	searchParams?: URLSearchParams;
}) {
	// Encoded, so an id such as `../employee` stays one path segment instead of reaching another endpoint, with
	// the query the client sends
	const encodedId = encodeURIComponent(id);
	let path = `/organization-projects/${encodedId}`;
	const query = searchParams?.toString();
	if (query) {
		path = `${path}?${query}`;
	}

	return serverFetch<IOrganizationProject>({
		path,
		method: 'GET',
		bearer_token,
		tenantId
	});
}

export function getOrganizationProjectsRequest({
	tenantId,
	organizationId,
	bearer_token,
	searchParams
}: {
	tenantId: string;
	bearer_token: string;
	organizationId: string;
	searchParams?: URLSearchParams;
}) {
	const obj = {
		'where[organizationId]': organizationId,
		'where[tenantId]': tenantId
	};
	const scopeQuery = qs.stringify(obj);

	// The relations, paging and filters the client sends reach Gauzy as in direct mode; the organization and
	// tenant stay the session's.
	const clientParams = new URLSearchParams(searchParams);
	clientParams.delete('where[organizationId]');
	clientParams.delete('where[tenantId]');
	const clientQuery = clientParams.toString();

	const queries = [scopeQuery, clientQuery];
	const presentQueries = queries.filter(Boolean);
	const query = presentQueries.join('&');

	return serverFetch<PaginationResponse<IOrganizationProject>>({
		path: `/organization-projects?${query}`,
		method: 'GET',
		bearer_token,
		tenantId
	});
}
