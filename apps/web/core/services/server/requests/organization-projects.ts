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

/** The `where` keys the session decides: a client filter on them could widen the query beyond its organization. */
const SCOPE_FILTER_FIELDS = ['organizationId', 'tenantId'];

/**
 * Whether a query key filters on the organization or the tenant, read the way Gauzy's query parser (qs) reads it:
 * `where[organizationId]`, `where[organizationId][ne]`, `where[tenantId][]` and the like.
 *
 * @public Re-exported by the core/services/server/requests barrel.
 */
export function isScopeFilterKey(key: string): boolean {
	const parsed = qs.parse(`${encodeURIComponent(key)}=1`) as { where?: unknown };
	const where = parsed.where;
	if (typeof where !== 'object' || where === null) return false;
	return SCOPE_FILTER_FIELDS.some((field) => Object.prototype.hasOwnProperty.call(where, field));
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
	// tenant stay the session's: every client filter on them goes, nested ones (`where[organizationId][ne]`) too.
	const clientParams = new URLSearchParams();
	for (const [key, value] of new URLSearchParams(searchParams)) {
		if (!isScopeFilterKey(key)) clientParams.append(key, value);
	}
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
